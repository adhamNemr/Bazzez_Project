require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

// الجداول اللي محتاجين نصفرها (المعاملات فقط، مع ترك المنتجات والمخزن)
const tablesToClear = [
    'Orders', 
    'OrderDetails', 
    'payments', 
    'Expenses', 
    'merchant_transactions', 
    'audit_logs', 
    'rate_limit_logs', 
    'token_blacklist', 
    'daily_closing', 
    'monthly_closing'
];

async function clearSupabaseTable(tableName) {
    console.log(`☁️ Clearing remote table: ${tableName} on Supabase...`);
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?id=not.is.null`, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        
        if (!response.ok) {
            console.log(`⚠️ Warning: Could not clear ${tableName} on Supabase (maybe it doesn't exist or uses different PK). Status: ${response.status}`);
        } else {
            console.log(`✅ Cleared remote table: ${tableName}`);
        }
    } catch (err) {
        console.log(`❌ Error connecting to Supabase for ${tableName}:`, err.message);
    }
}

async function resetSystem() {
    console.log("==========================================");
    console.log("🚀 STARTING FULL SYSTEM RESET 🚀");
    console.log("==========================================");

    // 1. مسح البيانات من السحابة أولاً لمنع عودتها
    console.log("\n[1] Wiping Remote Cloud Data (Supabase)...");
    for (const table of tablesToClear) {
        await clearSupabaseTable(table);
    }

    console.log("\n==========================================");
    console.log("🎉 CLOUD RESET COMPLETE! THE SUPABASE SYSTEM IS CLEAN. 🎉");
    console.log("==========================================");
    console.log("الخطوة القادمة: افتح برنامج DB Browser for SQLite ونفذ سكريبت reset_test_data.sql لتنظيف جهازك المحلي.");
    process.exit(0);
}

resetSystem();
