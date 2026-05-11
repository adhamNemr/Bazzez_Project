const { DailyClosing, Order, Setting } = require('./models');

async function revertClosings() {
    try {
        console.log("Reverting closings for 2026-05-11 and 2026-05-12...");

        // Delete DailyClosing records
        const deleted = await DailyClosing.destroy({
            where: {
                closingDate: ['2026-05-11', '2026-05-12', '2026-05-10', '2026-05-09']
            }
        });
        console.log(`Deleted ${deleted} closing records.`);

        // Un-archive orders for those dates
        const updatedOrders = await Order.update(
            { archived: false },
            { 
                where: { 
                    businessDate: ['2026-05-11', '2026-05-12', '2026-05-10', '2026-05-09'] 
                } 
            }
        );
        console.log(`Unarchived ${updatedOrders[0]} orders.`);

        // Set active_business_date to 2026-05-11
        await Setting.upsert({ key: 'active_business_date', value: '2026-05-08', group: 'system' });
        console.log("Set active_business_date to 2026-05-08");

    } catch (err) {
        console.error("Error reverting closings:", err);
    }
}

revertClosings().finally(() => process.exit(0));
