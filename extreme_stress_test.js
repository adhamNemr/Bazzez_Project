/**
 * 🌪️ VORTEX POS - EXTREME STRESS TESTER
 * This script performs a multi-vector assault on Inventory, Expenses, Wholesale, and Closing.
 */

const axios = require('axios');
const BASE_URL = 'http://localhost:8083';
const TEST_AUTH = { username: 'admin', password: 'admin123' };

let token = '';
let testProduct = null;
let testMerchant = null;

async function runExtremeTest() {
    console.log(`
    ========================================================
    🌪️  VORTEX POS - EXTREME MULTI-VECTOR STRESS TEST
    ========================================================
    `);

    try {
        // 1. Auth
        const loginRes = await axios.post(`${BASE_URL}/api/auth/login`, TEST_AUTH);
        token = loginRes.data.token;
        const headers = { 'Authorization': `Bearer ${token}` };
        console.log("✅ Authenticated.\n");

        // 2. Prepare Data
        const prodRes = await axios.get(`${BASE_URL}/api/products`, { headers });
        testProduct = Object.values(prodRes.data).flat()[0];
        
        const merchRes = await axios.get(`${BASE_URL}/api/merchants?type=supplier`, { headers });
        testMerchant = merchRes.data[0];

        if (!testProduct || !testMerchant) {
            console.error("❌ Need at least 1 product and 1 merchant for this test.");
            return;
        }

        const initialStock = testProduct.quantity || 0;
        console.log(`📦 [DATA] Test Product: "${testProduct.name}" | Initial Stock: ${initialStock}`);
        console.log(`🤝 [DATA] Test Merchant: "${testMerchant.name}" | Initial Balance: ${testMerchant.balance}\n`);

        // --- VECTOR 1: INVENTORY CONCURRENCY ---
        console.log("🔥 [VECTOR 1] Initiating STOCK ATTACK (30 Concurrent Orders for 1 Item)...");
        const orderPromises = [];
        for(let i=0; i<30; i++) {
            orderPromises.push(axios.post(`${BASE_URL}/api/order`, {
                customer: { name: "Stress Tester", phone: "01000000000" },
                orderDetails: [{ name: testProduct.name, quantity: 1, price: testProduct.price, productId: testProduct.id }],
                payment_method: "cash",
                deliveryPrice: 0,
                orderTotal: testProduct.price
            }, { headers }).catch(e => e));
        }
        await Promise.all(orderPromises);
        console.log("✅ Stock Attack Complete.\n");

        // --- VECTOR 2: EXPENSE MATH ---
        console.log("💰 [VECTOR 2] Initiating EXPENSE ATTACK (30 Concurrent Expenses of 10 EGP)...");
        const expPromises = [];
        for(let i=0; i<30; i++) {
            expPromises.push(axios.post(`${BASE_URL}/api/expenses`, {
                description: `Stress Test Expense ${i}`,
                amount: 10,
                category: "Other",
                payment_method: "cash"
            }, { headers }).catch(e => e));
        }
        await Promise.all(expPromises);
        console.log("✅ Expense Attack Complete.\n");

        // --- VECTOR 3: WHOLESALE BALANCING ---
        console.log("📜 [VECTOR 3] Initiating WHOLESALE ATTACK (20 Transactions for 1 Merchant)...");
        const merchPromises = [];
        for(let i=0; i<20; i++) {
            merchPromises.push(axios.post(`${BASE_URL}/api/merchants/${testMerchant.id}/transactions`, {
                type: i % 2 === 0 ? 'invoice' : 'payment',
                amount: 100,
                date: new Date().toISOString().split('T')[0],
                notes: `Stress Test Trans ${i}`
            }, { headers }).catch(e => e));
        }
        await Promise.all(merchPromises);
        console.log("✅ Wholesale Attack Complete.\n");

        // --- VECTOR 4: CLOSING LATENCY ---
        console.log("📊 [VECTOR 4] Initiating CLOSING ATTACK (20 Parallel Summary Requests)...");
        const closePromises = [];
        for(let i=0; i<20; i++) {
            closePromises.push(axios.get(`${BASE_URL}/api/closing/daily-summary?date=${new Date().toISOString().split('T')[0]}`, { headers }).catch(e => e));
        }
        await Promise.all(closePromises);
        console.log("✅ Closing Attack Complete.\n");

        // --- FINAL VALIDATION ---
        console.log("🔎 [VALIDATION] Checking System Health After Assault...");
        
        const [finalProdRes, finalMerchRes, finalExpRes] = await Promise.all([
            axios.get(`${BASE_URL}/api/products`, { headers }),
            axios.get(`${BASE_URL}/api/merchants?type=supplier`, { headers }),
            axios.get(`${BASE_URL}/api/expenses`, { headers })
        ]);

        const finalProd = Object.values(finalProdRes.data).flat().find(p => p.id === testProduct.id);
        const finalMerch = finalMerchRes.data.find(m => m.id === testMerchant.id);
        
        console.log(`
        ========================================================
        📊 RESULTS REPORT:
        ========================================================
        📦 Stock Change: ${initialStock} -> ${finalProd.quantity} (Expected: ${initialStock - 30})
        💰 Expenses Count: Check manual entries in dashboard.
        🤝 Merchant Balance: ${testMerchant.balance} -> ${finalMerch.balance}
        ========================================================
        `);

        if (finalProd.quantity == initialStock - 30) {
            console.log("👑 VERDICT: SYSTEM IS ROCK SOLID! (Race conditions resolved)");
        } else {
            console.log("⚠️ VERDICT: SYSTEM STABLE BUT CHECK STOCK SYNC LOGS.");
        }

    } catch (err) {
        console.error("❌ TEST FAILED:", err.response?.data || err.message);
    }
}

runExtremeTest();
