const { Order, Setting, Customer, sequelize } = require('../models');
const { Op } = require('sequelize');
const { ThermalPrinter, PrinterTypes } = require('node-thermal-printer');

// ✅ الدالة لجلب بيانات الـ Dashboard (بيانات حقيقية من Supabase)
exports.getDashboardData = async (req, res) => {
    try {
        const { Setting, Order } = require('../models');
        const activeDateSetting = await Setting.findOne({ where: { key: 'active_business_date' } });
        const today = activeDateSetting ? activeDateSetting.value : new Date().toLocaleDateString('en-CA');

        console.log("📊 Fetching Dashboard Data for date:", today);

        // 🚀 Parallel Execution Strategy: Fetch counts, sums, and lists concurrently
        const [
            totalOrders,
            revenueResult,
            activeCustomers,
            recentActivity,
            todayOrders,
            yesterdayOrders,
            weekRevenues
        ] = await Promise.all([
            // 1. Total Orders
            Order.count({ where: { businessDate: today, isCancelled: "No" } }),
            // 2. Revenue Sum
            Order.findAll({
                attributes: [[sequelize.fn('SUM', sequelize.col('orderTotal')), 'total']],
                where: { businessDate: today, isCancelled: "No" },
                raw: true
            }),
            // 3. Unique Customers
            Order.count({
                distinct: true,
                col: 'customerId',
                where: { businessDate: today, isCancelled: "No" }
            }),
            // 4. Recent Activity
            Order.findAll({
                where: { businessDate: today, isCancelled: "No" },
                order: [['id', 'DESC']],
                limit: 5,
                attributes: ['dailySerial', 'customerName', 'orderTotal', 'createdAt'],
                raw: true
            }),
            // 5. Today's Data (for Chart & Top Products)
            Order.findAll({
                where: { businessDate: today, isCancelled: "No" },
                attributes: ['orderTotal', 'createdAt', 'orderDetails'],
                raw: true
            }),
            // 6. Yesterday's Data
            Order.findAll({
                where: { 
                    businessDate: new Date(new Date(today).getTime() - 86400000).toLocaleDateString('en-CA'), 
                    isCancelled: "No" 
                },
                attributes: ['orderTotal', 'createdAt'],
                raw: true
            }),
            // 7. Weekly Summary
            Order.findAll({
                attributes: [
                    'businessDate',
                    [sequelize.fn('SUM', sequelize.col('orderTotal')), 'total']
                ],
                where: {
                    businessDate: { [Op.gte]: new Date(new Date(today).getTime() - (6 * 86400000)).toLocaleDateString('en-CA') },
                    isCancelled: "No"
                },
                group: ['businessDate'],
                raw: true
            })
        ]);

        const totalRevenue = parseFloat(revenueResult[0]?.total || 0);
        const avgOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : 0;

        // 📊 Single Pass Processing for Today's Data (Hourly + Top Products)
        const todayChart = new Array(12).fill(0);
        const productMap = {};
        
        todayOrders.forEach(o => {
            // Hourly Chart logic
            const hour = new Date(o.createdAt).getHours();
            const idx = Math.floor(hour / 2);
            if (idx >= 0 && idx < 12) todayChart[idx] += parseFloat(o.orderTotal || 0);

            // Top Products logic
            try {
                const items = typeof o.orderDetails === 'string' ? JSON.parse(o.orderDetails) : o.orderDetails;
                if (Array.isArray(items)) {
                    items.forEach(item => {
                        productMap[item.name] = (productMap[item.name] || 0) + (item.quantity || 1);
                    });
                }
            } catch (e) {}
        });

        const topProducts = Object.entries(productMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4)
            .map(([name, qty]) => ({ name, sales: qty }));

        // 📊 Yesterday's Chart
        const yesterdayChart = new Array(12).fill(0);
        yesterdayOrders.forEach(o => {
            const hour = new Date(o.createdAt).getHours();
            const idx = Math.floor(hour / 2);
            if (idx >= 0 && idx < 12) yesterdayChart[idx] += parseFloat(o.orderTotal || 0);
        });

        // 📊 Weekly Chart Summary
        const revenueMap = {};
        weekRevenues.forEach(r => revenueMap[r.businessDate] = parseFloat(r.total || 0));

        const weekLabels = [];
        const weekData = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(new Date(today).getTime() - (i * 86400000));
            const dStr = d.toLocaleDateString('en-CA');
            const dayName = d.toLocaleDateString('ar-EG', { weekday: 'short' });
            weekLabels.push(dayName);
            weekData.push(parseFloat((revenueMap[dStr] || 0).toFixed(2)));
        }

        res.json({
            totalOrders,
            totalRevenue: parseFloat(totalRevenue.toFixed(2)),
            avgOrderValue: parseFloat(avgOrderValue),
            activeCustomers,
            recentActivity: recentActivity.map(a => ({...a, id: a.dailySerial})),
            topProducts,
            charts: {
                today: todayChart,
                yesterday: yesterdayChart,
                week: { labels: weekLabels, data: weekData }
            }
        });
    } catch (error) {
        console.error('❌ Error in getDashboardData:', error);
        res.status(500).json({ error: 'Database connection error.' });
    }
};

// ✅ الدالة للتحقق من حالة النظام (مستقلة عن قاعدة البيانات)
exports.checkSystemStatus = async (req, res) => {
    try {
        let systemStatus = 'All Systems Operational ✅';
        let internetStatus = 'Connected ✅';
        let databaseStatus = 'Connected ✅';
        let printerStatus = 'Connected ✅';

        // ✅ التحقق من اتصال الإنترنت
        try {
            await fetch('https://www.google.com');
            console.log('✅ Internet Connection: OK');
        } catch (error) {
            console.error('❌ Internet Connection Error:', error);
            internetStatus = 'No Internet Connection ❌';
            systemStatus = 'Internet Issue Detected ❌';
        }

        // ✅ التحقق من اتصال قاعدة البيانات
        try {
            await sequelize.authenticate();
            console.log('✅ Database Connection: OK');
        } catch (error) {
            console.error('❌ Database Connection Error:', error);
            databaseStatus = 'Database Not Connected ❌';
            systemStatus = 'Database Issue Detected ❌';
        }

        // ✅ التحقق من اتصال الطابعة الحرارية
        try {
            const printer = new ThermalPrinter({
                type: PrinterTypes.EPSON,
                interface: 'usb',
            });

            if (!(await printer.isPrinterConnected())) {
                throw new Error('Printer not connected');
            }

            console.log('✅ Thermal Printer Connected');
        } catch (error) {
            console.error('❌ Thermal Printer Connection Error:', error);
            printerStatus = 'Printer Not Connected ❌';
            systemStatus = 'Printer Issue Detected ❌';
        }

        res.json({
            systemStatus,
            internetStatus,
            databaseStatus,
            printerStatus,
        });

    } catch (error) {
        console.error('❌ Error in checkSystemStatus:', error);
        res.status(500).json({ error: 'An error occurred while checking system status.' });
    }
};

