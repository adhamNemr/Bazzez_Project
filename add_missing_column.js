const { sequelize } = require('./models');

async function fixTable() {
    try {
        console.log('🚀 Checking columns in daily_closing...');
        const [results] = await sequelize.query("SHOW COLUMNS FROM daily_closing LIKE 'totalExpenses'");
        
        if (results.length === 0) {
            console.log('➕ Adding totalExpenses column to daily_closing...');
            await sequelize.query("ALTER TABLE daily_closing ADD COLUMN totalExpenses DECIMAL(10, 2) DEFAULT 0.00 AFTER totalCost");
            console.log('✅ Column totalExpenses added successfully.');
        } else {
            console.log('ℹ️ Column totalExpenses already exists.');
        }
    } catch (err) {
        console.error('❌ Error fixing table:', err);
    } finally {
        await sequelize.close();
    }
}

fixTable();
