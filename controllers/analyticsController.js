const { Order, Customer, Product, Inventory } = require("../models");
const { Op, Sequelize } = require("sequelize");
const moment = require("moment");

// ✅ API: جلب بيانات التحليلات العامة
exports.getAnalytics = async (req, res) => {
    try {
        console.log("📊 بدء تحليل البيانات...");

        // 🔹 إجمالي عدد الطلبات
        const totalOrders = await Order.count();

        // 🔹 إجمالي الإيرادات
        const totalRevenue = (await Order.sum("orderTotal")) || 0;

        // 🔹 جلب إحصائيات الإيرادات لكل يوم (آخر 7 أيام) باستخدام GROUP BY
        const revenueByDay = await Order.findAll({
            attributes: [
                [Sequelize.fn('DATE', Sequelize.col('createdAt')), 'date'],
                [Sequelize.fn('COUNT', Sequelize.col('id')), 'orders'],
                [Sequelize.fn('SUM', Sequelize.col('orderTotal')), 'revenue']
            ],
            where: {
                createdAt: { [Op.gte]: Sequelize.literal("CURRENT_DATE - INTERVAL '7 days'") },
                isCancelled: 'No'
            },
            group: [Sequelize.fn('DATE', Sequelize.col('createdAt'))],
            order: [[Sequelize.fn('DATE', Sequelize.col('createdAt')), 'ASC']],
            raw: true
        });

        // 🔹 تحويل النتائج لتنسيق العرض المطلوب
        const last7Days = [];
        const revenueMap = Object.fromEntries(revenueByDay.map(d => [d.date, d]));
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const formattedDate = date.toISOString().split("T")[0];
            const dayData = revenueMap[formattedDate] || { orders: 0, revenue: 0 };
            
            last7Days.push({ 
                date: formattedDate, 
                orders: parseInt(dayData.orders) || 0, 
                revenue: parseFloat(dayData.revenue) || 0 
            });
        }

        // ✅ جلب المنتجات الأكثر والأقل طلبًا (كما هي)
        const topProducts = await Product.findAll({
            attributes: ['name', 'sold'],
            order: [["sold", "DESC"]],
            limit: 5,
            raw: true
        });

        const leastProducts = await Product.findAll({
            attributes: ['name', 'sold'],
            order: [["sold", "ASC"]],
            limit: 5,
            raw: true
        });

        // ✅ جلب العملاء الأكثر طلبًا باستخدام GROUP BY (حل مشكلة N+1)
        const topCustomers = await Order.findAll({
            attributes: [
                'customerId',
                [Sequelize.fn('COUNT', Sequelize.col('Order.id')), 'ordersCount']
            ],
            where: { customerId: { [Op.ne]: null } },
            group: ['customerId', 'Customer.id'],
            include: [{ 
                model: Customer, 
                attributes: ['name'] 
            }],
            order: [[Sequelize.literal('"ordersCount"'), 'DESC']],
            limit: 5,
            raw: true,
            nest: true
        });

        // 🔹 تنسيق بيانات العملاء للعرض
        const formattedTopCustomers = topCustomers.map(c => ({
            id: c.customerId,
            name: c.Customer?.name || "عميل مجهول",
            ordersCount: parseInt(c.ordersCount) || 0
        }));

        res.json({
            totalOrders,
            totalRevenue,
            last7Days,
            topProducts,
            leastProducts,
            topCustomers: formattedTopCustomers,
        });

    } catch (error) {
        console.error("❌ خطأ في API التحليلات:", error);
        res.status(500).json({ message: "حدث خطأ أثناء جلب بيانات التحليلات", error: error.message });
    }
};

exports.getLowStockProducts = async (req, res) => {
    try {
        const lowStockItems = await Inventory.findAll({
            where: { quantity: { [Op.lte]: Sequelize.col("min") } },
            order: [["quantity", "ASC"]]
        });

        const expiryItems = await Inventory.findAll({
            where: { expiryDate: { [Op.between]: [moment().toDate(), moment().add(7, "days").toDate()] } },
            order: [["expiryDate", "ASC"]]
        });

        return res.json({
            success: true,
            lowStock: lowStockItems,
            expirySoon: expiryItems
        });
    } catch (error) {
        console.error("❌ خطأ في `getLowStockProducts`:", error);
        return res.status(500).json({
            success: false,
            message: "حدث خطأ أثناء جلب المنتجات القليلة المخزون."
        });
    }
};

// ✅ API: تحليل المخزون حسب الفئات
exports.getStockByCategory = async (req, res) => {
    try {
        console.log("📂 تحليل المخزون حسب الفئات...");
        const stockByCategory = await Product.findAll({
            attributes: ['category', [Sequelize.fn('SUM', Sequelize.col('stock_quantity')), 'total_stock']],
            group: ['category']
        });

        res.json({ success: true, data: stockByCategory });

    } catch (error) {
        console.error("❌ خطأ في `getStockByCategory`:", error);
        res.status(500).json({ success: false, message: 'خطأ في تحليل المخزون حسب الفئات', error: error.message });
    }
};

// ✅ API: توقع كمية المخزون المتبقية
exports.getStockForecast = async (req, res) => {
    try {
        console.log("📊 حساب توقعات المخزون...");
        const products = await Product.findAll({
            attributes: ['id', 'name', 'stock_quantity', 'sold']
        });

        const forecastData = products.map(product => {
            const avgDailySales = product.sold > 0 ? product.sold / 30 : 0;
            const estimatedStockLeft = avgDailySales > 0 ? Math.round(product.stock_quantity / avgDailySales) : 'غير متاح';

            return { ...product.toJSON(), avgDailySales, estimatedStockLeft };
        });

        res.json({ success: true, data: forecastData });

    } catch (error) {
        console.error("❌ خطأ في `getStockForecast`:", error);
        res.status(500).json({ success: false, message: 'خطأ في التوقعات المستقبلية للمخزون', error: error.message });
    }
};