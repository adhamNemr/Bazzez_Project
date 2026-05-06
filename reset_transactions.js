const { sequelize, Order, OrderItem, DailyClosing, Expense } = require('./models');

async function resetSystemForProduction() {
    try {
        console.log("⚠️ Starting system reset for Production...");

        // 1. Delete all transactions (orders, items, expenses, closings)
        console.log("🧹 Clearing Order Items...");
        await OrderItem.destroy({ where: {} });

        console.log("🧹 Clearing Orders...");
        await Order.destroy({ where: {} });

        console.log("🧹 Clearing Expenses...");
        await Expense.destroy({ where: {} });

        console.log("🧹 Clearing Daily Closings...");
        await DailyClosing.destroy({ where: {} });

        // Optionally, reset auto-increment counters for MySQL
        console.log("🔄 Resetting Auto-Increment counters...");
        await sequelize.query('ALTER TABLE `order_items` AUTO_INCREMENT = 1;');
        await sequelize.query('ALTER TABLE `orders` AUTO_INCREMENT = 1;');
        await sequelize.query('ALTER TABLE `expenses` AUTO_INCREMENT = 1;');
        await sequelize.query('ALTER TABLE `daily_closing` AUTO_INCREMENT = 1;');

        console.log("✅ System successfully wiped! Transaction history is clean.");
        console.log("🚀 The system is now ready for REAL operations!");
        
        process.exit(0);
    } catch (error) {
        console.error("❌ Error resetting database:", error);
        process.exit(1);
    }
}

resetSystemForProduction();
