const { 
    sequelize, 
    Customer, 
    Product, 
    Order, 
    OrderDetail, 
    Sale, 
    Inventory, 
    Recipe, 
    DailyClosing, 
    MonthlyClosing, 
    Payment, 
    DiscountCode, 
    Comment, 
    Expense 
} = require('./models');

async function fullSystemReset() {
    try {
        console.log("🚀 Starting COMPLETE system wipe...");

        const modelsToWipe = [
            { name: 'Order Details', model: OrderDetail },
            { name: 'Orders', model: Order },
            { name: 'Sales', model: Sale },
            { name: 'Order Comments/Addons', model: Comment },
            { name: 'Products', model: Product },
            { name: 'Inventory', model: Inventory },
            { name: 'Recipes', model: Recipe },
            { name: 'Customers', model: Customer },
            { name: 'Daily Closings', model: DailyClosing },
            { name: 'Monthly Closings', model: MonthlyClosing },
            { name: 'Payments', model: Payment },
            { name: 'Expenses', model: Expense },
            { name: 'Discount Codes', model: DiscountCode },
        ];

        for (const item of modelsToWipe) {
            console.log(`🧹 Wiping ${item.name}...`);
            await item.model.destroy({ where: {}, truncate: false });
        }

        // Reset auto-increment counters if possible
        console.log("🔄 Resetting database counters...");
        try {
            const tables = [
                'order_details', 'orders', 'sales', 'comments', 'products', 
                'inventories', 'recipes', 'customers', 'daily_closings', 
                'monthly_closings', 'payments', 'expenses', 'discount_codes'
            ];
            for (const table of tables) {
                await sequelize.query(`DELETE FROM sqlite_sequence WHERE name='${table}';`);
            }
        } catch (seqError) {
            console.warn("⚠️ Could not reset sqlite sequences, but data is wiped.");
        }

        console.log("\n✅ SUCCESS: The system is now 100% EMPTY.");
        console.log("📦 All Products, Orders, Customers, and Financial records have been deleted.");
        console.log("🔐 Users and Settings were PRESERVED for login and configuration.");
        console.log("🚀 Vortex POS is now ready for a fresh start!");
        
        process.exit(0);
    } catch (error) {
        console.error("❌ CRITICAL ERROR during system wipe:", error);
        process.exit(1);
    }
}

fullSystemReset();
