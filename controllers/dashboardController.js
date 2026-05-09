const { Order, Setting, Customer, sequelize, Op } = require('../models');
const { ThermalPrinter, PrinterTypes } = require('node-thermal-printer');

// ✅ الدالة لجلب بيانات الـ Dashboard (بيانات حقيقية من Supabase)
exports.getDashboardData = async (req, res) => {
    try {
        const { Setting, Order, Customer } = require('../models');
        const activeDateSetting = await Setting.findOne({ where: { key: 'active_business_date' } });
        const today = activeDateSetting ? activeDateSetting.value : new Date().toLocaleDateString('en-CA');

        console.log("📊 Fetching Dashboard Data for date:", today);

        // 1️⃣ إجمالي الطلبات
        const totalOrders = await Order.count({ where: { businessDate: today, isCancelled: "No" } });

        // 2️⃣ إجمالي المبيعات
        const totalRevenueResult = await Order.findAll({
            attributes: [[sequelize.fn('SUM', sequelize.col('orderTotal')), 'total']],
            where: { businessDate: today, isCancelled: "No" },
            raw: true
        });
        const totalRevenue = parseFloat(totalRevenueResult[0]?.total || 0);

        // 3️⃣ متوسط قيمة الفاتورة
        const avgOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : 0;

        // 4️⃣ عدد العملاء النشطين اليوم
        const activeCustomers = await Order.count({
            distinct: true,
            col: 'customerId',
            where: { businessDate: today, isCancelled: "No" }
        });

        // 5️⃣ آخر 5 عمليات (تستخدم dailySerial بدل الـ ID العام)
        const recentActivity = await Order.findAll({
            where: { businessDate: today, isCancelled: "No" },
            order: [['id', 'DESC']],
            limit: 5,
            attributes: ['dailySerial', 'customerName', 'orderTotal', 'createdAt'],
            raw: true
        });

        // 6️⃣ أكثر المنتجات طلباً اليوم
        const orders = await Order.findAll({
            where: { businessDate: today, isCancelled: "No" },
            attributes: ['orderDetails']
        });

        const productMap = {};
        orders.forEach(o => {
            try {
                const items = typeof o.orderDetails === 'string' ? JSON.parse(o.orderDetails) : o.orderDetails;
                if (Array.isArray(items)) {
                    items.forEach(item => {
                        productMap[item.name] = (productMap[item.name] || 0) + (item.quantity || 1);
                    });
                }
            } catch (e) { }
        });

        const topProducts = Object.entries(productMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4)
            .map(([name, qty]) => ({ name, sales: qty }));

        // 7️⃣ بيانات الرسم البياني الحقيقية (اليوم، أمس، الأسبوع)
        
        // دالة مساعدة لحساب مبيعات الساعات (24 ساعة - كل ساعتين نقطة)
        const getHourlyData = async (date) => {
            const data = new Array(12).fill(0); // 12 نقطة تغطي 24 ساعة
            const orders = await Order.findAll({
                where: { businessDate: date, isCancelled: "No" },
                attributes: ['orderTotal', 'createdAt'],
                raw: true
            });
            orders.forEach(o => {
                const hour = new Date(o.createdAt).getHours();
                let index = Math.floor(hour / 2); // من 0 لـ 11
                if (index >= 0 && index < 12) data[index] += parseFloat(o.orderTotal || 0);
            });
            return data;
        };

        const todayChart = await getHourlyData(today);
        
        // حساب تاريخ أمس
        const yesterdayDate = new Date();
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterdayStr = yesterdayDate.toLocaleDateString('en-CA');
        const yesterdayChart = await getHourlyData(yesterdayStr);

        // حساب بيانات الأسبوع (آخر 7 أيام)
        const weekLabels = [];
        const weekData = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dStr = d.toLocaleDateString('en-CA');
            const dayName = d.toLocaleDateString('ar-EG', { weekday: 'short' });
            
            const dayRevenue = await Order.sum('orderTotal', { 
                where: { businessDate: dStr, isCancelled: "No" } 
            }) || 0;
            
            weekLabels.push(dayName);
            weekData.push(parseFloat(dayRevenue.toFixed(2)));
        }

        res.json({
            totalOrders,
            totalRevenue: parseFloat(totalRevenue.toFixed(2)),
            avgOrderValue: parseFloat(avgOrderValue),
            activeCustomers,
            recentActivity: recentActivity.map(a => ({...a, id: a.dailySerial})), // تبديل الـ ID بالرقم اليومي للعرض
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

