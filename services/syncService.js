// services/syncService.js
const { SyncQueue, Product, Inventory, sequelize } = require('../models');
const { Op } = require('sequelize');

class SyncService {
    constructor() {
        this.isSyncing = false;
        this.isOnline = false;
        this.syncInterval = null;
    }

    start() {
        if (global.logToUI) global.logToUI('🔄 SyncService: Initializing...');
        this.syncInterval = setInterval(() => this.checkAndSync(), 30000);
        this.checkAndSync();
        if (global.logToUI) global.logToUI('🔄 SyncService: Started (Checking every 30s)');
    }

    stop() {
        if (this.syncInterval) clearInterval(this.syncInterval);
    }

    async checkAndSync() {
        const online = await this.checkConnectivity();
        if (online && !this.isSyncing) {
            if (global.logToUI) global.logToUI('🌐 Connection detected. Starting bidirectional sync...');

            // 1. ارفع التعديلات المحلية أولاً
            await this.processSyncQueue();

            // 2. اسحب المنتجات الجديدة فقط (مش تكتب فوق الموجودة)
            await this.pullNewProducts();

            // 3. اسحب المخزن الجديد فقط
            await this.pullNewInventory();
        }
    }

    // ✅ سحب المنتجات وتحديثها (Bidirectional Sync)
    async pullNewProducts() {
        this.isSyncing = true;
        try {
            if (global.logToUI) global.logToUI('📡 Sync: Pulling products from cloud...');
            const url = `${process.env.SUPABASE_URL}/rest/v1/products?select=*`;
            
            // 🛡️ SECURITY: Use ANON_KEY for read operations to minimize Service Key exposure
            const headers = {
                'apikey': process.env.SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
            };

            const response = await fetch(url, { headers });
            if (!response.ok) {
                if (global.logToUI) global.logToUI(`❌ Sync: Cloud returned error ${response.status}`, 'error');
                return;
            }

            const remoteProducts = await response.json();
            if (global.logToUI) global.logToUI(`📡 Sync: Found ${remoteProducts.length} products on cloud.`);

            for (const remote of remoteProducts) {
                const localProduct = await Product.findOne({ where: { id: remote.id } });

                if (!localProduct) {
                    if (global.logToUI) global.logToUI(`📡 Sync: Adding new product: ${remote.name}`);
                    await Product.create({
                        id: remote.id,
                        name: remote.name,
                        category: remote.category,
                        price: remote.price,
                        wholesalePrice: remote.wholesalePrice,
                        sold: remote.sold || 0,
                        sync_status: 'synced'
                    });
                } else {
                    // ✅ FIX: Update local product if cloud data changed
                    const needsUpdate = localProduct.name !== remote.name || 
                                      localProduct.price !== remote.price || 
                                      localProduct.category !== remote.category;
                    
                    if (needsUpdate) {
                        if (global.logToUI) global.logToUI(`📡 Sync: Updating local product: ${remote.name}`);
                        await localProduct.update({
                            name: remote.name,
                            category: remote.category,
                            price: remote.price,
                            wholesalePrice: remote.wholesalePrice,
                            sync_status: 'synced'
                        });
                    }
                }
            }

            if (global.logToUI) global.logToUI('✅ Sync: Local database is now up to date with cloud.');
        } catch (err) {
            if (global.logToUI) global.logToUI('❌ Sync: Pull failed: ' + err.message, 'error');
        } finally {
            this.isSyncing = false;
        }
    }

    // ✅ سحب المخزن وتحديث الكميات محلياً
    async pullNewInventory() {
        try {
            if (global.logToUI) global.logToUI('📡 Sync: Pulling inventory from cloud...');
            const url = `${process.env.SUPABASE_URL}/rest/v1/inventory?select=*`;
            
            // 🛡️ SECURITY: Use ANON_KEY for read operations
            const headers = {
                'apikey': process.env.SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
            };

            const response = await fetch(url, { headers });
            if (!response.ok) return;

            const remoteInventory = await response.json();
            if (global.logToUI) global.logToUI(`📡 Sync: Found ${remoteInventory.length} inventory records.`);

            for (const item of remoteInventory) {
                const localItem = await Inventory.findOne({ where: { id: item.id } });

                if (!localItem) {
                    if (global.logToUI) global.logToUI(`📡 Sync: Adding new inventory item: ${item.name}`);
                    await Inventory.create({
                        id: item.id,
                        name: item.name,
                        quantity: item.quantity || 0,
                        cost: item.cost || 0,
                        total: item.total || 0,
                        min: item.min || 0,
                        expiryDate: item.expiryDate || null,
                        variants: item.variants || [],
                        sync_status: 'synced'
                    });
                } else {
                    // ✅ FIX: Update local inventory quantity/cost from cloud
                    if (localItem.quantity !== item.quantity || localItem.cost !== item.cost) {
                        if (global.logToUI) global.logToUI(`📡 Sync: Updating inventory item: ${item.name}`);
                        await localItem.update({
                            quantity: item.quantity,
                            cost: item.cost,
                            total: item.total,
                            variants: item.variants,
                            sync_status: 'synced'
                        });
                    }
                }
            }

            if (global.logToUI) global.logToUI('✅ Sync: Inventory is now up to date.');
        } catch (err) {
            if (global.logToUI) global.logToUI('❌ Sync: Inventory pull failed: ' + err.message, 'error');
        }
    }

