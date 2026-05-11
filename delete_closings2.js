const { DailyClosing, Order } = require('./models');

async function checkAndRevert() {
    try {
        const closings = await DailyClosing.findAll({ attributes: ['id', 'closingDate'] });
        console.log("Found closings:");
        closings.forEach(c => {
            const dateStr = new Date(c.closingDate).toLocaleDateString('en-CA');
            console.log(`ID: ${c.id}, Date: ${dateStr}`);
        });

        const toDeleteIds = closings
            .filter(c => {
                const dateStr = new Date(c.closingDate).toLocaleDateString('en-CA');
                return dateStr === '2026-05-11' || dateStr === '2026-05-12'|| dateStr === '2026-05-10'|| dateStr === '2026-05-09';
            })
            .map(c => c.id);

        if (toDeleteIds.length > 0) {
            console.log("Deleting IDs:", toDeleteIds);
            const deleted = await DailyClosing.destroy({ where: { id: toDeleteIds } });
            console.log(`Deleted ${deleted} records.`);
        } else {
            console.log("No matching closing records found to delete.");
        }

    } catch (err) {
        console.error(err);
    }
}
checkAndRevert().finally(() => process.exit(0));
