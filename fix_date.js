const { DailyClosing, Setting, Order } = require('./models');

(async () => {
  try {
    console.log("Starting DB fix...");
    // 1. Remove the mistakenly closed 2026-05-11
    const deletedCount = await DailyClosing.destroy({ where: { closingDate: '2026-05-11' } });
    console.log(`Deleted ${deletedCount} DailyClosing records for 2026-05-11`);
    
    // 2. Set active_business_date back to 2026-05-10
    await Setting.upsert({ key: 'active_business_date', value: '2026-05-10', group: 'system' });
    console.log("active_business_date set to 2026-05-10");

    // 3. Unarchive any orders that might have been accidentally archived when 11 was closed
    const unarchived = await Order.update({ archived: false }, { where: { businessDate: '2026-05-11' } });
    console.log(`Unarchived orders for 2026-05-11:`, unarchived);

    console.log("Fix completed successfully.");
  } catch (e) {
    console.error("Error during DB fix:", e);
  }
  process.exit();
})();
