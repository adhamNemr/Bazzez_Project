// restore_data.js
require('dotenv').config();
const { 
    Product, Inventory, Customer, Order, OrderDetail, 
    Expense, Merchant, Setting, sequelize 
} = require('./models');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;

if (!url || !key) {
    console.error("❌ Missing Supabase credentials in .env");
    process.exit(1);
}

const headers = {
    'apikey': process.env.SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json'
};

async function pullTable(tableName, Model) {
    console.log(`📥 Pulling from Supabase table: ${tableName}...`);
    try {
        const fetchUrl = `${url}/rest/v1/${tableName}?select=*`;
        const res = await fetch(fetchUrl, { headers });
        
        if (!res.ok) {
            console.error(`⚠️ Table ${tableName} not found or inaccessible (HTTP ${res.status}). Skipping...`);
            return;
        }
        
        const data = await res.json();
        console.log(`✅ Fetched ${data.length} records for ${tableName}`);

        if (data.length > 0) {
            // Bulk create in local DB
            await Model.bulkCreate(data, { ignoreDuplicates: true });
            console.log(`💾 Saved ${data.length} records to local DB.`);
        }
    } catch (err) {
        console.error(`❌ Error pulling ${tableName}:`, err.message);
    }
}

async function restore() {
    console.log("🚀 Starting Data Restoration from Supabase (Corrected Tables)...");
    
    try {
        await sequelize.authenticate();
        console.log("✅ Local DB Connected.");

        // Pulling with EXACT table names as defined in Supabase
        await pullTable('Settings', Setting);
        await pullTable('Merchants', Merchant);
        await pullTable('customers', Customer);
        await pullTable('products', Product);
        await pullTable('inventory', Inventory);
        await pullTable('expenses', Expense);
        await pullTable('Orders', Order);
        await pullTable('OrderDetails', OrderDetail);

        console.log("\n✨ Restoration Complete! You can now start the server.");
    } catch (err) {
        console.error("💥 Critical Restoration Error:", err.message);
    } finally {
        process.exit();
    }
}

restore();
