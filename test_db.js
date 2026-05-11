const { Setting, DailyClosing } = require('./models');

async function test() {
    const setting = await Setting.findOne({ where: { key: 'active_business_date' } });
    console.log("Current active_business_date:", setting ? setting.value : 'None');
    
    const closings = await DailyClosing.findAll({ attributes: ['closingDate'] });
    console.log("Closed days:", closings.map(c => c.closingDate).sort());
}
test().catch(console.error).finally(() => process.exit(0));