    async checkConnectivity() {
        try {
            const url = process.env.SUPABASE_URL;
            if (!url) return false;
            const response = await fetch(`${url}/rest/v1/`, {
                method: 'GET',
                headers: { 'apikey': process.env.SUPABASE_ANON_KEY },
                signal: AbortSignal.timeout(10000)
            });
            this.isOnline = response.ok || response.status === 401;
            return this.isOnline;
        } catch (err) {
            if (global.logToUI) global.logToUI('📡 Connectivity Status: Offline (' + err.message + ')', 'warn');
            this.isOnline = false;
            return false;
        }
    }

    async processSyncQueue() {
        try {
            const pendingItems = await SyncQueue.findAll({
                where: { status: 'pending', retryCount: { [Op.lt]: 5 } },
                order: [['createdAt', 'ASC']],
                limit: 20
            });

            if (pendingItems.length === 0) return;

            console.log(`🔄 Sync: Uploading ${pendingItems.length} local changes to cloud...`);
            for (const item of pendingItems) {
                await this.syncItem(item);
            }
        } catch (err) {
            console.error('❌ Sync: Push failed:', err.message);
        }
    }

    async syncItem(item) {
        try {
            await item.update({ status: 'syncing' });
            await this.pushToSupabase(item.operation, item.tableName, item.payload);
            await item.update({ status: 'done' });
        } catch (err) {
            console.error(`❌ Sync: Item ${item.id} failed:`, err.message);
            await item.update({ status: 'pending', retryCount: item.retryCount + 1 });
        }
    }

    async pushToSupabase(operation, tableName, payload) {
        // Map local lowercase table names to Supabase exact case names
        const tableMap = {
            'orders': 'Orders',
            'orderdetails': 'OrderDetails',
            'order_details': 'OrderDetails',
            'expenses': 'Expenses'
        };
        const remoteTableName = tableMap[tableName] || tableName;
        
        // Clean local-only fields from the payload before sending
        let cleanPayload = { ...payload };
        delete cleanPayload.local_id;
        delete cleanPayload.sync_status;
        
        // Preserve createdAt and updatedAt to ensure they are synchronized with the cloud
        // and to avoid NOT NULL constraint violations on tables (like Expenses) that require them.
        if (cleanPayload.createdAt === undefined || cleanPayload.createdAt === null) {
            delete cleanPayload.createdAt;
        }
        if (cleanPayload.updatedAt === undefined || cleanPayload.updatedAt === null) {
            delete cleanPayload.updatedAt;
        }

        // 🛡️ Self-Healing: Ensure default walk-in customer exists on Supabase before pushing orders
        if (remoteTableName === 'Orders' && operation === 'INSERT') {
            try {
                console.log("📡 Sync: Ensuring default Cash Customer (ID: 1) exists on Supabase...");
                await fetch(`${process.env.SUPABASE_URL}/rest/v1/Customers`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': process.env.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
                        'Prefer': 'resolution=merge-duplicates'
                    },
                    body: JSON.stringify({
                        id: 1,
                        name: 'عميل نقدي',
                        phone: '01000000000',
                        address: 'المحل'
                    })
                });
            } catch (err) {
                console.warn('⚠️ Sync: Could not ensure default customer exists:', err.message);
            }
        }

        const baseUrl = `${process.env.SUPABASE_URL}/rest/v1/${remoteTableName}`;
        const headers = {
            'Content-Type': 'application/json',
            'apikey': process.env.SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
        };

        let res;
        if (operation === 'INSERT') {
            res = await fetch(baseUrl, {
                method: 'POST',
                headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
                body: JSON.stringify(cleanPayload)
            });
        } else if (operation === 'UPDATE') {
            res = await fetch(`${baseUrl}?id=eq.${cleanPayload.id || payload.recordId}`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify(cleanPayload)
            });
        } else if (operation === 'DELETE') {
            res = await fetch(`${baseUrl}?id=eq.${cleanPayload.id || payload.recordId}`, {
                method: 'DELETE',
                headers
            });
        }

        if (res && !res.ok) {
            const errorText = await res.text();
            throw new Error(`Cloud DB Error: ${res.status} - Details: ${errorText}`);
        }
    }

    async enqueue(operation, tableName, recordId, payload) {
        try {
            await SyncQueue.create({ operation, tableName, recordId: String(recordId), payload });
        } catch (err) {
            console.error('❌ Sync: Failed to enqueue:', err.message);
        }
    }
}

module.exports = new SyncService();