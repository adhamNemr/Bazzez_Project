const { sequelize } = require('./models');

async function resetLocalDB() {
    console.log("==========================================");
    console.log("🚀 STARTING LOCAL DATABASE WIPE 🚀");
    console.log("==========================================");

    try {
        // أسماء الجداول في الداتابيز المحلية
        const localTables = [
            '"Orders"', '"OrderDetails"', '"Payments"', '"Expenses"', 
            '"MerchantTransactions"', '"SyncQueues"', '"AuditLogs"', 
            '"RateLimitLogs"', '"TokenBlacklists"', '"DailyClosings"', '"MonthlyClosings"'
        ];

        for (const table of localTables) {
            await sequelize.query(`DELETE FROM ${table};`).catch((err) => {
                // Ignore if table doesn't exist
            });
            console.log(`✅ Cleared local table: ${table.replace(/"/g, '')}`);
        }

        // تصفير عدادات الفواتير والأيام
        await sequelize.query(`DELETE FROM "Settings" WHERE key = 'last_serial_date';`).catch(() => {});
        await sequelize.query(`DELETE FROM "Settings" WHERE key = 'daily_serial';`).catch(() => {});
        console.log("✅ Reset order counters (serial numbers).");

        // تقليص حجم قاعدة البيانات بعد المسح
        await sequelize.query(`VACUUM;`);
        console.log("✅ Vacuumed Database.");
        
    } catch (err) {
        console.error("❌ Error wiping local DB:", err);
    }

    console.log("\n==========================================");
    console.log("🎉 LOCAL RESET COMPLETE! THE SYSTEM IS 100% CLEAN. 🎉");
    console.log("==========================================");
    process.exit(0);
}

resetLocalDB();
