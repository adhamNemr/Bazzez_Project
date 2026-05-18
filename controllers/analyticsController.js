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

        // 🔹 Calculate date 7 days ago in JS (Dialect Agnostic)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const revenueByDay = await Order.findAll({
            attributes: [
                [Sequelize.fn('DATE', Sequelize.col('createdAt')), 'date'],
                [Sequelize.fn('COUNT', Sequelize.col('Order.id')), 'orders'],
                [Sequelize.fn('SUM', Sequelize.col('orderTotal')), 'revenue']
            ],
            where: {
                createdAt: { [Op.gte]: sevenDaysAgo },
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
            group: ['customerId', 'customer_info.id'],
            include: [{ 
                model: Customer, 
                as: 'customer_info',
                attributes: ['name'] 
            }],
            order: [[Sequelize.literal('ordersCount'), 'DESC']],
            limit: 5,
            raw: true,
            nest: true
        });

        // 🔹 تنسيق بيانات العملاء للعرض
        const formattedTopCustomers = topCustomers.map(c => ({
            id: c.customerId,
            name: c.customer_info?.name || "عميل مجهول",
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
        // Stock quantity is in Inventory model, linked to Product by name or id?
        // Assuming we join or query Inventory
        const stockByCategory = await Inventory.findAll({
            attributes: [
                [Sequelize.literal("(SELECT category FROM products WHERE products.name = Inventory.name LIMIT 1)"), 'category'],
                [Sequelize.fn('SUM', Sequelize.col('quantity')), 'total_stock']
            ],
            group: [Sequelize.literal('category')]
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
        const inventory = await Inventory.findAll({
            attributes: ['id', 'name', 'quantity']
        });

        const forecastData = await Promise.all(inventory.map(async item => {
            const product = await Product.findOne({ where: { name: item.name }, attributes: ['sold'] });
            const sold = product ? product.sold : 0;
            const avgDailySales = sold > 0 ? sold / 30 : 0;
            const estimatedStockLeft = avgDailySales > 0 ? Math.round(item.quantity / avgDailySales) : 'غير متاح';

            return { 
                id: item.id,
                name: item.name,
                stock_quantity: item.quantity,
                sold: sold,
                avgDailySales, 
                estimatedStockLeft 
            };
        }));

        res.json({ success: true, data: forecastData });

    } catch (error) {
        console.error("❌ خطأ في `getStockForecast`:", error);
        res.status(500).json({ success: false, message: 'خطأ في التوقعات المستقبلية للمخزون', error: error.message });
    }
};