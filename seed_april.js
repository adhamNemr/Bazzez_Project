/**
 * Seed script: Insert realistic April 2026 data into daily_closing
 * Run: node seed_april.js
 */
const { DailyClosing } = require('./models');

const aprilData = [
    // Week 1
    { day: '2026-04-01', orders: 8,  items: 12, revenue: 3200, cost: 1400, expenses: 150, discount: 100, online: 800 },
    { day: '2026-04-02', orders: 6,  items: 9,  revenue: 2700, cost: 1200, expenses: 80,  discount: 50,  online: 600 },
    { day: '2026-04-03', orders: 10, items: 15, revenue: 4100, cost: 1800, expenses: 200, discount: 150, online: 1200 },
    { day: '2026-04-04', orders: 3,  items: 4,  revenue: 1400, cost: 600,  expenses: 50,  discount: 0,   online: 350 },
    { day: '2026-04-05', orders: 12, items: 18, revenue: 5200, cost: 2300, expenses: 250, discount: 200, online: 1500 },
    { day: '2026-04-06', orders: 7,  items: 10, revenue: 2900, cost: 1300, expenses: 120, discount: 80,  online: 700 },
    { day: '2026-04-07', orders: 4,  items: 5,  revenue: 1600, cost: 700,  expenses: 60,  discount: 30,  online: 400 },
    // Week 2
    { day: '2026-04-08', orders: 9,  items: 14, revenue: 3800, cost: 1700, expenses: 180, discount: 120, online: 950 },
    { day: '2026-04-09', orders: 11, items: 16, revenue: 4500, cost: 2000, expenses: 220, discount: 180, online: 1300 },
    { day: '2026-04-10', orders: 5,  items: 7,  revenue: 2100, cost: 900,  expenses: 100, discount: 60,  online: 500 },
    { day: '2026-04-11', orders: 8,  items: 11, revenue: 3300, cost: 1500, expenses: 140, discount: 90,  online: 850 },
    { day: '2026-04-12', orders: 13, items: 20, revenue: 5800, cost: 2600, expenses: 300, discount: 250, online: 1800 },
    { day: '2026-04-13', orders: 6,  items: 8,  revenue: 2500, cost: 1100, expenses: 90,  discount: 40,  online: 600 },
    { day: '2026-04-14', orders: 4,  items: 5,  revenue: 1500, cost: 650,  expenses: 50,  discount: 20,  online: 350 },
    // Week 3
    { day: '2026-04-15', orders: 10, items: 15, revenue: 4200, cost: 1900, expenses: 200, discount: 160, online: 1100 },
    { day: '2026-04-16', orders: 7,  items: 10, revenue: 3000, cost: 1350, expenses: 130, discount: 70,  online: 750 },
    { day: '2026-04-17', orders: 9,  items: 13, revenue: 3700, cost: 1650, expenses: 170, discount: 100, online: 900 },
    { day: '2026-04-18', orders: 14, items: 22, revenue: 6200, cost: 2800, expenses: 350, discount: 280, online: 2000 },
    { day: '2026-04-19', orders: 11, items: 17, revenue: 4800, cost: 2100, expenses: 230, discount: 190, online: 1400 },
    { day: '2026-04-20', orders: 5,  items: 7,  revenue: 2000, cost: 900,  expenses: 80,  discount: 50,  online: 500 },
    { day: '2026-04-21', orders: 3,  items: 4,  revenue: 1200, cost: 500,  expenses: 40,  discount: 0,   online: 300 },
    // Week 4
    { day: '2026-04-22', orders: 8,  items: 12, revenue: 3400, cost: 1500, expenses: 160, discount: 110, online: 850 },
    { day: '2026-04-23', orders: 10, items: 14, revenue: 4000, cost: 1800, expenses: 190, discount: 140, online: 1000 },
    { day: '2026-04-24', orders: 6,  items: 9,  revenue: 2600, cost: 1150, expenses: 100, discount: 60,  online: 650 },
    { day: '2026-04-25', orders: 15, items: 24, revenue: 6800, cost: 3000, expenses: 400, discount: 320, online: 2200 },
    { day: '2026-04-26', orders: 12, items: 18, revenue: 5100, cost: 2300, expenses: 260, discount: 200, online: 1500 },
    { day: '2026-04-27', orders: 7,  items: 10, revenue: 2800, cost: 1250, expenses: 110, discount: 70,  online: 700 },
    { day: '2026-04-28', orders: 4,  items: 6,  revenue: 1800, cost: 800,  expenses: 70,  discount: 30,  online: 450 },
    { day: '2026-04-29', orders: 9,  items: 13, revenue: 3600, cost: 1600, expenses: 180, discount: 130, online: 900 },
    { day: '2026-04-30', orders: 11, items: 16, revenue: 4600, cost: 2050, expenses: 240, discount: 170, online: 1200 },
];

async function seed() {
    try {
        console.log('🌱 بدء إدخال بيانات شهر أبريل 2026...');

        for (const d of aprilData) {
            const earnings = parseFloat((d.revenue - d.cost - d.expenses).toFixed(2));
            await DailyClosing.findOrCreate({
                where: { closingDate: d.day },
                defaults: {
                    closingDate: d.day,
                    totalOrders: d.orders,
                    totalSandwiches: d.items,
                    totalRevenue: d.revenue,
                    totalCost: d.cost,
                    totalExpenses: d.expenses,
                    totalEarnings: earnings,
                    totalDiscount: d.discount,
                    onlinePaymentsTotal: d.online,
                }
            });
            console.log(`  ✅ ${d.day} — ${d.orders} طلب — ${d.revenue} EGP`);
        }

        console.log('\n🎉 تم إدخال جميع بيانات أبريل بنجاح!');
        console.log('────────────────────────────────────────');

        // Quick verification
        const { Op } = require('sequelize');
        const count = await DailyClosing.count({
            where: { closingDate: { [Op.gte]: '2026-04-01', [Op.lt]: '2026-05-01' } }
        });
        const totalRev = await DailyClosing.sum('totalRevenue', {
            where: { closingDate: { [Op.gte]: '2026-04-01', [Op.lt]: '2026-05-01' } }
        });
        const totalEarn = await DailyClosing.sum('totalEarnings', {
            where: { closingDate: { [Op.gte]: '2026-04-01', [Op.lt]: '2026-05-01' } }
        });

        console.log(`📊 إجمالي الأيام المدخلة: ${count}`);
        console.log(`💰 إجمالي المبيعات: ${totalRev} EGP`);
        console.log(`📈 صافي الربح: ${totalEarn} EGP`);

    } catch (err) {
        console.error('❌ Error seeding:', err);
    } finally {
        process.exit(0);
    }
}

seed();
