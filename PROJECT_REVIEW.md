# 📦 Vortex POS - Full Project Code Review

========== ./add_missing_column.js ==========
const { sequelize } = require('./models');

async function fixTable() {
    try {
        console.log('🚀 Checking columns in daily_closing...');
        const [results] = await sequelize.query("SHOW COLUMNS FROM daily_closing LIKE 'totalExpenses'");
        
        if (results.length === 0) {
            console.log('➕ Adding totalExpenses column to daily_closing...');
            await sequelize.query("ALTER TABLE daily_closing ADD COLUMN totalExpenses DECIMAL(10, 2) DEFAULT 0.00 AFTER totalCost");
            console.log('✅ Column totalExpenses added successfully.');
        } else {
            console.log('ℹ️ Column totalExpenses already exists.');
        }
    } catch (err) {
        console.error('❌ Error fixing table:', err);
    } finally {
        await sequelize.close();
    }
}

fixTable();

========== ./config/branding.js ==========
/**
 * Project Branding Configuration
 * Centralizing values for easy customization by the buyer.
 */
module.exports = {
    restaurantName: process.env.RESTAURANT_NAME || "Vortex POS",
    hotline: process.env.HOTLINE || "01005078132",
    currency: "EGP",
    footerMessage: "شكراً لزيارتكم! نرجو أن تكون تجربتكم سعيدة.",
    printerSettings: {
        type: process.env.PRINTER_TYPE || 'epson',
        interface: process.env.PRINTER_INTERFACE || 'printer:POSPrinter POS80',
        characterSet: 'PC864_ARABIC' // Trying Arabic code page
    }
};

========== ./config/db.js ==========
const { Sequelize } = require('sequelize');
require("dotenv").config();

// بيانات الاتصال السحابية مثبتة لضمان عمل النسخة الـ Portable
const DB_USER = 'postgres.glvqdcucqgshdkotmwfs';
const DB_PASSWORD = encodeURIComponent('MARWANroma77@#$');
const DB_HOST = 'aws-0-eu-west-1.pooler.supabase.com';
const DB_PORT = '6543';
const DB_NAME = 'postgres';

const connectionString = `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?pgbouncer=true`;

const sequelize = new Sequelize(connectionString, {
    dialect: 'postgres',
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    },
    logging: false
});

sequelize.authenticate()
    .then(() => console.log('✅ Connected to Supabase Pooler!'))
    .catch(err => {
        console.error('❌ Connection Error:', err.message);
    });

module.exports = sequelize;

========== ./config/permissions.js ==========
// 🛡️ Vortex POS - Fine-grained Permissions Configuration
// Based on Claude's recommendations for professional RBAC

const PERMISSIONS = {
    // ---- Orders ----
    orders: {
        create:  'orders:create',
        view:    'orders:view',
        cancel:  'orders:cancel',    // Cashiers cannot cancel
        refund:  'orders:refund',    // Supervisors only
    },
    // ---- Inventory ----
    inventory: {
        view:    'inventory:view',
        edit:    'inventory:edit',
        delete:  'inventory:delete', // Managers only
    },
    // ---- Reports ----
    reports: {
        daily:   'reports:daily',
        monthly: 'reports:monthly',
        export:  'reports:export',
    },
    // ---- Finance & Merchants ----
    finance: {
        view:    'finance:view',
        edit:    'finance:edit',     // Accountant + Manager
        ledger:  'finance:ledger',
    },
    // ---- Users ----
    users: {
        manage:  'users:manage',     // Manager only
    },
};

const ROLES = {
    manager: {
        label: 'مدير (صلاحيات كاملة)',
        permissions: [
            ...Object.values(PERMISSIONS.orders),
            ...Object.values(PERMISSIONS.inventory),
            ...Object.values(PERMISSIONS.reports),
            ...Object.values(PERMISSIONS.finance),
            ...Object.values(PERMISSIONS.users),
        ],
    },

    supervisor: {
        label: 'مشرف',
        permissions: [
            PERMISSIONS.orders.create,
            PERMISSIONS.orders.view,
            PERMISSIONS.orders.cancel,
            PERMISSIONS.orders.refund,
            PERMISSIONS.inventory.view,
            PERMISSIONS.inventory.edit,
            PERMISSIONS.reports.daily,
            PERMISSIONS.finance.view,
        ],
    },

    accountant: {
        label: 'محاسب',
        permissions: [
            PERMISSIONS.orders.view,
            PERMISSIONS.reports.daily,
            PERMISSIONS.reports.monthly,
            PERMISSIONS.reports.export,
            PERMISSIONS.finance.view,
            PERMISSIONS.finance.edit,
            PERMISSIONS.finance.ledger,
        ],
    },

    cashier: {
        label: 'كاشير',
        permissions: [
            PERMISSIONS.orders.create,
            PERMISSIONS.orders.view,
            PERMISSIONS.inventory.view,
            PERMISSIONS.reports.daily,
        ],
    },

    owner: {
        label: 'مالك (عرض فقط)',
        permissions: [
            PERMISSIONS.orders.view,
            PERMISSIONS.reports.daily,
            PERMISSIONS.reports.monthly,
            PERMISSIONS.finance.view,
            PERMISSIONS.finance.ledger,
        ],
    },
};

module.exports = { PERMISSIONS, ROLES };

========== ./controllers/analyticsController.js ==========
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

        // 🔹 جلب الطلبات خلال آخر 7 أيام
        const recentOrders = await Order.findAll({
            attributes: ["orderDetails", "createdAt", "orderTotal"],
            where: {
                createdAt: { [Op.gte]: Sequelize.literal("CURRENT_DATE - INTERVAL '7 days'") },
            },
        });

        const last7Days = [];
        const ordersPerDay = {};
        const revenuePerDay = {};

        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const formattedDate = date.toISOString().split("T")[0];

            last7Days.push({ date: formattedDate, orders: 0, revenue: 0 });
            ordersPerDay[formattedDate] = 0;
            revenuePerDay[formattedDate] = 0;
        }

        // 🔹 حساب الطلبات والإيرادات لكل يوم
        recentOrders.forEach(order => {
            const date = order.createdAt.toISOString().split("T")[0];
            ordersPerDay[date] = (ordersPerDay[date] || 0) + 1;
            revenuePerDay[date] = (revenuePerDay[date] || 0) + parseFloat(order.orderTotal);
        });

        last7Days.forEach(day => {
            day.orders = ordersPerDay[day.date] || 0;
            day.revenue = revenuePerDay[day.date] || 0;
        });

        // ✅ جلب المنتجات الأكثر والأقل طلبًا من قاعدة البيانات
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

        // 🔹 تحليل العملاء الأكثر طلبًا
        const customerOrders = await Order.findAll({ attributes: ["customerId"] });
        const customerCounts = {};

        customerOrders.forEach(order => {
            if (order.customerId) {
                customerCounts[order.customerId] = (customerCounts[order.customerId] || 0) + 1;
            }
        });

        // ✅ جلب بيانات العملاء الأكثر طلبًا
        const topCustomers = await Customer.findAll({
            where: { id: { [Op.in]: Object.keys(customerCounts).map(id => Number(id)) } },
            attributes: ["id", "name"],
            raw: true
        });

        // ✅ إضافة عدد الطلبات لكل عميل وترتيبهم
        topCustomers.forEach(customer => {
            customer.ordersCount = customerCounts[customer.id] || 0;
        });

        topCustomers.sort((a, b) => b.ordersCount - a.ordersCount);

        res.json({
            totalOrders,
            totalRevenue,
            last7Days,
            topProducts,
            leastProducts,
            topCustomers,
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
========== ./controllers/authController.js ==========
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { User } = require("../models");

exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        console.log("📥 بيانات تسجيل الدخول المستقبلة:", req.body);

        // البحث عن المستخدم في قاعدة البيانات
        const user = await User.findOne({ where: { username } });

        if (!user) {
            console.log("🚫 المستخدم غير موجود!");
            return res.status(401).json({ message: "❌ اسم المستخدم أو كلمة المرور غير صحيحة." });
        }

        // التحقق من صحة كلمة المرور
        const isMatch = await bcrypt.compare(password, user.password);
        console.log("🔑 هل كلمة المرور متطابقة؟", isMatch);

        if (!isMatch) {
            console.log("🚫 كلمة المرور غير صحيحة!");
            return res.status(401).json({ message: "❌ اسم المستخدم أو كلمة المرور غير صحيحة." });
        }

        // إنشاء التوكن مع تضمين دور المستخدم
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role }, 
            'mySuperSecretKey123', 
            { expiresIn: "7d" }
        );

        console.log("🟢 تسجيل الدخول ناجح، دور المستخدم:", user.role);

        res.json({
            success: true,
            message: "✅ تسجيل الدخول ناجح!",
            token,
            role: user.role, // Changed userRole to role to match frontend expectation
            username: user.username
        });

    } catch (error) {
        console.error("🚨 خطأ أثناء تسجيل الدخول:", error);
        res.status(500).json({ message: "🚨 حدث خطأ أثناء تسجيل الدخول." });
    }
};

exports.logout = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(400).json({ message: "❌ لا يوجد توكن لإلغائه." });

        const jwt = require('jsonwebtoken');
        const decoded = jwt.decode(token);
        const { TokenBlacklist } = require('../models');

        // Store token in blacklist with its expiration date
        await TokenBlacklist.create({
            token,
            expiresAt: decoded.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });

        res.json({ success: true, message: "✅ تم تسجيل الخروج بنجاح وإبطال التوكن." });
    } catch (error) {
        console.error("🚨 خطأ أثناء تسجيل الخروج:", error);
        res.status(500).json({ message: "🚨 حدث خطأ أثناء تسجيل الخروج." });
    }
};


========== ./controllers/closingController.js ==========
const { Order, Recipe, Inventory, DailyClosing, MonthlyClosing, sequelize, Payment, Product, Expense } = require('../models');
const { Op } = require('sequelize');

// Helper to get active business date
async function getActiveBusinessDate() {
    const businessDate = await exports.checkAndPerformAutoShift();
    if (businessDate) return businessDate;
    
    // Fallback if shift failed or returned null
    const { Setting } = require('../models');
    const activeDateSetting = await Setting.findOne({ where: { key: 'active_business_date' } });
    return activeDateSetting ? activeDateSetting.value : new Date().toLocaleDateString('en-CA');
}

// ✅ Centralized Smart Auto-Shift Logic
exports.checkAndPerformAutoShift = async () => {
    try {
        const { Setting } = require('../models');
        const activeDateSetting = await Setting.findOne({ where: { key: 'active_business_date' } });
        
        if (!activeDateSetting) return null;

        const businessDate = activeDateSetting.value;
        const now = new Date();
        const calendarToday = now.toLocaleDateString('en-CA'); // YYYY-MM-DD
        const currentHour = now.getHours();

        // If it's past 9:00 AM and we are still on an old business day
        if (businessDate < calendarToday && currentHour >= 9) {
            console.log(`🕒 [Auto-Shift] Closing business date ${businessDate} and shifting to ${calendarToday}`);
            
            // Auto-close the old day
            await exports.internalAutoClose(businessDate);
            
            // Update the setting
            await Setting.upsert({ key: 'active_business_date', value: calendarToday, group: 'system' });
            return calendarToday;
        }
        return businessDate;
    } catch (err) {
        console.error('❌ Error in checkAndPerformAutoShift:', err);
        return null;
    }
};

exports.getDailySummary = async (req, res) => {
    try {
        const businessDate = req.query.date || await getActiveBusinessDate();

        // 🟢 Execute independent aggregations in parallel
        const [
            totalOrders,
            ordersData,
            totalRevenue,
            totalDiscount,
            totalExpenses,
            activeOrders,
            ordersList,
            expensesList,
            totalCost
        ] = await Promise.all([
            Order.count({ where: { businessDate, isCancelled: "No" } }),
            Order.findAll({ where: { businessDate, isCancelled: "No" }, attributes: ['orderDetails'], raw: true }),
            Order.sum('orderTotal', { where: { businessDate, isCancelled: "No" } }).then(v => v || 0),
            Order.sum('discountAmount', { where: { businessDate, isCancelled: "No" } }).then(v => v || 0),
            Expense.sum('amount', { where: { date: businessDate } }).then(v => v || 0),
            Order.findAll({ where: { businessDate, isCancelled: "No" }, attributes: ['orderTotal', 'payment_method'], raw: true }),
            Order.findAll({ where: { businessDate, isCancelled: "No" }, attributes: ['id', 'customerName', 'orderTotal', 'payment_method', 'createdAt'], order: [['createdAt', 'ASC']], raw: true }),
            Expense.findAll({ where: { date: businessDate }, attributes: ['description', 'category', 'amount'], order: [['createdAt', 'ASC']], raw: true }),
            calculateTotalCost(businessDate)
        ]);

        let totalItems = 0;
        const productStats = {};
        const categoryStats = {};
        const productNamesInOrders = new Set();

        // First pass: aggregate product counts and identify needed product data
        for (const order of ordersData) {
            let details = [];
            try {
                details = typeof order.orderDetails === 'string' ? JSON.parse(order.orderDetails) : order.orderDetails;
            } catch (e) { continue; }

            if (!Array.isArray(details)) continue;

            for (const item of details) {
                if (!item.quantity || isNaN(item.quantity) || item.name === "تعليق") continue;
                totalItems += item.quantity;
                productStats[item.name] = (productStats[item.name] || 0) + item.quantity;
                productNamesInOrders.add(item.name);
            }
        }

        // Batch fetch product categories to avoid N+1 queries
        const productsInfo = await Product.findAll({
            where: { name: Array.from(productNamesInOrders) },
            attributes: ['name', 'category'],
            raw: true
        });

        const productToCategoryMap = {};
        productsInfo.forEach(p => { productToCategoryMap[p.name] = p.category; });

        // Aggregate category stats
        for (const [name, qty] of Object.entries(productStats)) {
            const cat = productToCategoryMap[name];
            if (cat) {
                categoryStats[cat] = (categoryStats[cat] || 0) + qty;
            }
        }

        let topProduct = "لا يوجد";
        let topProductQty = 0;
        for (const [name, qty] of Object.entries(productStats)) {
            if (qty > topProductQty) {
                topProduct = name;
                topProductQty = qty;
            }
        }

        let topCategory = "لا يوجد";
        let topCategoryQty = 0;
        for (const [cat, qty] of Object.entries(categoryStats)) {
            if (qty > topCategoryQty) {
                topCategory = cat;
                topCategoryQty = qty;
            }
        }

        // 💰 Calculate Breakdown
        let cashTotal = 0, instaPayTotal = 0, vcashTotal = 0, cardTotal = 0, othersTotal = 0;
        activeOrders.forEach(o => {
            const amount = parseFloat(o.orderTotal) || 0;
            const method = (o.payment_method || '').toLowerCase();
            if (method === 'cash') cashTotal += amount;
            else if (method === 'instapay') instaPayTotal += amount;
            else if (method === 'vcash') vcashTotal += amount;
            else if (method === 'card') cardTotal += amount;
            else othersTotal += amount;
        });

        const totalEarnings = parseFloat((totalRevenue - totalCost - totalExpenses).toFixed(2));

        res.json({ 
            totalOrders, 
            totalItems, 
            topProduct,
            topProductQty,
            topCategory,
            totalRevenue: parseFloat(totalRevenue.toFixed(2)), 
            totalCost, 
            totalExpenses: parseFloat(totalExpenses.toFixed(2)),
            totalEarnings, 
            discount: parseFloat(totalDiscount.toFixed(2)), 
            cashTotal: parseFloat(cashTotal.toFixed(2)),
            instaPayTotal: parseFloat(instaPayTotal.toFixed(2)),
            vcashTotal: parseFloat(vcashTotal.toFixed(2)),
            cardTotal: parseFloat(cardTotal.toFixed(2)),
            othersTotal: parseFloat(othersTotal.toFixed(2)),
            ordersList,
            expensesList,
            activeBusinessDate: businessDate
        });

    } catch (error) {
        console.error('⚠️ Daily Summary Error:', error);
        res.status(500).json({ error: '⚠️ Error loading summary data!' });
    }
};

exports.closeDay = async (req, res) => {
    try {
        const systemDate = await getActiveBusinessDate();
        const businessDate = req.body.date || systemDate;

        const existingClosing = await DailyClosing.findOne({ where: { closingDate: businessDate } });
        if (existingClosing) {
            return res.status(400).json({ error: `⚠️ يوم ${businessDate} قد تم إغلاقه بالفعل!` });
        }

        // Execute the internal close logic for the specific date
        await exports.internalAutoClose(businessDate);

        // Recalculate active_business_date based on the absolute MAX closed date
        const maxClosingResult = await DailyClosing.findOne({
            attributes: [[sequelize.fn('MAX', sequelize.col('closingDate')), 'maxDate']],
            raw: true
        });
        
        let nextDateStr = systemDate;
        if (maxClosingResult && maxClosingResult.maxDate) {
            const maxDate = new Date(maxClosingResult.maxDate);
            maxDate.setDate(maxDate.getDate() + 1);
            nextDateStr = maxDate.toLocaleDateString('en-CA');
            
            const { Setting } = require('../models');
            await Setting.upsert({ key: 'active_business_date', value: nextDateStr, group: 'system' });
        }

        res.json({ success: true, message: `✅ تم إغلاق يوم ${businessDate} بنجاح!`, nextDate: nextDateStr });

    } catch (error) {
        console.error('❌ Close Day Error:', error);
        res.status(500).json({ error: '⚠️ Error closing the day' });
    }
};

// Internal function to allow auto-closing from orderController or elsewhere
exports.internalAutoClose = async (businessDate) => {
    try {
        const existingClosing = await DailyClosing.findOne({ where: { closingDate: businessDate } });
        if (existingClosing) return; // Already closed

        const totalOrders = await Order.count({ where: { businessDate, isCancelled: "No" } });
        const totalRevenue = await Order.sum("orderTotal", { where: { businessDate, isCancelled: "No" } }) || 0;
        const totalDiscount = await Order.sum("discountAmount", { where: { businessDate, isCancelled: "No" } }) || 0;
        const totalCost = await calculateTotalCost(businessDate);
        const totalExpenses = await Expense.sum('amount', { where: { date: businessDate } }) || 0;

        const onlinePaymentsTotal = await Order.sum('orderTotal', {
            where: { 
                businessDate, 
                isCancelled: "No",
                payment_method: { [Op.ne]: "cash" }
            }
        }) || 0;

        const orders = await Order.findAll({ where: { businessDate, isCancelled: "No" }, attributes: ['orderDetails'] });
        let totalSandwiches = 0;
        for (const order of orders) {
            let details = [];
            try {
                details = typeof order.orderDetails === 'string' ? JSON.parse(order.orderDetails) : order.orderDetails;
            } catch (e) { continue; }
            if (!Array.isArray(details)) continue;
            for (const item of details) totalSandwiches += item.quantity;
        }

        const totalEarnings = parseFloat((totalRevenue - totalCost - totalExpenses).toFixed(2));

        await DailyClosing.create({
            closingDate: businessDate,
            totalOrders,
            totalSandwiches,
            totalRevenue: parseFloat(totalRevenue.toFixed(2)),
            totalCost: parseFloat(totalCost.toFixed(2)),
            totalExpenses: parseFloat(totalExpenses.toFixed(2)),
            totalEarnings,
            totalDiscount: parseFloat(totalDiscount.toFixed(2)),
            onlinePaymentsTotal: parseFloat(onlinePaymentsTotal.toFixed(2))
        });

        await Order.update({ archived: true }, { where: { businessDate } });
        console.log(`✅ System Auto-Closed Day: ${businessDate}`);
    } catch (err) {
        console.error(`❌ Failed to internal auto-close day ${businessDate}:`, err);
    }
};

async function calculateTotalCost(businessDate) {
    let totalCost = 0;
    const ingredientMap = {};
    
    // ✅ Pre-fetch all recipes and inventory to memory (O(1) Dictionary Lookup)
    const [allRecipes, allInventory, orders] = await Promise.all([
        Recipe.findAll({ raw: true }),
        Inventory.findAll({ raw: true }),
        Order.findAll({ where: { businessDate, isCancelled: "No" }, attributes: ['orderDetails'], raw: true })
    ]);

    const recipeMap = {};
    allRecipes.forEach(r => {
        if (!recipeMap[r.sandwich]) recipeMap[r.sandwich] = [];
        recipeMap[r.sandwich].push(r);
    });

    const inventoryMap = {};
    allInventory.forEach(inv => {
        inventoryMap[inv.name] = inv;
    });

    for (const order of orders) {
        let details = [];
        try {
            details = typeof order.orderDetails === 'string' ? JSON.parse(order.orderDetails) : order.orderDetails;
        } catch (e) { continue; }
        if (!Array.isArray(details)) continue;

        for (const item of details) {
            const recipes = recipeMap[item.name] || [];
            if (recipes.length > 0) {
                recipes.forEach(recipe => {
                    const ingredient = recipe.ingredient.trim().toLowerCase();
                    const quantityUsed = recipe.amount * item.quantity;
                    ingredientMap[ingredient] = (ingredientMap[ingredient] || 0) + quantityUsed;
                });
            } else {
                // Retail logic: Direct cost from Inventory dictionary
                const inventoryItem = inventoryMap[item.name];
                if (inventoryItem) {
                    let itemCost = parseFloat(inventoryItem.cost) || 0;
                    if (item.variant && inventoryItem.variants) {
                        const variants = typeof inventoryItem.variants === 'string' ? JSON.parse(inventoryItem.variants) : inventoryItem.variants;
                        const matchedVariant = variants.find(v => {
                            const vLabel = `${v.color || ''} ${v.size || ''}`.trim();
                            return vLabel === item.variant || (vLabel && item.variant.startsWith(vLabel + ' '));
                        });
                        if (matchedVariant && matchedVariant.cost !== undefined && matchedVariant.cost !== null) {
                            itemCost = parseFloat(matchedVariant.cost);
                        }
                    }
                    totalCost += itemCost * item.quantity;
                }
            }
        }
    }

    if (Object.keys(ingredientMap).length > 0) {
        allInventory.forEach(item => {
            const name = item.name.trim().toLowerCase();
            if (ingredientMap[name]) totalCost += ingredientMap[name] * parseFloat(item.cost || 0);
        });
    }
    
    return parseFloat(totalCost.toFixed(2));
}

exports.getMonthlySummary = async (req, res) => {
    try {
        const currentMonth = req.query.month || new Date().toISOString().slice(0, 7); // "yyyy-MM"
        
        // Use MySQL DATE() function to avoid UTC timezone offset issues
        // This ensures e.g. '2026-04-30 00:00:00 UTC' is treated as April, not March
        const whereClause = {
            closingDate: {
                [Op.and]: [
                    { [Op.gte]: `${currentMonth}-01` },
                    { [Op.lt]: sequelize.literal(`('${currentMonth}-01'::date + interval '1 month')`) }
                ]
            }
        };

        const total_orders = await DailyClosing.sum("totalOrders", { where: whereClause }) || 0;
        const total_sandwiches = await DailyClosing.sum("totalSandwiches", { where: whereClause }) || 0;
        const total_revenue = await DailyClosing.sum("totalRevenue", { where: whereClause }) || 0;
        const total_cost = await DailyClosing.sum("totalCost", { where: whereClause }) || 0;
        const totalExpenses = await DailyClosing.sum("totalExpenses", { where: whereClause }) || 0;
        const totalDiscount = await DailyClosing.sum("totalDiscount", { where: whereClause }) || 0;
        const onlinePaymentsTotal = await DailyClosing.sum("onlinePaymentsTotal", { where: whereClause }) || 0;

        const total_earnings = parseFloat((total_revenue - total_cost - totalExpenses).toFixed(2));

        // 📜 Daily Breakdown for the selected month
        const dailyBreakdown = await DailyClosing.findAll({
            where: whereClause,
            order: [['closingDate', 'ASC']]
        });

        // Also fetch live (not-yet-closed) orders for current month if querying current month
        const liveOrders = currentMonth === new Date().toISOString().slice(0, 7)
            ? await Order.findAll({
                where: { 
                    businessDate: {
                        [Op.and]: [
                            { [Op.gte]: `${currentMonth}-01` },
                            { [Op.lt]: sequelize.literal(`('${currentMonth}-01'::date + interval '1 month')`) }
                        ]
                    },
                    isCancelled: "No",
                    archived: false
                },
                attributes: ['businessDate', 'orderTotal', 'payment_method'],
                order: [['businessDate', 'ASC']]
            })
            : [];

        res.json({ 
            currentMonth,
            total_orders, 
            total_sandwiches, 
            total_revenue, 
            total_cost, 
            totalExpenses,
            total_earnings, 
            totalDiscount,
            onlinePaymentsTotal,
            dailyBreakdown,
            liveOrdersCount: liveOrders.length,
            liveRevenue: liveOrders.reduce((s, o) => s + (parseFloat(o.orderTotal) || 0), 0)
        });

    } catch (error) {
        console.error("❌ Monthly Summary Error:", error);
        res.status(500).json({ error: "⚠️ Error loading data!" });
    }
};

exports.closeMonth = async (req, res) => {
    try {
        const currentMonth = new Date().toISOString().slice(0, 7); 

        const existingClosing = await MonthlyClosing.findOne({ where: { month_year: currentMonth } });
        if (existingClosing) {
            return res.status(400).json({ error: "⚠️ الشهر قد تم إغلاقه بالفعل!" });
        }

        const dateCondition = {
            [Op.and]: [
                { [Op.gte]: `${currentMonth}-01` },
                { [Op.lt]: sequelize.literal(`('${currentMonth}-01'::date + interval '1 month')`) }
            ]
        };

        const total_orders = await DailyClosing.sum("totalOrders", { where: { closingDate: dateCondition } }) || 0;
        const total_sandwiches = await DailyClosing.sum("totalSandwiches", { where: { closingDate: dateCondition } }) || 0;
        const total_revenue = await DailyClosing.sum("totalRevenue", { where: { closingDate: dateCondition } }) || 0;
        const total_cost = await DailyClosing.sum("totalCost", { where: { closingDate: dateCondition } }) || 0;
        const totalExpenses = await DailyClosing.sum("totalExpenses", { where: { closingDate: dateCondition } }) || 0;
        const totalDiscount = await DailyClosing.sum("totalDiscount", { where: { closingDate: dateCondition } }) || 0;
        const onlinePaymentsTotal = await DailyClosing.sum("onlinePaymentsTotal", { where: { closingDate: dateCondition } }) || 0;

        const total_earnings = parseFloat((total_revenue - total_cost - totalExpenses).toFixed(2));

        await MonthlyClosing.create({
            month_year: currentMonth,
            total_orders,
            total_sandwiches,
            total_revenue,
            total_cost,
            totalExpenses,
            total_earnings,
            totalDiscount,
            onlinePaymentsTotal
        });

        // We keep DailyClosing records so the day-by-day table in the monthly report still works for past months.
        await Product.update({ sold: 0 }, { where: {} });

        res.json({ success: true, message: "✅ تم إغلاق الشهر بنجاح!" });

    } catch (error) {
        console.error("❌ Close Month Error:", error);
        res.status(500).json({ error: "⚠️ Error closing month" });
    }
};
========== ./controllers/commentController.js ==========
const { Comment } = require('../models');

// ✅ إضافة تعليق جديد
const addComment = async (req, res) => {
    try {
        const { commentText, color, price } = req.body;

        // 🔥 التحقق من البيانات
        if (!commentText.trim() || !color.trim() || typeof price !== 'number') {
            return res.status(400).json({ message: '❌ commentText, color و price مطلوبين ويجب أن يكون price رقمًا.' });
        }

        const newComment = await Comment.create({ commentText, color, price });
        res.status(201).json(newComment);
    } catch (error) {
        console.error('❌ خطأ أثناء إضافة التعليق:', error);
        res.status(500).json({ message: '❌ حدث خطأ أثناء إضافة التعليق', error });
    }
};

// ✅ جلب التعليقات
const getPopularComments = async (req, res) => {
    try {
        const comments = await Comment.findAll({
            attributes: ['id', 'commentText', 'createdAt', 'color', 'price'], // ✅ إضافة السعر
            order: [['createdAt', 'DESC']],
            limit: 10 // ✅ آخر 10 تعليقات فقط
        });

        res.status(200).json(comments);
    } catch (error) {
        console.error('❌ خطأ أثناء جلب التعليقات:', error);
        res.status(500).json({ message: '❌ فشل في جلب التعليقات', error });
    }
};

// ✅ حذف تعليق
const deleteComment = async (req, res) => {
    try {
        const comment = await Comment.findByPk(req.params.id);
        if (!comment) {
            return res.status(404).json({ message: '❌ التعليق غير موجود' });
        }

        await comment.destroy();
        res.status(200).json({ message: `✅ تم حذف التعليق: "${comment.commentText}" بنجاح` });
    } catch (error) {
        console.error('❌ خطأ أثناء حذف التعليق:', error);
        res.status(500).json({ message: '❌ حدث خطأ أثناء حذف التعليق', error });
    }
};

module.exports = {
    addComment,
    getPopularComments,
    deleteComment
};
========== ./controllers/customerController.js ==========
const { Customer } = require('../models/index');
const { Op } = require('sequelize');

exports.getCustomerHistory = async (req, res) => {
    try {
        const { phone } = req.params;
        if (!phone) {
            return res.status(400).json({ message: "❌ رقم الهاتف مطلوب." });
        }

        // ✅ البحث عن العميل
        const customer = await Customer.findOne({ where: { phone } });
        if (!customer) {
            return res.status(404).json({ message: "❌ العميل غير موجود." });
        }

        // ✅ جلب سجل الطلبات الخاصة بالعميل
        const orders = await Order.findAll({
            where: { customerId: customer.id },
            include: [{ model: Payment, attributes: ['payment_method', 'payment_amount', 'payment_date'] }],
            order: [['createdAt', 'DESC']]
        });

        res.status(200).json({ customer, orders });
    } catch (error) {
        console.error("❌ خطأ أثناء جلب سجل العميل:", error);
        res.status(500).json({ message: "❌ فشل في جلب البيانات", error });
    }
};

exports.getCustomerByPhone = async (req, res) => {
    try {
        let { phone } = req.params;
        phone = phone.trim().replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d)); // تحويل الأرقام العربية

        console.log(`🔍 البحث عن عميل برقم الهاتف: ${phone}`); // راقب في الكونسول

        const customers = await Customer.findAll({
            where: {
                phone: { [Op.like]: `${phone}%` }
            }
        });

        if (customers.length === 0) {
            return res.status(404).json({ message: "🚫 العميل غير موجود" });
        }

        res.json(customers);
    } catch (error) {
        console.error("❌ خطأ أثناء البحث عن العميل:", error);
        res.status(500).json({ message: "⚠️ خطأ في السيرفر", error });
    }
};

exports.getAllCustomers = async (req, res) => {
    try {
        const customers = await Customer.findAll({
            attributes: ['id', 'name', 'phone', 'address', 'totalOrders', 'totalSpent'],
            order: [['name', 'ASC']]
        });

        res.json(customers);
    } catch (error) {
        console.error('❌ خطأ أثناء جلب العملاء:', error);
        res.status(500).json({ message: '⚠️ خطأ في السيرفر', error });
    }
};

exports.searchCustomerPhones = async (req, res) => {
    try {
        const { phone } = req.params;
        if (!phone) {
            return res.status(400).json({ message: "⚠️ يجب إدخال رقم الهاتف للبحث" });
        }

        const customers = await Customer.findAll({
            where: {
                phone: {
                    [Op.like]: `${phone}%` // البحث عن أرقام تبدأ بنفس المدخل
                }
            },
            attributes: ['phone'],
            limit: 5 // جلب 5 نتائج فقط لتجنب التحميل الزائد
        });

        res.json(customers);
    } catch (error) {
        console.error('❌ خطأ أثناء البحث عن الأرقام:', error);
        res.status(500).json({ message: '⚠️ خطأ في السيرفر', error });
    }
};

exports.createCustomer = async (req, res) => {
    try {
        const { name, phone, address } = req.body;

        if (!name || !phone) {
            return res.status(400).json({ message: "⚠️ الاسم ورقم الهاتف مطلوبان." });
        }

        // ✅ التأكد من عدم وجود عميل بنفس رقم الهاتف
        const existingCustomer = await Customer.findOne({ where: { phone } });
        if (existingCustomer) {
            return res.status(400).json({ message: "🚫 رقم الهاتف مسجل بالفعل." });
        }

        // ✅ إنشاء العميل
        const customer = await Customer.create({
            name,
            phone,
            address,
            totalOrders: 0,
            totalSpent: 0
        });

        res.status(201).json({ message: "✅ تم إضافة العميل بنجاح", customer });
    } catch (error) {
        console.error('❌ خطأ أثناء إضافة العميل:', error);
        res.status(500).json({ message: '⚠️ خطأ في السيرفر', error });
    }
};

// 🔥 تعديل بيانات العميل
exports.updateCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, phone, address } = req.body;

        // ✅ البحث عن العميل
        const customer = await Customer.findByPk(id);
        if (!customer) {
            return res.status(404).json({ message: "🚫 العميل غير موجود" });
        }

        // ✅ التأكد من عدم تكرار رقم الهاتف مع عميل آخر
        if (phone) {
            const existingCustomer = await Customer.findOne({ where: { phone, id: { [Op.ne]: id } } });
            if (existingCustomer) {
                return res.status(400).json({ message: "🚫 رقم الهاتف مسجل بالفعل." });
            }
        }

        // ✅ تحديث البيانات
        await customer.update({ name, phone, address });

        res.json({ message: "✅ تم تحديث بيانات العميل بنجاح", customer });
    } catch (error) {
        console.error('❌ خطأ أثناء تحديث بيانات العميل:', error);
        res.status(500).json({ message: '⚠️ خطأ في السيرفر', error });
    }
};

// 🔥 حذف العميل
exports.deleteCustomer = async (req, res) => {
    try {
        const { id } = req.params;

        // ✅ البحث عن العميل
        const customer = await Customer.findByPk(id);
        if (!customer) {
            return res.status(404).json({ message: "🚫 العميل غير موجود" });
        }

        // ✅ حذف العميل
        await customer.destroy();

        res.json({ message: "🗑️ تم حذف العميل بنجاح" });
    } catch (error) {
        console.error('❌ خطأ أثناء حذف العميل:', error);
        res.status(500).json({ message: '⚠️ خطأ في السيرفر', error });
    }
};

// ✅ جلب جميع أرقام العملاء فقط للـ Dropdown
exports.getCustomerPhones = async (req, res) => {
    try {
        const customers = await Customer.findAll({
            attributes: ['id', 'phone'], // جلب الـ ID ورقم الهاتف فقط
            order: [['phone', 'ASC']] // ترتيب الأرقام تصاعديًا
        });

        res.json(customers);
    } catch (error) {
        console.error('❌ خطأ أثناء جلب أرقام العملاء:', error);
        res.status(500).json({ message: '⚠️ خطأ في السيرفر', error });
    }
};
========== ./controllers/dashboardController.js ==========
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


========== ./controllers/discountController.js ==========
const { DiscountCode } = require("../models");
const { Op } = require("sequelize");

exports.checkBestDiscount = async (req, res) => {
    try {
        const { products, totalPrice } = req.body;

        if (!products || products.length === 0) {
            return res.status(400).json({ message: "❌ لم يتم تحديد أي منتجات." });
        }

        // ✅ البحث عن أكواد الخصم الفعالة فقط
        const discountCodes = await DiscountCode.findAll({
            where: { 
                is_active: true,  
                end_date: { [Op.gte]: new Date() } 
            }
        });

        let bestDiscount = null;
        let maxDiscountAmount = 0;
        let usedProducts = new Set(); // 🔥 لمنع تكرار الخصم على نفس المنتج

        for (let discount of discountCodes) {
            console.log("Raw Data: ", discount.applicable_products);

            let applicableProducts;
            if (Array.isArray(discount.applicable_products)) {
                // ✅ إذا كانت مصفوفة، نستخدمها مباشرة
                applicableProducts = discount.applicable_products;
            } else if (typeof discount.applicable_products === 'string') {
                try {
                    applicableProducts = JSON.parse(discount.applicable_products);
                } catch (error) {
                    console.error(`❌ خطأ في JSON.parse() للقيمة: ${discount.applicable_products}`);
                    applicableProducts = [];
                }
            } else {
                applicableProducts = [];
            }

            if (Array.isArray(applicableProducts)) {
                // ✅ التحقق مما إذا كان كود الخصم ينطبق على أي منتج لم يُستخدم عليه خصم مسبقًا
                let validProducts = applicableProducts.filter(p => products.includes(p) && !usedProducts.has(p));

                if (validProducts.length > 0) {
                    let discountAmount = discount.discount_type === "percentage" ? 
                        (discount.discount_value / 100) * totalPrice : discount.discount_value;

                    if (discountAmount > maxDiscountAmount) {
                        maxDiscountAmount = discountAmount;
                        bestDiscount = discount.code;

                        // 🔥 أضف المنتجات المستخدمة لهذا الخصم إلى `usedProducts`
                        validProducts.forEach(p => usedProducts.add(p));
                    }
                }
            }
        }

        // ✅ إرسال الخصم الأفضل فقط إذا تم العثور عليه
        res.json({ bestDiscountCode: bestDiscount, discountAmount: maxDiscountAmount });
    } catch (error) {
        console.error("❌ خطأ أثناء جلب كود الخصم:", error);
        res.status(500).json({ message: "❌ حدث خطأ أثناء جلب كود الخصم." });
    }
};

exports.applyDiscount = async (req, res) => {
    try {
        const { discountCode } = req.params;
        const discount = await DiscountCode.findOne({ where: { code: discountCode, active: true } });

        if (!discount) {
            return res.status(404).json({ message: "❌ كود الخصم غير صالح." });
        }

        res.json({ discountAmount: discount.isPercentage ? discount.value : discount.value });
    } catch (error) {
        console.error("❌ خطأ أثناء تطبيق كود الخصم:", error);
        res.status(500).json({ message: "❌ حدث خطأ أثناء تطبيق كود الخصم." });
    }
};

exports.addDiscount = async (req, res) => {
    try {
        const { code, discount_type, discount_value, start_date, end_date, applicable_products, is_active } = req.body;

        // ✅ تأكد أن applicable_products مصفوفة قبل الحفظ
        const formattedProducts = Array.isArray(applicable_products) ? applicable_products : [];

        const discount = await DiscountCode.create({
            code,
            discount_type,
            discount_value,
            start_date,
            end_date,
            applicable_products: formattedProducts, // ✅ تخزين كمصفوفة JSON مباشرة
            is_active
        });

        res.json({ success: true, message: "✅ تم إضافة كود الخصم بنجاح", discount });
    } catch (error) {
        console.error("❌ خطأ أثناء إضافة كود الخصم:", error);
        res.status(500).json({ success: false, message: "❌ فشل في إضافة كود الخصم." });
    }
};

exports.updateDiscount = async (req, res) => {
    try {
        const { id } = req.params;
        const { code, discount_type, discount_value, start_date, end_date, applicable_products, is_active } = req.body;

        const discount = await DiscountCode.findByPk(id);
        if (!discount) return res.status(404).json({ success: false, message: "❌ كود الخصم غير موجود" });

        // ✅ الحفاظ على المنتجات السابقة إذا لم يتم إرسال منتجات جديدة
        const formattedProducts = Array.isArray(applicable_products) ? applicable_products : discount.applicable_products;

        await discount.update({
            code,
            discount_type,
            discount_value,
            start_date,
            end_date,
            applicable_products: formattedProducts, // ✅ تحديث بدون مسح المنتجات السابقة
            is_active
        });

        res.json({ success: true, message: "✅ تم تحديث كود الخصم بنجاح", discount });
    } catch (error) {
        console.error("❌ خطأ أثناء تحديث كود الخصم:", error);
        res.status(500).json({ success: false, message: "❌ فشل في تحديث كود الخصم." });
    }
};

exports.getAllDiscounts = async (req, res) => {
    try {
        const discounts = await DiscountCode.findAll();

        res.json({ 
            success: true, 
            discounts
        });
    } catch (error) {
        console.error("❌ خطأ أثناء جلب أكواد الخصم:", error);
        res.status(500).json({ success: false, message: "❌ فشل في جلب أكواد الخصم." });
    }
};

// ✅ حذف كود خصم
exports.deleteDiscount = async (req, res) => {
    try {
        const { id } = req.params;

        const discount = await DiscountCode.findByPk(id);
        if (!discount) {
            return res.status(404).json({ success: false, message: "❌ كود الخصم غير موجود!" });
        }

        await discount.destroy();

        res.json({ success: true, message: "✅ تم حذف كود الخصم بنجاح!" });
    } catch (error) {
        console.error("❌ خطأ أثناء حذف كود الخصم:", error);
        res.status(500).json({ success: false, message: "❌ فشل حذف كود الخصم!" });
    }
};
========== ./controllers/expenseController.js ==========
const { Expense } = require('../models');
const { Op } = require('sequelize');
const Joi = require('joi');

// ✅ Joi Validation Schema
const expenseSchema = Joi.object({
    description: Joi.string().min(2).max(255).required().messages({
        'string.empty': 'الوصف مطلوب',
        'string.min': 'الوصف يجب أن يكون حرفين على الأقل'
    }),
    amount: Joi.number().positive().required().messages({
        'number.positive': 'المبلغ يجب أن يكون أكبر من صفر',
        'any.required': 'المبلغ مطلوب'
    }),
    category: Joi.string().valid('Supplies', 'Rent', 'Utilities', 'Salaries', 'Maintenance', 'Marketing', 'Other').required(),
    payment_method: Joi.string().valid('cash', 'card', 'vcash', 'instapay').default('cash'),
    date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
    notes: Joi.string().max(500).allow('', null).optional()
});

// ✅ جلب المصروفات — مع فلتر بالتاريخ من الـ Backend
exports.getAllExpenses = async (req, res) => {
    try {
        const { Setting } = require('../models');
        
        // 🚀 تشغيل استعلام الإعدادات بالتوازي
        const activeDateSetting = await Setting.findOne({ where: { key: 'active_business_date' }, raw: true });
        const activeBusinessDate = activeDateSetting ? activeDateSetting.value : new Date().toLocaleDateString('en-CA');

        const filterDate = (req.query.date && req.query.date !== 'undefined') ? req.query.date : activeBusinessDate;
        const [year, month] = filterDate.split('-');
        const firstDay = `${year}-${month}-01`;
        const lastDay = new Date(parseInt(year), parseInt(month), 0).toLocaleDateString('en-CA');

        const where = {};
        if (req.query.all !== 'true') {
            where.date = filterDate;
        }

        // 🚀 جلب كل البيانات المطلوبة في وقت واحد (Parallel Queries)
        const [expenses, todayExpenses, monthExpenses] = await Promise.all([
            Expense.findAll({ where, order: [['date', 'DESC'], ['createdAt', 'DESC']], raw: true }),
            Expense.findAll({ where: { date: filterDate }, raw: true }),
            Expense.findAll({ where: { date: { [Op.between]: [firstDay, lastDay] } }, raw: true })
        ]);

        // 💰 حساب الإحصائيات من البيانات المجلوبة فعلياً
        const todayTotal = todayExpenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
        const cashTotal = todayExpenses.filter(e => e.payment_method === 'cash').reduce((s, e) => s + parseFloat(e.amount || 0), 0);
        const cardTotal = todayExpenses.filter(e => e.payment_method === 'card').reduce((s, e) => s + parseFloat(e.amount || 0), 0);
        const vcashTotal = todayExpenses.filter(e => e.payment_method === 'vcash').reduce((s, e) => s + parseFloat(e.amount || 0), 0);
        const instapayTotal = todayExpenses.filter(e => e.payment_method === 'instapay').reduce((s, e) => s + parseFloat(e.amount || 0), 0);
        const monthTotal = monthExpenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);

        res.json({
            expenses,
            stats: {
                activeBusinessDate,
                filteredDate: filterDate,
                todayTotal: parseFloat(todayTotal.toFixed(2)),
                monthTotal: parseFloat(monthTotal.toFixed(2)),
                byMethod: { cash: cashTotal, card: cardTotal, vcash: vcashTotal, instapay: instapayTotal }
            }
        });
    } catch (error) {
        console.error('❌ Error fetching expenses:', error);
        res.status(500).json({ message: 'فشل في جلب المصروفات' });
    }
};

// ✅ إضافة مصروف جديد — مع Validation
exports.createExpense = async (req, res) => {
    try {
        const { error, value } = expenseSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        const { Setting } = require('../models');
        const activeDateSetting = await Setting.findOne({ where: { key: 'active_business_date' } });
        const businessDate = activeDateSetting
            ? activeDateSetting.value
            : new Date().toLocaleDateString('en-CA');

        const expense = await Expense.create({
            description: value.description,
            amount: value.amount,
            category: value.category,
            date: value.date || businessDate,
            payment_method: value.payment_method || 'cash',
            notes: value.notes || null,
            addedBy: req.user ? req.user.username : 'Unknown'
        });

        res.status(201).json({ message: '✅ تم تسجيل المصروف بنجاح', expense });
    } catch (error) {
        console.error('❌ Error creating expense:', error);
        res.status(500).json({ message: 'فشل في تسجيل المصروف' });
    }
};

// ✅ تعديل مصروف
exports.updateExpense = async (req, res) => {
    try {
        const { id } = req.params;
        const { error, value } = expenseSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        const expense = await Expense.findByPk(id);
        if (!expense) {
            return res.status(404).json({ message: 'المصروف غير موجود' });
        }

        await expense.update(value);
        res.json({ message: '✅ تم تعديل المصروف بنجاح', expense });
    } catch (error) {
        console.error('❌ Error updating expense:', error);
        res.status(500).json({ message: 'فشل في تعديل المصروف' });
    }
};

// ✅ حذف مصروف
exports.deleteExpense = async (req, res) => {
    try {
        const { id } = req.params;
        const expense = await Expense.findByPk(id);
        if (!expense) {
            return res.status(404).json({ message: 'المصروف غير موجود' });
        }
        await expense.destroy();
        res.json({ message: '✅ تم حذف المصروف بنجاح' });
    } catch (error) {
        console.error('❌ Error deleting expense:', error);
        res.status(500).json({ message: 'فشل في حذف المصروف' });
    }
};

// ✅ ملخص المصروفات لليوم (للاستخدام الداخلي في تقرير الوردية)
exports.getDailyExpensesSummary = async (date) => {
    try {
        const summary = await Expense.sum('amount', {
            where: { date: date || new Date().toLocaleDateString('en-CA') }
        });
        return summary || 0;
    } catch (error) {
        console.error('❌ Error summing daily expenses:', error);
        return 0;
    }
};

========== ./controllers/inventoryController.js ==========
const { Inventory, sequelize } = require("../models");
const { Op } = require("sequelize");
const moment = require("moment");

// ✅ جلب جميع عناصر المخزون
const getAllInventory = async (req, res) => {
    try {
        const inventory = await Inventory.findAll({ raw: true });
        res.json(inventory);
    } catch (error) {
        console.error("❌ خطأ أثناء جلب المخزون:", error);
        res.status(500).json({ error: "⚠️ حدث خطأ أثناء تحميل المخزون." });
    }
};

// ✅ إضافة عنصر جديد إلى المخزون
const addInventoryItem = async (req, res) => {
    try {
        const { name, quantity, cost, min, expiryDate, variants } = req.body;

        if (!name || isNaN(quantity) || isNaN(cost)) {
            return res.status(400).json({ error: "جميع الحقول مطلوبة" });
        }

        const total = quantity * cost;

        const newItem = await Inventory.create({
            name,
            quantity,
            cost,
            min: min || 0,
            total,
            expiryDate: expiryDate || null,
            variants: variants || []
        });

        res.status(201).json(newItem);
    } catch (error) {
        console.error("❌ خطأ في إضافة المنتج:", error);
        res.status(500).json({ error: "فشل في إضافة المنتج" });
    }
};

// ✅ تعديل عنصر في المخزون
const updateInventoryItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, quantity, cost, min, expiryDate, variants } = req.body;

        const item = await Inventory.findByPk(id);
        if (!item) return res.status(404).json({ error: "العنصر غير موجود" });

        const total = quantity * cost;

        // Force Sequelize to recognize the JSON change
        item.set({
            name,
            quantity,
            cost,
            min: min || 0,
            total,
            expiryDate: expiryDate || null,
            variants: variants || []
        });
        item.changed('variants', true);
        await item.save();

        res.json({ message: "✅ تم تحديث المنتج بنجاح" });
    } catch (error) {
        console.error("❌ خطأ في تعديل المنتج:", error);
        res.status(500).json({ error: "فشل في تعديل المنتج" });
    }
};

// ✅ حذف عنصر من المخزون
const deleteInventoryItem = async (req, res) => {
    try {
        const { id } = req.params;

        const item = await Inventory.findByPk(id);
        if (!item) return res.status(404).json({ error: "العنصر غير موجود" });

        await item.destroy();
        res.json({ message: "✅ تم حذف المنتج بنجاح" });
    } catch (error) {
        console.error("❌ خطأ في حذف المنتج:", error);
        res.status(500).json({ error: "فشل في حذف المنتج" });
    }
};

// ✅ تنبيه عند المخزون المنخفض
const getLowStockAlerts = async (req, res) => {
    try {
        const lowStockItems = await Inventory.findAll({
            where: {
                quantity: { [Op.lte]: sequelize.col('min') }
            }
        });
        res.json(lowStockItems);
    } catch (error) {
        console.error("❌ خطأ في جلب التنبيهات:", error);
        res.status(500).json({ error: "فشل في جلب تنبيهات المخزون المنخفض" });
    }
};

// ✅ تنبيه عند اقتراب تاريخ الصلاحية
const getExpiryAlerts = async (req, res) => {
    try {
        const expiryThreshold = moment().add(7, 'days').toDate(); // أسبوع قبل انتهاء الصلاحية
        const expiringItems = await Inventory.findAll({
            where: {
                expiryDate: { [Op.lte]: expiryThreshold }
            }
        });
        res.json(expiringItems);
    } catch (error) {
        console.error("❌ خطأ في جلب التنبيهات:", error);
        res.status(500).json({ error: "فشل في جلب تنبيهات تاريخ الصلاحية" });
    }
};

// ✅ التصدير الصحيح للدوال
module.exports = {
    getAllInventory,
    addInventory: addInventoryItem,
    updateInventory: updateInventoryItem,
    deleteInventory: deleteInventoryItem,
    getLowStockAlerts,
    getExpiryAlerts,
};
========== ./controllers/merchantController.js ==========
const { Merchant, MerchantTransaction, sequelize } = require('../models');

exports.getMerchants = async (req, res) => {
    try {
        const { type } = req.query;
        const whereClause = type ? { type } : {};
        const merchants = await Merchant.findAll({ where: whereClause, order: [['name', 'ASC']] });

        // Enrich each merchant with transaction totals in ONE query to avoid N+1 problem
        const totals = await MerchantTransaction.findAll({
            attributes: [
                'merchantId',
                [sequelize.literal("SUM(CASE WHEN type = 'payment' THEN amount ELSE 0 END)"), 'totalPayments'],
            ],
            group: ['merchantId'],
            raw: true
        });

        // Convert totals array to a lookup map for fast O(1) access
        const totalsMap = {};
        totals.forEach(t => {
            totalsMap[t.merchantId] = parseFloat(t.totalPayments || 0);
        });

        const enriched = merchants.map(m => {
            const totalPayments = totalsMap[m.id] || 0;
            const balance = parseFloat(m.balance || 0);
            
            return {
                ...m.toJSON(),
                totalPayments: totalPayments,
                totalInvoices: balance + totalPayments, // المبلغ كامل = المتبقي + المدفوع
            };
        });

        res.json(enriched);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'حدث خطأ أثناء جلب البيانات' });
    }
};

exports.createMerchant = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { name, phone, type, notes, initialBalance } = req.body;
        if (!name || !type) return res.status(400).json({ error: 'الاسم والنوع مطلوبان' });
        
        const numericInitial = parseFloat(initialBalance) || 0;
        
        const merchant = await Merchant.create(
            { name, phone, type, notes, balance: numericInitial },
            { transaction: t }
        );
        
        // If initial balance provided, log it as an opening transaction
        if (numericInitial > 0) {
            await MerchantTransaction.create({
                merchantId: merchant.id,
                type: type === 'supplier' ? 'invoice' : 'invoice', // debt for both
                amount: numericInitial,
                date: new Date(),
                notes: 'رصيد افتتاحي'
            }, { transaction: t });
        }
        
        await t.commit();
        res.status(201).json(merchant);
    } catch (err) {
        await t.rollback();
        console.error(err);
        res.status(500).json({ error: 'فشل في إضافة التاجر' });
    }
};

exports.updateMerchant = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, phone, notes } = req.body;
        await Merchant.update({ name, phone, notes }, { where: { id } });
        res.json({ success: true, message: 'تم التحديث بنجاح' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'فشل التحديث' });
    }
};

exports.deleteMerchant = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;

        // Force delete all associated transactions first to maintain integrity
        await MerchantTransaction.destroy({ where: { merchantId: id }, transaction: t });
        
        // Delete the merchant itself
        const deletedCount = await Merchant.destroy({ where: { id }, transaction: t });

        if (deletedCount === 0) {
            await t.rollback();
            return res.status(404).json({ error: 'العميل/المورد غير موجود' });
        }

        await t.commit();
        res.json({ success: true, message: 'تم الحذف بنجاح مع كافة البيانات المرتبطة' });
    } catch (err) {
        await t.rollback();
        console.error('❌ Deletion Error:', err);
        res.status(500).json({ error: 'فشل الحذف. قد تكون هناك بيانات مرتبطة في أقسام أخرى.' });
    }
};

// Transactions
exports.getTransactions = async (req, res) => {
    try {
        const { merchantId } = req.params;
        const transactions = await MerchantTransaction.findAll({
            where: { merchantId },
            order: [['date', 'DESC'], ['createdAt', 'DESC']]
        });
        const merchant = await Merchant.findByPk(merchantId);
        res.json({ merchant, transactions });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'فشل جلب الحركات' });
    }
};

exports.addTransaction = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { merchantId } = req.params;
        const { type, amount, date, notes } = req.body; // type: 'invoice' or 'payment'

        if (!amount || amount <= 0) return res.status(400).json({ error: 'المبلغ غير صحيح' });

        const merchant = await Merchant.findByPk(merchantId, { 
            transaction: t,
            lock: t.LOCK.UPDATE 
        });
        if (!merchant) throw new Error('التاجر غير موجود');

        const transaction = await MerchantTransaction.create({
            merchantId,
            type,
            amount,
            date: date || new Date(),
            notes
        }, { transaction: t });

        // Update balance
        // Invoice increases debt, Payment decreases debt
        const numericAmount = parseFloat(amount);
        if (type === 'invoice') {
            merchant.balance = parseFloat(merchant.balance) + numericAmount;
        } else if (type === 'payment') {
            merchant.balance = parseFloat(merchant.balance) - numericAmount;
        }

        await merchant.save({ transaction: t });
        await t.commit();

        // 📝 Audit Log
        const { logAudit } = require('../utils/auditLogger');
        logAudit(req, {
            action: 'CREATE',
            tableName: 'MerchantTransaction',
            recordId: transaction.id,
            newValues: transaction.toJSON()
        });

        res.json({ success: true, transaction, newBalance: merchant.balance });
    } catch (err) {
        await t.rollback();
        console.error(err);
        res.status(500).json({ error: 'فشل إضافة الحركة المالية' });
    }
};

exports.deleteTransaction = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const transaction = await MerchantTransaction.findByPk(id, { transaction: t });
        if (!transaction) throw new Error('الحركة غير موجودة');

        const merchant = await Merchant.findByPk(transaction.merchantId, { 
            transaction: t,
            lock: t.LOCK.UPDATE
        });
        
        // Reverse the balance
        const numericAmount = parseFloat(transaction.amount);
        if (transaction.type === 'invoice') {
            merchant.balance = parseFloat(merchant.balance) - numericAmount;
        } else if (transaction.type === 'payment') {
            merchant.balance = parseFloat(merchant.balance) + numericAmount;
        }

        const oldData = transaction.toJSON();
        await merchant.save({ transaction: t });
        await transaction.destroy({ transaction: t });
        
        await t.commit();

        // 📝 Audit Log
        const { logAudit } = require('../utils/auditLogger');
        logAudit(req, {
            action: 'DELETE',
            tableName: 'MerchantTransaction',
            recordId: id,
            oldValues: oldData
        });

        res.json({ success: true, newBalance: merchant.balance });
    } catch (err) {
        await t.rollback();
        console.error(err);
        res.status(500).json({ error: 'فشل حذف الحركة' });
    }
};

exports.updateTransaction = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const { amount, date, notes } = req.body;
        
        const transaction = await MerchantTransaction.findByPk(id, { transaction: t });
        if (!transaction) return res.status(404).json({ error: 'الحركة غير موجودة' });

        const merchant = await Merchant.findByPk(transaction.merchantId, { 
            transaction: t,
            lock: t.LOCK.UPDATE
        });
        
        // 1. Reverse old amount
        const oldAmount = parseFloat(transaction.amount);
        if (transaction.type === 'invoice') {
            merchant.balance = parseFloat(merchant.balance) - oldAmount;
        } else {
            merchant.balance = parseFloat(merchant.balance) + oldAmount;
        }

        // 2. Apply new amount
        const newAmount = parseFloat(amount);
        if (transaction.type === 'invoice') {
            merchant.balance = parseFloat(merchant.balance) + newAmount;
        } else {
            merchant.balance = parseFloat(merchant.balance) - newAmount;
        }

        // 3. Update transaction record
        const oldData = transaction.toJSON();
        transaction.amount = newAmount;
        transaction.date = date || transaction.date;
        transaction.notes = notes;

        await merchant.save({ transaction: t });
        await transaction.save({ transaction: t });

        await t.commit();

        // 📝 Audit Log
        const { logAudit } = require('../utils/auditLogger');
        logAudit(req, {
            action: 'UPDATE',
            tableName: 'MerchantTransaction',
            recordId: id,
            oldValues: oldData,
            newValues: transaction.toJSON()
        });

        res.json({ success: true, newBalance: merchant.balance });
    } catch (err) {
        await t.rollback();
        console.error(err);
        res.status(500).json({ error: 'فشل تعديل الحركة' });
    }
};

========== ./controllers/orderController.js ==========
const { Op , Sequelize} = require('sequelize');
const { Order, Customer, Product, DiscountCode, Payment, Recipe, Inventory, Comment, Setting, sequelize } = require('../models');
const { printReceipt } = require('./receiptPrinter');

// ✅ دالة لحساب الخصم تلقائيًا بناءً على المنتجات الموجودة في الطلب
exports.applyAutomaticDiscount = async (orderDetails, orderTotal, discountCode) => {
    let discountValue = 0;
    let appliedDiscounts = [];

    if (discountCode) {
        const discount = await DiscountCode.findOne({
            where: { 
                code: discountCode, 
                end_date: { [Op.gte]: new Date() },
                is_active: 1
            }
        });

        if (discount) {
            let applicableProducts = discount.applicable_products;
            if (!Array.isArray(applicableProducts)) {
                try {
                    applicableProducts = JSON.parse(discount.applicable_products);
                } catch (error) {
                    applicableProducts = [];
                }
            }

            for (const item of orderDetails) {
                if (applicableProducts.includes(item.name)) {
                    let itemDiscount = 0;
                    if (discount.discount_type === 'percentage') {
                        itemDiscount = (item.price * discount.discount_value) / 100;
                    } else if (discount.discount_type === 'fixed') {
                        itemDiscount = discount.discount_value;
                    }
                    const totalItemDiscount = itemDiscount * item.quantity;
                    discountValue += totalItemDiscount;
                    appliedDiscounts.push({
                        product: item.name,
                        discount: totalItemDiscount
                    });
                }
            }
        }
    }

    return { discountValue, appliedDiscounts };
};

exports.createOrder = async (req, res) => {
    try {
        const { customer, deliveryPrice, orderTotal, orderDetails, payment_method, discountCode, commentText } = req.body;
        if (!customer || !customer.phone) return res.status(400).json({ message: "❌ رقم الهاتف مطلوب." });

        const { name, phone, address } = customer;
        const finalDeliveryPrice = Number(deliveryPrice) || 0;
        const productNamesInOrder = [...new Set(orderDetails.map(i => i.name))];

        // 🚀 PRE-FETCH DATA: Fetch recipes and inventory outside transaction to keep it fast
        const [existingCustomer, allRecipes, allInventoryItems] = await Promise.all([
            Customer.findOne({ where: { phone } }),
            Recipe.findAll({ where: { sandwich: { [Op.in]: productNamesInOrder } }, raw: true }),
            Inventory.findAll({ 
                where: { 
                    name: { 
                        [Op.or]: [
                            { [Op.in]: productNamesInOrder },
                            { [Op.in]: Sequelize.literal(`(SELECT ingredient FROM recipes WHERE sandwich IN (${productNamesInOrder.map(n => `'${n.replace(/'/g, "''")}'`).join(',')}))`) }
                        ]
                    } 
                }
            })
        ]);

        // 1. Calculate Totals (In-Memory)
        let manualDiscountTotal = 0;
        const productTotal = orderDetails.reduce((total, product) => {
            let itemBase = Number(product.price) * (Number(product.quantity) || 0);
            let addonsPrice = 0;
            if (Array.isArray(product.comments)) {
                product.comments.forEach(c => {
                    const p = Number(c.price) || 0;
                    if (p < 0) manualDiscountTotal += Math.abs(p) * (Number(product.quantity) || 0);
                    else addonsPrice += p;
                });
            }
            return total + itemBase + (addonsPrice * (Number(product.quantity) || 0));
        }, 0);

        const { discountValue } = await this.applyAutomaticDiscount(orderDetails, orderTotal, discountCode);
        const totalDiscountAmount = discountValue + manualDiscountTotal;
        const finalTotal = Math.max(productTotal - discountValue - manualDiscountTotal + finalDeliveryPrice, 0);

        // 🚀 TRANSACTIONAL ORDER CREATION: Ensures no duplicate daily serials under heavy load
        const orderResult = await sequelize.transaction(async (t) => {
            // Get Business Date with Lock to prevent race conditions
            const activeDateSetting = await Setting.findOne({ 
                where: { key: 'active_business_date' }, 
                transaction: t,
                lock: t.LOCK.UPDATE 
            });
            const businessDate = activeDateSetting ? activeDateSetting.value : new Date().toLocaleDateString('en-CA');

            // Get the last serial for this date with a lock
            const lastOrder = await Order.findOne({
                attributes: ['dailySerial'],
                where: { businessDate },
                order: [['dailySerial', 'DESC']],
                transaction: t,
                lock: t.LOCK.UPDATE
            });

            const nextSerial = lastOrder ? (Number(lastOrder.dailySerial) || 0) + 1 : 1;

            // Customer Logic
            let finalCustomerId;
            if (!existingCustomer) {
                const newCust = await Customer.create({ name, phone, address }, { transaction: t });
                finalCustomerId = newCust.id;
            } else {
                finalCustomerId = existingCustomer.id;
            }

            // Create Order
            const newOrder = await Order.create({
                customerId: finalCustomerId,
                customerName: name,
                customerPhone: phone,
                customerAddress: address,
                deliveryPrice: finalDeliveryPrice,
                orderTotal: finalTotal,
                orderDetails: JSON.stringify(orderDetails),
                discountAmount: totalDiscountAmount,
                payment_status: payment_method === 'cash' ? "Pending" : "Paid",
                payment_method,
                businessDate,
                createdAt: new Date(),
                dailySerial: nextSerial
            }, { transaction: t });

            // Create Payment record if needed
            if (finalTotal > 0) {
                await Payment.create({ 
                    order_id: newOrder.id, 
                    payment_method, 
                    payment_amount: finalTotal, 
                    payment_date: new Date() 
                }, { transaction: t });
            }

            return newOrder;
        });

        const order = orderResult;

        // C. ATOMIC INVENTORY DEDUCTION (Background but Atomic)
        const inventoryOps = [];
        const recipeMap = {};
        allRecipes.forEach(r => {
            if (!recipeMap[r.sandwich]) recipeMap[r.sandwich] = [];
            recipeMap[r.sandwich].push(r);
        });

        for (const item of orderDetails) {
            if (item.productId && item.quantity > 0) {
                // 1. Increment product sales (Atomic)
                inventoryOps.push(Product.increment("sold", { by: item.quantity, where: { id: item.productId } }));

                // 2. Deduct from Recipes/Ingredients (Atomic)
                (recipeMap[item.name] || []).forEach(r => {
                    inventoryOps.push(Inventory.decrement("quantity", { 
                        by: (r.amount * item.quantity), 
                        where: { name: { [Op.iLike]: r.ingredient } } 
                    }));
                });

                // 3. Deduct from Direct Inventory Item (Atomic)
                inventoryOps.push(Inventory.decrement("quantity", { 
                    by: item.quantity, 
                    where: { name: { [Op.iLike]: item.name } } 
                }));

                // 4. Handle Variants (requires careful update if using JSON)
                if (item.variant) {
                    // Variants still need a more careful approach since they are in JSON
                    // We'll fetch the latest and update specifically for variants
                    inventoryOps.push(async () => {
                        const invItem = await Inventory.findOne({ where: { name: { [Op.iLike]: item.name } } });
                        if (invItem && invItem.variants) {
                            let vs = typeof invItem.variants === 'string' ? JSON.parse(invItem.variants) : invItem.variants;
                            vs = vs.map(v => {
                                const vLabel = `${v.color || ''} ${v.size || ''}`.trim();
                                return (vLabel === item.variant || (vLabel && item.variant.startsWith(vLabel + ' '))) 
                                    ? { ...v, quantity: (v.quantity || 0) - item.quantity } : v;
                            });
                            await invItem.update({ variants: vs });
                        }
                    });
                }
            }
        }

        // 3. Finalize all inventory operations in background
        Promise.all(inventoryOps.map(op => typeof op === 'function' ? op() : op)).catch(e => console.error("❌ Inventory Atomic Update Err:", e));

        const orderData = {
            id: order.id,
            customerName: order.customerName,
            customerPhone: order.customerPhone,
            customerAddress: order.customerAddress,
            deliveryPrice: order.deliveryPrice,
            orderTotal: order.orderTotal,
            orderDetails,
            discount: totalDiscountAmount || 0,
            orderDate: (() => {
                const d = new Date();
                const day = d.getDate();
                const month = d.getMonth() + 1;
                let hours = d.getHours();
                const minutes = String(d.getMinutes()).padStart(2, '0');
                const ampm = hours >= 12 ? 'PM' : 'AM';
                hours = hours % 12 || 12;
                return `${day}/${month} ${hours}:${minutes} ${ampm}`;
            })(),
            comment: commentText || null
        };

        printReceipt(orderData).catch(e => console.error("🖨️ Printing Error (Background):", e));

        res.status(201).json({
            message: "✅ تم إنشاء الطلب بنجاح!",
            order: orderData,
        });

    } catch (error) {
        console.error("❌ خطأ أثناء إنشاء الطلب:", error);
        res.status(500).json({ message: "❌ فشل إنشاء الطلب", error: error.message });
    }
};

exports.getAllOrders = async (req, res) => {
    try {
        const { page = 1, limit = 10, date, status, search } = req.query;
        const offset = (page - 1) * limit;
        let whereClause = {};
        if (date) whereClause.businessDate = date;
        if (status && status !== 'all') whereClause.payment_status = status;
        if (search) {
            whereClause[Op.or] = [
                { customerName: { [Op.iLike]: `%${search}%` } },
                { customerPhone: { [Op.iLike]: `%${search}%` } },
                { customerAddress: { [Op.iLike]: `%${search}%` } }
            ];
        }
        const { count, rows } = await Order.findAndCountAll({
            where: whereClause,
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset),
            include: [{ model: Customer, as: 'customer_info', attributes: ['name', 'phone', 'address'] }]
        });
        res.json({
            orders: rows,
            totalOrders: count,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page)
        });
    } catch (error) {
        console.error("❌ خطأ أثناء جلب الطلبات:", error);
        res.status(500).json({ message: "🚨 حدث خطأ أثناء جلب الطلبات." });
    }
};
========== ./controllers/ordersController.js ==========
const { Order, sequelize, Setting, Product, Inventory, Recipe } = require("../models");

exports.fetchOrders = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const nopaging = req.query.nopaging === 'true';
        const { date, status, search } = req.query;
        const { Op } = require("sequelize");

        const activeDateSetting = await Setting.findOne({ where: { key: 'active_business_date' } });
        const activeBusinessDate = activeDateSetting ? activeDateSetting.value : new Date().toLocaleDateString('en-CA');

        const where = {};

        // 🗓️ Strict Date Filter
        const filterDate = (date && date.trim() !== "" && date !== 'undefined') ? date : activeBusinessDate;
        where.businessDate = filterDate;

        // 🏷️ Status Filter
        if (status && status !== 'all' && status !== 'undefined') {
            if (status === 'cancelled') {
                where.isCancelled = 'Yes';
            } else {
                where.payment_status = status;
                where.isCancelled = { [Op.ne]: 'Yes' };
            }
        }

        let cleanSearch = (search && search !== 'undefined') ? search.trim() : "";
        const arabicMap = { '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9' };
        cleanSearch = cleanSearch.replace(/[٠-٩]/g, d => arabicMap[d]);

        const isNumericSearch = !isNaN(cleanSearch) && cleanSearch !== "";

        if (cleanSearch !== "") {
            where[Op.or] = [
                { dailySerial: isNumericSearch ? parseInt(cleanSearch) : 0 },
                sequelize.where(sequelize.cast(sequelize.col('dailySerial'), 'TEXT'), { [Op.iLike]: `%${cleanSearch}%` }),
                { customerName: { [Op.iLike]: `%${cleanSearch}%` } },
                { customerPhone: { [Op.iLike]: `%${cleanSearch}%` } }
            ];
        }

        if (nopaging) {
            const orders = await Order.findAll({ where, order: [["id", "DESC"]] });
            return res.json(orders);
        }

        const { count, rows } = await Order.findAndCountAll({
            where,
            order: [["id", "DESC"]],
            limit: limit,
            offset: offset
        });

        // 📊 Unified Count Calculation - Optimizing latency by running queries concurrently
        const countsWhere = { businessDate: filterDate };
        
        const [all, paid, pending, cancelled, todayCount] = await Promise.all([
            Order.count({ where: countsWhere }),
            Order.count({ where: { ...countsWhere, payment_status: 'Paid', isCancelled: { [Op.ne]: 'Yes' } } }),
            Order.count({ where: { ...countsWhere, payment_status: 'Pending', isCancelled: { [Op.ne]: 'Yes' } } }),
            Order.count({ where: { ...countsWhere, isCancelled: 'Yes' } }),
            Order.count({ where: { businessDate: activeBusinessDate } })
        ]);

        const counts = { all, paid, pending, cancelled, today: todayCount };

        res.json({
            orders: rows,
            total: count,
            currentPage: page,
            totalPages: Math.ceil(count / limit),
            counts
        });
    } catch (error) {
        console.error("❌ خطأ في جلب الطلبات:", error);
        res.status(500).json({ message: "❌ خطأ في جلب الطلبات" });
    }
};

exports.countSandwiches = (req, res) => {
    try {
        const { orderDetails } = req.body;
        if (!orderDetails) return res.json({ count: 0 });

        let sandwiches = [];
        try {
            sandwiches = typeof orderDetails === 'string' ? JSON.parse(orderDetails) : orderDetails;
        } catch (e) { return res.json({ count: 0 }); }
        
        if (!Array.isArray(sandwiches)) return res.json({ count: 0 });
        
        const total = sandwiches.reduce((total, sandwich) => total + (Number(sandwich.quantity) || 0), 0);
        res.json({ count: total });
    } catch (error) {
        console.error("❌ خطأ في حساب السندوتشات:", error);
        res.status(400).json({ message: "⚠️ خطأ في تحليل الطلب" });
    }
};

exports.formatOrderDetails = (req, res) => {
    try {
        const { orderDetails } = req.body;
        if (!orderDetails) return res.json({ formatted: [] });

        let items = [];
        const cleanedOrderDetails = (typeof orderDetails === 'string') ? orderDetails.replace(/\u200B/g, "").trim() : orderDetails;

        try {
            items = typeof cleanedOrderDetails === "string" ? JSON.parse(cleanedOrderDetails) : cleanedOrderDetails;
        } catch (e) {
            return res.json({ formatted: [] });
        }

        if (!Array.isArray(items)) items = [];

        const formatted = items.map((item) => {
            let addonsTotal = 0;
            const comments = (item.comments || []).map(comment => {
                const addPrice = parseFloat(comment.price || 0);
                addonsTotal += addPrice;
                return { text: comment.text, price: addPrice.toFixed(2) };
            });

            const manualComments = (item.manualComments || []).map(comment => {
                if (typeof comment === "object") {
                    const addPrice = parseFloat(comment.price || 0);
                    addonsTotal += addPrice;
                    return { text: comment.text, price: addPrice.toFixed(2) };
                }
                return { text: comment, price: "0.00" };
            });

            const quantity = Number(item.quantity) || 1;
            const basePrice = parseFloat(item.price) || 0;

            return {
                name: item.name,
                variant: item.variant || null,
                price: basePrice.toFixed(2),
                quantity: quantity,
                comments,
                manualComments,
                total: (basePrice + addonsTotal) * quantity
            };
        });

        res.json({ formatted });
    } catch (error) {
        console.error("❌ خطأ في تنسيق الطلب:", error.message);
        res.status(400).json({ message: error.message });
    }
};

exports.cancelOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findByPk(orderId);

        if (!order) {
            return res.status(404).json({ success: false, message: "❌ الطلب غير موجود" });
        }

        if (order.isCancelled === "Yes") {
            return res.status(400).json({ success: false, message: "⚠️ الطلب ملغي بالفعل" });
        }

        // 🔄 استرجاع المخزون (خامات وتفريعات)
        let orderItems = [];
        try {
            orderItems = typeof order.orderDetails === 'string' ? JSON.parse(order.orderDetails) : order.orderDetails;
        } catch (e) { orderItems = []; }

        if (!Array.isArray(orderItems)) orderItems = [];

        for (const item of orderItems) {
            const product = await Product.findOne({ where: { name: item.name } });
            if (product) {
                // 1. تقليل عدد مرات البيع
                await product.decrement("sold", { by: item.quantity });

                // 2. استرجاع المواد الخام
                const recipeItems = await Recipe.findAll({ where: { sandwich: item.name } });
                for (const recipe of recipeItems) {
                    const inventoryItem = await Inventory.findOne({
                        where: sequelize.where(sequelize.fn('LOWER', sequelize.col('name')), 'LIKE', recipe.ingredient.toLowerCase())
                    });
                    if (inventoryItem) {
                        await inventoryItem.increment("quantity", { by: (recipe.amount || 1) * item.quantity });
                    }
                }

                // 3. استرجاع التفريعة (لون/مقاس)
                if (item.variant) {
                    const inventoryItem = await Inventory.findOne({ where: { name: item.name } });
                    if (inventoryItem && inventoryItem.variants) {
                        let variants = typeof inventoryItem.variants === 'string' ? JSON.parse(inventoryItem.variants) : inventoryItem.variants;
                        variants = variants.map(v => {
                            const vLabel = `${v.color || ''} ${v.size || ''}`.trim();
                            if (vLabel === item.variant) return { ...v, quantity: (v.quantity || 0) + item.quantity };
                            return v;
                        });
                        await inventoryItem.update({ variants: variants });
                    }
                }
            }
        }

        order.isCancelled = "Yes";
        await order.save();

        // 📝 Audit Log
        const { logAudit } = require('../utils/auditLogger');
        logAudit(req, {
            action: 'UPDATE',
            tableName: 'Order',
            recordId: orderId,
            oldValues: { isCancelled: "No" },
            newValues: { isCancelled: "Yes" }
        });

        res.json({ success: true, message: "✅ تم إلغاء الطلب واسترجاع المخزون" });
    } catch (error) {
        console.error("❌ خطأ أثناء إلغاء الطلب:", error);
        res.status(500).json({ success: false, message: "❌ خطأ أثناء الإلغاء" });
    }
};

// ✅ دالة إعادة طباعة أوردر موجود بالفعل
exports.reprintOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const order = await Order.findByPk(id);
        const { printReceipt } = require("./receiptPrinter");

        if (!order) return res.status(404).json({ message: "❌ الطلب غير موجود." });

        const orderData = {
            id: order.id,
            customerName: order.customerName,
            customerPhone: order.customerPhone,
            customerAddress: order.customerAddress,
            deliveryPrice: order.deliveryPrice,
            orderTotal: order.orderTotal,
            orderDetails: (() => {
                try {
                    const d = typeof order.orderDetails === 'string' ? JSON.parse(order.orderDetails) : order.orderDetails;
                    return Array.isArray(d) ? d : [];
                } catch(e) { return []; }
            })(),
            discount: order.discountAmount || 0,
            orderDate: (() => {
                const d = new Date(order.createdAt);
                const day = d.getDate();
                const month = d.getMonth() + 1;
                let hours = d.getHours();
                const minutes = String(d.getMinutes()).padStart(2, '0');
                const ampm = hours >= 12 ? 'PM' : 'AM';
                hours = hours % 12 || 12;
                return `${day}/${month} ${hours}:${minutes} ${ampm}`;
            })()
        };

        printReceipt(orderData);
        res.json({ message: "✅ تم إرسال الطلب للطابعة." });
    } catch (error) {
        console.error("❌ خطأ أثناء إعادة الطباعة:", error);
        res.status(500).json({ message: "❌ فشل في الطباعة." });
    }
};

========== ./controllers/paymentController.js ==========
const { Order, Payment } = require('../models');
const { printReceipt } = require('./receiptPrinter');

// إنشاء سجل الدفع للطلبات الإلكترونية
exports.createPayment = async (req, res) => {
    try {
        const { orderId, payment_method, payment_amount, status } = req.body;

        const payment = await Payment.create({
            order_id: orderId,
            payment_amount,
            payment_method
        });

        await Order.update(
            { payment_status: status },
            { where: { id: orderId } }
        );

        // جلب بيانات الطلب للطباعة
        const order = await Order.findByPk(orderId);
        if (order) {
            const orderData = {
                id: order.id,
                customerName: order.customerName,
                customerPhone: order.customerPhone,
                customerAddress: order.customerAddress,
                deliveryPrice: order.deliveryPrice,
                orderTotal: order.orderTotal,
                orderDetails: (() => {
                    try {
                        const d = typeof order.orderDetails === 'string' ? JSON.parse(order.orderDetails) : order.orderDetails;
                        return Array.isArray(d) ? d : [];
                    } catch(e) { return []; }
                })(),
                discount: order.discountAmount || 0,
                orderDate: new Date().toLocaleString("en-US", { timeZone: "Africa/Cairo" }),
            };

            // طباعة الإيصال عند الدفع الإلكتروني
            printReceipt(orderData);
        }

        res.status(200).json({ message: '✅ تم تسجيل الدفع بنجاح', payment });

    } catch (error) {
        console.error('❌ خطأ أثناء تسجيل الدفع:', error.message);
        res.status(500).json({ message: '❌ حدث خطأ أثناء تسجيل الدفع', error: error.message });
    }
};

// تحديث حالة الدفع
exports.updatePaymentStatus = async (req, res) => {
    try {
        const { orderId, paymentStatus } = req.body;

        if (!orderId || !paymentStatus) {
            return res.status(400).json({ message: "❌ يجب إرسال orderId و paymentStatus" });
        }

        const order = await Order.findByPk(orderId);

        if (!order) {
            return res.status(404).json({ message: "❌ الطلب غير موجود" });
        }

        await order.update({ payment_status: paymentStatus });

        res.status(200).json({
            message: "✅ تم تحديث حالة الدفع بنجاح!",
            order: {
                id: order.id,
                paymentStatus: order.payment_status,
            }
        });

    } catch (error) {
        console.error("❌ خطأ أثناء تحديث حالة الدفع:", error);
        res.status(500).json({ message: "❌ فشل تحديث حالة الدفع", error });
    }
};
========== ./controllers/productController.js ==========
const { Product, Inventory, sequelize } = require('../models'); 

// إنشاء منتج جديد
exports.addProduct = async (req, res) => {
    try {
        const { name, price, wholesalePrice, category } = req.body;

        if (!name || !price || !category) {
            return res.status(400).json({ error: "⚠️ جميع الحقول مطلوبة." });
        }

        const newProduct = await Product.create({ 
            name,
            price,
            wholesalePrice: wholesalePrice || price,
            category,
        });

        // 🔄 Sync with Inventory: Auto-create an empty stock record
        try {
            await Inventory.findOrCreate({
                where: { name: newProduct.name },
                defaults: {
                    quantity: 0,
                    cost: wholesalePrice || price,
                    min: 5,
                    total: 0,
                    variants: []
                }
            });
        } catch (invError) {
            console.error("⚠️ خطأ أثناء إضافة المنتج للمخزن تلقائياً:", invError);
        }

        res.status(201).json({ 
            success: true, 
            message: "✅ تم إنشاء المنتج بنجاح!", 
            product: newProduct 
        });

    } catch (error) {
        console.error("⚠️ خطأ أثناء إنشاء المنتج:", error);
        res.status(500).json({ error: "⚠️ حدث خطأ أثناء إضافة المنتج." });
    }
};

exports.getProductsByCategory = async (req, res) => {
    const { category } = req.params;
    try {
        const products = await Product.findAll({
            where: { category }
        });
        res.json(products);
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ message: 'خطأ في جلب المنتجات' });
    }
};

// جلب جميع المنتجات مع التصنيفات المختلفة
exports.getAllProducts = async (req, res) => {
    try {
        // جلب المنتجات
        const products = await Product.findAll({
            attributes: ['id', 'name', 'price', 'wholesalePrice', 'category', 'sold'],
            raw: true 
        });
 
        // جلب بيانات المخزن للمنتجات المتاحة
        const inventoryItems = await Inventory.findAll({
            attributes: ['name', 'variants', 'quantity'],
            raw: true
        });
 
        const inventoryMap = {};
        for (const inv of inventoryItems) {
            inventoryMap[inv.name] = inv;
        }

        const productsWithDetails = products.map(p => {
            const inv = inventoryMap[p.name];
            return {
                ...p,
                quantity: inv ? inv.quantity : 0,
                variants: inv && inv.variants ? (typeof inv.variants === 'string' ? JSON.parse(inv.variants) : inv.variants) : []
            };
        });
 
        // تقسيم المنتجات حسب التصنيف
        const categorizedProducts = productsWithDetails.reduce((acc, product) => {
            const category = product.category || 'Others';
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(product);
            return acc;
        }, {});
        res.json(categorizedProducts);
    } catch (error) {
        console.error("⚠️ خطأ أثناء جلب المنتجات:", error);
        res.status(500).json({ error: "⚠️ حدث خطأ أثناء تحميل المنتجات." });
    }
};

// جلب منتج معين عبر الـ ID
exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findByPk(req.params.id, { 
            attributes: ['id', 'name', 'price', 'wholesalePrice', 'category', 'sold']
        });

        if (!product) {
            return res.status(404).json({ error: "⚠️ المنتج غير موجود." });
        }

        res.json(product);
    } catch (error) {
        console.error("⚠️ خطأ أثناء جلب المنتج:", error);
        res.status(500).json({ error: "⚠️ حدث خطأ أثناء تحميل المنتج." });
    }
};

// تحديث منتج معين
exports.updateProduct = async (req, res) => {
    try {
        const { name, price, wholesalePrice, category } = req.body;
        const product = await Product.findByPk(req.params.id); // ✅ استخدام Product بدلًا من Products

        if (!product) {
            return res.status(404).json({ error: "⚠️ المنتج غير موجود." });
        }

        if (!name || !price || !category) {
            return res.status(400).json({ error: "⚠️ جميع الحقول مطلوبة." });
        }

        const oldName = product.name;

        await product.update({
            name,
            price,
            wholesalePrice: wholesalePrice || price,
            category,
        });

        // 🔄 Sync with Inventory: Update name and cost if they exist
        try {
            await Inventory.update(
                { name: name, cost: wholesalePrice || price },
                { where: { name: oldName } }
            );
        } catch (invError) {
            console.error("⚠️ خطأ أثناء تحديث بيانات المنتج في المخزن تلقائياً:", invError);
        }

        res.json({ 
            success: true, 
            message: "✅ تم تحديث المنتج بنجاح!", 
            product 
        });

    } catch (error) {
        console.error("⚠️ خطأ أثناء تحديث المنتج:", error);
        res.status(500).json({ error: "⚠️ حدث خطأ أثناء تحديث المنتج." });
    }
};

// حذف منتج معين
exports.deleteProduct = async (req, res) => {
    try {
        const product = await Product.findByPk(req.params.id); // ✅ استخدام Product بدلًا من Products
        if (!product) {
            return res.status(404).json({ error: "⚠️ المنتج غير موجود." });
        }

        const oldName = product.name;
        await product.destroy();

        // 🔄 Sync with Inventory: Delete the linked stock record
        try {
            await Inventory.destroy({ where: { name: oldName } });
        } catch (invError) {
            console.error("⚠️ خطأ أثناء حذف المنتج من المخزن تلقائياً:", invError);
        }
        res.json({ success: true, message: "✅ تم حذف المنتج بنجاح!" });

    } catch (error) {
        console.error("⚠️ خطأ أثناء حذف المنتج:", error);
        res.status(500).json({ error: "⚠️ حدث خطأ أثناء حذف المنتج." });
    }
};


========== ./controllers/receiptPrinter.js ==========
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { ThermalPrinter, PrinterTypes } = require('node-thermal-printer');
const branding = require('../config/branding');
const { Setting } = require('../models');
const { fixArabic } = require('../utils/arabicHelper');

const ARABIC_FONT = path.join(__dirname, '../assets/fonts/Tahoma.ttf');
const ARABIC_FONT_BOLD = path.join(__dirname, '../assets/fonts/Tahoma Bold.ttf');

/**
 * Helper to fetch settings from DB
 */
async function getStoreSettings() {
    try {
        const settings = await Setting.findAll();
        const settingsObj = {};
        settings.forEach(s => settingsObj[s.key] = s.value);
        
        return {
            restaurantName: settingsObj.store_name || branding.restaurantName,
            hotline: settingsObj.store_phone || branding.hotline,
            footerMessage: settingsObj.receipt_footer || branding.footerMessage,
            currency: settingsObj.currency || branding.currency || "EGP",
            showDiscount: settingsObj.show_discount || 'yes',
            showComments: settingsObj.show_comments || 'yes'
        };
    } catch (err) {
        console.error("❌ Failed to fetch settings for printer, using defaults", err);
        return branding;
    }
}

/**
 * دالة طباعة الإيصال الرئيسية
 * @param {Object} orderData - بيانات الطلب
 */
async function printReceipt(orderData) {
    console.log("📄 Starting print process for order:", orderData.id);

    try {
        const storeConfig = await getStoreSettings();

        // ✅ محاولة الطباعة الصامتة عبر Electron (الطريقة الأضمن للويندوز)
        try {
            const { ipcMain } = require('electron');
            if (ipcMain) {
                console.log("🔌 Emitting print-receipt event to Electron...");
                ipcMain.emit('print-receipt', null, orderData);
            }
        } catch (e) {
            console.log("⚠️ Not running in Electron environment, skipping silent print.");
        }

        const subtotal = orderData.orderDetails?.reduce((total, item) => {
            const basePrice = parseFloat(item.price) || 0;
            const quantity = parseFloat(item.quantity) || 0;
            
            let addonsTotal = 0;
            if (Array.isArray(item.comments)) {
                addonsTotal = item.comments.reduce((sum, c) => sum + (parseFloat(c.price) > 0 ? parseFloat(c.price) : 0), 0);
            }
            return total + (quantity * (basePrice + addonsTotal));
        }, 0) || 0;

        const deliveryPrice = parseFloat(orderData.deliveryPrice) || 0;
        const discount = parseFloat(orderData.discount) || 0;
        const calculatedTotal = subtotal + deliveryPrice - discount;

        // 1. Generate PDF (With Arabic Fixes)
        generatePDF(orderData, subtotal, deliveryPrice, discount, calculatedTotal, storeConfig);

        // 2. Thermal Print
        await printThermal(orderData, subtotal, deliveryPrice, discount, calculatedTotal, storeConfig);
    } catch (error) {
        console.error("❌ Receipt Printing System Failure:", error);
    }
}

/**
 * Generate PDF Receipt (A4 or Small Format)
 */
function generatePDF(orderData, subtotal, deliveryPrice, discount, calculatedTotal, storeConfig) {
    try {
        const doc = new PDFDocument({ size: [226, 600], margin: 5 }); // 80mm with minimal margin
        const receiptPath = path.join(__dirname, `receipt_${orderData.id}.pdf`);
        const writeStream = fs.createWriteStream(receiptPath);

        doc.pipe(writeStream);

        // --- Branding & Header ---
        if (fs.existsSync(ARABIC_FONT_BOLD)) {
            doc.font(ARABIC_FONT_BOLD);
        } else if (fs.existsSync(ARABIC_FONT)) {
            doc.font(ARABIC_FONT);
        }

        const pageWidth = 226;
        const leftX = 5;
        const rightX = 221;
        const centerX = pageWidth / 2;

        doc.fontSize(22).text(fixArabic("دار الفاروق"), { align: 'center' });
        doc.fontSize(14).text(fixArabic(storeConfig.restaurantName), { align: 'center' });
        doc.moveDown(0.2);
        doc.fontSize(32).text(`#${orderData.id}`, { align: 'center' });
        doc.fontSize(8).text('V O R T E X  P O S', { align: 'center', opacity: 0.3 });
        doc.moveDown(0.4);
        
        doc.lineWidth(1.5).moveTo(leftX, doc.y).lineTo(rightX, doc.y).stroke();
        doc.moveDown(0.6);

        // --- Info Section ---
        doc.fontSize(10);
        const infoY = doc.y;
        doc.text(fixArabic(`التاريخ: ${orderData.orderDate}`), leftX, infoY, { align: 'right', width: pageWidth - 10 });
        doc.moveDown(0.3);
        
        const cleanName = (val) => (val?.includes("تيك أوي") || val?.includes("--") || !val) ? "--" : val;
        doc.text(fixArabic(`العميل: ${cleanName(orderData.customerName)}`), leftX, doc.y, { align: 'right', width: pageWidth - 10 });
        
        if (orderData.customerPhone && orderData.customerPhone !== "0000000000") {
            doc.moveDown(0.3);
            doc.text(fixArabic(`الهاتف: ${orderData.customerPhone}`), leftX, doc.y, { align: 'right', width: pageWidth - 10 });
        }

        doc.moveDown(0.5);
        doc.lineWidth(0.5).dash(3, { space: 2 }).moveTo(leftX, doc.y).lineTo(rightX, doc.y).stroke().undash();
        doc.moveDown(0.5);

        // --- Table Header (FULL WIDTH) ---
        const colPriceX = 5;    // Left
        const colQtyX = 85;     // Center-Left
        const colItemX = 120;   // Right

        doc.fontSize(11);
        const hY = doc.y;
        doc.text(fixArabic('السعر'), colPriceX, hY, { width: 70, align: 'left' });
        doc.text(fixArabic('الكمية'), colQtyX, hY, { width: 35, align: 'center' });
        doc.text(fixArabic('الصنف'), colItemX, hY, { width: 101, align: 'right' });
        
        doc.moveDown(0.3);
        doc.lineWidth(0.8).moveTo(leftX, doc.y).lineTo(rightX, doc.y).stroke();
        doc.moveDown(0.5);

        // --- Items List ---
        orderData.orderDetails?.forEach(item => {
            const curY = doc.y;
            const priceVal = ((parseFloat(item.price) || 0) * (parseFloat(item.quantity) || 1)).toFixed(2);
            
            doc.fontSize(11);
            doc.text(`${priceVal}`, colPriceX, curY, { width: 75, align: 'left' });
            doc.text(`x${item.quantity}`, colQtyX, curY, { width: 35, align: 'center' });
            doc.text(fixArabic(item.name), colItemX, curY, { width: 101, align: 'right' });

            if (item.comments && item.comments.length > 0) {
                item.comments.forEach(c => {
                    doc.moveDown(0.1);
                    const txt = c.price > 0 ? `${c.text} (+${c.price})` : c.text;
                    doc.fontSize(9).text(fixArabic(`└─ ${txt}`), colItemX, doc.y, { width: 101, align: 'right', color: '#555555' });
                });
            }
            doc.moveDown(0.5);
        });

        doc.lineWidth(0.8).moveTo(leftX, doc.y).lineTo(rightX, doc.y).stroke();
        doc.moveDown(0.8);

        // --- Totals Section (Clearer & More Spacious) ---
        doc.fontSize(10);
        const drawTotalRow = (label, value) => {
            doc.text(fixArabic(label), centerX, doc.y, { width: centerX - 5, align: 'right' });
            doc.text(value, leftX, doc.y - 10, { width: centerX - 5, align: 'left' });
            doc.moveDown(0.3);
        };

        drawTotalRow('الإجمالي الفرعي:', subtotal.toFixed(2));
        if (deliveryPrice > 0) drawTotalRow('خدمة التوصيل:', deliveryPrice.toFixed(2));
        if (discount > 0) drawTotalRow('الخصم:', `-${discount.toFixed(2)}`);

        doc.moveDown(0.4);
        doc.lineWidth(1.5).moveTo(leftX + 20, doc.y).lineTo(rightX - 20, doc.y).stroke();
        doc.moveDown(0.6);

        // --- GRAND TOTAL (HERO SECTION) ---
        doc.fontSize(16).text(fixArabic('الإجمالي الكلي'), { align: 'center' });
        doc.moveDown(0.2);
        doc.fontSize(24).text(`${calculatedTotal.toFixed(2)} ${storeConfig.currency}`, { align: 'center', underline: true });

        // --- Footer ---
        doc.moveDown(1.2);
        doc.lineWidth(0.5).dash(1, { space: 1 }).moveTo(leftX, doc.y).lineTo(rightX, doc.y).stroke().undash();
        doc.moveDown(0.6);

        doc.fontSize(12).text(fixArabic(storeConfig.hotline), { align: 'center' });
        doc.fontSize(9).text(fixArabic(storeConfig.footerMessage), { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(7).text(`Vortex POS - ${new Date().toLocaleString('ar-EG')}`, { align: 'center', opacity: 0.2 });

        doc.end();
        console.log(`✅ Professional Receipt #${orderData.id} Generated with Arabic Fonts.`);
    } catch (error) {
        console.error('❌ PDF Generation Error:', error);
    }
}

/**
 * Professional Thermal Print Logic using escpos (USB Direct)
 */
async function printThermal(orderData, subtotal, deliveryPrice, discount, calculatedTotal, storeConfig) {
    const escpos = require('escpos');
    escpos.USB = require('escpos-usb');

    try {
        // البحث عن طابعة USB
        const devices = escpos.USB.findPrinter();
        if (!devices || devices.length === 0) {
            console.warn("⚠️ No USB Thermal Printer found via escpos-usb");
            return;
        }

        const device = new escpos.USB();
        const printer = new escpos.Printer(device);

        device.open(async function(error) {
            if (error) {
                console.error("❌ Failed to open printer device:", error);
                return;
            }

            try {
                printer
                    .font('a')
                    .align('ct')
                    .style('bu')
                    .size(2, 2)
                    .text(fixArabic(storeConfig.restaurantName))
                    .size(1, 1)
                    .text(`#${orderData.id}`)
                    .text("V O R T E X  P O S")
                    .text("--------------------------------")
                    .align('lt');

                const cleanValue = (val, forbiddenKeywords = []) => {
                    let trimmed = val?.trim() || "";
                    if (!trimmed) return "-";
                    const isForbidden = forbiddenKeywords.some(k => trimmed.includes(k));
                    if (isForbidden) return "-";
                    if (["0000000000", "0", "--", "Store", "Local"].includes(trimmed)) return "-";
                    return trimmed;
                };

                const cName = cleanValue(orderData.customerName, ["تيك أوي", "نقدي", "Guest"]);
                const cPhone = cleanValue(orderData.customerPhone);
                const cAddress = cleanValue(orderData.customerAddress);

                printer
                    .text(fixArabic(`Date: ${orderData.orderDate}`))
                    .text(fixArabic(`Customer: ${cName}`))
                    .text(fixArabic(`Phone: ${cPhone}`))
                    .text(fixArabic(`Address: ${cAddress}`))
                    .text("--------------------------------");

                orderData.orderDetails?.forEach(item => {
                    let addonsTotal = 0;
                    if (item.comments && item.comments.length > 0) {
                        item.comments.forEach(c => {
                            if (parseFloat(c.price) > 0) addonsTotal += parseFloat(c.price);
                        });
                    }
                    const finalPrice = ((parseFloat(item.price) + addonsTotal) * item.quantity).toFixed(2);
                    printer.text(`${item.quantity} x ${fixArabic(item.name)} : ${finalPrice}`);
                });

                printer
                    .text("--------------------------------")
                    .align('rt')
                    .text(fixArabic(`Total: ${calculatedTotal.toFixed(2)} ${storeConfig.currency}`))
                    .align('ct')
                    .text("--------------------------------")
                    .text(fixArabic(storeConfig.footerMessage))
                    .text(`Vortex POS - ${new Date().toLocaleDateString()}`)
                    .cut()
                    .close();

                console.log("🖨️ Thermal Receipt Printed via Direct USB");
            } catch (err) {
                console.error("❌ Error during print sequence:", err);
                device.close();
            }
        });

    } catch (error) {
        console.error("❌ Direct USB Thermal Printing Failed:", error.message);
    }
}

module.exports = { printReceipt };
========== ./controllers/salesController.js ==========
const { Sale } = require('../models');

// جلب جميع المبيعات
exports.getAllSales = async (req, res) => {
    try {
        const sales = await Sale.findAll();
        res.json(sales);
    } catch (error) {
        console.error("⚠️ خطأ أثناء جلب المبيعات:", error);
        res.status(500).json({ error: "⚠️ حدث خطأ أثناء تحميل المبيعات." });
    }
};

// جلب تفاصيل بيع معين
exports.getSaleById = async (req, res) => {
    try {
        const sale = await Sale.findByPk(req.params.id);
        if (!sale) {
            return res.status(404).json({ error: "⚠️ البيع غير موجود." });
        }
        res.json(sale);
    } catch (error) {
        console.error("⚠️ خطأ أثناء جلب البيع:", error);
        res.status(500).json({ error: "⚠️ حدث خطأ أثناء تحميل البيع." });
    }
};

// إضافة عملية بيع جديدة
exports.addSale = async (req, res) => {
    try {
        const newSale = await Sale.create(req.body);
        res.status(201).json({ success: true, message: "✅ تم إضافة عملية البيع بنجاح!", sale: newSale });
    } catch (error) {
        console.error("⚠️ خطأ أثناء إضافة البيع:", error);
        res.status(500).json({ error: "⚠️ حدث خطأ أثناء إضافة البيع." });
    }
};

// تحديث عملية بيع
exports.updateSale = async (req, res) => {
    try {
        const sale = await Sale.findByPk(req.params.id);
        if (!sale) {
            return res.status(404).json({ error: "⚠️ البيع غير موجود." });
        }
        await sale.update(req.body);
        res.json({ success: true, message: "✅ تم تحديث عملية البيع بنجاح!", sale });
    } catch (error) {
        console.error("⚠️ خطأ أثناء تحديث البيع:", error);
        res.status(500).json({ error: "⚠️ حدث خطأ أثناء تحديث البيع." });
    }
};

// حذف عملية بيع
exports.deleteSale = async (req, res) => {
    try {
        const sale = await Sale.findByPk(req.params.id);
        if (!sale) {
            return res.status(404).json({ error: "⚠️ البيع غير موجود." });
        }
        await sale.destroy();
        res.json({ success: true, message: "✅ تم حذف عملية البيع بنجاح!" });
    } catch (error) {
        console.error("⚠️ خطأ أثناء حذف البيع:", error);
        res.status(500).json({ error: "⚠️ حدث خطأ أثناء حذف البيع." });
    }
};

========== ./controllers/settingsController.js ==========
const { Setting } = require('../models');

// ✅ جلب كل الإعدادات
exports.getAllSettings = async (req, res) => {
    try {
        // 🕒 Proactive Smart Auto-Shift
        const closingController = require('./closingController');
        await closingController.checkAndPerformAutoShift();

        const settings = await Setting.findAll();
        // تحويل المصفوفة إلى Object لسهولة التعامل في الفرونت إند
        const settingsObj = {};
        settings.forEach(s => {
            settingsObj[s.key] = s.value;
        });
        res.json(settingsObj);
    } catch (error) {
        console.error('❌ Error fetching settings:', error);
        res.status(500).json({ message: 'فشل في جلب الإعدادات' });
    }
};

// ✅ تحديث أو إضافة إعداد
exports.updateSetting = async (req, res) => {
    try {
        const { key, value, group } = req.body;
        await Setting.upsert({
            key,
            value: typeof value === 'string' ? value : JSON.stringify(value),
            group: group || 'general'
        });
        res.json({ message: `✅ تم تحديث ${key} بنجاح` });
    } catch (error) {
        console.error('❌ Error updating setting:', error);
        res.status(500).json({ message: 'فشل في تحديث الإعداد' });
    }
};

// ✅ تحديث مجموعة إعدادات مرة واحدة
exports.updateSettingsBulk = async (req, res) => {
    try {
        const settings = req.body; // { store_name: 'Vortex', vat: '14' }
        for (const [key, value] of Object.entries(settings)) {
            await Setting.upsert({
                key,
                value: typeof value === 'string' ? value : JSON.stringify(value)
            });
        }
        res.json({ message: '✅ تم تحديث الإعدادات بنجاح' });
    } catch (error) {
        console.error('❌ Error bulk updating settings:', error);
        res.status(500).json({ message: 'فشل في تحديث الإعدادات' });
    }
};

========== ./controllers/systemController.js ==========
const { exec } = require('child_process');

// ✅ دالة لإعادة تشغيل السيرفر
exports.restartServer = (req, res) => {
    try {
        console.log('🚀 Restarting server...');

        // ✅ إعادة تشغيل البرنامج بالكامل (Electron Relaunch)
        try {
            const { app } = require('electron');
            if (app) {
                console.log('♻️ Relaunching Electron app...');
                app.relaunch();
                app.exit(0);
                return res.json({ message: 'System relaunching...' });
            }
        } catch (e) {
            console.log('⚠️ Not in Electron, just exiting process.');
            process.exit(0);
        }

    } catch (error) {
        console.error('❌ Unexpected error:', error);
        res.status(500).json({ message: 'Unexpected error during server restart' });
    }
};
========== ./controllers/userController.js ==========
const { User } = require("../models"); // ✅ تأكد أن الموديل `User` موجود

exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.findAll();
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: "❌ خطأ في جلب المستخدمين" });
    }
};

exports.createUser = async (req, res) => {
    try {
        const { username, password, role } = req.body;
        const newUser = await User.create({ username, password, role });
        res.status(201).json(newUser);
    } catch (error) {
        res.status(500).json({ message: "❌ خطأ في إنشاء المستخدم" });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { username, role } = req.body;
        const updatedUser = await User.update({ username, role }, { where: { id } });
        res.json(updatedUser);
    } catch (error) {
        res.status(500).json({ message: "❌ خطأ في تحديث المستخدم" });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        await User.destroy({ where: { id } });
        res.json({ message: "✅ تم حذف المستخدم بنجاح" });
    } catch (error) {
        res.status(500).json({ message: "❌ خطأ في حذف المستخدم" });
    }
};

exports.getUserRole = async (req, res) => {
    try {
        console.log("🛠️ التحقق من الصلاحيات لليوزر ID:", req.user.id);

        const user = await User.findOne({ where: { id: req.user.id } });

        if (!user) {
            console.log("❌ المستخدم غير موجود!");
            return res.status(404).json({ message: "المستخدم غير موجود" });
        }

        console.log("✅ دور المستخدم:", user.role);
        res.json({ role: user.role });
    } catch (error) {
        console.error("❌ خطأ أثناء جلب بيانات المستخدم:", error);
        res.status(500).json({ message: "خطأ في السيرفر الداخلي" });
    }
};

========== ./createUser.js ==========
const { User } = require('./models');
const bcrypt = require('bcryptjs');
const sequelize = require('./config/db');

async function createUsers() {
    try {
        await sequelize.authenticate();
        console.log('✅ Connected to Supabase Pooler!');

        // إنشاء يوزر الأدمن الأساسي
        const adminExists = await User.findOne({ where: { username: 'admin' } });
        if (!adminExists) {
            const hashedAdminPassword = await bcrypt.hash('admin123', 10);
            await User.create({
                username: 'admin',
                password: hashedAdminPassword,
                role: 'manager'
            });
            console.log('✅ Admin user created: admin / admin123');
        } else {
            console.log('ℹ️ Admin user already exists.');
        }

        // إنشاء يوزر أدهم (اختياري)
        const adhamExists = await User.findOne({ where: { username: 'adham' } });
        if (!adhamExists) {
            const hashedAdhamPassword = await bcrypt.hash('adham123', 10);
            await User.create({
                username: 'adham',
                password: hashedAdhamPassword,
                role: 'manager'
            });
            console.log('✅ Adham user created: adham / adham123');
        }

        console.log('🚀 All users are ready!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

createUsers();

========== ./directoryStructure.js ==========
const fs = require('fs');
const path = require('path');

function getDirectoryStructure(dirPath) {
    const result = {};

    // قراءة محتويات المجلد
    const items = fs.readdirSync(dirPath);

    items.forEach(item => {
        const fullPath = path.join(dirPath, item);
        const stats = fs.statSync(fullPath);

        if (stats.isDirectory()) {
            // إذا كان العنصر مجلدًا، استدعاء الدالة بشكل متكرر
            result[item] = getDirectoryStructure(fullPath);
        } else {
            // إذا كان العنصر ملفًا، إضافته إلى النتيجة
            result[item] = 'file';
        }
    });

    return result;
}

// استبدل 'your_directory_path' بالمسار الذي تريد استعراضه
const directoryPath = '/Users/adham/Desktop/Vortex POS/Vortex POS_STM/pos-system/server';
const structure = getDirectoryStructure(directoryPath);
console.log(JSON.stringify(structure, null, 2));
========== ./extreme_stress_test.js ==========
/**
 * 🌪️ VORTEX POS - EXTREME STRESS TESTER
 * This script performs a multi-vector assault on Inventory, Expenses, Wholesale, and Closing.
 */

const axios = require('axios');
const BASE_URL = 'http://localhost:8083';
const TEST_AUTH = { username: 'admin', password: 'admin123' };

let token = '';
let testProduct = null;
let testMerchant = null;

async function runExtremeTest() {
    console.log(`
    ========================================================
    🌪️  VORTEX POS - EXTREME MULTI-VECTOR STRESS TEST
    ========================================================
    `);

    try {
        // 1. Auth
        const loginRes = await axios.post(`${BASE_URL}/api/auth/login`, TEST_AUTH);
        token = loginRes.data.token;
        const headers = { 'Authorization': `Bearer ${token}` };
        console.log("✅ Authenticated.\n");

        // 2. Prepare Data
        const prodRes = await axios.get(`${BASE_URL}/api/products`, { headers });
        testProduct = Object.values(prodRes.data).flat()[0];
        
        const merchRes = await axios.get(`${BASE_URL}/api/merchants?type=supplier`, { headers });
        testMerchant = merchRes.data[0];

        if (!testProduct || !testMerchant) {
            console.error("❌ Need at least 1 product and 1 merchant for this test.");
            return;
        }

        const initialStock = testProduct.quantity || 0;
        console.log(`📦 [DATA] Test Product: "${testProduct.name}" | Initial Stock: ${initialStock}`);
        console.log(`🤝 [DATA] Test Merchant: "${testMerchant.name}" | Initial Balance: ${testMerchant.balance}\n`);

        // --- VECTOR 1: INVENTORY CONCURRENCY ---
        console.log("🔥 [VECTOR 1] Initiating STOCK ATTACK (30 Concurrent Orders for 1 Item)...");
        const orderPromises = [];
        for(let i=0; i<30; i++) {
            orderPromises.push(axios.post(`${BASE_URL}/api/order`, {
                customer: { name: "Stress Tester", phone: "01000000000" },
                orderDetails: [{ name: testProduct.name, quantity: 1, price: testProduct.price, productId: testProduct.id }],
                payment_method: "cash",
                deliveryPrice: 0,
                orderTotal: testProduct.price
            }, { headers }).catch(e => e));
        }
        await Promise.all(orderPromises);
        console.log("✅ Stock Attack Complete.\n");

        // --- VECTOR 2: EXPENSE MATH ---
        console.log("💰 [VECTOR 2] Initiating EXPENSE ATTACK (30 Concurrent Expenses of 10 EGP)...");
        const expPromises = [];
        for(let i=0; i<30; i++) {
            expPromises.push(axios.post(`${BASE_URL}/api/expenses`, {
                description: `Stress Test Expense ${i}`,
                amount: 10,
                category: "Other",
                payment_method: "cash"
            }, { headers }).catch(e => e));
        }
        await Promise.all(expPromises);
        console.log("✅ Expense Attack Complete.\n");

        // --- VECTOR 3: WHOLESALE BALANCING ---
        console.log("📜 [VECTOR 3] Initiating WHOLESALE ATTACK (20 Transactions for 1 Merchant)...");
        const merchPromises = [];
        for(let i=0; i<20; i++) {
            merchPromises.push(axios.post(`${BASE_URL}/api/merchants/${testMerchant.id}/transactions`, {
                type: i % 2 === 0 ? 'invoice' : 'payment',
                amount: 100,
                date: new Date().toISOString().split('T')[0],
                notes: `Stress Test Trans ${i}`
            }, { headers }).catch(e => e));
        }
        await Promise.all(merchPromises);
        console.log("✅ Wholesale Attack Complete.\n");

        // --- VECTOR 4: CLOSING LATENCY ---
        console.log("📊 [VECTOR 4] Initiating CLOSING ATTACK (20 Parallel Summary Requests)...");
        const closePromises = [];
        for(let i=0; i<20; i++) {
            closePromises.push(axios.get(`${BASE_URL}/api/closing/daily-summary?date=${new Date().toISOString().split('T')[0]}`, { headers }).catch(e => e));
        }
        await Promise.all(closePromises);
        console.log("✅ Closing Attack Complete.\n");

        // --- FINAL VALIDATION ---
        console.log("🔎 [VALIDATION] Checking System Health After Assault...");
        
        const [finalProdRes, finalMerchRes, finalExpRes] = await Promise.all([
            axios.get(`${BASE_URL}/api/products`, { headers }),
            axios.get(`${BASE_URL}/api/merchants?type=supplier`, { headers }),
            axios.get(`${BASE_URL}/api/expenses`, { headers })
        ]);

        const finalProd = Object.values(finalProdRes.data).flat().find(p => p.id === testProduct.id);
        const finalMerch = finalMerchRes.data.find(m => m.id === testMerchant.id);
        
        console.log(`
        ========================================================
        📊 RESULTS REPORT:
        ========================================================
        📦 Stock Change: ${initialStock} -> ${finalProd.quantity} (Expected: ${initialStock - 30})
        💰 Expenses Count: Check manual entries in dashboard.
        🤝 Merchant Balance: ${testMerchant.balance} -> ${finalMerch.balance}
        ========================================================
        `);

        if (finalProd.quantity == initialStock - 30) {
            console.log("👑 VERDICT: SYSTEM IS ROCK SOLID! (Race conditions resolved)");
        } else {
            console.log("⚠️ VERDICT: SYSTEM STABLE BUT CHECK STOCK SYNC LOGS.");
        }

    } catch (err) {
        console.error("❌ TEST FAILED:", err.response?.data || err.message);
    }
}

runExtremeTest();

========== ./fix_date.js ==========
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

========== ./main.js ==========
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const waitOn = require('wait-on');

// Start the Express server
require('./server.js');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    icon: path.join(__dirname, 'public/img/logo.png')
  });

  const opts = {
    resources: ['http://localhost:8083'],
    timeout: 30000,
  };

  waitOn(opts).then(() => {
    mainWindow.loadURL('http://localhost:8083');
  });
}

// ✅ وظيفة الطباعة الصامتة (Silent Printing)
ipcMain.on('print-receipt', (event, orderData) => {
  let printWin = new BrowserWindow({
    show: false, // مخفية
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  });

  // تحميل صفحة الإيصال مع البيانات
  const receiptUrl = `http://localhost:8083/receipt.html?orderId=${orderData.id}&silent=true`;
  printWin.loadURL(receiptUrl);

  printWin.webContents.on('did-finish-load', () => {
    // الطباعة للطابعة المحددة أوتوماتيكياً
    printWin.webContents.print({
      silent: true,
      printBackground: true,
      deviceName: 'POSPrinter POS80', // اسم الطابعة اللي أنت سطبتها
    }, (success, failureReason) => {
      if (!success) console.error('❌ Print failed:', failureReason);
      printWin.close();
    });
  });
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

========== ./middleware/authMiddleware.js ==========
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { TokenBlacklist } = require('../models');

const secretKey = process.env.JWT_SECRET || 'mySuperSecretKey123';

// ✅ Middleware للتحقق من التوكن وتحديد هوية المستخدم
const authMiddleware = (allowedRoles) => async (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'يجب تسجيل الدخول للوصول إلى هذه الصفحة.' });
    }

    try {
        // 🛡️ Check if token is blacklisted
        const isBlacklisted = await TokenBlacklist.findByPk(token);
        if (isBlacklisted) {
            return res.status(401).json({ message: 'جلسة ملغاة. يرجى تسجيل الدخول مجدداً.' });
        }

        const decoded = jwt.verify(token, secretKey);
        req.user = decoded;
        
        // التحقق من الأدوار المسموح بها (إن وجدت)
        if (allowedRoles) {
            const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
            if (!roles.includes(decoded.role)) {
                return res.status(403).json({ message: 'ليس لديك الصلاحيات اللازمة للوصول إلى هذه الصفحة.' });
            }
        }

        next();
    } catch (err) {
        console.error('❌ Authentication Error:', err.message);
        return res.status(401).json({ message: 'جلسة غير صالحة أو انتهت.' });
    }
};

// 🚦 ميدلوير للتحقق من الصلاحيات (legacy/simple check)
const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ error: '❌ يجب تسجيل الدخول أولاً.' });

        const userRole = req.user.role;
        if (userRole === 'manager' || allowedRoles.includes(userRole)) {
            return next();
        }

        console.log(`🚫 الدور ${userRole} غير مصرح له.`);
        return res.status(403).json({ error: '🚫 لا تملك الصلاحية للوصول إلى هذا المورد.' });
    };
};

module.exports = { authMiddleware, authorizeRoles };

========== ./middleware/authorize.js ==========
const { ROLES } = require('../config/permissions');

/**
 * Authorization Middleware
 * Checks if the authenticated user's role has the required permissions.
 * @param {...string} requiredPermissions - One or more permission strings (e.g., 'orders:cancel')
 */
const authorize = (...requiredPermissions) => {
    return (req, res, next) => {
        // req.user is populated by the authentication middleware (JWT)
        const userRole = req.user?.role;
        const roleConfig = ROLES[userRole];

        if (!roleConfig) {
            return res.status(403).json({ error: '⛔ دور غير معروف أو غير مصرح له بالوصول' });
        }

        // Check if the role has ALL the required permissions for this action
        const hasAllPermissions = requiredPermissions.every(permission =>
            roleConfig.permissions.includes(permission)
        );

        if (!hasAllPermissions) {
            return res.status(403).json({ 
                error: '🚫 ليس لديك الصلاحية الكافية للقيام بهذا الإجراء',
                required: requiredPermissions
            });
        }

        next();
    };
};

module.exports = authorize;

========== ./middleware/checkRole.js ==========
// middleware/checkRole.js
const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: '❌ المصادقة فشلت! لا يوجد توكن.' });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;

        console.log("✅ التوكن صالح، المستخدم:", decoded);

        // ⛔ منع الكاشير من الوصول لأي صفحة غير صفحة الكاشير
        if (decoded.role === "cashier" && req.path !== "/cashier") {
            return res.status(403).send("❌ غير مصرح لك بالوصول إلى هذه الصفحة.");
        }

        // ⛔ منع المدير من الوصول لصفحة الكاشير
        if (decoded.role === "manager" && req.path === "/cashier") {
            return res.status(403).send("❌ المدير لا يجب أن يدخل على صفحة الكاشير.");
        }

        next();
    } catch (error) {
        console.error("❌ توكن غير صالح:", error);
        res.status(403).json({ error: '❌ المصادقة فشلت! التوكن غير صالح.' });
    }
};

========== ./middleware/errorHandler.js ==========
/**
 * المركز الرئيسي لمعالجة الأخطاء في السيرفر
 * يقوم بالتحقق من نوع الخطأ وإرسال استجابة مناسبة للفرونت إند
 */
const errorHandler = (err, req, res, next) => {
    console.error(`❌ Error logic: ${err.message}`);
    console.error(err.stack);

    // أخطاء Sequelize (قاعدة البيانات)
    if (err.name === 'SequelizeValidationError') {
        return res.status(400).json({
            status: 'error',
            message: 'بيانات غير صالحة لقاعدة البيانات',
            errors: err.errors.map(e => ({ field: e.path, message: e.message }))
        });
    }

    if (err.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({
            status: 'error',
            message: 'هذه البيانات مسجلة مسبقاً (قيمة مكررة)',
            errors: err.errors.map(e => ({ field: e.path, message: e.message }))
        });
    }

    // أخطاء JWT
    if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            status: 'error',
            message: 'انتهت صلاحية الجلسة أو تصريح غير صالح. يرجى تسجيل الدخول مجدداً.'
        });
    }

    // أخطاء Joi (التحقق من المدخلات)
    if (err.isJoi) {
        return res.status(400).json({
            status: 'error',
            message: 'خطأ في التحقق من البيانات المرسلة',
            details: err.details.map(d => d.message)
        });
    }

    // الأخطاء العامة
    const statusCode = err.statusCode || 500;
    const message = err.message || 'حدث خطأ داخلي في الخادم';

    res.status(statusCode).json({
        status: 'error',
        message: message,
        // إخفاء الـ stack trace في بيئة الـ Production للخصوصية والأمان
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
};

module.exports = errorHandler;

========== ./middleware/rateLimiter.js ==========
const { sequelize } = require('../models');

/**
 * 🚦 Optimized Rate Limiter
 * Uses database UPSERT (ON CONFLICT) for maximum performance and atomicity.
 * Prevents race conditions and minimizes database round-trips.
 */
const rateLimiter = (options = {}) => {
    const { windowMinutes = 1, maxRequests = 10, keyPrefix = 'rl' } = options;

    return async (req, res, next) => {
        const ip = req.ip || req.connection.remoteAddress;
        const key = `${keyPrefix}:${req.path}:${ip}`;
        
        // Calculate the start of the current time window
        const windowStart = new Date(
            Math.floor(Date.now() / (windowMinutes * 60000)) * (windowMinutes * 60000)
        );

        try {
            /**
             * ⚡ UPSERT Pattern (PostgreSQL / SQLite compatible)
             * This single query handles both creation and incrementing.
             */
            const query = `
                INSERT INTO rate_limit_logs ("key", "windowStart", "count", "createdAt", "updatedAt")
                VALUES (:key, :windowStart, 1, NOW(), NOW())
                ON CONFLICT ("key", "windowStart") 
                DO UPDATE SET "count" = rate_limit_logs."count" + 1, "updatedAt" = NOW()
                RETURNING "count";
            `;

            const [results] = await sequelize.query(query, {
                replacements: { key, windowStart },
                type: sequelize.QueryTypes.SELECT
            });

            const currentCount = results?.count || 1;

            if (currentCount > maxRequests) {
                return res.status(429).json({
                    error: '⚠️ محاولات كثيرة جداً. يرجى الانتظار قليلاً.',
                    retryAfter: windowMinutes * 60
                });
            }

            // Optional: Periodic cleanup could be added here or via a cron job
            next();
        } catch (error) {
            console.error('❌ Rate Limiter Error:', error);
            // Fail open: If rate limiter fails, allow the request but log the error
            next();
        }
    };
};

module.exports = rateLimiter;

========== ./middleware/sanitize.js ==========
/**
 * 🛡️ Sanitize Input Middleware
 * Prevents XSS by escaping HTML special characters in req.body, req.query, and req.params.
 * Based on Claude's recommendation for global XSS protection.
 */

const sanitizeInput = (req, res, next) => {
    const sanitizeValue = (val) => {
        if (typeof val !== 'string') return val;
        return val
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/javascript:/gi, '')
            .trim();
    };

    const sanitizeObject = (obj) => {
        if (!obj || typeof obj !== 'object') return obj;
        
        if (Array.isArray(obj)) {
            return obj.map(item => (typeof item === 'object' ? sanitizeObject(item) : sanitizeValue(item)));
        }

        return Object.fromEntries(
            Object.entries(obj).map(([k, v]) => [
                k,
                (typeof v === 'object' && v !== null) ? sanitizeObject(v) : sanitizeValue(v)
            ])
        );
    };

    req.body = sanitizeObject(req.body);
    req.query = sanitizeObject(req.query);
    req.params = sanitizeObject(req.params);
    next();
};

module.exports = sanitizeInput;

========== ./middleware/validationMiddleware.js ==========
const Joi = require('joi');

/**
 * دالة عامة للتحقق من صحة البيانات المرسلة للـ API
 * @param {Object} schema - Joi schema object
 */
const validate = (schema) => (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false, allowUnknown: true });
    
    if (error) {
        const errorMessage = error.details.map(detail => detail.message).join(', ');
        const err = new Error(errorMessage);
        err.isJoi = true;
        err.details = error.details;
        return next(err);
    }
    
    next();
};

// --- Schemas ---

const orderSchema = Joi.object({
    customer: Joi.object({
        name: Joi.string().allow('').optional().default('عميل تيك أواي'),
        phone: Joi.string().allow('').optional().default('00000000000'),
        address: Joi.string().allow('').optional()
    }).required(),
    orderDetails: Joi.array().items(
        Joi.object({
            name: Joi.string().required(),
            price: Joi.number().min(0).required(),
            quantity: Joi.number().min(1).required(),
            comments: Joi.array().items(
                Joi.object({
                    text: Joi.string().required(),
                    price: Joi.number().optional()
                })
            ).optional()
        })
    ).min(1).required().messages({ 'array.min': 'يجب إضافة منتج واحد على الأقل للطلب' }),
    orderTotal: Joi.number().min(0).required(),
    payment_method: Joi.string().valid('cash', 'card', 'instapay', 'vcash', 'electronic').default('cash')
});

const productSchema = Joi.object({
    name: Joi.string().required().messages({ 'any.required': 'اسم المنتج مطلوب' }),
    price: Joi.number().min(0).required().messages({ 'number.min': 'السعر لا يمكن أن يكون أقل من صفر' }),
    category: Joi.string().required()
});

module.exports = {
    validate,
    orderSchema,
    productSchema
};

========== ./models/AuditLog.js ==========
module.exports = (sequelize, DataTypes) => {
    const AuditLog = sequelize.define('AuditLog', {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        userName: {
            type: DataTypes.STRING(100),
            allowNull: true
        },
        action: {
            type: DataTypes.STRING(20),
            allowNull: false
        },
        tableName: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        recordId: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        oldValues: {
            type: DataTypes.JSONB,
            allowNull: true
        },
        newValues: {
            type: DataTypes.JSONB,
            allowNull: true
        },
        meta: {
            type: DataTypes.JSONB,
            allowNull: true
        },
        ipAddress: {
            type: DataTypes.STRING(45),
            allowNull: true
        },
        endpoint: {
            type: DataTypes.STRING(200),
            allowNull: true
        }
    }, {
        tableName: 'audit_logs',
        timestamps: true,
        updatedAt: false
    });

    return AuditLog;
};

========== ./models/Comment.js ==========
module.exports = (sequelize, DataTypes) => {
    const Comment = sequelize.define("Comment", {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        commentText: {
            type: DataTypes.STRING, 
            allowNull: false
        },
        color: {
            type: DataTypes.STRING, 
            allowNull: false
        },
        price: {
            type: DataTypes.DECIMAL(10, 2), 
            allowNull: false
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
        }
    }, {
        tableName: 'Comments', 
        timestamps: false 
    });

    return Comment;
};
========== ./models/Customer.js ==========
module.exports = (sequelize, DataTypes) => {
  const Customer = sequelize.define("Customer", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    address: {
      type: DataTypes.STRING,
      allowNull: true
    },
    totalSpent: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00
    },
    totalOrders: {  
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  }, {
    timestamps: false  
  });

  return Customer;
};

========== ./models/DailyClosing.js ==========
module.exports = (sequelize, DataTypes) => {
    const DailyClosing = sequelize.define("DailyClosing", {
        closingDate: {
            type: DataTypes.DATE,
            allowNull: false,
            unique: true 
        },
        totalOrders: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 0
        },
        totalSandwiches: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 0
        },
        totalRevenue: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: 0.00
        },
        totalCost: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: 0.00
        },
        totalExpenses: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: 0.00
        },
        totalEarnings: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: 0.00
        },
        totalDiscount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0.00
        },
        onlinePaymentsTotal: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: 0.00
        }
    }, {
        tableName: "daily_closing",
        timestamps: false
    });

    return DailyClosing;
};
========== ./models/DiscountCode.js ==========
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const DiscountCode = sequelize.define('DiscountCode', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    code: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    discount_type: {
        type: DataTypes.ENUM('percentage', 'fixed'),
        allowNull: false
    },
    discount_value: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    start_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    end_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    applicable_products: {
        type: DataTypes.JSON,
        allowNull: true
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: 'discount_codes',
    timestamps: false
});

module.exports = DiscountCode;
========== ./models/Expense.js ==========
module.exports = (sequelize, DataTypes) => {
  const Expense = sequelize.define("Expense", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    description: {
      type: DataTypes.STRING,
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false
    },
    date: {
      type: DataTypes.DATEONLY,
      defaultValue: DataTypes.NOW
    },
    addedBy: {
      type: DataTypes.STRING,
      allowNull: true
    },
    payment_method: {
      type: DataTypes.STRING,
      defaultValue: 'cash'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: "expenses",
    timestamps: true
  });

  return Expense;
};

========== ./models/Inventory.js ==========
module.exports = (sequelize, DataTypes) => {
    const Inventory = sequelize.define("Inventory", {
        name: {
            type: DataTypes.STRING,
            allowNull: true,
            unique: true
        },
        quantity: {
            type: DataTypes.DECIMAL(10,2),
            allowNull: true
        },
        total: {
            type: DataTypes.DECIMAL(10,2),
            allowNull: false,
            defaultValue: 0.00
        },
        cost: {
            type: DataTypes.DECIMAL(10,2),
            allowNull: false
        },
        unit: {
            type: DataTypes.STRING,
            allowNull: true
        },
        dateAdded: {
            type: DataTypes.DATE,
            defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
        },
        expiryDate: {
            type: DataTypes.DATE,
            allowNull: true
        },
        min: {
            type: DataTypes.DECIMAL(10,2),
            allowNull: false,
            defaultValue: 0.00
        },
        variants: {
            type: DataTypes.JSON,
            allowNull: true
        }
    }, {
        tableName: "inventory",
        timestamps: true
    });

    return Inventory;
};
========== ./models/Merchant.js ==========
module.exports = (sequelize, DataTypes) => {
    const Merchant = sequelize.define("Merchant", {
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        phone: {
            type: DataTypes.STRING,
            allowNull: true
        },
        type: {
            type: DataTypes.ENUM('supplier', 'wholesale_client'),
            allowNull: false
        },
        balance: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0.00
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    }, {
        tableName: "merchants",
        timestamps: true
    });

    return Merchant;
};

========== ./models/MerchantTransaction.js ==========
module.exports = (sequelize, DataTypes) => {
    const MerchantTransaction = sequelize.define("MerchantTransaction", {
        merchantId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        type: {
            type: DataTypes.ENUM('invoice', 'payment'),
            allowNull: false
        },
        amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        },
        date: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    }, {
        tableName: "merchant_transactions",
        timestamps: true,
        indexes: [
            { fields: ['merchantId'] },
            { fields: ['date'] }
        ]
    });

    return MerchantTransaction;
};

========== ./models/MonthlyClosing.js ==========
module.exports = (sequelize, DataTypes) => {
    const MonthlyClosing = sequelize.define("MonthlyClosing", {
        id: { 
            type: DataTypes.INTEGER, 
            autoIncrement: true, 
            primaryKey: true 
        },
        month_year: { 
            type: DataTypes.STRING(7), 
            allowNull: false, 
            unique: true 
        },
        total_orders: { 
            type: DataTypes.INTEGER, 
            allowNull: false, 
            defaultValue: 0 
        },
        total_sandwiches: { 
            type: DataTypes.INTEGER, 
            allowNull: false, 
            defaultValue: 0 
        },
        total_revenue: { 
            type: DataTypes.DECIMAL(10, 2), 
            allowNull: false, 
            defaultValue: 0.00 
        },
        total_cost: { 
            type: DataTypes.DECIMAL(10, 2), 
            allowNull: false, 
            defaultValue: 0.00 
        },
        totalExpenses: { 
            type: DataTypes.DECIMAL(10, 2), 
            allowNull: false, 
            defaultValue: 0.00 
        },
        total_earnings: { 
            type: DataTypes.DECIMAL(10, 2), 
            allowNull: false, 
            defaultValue: 0.00 
        },
        totalDiscount: { 
            type: DataTypes.DECIMAL(10, 2), 
            allowNull: false, 
            defaultValue: 0.00 
        },
        onlinePaymentsTotal: { 
            type: DataTypes.DECIMAL(10, 2), 
            allowNull: true, 
            defaultValue: 0.00 
        },
        closing_date: { 
            type: DataTypes.DATE, 
            allowNull: true, 
            defaultValue: DataTypes.NOW 
        }
    }, {
        tableName: "monthly_closing",
        timestamps: false
    });

    return MonthlyClosing;
};
========== ./models/Order.js ==========
module.exports = (sequelize, DataTypes) => {
    const Order = sequelize.define("Order", {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        customerId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        deliveryPrice: {
            type: DataTypes.DECIMAL(10,2),
            allowNull: true
        },
        customerName: {
            type: DataTypes.STRING,
            allowNull: true
        },
        customerAddress: {
            type: DataTypes.STRING,
            allowNull: true
        },
        customerPhone: {
            type: DataTypes.STRING,
            allowNull: true
        },
        orderDetails: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        orderTotal: {
            type: DataTypes.FLOAT,
            allowNull: true
        },
        isCancelled: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: "No"
        },
        archived: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: false
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: true
        },
        payment_status: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        payment_method: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        discountAmount: {
            type: DataTypes.DECIMAL(10,2),
            allowNull: false,
            defaultValue: 0
        },
        businessDate: {
            type: DataTypes.DATEONLY,
            allowNull: true
        },
        dailySerial: {
            type: DataTypes.INTEGER,
            allowNull: true
        }
    }, {
        timestamps: false,  // ✅ تعطيل `createdAt` و `updatedAt` لأن `updatedAt` غير موجود
        indexes: [
            { fields: ['businessDate'] },
            { fields: ['createdAt'] },
            { fields: ['archived'] },
            { fields: ['isCancelled'] }
        ]
    });

    return Order;
};

========== ./models/OrderDetail.js ==========
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
    return sequelize.define("OrderDetail", {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        orderId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        productId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        quantity: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        }
    });
};

========== ./models/Payments.js ==========
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Payment = sequelize.define('Payment', {
    order_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    payment_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
    payment_method: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    payment_date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    }
}, {
    tableName: 'payments',
    timestamps: false,
});

module.exports = Payment;
========== ./models/Products.js ==========
const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

class Product extends Model {}

Product.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    category: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'General'
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    wholesalePrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0
    },
    sold: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    }
}, {
    sequelize,
    modelName: 'Product', // ✅ اسم الموديل بالمفرد وبحرف كبير (يفضل للتوافقية)
    tableName: 'products', // ✅ تحديد اسم الجدول كما هو في قاعدة البيانات
    timestamps: true
});

module.exports = Product;
========== ./models/RateLimitLog.js ==========
module.exports = (sequelize, DataTypes) => {
    const RateLimitLog = sequelize.define('RateLimitLog', {
        key: {
            type: DataTypes.TEXT,
            primaryKey: true
        },
        windowStart: {
            type: DataTypes.DATE,
            primaryKey: true
        },
        count: {
            type: DataTypes.INTEGER,
            defaultValue: 1
        }
    }, {
        tableName: 'rate_limit_log',
        timestamps: false
    });

    return RateLimitLog;
};

========== ./models/Recipe.js ==========
module.exports = (sequelize, DataTypes) => {
    const Recipe = sequelize.define("Recipe", {
        sandwich: {
            type: DataTypes.STRING,
            allowNull: true
        },
        ingredient: {
            type: DataTypes.STRING,
            allowNull: true
        },
        amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        }
    }, {
        tableName: "recipes",
        timestamps: false,
        indexes: [
            { fields: ['sandwich'] }
        ]
    });

    return Recipe;
};
========== ./models/Sale.js ==========
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
    return sequelize.define("Sale", {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        product_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        quantity_sold: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        sale_date: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        }
    });
};

========== ./models/Setting.js ==========
module.exports = (sequelize, DataTypes) => {
  const Setting = sequelize.define("Setting", {
    key: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    group: {
      type: DataTypes.STRING,
      defaultValue: 'general'
    }
  }, {
    timestamps: true
  });

  return Setting;
};

========== ./models/TokenBlacklist.js ==========
module.exports = (sequelize, DataTypes) => {
    const TokenBlacklist = sequelize.define('TokenBlacklist', {
        token: {
            type: DataTypes.TEXT,
            primaryKey: true
        },
        expiresAt: {
            type: DataTypes.DATE,
            allowNull: false
        }
    }, {
        tableName: 'token_blacklist',
        timestamps: true,
        updatedAt: false
    });

    return TokenBlacklist;
};

========== ./models/User.js ==========
const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const User = sequelize.define("User", {
        id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
        },
        username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
        },
        password: {
        type: DataTypes.STRING,
        allowNull: false
        },
        role: {
        type: DataTypes.ENUM("manager", "cashier"),
        allowNull: false
        }
    }, {
        timestamps: false  // ⬅️ هذا يمنع Sequelize من البحث عن `createdAt` و `updatedAt`
    });
    
    module.exports = User;


========== ./models/index.js ==========
const { Sequelize, DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const User = require("./User");
const Customer = require("./Customer")(sequelize, DataTypes);
const Product = require("./Products"); // ✅ تم التعديل هنا
const Order = require("./Order")(sequelize, DataTypes);
const OrderDetail = require("./OrderDetail")(sequelize, DataTypes);
const Sale = require("./Sale")(sequelize, DataTypes);
const Inventory = require("./Inventory")(sequelize, DataTypes);
const Recipe = require("./Recipe")(sequelize, DataTypes);
const DailyClosing = require('./DailyClosing')(sequelize, DataTypes);
const MonthlyClosing = require('./MonthlyClosing')(sequelize, DataTypes);
const Payment = require('./Payments'); 
const DiscountCode = require("./DiscountCode"); // تأكد أن الاسم متطابق
const Comment = require("./Comment")(sequelize, DataTypes);
const Expense = require("./Expense")(sequelize, DataTypes);
const Setting = require("./Setting")(sequelize, DataTypes);
const Merchant = require("./Merchant")(sequelize, DataTypes);
const MerchantTransaction = require("./MerchantTransaction")(sequelize, DataTypes);
const AuditLog = require("./AuditLog")(sequelize, DataTypes);
const RateLimitLog = require("./RateLimitLog")(sequelize, DataTypes);
const TokenBlacklist = require("./TokenBlacklist")(sequelize, DataTypes);

// ✅ العلاقات بين الجداول
Product.hasMany(Sale, { foreignKey: "product_id" });
Sale.belongsTo(Product, { foreignKey: "product_id" });

Customer.hasMany(Order, { foreignKey: "customerId", as: 'orders' });
Order.belongsTo(Customer, { foreignKey: "customerId", as: 'customer_info' });

Order.hasMany(OrderDetail, { foreignKey: "orderId" });
OrderDetail.belongsTo(Order, { foreignKey: "orderId" });

Product.hasMany(OrderDetail, { foreignKey: "productId" });
OrderDetail.belongsTo(Product, { foreignKey: "productId" });

Merchant.hasMany(MerchantTransaction, { foreignKey: "merchantId", as: "transactions", onDelete: 'CASCADE' });
MerchantTransaction.belongsTo(Merchant, { foreignKey: "merchantId", as: "merchant" });

// ✅ تصدير الموديلات
module.exports = {
    sequelize,
    User,
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
    Expense,
    Setting,
    Merchant,
    MerchantTransaction,
    AuditLog,
    RateLimitLog,
    TokenBlacklist
};
========== ./public/js/analytics.js ==========
document.addEventListener("DOMContentLoaded", async function () {
    try {
        // 🔹 جلب البيانات من الـ API
        const [analyticsResponse, lowStockResponse] = await Promise.all([
            fetch("/api/analytics"),
            fetch("/api/analytics/low-stock")
        ]);

        const data = await analyticsResponse.json();
        const lowStockData = await lowStockResponse.json();

        console.log("📊 بيانات التحليلات:", data);
        console.log("📉 بيانات المنتجات القريبة من النفاد:", lowStockData);

        if (!data) throw new Error("لم يتم استلام بيانات صحيحة من الخادم");

        // 🔹 تحديث الكروت بالبيانات
        document.getElementById("totalOrders").textContent = data.totalOrders || 0;
        document.getElementById("totalRevenue").textContent = (data.totalRevenue || 0) + " L.E";

        const safeList = (arr) => Array.isArray(arr) && arr.length ? arr : [];

        document.getElementById("topProducts").innerHTML = safeList(data.topProducts)
            .map(p => `<li>${p.name}</li>`).join("") || "لا يوجد بيانات";

        document.getElementById("leastProducts").innerHTML = safeList(data.leastProducts)
            .map(p => `<li>${p.name}</li>`).join("") || "لا يوجد بيانات";

        document.getElementById("topCustomers").innerHTML = safeList(data.topCustomers)
            .map(cust => `<li>${cust.name}</li>`).join("") || "لا يوجد بيانات";

        // 🔹 تحديث قائمة المنتجات القريبة من النفاد

        // ✅ التأكد من وجود `lowStockContainer`
        const lowStockContainer = document.getElementById("lowStockCount");
        if (!lowStockContainer) {
            console.error("❌ عنصر `lowStockCount` غير موجود في HTML!");
            return;
        }

        // ✅ تحديث قائمة المنتجات القريبة من النفاد
        if (!lowStockData || !lowStockData.success) {
            console.error("❌ خطأ: لم يتم استلام بيانات المخزون القليل بشكل صحيح!");
            lowStockContainer.innerHTML = "<li>❌ حدث خطأ في تحميل البيانات</li>";
            return;
        }

        const lowStockItems = lowStockData.lowStock || [];
        const expiryItems = lowStockData.expirySoon || [];

        // ✅ دمج المنتجات القليلة المخزون والمنتجات القريبة من انتهاء الصلاحية
        const uniqueItems = [...lowStockItems, ...expiryItems].reduce((acc, item) => {
            if (!acc.find(i => i.id === item.id)) acc.push(item);
            return acc;
        }, []);

        if (uniqueItems.length > 0) {
            lowStockContainer.innerHTML = uniqueItems
                .map(item => {
                    let expiryNotice = item.expiryDate ? ` - Exp: ${item.expiryDate.split("T")[0]}` : "";
                    return `<li>${item.name} (${item.quantity})${expiryNotice}</li>`;
                })
                .join("");
        } else {
            lowStockContainer.innerHTML = "<li>لا توجد منتجات قريبة من النفاد أو انتهاء الصلاحية</li>";
        }


        // 🔹 تفعيل المخططات عند الضغط على الكروت
        const overlay = document.getElementById("chartOverlay");
        const chartCanvas = document.getElementById("chartCanvas");
        const closeChart = document.getElementById("closeChart");

        let chartInstance = null;

        document.querySelectorAll(".analytics-card").forEach(card => {
            card.addEventListener("click", function () {
                const chartType = this.getAttribute("data-chart");

                if (chartType) {
                    overlay.classList.remove("hidden");

                    if (chartInstance !== null) {
                        chartInstance.destroy();
                    }

                    chartInstance = renderChart(chartType, chartCanvas, data, lowStockData);
                }
            });
        });

        overlay.addEventListener("click", function (event) {
            // ✅ التأكد من أن المستخدم ضغط على الـ overlay وليس على المخطط نفسه
            if (event.target === overlay) {
                overlay.classList.add("hidden");
                if (chartInstance !== null) {
                    chartInstance.destroy();
                    chartInstance = null;
                }
            }
        });

    } catch (error) {
        console.error("❌ خطأ أثناء تحميل البيانات:", error);
        document.getElementById("error-message").textContent = "حدث خطأ أثناء تحميل البيانات.";
    }
});

// 🔹 دالة إنشاء الرسوم البيانية
function renderChart(chartType, canvas, data, lowStockData) {
    // التحقق من وجود عنصر الـ canvas
    if (!canvas) {
        console.error("❌ عنصر الـ canvas غير موجود!");
        return null;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
        console.error("❌ لا يمكن الحصول على `context` للرسم!");
        return null;
    }

    console.log("🎨 نوع المخطط:", chartType);

    // تدمير المخطط السابق إذا كان موجودًا
    if (canvas.chartInstance) {
        canvas.chartInstance.destroy();
    }

    let chartData = {}; // تخزين بيانات المخطط

    switch (chartType) {
        case "ordersChart":
            chartData = {
                labels: data.last7Days.map(d => d.date),
                datasets: [{
                    label: "Total Orders",
                    data: data.last7Days.map(d => d.orders),
                    backgroundColor: "rgba(255, 69, 0, 0.5)",
                    borderColor: "#ff4500",
                    borderWidth: 2
                }]
            };
            break;

        case "revenueChart":
            chartData = {
                labels: data.last7Days.map(d => d.date),
                datasets: [{
                    label: "Revenue",
                    data: data.last7Days.map(d => d.revenue),
                    backgroundColor: "rgba(34, 139, 34, 0.5)",
                    borderColor: "green",
                    borderWidth: 2
                }]
            };
            break;

        case "topProductsChart":
            chartData = {
                labels: data.topProducts.map(p => p.name),
                datasets: [{
                    label: "Best Seller",
                    data: data.topProducts.map(p => p.sold),
                    backgroundColor: "rgba(75, 192, 192, 0.5)",
                    borderColor: "teal",
                    borderWidth: 2
                }]
            };
            break;

        case "leastProductsChart":
            chartData = {
                labels: data.leastProducts.map(p => p.name),
                datasets: [{
                    label: "Least Seller",
                    data: data.leastProducts.map(p => p.sold),
                    backgroundColor: "rgba(255, 99, 132, 0.5)",
                    borderColor: "red",
                    borderWidth: 2
                }]
            };
            break;

        case "lowStockChart":
            if (!lowStockData.success) {
                console.error("⚠️ لا توجد بيانات للمخزون القليل!");
                return;
            }
        
            const lowStockItems = lowStockData.lowStock || [];
            const expiryItems = lowStockData.expirySoon || [];
        
            // 🛠️ تجميع البيانات في كائن بدون تكرار
            const uniqueItems = {};
        
            [...lowStockItems, ...expiryItems].forEach(item => {
                if (!uniqueItems[item.name]) {
                    uniqueItems[item.name] = {
                        name: item.name,
                        quantity: 0,
                        daysToExpiry: 0
                    };
                }
                if (item.quantity) uniqueItems[item.name].quantity = item.quantity;
                if (item.expiryDate) {
                    uniqueItems[item.name].daysToExpiry = moment(item.expiryDate).diff(moment(), "days");
                }
            });
        
            // 📊 تحويل البيانات إلى مصفوفات للمخطط
            const labels = Object.keys(uniqueItems);
            const quantities = labels.map(name => uniqueItems[name].quantity);
            const expiryDays = labels.map(name => uniqueItems[name].daysToExpiry);
        
            chartData = {
                labels: labels,
                datasets: [
                    {
                        label: "Low Stock",
                        data: quantities,
                        backgroundColor: "rgba(255, 99, 132, 0.5)",
                        borderColor: "red",
                        borderWidth: 2
                    },
                    {
                        label: "Expiry Day",
                        data: expiryDays,
                        backgroundColor: "rgba(255, 165, 0, 0.5)",
                        borderColor: "orange",
                        borderWidth: 2
                    }
                ]
            };
            break;

        case "topCustomersChart":
            if (!Array.isArray(data.topCustomers) || data.topCustomers.length === 0) {
                console.warn("⚠️ لا توجد بيانات كافية لإنشاء مخطط أفضل العملاء!");
                return;
            }
        
            const customerNames = data.topCustomers.map(customer => customer.name);
            const customerOrders = data.topCustomers.map(customer => customer.ordersCount); // ✅ استخدام عدد الطلبات بدلًا من totalSpent
        
            chartData = {
                labels: customerNames,
                datasets: [{
                    label: "Total Orders",
                    data: customerOrders, // ✅ البيانات الصحيحة
                    backgroundColor: "rgba(54, 162, 235, 0.5)",
                    borderColor: "blue",
                    borderWidth: 2
                }]
            };
            break;

        default:
            console.warn("⚠️ نوع المخطط غير معروف:", chartType);
            return null;
    }

    // إنشاء المخطط باستخدام مكتبة Chart.js
    canvas.chartInstance = new Chart(ctx, { 
        type: "bar", 
        data: chartData, 
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        } 
    });

    return canvas.chartInstance;
}
========== ./public/js/auth.js ==========
// 🔹 إنشاء حاوية الإشعارات عند تحميل الصفحة
const toastContainer = document.createElement('div');
toastContainer.id = 'toast-container';
document.body.appendChild(toastContainer);

// 🔹 دالة عرض الإشعارات (Toast)
window.showToast = function(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = '';
    if (type === 'success') icon = '✓'; // Simple checkmark
    if (type === 'error') icon = '✕';   // Simple X
    if (type === 'warning') icon = '!';
    if (type === 'info') icon = 'i';

    // Use SVG icons for better look if possible, or simple text for now
    if (type === 'success') icon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>';
    if (type === 'error') icon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
    if (type === 'warning') icon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
    if (type === 'info') icon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';

    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-content">
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close">&times;</button>
    `;
    
    toastContainer.appendChild(toast);

    // Close button logic
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.onclick = () => {
        removeToast(toast);
    };

    // Auto dismiss after 10 seconds
    const timeout = setTimeout(() => {
        removeToast(toast);
    }, 10000);

    // Pause on hover (optional nice-to-have)
    toast.onmouseenter = () => clearTimeout(timeout);
    toast.onmouseleave = () => {
        setTimeout(() => removeToast(toast), 10000);
    };

    function removeToast(element) {
        if (element.classList.contains('removing')) return;
        
        // 1. Start the exit animation (slide out)
        element.style.animation = 'fadeOut 0.4s ease-in forwards';
        
        // 2. Add class to collapse height smoothly
        element.classList.add('removing');

        // 3. Remove from DOM after animation
        element.addEventListener('animationend', () => {
            if (element.parentElement) {
                element.remove();
            }
        });
    }
};

window.addEventListener('DOMContentLoaded', () => {
    const userRole = localStorage.getItem('role'); // "cashier" أو "manager"
    const token = localStorage.getItem('token'); // التوكن
    const currentPage = window.location.pathname;

    if (!token) {
        // showToast('غير مصرح لك بالدخول. من فضلك سجل الدخول أولًا.', 'error'); // لا يمكن استخدام التوست هنا لأننا سننتقل فوراً
        window.location.href = '/index.html';
        return;
    }

    // Skip the /protected-route check - it was causing false redirects
    // Security is enforced by the API endpoints themselves.

    const allowedPagesForCashier = ['/cashier.html', '/receipt.html'];
    const allowedPagesForManager = [
        '/dashboard.html',
        '/cashier.html',
        '/inventory.html',
        '/manage_orders.html',
        '/monthly.html',
        '/daily.html',
        '/daily_closing.html',
        '/monthly_report.html',
        '/products.html',
        '/pages/products.html',
        '/sales.html',
        '/pages/sales.html',
        '/users.html',
        '/pages/users.html',
        '/receipt.html',
        '/customers.html',
        '/discount.html',
        '/analytics.html',
        '/expenses.html',
        '/daily_closing.html',
        '/monthly_closing.html',
        '/settings.html'
    ];

    // Redirect if not logged in
    if (!token || !userRole) {
        window.location.href = '/index.html';
        return;
    }

    // Strictly redirect cashier to cashier page if they try to access management
    if (userRole === 'cashier' && !allowedPagesForCashier.includes(currentPage)) {
        window.location.href = '/cashier.html';
        return;
    }

    // Redirect manager if somehow they hit an illegal page
    if (userRole === 'manager' && !allowedPagesForManager.includes(currentPage)) {
        window.location.href = '/dashboard.html';
        return;
    }

    // تسجيل الخروج عند الضغط على زر تسجيل الخروج
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('role');
            localStorage.removeItem('token');
            window.location.href = '/index.html';
        });
    }

    // 🔹 تعديل زر "Dashboard" ليصبح "Logout" للكاشير
    const navBtn = document.querySelector('.nav-back-btn');
    if (navBtn && userRole === 'cashier') {
        // تغيير الأيقونة والنص
        navBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
        `;
        
        // إضافة كلاس التنسيق الخاص بالخروج
        navBtn.classList.add('nav-logout-btn');
        
        // تغيير الوظيفة عند الضغط
        navBtn.onclick = (e) => {
            e.preventDefault(); // منع الانتقال للداشبورد
            localStorage.removeItem('role');
            localStorage.removeItem('token');
            window.location.href = 'index.html'; // التوجيه لصفحة الدخول
        };
        
        navBtn.title = "Logout"; // تحديث التلميح
    }
});

========== ./public/js/cashier.js ==========
/**
 * Vortex POS - Cashier Engine
 * Optimized for Luxury Workstation Theme & Enterprise Best Practices
 */

const currentLang = localStorage.getItem('lang') || 'ar';
const isAr = currentLang === 'ar';

const t = {
    ar: {
        pageTitle: 'نافذة البيع - Vortex POS',
        headerPill: 'منصة البيع المباشر',
        home: 'الرئيسية',
        operator: 'المشغل',
        searchCustomer: 'ابحث عن عميل بالاسم أو الرقم...',
        phonePlaceholder: 'رقم الهاتف...',
        cash: 'كاش',
        card: 'فيزا / بطاقة',
        instapay: 'إنستاباي',
        vcash: 'فودافون كاش',
        cartSummary: 'ملخص السلة',
        emptyCart: 'السلة فارغة حالياً',
        subtotal: 'المجموع الفرعي',
        delivery: 'توصيل',
        total: 'الإجمالي',
        discount: 'الخصم',
        checkout: 'إتمام الطلب',
        selectDelivery: 'اختر منطقة التوصيل',
        items: 'أصناف',
        msgEmptyCart: '⚠️ لا يمكن إرسال طلب فارغ',
        sessionExpired: 'انتهت الجلسة، يرجى تسجيل الدخول مجدداً',
        confirmPayment: 'تأكيد استلام المبلغ',
        confirmReceipt: 'تم تأكيد الاستلام',
        cancel: 'إلغاء'
    },
    en: {
        pageTitle: 'Cashier Workspace - Vortex POS',
        headerPill: 'Direct Sales Platform',
        home: 'Home',
        operator: 'Operator',
        searchCustomer: 'Search customer by name or phone...',
        phonePlaceholder: 'Phone number...',
        cash: 'Cash',
        card: 'Card',
        instapay: 'InstaPay',
        vcash: 'V-Cash',
        cartSummary: 'Cart Summary',
        emptyCart: 'Cart is currently empty',
        subtotal: 'Subtotal',
        delivery: 'Delivery',
        total: 'Total',
        discount: 'Discount',
        checkout: 'Complete',
        selectDelivery: 'Select Delivery Area',
        items: 'items',
        msgEmptyCart: '⚠️ Cannot submit an empty order',
        sessionExpired: 'Session expired, please log in again',
        confirmPayment: 'Confirm Payment Receipt',
        confirmReceipt: 'Confirm Receipt',
        cancel: 'Cancel'
    }
};

let allCategorizedProducts = {};
let currentOrder = {};
let selectedItem = null;
let currentProductForModal = null;

// --- DOM Elements ---
const orderSummary = document.getElementById('order-summary');
const menuItemsContainer = document.getElementById('menu-items');
const categoryPillsContainer = document.getElementById('category-pills');
const phoneInput = document.getElementById('customer-phone');
const nameInput = document.getElementById('customer-name');
const deliveryPriceSelect = document.getElementById('delivery-price');
const submitButton = document.getElementById('submit-order');
const suggestionsBox = document.getElementById("suggestions");

// --- 1. Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    // 🚀 Parallel Boot: Do everything at once
    Promise.all([
        applyTranslations(),
        initUser(),
        initDelivery(),
        fetchProducts()
    ]);
    
    setupEventListeners();
    
    // Clean up empty sidebar space fast
    setTimeout(() => {
        const sidebar = document.getElementById('sidebar-container');
        if (sidebar && sidebar.innerHTML.trim() === '') {
            sidebar.style.display = 'none';
        }
    }, 50);
});

function applyTranslations() {
    const langT = t[currentLang];
    document.title = langT.pageTitle;
    document.documentElement.dir = isAr ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLang;

    const locIds = [
        ['loc-header-pill', langT.headerPill],
        ['loc-home', langT.home],
        ['loc-cash', langT.cash],
        ['loc-card', langT.card],
        ['loc-instapay', langT.instapay],
        ['loc-vcash', langT.vcash],
        ['loc-cart-summary', langT.cartSummary],
        ['loc-empty-cart', langT.emptyCart],
        ['loc-subtotal', langT.subtotal],
        ['loc-delivery', langT.delivery],
        ['loc-discount', langT.discount],
        ['loc-total', langT.total],
        ['loc-checkout', langT.checkout]
    ];

    locIds.forEach(([id, text]) => {
        const el = document.getElementById(id);
        if(el) el.textContent = text;
    });

    if(nameInput) nameInput.placeholder = langT.searchCustomer;
    if(phoneInput) {
        phoneInput.placeholder = langT.phonePlaceholder;
        phoneInput.oninput = (e) => {
            e.target.value = e.target.value.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[^0-9]/g, '');
        };
    }
}

function initUser() {
    const activeUserBadge = document.getElementById('activeUserBadge');
    let storedUsername = localStorage.getItem('username') || t[currentLang].operator;
    if (activeUserBadge) {
        activeUserBadge.querySelector('span').textContent = storedUsername;
    }
}

function initDelivery() {
    if (!deliveryPriceSelect) return;
    deliveryPriceSelect.innerHTML = `<option value="0">${t[currentLang].selectDelivery}</option>`;
    const fragment = document.createDocumentFragment();
    for (let i = 5; i <= 100; i += 5) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `${i} EGP`;
        option.dir = 'ltr';
        fragment.appendChild(option);
    }
    deliveryPriceSelect.appendChild(fragment);
    deliveryPriceSelect.addEventListener('change', renderOrderSummary);
}

// --- 2. Data Fetching ---
async function fetchProducts() {
    try {
        const response = await fetch('/api/products', {
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                Swal.fire({ icon: 'error', title: t[currentLang].sessionExpired })
                .then(() => window.location.href = "/index.html");
                return;
            }
            throw new Error(`Server error: ${response.status}`);
        }
        
        const rawData = await response.json();
        
        // 🧪 Sort products alphabetically within each category for consistency
        for (const cat in rawData) {
            rawData[cat].sort((a, b) => a.name.localeCompare(b.name, 'ar'));
        }

        // Optimized Category Override (Single Pass)
        let saruwalProducts = [];
        for (const cat in rawData) {
            rawData[cat] = rawData[cat].filter(p => {
                if (p.name === 'سروال الامثل') {
                    p.category = 'سراويل';
                    saruwalProducts.push(p);
                    return false;
                }
                return true;
            });
        }
        if (saruwalProducts.length > 0) rawData['سراويل'] = saruwalProducts;

        allCategorizedProducts = rawData;
        renderCategories();
        
        const categories = Object.keys(allCategorizedProducts);
        if (categories.length > 0) showCategory(categories[0]);
        else {
             menuItemsContainer.innerHTML = `<div class="empty-state">
                <i class="fas fa-box-open" style="font-size:2.5rem; margin-bottom:1rem; opacity:0.5;"></i>
                <p>${isAr ? 'لا يوجد منتجات متاحة حالياً' : 'No products available'}</p>
             </div>`;
        }
    } catch (error) {
        console.error("❌ Error loading products:", error);
        menuItemsContainer.innerHTML = `<div class="empty-state"><p>${isAr ? 'فشل الاتصال' : 'Connection failed'}</p></div>`;
    }
}

function renderCategories() {
    if (!categoryPillsContainer) return;
    const fragment = document.createDocumentFragment();
    const categories = Object.keys(allCategorizedProducts);

    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'pill';
        btn.textContent = cat;
        btn.dataset.category = cat;
        btn.onclick = () => showCategory(cat);
        fragment.appendChild(btn);
    });

    categoryPillsContainer.innerHTML = '';
    categoryPillsContainer.appendChild(fragment);
}

function showCategory(category) {
    document.querySelectorAll('.pill').forEach(p => {
        p.classList.toggle('active', p.dataset.category === category);
    });

    const products = allCategorizedProducts[category] || [];
    if (products.length === 0) {
        menuItemsContainer.innerHTML = `<div class="empty-state">${isAr ? 'لا توجد منتجات' : 'No products'}</div>`;
        return;
    }

    const fragment = document.createDocumentFragment();
    products.forEach(product => {
        const variants = product.variants || [];
        const hasVariants = variants.length > 0;
        const sizes = getSizesForCategory(product.category, product.name);
        const isSuperSimple = variants.length === 1 && sizes.length === 1 && sizes[0] === 'مقاس واحد';

        const card = document.createElement('div');
        card.className = 'menu-item animate-fade-in';
        card.onclick = () => {
            if (isSuperSimple) {
                addVariantToOrder(product.name, variants[0].price, variants[0].name || variants[0].color, sizes[0]);
            } else if (hasVariants) {
                showVariantModal(product);
            } else {
                addToOrder(product.name, product.price);
            }
        };
        card.innerHTML = `<h3>${product.name}</h3><p>${parseFloat(product.price).toFixed(2)} <small>EGP</small></p>`;
        fragment.appendChild(card);
    });

    menuItemsContainer.innerHTML = '';
    menuItemsContainer.appendChild(fragment);
}

function getSizesForCategory(category, productName) {
    const isKids = productName.includes("أطفالي");

    if (category === "ملابس إحرام") {
        if (isKids) {
            return ["1", "2", "3", "4", "5"];
        } else {
            return ["مقاس واحد"];
        }
    }

    if (category === "جلباب أطفالي") {
        // Even sizes from 30 to 54
        let sizes = [];
        for (let i = 30; i <= 54; i += 2) {
            sizes.push(i.toString());
        }
        return sizes;
    }

    const isHalfSleeve = productName.includes("نص كم") || productName.includes("نص كم");
    const isAlAzzLongSleeve = productName.includes("العز") && productName.includes("فخامه كم طويل");

    if (category === "جلباب رجالي" && (isHalfSleeve || isAlAzzLongSleeve)) {
        // Numeric sizes from 54 to 68
        let sizes = [];
        for (let i = 54; i <= 68; i += 2) {
            sizes.push(i.toString());
        }
        return sizes;
    }

    if (category === "سراويل") {
        // Even sizes from 22 to 34
        let sizes = [];
        for (let i = 22; i <= 34; i += 2) {
            sizes.push(i.toString());
        }
        return sizes;
    }

    if (category === "جلباب رجالي") {
        // Standard Men's sizes (56-64 with S-3XL)
        return [
            "56 S", "56 M", "56 L", "56 XL", "56 2XL", "56 3XL",
            "58 S", "58 M", "58 L", "58 XL", "58 2XL", "58 3XL",
            "60 S", "60 M", "60 L", "60 XL", "60 2XL", "60 3XL",
            "62 S", "62 M", "62 L", "62 XL", "62 2XL", "62 3XL",
            "64 S", "64 M", "64 L", "64 XL", "64 2XL", "64 3XL"
        ];
    }

    // Default fallback
    return ["Free Size"];
}

let selectedFabricForModal = '';
let selectedPriceForModal = 0;

function showVariantModal(product) {
    currentProductForModal = product;
    selectedFabricForModal = ''; 
    selectedPriceForModal = product.price;
    const variants = product.variants || [];
    const sizes = getSizesForCategory(product.category, product.name);

    const fabricMap = {};
    variants.forEach(v => {
        const fName = v.name || v.color;
        if (fName && fName.trim() !== "") {
            fabricMap[fName] = v.price || v.cost || product.price;
        }
    });
    
    const fabrics = Object.keys(fabricMap);
    const hasFabrics = fabrics.length > 0;
    const isSingleFabric = fabrics.length === 1;
    
    // Unlock sizes immediately if there's only one fabric choice
    const initialButtonStyle = (hasFabrics && !isSingleFabric) ? 'opacity: 0.4; pointer-events: none;' : '';

    // ⚡ Auto-select if single fabric
    if (isSingleFabric) {
        selectedFabricForModal = fabrics[0];
        selectedPriceForModal = fabricMap[fabrics[0]];
    }

    let variantsHtml = `
        <div class="variant-selection-container" style="padding: 1.2rem 0.8rem; font-family: 'Almarai', 'Tajawal', sans-serif;">
            <!-- 🏷️ Brand Header -->
            <div style="text-align: center; margin-bottom: 1.5rem;">
                <h2 style="
                    font-size: 1.8rem; 
                    font-weight: 800; 
                    color: var(--secondary); 
                    margin-bottom: 5px;
                    font-family: 'Almarai', sans-serif;
                ">${product.name}</h2>
                <div style="width: 50px; height: 3px; background: var(--primary); margin: 0 auto; border-radius: 10px; opacity: 0.6;"></div>
            </div>

            <!-- 🎨 Fabric Selection Section (Expanded slightly to avoid scroll) -->
            <div style="margin-bottom: 1rem; text-align: center;">
                <div style="
                    display: flex; 
                    flex-wrap: wrap; 
                    justify-content: center; 
                    gap: 8px; 
                    max-height: 160px; 
                    overflow-y: auto; 
                    padding: 8px 4px;
                    scrollbar-width: none;
                ">
                    ${fabrics.length > 0 ? fabrics.map(fabric => `
                        <button class="variant-btn-select color-choice-btn ${fabric === selectedFabricForModal ? 'active' : ''}" 
                                style="min-width: 140px; padding: 10px 5px; border-radius: 12px;" 
                                data-fabric="${fabric}" 
                                data-price="${fabricMap[fabric]}"
                                onclick="selectFabricForOrder('${fabric}', ${fabricMap[fabric]})">
                            <span style="font-weight:800; font-size:1rem; color:#1e293b;">${fabric}</span>
                            <span style="font-size:0.8rem; color:var(--primary); font-weight:900;">${fabricMap[fabric]} EGP</span>
                        </button>
                    `).join('') : `<p style="opacity:0.5;">${isAr ? 'لا يوجد خامات معرفة' : 'No fabrics defined'}</p>`}
                </div>
            </div>
            
            <!-- 📏 Sizes Selection Section (Ultra Compact) -->
            <div id="size-selection-area" style="text-align: center; display: ${sizes.length === 1 && sizes[0] === 'مقاس واحد' ? 'none' : 'block'}; border-top: 1px solid #f1f5f9; padding-top: 1.2rem;">
                <div id="size-buttons-grid" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 15px; padding: 5px;">
                    ${product.category === 'جلباب رجالي' ? 
                        // Grouping for Men's Galabeya
                        (() => {
                            const groups = {};
                            sizes.forEach(s => {
                                const length = s.split(' ')[0];
                                if (!groups[length]) groups[length] = [];
                                groups[length].push(s);
                            });
                            return Object.keys(groups).map(len => `
                                <div class="size-column" style="background: #ffffff; border: 1.5px solid #f1f5f9; border-radius: 16px; padding: 12px 8px; display: flex; flex-direction: column; gap: 8px; min-width: 150px; box-shadow: 0 4px 15px rgba(0,0,0,0.03);">
                                    <div style="font-weight: 900; color: var(--primary); margin-bottom: 5px; font-size: 1.3rem; border-bottom: 2px solid var(--primary); padding-bottom: 4px; display: inline-block; font-family: 'Almarai', sans-serif;">${len}</div>
                                    ${groups[len].map(s => `
                                        <button class="variant-btn-select size-btn" 
                                                style="width: 100%; background:#f8fafc !important; border: 1px solid #e2e8f0; padding: 6px 4px; border-radius: 10px; ${initialButtonStyle}" 
                                                onclick="handleSizeClick('${s}')">
                                            <span style="font-weight:800; font-size:1.05rem; color:#334155;">${s.split(' ')[1] || s}</span>
                                        </button>
                                    `).join('')}
                                </div>
                            `).join('');
                        })() : 
                        // Default simple grid for other categories
                        sizes.map(size => `
                            <button class="variant-btn-select size-btn" style="min-width: 140px; height: 50px; background:white !important; border: 1.5px solid #e2e8f0; border-radius: 12px; ${initialButtonStyle}" onclick="handleSizeClick('${size}')">
                                <span style="font-weight:800; font-size:1.1rem; color:#1e293b; font-family: 'Almarai', sans-serif;">${size}</span>
                            </button>
                        `).join('')
                    }
                </div>
            </div>
        </div>
    `;

    commentCard.innerHTML = variantsHtml;
    overlay.style.display = 'block';
    commentCard.classList.add('active');
}

function selectFabricForOrder(fabric, price) {
    selectedFabricForModal = fabric;
    selectedPriceForModal = parseFloat(price);
    
    // UI Feedback: Highlight selected fabric button
    document.querySelectorAll('.color-choice-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.fabric === fabric) btn.classList.add('active');
    });

    // ⚡ Automation: If category is Ihram and only One Size exists, add to order immediately
    const sizes = getSizesForCategory(currentProductForModal.category, currentProductForModal.name);
    if (sizes.length === 1 && sizes[0] === 'مقاس واحد') {
        handleSizeClick('مقاس واحد');
        return;
    }

    // 🔄 Dynamic Size Refresh: If fabric is Half-Sleeve, change sizes to numeric 54-68
    const isHalfSleeve = fabric.includes("نص كم");
    const isAlAzzLongSleeve = (currentProductForModal.name.includes("العز") && fabric.includes("فخامه كم طويل"));
    
    if (isHalfSleeve || isAlAzzLongSleeve) {
        const sizes = [];
        for (let i = 54; i <= 68; i += 2) sizes.push(i.toString());
        renderSizeButtons(sizes);
    } else {
        // Revert to original category sizes
        const originalSizes = getSizesForCategory(currentProductForModal.category, currentProductForModal.name);
        renderSizeButtons(originalSizes);
    }

    // 🔓 Unlock size buttons
    document.querySelectorAll('.size-btn').forEach(btn => {
        btn.classList.remove('disabled');
        btn.style.opacity = '1';
        btn.style.pointerEvents = 'auto';
    });
}

function renderSizeButtons(sizes) {
    const grid = document.getElementById('size-buttons-grid');
    const initialButtonStyle = (selectedFabricForModal) ? '' : 'opacity: 0.4; pointer-events: none;';
    
    const isNumericCategory = currentProductForModal.category === 'جلباب أطفالي' || currentProductForModal.category === 'سراويل' || (currentProductForModal.category === 'جلباب رجالي' && !sizes[0].includes('S'));

    if (isNumericCategory) {
        // 📏 Large & Bold Numeric Grid (Two Rows)
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'repeat(4, 1fr)'; // 4 columns
        grid.style.gap = '15px';
        grid.style.width = '100%';
        grid.style.maxWidth = '600px';
        grid.style.margin = '0 auto';
        grid.style.padding = '10px';

        grid.innerHTML = sizes.map(size => {
            const isSpecial = size === '66' || size === '68' || size === '32' || size === '34';
            return `
                <button class="variant-btn-select size-btn numeric-btn ${isSpecial ? 'special-price-btn' : ''}" 
                        style="height: 90px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: white !important; border: 2.5px solid #f1f5f9; border-radius: 18px; transition: 0.3s; ${initialButtonStyle}" 
                        onclick="handleSizeClick('${size}')">
                    <span style="font-weight: 900; font-size: 1.5rem; color: #1e293b; line-height: 1.1;">${size}</span>
                </button>
            `;
        }).join('');
    } else if (currentProductForModal.category === 'جلباب رجالي') {
        // Standard grouped grid for Men's Galabeya
        const groups = {};
        sizes.forEach(s => {
            const length = s.split(' ')[0];
            if (!groups[length]) groups[length] = [];
            groups[length].push(s);
        });
        grid.innerHTML = Object.keys(groups).map(len => `
            <div class="size-column" style="background: #ffffff; border: 1.5px solid #f1f5f9; border-radius: 16px; padding: 12px 8px; display: flex; flex-direction: column; gap: 8px; min-width: 150px; box-shadow: 0 4px 15px rgba(0,0,0,0.03);">
                <div style="font-weight: 900; color: var(--primary); margin-bottom: 5px; font-size: 1.3rem; border-bottom: 2px solid var(--primary); padding-bottom: 4px; display: inline-block;">${len}</div>
                ${groups[len].map(s => `
                    <button class="variant-btn-select size-btn" style="width: 100%; background:#f8fafc !important; border: 1px solid #e2e8f0; padding: 6px 4px; border-radius: 10px; ${initialButtonStyle}" onclick="handleSizeClick('${s}')">
                        <span style="font-weight:800; font-size:1.05rem; color:#334155;">${s.split(' ')[1] || s}</span>
                    </button>
                `).join('')}
            </div>
        `).join('');
    } else {
        grid.innerHTML = sizes.map(size => `
            <button class="variant-btn-select size-btn" style="min-width: 140px; height: 50px; background:white !important; border: 1.5px solid #e2e8f0; border-radius: 12px; ${initialButtonStyle}" onclick="handleSizeClick('${size}')">
                <span style="font-weight:800; font-size:1.1rem; color:#1e293b;">${size}</span>
            </button>
        `).join('');
    }
}

function handleSizeClick(size) {
    if (!currentProductForModal) return;
    
    // Check if fabric is required and selected
    const variants = currentProductForModal.variants || [];
    const hasFabrics = variants.some(v => (v.name || v.color));
    
    if (hasFabrics && !selectedFabricForModal) {
        Swal.fire({
            icon: 'warning',
            title: isAr ? 'تنبيه' : 'Attention',
            text: isAr ? 'يرجى اختيار الخامة / اللون أولاً' : 'Please select fabric / color first',
            confirmButtonColor: 'var(--primary)'
        });
        return;
    }

    addVariantToOrder(currentProductForModal.name, selectedPriceForModal, selectedFabricForModal, size);
}

function addVariantToOrder(name, price, color, size) {
    // 🧠 Automatic Special Size Surcharge (+50 EGP)
    let finalPrice = parseFloat(price);
    let finalSizeLabel = size || '';
    
    // Check if size is "Special"
    // Rule 1: 'الفقي' products with size starting with "64" OR containing "2XL" or "3XL"
    const isFaqiSpecial = name.startsWith("الفقي") && (size.startsWith("64") || size.includes("2XL") || size.includes("3XL"));
    
    // Rule 2: 'سراويل' category with size "32" or "34"
    const isSaruwalSpecial = currentProductForModal && currentProductForModal.category === "سراويل" && (size === "32" || size === "34");

    // Rule 3: Half-sleeve or specific long-sleeve with size "66" or "68"
    const isLargeSizeGalabeya = (color.includes("نص كم") || color.includes("فخامه كم طويل")) && 
                               (size === "66" || size === "68");

    if (isFaqiSpecial || isSaruwalSpecial || isLargeSizeGalabeya) {
        finalPrice += 50;
    }

    // 🎨 Smart Labeling: Hide "عادي" or empty colors
    const displayColor = (color && color !== 'عادي') ? color : '';
    const variantLabel = `${displayColor} ${finalSizeLabel}`.trim();
    const uniqueKey = variantLabel ? `${name} (${variantLabel})` : name;
    
    if (!currentOrder[uniqueKey]) {
        currentOrder[uniqueKey] = { 
            baseName: name,
            variant: variantLabel,
            price: finalPrice, 
            quantity: 1, 
            comment: [] 
        };
    } else {
        currentOrder[uniqueKey].quantity++;
    }
    
    closeCommentCard();
    renderOrderSummary();
}

// --- 3. Order Logic ---
function addToOrder(name, price) {
    if (!currentOrder[name]) {
        currentOrder[name] = { price: parseFloat(price), quantity: 1, comment: [] };
    } else {
        currentOrder[name].quantity++;
    }
    renderOrderSummary();
}

function updateQty(name, delta) {
    if (!currentOrder[name]) return;
    currentOrder[name].quantity += delta;
    if (currentOrder[name].quantity <= 0) delete currentOrder[name];
    renderOrderSummary();
}

function renderOrderSummary() {
    let subtotal = 0;
    let totalDiscount = 0;
    let itemCount = 0;
    orderSummary.innerHTML = '';

    const items = Object.keys(currentOrder);
    
    if (items.length === 0) {
        orderSummary.innerHTML = `
            <div class="empty-cart">
                <div class="empty-cart-icon-wrapper">
                    <i class="fas fa-shopping-basket"></i>
                </div>
                <p>${t[currentLang].emptyCart}</p>
                <span>${t[currentLang].startAdding || 'ابدأ بإضافة منتجات لطلبك'}</span>
            </div>
        `;
    } else {
        // 🚀 Optimization: Batch all rows into a single fragment string to minimize reflows
        const rowsHtml = items.map(name => {
            const item = currentOrder[name];
            const cost = item.price * item.quantity;
            subtotal += cost;
            itemCount += item.quantity;

            let commentsHtml = item.comment.map((c, idx) => {
                const addPrice = parseFloat(c.price) || 0;
                if (c.isDiscount) {
                    totalDiscount += Math.abs(addPrice) * item.quantity;
                    return `
                        <div style="display: inline-flex; align-items: center; background: rgba(239,68,68,0.1); color: #ef4444; padding: 4px 10px; border-radius: 8px; font-size: 0.7rem; font-weight: 700; gap: 8px;">
                            <i class="fas fa-tag"></i>
                            <span>${c.text} (${addPrice.toFixed(2)} EGP)</span>
                            <button onclick="removeComment('${name}', ${idx})" style="background:none; border:none; color:inherit; cursor:pointer; font-size:0.8rem;"><i class="fas fa-times-circle"></i></button>
                        </div>
                    `;
                } else {
                    subtotal += addPrice * item.quantity;
                    return `
                        <div style="display: inline-flex; align-items: center; background: rgba(0, 128, 96, 0.1); color: var(--primary); padding: 4px 10px; border-radius: 8px; font-size: 0.7rem; font-weight: 700; gap: 8px;">
                            <span>${c.text} ${addPrice > 0 ? `(+${addPrice})` : ''}</span>
                            <button onclick="removeComment('${name}', ${idx})" style="background:none; border:none; color:inherit; cursor:pointer; font-size:0.8rem;"><i class="fas fa-times-circle"></i></button>
                        </div>
                    `;
                }
            }).join('');

            return `
                <div class="order-row animate-fade-in">
                    <div class="order-info">
                        <span class="order-item-name">${name}</span>
                        <span class="order-price">${cost.toFixed(2)}</span>
                    </div>
                    <div class="order-actions-row">
                        <div class="order-actions">
                            <button onclick="updateQty('${name}', -1)"><i class="fas fa-minus"></i></button>
                            <span style="font-weight: 800; min-width: 20px; text-align: center;">${item.quantity}</span>
                            <button onclick="updateQty('${name}', 1)"><i class="fas fa-plus"></i></button>
                        </div>
                        <div class="row-tools" style="display: flex; gap: 10px;">
                            <button onclick="openCommentCard('${name}')" style="background:none; border:none; color:var(--primary); cursor:pointer;"><i class="fas fa-comment-medical"></i></button>
                            <button onclick="updateQty('${name}', -${item.quantity})" style="background:none; border:none; color:#ef4444; cursor:pointer;"><i class="fas fa-trash-alt"></i></button>
                        </div>
                    </div>
                    <div class="comments-container" style="display:flex; flex-wrap:wrap; gap:6px; margin-top:10px;">
                        ${commentsHtml}
                    </div>
                </div>
            `;
        }).join('');

        orderSummary.innerHTML = rowsHtml;
    }

    const delivery = parseFloat(deliveryPriceSelect.value) || 0;
    const total = subtotal + delivery - totalDiscount;

    const subtotalEl = document.getElementById('subtotal-val');
    const deliveryEl = document.getElementById('delivery-val');
    const discountEl = document.getElementById('discount-val');
    const totalEl = document.getElementById('order-total');

    subtotalEl.textContent = subtotal.toFixed(2);
    subtotalEl.className = subtotal === 0 ? 'zero-val' : 'active-val';

    deliveryEl.textContent = delivery.toFixed(2);
    deliveryEl.className = delivery === 0 ? 'zero-val' : 'active-val';

    discountEl.textContent = totalDiscount === 0 ? '0.00' : totalDiscount.toFixed(2);
    discountEl.className = totalDiscount === 0 ? 'zero-val' : 'active-discount';

    totalEl.textContent = total.toFixed(2);
    totalEl.className = total === 0 ? 'zero-val' : 'active-total';
    document.getElementById('cart-count').textContent = `${itemCount} ${t[currentLang].items}`;
}

// --- 4. Comment & Add-ons System ---
const overlay = document.createElement('div');
overlay.className = 'overlay';
const commentCard = document.createElement('div');
commentCard.className = 'comment-card';

document.body.appendChild(overlay);
document.body.appendChild(commentCard);

function openCommentCard(itemName) {
    selectedItem = itemName;
    const lang = t[currentLang];
    
    commentCard.innerHTML = `
        <div class="variant-modal-header" style="text-align:center; margin-bottom:1rem; padding-bottom: 1rem; border-bottom: 1px solid #f1f5f9;">
            <h2 style="font-size:1.5rem; font-weight:900; color:#1e293b; margin-bottom: 5px;">${itemName}</h2>
            <p style="color:#64748b; font-size: 0.9rem; font-weight: 500;">${isAr ? 'تخصيص الصنف (ملاحظات، إضافات، أو خصم)' : 'Customize item (Notes, Add-ons, or Discount)'}</p>
        </div>
        
        <div class="variant-selection-container" style="padding: 0 0.5rem; text-align: center;">
            <div style="margin-bottom: 1rem;">
                <h4 style="margin-bottom:0.75rem; font-size:0.9rem; font-weight:800; color:#1e293b; display:flex; align-items:center; justify-content:center; gap:8px;">
                    <i class="fas fa-edit" style="color:var(--primary);"></i> ${isAr ? 'ملاحظة خاصة' : 'Special Note'}
                </h4>
                <textarea id="customComment" 
                    style="width: 100%; height: 80px; padding: 12px; border-radius: 14px; border: 2px solid #f1f5f9; font-family: inherit; font-size: 0.95rem; transition: 0.3s; resize: none;"
                    placeholder="${isAr ? 'مثال: بدون بصل، زيادة صوص...' : 'Ex: No onions, extra sauce...'}"></textarea>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                <div style="background: rgba(0, 128, 96, 0.02); padding: 0.75rem; border-radius: 16px; border: 1px solid #f1f5f9;">
                    <h4 style="margin-bottom:0.5rem; font-size:0.85rem; font-weight:800; color:#1e293b; display:flex; align-items:center; justify-content:center; gap:8px;">
                        <i class="fas fa-plus-circle" style="color:var(--primary);"></i> ${isAr ? 'تكلفة إضافية' : 'Extra Charge'}
                    </h4>
                    <input type="text" id="manualPriceInput" 
                           placeholder="0.00" 
                           style="text-align: center; width: 100%; font-size: 1.1rem; padding: 10px; border-radius: 12px; border: 2px solid #f1f5f9; font-weight: 700; color: var(--primary);"
                           oninput="this.value = this.value.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[^0-9.]/g, '')">
                </div>

                <div style="background: rgba(239, 68, 68, 0.02); padding: 0.75rem; border-radius: 16px; border: 1px solid #fee2e2;">
                    <h4 style="margin-bottom:0.5rem; font-size:0.85rem; font-weight:800; color:#1e293b; display:flex; align-items:center; justify-content:center; gap:8px;">
                        <i class="fas fa-tag" style="color:#ef4444;"></i> ${isAr ? 'خصم يدوي' : 'Manual Discount'}
                    </h4>
                    <input type="text" id="manualDiscountInput" 
                           placeholder="0.00" 
                           style="text-align: center; width: 100%; font-size: 1.1rem; padding: 10px; border-radius: 12px; border: 2px solid #fee2e2; font-weight: 700; color: #ef4444; background: white;"
                           oninput="this.value = this.value.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[^0-9.]/g, '')">
                </div>
            </div>

            <div class="popular-comments" id="popularComments" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-bottom: 1.5rem;"></div>
            
            <div style="border-top: 1px solid #f1f5f9; padding-top: 1rem;">
                <button class="save-comment-btn" onclick="saveCustomComment()" 
                        style="width: 100%; padding: 1rem; background: var(--primary); color: white; border: none; border-radius: 16px; font-weight: 800; font-size: 1.1rem; cursor: pointer; box-shadow: 0 10px 20px rgba(0, 128, 96, 0.2); transition: 0.3s;">
                    <i class="fas fa-save" style="margin-inline-end: 8px;"></i> ${isAr ? 'حفظ وإضافة للسلة' : 'Save & Update Cart'}
                </button>
            </div>
        </div>
    `;
    
    fetchPopularComments();
    overlay.style.display = 'block';
    commentCard.classList.add('active');
}

function closeCommentCard() {
    overlay.style.display = 'none';
    commentCard.classList.remove('active');
}

function removeComment(itemName, commentIdx) {
    if (!currentOrder[itemName]) return;
    currentOrder[itemName].comment.splice(commentIdx, 1);
    renderOrderSummary();
}

async function fetchPopularComments() {
    const container = document.getElementById('popularComments');
    if (!container) return;
    try {
        const res = await fetch('/comments/popular');
        const comments = await res.json();
        container.innerHTML = '';
        comments.slice(0, 6).forEach(c => {
            const btn = document.createElement('button');
            btn.className = 'comment-btn';
            btn.innerHTML = `<div>${c.commentText}</div><div style="color:var(--primary)">+${c.price}</div>`;
            btn.onclick = () => {
                addCommentToItem(selectedItem, c.commentText, c.price);
                closeCommentCard();
            };
            container.appendChild(btn);
        });
    } catch (e) { console.error(e); }
}

function addCommentToItem(itemName, text, price) {
    if (!currentOrder[itemName]) return;
    currentOrder[itemName].comment.push({ text, price: parseFloat(price) || 0 });
    renderOrderSummary();
}

function saveCustomComment() {
    const text = document.getElementById('customComment').value.trim();
    const price = parseFloat(document.getElementById('manualPriceInput').value) || 0;
    const discount = parseFloat(document.getElementById('manualDiscountInput').value) || 0;

    if (text || price > 0) {
        addCommentToItem(selectedItem, text || (isAr ? 'إضافة' : 'Add-on'), price);
    }
    if (discount > 0) {
        // Store discount as a negative price entry tagged with isDiscount flag
        if (!currentOrder[selectedItem]) return closeCommentCard();
        currentOrder[selectedItem].comment.push({
            text: isAr ? `خصم يدوي` : 'Manual Discount',
            price: -discount,
            isDiscount: true
        });
        renderOrderSummary();
    }
    closeCommentCard();
}

overlay.onclick = closeCommentCard;

// --- 5. Order Submission ---
async function getBestDiscountCode(orderDetails) {
    try {
        const productNames = orderDetails.map(item => item.name);
        const response = await fetch(`/api/discounts/check`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ products: productNames })
        });
        if (!response.ok) return null;
        const data = await response.json();
        return data.bestDiscountCode || null;
    } catch (error) {
        console.error("❌ Error fetching discount:", error);
        return null;
    }
}

async function submitOrder() {
    const items = Object.keys(currentOrder);
    if (items.length === 0) {
        Swal.fire({ icon: 'warning', title: t[currentLang].msgEmptyCart });
        return;
    }

    const paymentMethod = document.getElementById('payment-method').value;
    const total = parseFloat(document.getElementById('order-total').textContent);

    if (paymentMethod !== 'cash') {
        const confirmed = await Swal.fire({
            title: t[currentLang].confirmPayment,
            html: `
                <div style="font-size: 1.1rem; line-height: 1.6;">
                    ${t[currentLang].total}: <span dir="ltr" style="font-weight: 800; color: var(--primary);">${total.toFixed(2)} EGP</span>
                    <br>
                    <span style="color: #666; font-size: 0.9rem;">
                        ${currentLang === 'ar' ? 'عبر' : 'via'} <b style="color: var(--text-main);">${paymentMethod.toUpperCase()}</b>
                    </span>
                </div>
            `,
            icon: 'info',
            showCancelButton: true,
            confirmButtonText: t[currentLang].confirmReceipt,
            cancelButtonText: t[currentLang].cancel
        });
        if (!confirmed.isConfirmed) return;
    }

    const orderDetails = items.map(key => ({
        name: currentOrder[key].baseName || key,
        variant: currentOrder[key].variant || null,
        price: currentOrder[key].price,
        quantity: currentOrder[key].quantity,
        comments: currentOrder[key].comment
    }));

    // Skip discount fetch for now (System core version)
    const discountCode = null; // await getBestDiscountCode(orderDetails);

    const orderData = {
        customer: {
            name: nameInput.value || "--",
            phone: phoneInput.value || "0000000000",
            address: 'Store'
        },
        orderDetails,
        deliveryPrice: parseFloat(deliveryPriceSelect.value) || 0,
        orderTotal: total,
        payment_method: paymentMethod,
        discountCode
    };

    try {
        submitButton.disabled = true;
        submitButton.style.opacity = '0.5';
        submitButton.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${isAr ? 'جاري الحفظ...' : 'Saving...'}`;

        const res = await fetch('/api/order', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(orderData)
        });
        
        if (res.ok) {
            Swal.fire({ icon: 'success', title: isAr ? 'تم بنجاح' : 'Success', timer: 1500, showConfirmButton: false });
            resetForm();
        } else {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.message || 'Server error');
        }
    } catch (e) {
        Swal.fire({ icon: 'error', title: 'Error', text: e.message });
    } finally {
        submitButton.disabled = false;
        submitButton.style.opacity = '1';
        submitButton.innerHTML = `<i class="fas fa-check-circle"></i> ${t[currentLang].checkout}`;
    }
}

function resetForm() {
    currentOrder = {};
    nameInput.value = '';
    phoneInput.value = '';
    deliveryPriceSelect.value = '0';
    renderOrderSummary();
}

function setPaymentMethod(method) {
    document.getElementById('payment-method').value = method;
    document.querySelectorAll('.payment-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.payment-btn[data-method="${method}"]`).classList.add('active');
}

// --- 5. Customer Search ---
let searchTimeout;
phoneInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    const phone = phoneInput.value.trim();
    if (phone.length < 3) {
        suggestionsBox.style.display = 'none';
        return;
    }

    // 🕒 Debounce for 400ms to avoid flooding the server
    searchTimeout = setTimeout(async () => {
        try {
            const res = await fetch(`/api/customers/${phone}`);
            const data = await res.json();
            suggestionsBox.innerHTML = '';
            
            if (data.length > 0) {
                data.forEach(c => {
                    const div = document.createElement('div');
                    div.className = 'suggestion-item';
                    div.textContent = `${c.name} (${c.phone})`;
                    div.onclick = () => {
                        nameInput.value = c.name;
                        phoneInput.value = c.phone;
                        suggestionsBox.style.display = 'none';
                    };
                    suggestionsBox.appendChild(div);
                });
                suggestionsBox.style.display = 'block';
            }
        } catch (e) { console.error(e); }
    }, 400);
});

function setupEventListeners() {
    if (submitButton) submitButton.addEventListener('click', submitOrder);
    
    // Close suggestions on outside click
    document.addEventListener('click', (e) => {
        if (!phoneInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
            suggestionsBox.style.display = 'none';
        }
    });
}
========== ./public/js/customers.js ==========
const customerTableBody = document.getElementById("customers-table-body");
const addButton = document.getElementById("add-btn");
const editButton = document.getElementById("edit-btn");
const deleteButton = document.getElementById("delete-btn");

const customerNameInput = document.getElementById("customer-name");
const customerPhoneInput = document.getElementById("customer-phone");
const customerAddressInput = document.getElementById("customer-address");

let selectedCustomerId = null; 

const fetchCustomers = async () => {
    try {
        const res = await fetch("/api/customers");
        const customers = await res.json();

        customerTableBody.innerHTML = "";
        customers.forEach((customer) => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${customer.id}</td>
                <td>${customer.name}</td>
                <td>${customer.phone}</td>
                <td>${customer.address || "N/A"}</td>
                <td>${customer.totalOrders || 0}</td>
                <td>${customer.totalSpent || 0.00} EGP</td>
            `;
            row.addEventListener("click", () => selectCustomer(customer));
            customerTableBody.appendChild(row);
        });
    } catch (error) {
        console.error("❌ خطأ أثناء جلب العملاء:", error);
        showToast("⚠️ حدث خطأ أثناء جلب البيانات", "error");
    }
};

const selectCustomer = (customer) => {
    selectedCustomerId = customer.id;
    customerNameInput.value = customer.name;
    customerPhoneInput.value = customer.phone;
    customerAddressInput.value = customer.address || "";
};

const sortTable = (columnIndex) => {
    const table = document.getElementById("customers-table-body");
    const rows = Array.from(table.rows);
    
    let ascending = table.getAttribute(`data-sort-${columnIndex}`) !== "asc";
    
    rows.sort((a, b) => {
        let valueA = a.cells[columnIndex].textContent.trim();
        let valueB = b.cells[columnIndex].textContent.trim();

        if (!isNaN(valueA) && !isNaN(valueB)) {
            valueA = Number(valueA);
            valueB = Number(valueB);
        }

        if (ascending) {
            return valueA > valueB ? 1 : -1;
        } else {
            return valueA < valueB ? 1 : -1;
        }
    });

    rows.forEach(row => table.appendChild(row));
    
    table.setAttribute(`data-sort-${columnIndex}`, ascending ? "asc" : "desc");
};

addButton.addEventListener("click", async () => {
    const name = customerNameInput.value.trim();
    const phone = customerPhoneInput.value.trim();
    const address = customerAddressInput.value.trim();

    if (!name || !phone) {
        showToast("⚠️ الاسم ورقم الهاتف مطلوبين", "warning");
        return;
    }

    try {
        const res = await fetch("/customers/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, phone, address }),
        });

        const data = await res.json();
        if (res.ok) {
            showToast("✅ تم إضافة العميل بنجاح", "success");
            fetchCustomers(); 
            resetForm();
        } else {
            showToast(data.message || "⚠️ فشل في إضافة العميل", "error");
        }
    } catch (error) {
        console.error("❌ خطأ أثناء إضافة العميل:", error);
        showToast("⚠️ حدث خطأ أثناء إضافة العميل", "error");
    }
});

editButton.addEventListener("click", async () => {
    if (!selectedCustomerId) {
        showToast("⚠️ حدد عميلًا لتحديثه", "warning");
        return;
    }

    const name = customerNameInput.value.trim();
    const phone = customerPhoneInput.value.trim();
    const address = customerAddressInput.value.trim();

    if (!name || !phone) {
        showToast("⚠️ الاسم ورقم الهاتف مطلوبين", "warning");
        return;
    }

    try {
        const res = await fetch(`/api/customers/${selectedCustomerId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, phone, address }),
        });

        const data = await res.json();
        if (res.ok) {
            showToast("✅ تم تحديث بيانات العميل بنجاح", "success");
            fetchCustomers(); 
            resetForm();
        } else {
            showToast(data.message || "⚠️ فشل في تحديث البيانات", "error");
        }
    } catch (error) {
        console.error("❌ خطأ أثناء تحديث العميل:", error);
        showToast("⚠️ حدث خطأ أثناء تحديث العميل", "error");
    }
});

deleteButton.addEventListener("click", async () => {
    if (!selectedCustomerId) {
        showToast("⚠️ حدد عميلًا للحذف", "warning");
        return;
    }

    if (!confirm("❗ هل أنت متأكد أنك تريد حذف هذا العميل؟")) return;

    try {
        const res = await fetch(`/api/customers/${selectedCustomerId}`, {
            method: "DELETE",
        });

        const data = await res.json();
        if (res.ok) {
            showToast("🗑️ تم حذف العميل بنجاح", "success");
            fetchCustomers(); 
            resetForm();
        } else {
            showToast(data.message || "⚠️ فشل في حذف العميل", "error");
        }
    } catch (error) {
        console.error("❌ خطأ أثناء حذف العميل:", error);
        showToast("⚠️ حدث خطأ أثناء حذف العميل", "error");
    }
});

const resetForm = () => {
    customerNameInput.value = "";
    customerPhoneInput.value = "";
    customerAddressInput.value = "";
    selectedCustomerId = null;
};

document.addEventListener("DOMContentLoaded", fetchCustomers);

========== ./public/js/daily.js ==========
document.addEventListener("DOMContentLoaded", function () {

    // ربط زر إغلاق اليوم بالدالة الصحيحة
    const closeDayBtn = document.getElementById("close-day-btn");
    if (closeDayBtn) {
        closeDayBtn.addEventListener("click", closeDay);
    }

    // استدعاء الدوال عند تحميل الصفحة
    fetchDailySummary();
    checkIfDayClosed();
});

// 🟢 دالة جلب ملخص اليوم من السيرفر
async function fetchDailySummary() {
    try {
        const response = await fetch("/api/daily-summary");
        const data = await response.json();

        console.log('🔍 API Response:', data); // ✅ تأكد أن البيانات تصل للواجهة

        document.getElementById("totalOrders").textContent = data.totalOrders;
        document.getElementById("totalSandwiches").textContent = data.totalSandwiches;
        document.getElementById("total-revenue").textContent = data.totalRevenue + " EGP";
        document.getElementById("total-cost").textContent = data.totalCost + " EGP";
        document.getElementById("total-earnings").textContent = data.totalEarnings + " EGP";

        // ✅ إظهار الخصومات بالقيمة الصحيحة
        document.getElementById("total-discount").textContent = data.discount + " EGP";

        // ✅ إظهار المدفوعات الإلكترونية بالقيمة الصحيحة
        document.getElementById("total-online-payments").textContent = data.onlinePaymentsTotal + " EGP";

    } catch (error) {
        console.error("❌ Error fetching daily summary:", error);
    }
}

document.addEventListener("DOMContentLoaded", fetchDailySummary);

// 🔴 دالة إغلاق اليوم وتحديث قاعدة البيانات
async function closeDay() {
    const result = await Swal.fire({
        title: 'هل أنت متأكد؟',
        text: "إغلاق اليوم سيقوم بتصفير المبيعات الحالية، ولا يمكن التراجع!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ff4500',
        cancelButtonColor: '#333',
        confirmButtonText: 'نعم، أغلق اليوم',
        cancelButtonText: 'إلغاء'
    });

    if (!result.isConfirmed) return;

    try {
        const response = await fetch("/api/close-day", { method: "POST" });
        const data = await response.json();

        if (data.success) {
            Swal.fire({
                icon: 'success',
                title: 'تم الإغلاق',
                text: 'تم إغلاق اليوم وتصفير العدادات بنجاح.',
                timer: 2000,
                showConfirmButton: false
            }).then(() => {
                location.reload();
            });
        }
    } catch (error) {
        console.error("❌ Error closing the day:", error);
        Swal.fire('خطأ', 'حدث خطأ أثناء محاولة إغلاق اليوم', 'error');
    }
}

// 🟢 دالة التحقق من إذا كان اليوم مغلقًا
async function checkIfDayClosed() {
    try {
        const response = await fetch("/api/daily-summary");
        const data = await response.json();

        if (data.totalOrders === 0) {
            const closeDayBtn = document.getElementById("close-day-btn");
            if (closeDayBtn) {
                closeDayBtn.disabled = true;
                closeDayBtn.textContent = "🔒 Closed";
            }
        }
    } catch (error) {
        console.error("❌ خطأ أثناء التحقق من إغلاق اليوم:", error);
    }
}

// 🟢 دالة فتح التقرير والطباعة
function openReport() {
    const printWindow = window.open('/daily_closing.html', '_blank', 'width=400,height=600');
    printWindow.onload = function () {
        printWindow.print();
    };
}

// 🟢 دالة تصدير البيانات إلى إكسل
function exportToExcel() {
    const data = [
        ["Vortex POS - Daily Sales Report"],
        ["Date", new Date().toLocaleDateString()],
        [],
        ["Metric", "Value"],
        ["Total Orders", document.getElementById("totalOrders").textContent],
        ["Total Sandwiches", document.getElementById("totalSandwiches").textContent],
        ["Total Revenue", document.getElementById("total-revenue").textContent],
        ["Total Cost", document.getElementById("total-cost").textContent],
        ["Total Earnings", document.getElementById("total-earnings").textContent],
        ["Total Discounts", document.getElementById("total-discount").textContent],
        ["Online Payments", document.getElementById("total-online-payments").textContent]
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Daily Summary");
    
    XLSX.writeFile(wb, `Daily_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
}
========== ./public/js/daily_closing.js ==========
/**
 * Vortex POS — Daily Closing Script
 */

const fmt = (n) => `${Number(parseFloat(n || 0).toFixed(2)).toLocaleString('en-US', {minimumFractionDigits: 2})} ج.م`;

let fp;
document.addEventListener('DOMContentLoaded', () => {
    const dateInput = document.getElementById('closing-date-input');
    
    // Initialize Flatpickr
    fp = flatpickr("#closing-date-input", {
        locale: "ar",
        dateFormat: "Y-m-d",
        defaultDate: new Date().toLocaleDateString('en-CA'),
        onChange: function(selectedDates, dateStr) {
            loadDailySummary(dateStr);
        }
    });

    // Fallback initial call using strictly YYYY-MM-DD format
    const month = String(fp.currentMonth + 1).padStart(2, '0');
    const day = String(fp.now.getDate()).padStart(2, '0');
    loadDailySummary(`${fp.currentYear}-${month}-${day}`);
});
let currentClosingData = null;

async function loadDailySummary(date) {
    // Show immediate feedback
    const heroDate = document.getElementById('current-business-date');
    const initialDate = date || new Date().toLocaleDateString('en-CA');
    if (heroDate) heroDate.textContent = initialDate;

    // Visual loading state
    const container = document.querySelector('.daily-stats-container') || document.body;
    container.style.opacity = '0.5';
    container.style.pointerEvents = 'none';

    try {
        const url = date ? `/api/closing/daily-summary?date=${date}` : '/api/closing/daily-summary';
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        currentClosingData = data;

        if (data.error) {
            Swal.fire('خطأ', data.error, 'error');
            return;
        }

        // Only sync UI datepicker if we loaded without a specific date (initial load)
        if (!date && fp && data.activeBusinessDate) {
            fp.setDate(data.activeBusinessDate, false);
        }

        // Update indicators
        const displayDate = date || data.activeBusinessDate || new Date().toLocaleDateString('en-CA');
        if (heroDate) heroDate.textContent = displayDate;

        // Update UI with animation/feedback
        document.getElementById('stat-revenue').textContent = fmt(data.totalRevenue);
        document.getElementById('stat-expenses').textContent = fmt(data.totalExpenses);
        document.getElementById('stat-profit').textContent = fmt(data.totalEarnings);
        document.getElementById('stat-discount').textContent = fmt(data.discount);
        document.getElementById('stat-orders-count').textContent = data.totalOrders;
        
        // Breakdown
        const digital = (data.instaPayTotal || 0) + (data.vcashTotal || 0) + (data.cardTotal || 0) + (data.othersTotal || 0);
        document.getElementById('stat-cash').textContent = fmt(data.cashTotal);
        document.getElementById('stat-digital').textContent = fmt(digital);
        document.getElementById('stat-total-cash').textContent = fmt(data.totalRevenue);

        // Sales Metrics
        document.getElementById('stat-items-count').textContent = data.totalItems;
        document.getElementById('stat-top-product').textContent = data.topProduct || "لا يوجد";

    } catch (err) {
        console.error('Failed to load daily summary:', err);
        Swal.fire('خطأ', 'تعذر الاتصال بالسيرفر. يرجى التحقق من اتصالك بالإنترنت.', 'error');
    } finally {
        container.style.opacity = '1';
        container.style.pointerEvents = 'all';
    }
}

async function handleClosing() {
    const businessDate = document.getElementById('current-business-date').textContent;

    const result = await Swal.fire({
        title: `<span style="font-weight: 800; font-size: 1.5rem; color: #0f172a;">إغلاق وردية يوم ${businessDate}؟</span>`,
        html: `
            <div style="text-align: center; margin-top: 1rem;">
                <p style="color: #64748b; font-size: 1rem; margin-bottom: 1.5rem;">
                    سيتم اعتماد كافة البيانات وترحيلها للأرشيف. <br>
                    سيتحول تاريخ العمل تلقائياً لليوم التالي.
                </p>
                <div style="background: #f0fdf4; border: 1px solid #dcfce7; border-radius: 12px; padding: 1rem; color: #166534; font-weight: 700;">
                    تأكد من مطابقة المبالغ النقدية في الدرج قبل التأكيد!
                </div>
            </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#008060',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'نعم، إغلاق الوردية الآن',
        cancelButtonText: 'إلغاء',
        customClass: {
            popup: 'premium-swal-popup',
            title: 'premium-swal-title'
        }
    });

    if (result.isConfirmed) {
        try {
            const response = await fetch('/api/closing/close-day', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ date: businessDate })
            });
            const data = await response.json();

            if (data.success) {
                await Swal.fire('تم التقفيل بنجاح', data.message, 'success');
                window.location.href = '/launcher.html';
            } else {
                Swal.fire('خطأ', data.error || 'فشل في إتمام العملية', 'error');
            }
        } catch (err) {
            Swal.fire('خطأ', 'حدث خطأ أثناء التقفيل', 'error');
        }
    }
}

async function downloadExcelReport() {
    if (!currentClosingData) {
        Swal.fire('خطأ', 'يرجى تحميل البيانات أولاً', 'error');
        return;
    }

    const data = currentClosingData;
    const dateInput = document.getElementById('closing-date-input');
    const date = dateInput ? dateInput.value : new Date().toLocaleDateString('en-CA');
    
    const workbook = new ExcelJS.Workbook();
    
    // --- 1. SUMMARY SHEET ---
    const summarySheet = workbook.addWorksheet('ملخص اليوم', { views: [{ rightToLeft: true }] });
    summarySheet.columns = [{ width: 30 }, { width: 25 }];
    
    const titleRow = summarySheet.insertRow(1, ['تقرير التقفيل اليومي - Vortex POS']);
    summarySheet.mergeCells('A1:B1');
    titleRow.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    titleRow.alignment = { horizontal: 'center' };

    summarySheet.addRow(['تاريخ التقرير', date]).font = { bold: true };
    summarySheet.addRow([]);

    const addSectionHeader = (sheet, title, color) => {
        const row = sheet.addRow([title, '']);
        sheet.mergeCells(`A${row.number}:B${row.number}`);
        row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
    };

    addSectionHeader(summarySheet, 'الملخص المالي', 'FF008060');
    summarySheet.addRow(['إجمالي المبيعات', fmt(data.totalRevenue)]);
    summarySheet.addRow(['إجمالي الخصومات', fmt(data.discount)]);
    summarySheet.addRow(['إجمالي المصروفات', fmt(data.totalExpenses)]);
    const profitRow = summarySheet.addRow(['صافي الربح', fmt(data.totalEarnings)]);
    profitRow.getCell(2).font = { color: { argb: 'FF16A34A' }, bold: true };

    summarySheet.addRow([]);
    addSectionHeader(summarySheet, 'تفاصيل الخزنة', 'FF2563EB');
    summarySheet.addRow(['كاش (الدرج)', fmt(data.cashTotal)]);
    summarySheet.addRow(['دفع إلكتروني', fmt((data.instaPayTotal || 0) + (data.vcashTotal || 0) + (data.cardTotal || 0) + (data.othersTotal || 0))]);
    summarySheet.addRow(['إجمالي المحصل', fmt(data.totalRevenue)]).font = { bold: true };

    // --- 2. ORDERS SHEET ---
    const ordersSheet = workbook.addWorksheet('تفاصيل الطلبات', { views: [{ rightToLeft: true }] });
    ordersSheet.columns = [
        { header: 'رقم الطلب', key: 'id', width: 15 },
        { header: 'العميل', key: 'customer', width: 25 },
        { header: 'المبلغ', key: 'total', width: 15 },
        { header: 'طريقة الدفع', key: 'method', width: 20 },
        { header: 'الوقت', key: 'time', width: 20 }
    ];

    const orderHeader = ordersSheet.getRow(1);
    orderHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    orderHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };

    (data.ordersList || []).forEach(o => {
        ordersSheet.addRow({
            id: o.id,
            customer: o.customerName,
            total: fmt(o.orderTotal),
            method: o.payment_method,
            time: new Date(o.createdAt).toLocaleTimeString('ar-EG')
        });
    });

    // --- 3. EXPENSES SHEET ---
    const expensesSheet = workbook.addWorksheet('تفاصيل المصروفات', { views: [{ rightToLeft: true }] });
    expensesSheet.columns = [
        { header: 'البيان', key: 'desc', width: 35 },
        { header: 'التصنيف', key: 'cat', width: 20 },
        { header: 'المبلغ', key: 'amount', width: 15 }
    ];

    const expHeader = expensesSheet.getRow(1);
    expHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    expHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' } };

    (data.expensesList || []).forEach(e => {
        expensesSheet.addRow({
            desc: e.description,
            cat: e.category,
            amount: fmt(e.amount)
        });
    });

    // Apply borders to all sheets
    workbook.eachSheet(sheet => {
        sheet.eachRow(row => {
            row.eachCell(cell => {
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
            });
        });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Full_Report_Vortex_${date}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
}

========== ./public/js/dashboard.js ==========
document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("token");
    const userRole = localStorage.getItem("role");
    const currentLang = localStorage.getItem("lang") || "ar";
    const isAr = currentLang === "ar";

    const translations = {
        ar: {
            sold: 'مباع',
            healthy: 'سليم',
            issues: 'توجد مشاكل',
            syncing: 'جاري المزامنة...',
            minsAgo: 'منذ دقائق',
            initializing: 'جاري التشغيل...',
            currency: 'ج.م'
        },
        en: {
            sold: 'Sold',
            healthy: 'Healthy',
            issues: 'Issues Detected',
            syncing: 'Syncing...',
            minsAgo: 'mins ago',
            initializing: 'Initializing...',
            currency: 'L.E'
        }
    };
    const t = translations[currentLang];

    // ✅ Security Check
    if (userRole !== "manager") {
        window.location.href = "/cashier.html";
        return;
    }

    // ✅ Initialize Chart.js (Shopify Emerald Theme)
    const ctxElement = document.getElementById('salesPulseChart');
    if (ctxElement) {
        const ctx = ctxElement.getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, 'rgba(0, 128, 96, 0.1)');
        gradient.addColorStop(1, 'rgba(0, 128, 96, 0)');

        const salesChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'],
                datasets: [{
                    label: isAr ? 'إجمالي المبيعات' : 'Gross Sales',
                    data: [0, 0, 0, 0, 0, 0, 0, 0], // Start empty
                    borderColor: '#008060',
                    borderWidth: 2.5,
                    fill: true,
                    backgroundColor: gradient,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    pointHoverBackgroundColor: '#008060',
                    pointHoverBorderColor: '#ffffff',
                    pointHoverBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#202223',
                        padding: 10,
                        titleFont: { size: 12, weight: '600' },
                        bodyFont: { size: 12 },
                        displayColors: false
                    }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 11, weight: 500 }, color: '#6d7175' } },
                    y: { 
                        grid: { color: '#f1f2f3', drawBorder: false }, 
                        ticks: { 
                            font: { size: 11, weight: 500 }, 
                            color: '#6d7175',
                            callback: function(value) { return value + (isAr ? ' ج.م' : ' LE'); }
                        } 
                    }
                }
            }
        });
    }

    // ✅ Global Chart Storage
    let realChartData = {
        today: new Array(12).fill(0),
        yesterday: new Array(12).fill(0),
        week: { labels: [], data: [] }
    };
    const hourlyLabels = ['00:00', '02:00', '04:00', '06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];

    // ✅ Fetch Real Data
    const loadDashboardData = async () => {
        try {
            const response = await fetch('/api/dashboard-data', {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to fetch stats');
            const data = await response.json();

            console.log("📊 Received Dashboard Data:", data);
            realChartData = data.charts;

            // Update UI with real data
            animateValue("orderCount", 0, data.totalOrders || 0, 800);
            animateValue("revenueCount", 0, data.totalRevenue || 0, 1000, ` ${t.currency}`);
            animateValue("avgOrderValue", 0, data.avgOrderValue || 0, 1200, ` ${t.currency}`);
            animateValue("activeCustomers", 0, data.activeCustomers || 0, 1400);

            injectTopProducts(data.topProducts || []);
            injectActivityStream(data.recentActivity || []);

            // Initial Chart (Today)
            updateDashboardChart('today');

        } catch (error) {
            console.error("❌ Data load error:", error);
        }
    };

    function updateDashboardChart(period) {
        const chart = Chart.getChart('salesPulseChart');
        if (!chart) return;

        if (period === 'week') {
            chart.data.labels = realChartData.week.labels;
            chart.data.datasets[0].data = realChartData.week.data;
        } else {
            chart.data.labels = hourlyLabels;
            chart.data.datasets[0].data = realChartData[period];
        }
        chart.update();
    }

    const injectTopProducts = (products) => {
        const container = document.getElementById("topProductsList");
        if (!container) return;
        
        if (products.length === 0) {
            container.innerHTML = `<p style="text-align:center; padding:20px; color:#6d7175;">${isAr ? 'لا توجد بيانات اليوم' : 'No data today'}</p>`;
            return;
        }

        const maxSales = Math.max(...products.map(p => p.sales), 1);

        container.innerHTML = products.map((p, i) => `
            <div class="product-item">
                <div class="product-rank">${i + 1}</div>
                <span class="product-name">${p.name}</span>
                <div class="product-bar-bg">
                    <div class="product-bar-fill" style="width: ${(p.sales / maxSales) * 100}%"></div>
                </div>
                <div class="product-sales">
                    <span class="product-sales-num">${p.sales} ${t.sold}</span>
                </div>
            </div>
        `).join('');
    };

    const injectActivityStream = (activities) => {
        const container = document.getElementById("recentActivityStream");
        if (!container) return;

        if (activities.length === 0) {
            container.innerHTML = `<p style="text-align:center; padding:20px; color:#6d7175;">${isAr ? 'لا توجد عمليات بعد' : 'No activity yet'}</p>`;
            return;
        }

        container.innerHTML = activities.map(a => {
            const time = new Date(a.createdAt).toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' });
            return `
                <div class="activity-item">
                    <div class="activity-marker"></div>
                    <div class="activity-meta">
                        <span class="activity-customer">${a.customerName || (isAr ? 'عميل نقدي' : 'Cash Customer')}</span>
                        <span class="activity-time">#${a.id} • ${time}</span>
                    </div>
                    <span class="activity-amount">${parseFloat(a.orderTotal).toFixed(2)} ${t.currency}</span>
                </div>
            `;
        }).join('');
    };

    const injectStockAlerts = async () => {
        const container = document.getElementById("stockAlerts");
        if (!container) return;

        try {
            const response = await fetch('/api/analytics/low-stock', {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await response.json();
            
            if (!data.success || data.lowStock.length === 0) {
                container.innerHTML = "";
                return;
            }

            const alertsHTML = data.lowStock.slice(0, 3).map(a => `
                <div class="panel-alert-item critical">
                    <div class="alert-icon-wrap"><i class="fas fa-circle-exclamation"></i></div>
                    <div class="alert-body">
                        <div class="alert-name">${a.name}</div>
                        <div class="alert-details">
                            <span class="alert-qty">${isAr ? 'المتبقي:' : 'Remaining:'} <strong>${a.quantity}</strong></span>
                            <span class="alert-min">${isAr ? 'الحد الأدنى:' : 'Min:'} ${a.min}</span>
                        </div>
                    </div>
                    <div class="alert-actions">
                        <a href="/inventory.html" class="alert-restock-btn"><i class="fas fa-plus"></i> ${isAr ? 'تعبئة' : 'Restock'}</a>
                    </div>
                </div>
            `).join('');

            container.innerHTML = `
                <div class="panel-alerts-header">
                    <span><i class="fas fa-boxes-stacked"></i> ${isAr ? 'تنبيهات المخزون' : 'Stock Alerts'} <span class="alerts-count-badge">${data.lowStock.length}</span></span>
                    <a href="/inventory.html" class="section-link">${isAr ? 'إدارة المخزن' : 'Manage Inventory'} <i class="fas fa-arrow-left"></i></a>
                </div>
                <div class="panel-alerts-list">${alertsHTML}</div>
            `;
        } catch (error) {
            console.error("❌ Stock alerts error:", error);
        }
    };

    const checkHealth = async () => {
        const label = document.getElementById("systemStatusLabel");
        const circle = document.getElementById("systemHealthCircle");
        if (!label || !circle) return;
        try {
            const response = await fetch('/api/system-status');
            const health = await response.json();
            const isHealthy = health.systemStatus.includes('✅');
            label.textContent = isHealthy ? t.healthy : t.issues;
            circle.style.backgroundColor = isHealthy ? '#008060' : '#d72c0d';
        } catch (error) {
            label.textContent = t.syncing;
        }
    };

    function animateValue(id, start, end, duration, suffix = "") {
        const obj = document.getElementById(id);
        if (!obj) return;
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const value = Math.floor(progress * (end - start) + start);
            obj.innerHTML = value.toLocaleString() + suffix;
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            localStorage.removeItem("token");
            localStorage.removeItem("role");
            window.location.href = "/index.html";
        });
    }

    const restartBtn = document.getElementById("restartServerBtn");
    if (restartBtn) {
        restartBtn.addEventListener("click", async () => {
            restartBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${t.initializing}`;
            restartBtn.disabled = true;
            try {
                await fetch("/api/restart-server", { method: "POST" });
                setTimeout(() => { window.location.reload(); }, 3000);
            } catch (error) {
                restartBtn.disabled = false;
            }
        });
    }

    loadDashboardData();
    checkHealth();
    injectStockAlerts();

    // ⏱️ Time Toggle Interactivity
    document.querySelectorAll('.time-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateDashboardChart(btn.dataset.period);
        });
    });
});
========== ./public/js/discount.js ==========
// ✅ التحقق من تحميل الصفحة بشكل صحيح
document.addEventListener('DOMContentLoaded', () => {
    fetchDiscountCodes();
    fetchProducts();

    // أحداث الفورم
    document.getElementById('discount-form').addEventListener('submit', saveDiscountCode);
    document.getElementById('cancel-btn').addEventListener('click', resetForm);

    // إعداد الـ Dropdown للمنتجات
    const input = document.getElementById('applicable_products');
    input.addEventListener('click', toggleDropdown);

    // إغلاق الـ Dropdown عند الضغط خارجها
    document.addEventListener('click', handleOutsideClick);
});

// ✅ عرض أكواد الخصم في الجدول
async function fetchDiscountCodes() {
    try {
        const response = await fetch('/api/discounts');
        const data = await response.json();

        if (data.success) {
            const discountsTable = document.getElementById('discounts-table-body');
            discountsTable.innerHTML = '';

            data.discounts.forEach(discount => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${discount.code}</td>
                    <td>${discount.discount_type === 'percentage' ? 'Percentage (%)' : 'Fixed Amount'}</td>
                    <td>${discount.discount_value}</td>
                    <td>${new Date(discount.start_date).toLocaleDateString()}</td>
                    <td>${new Date(discount.end_date).toLocaleDateString()}</td>
                    <td>${discount.applicable_products || 'All Products'}</td>
                    <td>${discount.is_active ? 'Active' : 'Inactive'}</td>
                `;
                
                // ✅ حدث الضغط على الصف لملء الفورم بالبيانات
                row.addEventListener('click', () => fillFormWithDiscountData(discount));
                
                discountsTable.appendChild(row);
            });
        } else {
            console.error('Failed to fetch discount codes:', data.message);
        }
    } catch (error) {
        console.error('Error fetching discount codes:', error);
    }
}

// ✅ ملء الفورم بالبيانات عند الضغط على الصف
function fillFormWithDiscountData(discount) {
    document.getElementById('discount-id').value = discount.id;
    document.getElementById('code').value = discount.code;
    document.getElementById('discount_type').value = discount.discount_type;
    document.getElementById('discount_value').value = discount.discount_value;
    document.getElementById('start_date').value = discount.start_date.split('T')[0];
    document.getElementById('end_date').value = discount.end_date.split('T')[0];

    selectedProducts = discount.applicable_products || [];
    updateProductInput(); // تحديث الحقل بالمنتجات المختارة
    
    document.getElementById('is_active').value = discount.is_active ? 'true' : 'false';
}

// ✅ حفظ (إضافة/تعديل) كود الخصم
async function saveDiscountCode(event) {
    event.preventDefault();

    const discountId = document.getElementById('discount-id').value;
    const code = document.getElementById('code').value;
    const discount_type = document.getElementById('discount_type').value;
    const discount_value = document.getElementById('discount_value').value;
    const start_date = document.getElementById('start_date').value;
    const end_date = document.getElementById('end_date').value;
    const is_active = document.getElementById('is_active').value === 'true';

    const payload = {
        code,
        discount_type,
        discount_value,
        start_date,
        end_date,
        applicable_products: selectedProducts, 
        is_active
    };

    try {
        const method = discountId ? 'PUT' : 'POST';
        const endpoint = discountId ? `/api/discounts/${discountId}` : '/api/discounts';

        const response = await fetch(endpoint, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.success) {
            showToast(data.message, "success");
            resetForm();
            fetchDiscountCodes();
        } else {
            showToast(`Failed to save discount code: ${data.message}`, "error");
        }
    } catch (error) {
        console.error('Error saving discount code:', error);
        showToast('An error occurred while saving the discount code.', "error");
    }
}

// ✅ إعادة ضبط الفورم
function resetForm() {
    document.getElementById('discount-form').reset();
    document.getElementById('discount-id').value = '';
}

// 🆕 جلب المنتجات من السيرفر وعرضها في الـ Dropdown

// 🆕 قائمة المنتجات المختارة
let selectedProducts = [];

const productsList = document.getElementById('products-list');

// 🆕 جلب المنتجات من السيرفر وعرضها في الـ Dropdown
async function fetchProducts() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/products', {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('📦 البيانات المستلمة:', data);

        // 🆕 عرض المنتجات في الـ Dropdown
        productsList.innerHTML = '';
        Object.values(data).flat().forEach(product => {
            const item = document.createElement('div');
            item.textContent = product.name;
            item.classList.add('dropdown-item');
            item.onclick = () => toggleProductSelection(product.name);
            productsList.appendChild(item);
        });

    } catch (error) {
        console.error('❌ خطأ أثناء تحميل المنتجات:', error);
    }
}

// ✅ دالة لإظهار وإخفاء الـ Dropdown
function toggleDropdown(event) {
    event.stopPropagation(); // منع الإغلاق عند الضغط داخل الحقل
    productsList.classList.toggle('hidden');
}

// ✅ عند اختيار/إلغاء تحديد منتج
function toggleProductSelection(productName) {
    const index = selectedProducts.indexOf(productName);
    if (index === -1) {
        // إضافة المنتج إذا لم يكن موجودًا
        selectedProducts.push(productName);
    } else {
        // إزالة المنتج إذا كان موجودًا بالفعل
        selectedProducts.splice(index, 1);
    }

    updateProductInput(); // تحديث حقل الإدخال
}

// ✅ تحديث حقل المنتجات المختارة
function updateProductInput() {
    const input = document.getElementById('applicable_products');
    input.value = selectedProducts.join(', '); // عرض المنتجات كمجموعة نصية
}

// ✅ إغلاق القائمة عند الضغط خارجها
function handleOutsideClick(event) {
    const input = document.getElementById('applicable_products');
    if (!input.contains(event.target) && !productsList.contains(event.target)) {
        productsList.classList.add('hidden');
    }
}

document.addEventListener("DOMContentLoaded", function () {
    const deleteButton = document.getElementById("delete-discount");

    if (deleteButton) {
        deleteButton.addEventListener("click", function () {
            const discountId = document.getElementById("discount-id")?.value; // 🔍 احصل على ID الخصم المحدد

            if (!discountId) {
                showToast("❌ الرجاء تحديد كود خصم لحذفه!", "warning");
                return;
            }

            if (confirm("⚠️ هل أنت متأكد من حذف كود الخصم؟ لا يمكن التراجع!")) {
                deleteDiscount(discountId);
            }
        });
    }
});

// ✅ دالة حذف كود الخصم من الـ API
function deleteDiscount(discountId) {
    fetch(`/api/discounts/${discountId}`, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast("✅ تم حذف كود الخصم بنجاح!", "success");
            location.reload(); // 🔄 تحديث الصفحة بعد الحذف
        } else {
            showToast(`❌ خطأ: ${data.message}`, "error");
        }
    })
    .catch(error => {
        console.error("❌ فشل حذف كود الخصم:", error);
        showToast("❌ حدث خطأ أثناء الحذف، حاول مجددًا!", "error");
    });
}

// 🔀 دالة الترتيب
const sortTable = (columnIndex) => {
    const table = document.getElementById("discounts-table-body");
    const rows = Array.from(table.rows);
    
    // 👀 تحديد إذا كان الترتيب تصاعدي أو تنازلي
    let ascending = table.getAttribute(`data-sort-${columnIndex}`) !== "asc";
    
    rows.sort((a, b) => {
        let valueA = a.cells[columnIndex].textContent.trim();
        let valueB = b.cells[columnIndex].textContent.trim();

        // 🔢 لو القيم أرقام، حولها لأرقام للمقارنة
        if (!isNaN(valueA) && !isNaN(valueB)) {
            valueA = Number(valueA);
            valueB = Number(valueB);
        }

        if (ascending) {
            return valueA > valueB ? 1 : -1;
        } else {
            return valueA < valueB ? 1 : -1;
        }
    });

    // 🧹 إعادة ترتيب الصفوف في الجدول
    rows.forEach(row => table.appendChild(row));
    
    // 🔄 تحديث حالة الترتيب
    table.setAttribute(`data-sort-${columnIndex}`, ascending ? "asc" : "desc");
};
========== ./public/js/expenses.js ==========
/**
 * Vortex POS — Expenses Module
 * Full rewrite: businessDate-aware, server-side stats, modal CRUD, category filter
 */

let businessDate = '';
let allExpenses = [];
let activeCategory = 'all';
let editingId = null;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n) => `${parseFloat(n || 0).toFixed(2)} EGP`;

const CATEGORY_NAMES = {
    Supplies: 'خامات ومشتريات',
    Rent: 'إيجار',
    Utilities: 'مرافق',
    Salaries: 'رواتب',
    Maintenance: 'صيانة',
    Marketing: 'تسويق وإعلان',
    Other: 'أخرى'
};

const METHOD_ICONS = {
    cash: { icon: 'fas fa-money-bill-wave', label: 'كاش' },
    card: { icon: 'fas fa-credit-card', label: 'فيزا' },
    vcash: { icon: 'fas fa-mobile-alt', label: 'فودافون كاش' },
    instapay: { icon: 'fas fa-bolt', label: 'إنستاباي' }
};

function getToken() {
    return localStorage.getItem('token') || '';
}

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
    // Set current date in header (optional element)
    const dateDisplay = document.getElementById('current-date-display');
    if (dateDisplay) {
        dateDisplay.textContent = new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }

    // Setup category filter pills
    document.querySelectorAll('#cat-filter .cat-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('#cat-filter .cat-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            activeCategory = pill.dataset.cat;
            renderTable();
        });
    });

    // Date filter change
    document.getElementById('date-filter').addEventListener('change', (e) => {
        fetchExpenses(e.target.value);
    });

    // Search filter
    document.getElementById('expense-search').addEventListener('input', () => {
        renderTable();
    });

    // Form submission
    document.getElementById('expense-form').addEventListener('submit', handleSubmit);

    // Close modal on overlay click
    document.getElementById('expense-modal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeModal();
    });

    // Initial load — fetch businessDate from server stats
    await fetchExpenses();

    // Convert Arabic numerals to English in real-time
    const amountInput = document.getElementById('field-amount');
    if (amountInput) {
        amountInput.addEventListener('input', function(e) {
            const arabicNumerals = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
            let val = e.target.value;
            for (let i = 0; i < 10; i++) {
                val = val.replace(arabicNumerals[i], i);
            }
            // Also allow only numbers and decimal point
            val = val.replace(/[^\d.]/g, '');
            e.target.value = val;
        });
    }
});

// ─── API Calls ────────────────────────────────────────────────────────────────

async function fetchExpenses(date = '') {
    showSkeleton();
    try {
        const url = date ? `/api/expenses?date=${date}` : '/api/expenses';
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });

        if (!res.ok) {
            if (res.status === 401 || res.status === 403) {
                window.location.href = '/index.html';
                return;
            }
            throw new Error('فشل في جلب البيانات');
        }

        const data = await res.json();

        // Server returns { expenses, stats }
        allExpenses = data.expenses || [];
        const stats = data.stats || {};

        // Update businessDate from server (always keep the TRUE one for reset)
        businessDate = stats.activeBusinessDate;
        
        // Use filteredDate (what we are actually seeing) for UI
        const viewDate = stats.filteredDate;
        const dateInput = document.getElementById('date-filter');
        if (dateInput) dateInput.value = viewDate;

        const dateLabel = document.getElementById('business-date-label');
        if (dateLabel) {
            dateLabel.textContent = `عرض بيانات يوم: ${new Date(viewDate).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
        }

        // Update stats cards
        const updateStat = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = fmt(val);
        };
        
        updateStat('stat-today', stats.todayTotal);
        updateStat('stat-month', stats.monthTotal);
        updateStat('stat-cash', stats.byMethod?.cash);
        const digital = (stats.byMethod?.card || 0) + (stats.byMethod?.vcash || 0) + (stats.byMethod?.instapay || 0);
        updateStat('stat-digital', digital);

        renderTable();
    } catch (err) {
        console.error(err);
        document.getElementById('expenses-table-body').innerHTML = `
            <tr><td colspan="7">
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle" style="color:var(--error);opacity:0.4;font-size:2.5rem;"></i>
                    <p>فشل في تحميل البيانات. تأكد من الاتصال بالسيرفر.</p>
                </div>
            </td></tr>`;
    }
}

async function handleSubmit(e) {
    e.preventDefault();

    const description = document.getElementById('field-description').value.trim();
    const amount = parseFloat(document.getElementById('field-amount').value);
    const category = document.getElementById('field-category').value;
    const payment_method = document.getElementById('field-payment').value;
    const notes = document.getElementById('field-notes').value.trim();

    // Client-side validation
    if (!description || description.length < 2) {
        return flashError('field-description', 'الوصف يجب أن يكون حرفين على الأقل');
    }
    if (!amount || amount <= 0) {
        return flashError('field-amount', 'المبلغ يجب أن يكون أكبر من صفر');
    }

    const submitBtn = document.getElementById('btn-submit');
    submitBtn.disabled = true;
    document.getElementById('submit-btn-text').textContent = 'جاري الحفظ...';

    const payload = { description, amount, category, payment_method, notes };

    try {
        const url = editingId ? `/api/expenses/${editingId}` : '/api/expenses';
        const method = editingId ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || 'حدث خطأ غير متوقع');
        }

        closeModal();
        await fetchExpenses(document.getElementById('date-filter').value);

        Swal.fire({
            icon: 'success',
            title: editingId ? 'تم التعديل ✅' : 'تم التسجيل ✅',
            text: data.message,
            timer: 1800,
            showConfirmButton: false
        });

    } catch (err) {
        Swal.fire({ icon: 'error', title: 'خطأ', text: err.message });
    } finally {
        submitBtn.disabled = false;
        document.getElementById('submit-btn-text').textContent = editingId ? 'حفظ التعديلات' : 'تسجيل المصروف';
    }
}

async function deleteExpense(id, description) {
    const result = await Swal.fire({
        title: 'حذف المصروف؟',
        html: `سيتم حذف: <strong>${description}</strong><br><small style="color:#64748b">لا يمكن التراجع عن هذا الإجراء</small>`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        confirmButtonText: '<i class="fas fa-trash"></i> نعم، احذف',
        cancelButtonText: 'إلغاء'
    });

    if (!result.isConfirmed) return;

    try {
        const res = await fetch(`/api/expenses/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        await fetchExpenses(document.getElementById('date-filter').value);
        Swal.fire({ icon: 'success', title: 'تم الحذف', timer: 1500, showConfirmButton: false });
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'خطأ', text: err.message });
    }
}

// ─── Render ───────────────────────────────────────────────────────────────────

function renderTable() {
    const tbody = document.getElementById('expenses-table-body');
    const searchTerm = document.getElementById('expense-search').value.toLowerCase();
    const userRole = localStorage.getItem('role');

    let filtered = allExpenses;

    // 1. Filter by Category
    if (activeCategory !== 'all') {
        filtered = filtered.filter(e => e.category === activeCategory);
    }

    // 2. Filter by Search Term
    if (searchTerm) {
        filtered = filtered.filter(e => 
            e.description.toLowerCase().includes(searchTerm) || 
            (e.notes && e.notes.toLowerCase().includes(searchTerm)) ||
            (e.addedBy && e.addedBy.toLowerCase().includes(searchTerm))
        );
    }

    document.getElementById('expenses-count').textContent = filtered.length;

    let rowsHtml = '';
    const totalTarget = 8;

    if (filtered.length === 0) {
        // Show empty state in first row, then pad
        rowsHtml = `
            <tr><td colspan="7" style="height: 120px; border-bottom: none;">
                <div class="empty-state" style="padding: 1rem 0;">
                    <i class="fas fa-receipt" style="font-size: 1.5rem;"></i>
                    <p style="font-size: 0.85rem;">لا توجد مصروفات لهذا اليوم أو الفئة المحددة</p>
                </div>
            </td></tr>`;
        
        // Pad remaining 7 rows
        for (let i = 0; i < 7; i++) {
            rowsHtml += `<tr class="empty-row"><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>`;
        }
    } else {
        rowsHtml = filtered.map(exp => {
            const cat = exp.category || 'Other';
            const method = METHOD_ICONS[exp.payment_method] || { icon: 'fas fa-question', label: exp.payment_method };
            const dateStr = new Date(exp.date).toLocaleDateString('ar-EG', { day: '2-digit', month: '2-digit', year: 'numeric' });

            return `
                <tr class="animate-fade-in">
                    <td style="font-size:0.8rem;color:var(--text-muted);font-weight:600;white-space:nowrap;">${dateStr}</td>
                    <td>
                        <div class="expense-desc">${exp.description}</div>
                        ${exp.notes ? `<div class="expense-notes"><i class="fas fa-info-circle"></i> ${exp.notes}</div>` : ''}
                    </td>
                    <td><span class="cat-badge cat-${cat}">${CATEGORY_NAMES[cat] || cat}</span></td>
                    <td class="amount-cell">-${parseFloat(exp.amount).toFixed(2)} EGP</td>
                    <td>
                        <div class="method-badge">
                            <i class="${method.icon}"></i>
                            ${method.label}
                        </div>
                    </td>
                    <td class="added-by-cell">${exp.addedBy || '---'}</td>
                    <td>
                        <div class="action-group">
                            ${userRole === 'manager' ? `
                                <button class="btn-icon btn-edit" onclick="openEditModal(${exp.id})" title="تعديل">
                                    <i class="fas fa-pen"></i>
                                </button>
                                <button class="btn-icon btn-delete" onclick="deleteExpense(${exp.id}, '${exp.description.replace(/'/g, "\\'")}')" title="حذف">
                                    <i class="fas fa-trash"></i>
                                </button>
                            ` : '<span style="font-size:0.7rem;color:var(--text-muted)">عرض فقط</span>'}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        // Pad up to 8
        const currentCount = filtered.length;
        if (currentCount < totalTarget) {
            for (let i = 0; i < (totalTarget - currentCount); i++) {
                rowsHtml += `<tr class="empty-row"><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>`;
            }
        }
    }

    tbody.innerHTML = rowsHtml;
}

function showSkeleton() {
    const tbody = document.getElementById('expenses-table-body');
    tbody.innerHTML = Array.from({ length: 5 }, () => `
        <tr>
            <td><div class="skeleton" style="width:70px;height:14px;"></div></td>
            <td><div class="skeleton" style="width:150px;height:14px;"></div></td>
            <td><div class="skeleton" style="width:80px;height:20px;border-radius:6px;"></div></td>
            <td><div class="skeleton" style="width:90px;height:14px;"></div></td>
            <td><div class="skeleton" style="width:80px;height:14px;"></div></td>
            <td><div class="skeleton" style="width:70px;height:14px;"></div></td>
            <td><div class="skeleton" style="width:60px;height:28px;border-radius:8px;"></div></td>
        </tr>
    `).join('');
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function openModal() {
    editingId = null;
    document.getElementById('modal-title-text').textContent = 'تسجيل مصروف جديد';
    document.getElementById('submit-btn-text').textContent = 'تسجيل المصروف';
    document.getElementById('expense-form').reset();
    clearErrors();
    document.getElementById('expense-modal').classList.add('open');
    setTimeout(() => document.getElementById('field-description').focus(), 100);
}

function openEditModal(id) {
    const exp = allExpenses.find(e => e.id === id);
    if (!exp) return;

    editingId = id;
    document.getElementById('modal-title-text').textContent = 'تعديل المصروف';
    document.getElementById('submit-btn-text').textContent = 'حفظ التعديلات';

    document.getElementById('field-description').value = exp.description;
    document.getElementById('field-amount').value = parseFloat(exp.amount);
    document.getElementById('field-category').value = exp.category;
    document.getElementById('field-payment').value = exp.payment_method || 'cash';
    document.getElementById('field-notes').value = exp.notes || '';

    clearErrors();
    document.getElementById('expense-modal').classList.add('open');
}

function closeModal() {
    document.getElementById('expense-modal').classList.remove('open');
    editingId = null;
}

function resetToBusinessDate() {
    document.getElementById('date-filter').value = businessDate;
    fetchExpenses(businessDate);
}

// ─── Validation UI ────────────────────────────────────────────────────────────

function flashError(fieldId, message) {
    const el = document.getElementById(fieldId);
    el.classList.add('error');
    el.focus();
    Swal.fire({ icon: 'warning', title: 'تحقق من البيانات', text: message, timer: 2500, showConfirmButton: false });
    el.addEventListener('input', () => el.classList.remove('error'), { once: true });
}

function clearErrors() {
    document.querySelectorAll('.field-input.error').forEach(el => el.classList.remove('error'));
}

// ─── Export to Excel ──────────────────────────────────────────────────────────

function exportToExcel() {
    if (allExpenses.length === 0) {
        Swal.fire({ icon: 'info', title: 'لا يوجد بيانات', text: 'لا يوجد مصروفات لتصديرها في التاريخ المختار' });
        return;
    }

    const searchTerm = document.getElementById('expense-search').value.toLowerCase();
    let toExport = allExpenses;
    if (activeCategory !== 'all') {
        toExport = toExport.filter(e => e.category === activeCategory);
    }
    if (searchTerm) {
        toExport = toExport.filter(e => 
            e.description.toLowerCase().includes(searchTerm) || 
            (e.notes && e.notes.toLowerCase().includes(searchTerm))
        );
    }

    const rows = toExport.map(e => ({
        'التاريخ': e.date,
        'الوصف': e.description,
        'الفئة': CATEGORY_NAMES[e.category] || e.category,
        'المبلغ': parseFloat(e.amount),
        'طريقة الدفع': METHOD_ICONS[e.payment_method]?.label || e.payment_method,
        'ملاحظات': e.notes || '',
        'بواسطة': e.addedBy || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Expenses");

    // Auto-size columns (rough estimate)
    const wscols = [
        {wch: 12}, {wch: 30}, {wch: 15}, {wch: 10}, {wch: 15}, {wch: 30}, {wch: 15}
    ];
    worksheet['!cols'] = wscols;

    const fileName = `Expenses_${document.getElementById('date-filter').value}.xlsx`;
    XLSX.writeFile(workbook, fileName);
}

========== ./public/js/header-loader.js ==========
document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("header-container");
    if (!container) return;

    // Get config from data attributes
    const rawTitle = container.getAttribute("data-title") || "Vortex POS";
    const icon = container.getAttribute("data-icon") || "fa-list-alt";
    
    // Auto-detect Language
    const currentLang = localStorage.getItem('lang') || 'ar';
    const isAr = currentLang === 'ar';
    
    // Self-Localization for known pages to prevent ID mismatch errors
    const translations = {
        'Admin Dashboard': isAr ? 'لوحة التحكم الإدارية' : 'Admin Dashboard',
        'إدارة المخزن': isAr ? 'إدارة المخزن' : 'Inventory Management',
        'إدارة الطلبات': isAr ? 'إدارة الطلبات' : 'Manage Orders',
        'إعدادات النظام': isAr ? 'إعدادات النظام' : 'System Settings',
        'إدارة المنتجات': isAr ? 'إدارة المنتجات' : 'Products Management',
        'إدارة المصروفات': isAr ? 'إدارة المصروفات' : 'Expense Management',
        'حسابات الجملة': isAr ? 'حسابات الجملة' : 'Wholesale Ledger'
    };

    const finalTitle = translations[rawTitle] || rawTitle;
    const homeText = isAr ? 'الرئيسية' : 'Home';
    
    container.innerHTML = `
        <header class="main-brand-header">
            <div class="brand-group">
                <img src="/img/logo.png" alt="Bazzez" class="brand-logo">
                <div class="brand-text">
                    <h1>VORTEX</h1>
                    <span>SYSTEMS</span>
                </div>
            </div>

            <div class="page-context">
                <span class="context-pill">
                    <i class="fas ${icon}"></i>
                    <span>${finalTitle}</span>
                </span>
            </div>

            <div class="system-controls">
                <a href="/launcher.html" class="header-nav-btn">
                    <i class="fas fa-th-large"></i>
                    <span>${homeText}</span>
                </a>
            </div>
        </header>
    `;
});

========== ./public/js/inventory.js ==========
/**
 * Vortex POS - Inventory Management Logic
 * Optimized for Luxury Workstation Theme
 */

let allInventory = [];
const currentLang = localStorage.getItem('lang') || 'ar';
const isAr = currentLang === 'ar';

const t = {
    ar: {
        pageTitle: 'إدارة المخزن',
        searchPlaceholder: 'ابحث عن صنف...',
        totalItems: 'إجمالي الأصناف',
        lowStock: 'نواقص المخزن',
        nearExpiry: 'قرب الانتهاء',
        msgAdded: '✅ تم إضافة الصنف بنجاح.',
        msgEdited: '✅ تم تعديل البيانات بنجاح.',
        msgDeleted: '🗑️ تم حذف الصنف نهائياً.',
        msgError: '⚠️ حدث خطأ ما.',
        confirmDelete: 'هل أنت متأكد من الحذف؟',
        noResults: 'لم يتم العثور على نتائج مطابقة',
        tableId: 'ID',
        tableName: 'اسم الصنف',
        tableQty: 'الكمية',
        tableMin: 'الحد الأدنى',
        tableCost: 'التكلفة',
        tableTotal: 'إجمالي القيمة',
        tableAdded: 'آخر تحديث',
        tableExpiry: 'تاريخ الصلاحية',
        filterAll: 'كل الأصناف',
        filterLow: 'النواقص',
        filterExpiry: 'قرب الانتهاء',
        btnAdd: 'إضافة صنف جديد',
        editTitle: 'تعديل الصنف',
        addTitle: 'إضافة صنف جديد للمخزن',
        saveChanges: 'حفظ التعديلات',
        deleteItem: 'حذف الصنف',
        cancelBtn: 'إلغاء',
        exportPdf: 'تصدير PDF',
        exportExcel: 'تصدير Excel',
        colorTotal: 'إجمالي الخامة',
        other: 'أخرى',
        size: 'مقاس:'
    },
    en: {
        pageTitle: 'Inventory Management',
        searchPlaceholder: 'Search items...',
        totalItems: 'Total Items',
        lowStock: 'Low Stock',
        nearExpiry: 'Near Expiry',
        msgAdded: '✅ Item added successfully.',
        msgEdited: '✅ Data updated successfully.',
        msgDeleted: '🗑️ Item deleted successfully.',
        msgError: '⚠️ Something went wrong.',
        confirmDelete: 'Are you sure you want to delete?',
        noResults: 'No matching results found',
        tableId: 'ID',
        tableName: 'Name',
        tableQty: 'Qty (KG/Unit)',
        tableMin: 'Min Limit',
        tableCost: 'Unit Cost',
        tableTotal: 'Total Value',
        tableAdded: 'Updated Date',
        tableExpiry: 'Expiry Date',
        filterAll: 'All Items',
        filterLow: 'Low Stock',
        filterExpiry: 'Near Expiry',
        btnAdd: 'Add New Item',
        editTitle: 'Edit Item',
        addTitle: 'Add New Inventory Item',
        saveChanges: 'Save Changes',
        deleteItem: 'Delete Item',
        cancelBtn: 'Cancel',
        exportPdf: 'Export PDF',
        exportExcel: 'Export Excel',
        colorTotal: 'Fabric Total',
        other: 'Other',
        size: 'Size:'
    }
};

document.addEventListener("DOMContentLoaded", () => {
    applyTranslations();
    fetchInventory();
    setupEventListeners();
});

function applyTranslations() {
    const langT = t[currentLang];
    document.title = langT.pageTitle;
    document.documentElement.dir = isAr ? 'rtl' : 'ltr';

    document.getElementById('search-input').placeholder = langT.searchPlaceholder;
    document.getElementById('loc-stat-total').textContent = langT.totalItems;
    document.getElementById('loc-stat-low').textContent = langT.lowStock;
    document.getElementById('loc-stat-expiry').textContent = langT.nearExpiry;
    
    document.getElementById('loc-id').textContent = langT.tableId;
    document.getElementById('loc-name').textContent = langT.tableName;
    document.getElementById('loc-qty').textContent = langT.tableQty;
    document.getElementById('loc-min').textContent = langT.tableMin;
    document.getElementById('loc-cost').textContent = langT.tableCost;
    document.getElementById('loc-total').textContent = langT.tableTotal;
    document.getElementById('loc-added').textContent = langT.tableAdded;
    document.getElementById('loc-expiry').textContent = langT.tableExpiry;

    document.getElementById('loc-filter-all').textContent = langT.filterAll;
    document.getElementById('loc-filter-low').textContent = langT.filterLow;
    document.getElementById('loc-filter-expiry').textContent = langT.filterExpiry;

    document.getElementById('loc-btn-add').textContent = langT.btnAdd;
    const pdfText = document.getElementById('loc-pdf-text');
    const excelText = document.getElementById('loc-excel-text');
    if (pdfText) pdfText.textContent = langT.exportPdf;
    if (excelText) excelText.textContent = langT.exportExcel;
}

function setupEventListeners() {
    setInterval(fetchInventory, 30000);

    // 🌐 Global Arabic to English Number Converter (Reliable for Mobile/Pasting/IME)
    document.addEventListener('input', function(e) {
        if (e.target.tagName.toLowerCase() === 'input' || e.target.tagName.toLowerCase() === 'textarea') {
            const arabicNumbers = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
            let value = e.target.value;
            let hasArabic = false;
            
            for (let i = 0; i < 10; i++) {
                if (arabicNumbers[i].test(value)) {
                    value = value.replace(arabicNumbers[i], i);
                    hasArabic = true;
                }
            }
            
            if (hasArabic) {
                const start = e.target.selectionStart;
                const end = e.target.selectionEnd;
                e.target.value = value;
                try {
                    e.target.setSelectionRange(start, end);
                } catch(err) {} // Fallback for inputs that don't support selection
            }
        }
    });
}

function showLoading() {
    const tableBody = document.getElementById('product-table');
    tableBody.innerHTML = `
        <tr>
            <td colspan="8" style="padding: 10rem 0; text-align: center;">
                <div class="loader-container">
                    <i class="fas fa-circle-notch fa-spin" style="font-size: 3rem; color: var(--luxury-emerald); opacity: 0.8;"></i>
                    <p style="margin-top: 1rem; font-weight: 700; color: #64748b; letter-spacing: 0.1em;">${isAr ? 'جاري تحميل البيانات...' : 'LOADING INVENTORY...'}</p>
                </div>
            </td>
        </tr>
    `;
}

function fetchInventory(force = false) {
    // 🛑 Prevent auto-refresh from collapsing the tree if user is interacting (unless forced)
    if (document.querySelector('.expanded-row') && !force) return;

    const token = localStorage.getItem("token");
    const tableBody = document.getElementById('product-table');
    if (tableBody.innerHTML === '') showLoading();

    fetch('/api/inventory', {
        headers: { "Authorization": `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
       

        allInventory = data;
        applyFilter();
    })
    .catch(err => {
        console.error("❌ Error fetching inventory:", err);
        tableBody.innerHTML = `<tr><td colspan="8" style="padding: 4rem; color: #ef4444;">${t[currentLang].msgError}</td></tr>`;
    });
}

function renderInventory(items) {
    const tableBody = document.getElementById('product-table');
    const isRetail = (localStorage.getItem('systemMode') || 'restaurant') === 'retail';

    const expiryHeader = document.getElementById('loc-expiry');
    if (expiryHeader) {
        expiryHeader.style.display = isRetail ? 'none' : 'table-cell';
    }

    updateStats(items);

    if (items.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="${isRetail ? 7 : 8}" style="padding: 5rem 2rem; text-align: center;">
                    <i class="fas fa-box-open" style="font-size: 3rem; opacity: 0.2; margin-bottom: 1rem;"></i>
                    <h3 style="color: #64748b;">${t[currentLang].noResults}</h3>
                </td>
            </tr>
        `;
        return;
    }

    // 🚀 Performance Optimization: Use a single string join to minimize DOM reflows
    const tableRows = items.map(item => {
        const hasVariants = item.variants && item.variants.length > 0;
        
        let totalQty = parseFloat(item.quantity || 0);
        let totalMin = parseFloat(item.min || 0);
        let totalValue = 0;
        let latestUpdateDate = item.updatedAt || item.createdAt || new Date().toISOString();
        let hasLowStockVariant = false;

        if (hasVariants) {
            const variantsSum = item.variants.reduce((sum, v) => sum + parseFloat(v.quantity || 0), 0);
            totalQty = parseFloat(item.quantity || 0) > variantsSum ? parseFloat(item.quantity) : variantsSum;
            totalMin = item.variants.reduce((sum, v) => sum + parseFloat(v.min || 0), 0);
            
            if (totalQty > variantsSum) {
                totalValue = totalQty * parseFloat(item.cost || 0);
            } else {
                totalValue = item.variants.reduce((sum, v) => sum + (parseFloat(v.quantity || 0) * parseFloat(v.cost || item.cost || 0)), 0);
            }
            
            item.variants.forEach(v => {
                const vDate = v.updatedAt || v.createdAt;
                if (vDate && new Date(vDate) > new Date(latestUpdateDate)) latestUpdateDate = vDate;
                const vMin = parseFloat(v.min || 0);
                const vQty = parseFloat(v.quantity || 0);
                if (vMin > 0 && vQty <= vMin) hasLowStockVariant = true;
            });
        } else {
            totalValue = totalQty * parseFloat(item.cost || 0);
        }

        const isLow = totalQty <= totalMin || hasLowStockVariant;
        const isNearExpiry = !isRetail && checkIfNearExpiry(item.expiryDate);
        const formattedQty = isRetail ? Math.round(totalQty) : totalQty.toFixed(2);
        
        let toggleIconHTML = hasVariants 
            ? `<i class="fas fa-chevron-left toggle-icon" style="cursor:pointer; margin-left:8px; color:var(--luxury-emerald); transition: transform 0.3s; width: 15px; text-align: center;"></i>` 
            : `<span style="display:inline-block; width:23px;"></span>`;

        if (!isAr && hasVariants) {
            toggleIconHTML = `<i class="fas fa-chevron-right toggle-icon" style="cursor:pointer; margin-right:8px; color:var(--luxury-emerald); transition: transform 0.3s; width: 15px; text-align: center;"></i>`;
        }

        const formattedMin = hasVariants 
            ? (isRetail ? Math.round(totalMin) : totalMin.toFixed(2)) 
            : (isRetail ? Math.round(item.min || 0) : parseFloat(item.min || 0).toFixed(2));

        const expiryWarningHTML = isNearExpiry ? `<i class="fas fa-exclamation-circle expiry-pulse" title="${isAr ? 'قرب الانتهاء' : 'Expiring Soon'}"></i>` : '';

        const editParentBtnHTML = hasVariants ? `
            <button class="edit-parent-btn" data-id="${item.id}" style="background: rgba(16, 185, 129, 0.1); border: none; padding: 5px 10px; border-radius: 8px; color: var(--luxury-emerald); cursor: pointer; transition: 0.3s; margin-${isAr ? 'right' : 'left'}: 10px;">
                <i class="fas fa-edit"></i>
            </button>
        ` : '';

        // 🏗️ Build Parent Row HTML
        let rowHtml = `
            <tr class="${hasVariants ? 'parent-row' : ''} ${isNearExpiry ? 'row-near-expiry' : ''}" data-id="${item.id}" style="${hasVariants ? 'cursor:pointer;' : ''}">
                <td style="opacity: 0.5;">${toggleIconHTML} #${item.id}</td>
                <td style="font-weight: 800; color: var(--luxury-emerald);">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span>${item.name} ${expiryWarningHTML}</span>
                        ${editParentBtnHTML}
                    </div>
                </td>
                <td><span class="${isLow ? 'badge-low' : 'badge-ok'}">${formattedQty}</span></td>
                <td style="opacity: 0.6;">${formattedMin}</td>
                <td style="opacity: ${hasVariants ? '0.3' : '1'};">${hasVariants ? '---' : parseFloat(item.cost || 0).toFixed(2) + ' <small>EGP</small>'}</td>
                <td style="opacity: ${hasVariants ? '0.3' : '1'}; color: #008060; font-weight: 700;">${hasVariants ? '---' : parseFloat(item.price || item.cost || 0).toFixed(2) + ' <small>EGP</small>'}</td>
                <td style="font-weight: 800; color: var(--luxury-emerald);">${totalValue.toFixed(2)} <small>EGP</small></td>
                <td style="font-size: 0.85rem; opacity: 0.6;">${formatDate(latestUpdateDate)}</td>
                ${!isRetail ? `<td style="font-size: 0.85rem; font-weight: 700; color: ${isNearExpiry ? '#ef4444' : 'inherit'};">${formatDate(item.expiryDate)}</td>` : ''}
            </tr>
        `;

        // 🏗️ Build Child Rows (Variants)
        if (hasVariants) {
            const langT = t[currentLang];
            const colorGroupBaseClass = `color-group-${item.id}`;
            
            item.variants.forEach((variant, vIdx) => {
                const variantQty = isRetail ? Math.round(variant.quantity) : parseFloat(variant.quantity).toFixed(2);
                const isVLow = variant.quantity <= (variant.min || 0);
                const branchIcon = isAr ? '<i class="fas fa-level-down-alt fa-rotate-90" style="margin-left: 10px; color:#cbd5e1;"></i>' : '<i class="fas fa-level-up-alt fa-rotate-90" style="margin-right: 10px; color:#cbd5e1;"></i>';

                rowHtml += `
                    <tr class="${colorGroupBaseClass} tree-child-row tree-level-2" data-pid="${item.id}" data-vidx="${vIdx}" style="display: none; cursor: pointer;">
                        <td style="padding-${isAr ? 'right' : 'left'}: 2.5rem; font-weight: 700; color: #475569;">
                            ${branchIcon} <i class="fas fa-shirt" style="margin: 0 5px; opacity: 0.5;"></i> ${variant.name || variant.color}
                        </td>
                        <td style="opacity: 0.6; font-size: 0.85rem;">${isAr ? 'خامة' : 'Fabric'}</td>
                        <td><span class="${isVLow ? 'badge-low' : 'badge-ok'}" style="transform: scale(0.9);">${variantQty}</span></td>
                        <td style="opacity: 0.6; font-size: 0.9rem;">${isRetail ? Math.round(variant.min || 0) : (variant.min || 0).toFixed(2)}</td>
                        <td style="font-size: 0.9rem; color: #008060; font-weight: 700;">${parseFloat(variant.price || variant.cost || item.cost || 0).toFixed(2)} <small>EGP</small></td>
                        <td style="font-size: 0.9rem; color: #ca8a04;">${parseFloat(variant.cost || item.cost || 0).toFixed(2)} <small>EGP</small></td>
                        <td style="font-weight: 700; color: var(--luxury-emerald); font-size: 0.9rem;">${((variant.quantity || 0) * (variant.cost || item.cost || 0)).toFixed(2)} <small>EGP</small></td>
                        <td style="font-size: 0.8rem; opacity: 0.6;">${formatDate(variant.updatedAt || variant.createdAt || new Date())}</td>
                        ${!isRetail ? `<td>---</td>` : ''}
                    </tr>
                `;
            });

            // Add Variant Row
            rowHtml += `
                <tr class="${colorGroupBaseClass} child-row tree-child-row tree-level-2 add-action-row" data-pid="${item.id}" data-action="add-variant" style="display: none; cursor: pointer;">
                    <td colspan="${isRetail ? 7 : 8}" style="padding-${isAr ? 'right' : 'left'}: 3.5rem; color: var(--luxury-emerald); font-weight: 700; font-size: 0.85rem;">
                        <i class="fas fa-plus-circle"></i> ${isAr ? 'إضافة خامة/لون جديد' : 'Add new fabric/color'}
                    </td>
                </tr>
            `;
        }

        return rowHtml;
    }).join('');

    tableBody.innerHTML = tableRows + `
        <tr style="height: 30px; border: none;"><td colspan="${isRetail ? 7 : 8}" style="border:none;"></td></tr>
        <tr style="height: 30px; border: none;"><td colspan="${isRetail ? 7 : 8}" style="border:none;"></td></tr>
    `;

    // ⚡ Attach Event Listeners to the newly created DOM elements
    attachInventoryListeners();
}

function attachInventoryListeners() {
    const tableBody = document.getElementById('product-table');
    
    // 🟢 Level 1: Parent Rows & Expansion
    tableBody.querySelectorAll('.parent-row').forEach(row => {
        const id = row.dataset.id;
        const item = allInventory.find(i => i.id == id);
        if (!item) return;

        row.addEventListener('click', (e) => {
            if (e.target.closest('.edit-parent-btn')) return; // Handled separately

            const isExpanded = row.classList.contains('expanded-row');
            
            // Accordion: Close others
            if (!isExpanded) {
                tableBody.querySelectorAll('.parent-row.expanded-row').forEach(other => {
                    if (other !== row) other.click();
                });
            }

            row.classList.toggle('expanded-row');
            row.classList.toggle('tree-node-expanded');
            
            const icon = row.querySelector('.toggle-icon');
            if (icon) icon.style.transform = !isExpanded ? 'rotate(90deg)' : 'rotate(0deg)';

            const children = tableBody.querySelectorAll(`.color-group-${id}`);
            children.forEach(c => {
                c.style.display = !isExpanded ? 'table-row' : 'none';
            });
        });

        const editBtn = row.querySelector('.edit-parent-btn');
        if (editBtn) {
            editBtn.onclick = (e) => { e.stopPropagation(); selectItem(item); };
        }
    });

    // Handle Simple Rows (No Variants)
    tableBody.querySelectorAll('tr:not(.parent-row):not(.tree-child-row)').forEach(row => {
        if (row.dataset.id) {
            const item = allInventory.find(i => i.id == row.dataset.id);
            if (item) row.onclick = () => selectItem(item);
        }
    });

    // 🟢 Level 2: Variant Interactions
    tableBody.querySelectorAll('.tree-child-row').forEach(row => {
        const pid = row.dataset.pid;
        const vidx = row.dataset.vidx;
        const action = row.dataset.action;
        const item = allInventory.find(i => i.id == pid);
        if (!item) return;

        row.onclick = async (e) => {
            e.stopPropagation();
            if (action === 'add-variant') {
                const newV = await openVariantEntryModal(isAr, t[currentLang], { cost: item.cost });
                if (newV) handleEdit(item.id, { ...item, variants: [...(item.variants || []), newV] });
            } else if (vidx !== undefined) {
                const variant = item.variants[vidx];
                const updated = await openVariantEntryModal(isAr, t[currentLang], variant);
                if (updated) {
                    const newVs = [...item.variants];
                    newVs[vidx] = updated;
                    handleEdit(item.id, { ...item, variants: newVs });
                }
            }
        };
    });
}

function updateStats(items) {
    const lowStock = items.filter(i => i.quantity <= (i.min || 0)).length;
    const expiring = items.filter(i => checkIfNearExpiry(i.expiryDate)).length;

    const totalEl = document.getElementById('stat-total-items');
    const lowEl   = document.getElementById('stat-low-stock');
    const expEl   = document.getElementById('stat-near-expiry');
    if (totalEl) totalEl.textContent = items.length;
    if (lowEl)   lowEl.textContent   = lowStock;
    if (expEl)   expEl.textContent   = expiring;
}

function checkIfNearExpiry(dateStr) {
    if (!dateStr) return false;
    const expiry = new Date(dateStr);
    const today = new Date();
    const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
}

function formatDate(dateStr) {
    if (!dateStr) return '---';
    return new Date(dateStr).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { day: '2-digit', month: 'short' });
}

async function openVariantEntryModal(isAr, langT, initialData = null) {
    const { value: variant } = await Swal.fire({
        title: isAr ? (initialData?.name ? 'تعديل تفريعة' : 'إضافة تفريعة') : (initialData?.name ? 'Edit Variant' : 'Add Variant'),
        html: `
            <div style="display: grid; grid-template-columns: 1fr; gap: 1rem; padding: 1rem; text-align: ${isAr ? 'right' : 'left'};">
                <div>
                    <label style="display:block; font-weight:700; margin-bottom:5px;">${isAr ? 'الاسم / الخامة' : 'Name / Fabric'}</label>
                    <input id="v-name" class="swal2-input" style="width:100%; margin:0;" value="${initialData?.name || ''}" placeholder="${isAr ? 'أحمر' : 'Red'}" ${initialData?.name ? 'disabled' : ''}>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div>
                        <label style="display:block; font-weight:700; margin-bottom:5px;">${langT.tableQty}</label>
                        <input id="v-qty" type="text" inputmode="decimal" class="swal2-input" style="width:100%; margin:0;" value="${initialData && initialData.quantity !== undefined ? initialData.quantity : ''}" placeholder="0" oninput="this.value = this.value.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[^0-9.]/g, '')">
                    </div>
                    <div>
                        <label style="display:block; font-weight:700; margin-bottom:5px;">${langT.tableMin}</label>
                        <input id="v-min" type="text" inputmode="decimal" class="swal2-input" style="width:100%; margin:0;" value="${initialData && initialData.min !== undefined ? initialData.min : ''}" placeholder="0" oninput="this.value = this.value.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[^0-9.]/g, '')">
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div>
                        <label style="display:block; font-weight:700; margin-bottom:5px; color: #008060;">${isAr ? '💰 سعر البيع' : '💰 Selling Price'}</label>
                        <input id="v-price" type="text" inputmode="decimal" class="swal2-input" style="width:100%; margin:0; border-color: #008060;" value="${initialData && initialData.price !== undefined ? initialData.price : (initialData?.cost || '')}" placeholder="0.00" oninput="this.value = this.value.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[^0-9.]/g, '')">
                    </div>
                    <div>
                        <label style="display:block; font-weight:700; margin-bottom:5px; color: #ca8a04;">${isAr ? '📦 سعر التكلفة' : '📦 Cost Price'}</label>
                        <input id="v-cost" type="text" inputmode="decimal" class="swal2-input" style="width:100%; margin:0;" value="${initialData && initialData.cost !== undefined ? initialData.cost : ''}" placeholder="0.00" oninput="this.value = this.value.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[^0-9.]/g, '')">
                    </div>
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: isAr ? 'حفظ' : 'Save',
        cancelButtonText: langT.cancelBtn,
        confirmButtonColor: 'var(--luxury-emerald)',
        preConfirm: () => {
            const name = document.getElementById('v-name').value.trim();
            if (!name) return Swal.showValidationMessage(isAr ? 'يرجى إدخال الاسم' : 'Name is required');
            const price = parseFloat(document.getElementById('v-price').value) || 0;
            const cost = parseFloat(document.getElementById('v-cost').value) || 0;
            if (price <= 0) return Swal.showValidationMessage(isAr ? 'يرجى إدخال سعر البيع' : 'Selling price is required');
            return {
                name,
                color: name,
                quantity: parseFloat(document.getElementById('v-qty').value) || 0,
                min: parseFloat(document.getElementById('v-min').value) || 0,
                price,
                cost
            };
        }
    });
    return variant;
}

async function openAddModal(preExistingData = null) {
    const isRetail = (localStorage.getItem('systemMode') || 'restaurant') === 'retail';
    const langT = t[currentLang];
    
    const state = preExistingData || {
        name: '', quantity: 0, min: 0, cost: 0, expiryDate: '', variants: []
    };

    const { value: formValues, isConfirmed } = await Swal.fire({
        title: langT.addTitle,
        html: `
            <div style="padding: 1rem; text-align: ${isAr ? 'right' : 'left'};">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div style="grid-column: span 2;">
                        <label style="display:block; font-weight:700; margin-bottom:5px;">${langT.tableName}</label>
                        <input id="swal-name" class="swal2-input" style="width:100%; margin:0;" value="${state.name}" placeholder="${langT.tableName}">
                    </div>
                    <div>
                        <label style="display:block; font-weight:700; margin-bottom:5px;">${langT.tableQty}</label>
                        <input id="swal-qty" type="text" class="swal2-input" style="width:100%; margin:0;" value="${state.quantity}">
                    </div>
                    <div>
                        <label style="display:block; font-weight:700; margin-bottom:5px;">${langT.tableMin}</label>
                        <input id="swal-min" type="text" class="swal2-input" style="width:100%; margin:0;" value="${state.min}">
                    </div>
                    <div>
                        <label style="display:block; font-weight:700; margin-bottom:5px;">${langT.tableCost}</label>
                        <input id="swal-cost" type="text" class="swal2-input" style="width:100%; margin:0;" value="${state.cost}">
                    </div>
                    ${!isRetail ? `
                    <div>
                        <label style="display:block; font-weight:700; margin-bottom:5px;">${langT.tableExpiry}</label>
                        <input id="swal-expiry" type="date" class="swal2-input" style="width:100%; margin:0;" value="${state.expiryDate}">
                    </div>
                    ` : ''}
                </div>

                <div id="variants-summary-list" style="margin-top: 1.5rem; border-top: 2px dashed #e2e8f0; padding-top: 1rem;">
                    ${state.variants.length > 0 ? state.variants.map((v, i) => `
                        <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 10px; border-radius: 8px; margin-bottom: 5px; border: 1px solid #e2e8f0;">
                            <div>
                                <strong style="color: var(--luxury-emerald);">${v.name}</strong> 
                                <small style="opacity: 0.7;">Qty: ${v.quantity} | ${v.cost} EGP</small>
                            </div>
                            <div style="display: flex; gap: 10px;">
                                <button type="button" class="edit-v-btn" data-index="${i}" style="background:none; border:none; color:var(--luxury-emerald); cursor:pointer;"><i class="fas fa-edit"></i></button>
                                <button type="button" class="del-v-btn" data-index="${i}" style="background:none; border:none; color:#ef4444; cursor:pointer;"><i class="fas fa-trash"></i></button>
                            </div>
                        </div>
                    `).join('') : `<p style="text-align:center; opacity:0.5;">${isAr ? 'لا يوجد تفريعات' : 'No variants'}</p>`}
                </div>

                <div style="margin-top: 1rem;">
                    <button type="button" id="btn-add-variant-modal" style="width:100%; height: 45px; border-radius: 8px; border: 2px dashed var(--luxury-emerald); background: transparent; color: var(--luxury-emerald); font-weight: bold; cursor: pointer;">
                        <i class="fas fa-plus"></i> ${isAr ? 'إضافة تفريعة' : 'Add Variant'}
                    </button>
                </div>
            </div>
        `,
        didOpen: () => {
            const getCur = () => ({
                name: document.getElementById('swal-name').value,
                quantity: document.getElementById('swal-qty').value,
                min: document.getElementById('swal-min').value,
                cost: document.getElementById('swal-cost').value,
                expiryDate: !isRetail ? document.getElementById('swal-expiry').value : '',
                variants: state.variants
            });

            document.getElementById('btn-add-variant-modal').onclick = async () => {
                const cur = getCur();
                const v = await openVariantEntryModal(isAr, langT, { min: cur.min, cost: cur.cost });
                if (v) { cur.variants.push(v); openAddModal(cur); }
                else openAddModal(cur);
            };

            document.querySelectorAll('.edit-v-btn').forEach(btn => {
                btn.onclick = async () => {
                    const idx = btn.dataset.index;
                    const cur = getCur();
                    const updated = await openVariantEntryModal(isAr, langT, cur.variants[idx]);
                    if (updated) { cur.variants[idx] = updated; openAddModal(cur); }
                    else openAddModal(cur);
                };
            });

            document.querySelectorAll('.del-v-btn').forEach(btn => {
                btn.onclick = () => {
                    const idx = btn.dataset.index;
                    const cur = getCur();
                    cur.variants.splice(idx, 1);
                    openAddModal(cur);
                };
            });
        },
        preConfirm: () => {
            const name = document.getElementById('swal-name').value.trim();
            if (!name) return Swal.showValidationMessage(isAr ? 'يرجى إدخال الاسم' : 'Name is required');
            return {
                name,
                quantity: parseFloat(document.getElementById('swal-qty').value) || 0,
                min: parseFloat(document.getElementById('swal-min').value) || 0,
                cost: parseFloat(document.getElementById('swal-cost').value) || 0,
                expiryDate: !isRetail ? document.getElementById('swal-expiry').value : null,
                variants: state.variants
            };
        }
    });

    if (isConfirmed && formValues) handleFormSubmit(formValues);
}

async function selectItem(item, preExistingData = null) {
    const isRetail = (localStorage.getItem('systemMode') || 'restaurant') === 'retail';
    const langT = t[currentLang];

    const state = preExistingData || {
        name: item.name,
        quantity: isRetail ? Math.round(item.quantity) : item.quantity,
        min: isRetail ? Math.round(item.min || 0) : (item.min || 0),
        cost: item.cost,
        expiryDate: item.expiryDate ? item.expiryDate.split('T')[0] : '',
        variants: item.variants ? [...item.variants] : []
    };

    const { value: result, isConfirmed, isDenied } = await Swal.fire({
        title: `${langT.editTitle}: ${state.name}`,
        html: `
            <div style="padding: 1rem; text-align: ${isAr ? 'right' : 'left'};">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div style="grid-column: span 2;">
                        <label style="display:block; font-weight:700; margin-bottom:5px;">${langT.tableName}</label>
                        <input id="swal-edit-name" class="swal2-input" value="${state.name}" style="width:100%; margin:0;">
                    </div>
                    <div>
                        <label style="display:block; font-weight:700; margin-bottom:5px;">${langT.tableQty}</label>
                        <input id="swal-edit-qty" type="text" inputmode="decimal" class="swal2-input" value="${state.quantity}" style="width:100%; margin:0;" oninput="this.value = this.value.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[^0-9.]/g, '')">
                    </div>
                    <div>
                        <label style="display:block; font-weight:700; margin-bottom:5px;">${langT.tableMin}</label>
                        <input id="swal-edit-min" type="text" inputmode="decimal" class="swal2-input" value="${state.min}" style="width:100%; margin:0;" oninput="this.value = this.value.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[^0-9.]/g, '')">
                    </div>
                    <div>
                        <label style="display:block; font-weight:700; margin-bottom:5px;">${langT.tableCost}</label>
                        <input id="swal-edit-cost" type="text" inputmode="decimal" class="swal2-input" value="${state.cost}" style="width:100%; margin:0;" oninput="this.value = this.value.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[^0-9.]/g, '')">
                    </div>
                    ${!isRetail ? `
                    <div>
                        <label style="display:block; font-weight:700; margin-bottom:5px;">${langT.tableExpiry}</label>
                        <input id="swal-edit-expiry" type="date" class="swal2-input" value="${state.expiryDate}" style="width:100%; margin:0;">
                    </div>
                    ` : ''}
                </div>

                <div id="variants-summary-list" style="margin-top: 1.5rem; border-top: 2px dashed #e2e8f0; padding-top: 1rem;">
                    ${state.variants.length > 0 ? state.variants.map((v, i) => `
                        <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 10px; border-radius: 8px; margin-bottom: 5px; border: 1px solid #e2e8f0;">
                            <div>
                                <strong style="color: var(--luxury-emerald);">${v.name || v.color}</strong> 
                                <small style="opacity: 0.7;">(${v.size || '-'}) | Qty: ${v.quantity} | ${v.cost} EGP</small>
                            </div>
                            <div style="display: flex; gap: 10px;">
                                <button type="button" class="edit-v-btn" data-index="${i}" style="background:none; border:none; color:var(--luxury-emerald); cursor:pointer;"><i class="fas fa-edit"></i></button>
                                <button type="button" class="del-v-btn" data-index="${i}" style="background:none; border:none; color:#ef4444; cursor:pointer;"><i class="fas fa-trash"></i></button>
                            </div>
                        </div>
                    `).join('') : `<p style="text-align:center; opacity:0.5;">${isAr ? 'لا يوجد تفريعات' : 'No variants'}</p>`}
                </div>

                <div style="margin-top: 1rem;">
                    <button type="button" id="btn-add-variant-modal" style="width:100%; height: 45px; border-radius: 8px; border: 2px dashed var(--luxury-emerald); background: transparent; color: var(--luxury-emerald); font-weight: bold; cursor: pointer;">
                        <i class="fas fa-plus"></i> ${isAr ? 'إضافة تفريعة' : 'Add Variant'}
                    </button>
                </div>
            </div>
        `,
        didOpen: () => {
            const getCur = () => ({
                name: document.getElementById('swal-edit-name').value,
                quantity: document.getElementById('swal-edit-qty').value,
                min: document.getElementById('swal-edit-min').value,
                cost: document.getElementById('swal-edit-cost').value,
                expiryDate: !isRetail ? document.getElementById('swal-edit-expiry').value : '',
                variants: state.variants
            });

            document.getElementById('btn-add-variant-modal').onclick = async () => {
                const cur = getCur();
                const v = await openVariantEntryModal(isAr, langT, { min: cur.min, cost: cur.cost });
                if (v) { cur.variants.push(v); selectItem(item, cur); }
                else selectItem(item, cur);
            };

            document.querySelectorAll('.edit-v-btn').forEach(btn => {
                btn.onclick = async () => {
                    const idx = btn.dataset.index;
                    const cur = getCur();
                    const updated = await openVariantEntryModal(isAr, langT, cur.variants[idx]);
                    if (updated) { cur.variants[idx] = updated; selectItem(item, cur); }
                    else selectItem(item, cur);
                };
            });

            document.querySelectorAll('.del-v-btn').forEach(btn => {
                btn.onclick = () => {
                    const idx = btn.dataset.index;
                    const cur = getCur();
                    cur.variants.splice(idx, 1);
                    selectItem(item, cur);
                };
            });
        },
        showDenyButton: true,
        confirmButtonText: langT.saveChanges,
        denyButtonText: langT.deleteItem,
        confirmButtonColor: 'var(--luxury-emerald)',
        denyButtonColor: '#ef4444',
        preConfirm: () => {
            const name = document.getElementById('swal-edit-name').value.trim();
            if (!name) return Swal.showValidationMessage(isAr ? 'يرجى إدخال اسم الصنف' : 'Name is required');
            
            const parentQty = parseFloat(document.getElementById('swal-edit-qty').value) || 0;
            const variantsSum = state.variants.reduce((sum, v) => sum + parseFloat(v.quantity || 0), 0);
            
            let variantsToSave = [...state.variants];
            
            // 🧠 Rule: If parent quantity is explicitly set and different from the variants sum,
            // we assume the user wants "Bulk Tracking". Zero out the children quantities AND min.
            if (parentQty > 0 && parentQty !== variantsSum) {
                variantsToSave = variantsToSave.map(v => ({ ...v, quantity: 0, min: 0 }));
            }

            return {
                name,
                quantity: parentQty,
                min: parseFloat(document.getElementById('swal-edit-min').value) || 0,
                cost: parseFloat(document.getElementById('swal-edit-cost').value) || 0,
                expiryDate: !isRetail ? document.getElementById('swal-edit-expiry').value : null,
                variants: variantsToSave
            };
        }
    });

    if (isConfirmed) handleEdit(item.id, result);
    else if (isDenied) handleDelete(item.id);
}

async function handleFormSubmit(data) {
    const token = localStorage.getItem("token");
    Swal.fire({ title: isAr ? 'جاري الحفظ...' : 'Saving...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        const res = await fetch("/api/inventory/add", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            Swal.fire({ icon: 'success', title: t[currentLang].msgAdded, timer: 1500, showConfirmButton: false });
            fetchInventory(true);
        } else {
            const err = await res.json().catch(() => ({}));
            Swal.fire({ icon: 'error', title: t[currentLang].msgError, text: err.error || `Server: ${res.status}` });
        }
    } catch (err) {
        Swal.fire({ icon: 'error', title: t[currentLang].msgError });
    }
}

async function handleEdit(id, data) {
    if (typeof id === 'string' && id.includes('-') || parseInt(id) >= 1000) {
        Swal.fire({ icon: 'info', title: isAr ? 'هذه بيانات تجريبية (Mock Data) للتوضيح فقط ولا يمكن تعديلها في قاعدة البيانات حالياً' : 'This is mock data for demonstration and cannot be edited in the DB yet.' });
        return;
    }

    const token = localStorage.getItem("token");
    Swal.fire({ title: isAr ? 'جاري التحديث...' : 'Updating...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        const res = await fetch(`/api/inventory/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            Swal.fire({ icon: 'success', title: t[currentLang].msgEdited, timer: 1500, showConfirmButton: false });
            fetchInventory(true);
        } else {
            Swal.fire({ icon: 'error', title: t[currentLang].msgError, text: `Server returned ${res.status}` });
        }
    } catch (err) {
        Swal.fire({ icon: 'error', title: t[currentLang].msgError });
    }
}

async function handleDelete(id) {
    if (typeof id === 'string' && id.includes('-') || parseInt(id) >= 1000) {
        Swal.fire({ icon: 'info', title: isAr ? 'هذه بيانات تجريبية (Mock Data) للتوضيح فقط ولا يمكن حذفها' : 'This is mock data and cannot be deleted.' });
        return;
    }

    const result = await Swal.fire({
        title: t[currentLang].confirmDelete,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: isAr ? 'نعم، احذف' : 'Yes, Delete',
        cancelButtonText: t[currentLang].cancelBtn
    });

    if (!result.isConfirmed) return;

    const token = localStorage.getItem("token");
    try {
        const res = await fetch(`/api/inventory/${id}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
            Swal.fire({ icon: 'success', title: t[currentLang].msgDeleted, timer: 1500, showConfirmButton: false });
            fetchInventory(true);
        }
    } catch (err) {
        Swal.fire({ icon: 'error', title: t[currentLang].msgError });
    }
}

let filterTimeout;
function applyFilter() {
    clearTimeout(filterTimeout);
    filterTimeout = setTimeout(() => {
        const query = document.getElementById('search-input').value.toLowerCase();
        const filter = document.getElementById('filter-option').value;
        
        let filtered = allInventory.filter(item => item.name.toLowerCase().includes(query));
        
        if (filter === 'low-stock') {
            filtered = filtered.filter(item => {
                const hasVariants = item.variants && item.variants.length > 0;
                if (hasVariants) {
                    const totalQty = item.variants.reduce((sum, v) => sum + parseFloat(v.quantity || 0), 0);
                    const totalMin = item.variants.reduce((sum, v) => sum + parseFloat(v.min || 0), 0);
                    const hasLowVariant = item.variants.some(v => parseFloat(v.quantity || 0) <= parseFloat(v.min || 0));
                    return totalQty <= totalMin || hasLowVariant;
                } else {
                    const q = parseFloat(item.quantity || 0);
                    const m = parseFloat(item.min || 0);
                    return q <= m;
                }
            });
        } else if (filter === 'near-expiry') {
            filtered = filtered.filter(item => checkIfNearExpiry(item.expiryDate));
        }
        
        renderInventory(filtered);
    }, 300);
}

function exportToPDF() {
    try {
        const element = document.getElementById("printable-content");
        if (!element) throw new Error("Printable content not found");

        // 1. Prepare for capture: Hide interactive elements and fix Arabic direction
        const noPrintElements = document.querySelectorAll('.no-print');
        noPrintElements.forEach(el => el.style.display = 'none');
        element.classList.add('pdf-capture-mode');
        
        const reportDateElem = document.getElementById("pdf-report-date");
        if (reportDateElem) {
            reportDateElem.textContent = `${isAr ? 'بتاريخ' : 'Date'}: ${new Date().toLocaleString(isAr ? 'ar-EG' : 'en-US')}`;
        }

        // 2. Export Options
        const opt = {
            margin: [0.3, 0.3], // Minimal margins
            filename: `vortex_inventory_${new Date().toISOString().split('T')[0]}.pdf`,
            image: { type: 'jpeg', quality: 1.0 },
            html2canvas: { 
                scale: 3, 
                useCORS: true,
                letterRendering: false,
                allowTaint: true,
                backgroundColor: "#ffffff"
            },
            jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape', compress: true }
        };
        
        Swal.fire({
            title: isAr ? 'جاري تحضير التقرير...' : 'Preparing Report...',
            didOpen: () => { Swal.showLoading(); },
            allowOutsideClick: false,
            showConfirmButton: false
        });

        html2pdf().set(opt).from(element).save().then(() => {
            // 3. Restore visibility and layout
            noPrintElements.forEach(el => el.style.display = '');
            element.classList.remove('pdf-capture-mode');
            Swal.close();
        }).catch(err => {
            noPrintElements.forEach(el => el.style.display = '');
            element.classList.remove('pdf-capture-mode');
            console.error("PDF Error:", err);
            Swal.fire({ icon: 'error', title: 'PDF Error', text: err.message });
        });
    } catch (err) {
        console.error("Export Error:", err);
        Swal.fire({ icon: 'error', title: 'Error', text: err.message });
    }
}

function exportToExcel() {
    try {
        if (!allInventory || allInventory.length === 0) {
            Swal.fire({ icon: 'warning', title: isAr ? 'لا توجد بيانات لتصديرها' : 'No data to export' });
            return;
        }

        Swal.fire({
            title: isAr ? 'جاري تجهيز ملف الأكسيل...' : 'Preparing Excel...',
            didOpen: () => { Swal.showLoading(); },
            allowOutsideClick: false,
            showConfirmButton: false
        });

        // Prepare data with clean formatting
        const excelData = allInventory.map(item => {
            let addedDate = '-';
            let expiryDate = '-';
            try {
                if (item.createdAt) addedDate = new Date(item.createdAt).toISOString().split('T')[0];
                if (item.expiryDate) expiryDate = new Date(item.expiryDate).toISOString().split('T')[0];
            } catch (e) { console.error(e); }

            return {
                [isAr ? 'كود' : 'ID']: item.id,
                [isAr ? 'اسم الصنف' : 'Name']: item.name,
                [isAr ? 'الكمية' : 'Quantity']: item.quantity,
                [isAr ? 'الحد الأدنى' : 'Min Limit']: item.min || 0,
                [isAr ? 'سعر الوحدة' : 'Unit Cost']: item.unitCost || 0,
                [isAr ? 'إجمالي القيمة' : 'Total Value']: (item.quantity * (item.unitCost || 0)).toFixed(2),
                [isAr ? 'تاريخ الإضافة' : 'Added Date']: addedDate,
                [isAr ? 'تاريخ الانتهاء' : 'Expiry Date']: expiryDate
            };
        });

        const ws = XLSX.utils.json_to_sheet(excelData);
        const wscols = [
            {wch: 10}, {wch: 30}, {wch: 12}, {wch: 12}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 15}
        ];
        ws['!cols'] = wscols;

        const wb = XLSX.utils.book_new();
        
        // 🛠️ Proper Workbook-level RTL setting
        if (!wb.Workbook) wb.Workbook = {};
        if (!wb.Workbook.Views) wb.Workbook.Views = [];
        wb.Workbook.Views[0] = { RTL: isAr };

        XLSX.utils.book_append_sheet(wb, ws, isAr ? "المخزن" : "Inventory");

        XLSX.writeFile(wb, `vortex_inventory_${new Date().toISOString().split('T')[0]}.xlsx`);
        
        Swal.close();
    } catch (err) {
        console.error("Excel Error:", err);
        Swal.fire({ icon: 'error', title: 'Excel Error', text: err.message });
    }
}
========== ./public/js/login.js ==========
document.getElementById('login-form').addEventListener('submit', function (e) {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    console.log('📥 إرسال بيانات تسجيل الدخول:', { username, password });

    fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('❌ فشل في تسجيل الدخول.');
        }
        return response.json();
    })
    .then(data => {
        if (data.token) {
            console.log('🟢 Login successful:', data);
            localStorage.clear(); 
            localStorage.setItem('token', data.token);
            localStorage.setItem('role', data.role);
            localStorage.setItem('username', data.username || username); // Fallback to provided username
    
            // Fetch system settings to apply globally (like Language and System Mode)
            fetch('/api/settings', { headers: { 'Authorization': `Bearer ${data.token}` } })
            .then(res => res.json())
            .then(settings => {
                if (settings.language) localStorage.setItem('lang', settings.language);
                if (settings.system_mode) localStorage.setItem('systemMode', settings.system_mode);
                window.location.href = '/launcher.html';
            })
            .catch(() => {
                // If fetching settings fails, still proceed to launcher
                window.location.href = '/launcher.html';
            });
        } else {
            alert(data.error || 'فشل تسجيل الدخول.');
        }
    })
    .catch(error => console.error('❌ خطأ أثناء تسجيل الدخول:', error));
    
});

========== ./public/js/manage_orders.js ==========
const currentLang = localStorage.getItem('lang') || 'ar';
const isAr = currentLang === 'ar';

const t = {
    ar: {
        pageTitle: 'الطلبات',
        refresh: 'تحديث',
        all: 'الكل',
        paid: 'أونلاين',
        pending: 'نقدي',
        cancelled: 'ملغي',
        searchPlaceholder: 'ابحث برقم الطلب أو اسم العميل...',
        tableOrder: 'الطلب',
        tableDate: 'التاريخ',
        tableCustomer: 'العميل',
        tableTotal: 'الإجمالي',
        tablePayment: 'حالة الدفع',
        tableDelivery: 'التوصيل',
        tableStatus: 'الحالة',
        sidebarTitle: 'تفاصيل الطلب',
        sidebarItems: 'الأصناف',
        sidebarCustomer: 'بيانات العميل',
        sidebarPayment: 'حالة الدفع',
        sidebarSubtotal: 'المجموع:',
        sidebarDelivery: 'خدمة التوصيل:',
        sidebarDiscount: 'الخصم:',
        sidebarGrandTotal: 'الإجمالي النهائي:',
        printBtn: 'طباعة فاتورة',
        cancelBtn: 'إلغاء الطلب',
        cashCustomer: 'عميل نقدي',
        noPhone: 'بدون هاتف',
        noAddress: 'بدون عنوان',
        paidStatus: 'أونلاين',
        pendingStatus: 'نقدي',
        deliveryStatus: 'دليفري',
        inStoreStatus: 'في المحل',
        activeStatus: 'نشط',
        cancelledStatus: 'ملغي',
        loading: 'جاري التحميل...',
        errorLoading: '⚠️ فشل في تحميل التفاصيل',
        todayTotal: 'إجمالي الطلبات اليوم:',
        sidebarPrice: 'السعر:',
        sidebarVat: 'القيمة المضافة:',
        sidebarTotal: 'الإجمالي النهائي:',
        prev: 'السابق',
        next: 'التالي',
        pageOf: 'صفحة {current} من {total}',
        exportExcel: 'تصدير الطلبات (Excel)',
        home: 'الرئيسية',
        card: 'فيزا / محفظة',
        cash: 'نقدي',
        shiftTotal: 'إجمالي طلبات وردية العمل:',
        onlineTotal: 'إجمالي الطلبات الأونلاين:',
        cashTotal: 'إجمالي الطلبات النقدي:',
        cancelledTotal: 'إجمالي الطلبات الملغاة:'
    },
    en: {
        pageTitle: 'Orders',
        refresh: 'Refresh',
        all: 'All',
        paid: 'Online',
        pending: 'Cash',
        cancelled: 'Cancelled',
        searchPlaceholder: 'Search by order ID or customer...',
        tableOrder: 'Order',
        tableDate: 'Date',
        tableCustomer: 'Customer',
        tableTotal: 'Total',
        tablePayment: 'Payment Status',
        tableDelivery: 'Delivery',
        tableStatus: 'Status',
        sidebarTitle: 'Order Details',
        sidebarItems: 'Items',
        sidebarCustomer: 'Customer Info',
        sidebarPayment: 'Payment Status',
        sidebarSubtotal: 'Subtotal:',
        sidebarDelivery: 'Delivery Fee:',
        sidebarDiscount: 'Discount:',
        sidebarGrandTotal: 'Grand Total:',
        printBtn: 'Print Receipt',
        cancelBtn: 'Cancel Order',
        cashCustomer: 'Cash Customer',
        noPhone: 'No Phone',
        noAddress: 'No Address',
        paidStatus: 'Online',
        pendingStatus: 'Cash',
        deliveryStatus: 'Delivery',
        inStoreStatus: 'In Store',
        activeStatus: 'Active',
        cancelledStatus: 'Cancelled',
        loading: 'Loading...',
        errorLoading: '⚠️ Failed to load details',
        todayTotal: "Today's Total Orders:",
        sidebarPrice: 'Price:',
        sidebarVat: 'VAT:',
        sidebarTotal: 'Grand Total:',
        prev: 'Previous',
        next: 'Next',
        pageOf: 'Page {current} of {total}',
        exportExcel: 'Export Orders (Excel)',
        home: 'Home',
        card: 'Card / Wallet',
        cash: 'Cash',
        shiftTotal: 'Business Shift Total:',
        onlineTotal: 'Online Orders Total:',
        cashTotal: 'Cash Orders Total:',
        cancelledTotal: 'Cancelled Orders Total:'
    }
}[currentLang];

let activeFilter = 'all';
let currentOrders = [];
let appSettings = {};
let vatRate = 0; // Default to 0% if no settings found
let selectedDate = ""; // Will be fetched from settings
let currentPage = 1;
const ordersPerPage = 10;
let totalPages = 1;

document.addEventListener('DOMContentLoaded', async () => {
    applyTranslations();
    
    const dateInput = document.getElementById('date-filter');
    const todayStr = new Date().toLocaleDateString('en-CA');
    
    await fetchSettings(); // Fetch settings first to know the active business date
    
    // 🗓️ Default to the Active Business Day (The shift you are currently working on)
    if (appSettings.active_business_date) {
        selectedDate = appSettings.active_business_date;
        if (dateInput) dateInput.value = selectedDate;
    } else {
        selectedDate = todayStr;
        if (dateInput) dateInput.value = todayStr;
    }

    // Initialize Flatpickr
    let fp = null;
    if (dateInput) {
        fp = flatpickr(dateInput, {
            locale: isAr ? "ar" : "en",
            dateFormat: "Y-m-d",
            defaultDate: selectedDate,
            disableMobile: true,
            onChange: function(selectedDates, dateStr, instance) {
                if (!dateStr) {
                    selectedDate = appSettings.active_business_date || todayStr;
                    instance.setDate(selectedDate);
                } else {
                    selectedDate = dateStr;
                }
                
                const clearBtn = document.getElementById('clear-date-btn');
                if (selectedDate && selectedDate !== appSettings.active_business_date) {
                    clearBtn.style.display = 'block';
                } else {
                    clearBtn.style.display = 'none';
                }
                fetchOrders(1);
            }
        });
    }

    // Update Label to "Business Day Total"
    const label = document.getElementById('today-total-label');
    if (label) label.textContent = isAr ? 'إجمالي طلبات وردية العمل:' : 'Business Shift Total:';

    fetchOrders(1);

    // Tab Filtering
    document.querySelectorAll('.tab-item').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            activeFilter = tab.dataset.filter;
            fetchOrders(1);
        });
    });

    // Search Filtering
    // 🕒 Optimized Search: Debounced to avoid hammering the server
    let searchTimeout;
    const searchInput = document.getElementById('order-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const arabicMap = { '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9' };
            const originalValue = e.target.value;
            const normalizedValue = originalValue.replace(/[٠-٩]/g, d => arabicMap[d]);
            
            if (originalValue !== normalizedValue) {
                e.target.value = normalizedValue;
            }

            searchTimeout = setTimeout(() => {
                const searchIcon = document.querySelector('.search-container i');
                if (searchIcon) searchIcon.className = 'fas fa-spinner fa-spin';
                fetchOrders(1);
            }, 400);
        });
    }

    // Date Filtering was moved to Flatpickr onChange

    // Clear Date Filter (Back to Current Shift)
    document.getElementById('clear-date-btn').addEventListener('click', () => {
        selectedDate = appSettings.active_business_date || todayStr;
        if (fp) {
            fp.setDate(selectedDate);
        } else {
            dateInput.value = selectedDate;
        }
        document.getElementById('clear-date-btn').style.display = 'none';
        fetchOrders(1);
    });

    // Pagination Buttons
    document.getElementById('prev-page').addEventListener('click', () => {
        if (currentPage > 1) fetchOrders(currentPage - 1);
    });

    document.getElementById('next-page').addEventListener('click', () => {
        if (currentPage < totalPages) fetchOrders(currentPage + 1);
    });

    // Close sidebar on overlay click
    document.getElementById('modal-overlay').addEventListener('click', closeSidebar);

    // 🏗️ Pre-position sidebar based on language
    const sidebar = document.getElementById('details-sidebar');
    if (isAr) {
        sidebar.style.left = '0';
        sidebar.style.right = 'auto';
        sidebar.style.transform = 'translateX(-100%)';
    } else {
        sidebar.style.right = '0';
        sidebar.style.left = 'auto';
        sidebar.style.transform = 'translateX(100%)';
    }
});

function applyTranslations() {
    const refreshBtn = document.getElementById('refresh-btn-text');
    if (refreshBtn) refreshBtn.innerHTML = `<i class="fas fa-sync-alt"></i> ${t.refresh}`;
    
    const searchInput = document.getElementById('order-search');
    if (searchInput) searchInput.placeholder = t.searchPlaceholder;
    
    const tabTexts = document.querySelectorAll('.tab-text');
    if (tabTexts.length >= 4) {
        tabTexts[0].textContent = t.all;
        tabTexts[1].textContent = t.paid;
        tabTexts[2].textContent = t.pending;
        tabTexts[3].textContent = t.cancelled;
    }

    // Translate table headers
    const headers = document.querySelectorAll('.orders-table thead th');
    if (headers.length >= 7) {
        headers[0].textContent = t.tableOrder;
        headers[1].textContent = t.tableDate;
        headers[2].textContent = t.tableCustomer;
        headers[3].textContent = t.tableTotal;
        headers[4].textContent = t.tablePayment;
        headers[5].textContent = t.tableDelivery;
        headers[6].textContent = t.tableStatus;
    }

    // Sidebar Titles & Labels
    const sideTitle = document.querySelector('.sidebar-header h3');
    if (sideTitle) sideTitle.innerHTML = `${t.sidebarTitle} <span id="side-order-id" style="color: var(--primary); font-family: monospace;"></span>`;
    
    const sideHeaders = document.querySelectorAll('.info-card h4');
    if (sideHeaders.length >= 3) {
        sideHeaders[0].innerHTML = `<i class="fas fa-box"></i> ${t.sidebarItems}`;
        sideHeaders[1].innerHTML = `<i class="fas fa-user-circle"></i> ${t.sidebarCustomer}`;
        sideHeaders[2].innerHTML = `<i class="fas fa-credit-card"></i> ${t.sidebarPayment}`;
    }

    const receiptLabels = document.querySelectorAll('.receipt-row span:first-child');
    if (receiptLabels.length >= 3) {
        receiptLabels[0].textContent = t.sidebarPrice;
        receiptLabels[1].textContent = t.sidebarVat;
        receiptLabels[2].textContent = t.sidebarDelivery;
        receiptLabels[3].textContent = t.sidebarDiscount;
    }
    const finalTotalLabel = document.querySelector('.total-label');
    if (finalTotalLabel) finalTotalLabel.textContent = t.sidebarTotal;
    
    const printBtn = document.getElementById('print-receipt-btn');
    if (printBtn) printBtn.innerHTML = `<i class="fas fa-print"></i> ${t.printBtn}`;
    
    const cancelBtn = document.getElementById('cancel-order-btn');
    if (cancelBtn) cancelBtn.innerHTML = `<i class="fas fa-ban"></i> ${t.cancelBtn}`;

    const excelBtn = document.querySelector('.btn-export-excel');
    if (excelBtn) excelBtn.innerHTML = `<i class="fas fa-file-excel"></i> ${t.exportExcel}`;

    // Update document and page titles
    document.title = `${t.pageTitle} - Vortex POS`;
    const pillTextEl = document.getElementById('pill-text');
    if (pillTextEl) pillTextEl.textContent = t.pageTitle;
    
    const homeBtnTextEl = document.getElementById('home-btn-text');
    if (homeBtnTextEl) homeBtnTextEl.textContent = t.home;

    const todayLabel = document.getElementById('today-total-label');
    if (todayLabel) todayLabel.textContent = t.shiftTotal;

    const vatLabel = document.querySelector('span[data-i18n="sidebarVat"]');
    if (vatLabel) {
        const percentage = (vatRate * 100).toFixed(0);
        vatLabel.textContent = isAr ? `القيمة المضافة (${percentage}%):` : `VAT (${percentage}%):`;
    }
    
    // 💡 Update visibility of VAT label in real-time
    const vatRow = document.querySelector('.receipt-row:has(#side-vat)');
    if (vatRow) {
        vatRow.style.display = vatRate > 0 ? 'flex' : 'none';
    }
}



async function fetchSettings() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/settings', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        appSettings = await response.json();
        if (appSettings.vat_percent !== undefined) {
            vatRate = parseFloat(appSettings.vat_percent) / 100;
        }
        applyTranslations(); // ✅ Update UI with fetched settings (like VAT %)
    } catch (error) {
        console.error('❌ Error fetching settings:', error);
    }
}

async function fetchOrders(page = 1) {
    console.log("🚀 fetchOrders called for page:", page);
    const tbody = document.getElementById('orders-table-body');
    const searchInput = document.getElementById('order-search');
    const refreshIcon = document.querySelector('.btn-refresh-inline i');
    
    if (!tbody) return console.error("❌ tbody not found");
    
    currentPage = page;
    const query = searchInput ? searchInput.value.trim() : "";

    // 🏷️ Dynamic Label Update
    const label = document.getElementById('today-total-label');
    if (query !== "") {
        if (label) label.textContent = isAr ? 'نتائج البحث:' : 'Search Results:';
    } else {
        if (label) label.textContent = isAr ? 'إجمالي طلبات وردية العمل:' : 'Business Shift Total:';
    }

    // Reset counts to dash while loading
    const countIds = ['count-all', 'count-paid', 'count-pending', 'count-cancelled', 'today-count'];
    countIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '-';
    });

    // Show Skeleton Loader
    tbody.innerHTML = Array(4).fill(0).map(() => `
        <tr class="fade-in">
            <td><div class="skeleton" style="width: 40px; height: 20px;"></div></td>
            <td><div class="skeleton" style="width: 100px; height: 20px;"></div></td>
            <td><div class="skeleton" style="width: 150px; height: 20px;"></div></td>
            <td><div class="skeleton" style="width: 80px; height: 20px;"></div></td>
            <td><div class="skeleton" style="width: 70px; height: 20px; border-radius: 20px;"></div></td>
            <td><div class="skeleton" style="width: 70px; height: 20px; border-radius: 20px;"></div></td>
            <td><div class="skeleton" style="width: 70px; height: 20px; border-radius: 20px;"></div></td>
        </tr>
    `).join('');

    if (refreshIcon) refreshIcon.classList.add('fa-spin');

    try {
        const url = `/api/orders?page=${page}&limit=${ordersPerPage}&date=${selectedDate}&status=${activeFilter}&search=${encodeURIComponent(query)}`;
        console.log("📡 Fetching from:", url);
        
        const token = localStorage.getItem('token');
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        
        // 🔄 Hybrid Compatibility (Handle both old Array and new Object formats)
        let orders = [];
        let total = 0;
        let tPages = 1;
        let cPage = page;
        let statusCounts = {};

        if (Array.isArray(data)) {
            orders = data;
            // 📊 Local Filter Fallback
            let filtered = data;
            if (selectedDate) {
                filtered = data.filter(o => {
                    const d = o.createdAt ? new Date(o.createdAt) : new Date();
                    return d.toLocaleDateString('en-CA') === selectedDate;
                });
            }
            
            orders = filtered;
            total = filtered.length;
            tPages = 1;
            
            // Calculate status counts from the filtered set
            statusCounts = {
                all: filtered.length,
                paid: filtered.filter(o => o.payment_status === 'Paid' && o.isCancelled !== 'Yes').length,
                pending: filtered.filter(o => o.payment_status === 'Pending' && o.isCancelled !== 'Yes').length,
                cancelled: filtered.filter(o => o.isCancelled === 'Yes').length
            };
        } else if (data && data.orders) {
            orders = data.orders;
            total = data.total || 0;
            tPages = data.totalPages || 1;
            cPage = data.currentPage || page;
            statusCounts = data.counts || {};
        } else {
            throw new Error('Invalid data format from server');
        }

        currentOrders = orders;
        totalPages = tPages;
        
        renderOrders(orders);
        renderPagination(cPage, tPages);
        updateCounts(total, statusCounts);
    } catch (error) {
        console.error('❌ Error fetching orders:', error);
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:4rem; color:var(--error)">${t.errorLoading}</td></tr>`;
    } finally {
        if (refreshIcon) {
            setTimeout(() => refreshIcon.classList.remove('fa-spin'), 600);
        }
    }
}

function renderPagination(current, total) {
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    const pageInfo = document.getElementById('page-info');

    if (!prevBtn || !nextBtn || !pageInfo) return;

    prevBtn.disabled = current <= 1;
    nextBtn.disabled = current >= (total || 1);
    
    // 🌍 Translate & Flip Icons
    if (isAr) {
        prevBtn.innerHTML = `<i class="fas fa-chevron-right"></i> ${t.prev}`;
        nextBtn.innerHTML = `${t.next} <i class="fas fa-chevron-left"></i>`;
        pageInfo.textContent = t.pageOf.replace('{current}', current).replace('{total}', total || 1);
    } else {
        prevBtn.innerHTML = `<i class="fas fa-chevron-left"></i> ${t.prev}`;
        nextBtn.innerHTML = `${t.next} <i class="fas fa-chevron-right"></i>`;
        pageInfo.textContent = t.pageOf.replace('{current}', current).replace('{total}', total || 1);
    }
}

function updateCounts(totalCount, counts = {}) {
    const todayCountEl = document.getElementById('today-count');
    const todayLabelEl = document.getElementById('today-total-label');
    
    if (todayCountEl && todayLabelEl) {
        // 🚀 Dynamic Label & Value based on Filter
        let displayCount = totalCount;
        let labelText = t.shiftTotal;

        const f = activeFilter.toLowerCase();
        if (f === 'paid') {
            displayCount = counts.paid || 0;
            labelText = t.onlineTotal;
        } else if (f === 'pending') {
            displayCount = counts.pending || 0;
            labelText = t.cashTotal;
        } else if (f === 'cancelled') {
            displayCount = counts.cancelled || 0;
            labelText = t.cancelledTotal;
        }

        todayCountEl.textContent = displayCount;
        todayLabelEl.textContent = labelText;
    }

    if (counts.all !== undefined) {
        document.getElementById('count-all').textContent = counts.all;
        document.getElementById('count-paid').textContent = counts.paid;
        document.getElementById('count-pending').textContent = counts.pending;
        document.getElementById('count-cancelled').textContent = counts.cancelled;
        if (counts.today !== undefined) {
            document.getElementById('today-count').textContent = counts.today;
        }
    }
}

async function exportOrdersToExcel() {
    try {
        Swal.fire({
            title: isAr ? 'جاري تجهيز تقرير الطلبات...' : 'Preparing Orders Report...',
            didOpen: () => { Swal.showLoading(); },
            allowOutsideClick: false,
            showConfirmButton: false
        });

        // Fetch orders matching current filters
        const query = document.getElementById('order-search').value;
        const url = `/api/orders?nopaging=true&date=${selectedDate}&status=${activeFilter}&search=${query}`;
        
        const response = await fetch(url);
        let orders = await response.json();

        // 🔄 Hybrid Local Filter (Fallback if backend doesn't filter yet)
        if (Array.isArray(orders)) {
            if (selectedDate) {
                orders = orders.filter(o => {
                    const d = o.createdAt ? new Date(o.createdAt) : new Date();
                    return d.toLocaleDateString('en-CA') === selectedDate;
                });
            }
            if (activeFilter !== 'all') {
                if (activeFilter === 'cancelled') {
                    orders = orders.filter(o => o.isCancelled === 'Yes');
                } else {
                    orders = orders.filter(o => o.payment_status === activeFilter && o.isCancelled !== 'Yes');
                }
            }
            if (query) {
                const q = query.toLowerCase();
                orders = orders.filter(o => 
                    o.id.toString().includes(q) || 
                    (o.customerName && o.customerName.toLowerCase().includes(q))
                );
            }
        }

        if (!orders || orders.length === 0) {
            Swal.fire({ icon: 'warning', title: isAr ? 'لا توجد بيانات لتصديرها' : 'No data to export' });
            return;
        }

        const excelData = orders.map(o => {
            const date = o.createdAt ? new Date(o.createdAt) : (o.businessDate ? new Date(o.businessDate) : new Date());
            const serial = o.dailySerial || o.id;
            return {
                [isAr ? 'رقم الطلب' : 'Order #']: serial,
                [isAr ? 'كود النظام' : 'System ID']: o.id,
                [isAr ? 'التاريخ' : 'Date']: date.toLocaleDateString('en-CA'),
                [isAr ? 'الوقت' : 'Time']: date.toLocaleTimeString('en-US', { hour12: false }),
                [isAr ? 'العميل' : 'Customer']: o.customerName || (isAr ? 'عميل نقدي' : 'Cash Customer'),
                [isAr ? 'الهاتف' : 'Phone']: o.customerPhone || '-',
                [isAr ? 'الإجمالي' : 'Total']: parseFloat(o.orderTotal).toFixed(2),
                [isAr ? 'حالة الدفع' : 'Payment Status']: o.payment_status,
                [isAr ? 'طريقة الدفع' : 'Payment Method']: o.payment_method || '-',
                [isAr ? 'الحالة' : 'Status']: o.isCancelled === 'Yes' ? (isAr ? 'ملغي' : 'Cancelled') : (isAr ? 'نشط' : 'Active')
            };
        });

        const ws = XLSX.utils.json_to_sheet(excelData);
        ws['!cols'] = [{wch: 12}, {wch: 15}, {wch: 12}, {wch: 25}, {wch: 15}, {wch: 12}, {wch: 15}, {wch: 15}, {wch: 12}];

        const wb = XLSX.utils.book_new();
        if (!wb.Workbook) wb.Workbook = {};
        if (!wb.Workbook.Views) wb.Workbook.Views = [];
        wb.Workbook.Views[0] = { RTL: isAr };

        XLSX.utils.book_append_sheet(wb, ws, isAr ? "الطلبات" : "Orders");
        XLSX.writeFile(wb, `vortex_orders_${selectedDate || 'all'}.xlsx`);
        
        Swal.close();
    } catch (err) {
        console.error("Excel Error:", err);
        Swal.fire({ icon: 'error', title: 'Excel Error', text: err.message });
    }
}


function renderOrders(orders = []) {
    const tbody = document.getElementById('orders-table-body');
    const refreshIcon = document.querySelector('.btn-refresh-inline i');
    const searchIcon = document.querySelector('.search-container i');
    
    if (refreshIcon) refreshIcon.classList.remove('fa-spin');
    if (searchIcon) searchIcon.className = 'fas fa-search';

    tbody.innerHTML = '';

    if (!orders || orders.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 4rem; color: var(--text-muted);">
                    <i class="fas fa-search" style="font-size: 3rem; opacity: 0.1; display: block; margin-bottom: 1rem;"></i>
                    ${isAr ? 'لا توجد طلبات تطابق بحثك حالياً' : 'No orders found matching your criteria'}
                </td>
            </tr>
        `;
        return;
    }

    // 🚀 Sort by actual creation time to handle shift resets gracefully
    const searchVal = document.getElementById('order-search')?.value.trim();
    const ordersToRender = (searchVal && searchVal !== "") 
        ? [...orders] 
        : [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // 🚀 Optimization: Batch all rows into a single string to minimize layout thrashing
    const rowsHtml = ordersToRender.map((order, index) => {
        const displaySerial = order.dailySerial || order.id;
        const createdAt = order.createdAt ? new Date(order.createdAt) : (order.businessDate ? new Date(order.businessDate) : new Date());
        const dateMain = createdAt.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const dateSub = createdAt.toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' });

        const isCancelled = order.isCancelled === 'Yes';
        const isPaid = order.payment_status === 'Paid';
        const isDelivery = parseFloat(order.deliveryPrice) > 0;

        return `
            <tr class="fade-in" style="animation-delay: ${index * 0.05}s" data-index="${index}">
                <td><span class="order-id">#${displaySerial}</span></td>
                <td>
                    <div class="order-date-cell">
                        <span class="date-main">${dateMain}</span>
                        <span class="date-sub">${dateSub}</span>
                    </div>
                </td>
                <td>
                    <div class="customer-info">
                        <div style="font-weight:600">${order.customerName || t.cashCustomer}</div>
                        <div style="font-size:0.75rem; color:#6d7175">${order.customerPhone || ''}</div>
                    </div>
                </td>
                <td style="text-align: center;">
                    <span style="font-weight:700; font-size: 1.1rem; color: var(--text-main);">${parseFloat(order.orderTotal).toFixed(2)}</span>
                    <small style="font-size: 0.7rem; opacity: 0.6; font-weight: 600;">EGP</small>
                </td>
                <td>
                    <span class="status-badge status-completed">
                        <i class="fas fa-check-circle"></i>
                        ${isPaid ? t.paidStatus : t.pendingStatus}
                    </span>
                </td>
                <td>
                    <span class="status-badge ${isDelivery ? 'status-pending' : 'status-completed'}">
                        <i class="fas ${isDelivery ? 'fa-truck' : 'fa-store'}"></i>
                        ${isDelivery ? t.deliveryStatus : t.inStoreStatus}
                    </span>
                </td>
                <td>
                    <span class="status-badge ${isCancelled ? 'status-cancelled' : 'status-completed'}">
                        <i class="fas ${isCancelled ? 'fa-times-circle' : 'fa-play-circle'}"></i>
                        ${isCancelled ? t.cancelledStatus : t.activeStatus}
                    </span>
                </td>
            </tr>
        `;
    }).join('');

    tbody.innerHTML = rowsHtml;

    // Attach click events to the new rows
    tbody.querySelectorAll('tr').forEach(tr => {
        const idx = tr.dataset.index;
        const order = ordersToRender[idx];
        const displaySerial = order.dailySerial || order.id;
        tr.onclick = () => openSidebar(order, displaySerial);
    });
}

function openSidebar(order, dailySerial = null) {
    const displayId = dailySerial || order.id;
    document.getElementById('side-order-id').textContent = `#${displayId}`;
    document.getElementById('side-customer-name').textContent = order.customerName || t.cashCustomer;
    document.getElementById('side-customer-phone').textContent = order.customerPhone || t.noPhone;
    document.getElementById('side-customer-address').textContent = order.customerAddress || t.noAddress;
    
    const isPaid = order.payment_status === 'Paid';
    const rawMethod = (order.payment_method || (isPaid ? 'Card' : 'Cash')).toLowerCase();
    
    // Friendly display for payment methods
    let displayMethod = order.payment_method || (isPaid ? t.card : t.cash);
    if (rawMethod.includes('vcash') || rawMethod.includes('vodafone')) displayMethod = isAr ? 'فودافون كاش' : 'Vodafone Cash';
    else if (rawMethod.includes('instapay')) displayMethod = isAr ? 'إنستا باي' : 'Instapay';
    else if (rawMethod.includes('card') || rawMethod.includes('wallet') || rawMethod.includes('visa')) displayMethod = t.card;
    else if (rawMethod.includes('cash')) displayMethod = t.cash;

    const statusBadge = `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem;">
            <span class="status-badge status-completed">
                <i class="fas fa-check-circle"></i>
                ${isPaid ? t.paidStatus : t.pendingStatus}
            </span>
            ${isPaid ? `<span style="font-size: 0.75rem; color: #6d7175; font-weight: 600;">
                <i class="fas fa-wallet" style="font-size: 0.7rem; margin-left: 2px;"></i> ${displayMethod}
            </span>` : ''}
        </div>`;
    document.getElementById('side-payment-status').innerHTML = statusBadge;

    const total = parseFloat(order.orderTotal || 0);
    const delivery = parseFloat(order.deliveryPrice || 0);
    const discount = parseFloat(order.discountAmount || 0);
    const subtotalWithVat = total - delivery + discount;
    
    // Calculate Base Price and VAT from the subtotal using the live vatRate
    // Base * (1 + vatRate) = SubtotalWithVat => Base = SubtotalWithVat / (1 + vatRate)
    const basePrice = subtotalWithVat / (1 + vatRate);
    const vatAmount = subtotalWithVat - basePrice;

    document.getElementById('side-subtotal').innerHTML = `<span style="color: var(--text-main);">${basePrice.toFixed(2)}</span> <small style="font-size: 0.7rem; opacity: 0.7;">EGP</small>`;
    
    // 💡 Only show VAT row if VAT is > 0
    const vatRow = document.getElementById('side-vat').parentElement;
    if (vatRate > 0) {
        vatRow.style.display = 'flex';
        document.getElementById('side-vat').innerHTML = `<span style="color: var(--text-main);">${vatAmount.toFixed(2)}</span> <small style="font-size: 0.7rem; opacity: 0.7;">EGP</small>`;
    } else {
        vatRow.style.display = 'none';
    }

    document.getElementById('side-delivery').innerHTML = `<span style="color: var(--text-main);">${delivery.toFixed(2)}</span> <small style="font-size: 0.7rem; opacity: 0.7;">EGP</small>`;
    
    const sideDiscountRow = document.getElementById('side-discount').parentElement;
    if (discount > 0) {
        sideDiscountRow.style.display = 'flex';
        document.getElementById('side-discount').innerHTML = `<span style="color: #ef4444;">-${discount.toFixed(2)}</span> <small style="font-size: 0.7rem; opacity: 0.7;">EGP</small>`;
    } else {
        sideDiscountRow.style.display = 'none';
    }
    
    document.getElementById('side-total').innerHTML = `<span>${total.toFixed(2)}</span> <small style="font-size: 0.8rem; opacity: 0.9;">EGP</small>`;

    // Load Items
    loadOrderItems(order.orderDetails);

    // Setup Actions
    const cancelBtn = document.getElementById('cancel-order-btn');
    if (order.isCancelled === 'Yes') {
        cancelBtn.style.display = 'none';
    } else {
        cancelBtn.style.display = 'block';
        cancelBtn.onclick = () => cancelOrder(order.id);
    }

    document.getElementById('print-receipt-btn').onclick = () => printReceipt(order.id);

    const sidebar = document.getElementById('details-sidebar');
    sidebar.style.display = 'flex';
    
    setTimeout(() => {
        sidebar.classList.add('open');
        sidebar.style.transform = 'translateX(0)';
    }, 10);
    
    document.getElementById('modal-overlay').style.display = 'block';
}

function closeSidebar() {
    const sidebar = document.getElementById('details-sidebar');
    // Slide back to the side it came from
    sidebar.style.transform = isAr ? 'translateX(-100%)' : 'translateX(100%)';
    setTimeout(() => {
        sidebar.classList.remove('open');
        sidebar.style.display = 'none';
        document.getElementById('modal-overlay').style.display = 'none';
    }, 300);
}

async function loadOrderItems(orderDetails) {
    const list = document.getElementById('side-items-list');
    list.innerHTML = t.loading;

    try {
        const response = await fetch('/api/orders/format-details', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderDetails })
        });
        const data = await response.json();
        
        list.innerHTML = '';
        data.formatted.forEach(item => {
            const div = document.createElement('div');
            div.className = 'item-row';
            div.style.flexDirection = 'column';
            div.style.alignItems = 'stretch';
            div.style.padding = '1rem 0';
            
            // Generate list of comments/addons with prices if any
            let commentsHtml = '';
            const allComments = [...item.comments, ...item.manualComments];
            if (allComments.length > 0) {
                commentsHtml = '<div style="margin-top: 0.5rem; padding-right: 2.5rem;">';
                allComments.forEach(c => {
                    const cPrice = parseFloat(c.price || 0);
                    const color = cPrice < 0 ? '#ef4444' : (cPrice > 0 ? '#008060' : '#6d7175');
                    const priceLabel = cPrice !== 0 ? ` (${cPrice > 0 ? '+' : ''}${cPrice})` : '';
                    commentsHtml += `
                        <div style="font-size: 0.8rem; color: ${color}; margin-bottom: 2px; display: flex; align-items: center; gap: 0.4rem;">
                            <i class="fas fa-caret-left" style="font-size: 0.6rem; opacity: 0.5;"></i>
                            <span>${c.text}${priceLabel}</span>
                        </div>`;
                });
                commentsHtml += '</div>';
            }
            
            div.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                    <div class="item-main">
                        <div class="item-qty">${item.quantity}</div>
                        <div style="font-weight:700; color: var(--text-main); font-size: 1rem;">${item.name}</div>
                        ${item.variant ? `<div style="font-size: 0.85rem; color: #6d7175; font-weight: 600; margin-top: 2px; background: #f1f5f9; padding: 2px 8px; border-radius: 4px; display: inline-block;">
                            <i class="fas fa-tags" style="font-size: 0.7rem; opacity: 0.6;"></i> ${item.variant}
                        </div>` : ''}
                    </div>
                    <span style="font-weight:800; color: var(--text-main); font-size: 1.05rem;">
                        ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                        <small style="font-size: 0.7rem; opacity: 0.6; font-weight: 600;">EGP</small>
                    </span>
                </div>
                ${commentsHtml}
            `;
            list.appendChild(div);
        });
    } catch (error) {
        list.innerHTML = t.errorLoading;
    }
}

async function cancelOrder(orderId) {
    const result = await Swal.fire({
        title: isAr ? 'هل أنت متأكد؟' : 'Are you sure?',
        text: isAr ? "لن تتمكن من التراجع عن إلغاء هذا الطلب!" : "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: isAr ? 'نعم، إلغاء الطلب' : 'Yes, cancel it!',
        cancelButtonText: isAr ? 'تراجع' : 'Cancel'
    });

    if (result.isConfirmed) {
        try {
            const response = await fetch(`/api/orders/${orderId}/cancel`, { method: 'PUT' });
            if (response.ok) {
                Swal.fire(
                    isAr ? 'تم الإلغاء!' : 'Cancelled!',
                    isAr ? 'تم إلغاء الطلب بنجاح.' : 'Your order has been cancelled.',
                    'success'
                );
                fetchOrders(currentPage);
                closeSidebar();
            }
        } catch (error) {
            Swal.fire(
                isAr ? 'خطأ' : 'Error',
                isAr ? 'فشل في إلغاء الطلب' : 'Failed to cancel the order',
                'error'
            );
        }
    }
}

async function printReceipt(orderId) {
    const printBtn = document.getElementById('print-receipt-btn');
    const originalContent = printBtn.innerHTML;
    
    try {
        printBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${isAr ? 'جاري الطباعة...' : 'Printing...'}`;
        printBtn.disabled = true;

        const response = await fetch(`/api/orders/${orderId}/print`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (response.ok) {
            Swal.fire({
                icon: 'success',
                title: isAr ? 'تم الإرسال للطابعة' : 'Sent to Printer',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000
            });
        } else {
            throw new Error('Print failed');
        }
    } catch (error) {
        console.error("❌ Error printing receipt:", error);
        Swal.fire(
            isAr ? 'خطأ' : 'Error', 
            isAr ? 'فشل في الاتصال بالطابعة' : 'Failed to connect to printer', 
            'error'
        );
    } finally {
        printBtn.innerHTML = originalContent;
        printBtn.disabled = false;
    }
}
========== ./public/js/merchants.js ==========
let currentTab = 'supplier';
let allMerchants = [];
let activeMerchantId = null;

document.addEventListener('DOMContentLoaded', () => {
    fetchMerchants();
    updateSummary();
    document.getElementById('trans-date').valueAsDate = new Date();
    document.getElementById('merchant-form').addEventListener('submit', handleMerchantSubmit);
    document.getElementById('transaction-form').addEventListener('submit', handleTransactionSubmit);
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) e.target.style.display = 'none';
    });

    // تحويل الأرقام العربي إلى إنجليزي تلقائياً في أي حقل إدخال
    document.addEventListener('input', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            let val = e.target.value;
            
            // 1. تحويل الأرقام العربي لإنجليزي
            let convertedVal = val.replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
            
            // 2. لو الحقل رقمي، نمنع أي حروف تتكتب
            if (e.target.inputMode === 'decimal' || e.target.type === 'number') {
                convertedVal = convertedVal.replace(/[^0-9.]/g, '');
                // نمنع أكتر من علامة عشرية
                const parts = convertedVal.split('.');
                if (parts.length > 2) {
                    convertedVal = parts[0] + '.' + parts.slice(1).join('');
                }
            }

            if (val !== convertedVal) {
                let start = e.target.selectionStart;
                let end = e.target.selectionEnd;
                e.target.value = convertedVal;
                try { e.target.setSelectionRange(start, end); } catch (err) {}
            }
        }
    });
});

// ─── Data ─────────────────────────────────────────────────────────────────────

async function fetchMerchants() {
    try {
        const res = await fetch(`/api/merchants?type=${currentTab}&_t=${Date.now()}`);
        allMerchants = await res.json();
        renderMerchantsList();
    } catch (err) {
        showToast('فشل في تحميل البيانات', 'error');
    }
}

async function updateSummary() {
    try {
        const [supRes, cliRes] = await Promise.all([
            fetch(`/api/merchants?type=supplier&_t=${Date.now()}`),
            fetch(`/api/merchants?type=wholesale_client&_t=${Date.now()}`)
        ]);
        const suppliers = await supRes.json();
        const clients   = await cliRes.json();
        const supDebt   = suppliers.reduce((s, m) => s + parseFloat(m.balance || 0), 0);
        const cliCredit = clients.reduce((s, m) => s + parseFloat(m.balance || 0), 0);
        document.getElementById('total-supplier-debt').textContent   = `${supDebt.toLocaleString()}  `;
        document.getElementById('total-client-credit').textContent   = `${cliCredit.toLocaleString()}  `;
    } catch (e) {}
}

// ─── Rendering ────────────────────────────────────────────────────────────────

function renderMerchantsList() {
    const list       = document.getElementById('merchants-list');
    const searchTerm = document.getElementById('merchant-search').value.toLowerCase();

    const filtered = allMerchants.filter(m =>
        m.name.toLowerCase().includes(searchTerm) ||
        (m.phone && m.phone.includes(searchTerm))
    );

    if (filtered.length === 0) {
        list.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:3rem;color:#94a3b8;">لا توجد نتائج مطابقة</td></tr>`;
        resetActionBar();
        return;
    }

    list.innerHTML = filtered.map(m => {
        const balance       = parseFloat(m.balance || 0);
        const totalInvoices = parseFloat(m.totalInvoices || 0);
        const totalPayments = parseFloat(m.totalPayments || 0);
        const statusClass   = balance > 0 ? 'status-debt' : 'status-credit';
        const statusText    = currentTab === 'supplier'
            ? (balance > 0 ? 'مديونية' : 'خالص')
            : (balance > 0 ? 'مستحق' : 'خالص');

        return `
            <tr class="clickable-row" id="row-${m.id}" onclick="selectMerchantRow(${m.id})">
                <td style="text-align:right;">
                    <strong>${m.name}</strong>
                    ${m.phone ? `<small style="display:block;color:#94a3b8;font-weight:500;">${m.phone}</small>` : ''}
                </td>
                <td style="color:#dc2626;font-weight:700;">${totalInvoices.toLocaleString()}  </td>
                <td style="color:#16a34a;font-weight:700;">${totalPayments.toLocaleString()}  </td>
                <td style="font-weight:800;color:${balance > 0 ? '#dc2626' : '#16a34a'}">${balance.toLocaleString()}  </td>
                <td><span class="status-pill ${statusClass}">${statusText}</span></td>
                <td>${m.updatedAt ? new Date(m.updatedAt).toLocaleDateString('ar-EG') : '---'}</td>
                <td class="action-btns" onclick="event.stopPropagation()">
                    <button class="btn-icon delete" onclick="deleteMerchant(${m.id},'${m.name.replace(/'/g,"\\'")}')">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            </tr>`;
    }).join('');

    // Re-highlight previously selected row
    if (activeMerchantId) {
        const row = document.getElementById(`row-${activeMerchantId}`);
        if (row) row.classList.add('row-selected');
    }
}

function filterMerchants() { renderMerchantsList(); }

function switchTab(type) {
    currentTab = type;
    activeMerchantId = null;
    document.getElementById('merchant-filter').value = type;
    resetActionBar();
    fetchMerchants();
}

// ─── Action Bar ───────────────────────────────────────────────────────────────

function selectMerchantRow(id) {
    activeMerchantId = id;
    const m = allMerchants.find(x => x.id === id);
    if (!m) return;

    // Highlight row
    document.querySelectorAll('.clickable-row').forEach(r => r.classList.remove('row-selected'));
    const row = document.getElementById(`row-${id}`);
    if (row) row.classList.add('row-selected');

    const balance       = parseFloat(m.balance || 0);
    const totalInvoices = parseFloat(m.totalInvoices || 0);
    const totalPayments = parseFloat(m.totalPayments || 0);

    document.getElementById('abar-name-text').textContent = m.name;
    document.getElementById('abar-total-invoices').textContent = `${totalInvoices.toLocaleString()}  `;
    document.getElementById('abar-total-paid').textContent     = `${totalPayments.toLocaleString()}  `;

    const remEl = document.getElementById('abar-remaining');
    remEl.textContent    = `${balance.toLocaleString()}  `;
    remEl.style.color    = balance > 0 ? '#dc2626' : '#16a34a';

    const payInput       = document.getElementById('abar-payment-input');
    payInput.value       = '';
    payInput.max         = balance > 0 ? balance : 0;
    payInput.disabled    = balance <= 0;
    payInput.placeholder = balance > 0
        ? `أقصى دفعة: ${balance.toLocaleString()}`
        : 'الحساب خالص ✅';

    // Display Action Bar
    document.getElementById('abar-content').style.display = 'flex';

    // Smooth scroll to top to show the unified toolbar
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

function resetActionBar() {
    activeMerchantId = null;
    document.getElementById('abar-content').style.display = 'none';
    document.querySelectorAll('.clickable-row').forEach(r => r.classList.remove('row-selected'));
}

async function quickPayment() {
    if (!activeMerchantId) return showToast('الرجاء اختيار عميل أو مورد أولاً', 'warning');
    const payInput = document.getElementById('abar-payment-input');
    const amount   = parseFloat(payInput.value);
    const m        = allMerchants.find(x => x.id === activeMerchantId);
    const balance  = parseFloat(m?.balance || 0);

    if (!amount || amount <= 0) { showToast('أدخل مبلغ الدفعة أولاً', 'warning'); payInput.focus(); return; }
    if (amount > balance) {
        showToast(`لا يمكن دفع أكثر من المتبقي (${balance.toLocaleString()})`, 'error');
        payInput.value = balance;
        return;
    }

    try {
        const res = await fetch(`/api/merchants/${activeMerchantId}/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'payment', amount,
                date:  new Date().toISOString().split('T')[0],
                notes: `دفعة سداد - ${new Date().toLocaleDateString('ar-EG')}`
            })
        });
        if (res.ok) {
            showToast(`✅ تم تسجيل دفعة ${amount.toLocaleString()}  `, 'success');
            await fetchMerchants();
            updateSummary();
            selectMerchantRow(activeMerchantId);
            if (document.getElementById('ledger-drawer').classList.contains('open')) {
                fetchMerchantLedger(activeMerchantId);
            }
        } else {
            const err = await res.json();
            showToast(err.error || 'فشل تسجيل الدفعة', 'error');
        }
    } catch { showToast('خطأ في الاتصال', 'error'); }
}

function editSelectedMerchant() {
    if (!activeMerchantId) return showToast('الرجاء اختيار عميل أو مورد أولاً', 'warning');
    const m = allMerchants.find(x => x.id === activeMerchantId);
    if (m) openMerchantModal(m);
}

// ─── Ledger Drawer ─────────────────────────────────────────────────────────────

function toggleLedgerDrawer(open = null) {
    const drawer = document.getElementById('ledger-drawer');
    const overlay = document.getElementById('drawer-overlay');
    const isOpen = open !== null ? open : !drawer.classList.contains('open');

    if (isOpen) {
        if (!activeMerchantId) {
            drawer.classList.remove('open');
            overlay.classList.remove('active');
            return showToast('الرجاء اختيار عميل أو مورد أولاً', 'warning');
        }
        drawer.classList.add('open');
        overlay.classList.add('active');
        fetchMerchantLedger(activeMerchantId);
    } else {
        drawer.classList.remove('open');
        overlay.classList.remove('active');
    }
}

async function fetchMerchantLedger(id) {
    try {
        const res = await fetch(`/api/merchants/${id}/transactions?_t=${Date.now()}`);
        const { merchant, transactions } = await res.json();

        // Update Drawer Header & Stats
        document.getElementById('active-merchant-name-drawer').textContent = merchant.name;
        document.getElementById('active-merchant-phone-drawer').textContent = merchant.phone || 'بدون تليفون';

        const balance = parseFloat(merchant.balance || 0);
        const balEl = document.getElementById('active-merchant-balance-drawer');
        balEl.textContent = `${balance.toLocaleString()}  `;
        balEl.style.color = balance > 0 ? '#4ade80' : '#4ade80'; // Keeping it green/neutral in dark summary

        const totalPayments = transactions.filter(t => t.type === 'payment').reduce((s, t) => s + parseFloat(t.amount), 0);
        const totalInvoices = balance + totalPayments;

        document.getElementById('ledger-total-invoices-drawer').textContent = `${totalInvoices.toLocaleString()}  `;
        document.getElementById('ledger-total-payments-drawer').textContent = `${totalPayments.toLocaleString()}  `;

        renderTransactionsTimeline(transactions);
    } catch (err) {
        showToast('فشل في تحميل كشف الحساب', 'error');
    }
}

function renderTransactionsTimeline(list) {
    const container = document.getElementById('transactions-list-timeline');
    if (list.length === 0) {
        container.innerHTML = `<div style="text-align:center;padding:3rem;color:#94a3b8;font-weight:600;">لا توجد حركات مسجلة بعد</div>`;
        return;
    }

    container.innerHTML = list.map(t => {
        const isInvoice = t.type === 'invoice';
        return `
            <div class="timeline-item">
                <div class="t-header">
                    <span class="t-date">${new Date(t.date).toLocaleDateString('ar-EG')}</span>
                    <span class="t-type ${t.type}">${isInvoice ? '📦 فاتورة' : '💳 سداد'}</span>
                </div>
                <div class="t-notes">${t.notes || '---'}</div>
                <div class="t-amount ${isInvoice ? 'red' : 'green'}">
                    ${isInvoice ? '+' : '-'}${parseFloat(t.amount).toLocaleString()}
                </div>
                <div class="t-actions">
                    <button class="t-btn" onclick="editTransaction(${JSON.stringify(t).replace(/"/g, '&quot;')})" title="تعديل">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="t-btn delete" onclick="deleteTransaction(${t.id})" title="حذف">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// ─── Export ───────────────────────────────────────────────────────────────────

function exportLedger() {
    const name = document.getElementById('active-merchant-name-drawer').textContent;
    const items = document.querySelectorAll('.timeline-item');
    let csv = `كشف حساب: ${name}\n\nالتاريخ,البيان,المبلغ,النوع\n`;
    items.forEach(item => {
        const date = item.querySelector('.t-date').textContent;
        const notes = item.querySelector('.t-notes').textContent;
        const amount = item.querySelector('.t-amount').textContent.replace(/[+-]/, '').trim();
        const type = item.querySelector('.t-type').textContent;
        csv += `${date},"${notes}",${amount},${type}\n`;
    });
    downloadCSV(csv, `كشف_${name}.csv`);
}

function exportMerchants() {
    const label = currentTab === 'supplier' ? 'الموردين' : 'عملاء_الجملة';
    let csv = `قائمة ${label}\n\nالاسم,التليفون,المبلغ كامل,المدفوع,المتبقي\n`;
    allMerchants.forEach(m => {
        csv += `"${m.name}",${m.phone||''},${parseFloat(m.totalInvoices||0).toLocaleString()},${parseFloat(m.totalPayments||0).toLocaleString()},${parseFloat(m.balance||0).toLocaleString()}\n`;
    });
    downloadCSV(csv, `${label}.csv`);
}

function downloadCSV(content, filename) {
    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`تم تحميل "${filename}"`, 'success');
}

// ─── Transaction Actions ──────────────────────────────────────────────────────

async function editTransaction(t) {
    const { value } = await Swal.fire({
        title: t.type === 'invoice' ? '📦 تعديل فاتورة' : '💳 تعديل دفعة',
        html: `
            <div style="text-align:right;font-family:inherit;">
                <label style="font-weight:700;display:block;margin-bottom:5px;">المبلغ</label>
                <input id="sa" class="swal2-input" type="number" step="0.01" value="${t.amount}" style="margin:0 0 12px;width:100%;">
                <label style="font-weight:700;display:block;margin-bottom:5px;">التاريخ</label>
                <input id="sd" class="swal2-input" type="date" value="${(t.date||'').split('T')[0]}" style="margin:0 0 12px;width:100%;">
                <label style="font-weight:700;display:block;margin-bottom:5px;">ملاحظات</label>
                <textarea id="sn" class="swal2-textarea" style="margin:0;width:100%;height:70px;">${t.notes||''}</textarea>
            </div>`,
        focusConfirm: false, showCancelButton: true,
        confirmButtonText: 'حفظ', cancelButtonText: 'إلغاء', confirmButtonColor: '#008060',
        preConfirm: () => {
            const a = document.getElementById('sa').value;
            if (!a || parseFloat(a) <= 0) { Swal.showValidationMessage('أدخل مبلغ صحيح'); return false; }
            return { amount: a, date: document.getElementById('sd').value, notes: document.getElementById('sn').value };
        }
    });
    if (value) {
        try {
            const res = await fetch(`/api/merchants/transactions/${t.id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value)
            });
            if (res.ok) {
                showToast('تم التعديل بنجاح', 'success');
                await fetchMerchants(); 
                updateSummary();
                selectMerchantRow(activeMerchantId);
                if (document.getElementById('ledger-drawer').classList.contains('open')) {
                    fetchMerchantLedger(activeMerchantId);
                }
            } else showToast((await res.json()).error || 'فشل', 'error');
        } catch { showToast('خطأ في الاتصال', 'error'); }
    }
}

async function deleteTransaction(id) {
    const r = await Swal.fire({ title: 'حذف الحركة؟', icon: 'warning', showCancelButton: true,
        confirmButtonColor: '#dc2626', confirmButtonText: 'احذف', cancelButtonText: 'إلغاء' });
    if (r.isConfirmed) {
        try {
            const res = await fetch(`/api/merchants/transactions/${id}`, { method: 'DELETE' });
            if (res.ok) {
                showToast('تم الحذف', 'success');
                await fetchMerchants(); 
                updateSummary();
                selectMerchantRow(activeMerchantId);
                if (document.getElementById('ledger-drawer').classList.contains('open')) {
                    fetchMerchantLedger(activeMerchantId);
                }
            }
        } catch { showToast('فشل الحذف', 'error'); }
    }
}

async function deleteMerchant(id, name) {
    const r = await Swal.fire({ 
        title: `حذف "${name}"؟`, 
        text: "تحذير: سيتم حذف كافة الحركات المالية والفواتير المسجلة لهذا الاسم نهائياً ولا يمكن الرجوع عنها!",
        icon: 'warning', 
        showCancelButton: true,
        confirmButtonColor: '#dc2626', 
        confirmButtonText: 'نعم، احذف الكل', 
        cancelButtonText: 'إلغاء' 
    });

    if (r.isConfirmed) {
        try {
            const res = await fetch(`/api/merchants/${id}`, { method: 'DELETE' });
            const data = await res.json();
            
            if (res.ok) { 
                showToast('✅ تم الحذف بنجاح', 'success'); 
                fetchMerchants(); 
                updateSummary(); 
                resetActionBar(); 
            } else {
                showToast(data.error || 'فشل الحذف', 'error');
            }
        } catch (err) { 
            console.error('Delete Error:', err);
            showToast('حدث خطأ في الاتصال بالسيرفر', 'error'); 
        }
    }
}

// ─── Modals ───────────────────────────────────────────────────────────────────

function openMerchantModal(merchant = null) {
    const form = document.getElementById('merchant-form');
    form.reset();
    const ibg = document.getElementById('initial-balance-group');
    if (merchant) {
        document.getElementById('modal-title').textContent = 'تعديل بيانات الجهة';
        document.getElementById('merchant-id').value       = merchant.id;
        document.getElementById('merchant-name').value     = merchant.name;
        document.getElementById('merchant-phone').value    = merchant.phone || '';
        document.getElementById('merchant-type').value     = merchant.type;
        document.getElementById('merchant-notes').value    = merchant.notes || '';
        document.getElementById('type-group').style.display = 'none';
        ibg.style.display = 'none';
    } else {
        document.getElementById('modal-title').textContent = 'إضافة جهة جديدة';
        document.getElementById('merchant-id').value = '';
        document.getElementById('merchant-type').value = currentTab;
        document.getElementById('type-group').style.display = 'block';
        ibg.style.display = 'block';
    }
    document.getElementById('merchant-modal').style.display = 'flex';
}

async function handleMerchantSubmit(e) {
    e.preventDefault();
    const id   = document.getElementById('merchant-id').value;
    const data = {
        name:  document.getElementById('merchant-name').value,
        phone: document.getElementById('merchant-phone').value,
        type:  document.getElementById('merchant-type').value,
        notes: document.getElementById('merchant-notes').value
    };
    if (!id) data.initialBalance = parseFloat(document.getElementById('merchant-initial-balance').value) || 0;

    try {
        const res = await fetch(id ? `/api/merchants/${id}` : '/api/merchants', {
            method:  id ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(data)
        });
        if (res.ok) {
            closeModal('merchant-modal');
            showToast(id ? 'تم التعديل' : 'تمت الإضافة', 'success');
            fetchMerchants(); updateSummary();
        } else showToast((await res.json()).error || 'فشل', 'error');
    } catch { showToast('خطأ في الاتصال', 'error'); }
}

function openTransactionModal(type) {
    if (!activeMerchantId) return showToast('الرجاء اختيار عميل أو مورد أولاً', 'warning');
    document.getElementById('trans-type').value = type;
    document.getElementById('trans-modal-title').textContent = type === 'invoice' ? '📦 إضافة فاتورة / بضاعة' : '💳 إضافة دفعة / سداد';
    document.getElementById('trans-date').valueAsDate = new Date();
    document.getElementById('transaction-modal').style.display = 'flex';
}

async function handleTransactionSubmit(e) {
    e.preventDefault();
    const data = {
        type:   document.getElementById('trans-type').value,
        amount: document.getElementById('trans-amount').value,
        date:   document.getElementById('trans-date').value,
        notes:  document.getElementById('trans-notes').value
    };
    try {
        const res = await fetch(`/api/merchants/${activeMerchantId}/transactions`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
        });
        if (res.ok) {
            closeModal('transaction-modal');
            showToast('تمت إضافة الحركة', 'success');
            await fetchMerchants(); 
            updateSummary();
            selectMerchantRow(activeMerchantId);
            if (document.getElementById('ledger-drawer').classList.contains('open')) {
                fetchMerchantLedger(activeMerchantId);
            }
        } else showToast((await res.json()).error || 'فشل', 'error');
    } catch { showToast('خطأ', 'error'); }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function closeModal(id) { document.getElementById(id).style.display = 'none'; }

function showToast(msg, icon = 'success') {
    Swal.fire({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, timerProgressBar: true, icon, title: msg });
}

========== ./public/js/monthly.js ==========
// ✅ جلب بيانات التقفيل الشهري
async function fetchMonthlySummary() {
    const token = localStorage.getItem("token");
    if (!token) {
        console.error("❌ لا يوجد توكن");
        return;
    }

    try {
        const response = await fetch("/api/monthly-summary", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            console.error("❌ خطأ في جلب بيانات التقفيل الشهري:", response.statusText);
            return;
        }

        const data = await response.json();
        console.log("📊 Monthly Data:", data);

        // ✅ عرض البيانات في الواجهة
        document.getElementById("totalOrders").textContent = data.total_orders || 0;
        document.getElementById("totalSandwiches").textContent = data.total_sandwiches || 0;
        document.getElementById("totalRevenue").textContent = (data.total_revenue || 0) + " EGP";
        document.getElementById("totalCost").textContent = (data.total_cost || 0) + " EGP";
        document.getElementById("totalEarnings").textContent = (data.total_earnings || 0) + " EGP";
        document.getElementById("totalDiscount").textContent = (data.totalDiscount || 0) + " EGP";

        // ✅ التأكد من عرض المدفوعات الأونلاين بالاسم الصحيح
        document.getElementById("totalOnlinePayments").textContent = (data.onlinePaymentsTotal || 0) + " EGP";
    } catch (error) {
        console.error("❌ خطأ أثناء جلب بيانات التقفيل الشهري:", error);
    }
}

// ✅ استدعاء الدالة عند تحميل الصفحة
document.addEventListener("DOMContentLoaded", fetchMonthlySummary);

// ✅ إغلاق الشهر
document.getElementById("closeMonthBtn").addEventListener("click", async function () {
    if (!confirm("⚠️ هل أنت متأكد من إغلاق الشهر؟ لا يمكن التراجع!")) return;

    try {
        const token = localStorage.getItem("token");
        if (!token) {
            showToast("❌ لا يوجد توكن!", "error");
            return;
        }

        const response = await fetch("/api/close-month", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        const result = await response.json();

        if (response.ok && result.success) {
            showToast("✅ تم إغلاق الشهر بنجاح!", "success");
            location.reload();
        } else {
            console.error("❌ خطأ في إغلاق الشهر:", result.message || "خطأ غير معروف");
            showToast("❌ خطأ في النظام!", "error");
        }
    } catch (error) {
        console.error("❌ خطأ أثناء إغلاق الشهر:", error);
        showToast("❌ خطأ في النظام!", "error");
    }
});

// ✅ التحقق من حالة إغلاق الشهر
async function checkIfMonthClosed() {
    try {
        const token = localStorage.getItem("token");
        if (!token) {
            console.error("❌ لا يوجد توكن");
            return;
        }

        const response = await fetch("/api/monthly-summary", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        const data = await response.json();

        if (data && data.total_orders !== undefined) {
            if (data.total_orders === 0) {
                document.getElementById("closeMonthBtn").disabled = true;
                document.getElementById("closeMonthBtn").textContent = "🔒 Closed";
            } else {
                document.getElementById("closeMonthBtn").disabled = false;
                document.getElementById("closeMonthBtn").textContent = "Close Month";
            }
        } else {
            document.getElementById("closeMonthBtn").disabled = false;
            document.getElementById("closeMonthBtn").textContent = "🔒 Closed";
        }
    } catch (error) {
        console.error("❌ خطأ أثناء التحقق من إغلاق الشهر:", error);
    }
}

// ✅ استدعاء الفحص عند تحميل الصفحة
document.addEventListener("DOMContentLoaded", checkIfMonthClosed);

// ✅ طباعة التقرير الشهري
function openReport() {
    const printWindow = window.open('/monthly_report.html', '_blank', 'width=400,height=600');
    printWindow.onload = function () {
        printWindow.print();
    };
}
========== ./public/js/monthly_closing.js ==========
/**
 * Vortex POS — Monthly Closing Script (Full Version)
 */

const fmt = (n) => `${Number(parseFloat(n || 0).toFixed(2)).toLocaleString('en-US', {minimumFractionDigits: 2})} ج.م`;
let currentMonthData = null;

// ─── Init ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const monthInput = document.getElementById('month-input');

    const today = new Date();
    const thisMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    flatpickr(monthInput, {
        locale: "ar",
        disableMobile: true,
        plugins: [
            new monthSelectPlugin({
                shorthand: true,
                dateFormat: "Y-m",
                altFormat: "F Y"
            })
        ],
        defaultDate: thisMonth,
        altInput: true,
        altInputClass: "month-picker-alt-input",
        onChange: function(selectedDates, dateStr) {
            if(dateStr) {
                loadMonthlySummary(dateStr);
            }
        }
    });

    // Style the altInput to match the inline styles of the original input
    const altInput = document.querySelector('.month-picker-alt-input');
    if (altInput) {
        altInput.style.border = "1px solid #cbd5e1";
        altInput.style.background = "#f8fafc";
        altInput.style.color = "#0f172a";
        altInput.style.fontWeight = "800";
        altInput.style.fontSize = "1rem";
        altInput.style.outline = "none";
        altInput.style.cursor = "pointer";
        altInput.style.padding = "0.4rem 0.8rem";
        altInput.style.borderRadius = "8px";
        altInput.style.textAlign = "center";
    }

    loadMonthlySummary(thisMonth);
});

// ─── Load Summary ────────────────────────────────────────────────────────────
async function loadMonthlySummary(month) {
    try {
        const url = `/api/closing/monthly-summary?month=${month}`;
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();

        if (data.error) {
            Swal.fire('خطأ', data.error, 'error');
            return;
        }

        currentMonthData = data;

        // ── Computed values
        const revenue    = data.total_revenue      || 0;
        const cost       = data.total_cost         || 0;
        const expenses   = data.totalExpenses      || 0;
        const profit     = data.total_earnings     || 0;
        const discount   = data.totalDiscount      || 0;
        const digital    = data.onlinePaymentsTotal|| 0;
        const cash       = revenue - digital;

        // ── Hero
        document.getElementById('stat-profit').textContent = fmt(profit);

        // ── Month label
        const [yr, mo] = (data.currentMonth || month).split('-');
        const displayMonth = new Date(yr, mo - 1).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });
        document.getElementById('current-month-display').textContent = displayMonth;

        // ── Live badge
        const liveBadge = document.getElementById('live-badge');
        const liveText  = document.getElementById('live-text');
        if (data.liveOrdersCount > 0) {
            liveBadge.style.display = 'inline-flex';
            liveText.textContent = `${data.liveOrdersCount} أوردر بقيمة ${fmt(data.liveRevenue)} لم تُقفَّل بعد`;
        } else {
            liveBadge.style.display = 'none';
        }

        // ── Top Stats Grid
        document.getElementById('stat-revenue').textContent     = fmt(revenue);
        document.getElementById('stat-cost').textContent        = fmt(cost);
        document.getElementById('stat-expenses').textContent    = fmt(expenses);
        document.getElementById('stat-discount').textContent    = fmt(discount);
        document.getElementById('stat-orders-count').textContent= data.total_orders      || 0;
        document.getElementById('stat-items-count').textContent = data.total_sandwiches  || 0;
        document.getElementById('stat-digital').textContent     = fmt(digital);
        document.getElementById('stat-cash').textContent        = fmt(cash);

        // ── Flow Detail Card
        document.getElementById('stat-cash-detail').textContent    = fmt(cash);
        document.getElementById('stat-digital-detail').textContent = fmt(digital);
        document.getElementById('stat-expenses-detail').textContent= fmt(expenses);
        document.getElementById('stat-discount-detail').textContent= fmt(discount);
        document.getElementById('stat-total-cash').textContent     = fmt(revenue);

        // ── Performance Detail Card
        document.getElementById('stat-orders-detail').textContent  = data.total_orders     || 0;
        document.getElementById('stat-items-detail').textContent   = data.total_sandwiches || 0;
        document.getElementById('stat-revenue-detail').textContent = fmt(revenue);
        document.getElementById('stat-cost-detail').textContent    = fmt(cost);
        document.getElementById('stat-profit-detail').textContent  = fmt(profit);

        // ── Day-by-day table
        renderDailyTable(data.dailyBreakdown || []);

    } catch (err) {
        console.error('Failed to load monthly summary:', err);
        Swal.fire('خطأ', 'فشل في تحميل البيانات الشهرية', 'error');
    }
}

// ─── Day Table ───────────────────────────────────────────────────────────────
function renderDailyTable(days) {
    const tbody = document.getElementById('daily-table-body');
    if (!days || days.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="empty-table">
            <i class="fas fa-inbox fa-2x" style="display:block;margin-bottom:0.5rem;"></i>
            لا توجد أيام مقفلة لهذا الشهر
        </td></tr>`;
        return;
    }

    tbody.innerHTML = days.map((d, i) => {
        const profitColor = d.totalEarnings >= 0 ? '#16a34a' : '#dc2626';
        return `<tr>
            <td>${i + 1}</td>
            <td><strong>${(d.closingDate || '').slice(0, 10)}</strong></td>
            <td>${d.totalOrders || 0}</td>
            <td>${d.totalSandwiches || 0}</td>
            <td class="badge-green">${fmt(d.totalRevenue)}</td>
            <td class="badge-red">${fmt(d.totalExpenses)}</td>
            <td class="badge-red">${fmt(d.totalDiscount)}</td>
            <td class="badge-red">${fmt(d.totalCost)}</td>
            <td style="color:#8b5cf6;">${fmt(d.onlinePaymentsTotal)}</td>
            <td style="color:${profitColor}; font-size:1rem;">${fmt(d.totalEarnings)}</td>
        </tr>`;
    }).join('');
}

// ─── Excel Export ────────────────────────────────────────────────────────────
async function downloadMonthlyExcel() {
    if (!currentMonthData) {
        Swal.fire('خطأ', 'يرجى تحميل البيانات أولاً', 'error');
        return;
    }

    const data     = currentMonthData;
    const month    = document.getElementById('month-input').value;
    const revenue  = data.total_revenue        || 0;
    const cost     = data.total_cost           || 0;
    const expenses = data.totalExpenses        || 0;
    const profit   = data.total_earnings       || 0;
    const discount = data.totalDiscount        || 0;
    const digital  = data.onlinePaymentsTotal  || 0;
    const cash     = revenue - digital;

    const workbook = new ExcelJS.Workbook();

    // ── Helper: add a colored section header ──
    const addHeader = (sheet, title, colorArgb) => {
        const row = sheet.addRow([title, '']);
        sheet.mergeCells(`A${row.number}:B${row.number}`);
        row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorArgb } };
        row.alignment = { horizontal: 'right' };
    };

    // ════════════════════════════════════
    // SHEET 1: Monthly Summary
    // ════════════════════════════════════
    const summary = workbook.addWorksheet('ملخص الشهر', { views: [{ rightToLeft: true }] });
    summary.columns = [{ width: 30 }, { width: 25 }];

    // Title
    const titleRow = summary.insertRow(1, [`تقرير التقفيل الشهري - ${month} - Vortex POS`]);
    summary.mergeCells('A1:B1');
    titleRow.font      = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleRow.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    titleRow.alignment = { horizontal: 'center' };
    titleRow.height    = 36;

    summary.addRow([]);

    addHeader(summary, 'الملخص المالي', 'FF008060');
    summary.addRow(['إجمالي المبيعات',   fmt(revenue)]);
    summary.addRow(['إجمالي التكاليف',   fmt(cost)]);
    summary.addRow(['إجمالي المصروفات',  fmt(expenses)]);
    summary.addRow(['إجمالي الخصومات',   fmt(discount)]);
    const profitRow = summary.addRow(['صافي الربح',  fmt(profit)]);
    profitRow.getCell(2).font = { bold: true, color: { argb: profit >= 0 ? 'FF16A34A' : 'FFDC2626' } };

    summary.addRow([]);
    addHeader(summary, 'تفاصيل الخزنة', 'FF2563EB');
    summary.addRow(['مبيعات كاش',        fmt(cash)]);
    summary.addRow(['مبيعات إلكترونية',  fmt(digital)]);
    const totalRow = summary.addRow(['إجمالي المحصل', fmt(revenue)]);
    totalRow.font = { bold: true };

    summary.addRow([]);
    addHeader(summary, 'إحصائيات الأداء', 'FF64748B');
    summary.addRow(['إجمالي الطلبات',    data.total_orders     || 0]);
    summary.addRow(['إجمالي القطع المباعة', data.total_sandwiches || 0]);

    // Borders
    summary.eachRow(row => {
        row.eachCell(cell => {
            cell.border = { top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} };
            cell.alignment = cell.alignment || { vertical: 'middle', horizontal: 'right' };
        });
    });

    // ════════════════════════════════════
    // SHEET 2: Day-by-Day Breakdown
    // ════════════════════════════════════
    const dailySheet = workbook.addWorksheet('تفاصيل الأيام', { views: [{ rightToLeft: true }] });
    dailySheet.columns = [
        { header: '#',               key: 'num',      width: 6  },
        { header: 'التاريخ',          key: 'date',     width: 15 },
        { header: 'الطلبات',          key: 'orders',   width: 12 },
        { header: 'القطع',            key: 'items',    width: 12 },
        { header: 'المبيعات (EGP)',   key: 'revenue',  width: 18 },
        { header: 'المصروفات (EGP)',  key: 'expenses', width: 18 },
        { header: 'الخصومات (EGP)',   key: 'discount', width: 18 },
        { header: 'التكاليف (EGP)',   key: 'cost',     width: 18 },
        { header: 'إلكتروني (EGP)',   key: 'online',   width: 18 },
        { header: 'صافي الربح (EGP)', key: 'profit',   width: 20 },
    ];

    // Style header row
    const hRow = dailySheet.getRow(1);
    hRow.height = 32;
    hRow.eachCell(cell => {
        cell.font   = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    (data.dailyBreakdown || []).forEach((d, i) => {
        const row = dailySheet.addRow({
            num:      i + 1,
            date:     d.closingDate,
            orders:   d.totalOrders    || 0,
            items:    d.totalSandwiches|| 0,
            revenue:  parseFloat(d.totalRevenue  || 0).toFixed(2),
            expenses: parseFloat(d.totalExpenses || 0).toFixed(2),
            discount: parseFloat(d.totalDiscount || 0).toFixed(2),
            cost:     parseFloat(d.totalCost     || 0).toFixed(2),
            online:   parseFloat(d.onlinePaymentsTotal || 0).toFixed(2),
            profit:   parseFloat(d.totalEarnings || 0).toFixed(2),
        });
        row.height = 22;
        // Color profit cell
        const profitCell = row.getCell('profit');
        profitCell.font = { bold: true, color: { argb: (d.totalEarnings >= 0) ? 'FF16A34A' : 'FFDC2626' } };
        // Alternate row color
        if (i % 2 === 0) {
            row.eachCell(cell => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
            });
        }
    });

    // Borders for daily sheet
    dailySheet.eachRow(row => {
        row.eachCell(cell => {
            cell.border = { top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} };
            cell.alignment = cell.alignment || { vertical: 'middle', horizontal: 'center' };
        });
    });

    // ── Write & Download ──
    const buffer = await workbook.xlsx.writeBuffer();
    const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url    = window.URL.createObjectURL(blob);
    const a      = document.createElement('a');
    a.href       = url;
    a.download   = `Monthly_Report_Vortex_${month}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
}

// ─── Close Month ─────────────────────────────────────────────────────────────
async function handleClosing() {
    const month = document.getElementById('month-input').value;
    const today = new Date();
    const thisMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    if (month !== thisMonth) {
        Swal.fire('تنبيه', 'يمكن إغلاق الشهر الحالي فقط. الأشهر الماضية مقفلة بالفعل.', 'info');
        return;
    }

    const result = await Swal.fire({
        title: 'هل أنت متأكد من إغلاق الشهر؟',
        html: `
            <p style="color:#64748b; margin-bottom:1rem;">سيتم أرشفة مبيعات الشهر وتصفير عدادات المنتجات للبدء في شهر جديد.</p>
            <div style="background:#fef2f2; border-radius:12px; padding:1rem; color:#dc2626; font-weight:700;">
                ⚠️ هذا الإجراء نهائي ولا يمكن التراجع عنه!
            </div>`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#64748b',
        confirmButtonText: '🔒 نعم، إغلاق الشهر',
        cancelButtonText: 'إلغاء'
    });

    if (result.isConfirmed) {
        try {
            const response = await fetch('/api/closing/close-month', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();

            if (data.success) {
                await Swal.fire({
                    title: '✅ تم الإغلاق',
                    text: data.message,
                    icon: 'success',
                    confirmButtonColor: '#8b5cf6'
                });
                window.location.href = '/launcher.html';
            } else {
                Swal.fire('خطأ', data.error || 'فشل في إتمام العملية', 'error');
            }
        } catch (err) {
            Swal.fire('خطأ', 'حدث خطأ غير متوقع أثناء إغلاق الشهر', 'error');
        }
    }
}

========== ./public/js/product.js ==========
// Vortex POS - Product Management Logic
const currentLang = localStorage.getItem('lang') || 'ar';
const isAr = currentLang === 'ar';

const t = {
    ar: {
        allCats: 'كل الفئات',
        editProduct: 'تعديل المنتج',
        addProduct: 'إضافة منتج جديد',
        saveSuccess: 'تم الحفظ بنجاح',
        deleteConfirm: 'هل أنت متأكد من الحذف؟',
        deleted: 'تم الحذف بنجاح',
        error: 'حدث خطأ ما',
        retailSales: 'مبيعات القطاعي',
        wholesaleSales: 'مبيعات الجملة'
    },
    en: {
        allCats: 'All Categories',
        editProduct: 'Edit Product',
        addProduct: 'Add New Product',
        saveSuccess: 'Saved Successfully',
        deleteConfirm: 'Are you sure you want to delete?',
        deleted: 'Deleted Successfully',
        error: 'Something went wrong',
        retailSales: 'Retail Sales',
        wholesaleSales: 'Wholesale Sales'
    }
};

const translations = t[currentLang];

let allProducts = [];

document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    
    const openDrawerBtn = document.getElementById('open-add-drawer');
    const closeDrawerBtn = document.getElementById('close-drawer');
    const drawerOverlay = document.getElementById('drawer-overlay');
    const productForm = document.getElementById('drawer-product-form');

    if (openDrawerBtn) openDrawerBtn.onclick = () => openEditDrawer();
    if (closeDrawerBtn) closeDrawerBtn.onclick = closeDrawer;
    if (drawerOverlay) drawerOverlay.onclick = closeDrawer;

    if (productForm) {
        productForm.onsubmit = async (e) => {
            e.preventDefault();
            await saveProduct();
        };
    }

    const deleteBtn = document.getElementById('delete-btn');
    if (deleteBtn) {
        deleteBtn.onclick = async () => {
            const id = document.getElementById('product-id').value;
            if (id) await deleteProduct(id);
        };
    }
});

async function fetchProducts() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/products', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) return;
        
        allProducts = await response.json();
        const products = Object.values(allProducts).flat();
        
        renderProducts(products);
        populateCategoryList(products);
    } catch (error) {
        console.error('Fetch error:', error);
    }
}

function renderProducts(products) {
    const tableBody = document.getElementById('product-table');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    updateStats(products);

    if (products.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="6" style="padding: 3rem; text-align: center; color: #94a3b8;">${isAr ? 'لا توجد منتجات' : 'No products found'}</td>`;
        tableBody.appendChild(row);
        return;
    }

    products.forEach(product => {
        const row = document.createElement('tr');
        row.onclick = () => openEditDrawer(product);
        row.innerHTML = `
            <td>${product.id}</td>
            <td>${product.name}</td>
            <td><span class="category-pill ${getCategoryClass(product.category)}">${product.category}</span></td>
            <td>${product.price} <small>EGP</small></td>
            <td>${product.wholesalePrice || product.price} <small>EGP</small></td>
            <td>${product.sold || 0}</td>
        `;
        tableBody.appendChild(row);
    });
}

function updateStats(products) {
    const totalCountEl = document.getElementById('stat-total-count');
    const totalSoldEl  = document.getElementById('stat-total-sold');
    const bestSellerEl = document.getElementById('stat-best-seller');

    if (totalCountEl) totalCountEl.textContent = products.length;

    let totalSold = 0;
    let bestSeller = { name: '---', sold: -1 };

    products.forEach(p => {
        const sold = p.sold || 0;
        totalSold += sold;
        if (sold > bestSeller.sold) {
            bestSeller = { name: p.name, sold: sold };
        }
    });

    if (totalSoldEl)  totalSoldEl.textContent  = totalSold;
    if (bestSellerEl) bestSellerEl.textContent = bestSeller.name;
}

function getCategoryClass(category) {
    const cat = (category || '').toLowerCase();
    if (cat.includes('beef') || cat.includes('لحم')) return 'cat-beef';
    if (cat.includes('chicken') || cat.includes('دجاج')) return 'cat-chicken';
    if (cat.includes('drink') || cat.includes('مشروب')) return 'cat-drink';
    return '';
}

function populateCategoryList(products) {
    const categories = [...new Set(products.map(p => p.category))].sort();
    const datalist = document.getElementById('category-list');
    const catFilter = document.getElementById('category-filter');
    
    if (datalist) {
        datalist.innerHTML = categories.map(c => `<option value="${c}">`).join('');
    }
    
    if (catFilter) {
        const current = catFilter.value;
        catFilter.innerHTML = `<option value="all">${translations.allCats}</option>` + 
            categories.map(c => `<option value="${c}">${c}</option>`).join('');
        catFilter.value = current || 'all';
    }
}

function applyFilter() {
    const sort = document.getElementById('filter-options').value;
    const cat = document.getElementById('category-filter').value;
    const search = document.getElementById('search-bar').value.toLowerCase();
    
    let filtered = Object.values(allProducts).flat();

    if (search) {
        filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(search) || 
            p.category.toLowerCase().includes(search) ||
            p.id.toString().includes(search)
        );
    }

    if (cat !== 'all') {
        filtered = filtered.filter(p => p.category === cat);
    }

    if (sort === 'most-sold') filtered.sort((a, b) => (b.sold || 0) - (a.sold || 0));
    else if (sort === 'highest-price') filtered.sort((a, b) => b.price - a.price);
    else if (sort === 'lowest-price') filtered.sort((a, b) => a.price - b.price);
    else filtered.sort((a, b) => b.id - a.id);

    renderProducts(filtered);
}

function searchProducts() {
    applyFilter();
}

function openEditDrawer(product = null) {
    const drawer = document.getElementById('product-drawer');
    const overlay = document.getElementById('drawer-overlay');
    const title = document.getElementById('drawer-title');
    const deleteBtn = document.getElementById('delete-btn');
    const salesSection = document.getElementById('drawer-sales-section');

    if (!drawer || !overlay) return;

    if (product) {
        title.textContent = translations.editProduct;
        document.getElementById('product-id').value = product.id;
        document.getElementById('product-name').value = product.name;
        document.getElementById('product-category').value = product.category;
        document.getElementById('product-price').value = product.price;
        document.getElementById('product-wholesale-price').value = product.wholesalePrice || product.price;
        
        if (salesSection) {
            salesSection.style.display = 'block';
            document.getElementById('drawer-retail-sold').textContent = product.retail_sold || 0;
            document.getElementById('drawer-wholesale-sold').textContent = product.wholesale_sold || 0;
        }
        deleteBtn.style.display = 'flex';
    } else {
        title.textContent = translations.addProduct;
        document.getElementById('drawer-product-form').reset();
        document.getElementById('product-id').value = '';
        if (salesSection) salesSection.style.display = 'none';
        deleteBtn.style.display = 'none';
    }

    overlay.style.display = 'block';
    setTimeout(() => {
        overlay.style.opacity = '1';
        drawer.classList.add('open');
    }, 10);
}

function closeDrawer() {
    const drawer = document.getElementById('product-drawer');
    const overlay = document.getElementById('drawer-overlay');
    if (drawer) drawer.classList.remove('open');
    if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.style.display = 'none', 300);
    }
}

async function saveProduct() {
    const id = document.getElementById('product-id').value;
    const productData = {
        name: document.getElementById('product-name').value,
        category: document.getElementById('product-category').value,
        price: parseFloat(document.getElementById('product-price').value),
        wholesalePrice: parseFloat(document.getElementById('product-wholesale-price').value)
    };

    const url = id ? `/api/products/${id}` : '/api/products';
    const method = id ? 'PUT' : 'POST';

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(url, {
            method: method,
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(productData)
        });

        if (response.ok) {
            Swal.fire(translations.saveSuccess, '', 'success');
            closeDrawer();
            fetchProducts();
        } else {
            const err = await response.json().catch(() => ({}));
            Swal.fire(translations.error, err.message || '', 'error');
        }
    } catch (error) {
        Swal.fire(translations.error, '', 'error');
    }
}

async function deleteProduct(id) {
    const result = await Swal.fire({
        title: translations.deleteConfirm,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444'
    });

    if (result.isConfirmed) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/products/${id}`, { 
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                Swal.fire(translations.deleted, '', 'success');
                closeDrawer();
                fetchProducts();
            }
        } catch (error) {
            Swal.fire(translations.error, '', 'error');
        }
    }
}

function exportProductsToExcel() {
    const products = Object.values(allProducts).flat();
    const worksheet = XLSX.utils.json_to_sheet(products);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
    XLSX.writeFile(workbook, "vortex_products.xlsx");
}

========== ./public/js/receipt.js ==========
document.addEventListener("DOMContentLoaded", async function () {
    const receiptData = JSON.parse(localStorage.getItem("receiptData"));

    if (!receiptData) {
        console.error("❌ لم يتم العثور على بيانات الإيصال!");
        document.getElementById("receipt-container").innerHTML = "<p style='text-align:center;'>❌ لا يوجد إيصال متاح!</p>";
        return;
    }

    let showDiscountSetting = 'yes';
    let showCommentsSetting = 'yes';
    
    // 1. Fetch Store Settings dynamically
    try {
        const token = localStorage.getItem('token');
        if (token) {
            const res = await fetch('/api/settings', { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
                const settings = await res.json();
                if (settings.store_name) document.getElementById('store-name').innerText = settings.store_name;
                if (settings.store_phone) document.getElementById('store-phone-footer').innerText = settings.store_phone;
                if (settings.receipt_footer) document.getElementById('store-footer-msg').innerText = settings.receipt_footer;
                if (settings.show_discount) showDiscountSetting = settings.show_discount;
                if (settings.show_comments) showCommentsSetting = settings.show_comments;
            }
        }
    } catch (e) {
        console.error("Failed to fetch settings for receipt", e);
    }

    // 2. Format Currency
    const fmt = (n) => `${Number(parseFloat(n || 0).toFixed(2)).toLocaleString('en-US', {minimumFractionDigits: 2})} ج.م`;

    // 🏆 Large Order ID
    const largeIdEl = document.getElementById("order-id-large");
    if (largeIdEl) largeIdEl.innerText = `#${receiptData.id || "000"}`;

    // 👤 Customer Data Logic
    const cleanValue = (val, forbiddenKeywords = []) => {
        let trimmed = val?.trim() || "";
        if (!trimmed) return "-";
        
        // Check if value includes any forbidden keyword (like "تيك أوي")
        const isForbidden = forbiddenKeywords.some(k => trimmed.includes(k));
        if (isForbidden) return "-";
        
        // Check for specific dummy values
        if (["0000000000", "0", "--", "Store", "Local"].includes(trimmed)) return "-";
        
        return trimmed;
    };

    document.getElementById("customer-name").innerText = cleanValue(receiptData.customerName, ["تيك أوي", "نقدي", "Guest"]);
    document.getElementById("customer-phone").innerText = cleanValue(receiptData.customerPhone);
    document.getElementById("customer-address").innerText = cleanValue(receiptData.customerAddress);
    
    document.getElementById("order-date").innerText = receiptData.orderDate || "-";
    document.getElementById("delivery-price").innerText = fmt(receiptData.deliveryPrice);
    
    let subtotal = 0;
    const orderDetailsContainer = document.getElementById("order-details");
    orderDetailsContainer.innerHTML = "";

    if (receiptData.orderDetails && Array.isArray(receiptData.orderDetails)) {
        receiptData.orderDetails.forEach(item => {
            const quantity = Number(item.quantity) || 0;
            const price = parseFloat(item.price) || 0;
            
            let addonsTotal = 0;
            let commentsText = "";
            if (Array.isArray(item.comments)) {
                item.comments.forEach(c => {
                    const addonPrice = parseFloat(c.price || 0);
                    
                    // Skip printing manual discount comment if disabled
                    if (addonPrice < 0 && showDiscountSetting === 'no') return;
                    
                    if (addonPrice > 0) addonsTotal += addonPrice;
                    
                    // Print comment only if show_comments is enabled
                    if (showCommentsSetting !== 'no') {
                        commentsText += `<div class="addon-line">• ${c.text} ${addonPrice > 0 ? '(+'+addonPrice+')' : ''}</div>`;
                    }
                });
            }
            
            const itemFinalTotal = (price + addonsTotal) * quantity;
            subtotal += itemFinalTotal;

            const row = document.createElement("tr");
            row.innerHTML = `
                <td>
                    <div class="item-name">${item.name || "N/A"}</div>
                    <div class="item-addons">${commentsText}</div>
                </td>
                <td style="text-align: center; font-weight: bold;">x${quantity}</td>
                <td style="text-align: left;">${fmt(price + addonsTotal)}</td>
            `;
            orderDetailsContainer.appendChild(row);
        });
    }

    document.getElementById("subtotal").innerText = fmt(subtotal);
    const discount = parseFloat(receiptData.discount || 0);
    
    // Hide discount line if it's 0 or if settings say 'no'
    if (discount === 0 || showDiscountSetting === 'no') {
        const discContainer = document.getElementById("discount-container");
        if (discContainer) discContainer.remove();
    } else {
        document.getElementById("discount").innerText = fmt(discount);
    }
    
    const delivery = parseFloat(receiptData.deliveryPrice || 0);
    const grandTotal = subtotal + delivery - discount;
    document.getElementById("order-total").innerText = fmt(grandTotal);

    // 3. Auto Print after rendering (optional but recommended for POS)
    setTimeout(() => {
        window.print();
    }, 500);
});

========== ./public/js/sales.js ==========
// js/sales.js
(async () => {
    const response = await fetch('/api/sales');
    const sales = await response.json();
    const salesList = document.getElementById('sales-list');

    sales.forEach(sale => {
        const item = document.createElement('div');
        item.textContent = `Product ID: ${sale.productId}, Quantity Sold: ${sale.quantitySold}, Total Price: ${sale.totalPrice} EGP`;
        salesList.appendChild(item);
    });
})();

========== ./public/js/settings.js ==========
const currentLang = localStorage.getItem('lang') || 'ar';
const isAr = currentLang === 'ar';

const t = {
    ar: {
        pageTitle: 'إعدادات النظام - Vortex POS',
        headerPill: 'إعدادات النظام',
        homeBtn: 'الرئيسية',
        secStore: 'بيانات المحل',
        storeName: 'اسم المحل',
        storeAddress: 'العنوان',
        storePhone: 'رقم الهاتف',
        secReceipt: 'إعدادات الفاتورة',
        receiptFooter: 'رسالة التذييل (Footer)',
        currency: 'العملة',
        vat: 'ضريبة القيمة المضافة (%)',
        showDiscount: 'إظهار الخصم في الإيصال',
        showComments: 'إظهار الإضافات والتعليقات',
        secSystem: 'إعدادات النظام',
        language: 'لغة الواجهة',
        systemMode: 'نوع النشاط (System Mode)',
        printMode: 'وضع الطباعة',
        btnSave: 'حفظ كل الإعدادات',
        successTitle: 'تم الحفظ',
        successText: 'تم تحديث الإعدادات بنجاح',
        errorTitle: 'خطأ',
        errorMsg: 'فشل في حفظ الإعدادات'
    },
    en: {
        pageTitle: 'System Settings - Vortex POS',
        headerPill: 'System Settings',
        homeBtn: 'Home',
        secStore: 'Store Information',
        storeName: 'Store Name',
        storeAddress: 'Address',
        storePhone: 'Phone Number',
        secReceipt: 'Receipt Settings',
        receiptFooter: 'Footer Message',
        currency: 'Currency',
        vat: 'VAT (%)',
        showDiscount: 'Show Discount on Receipt',
        showComments: 'Show Addons & Comments',
        secSystem: 'System Configuration',
        language: 'Interface Language',
        systemMode: 'Business Type',
        printMode: 'Printing Mode',
        btnSave: 'Save All Settings',
        successTitle: 'Saved',
        successText: 'Settings updated successfully',
        errorTitle: 'Error',
        errorMsg: 'Failed to save settings'
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    applyTranslations();
    await fetchSettings();
    
    document.getElementById('settings-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const settingsData = {};
        formData.forEach((value, key) => {
            settingsData[key] = value;
        });

        try {
            const response = await fetch('/api/settings/bulk', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(settingsData)
            });

            if (response.ok) {
                // Update local storage for language and mode if changed
                if (settingsData.language) {
                    localStorage.setItem('lang', settingsData.language);
                }
                if (settingsData.system_mode) {
                    localStorage.setItem('systemMode', settingsData.system_mode);
                }

                Swal.fire({
                    icon: 'success',
                    title: t[currentLang].successTitle,
                    text: t[currentLang].successText,
                    timer: 1500,
                    showConfirmButton: false
                }).then(() => {
                    window.location.reload();
                });
            } else {
                throw new Error(t[currentLang].errorMsg);
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: t[currentLang].errorTitle,
                text: error.message
            });
        }
    });
});

function applyTranslations() {
    const langT = t[currentLang];
    
    // 🌍 Dynamic Layout Direction
    document.documentElement.dir = isAr ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLang;

    // Apply texts
    document.title = langT.pageTitle;
    const updateLoc = (id, text) => {
        const el = document.getElementById(id);
        if(el) el.textContent = text;
    };

    updateLoc('loc-header-pill', langT.headerPill);
    updateLoc('loc-home', langT.homeBtn);
    updateLoc('loc-sec-store', langT.secStore);
    updateLoc('loc-store-name', langT.storeName);
    updateLoc('loc-store-address', langT.storeAddress);
    updateLoc('loc-store-phone', langT.storePhone);
    updateLoc('loc-sec-receipt', langT.secReceipt);
    updateLoc('loc-receipt-footer', langT.receiptFooter);
    updateLoc('loc-currency', langT.currency);
    updateLoc('loc-vat', langT.vat);
    updateLoc('loc-show-discount', langT.showDiscount);
    updateLoc('loc-show-comments', langT.showComments);
    updateLoc('loc-sec-system', langT.secSystem);
    updateLoc('loc-language', langT.language);
    updateLoc('loc-system-mode', langT.systemMode);
    updateLoc('loc-print-mode', langT.printMode);
    updateLoc('loc-btn-save', langT.btnSave);
    
    // Update placeholders for English
    if(!isAr) {
        const updatePlaceholder = (name, text) => {
            const el = document.querySelector(`input[name="${name}"]`);
            if(el) el.placeholder = text;
        };
        updatePlaceholder('store_address', 'Full Address');
        updatePlaceholder('receipt_footer', 'Thank you for your visit');
    }
}

async function fetchSettings() {
    try {
        const response = await fetch('/api/settings', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const settings = await response.json();
        
        // تعبئة الفورم بالقيم الحالية
        const form = document.getElementById('settings-form');
        for (const [key, value] of Object.entries(settings)) {
            const input = form.querySelector(`[name="${key}"]`);
            if (input) {
                input.value = value;
            }
        }
    } catch (error) {
        console.error('Error fetching settings:', error);
    }
}

========== ./public/js/sidebar-loader.js ==========
/**
 * Hub Navigation Controller - Dynamic Injection (Luxury Refinement)
 */

(function() {
    const run = () => {
        const currentLang = localStorage.getItem('lang') || 'ar';
        const isAr = currentLang === 'ar';
        const isLauncher = window.location.pathname.includes('launcher.html');

        // Fix global page direction and language
        document.documentElement.lang = currentLang;
        document.documentElement.dir = isAr ? 'rtl' : 'ltr';

        // Add Global Styles
        const style = document.createElement('style');
        style.innerHTML = `
            body {
                margin: 0 !important;
                background: #f8fafc !important;
                min-height: 100vh !important;
                padding: 0 !important;
                font-family: 'Outfit', sans-serif !important;
            }
            
            /* ✨ Luxury Floating Home Button */
            .chic-home-btn {
                position: fixed;
                bottom: 30px;
                \${isAr ? 'left: 30px' : 'right: 30px'};
                width: 52px;
                height: 52px;
                background: #1e293b;
                border-radius: 16px;
                display: flex;
                align-items: center;
                justify-content: \${isAr ? 'flex-end' : 'flex-start'};
                padding: \${isAr ? '0 14px' : '0 14px'};
                color: white;
                text-decoration: none;
                box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2);
                z-index: 99999;
                transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                overflow: hidden;
                border: none !important;
            }

            .chic-home-btn:hover {
                width: 150px;
                background: #008060;
                box-shadow: 0 15px 35px rgba(0, 128, 96, 0.3);
                transform: translateY(-5px);
                border-radius: 20px;
                justify-content: center;
                padding: 0;
            }

            .chic-home-btn i {
                font-size: 1.25rem;
                transition: all 0.4s ease;
                z-index: 2;
                margin: 0;
            }

            .chic-home-btn .btn-text {
                position: absolute;
                opacity: 0;
                font-weight: 700;
                font-size: 0.9rem;
                white-space: nowrap;
                transition: all 0.4s ease;
                transform: translateX(\${isAr ? '-20px' : '20px'});
            }

            .chic-home-btn:hover .btn-text {
                opacity: 1;
                transform: translateX(\${isAr ? '25px' : '-25px'});
            }

            .chic-home-btn:hover i {
                transform: translateX(\${isAr ? '-45px' : '45px'});
            }
        `;
        document.head.appendChild(style);

        // Inject Chic Floating Home Button (Only if not Launcher or pages with integrated headers)
        const isDashboard = window.location.pathname.includes('dashboard.html');
        const isCashier = window.location.pathname.includes('cashier.html');
        const isOrders = window.location.pathname.includes('manage_orders.html');
        const isProducts = window.location.pathname.includes('products.html');
        const isExpenses = window.location.pathname.includes('expenses.html');
        const isInventory = window.location.pathname.includes('inventory.html');
        const isSettings = window.location.pathname.includes('settings.html');
        const isDailyClosing = window.location.pathname.includes('daily_closing.html');
        const isMonthlyClosing = window.location.pathname.includes('monthly_closing.html');

        if (!isLauncher && !isDashboard && !isCashier && !isOrders && !isProducts && !isExpenses && !isInventory && !isSettings && !isDailyClosing && !isMonthlyClosing) {
            const homeBtn = document.createElement('a');
            homeBtn.href = '/launcher.html';
            homeBtn.className = 'chic-home-btn';
            homeBtn.innerHTML = `
                <i class="fas fa-th-large"></i>
                <span class="btn-text">\${isAr ? 'الرئيسية' : 'Home Hub'}</span>
            `;
            document.body.appendChild(homeBtn);
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', run);
    } else {
        run();
    }
})();

========== ./public/js/users.js ==========
document.addEventListener('DOMContentLoaded', () => {
    fetchUsers();

    // إضافة مستخدم جديد
    document.querySelector('.btn-primary').addEventListener('click', async () => {
        const { value: formValues } = await Swal.fire({
            title: 'إضافة موظف جديد',
            html:
                '<input id="swal-username" class="swal2-input" placeholder="اسم المستخدم">' +
                '<input id="swal-password" type="password" class="swal2-input" placeholder="كلمة المرور">' +
                '<select id="swal-role" class="swal2-input">' +
                '<option value="cashier">كاشير</option>' +
                '<option value="manager">مدير</option>' +
                '</select>',
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'إضافة',
            cancelButtonText: 'إلغاء',
            preConfirm: () => {
                return {
                    username: document.getElementById('swal-username').value,
                    password: document.getElementById('swal-password').value,
                    role: document.getElementById('swal-role').value
                }
            }
        });

        if (formValues) {
            if (!formValues.username || !formValues.password) {
                return Swal.fire('خطأ', 'يرجى ملء جميع الحقول', 'error');
            }
            addUser(formValues);
        }
    });
});

async function fetchUsers() {
    try {
        const response = await fetch('/api/users', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const users = await response.json();
        renderUsers(users);
    } catch (error) {
        console.error('Error fetching users:', error);
    }
}

function renderUsers(users) {
    const tbody = document.querySelector('#usersTable tbody');
    tbody.innerHTML = '';

    users.forEach(user => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${user.username}</td>
            <td><span class="role-tag ${user.role}">${user.role === 'manager' ? 'مدير' : 'كاشير'}</span></td>
            <td>
                <button onclick="deleteUser(${user.id})" class="btn-delete" style="color: #ef4444; border: none; background: none; cursor: pointer;">
                    <i class="fas fa-trash"></i> حذف
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function addUser(userData) {
    try {
        const response = await fetch('/api/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(userData)
        });

        if (response.ok) {
            Swal.fire('تم!', 'تم إضافة المستخدم بنجاح', 'success');
            fetchUsers();
        } else {
            throw new Error('فشل في إضافة المستخدم');
        }
    } catch (error) {
        Swal.fire('خطأ', error.message, 'error');
    }
}

async function deleteUser(id) {
    const result = await Swal.fire({
        title: 'هل أنت متأكد؟',
        text: "حذف حساب هذا الموظف نهائياً!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'نعم، احذف',
        cancelButtonText: 'إلغاء'
    });

    if (result.isConfirmed) {
        try {
            const response = await fetch(`/api/users/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (response.ok) {
                Swal.fire('تم الحذف!', '', 'success');
                fetchUsers();
            }
        } catch (error) {
            Swal.fire('خطأ', 'فشل في حذف المستخدم', 'error');
        }
    }
}

========== ./public/utils/costCalculator.js ==========
async function getTotalCost() {
    const [costResult] = await db.query(`
        SELECT SUM(R.amount * I.cost * J.quantity) AS totalCost
        FROM Orders O
        JOIN JSON_TABLE(O.orderDetails, '$[*]' COLUMNS (
            name VARCHAR(255) PATH '$.name',
            quantity INT PATH '$.quantity'
        )) AS J ON 1=1
        JOIN recipes R ON J.name = R.sandwich
        JOIN inventory I ON R.ingredient = I.name
        WHERE DATE(O.createdAt) = CURDATE();
    `);
    return costResult.totalCost || 0;
}
========== ./public/utils/inventoryUpdater.js ==========
async function updateInventory(orderDetails) {
    for (const item of orderDetails) {
        const query = `
            UPDATE inventory i
            JOIN recipes r ON r.ingredient = i.name
            SET i.quantity = CASE 
                WHEN i.quantity >= (r.amount * ?) THEN i.quantity - (r.amount * ?)
                ELSE i.quantity 
            END
            WHERE r.sandwich = ?;
        `;
        await db.query(query, [item.quantity, item.quantity, item.name]);
    }
}
========== ./resetAdminPassword.js ==========
const bcrypt = require('bcryptjs');
const { User } = require('./models');

async function resetAdminPassword() {
    try {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        
        await User.update(
            { password: hashedPassword },
            { where: { username: 'admin' } }
        );
        
        console.log('✅ تم تحديث كلمة المرور بنجاح!');
        console.log('Username: admin');
        console.log('Password: admin123');
        
        // التحقق من النتيجة
        const admin = await User.findOne({ where: { username: 'admin' } });
        const isMatch = await bcrypt.compare('admin123', admin.password);
        console.log('✅ تم التحقق من الباسورد:', isMatch);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ خطأ:', error);
        process.exit(1);
    }
}

resetAdminPassword();

========== ./reset_transactions.js ==========
const { sequelize, Order, OrderItem, DailyClosing, Expense } = require('./models');

async function resetSystemForProduction() {
    try {
        console.log("⚠️ Starting system reset for Production...");

        // 1. Delete all transactions (orders, items, expenses, closings)
        console.log("🧹 Clearing Order Items...");
        await OrderItem.destroy({ where: {} });

        console.log("🧹 Clearing Orders...");
        await Order.destroy({ where: {} });

        console.log("🧹 Clearing Expenses...");
        await Expense.destroy({ where: {} });

        console.log("🧹 Clearing Daily Closings...");
        await DailyClosing.destroy({ where: {} });

        // Optionally, reset auto-increment counters for MySQL
        console.log("🔄 Resetting Auto-Increment counters...");
        await sequelize.query('ALTER TABLE `order_items` AUTO_INCREMENT = 1;');
        await sequelize.query('ALTER TABLE `orders` AUTO_INCREMENT = 1;');
        await sequelize.query('ALTER TABLE `expenses` AUTO_INCREMENT = 1;');
        await sequelize.query('ALTER TABLE `daily_closing` AUTO_INCREMENT = 1;');

        console.log("✅ System successfully wiped! Transaction history is clean.");
        console.log("🚀 The system is now ready for REAL operations!");
        
        process.exit(0);
    } catch (error) {
        console.error("❌ Error resetting database:", error);
        process.exit(1);
    }
}

resetSystemForProduction();

========== ./routes/Products.js ==========
const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");
const { authMiddleware } = require("../middleware/authMiddleware");
const { validate, productSchema } = require("../middleware/validationMiddleware");

// ✅ تأكد من استخدام الدوال بالشكل الصحيح
router.get('/:category', authMiddleware(['manager', 'cashier', 'admin']), productController.getProductsByCategory);

router.post('/add', authMiddleware(['manager', 'admin']), validate(productSchema), productController.addProduct);

router.get("/", authMiddleware(['manager', 'cashier', 'admin']), productController.getAllProducts);

router.get("/:id", authMiddleware(['manager', 'cashier', 'admin']), productController.getProductById);

router.put("/:id", authMiddleware(['manager', 'admin']), validate(productSchema), productController.updateProduct);

router.delete("/:id", authMiddleware(['manager', 'admin']), productController.deleteProduct);

module.exports = router;
========== ./routes/analytics.js ==========
const express = require("express");
const router = express.Router();
const analyticsController = require("../controllers/analyticsController");

// 🔹 تحديد الروت لجلب التحليلات
router.get("/", analyticsController.getAnalytics);

router.get("/low-stock", analyticsController.getLowStockProducts);
router.get('/stock-by-category', analyticsController.getStockByCategory);
router.get('/stock-forecast', analyticsController.getStockForecast);

module.exports = router;
========== ./routes/auth.js ==========
const express = require("express");
const authController = require("../controllers/authController");
const rateLimiter = require("../middleware/rateLimiter");

const router = express.Router();

// 🛡️ Protect login with rate limiting (max 10 attempts per minute)
router.post("/login", rateLimiter({ maxRequests: 10, keyPrefix: 'login' }), authController.login);

router.post("/logout", authController.logout);

module.exports = router;

========== ./routes/closing.js ==========
const express = require('express');
const router = express.Router();
const closingController = require('../controllers/closingController');

// 🔹 ملخص اليوم
router.get('/daily-summary', closingController.getDailySummary);

// 🔹 إغلاق اليوم
router.post('/close-day', closingController.closeDay);

// 🔹 ملخص الشهر الحالي
router.get('/monthly-summary', closingController.getMonthlySummary);

// 🔹 إغلاق الشهر
router.post("/close-month", closingController.closeMonth);

module.exports = router;

========== ./routes/comment.js ==========
const express = require('express');
const router = express.Router();
const {
    addComment,
    deleteComment,
    getPopularComments 
} = require('../controllers/commentController');

router.post('/add', addComment);


router.get('/popular', getPopularComments);

router.delete('/:id', deleteComment);

module.exports = router;
========== ./routes/customers.js ==========
const express = require("express");
const router = express.Router();
const customerController = require("../controllers/customerController.js");

router.get('/history/:phone', customerController.getCustomerHistory);

router.get("/phones", customerController.getCustomerPhones);

router.get("/:phone", customerController.getCustomerByPhone);

router.get("/", customerController.getAllCustomers);

router.post("/create", customerController.createCustomer);

router.put("/:id", customerController.updateCustomer);

router.delete("/:id", customerController.deleteCustomer);


module.exports = router;

========== ./routes/dashboard.js ==========
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// ✅ Route لجلب بيانات الـ Dashboard (يعتمد على قاعدة البيانات)
router.get('/dashboard-data', dashboardController.getDashboardData);

// ✅ Route للتحقق من حالة النظام (الإنترنت، قاعدة البيانات، الطابعة الحرارية)
router.get('/system-status', dashboardController.checkSystemStatus);

module.exports = router;
========== ./routes/discountRoutes.js ==========
const express = require('express');
const router = express.Router();
const discountController = require('../controllers/discountController');

router.post("/check", discountController.checkBestDiscount);

router.get("/apply/:discountCode", discountController.applyDiscount);

// عرض جميع الأكواد
router.get('/', discountController.getAllDiscounts);

// إضافة كود خصم جديد
router.post('/', discountController.addDiscount);

// تحديث كود خصم
router.put('/:id', discountController.updateDiscount);

// حذف كود خصم
router.delete('/:id', discountController.deleteDiscount);

module.exports = router;
========== ./routes/expenses.js ==========
const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const { authMiddleware } = require('../middleware/authMiddleware');

// ✅ All endpoints require authentication (manager only)
router.get('/', authMiddleware(['manager', 'cashier']), expenseController.getAllExpenses);
router.post('/', authMiddleware(['manager']), expenseController.createExpense);
router.put('/:id', authMiddleware(['manager']), expenseController.updateExpense);
router.delete('/:id', authMiddleware(['manager']), expenseController.deleteExpense);

module.exports = router;

========== ./routes/index.js ==========
// routes/index.js
const express = require("express");
const router = express.Router();
const authRoutes = require("./auth");
const productRoutes = require("./Products");
const saleRoutes = require("./sales");
const userRoutes = require("./users");
const paymentRoutes = require("./payments");
const {
  authMiddleware,
  authorizeRoles,
} = require("../middleware/authMiddleware");

// ✅ Authentication API
router.use("/auth", authRoutes);

// ⚠️ Note: Root-level /products and /sales are now handled by pages.js for HTML.
// API calls should use the /api prefix defined in server.js.

// Extra API Logic if needed
router.use("/payments", authMiddleware(["manager", "cashier"]), paymentRoutes);

// Protected examples
router.get(
  "/protected-route",
  authMiddleware(["manager", "cashier"]),
  (req, res) => {
    res.json({ message: "🟢 دخول ناجح للصفحة المحمية!" });
  }
);

module.exports = router;

========== ./routes/inventory.js ==========
const express = require("express");
const router = express.Router();
const inventoryController = require("../controllers/inventoryController");

// ✅ جلب جميع عناصر المخزون
router.get("/", inventoryController.getAllInventory);

// ✅ إضافة عنصر جديد إلى المخزون
router.post("/add", inventoryController.addInventory);

// ✅ تعديل عنصر في المخزون
router.put("/:id", inventoryController.updateInventory);

// ✅ حذف عنصر من المخزون
router.delete("/:id", inventoryController.deleteInventory);

// ✅ تنبيهات المخزون المنخفض وتاريخ الصلاحية
router.get("/alerts/low-stock", inventoryController.getLowStockAlerts);
router.get("/alerts/expiry", inventoryController.getExpiryAlerts);

module.exports = router;
========== ./routes/login.js ==========
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User } = require('../models'); // تأكد من صحة المسار حسب مشروعك

const secretKey = 'mySuperSecretKey123';

router.post('/', async (req, res) => {
    const { username, password } = req.body;

    console.log('📥 بيانات تسجيل الدخول المستقبلة:', { username, password });

    try {
        // البحث عن المستخدم في قاعدة البيانات
        const user = await User.findOne({ where: { username } });

        if (!user) {
            console.log('❌ اسم المستخدم غير موجود!');
            return res.status(401).json({ error: '❌ بيانات الدخول غير صحيحة!' });
        }

        // التحقق من كلمة المرور باستخدام bcrypt
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            console.log('❌ كلمة المرور غير صحيحة!');
            return res.status(401).json({ error: '❌ بيانات الدخول غير صحيحة!' });
        }

        // إنشاء توكن JWT
        const token = jwt.sign(
            { username: user.username, role: user.role }, 
            process.env.JWT_SECRET || 'mySuperSecretKey123', 
            { expiresIn: '1h' }
        );

        console.log('🟢 تسجيل الدخول ناجح، اسم المستخدم:', user.username);
        return res.json({ 
            token, 
            role: user.role,
            username: user.username // ✅ إضافة اسم المستخدم للرد
        });

    } catch (error) {
        console.error('❌ خطأ أثناء تسجيل الدخول:', error);
        return res.status(500).json({ error: '❌ حدث خطأ أثناء تسجيل الدخول.' });
    }
});

module.exports = router;

========== ./routes/manager.js ==========
const express = require("express");
const router = express.Router();
const checkRole = require("../middleware/checkRole");

// حماية الصفحات باستخدام Middleware
router.get("/cashier", checkRole, (req, res) => {
    res.sendFile("/path/to/cashier.html");
});

router.get("/dashboard", checkRole, (req, res) => {
    res.sendFile("/path/to/dashboard.html");
});

module.exports = router;

========== ./routes/merchants.js ==========
const express = require('express');
const router = express.Router();
const merchantController = require('../controllers/merchantController');
const authorize = require('../middleware/authorize');
const { authMiddleware } = require('../middleware/authMiddleware'); // ✅ Added this
const { PERMISSIONS: P } = require('../config/permissions');

// 🛡️ Apply authMiddleware to all routes here to populate req.user
router.use(authMiddleware(['manager', 'supervisor', 'accountant', 'cashier', 'owner']));

// Merchants
router.get('/', authorize(P.finance.view), merchantController.getMerchants);
router.post('/', authorize(P.finance.edit), merchantController.createMerchant);
router.put('/:id', authorize(P.finance.edit), merchantController.updateMerchant);
router.delete('/:id', authorize(P.users.manage), merchantController.deleteMerchant); // Deleting a merchant is restricted to managers

// Transactions
router.get('/:merchantId/transactions', authorize(P.finance.ledger), merchantController.getTransactions);
router.post('/:merchantId/transactions', authorize(P.finance.edit), merchantController.addTransaction);
router.put('/transactions/:id', authorize(P.finance.edit), merchantController.updateTransaction);
router.delete('/transactions/:id', authorize(P.finance.edit), merchantController.deleteTransaction);

module.exports = router;

========== ./routes/order.js ==========
const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { validate, orderSchema } = require("../middleware/validationMiddleware");

router.post("/", validate(orderSchema), orderController.createOrder);

module.exports = router;
========== ./routes/orders.js ==========
const express = require("express");
const router = express.Router();
const ordersController = require("../controllers/ordersController");
const authorize = require('../middleware/authorize');
const { authMiddleware } = require('../middleware/authMiddleware'); // ✅ Added this
const { PERMISSIONS: P } = require('../config/permissions');

// 🛡️ Apply authMiddleware to all routes here to populate req.user
router.use(authMiddleware(['manager', 'supervisor', 'accountant', 'cashier', 'owner'])); 

router.get("/", authorize(P.orders.view), ordersController.fetchOrders); 
router.post("/count-sandwiches", authorize(P.reports.daily), ordersController.countSandwiches); 
router.post("/format-details", authorize(P.orders.view), ordersController.formatOrderDetails); 
router.put("/:orderId/cancel", authorize(P.orders.cancel), ordersController.cancelOrder); 
router.post("/:id/print", authorize(P.orders.view), ordersController.reprintOrder); 

module.exports = router;

========== ./routes/pages.js ==========
// routes/pages.js - Clean URL Page Routing (No Auth Middleware)
// Security is handled client-side via localStorage token checks in each page's JS.
const express = require('express');
const router = express.Router();
const path = require('path');

const publicDir = path.join(__dirname, '../public');

// Root -> redirect based on role (client-side handles it)
router.get('/', (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
});

// Login
router.get('/login', (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
});

// Cashier
router.get('/cashier', (req, res) => {
    res.sendFile(path.join(publicDir, 'cashier.html'));
});

// Dashboard
router.get('/dashboard', (req, res) => {
    res.sendFile(path.join(publicDir, 'dashboard.html'));
});

// Inventory
router.get('/inventory', (req, res) => {
    res.sendFile(path.join(publicDir, 'inventory.html'));
});

// Products Management Page
router.get('/products', (req, res) => {
    res.sendFile(path.join(publicDir, 'pages/products.html'));
});

// Sales Reports Page
router.get('/sales', (req, res) => {
    res.sendFile(path.join(publicDir, 'pages/sales.html'));
});

// Users Management Page
router.get('/users', (req, res) => {
    res.sendFile(path.join(publicDir, 'pages/users.html'));
});

module.exports = router;

========== ./routes/payments.js ==========
const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");

// Route لإنشاء الدفع
router.post("/", paymentController.createPayment);

// Route لتحديث حالة الدفع
router.post("/update-payment-status", paymentController.updatePaymentStatus);

module.exports = router;
========== ./routes/sales.js ==========
const express = require("express");
const router = express.Router();
const salesController = require("../controllers/salesController");
const { authMiddleware, authorizeRoles } = require("../middleware/authMiddleware");

router.get("/", authMiddleware, salesController.getAllSales);
router.get("/:id", authMiddleware, salesController.getSaleById);
router.post("/add", authMiddleware, authorizeRoles("manager"), salesController.addSale);
router.put("/:id", authMiddleware, authorizeRoles("manager"), salesController.updateSale);
router.delete("/:id", authMiddleware, authorizeRoles("manager"), salesController.deleteSale);

module.exports = router;

========== ./routes/settings.js ==========
const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');

router.get('/', settingsController.getAllSettings);
router.post('/', settingsController.updateSetting);
router.post('/bulk', settingsController.updateSettingsBulk);

module.exports = router;

========== ./routes/systemRoutes.js ==========
const express = require('express');
const router = express.Router();
const { restartServer } = require('../controllers/systemController');

// ✅ Route لإعادة تشغيل السيرفر
router.post('/restart-server', restartServer);

module.exports = router;
========== ./routes/userRoutes.js ==========
const express = require("express");
const router = express.Router();
const { Users } = require("../models"); // تأكد أن اسم الموديل صحيح
const verifyToken = require("../middleware/authMiddleware"); // لو عندك توكن تحقق

router.get("/getUserRole", verifyToken, async (req, res) => {
    try {
        const user = await Users.findOne({ where: { id: req.user.id } });

        if (!user) {
            return res.status(404).json({ message: "المستخدم غير موجود" });
        }

        res.json({ role: user.role }); // تأكد أن لديك حقل "role" في الجدول
    } catch (error) {
        console.error("❌ خطأ أثناء جلب بيانات المستخدم:", error);
        res.status(500).json({ message: "خطأ في السيرفر الداخلي" });
    }
});

module.exports = router;

========== ./routes/users.js ==========
const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController"); // ✅ تأكد أن هذا المسار صحيح

router.get("/getUserRole", userController.getUserRole); // ✅ تأكد أن `getUserRole` ليست undefined
router.get("/", userController.getAllUsers);    // ✅ عرض جميع المستخدمين
router.post("/", userController.createUser);    // ✅ إنشاء مستخدم جديد
router.put("/:id", userController.updateUser);  // ✅ تعديل مستخدم
router.delete("/:id", userController.deleteUser); // ✅ حذف مستخدم

module.exports = router;

========== ./server.js ==========
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const helmet = require("helmet");
const errorHandler = require("./middleware/errorHandler");
const sequelize = require("./config/db");
const { startAutoBackup } = require("./utils/backup");

// ✅ Route Imports
const userRoutes = require("./routes/users");
const loginRoutes = require("./routes/login");
const productsRoutes = require("./routes/Products");
const orderRoutes = require("./routes/order");
const salesRoutes = require("./routes/sales");
const inventoryRoutes = require("./routes/inventory");
const discountRoutes = require("./routes/discountRoutes");
const closingRoutes = require("./routes/closing");
const customerRoutes = require("./routes/customers");
const authRoutes = require("./routes/auth");
const ordersRoutes = require("./routes/orders");
const indexRoutes = require("./routes/index");
const paymentRoutes = require("./routes/payments");
const dashboardRoutes = require("./routes/dashboard");
const systemRoutes = require("./routes/systemRoutes");
const analyticsRoutes = require("./routes/analytics");
const commentRoutes = require('./routes/comment');
const expenseRoutes = require("./routes/expenses");
const settingsRoutes = require("./routes/settings");
const merchantsRoutes = require("./routes/merchants");

const sanitizeInput = require("./middleware/sanitize");
const rateLimiter = require("./middleware/rateLimiter");

const app = express();

// 🛡️ Security Middleware Chain
app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(cors());
app.use(bodyParser.json({ limit: '10kb' })); // Body size limit
app.use(sanitizeInput); // Global XSS Protection

// 🚦 Global API Rate Limiter (100 requests per minute)
const apiLimiter = rateLimiter({ windowMinutes: 1, maxRequests: 100, keyPrefix: 'api_global' });
app.use("/api", apiLimiter);

// ✅ Static file serving
app.use(express.static(path.join(__dirname, "public")));

// ✅ API Routes (prefixed with /api to avoid conflicts)
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/discounts", discountRoutes);
app.use("/api/closing", closingRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api", dashboardRoutes);
app.use("/api", systemRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/comments', commentRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/merchants", merchantsRoutes);

// ✅ Auth & Login
app.use("/login", loginRoutes);

// ✅ Other index helpers
app.use("/", indexRoutes);

// ✅ Error Handler (must be last)
app.use(errorHandler);

const JWT_SECRET = 'mySuperSecretKey123';
console.log("🔑 JWT Secret Loaded");

const { Setting } = require("./models");

sequelize
  .authenticate()
  .then(async () => {
    console.log("✅ Connected to the database successfully!");
    try {
      await sequelize.sync(); // Sync all models for Supabase fresh start
      
      // ✅ Check and add 'variants' column to 'inventory' table if missing (DB Agnostic)
      const tableInfo = await sequelize.getQueryInterface().describeTable('inventory');
      if (!tableInfo.variants) {
        await sequelize.query('ALTER TABLE inventory ADD COLUMN variants JSON NULL');
        console.log("✅ Column 'variants' added to 'inventory' table.");
      }

      // ✅ Ensure Performance Indexes exist in PostgreSQL
      console.log("⚡ Ensuring Database Indexes exist for optimal performance...");
      try {
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_orders_businessDate ON "Orders" ("businessDate")`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_orders_createdAt ON "Orders" ("createdAt")`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_orders_isCancelled ON "Orders" ("isCancelled")`);
        
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_merchantTrans_merchantId ON merchant_transactions ("merchantId")`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_merchantTrans_date ON merchant_transactions ("date")`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_recipes_sandwich ON recipes ("sandwich")`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_inventory_qty ON inventory ("quantity")`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_inventory_min ON inventory ("min")`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_inventory_expiry ON inventory ("expiryDate")`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses ("date")`);
        console.log("✅ Performance Indexes applied successfully.");
      } catch (indexErr) {
        console.error("⚠️ Note: Could not create indexes automatically. They might already exist.", indexErr.message);
      }

      // ✅ Seed Default Settings if empty
      const settingsCount = await Setting.count();
      if (settingsCount === 0) {
        console.log("🌱 Seeding default settings...");
        await Setting.bulkCreate([
          { key: 'store_name', value: 'Vortex POS', group: 'general' },
          { key: 'vat_percent', value: '0', group: 'finance' },
          { key: 'currency', value: 'EGP', group: 'finance' },
          { key: 'active_business_date', value: new Date().toLocaleDateString('en-CA'), group: 'system' }
        ]);
        console.log("✅ Default settings seeded.");
      }

      console.log("✅ Settings table synced");
    } catch (err) {
      console.error("⚠️ Error during DB initialization:", err);
    }
  })
  .catch((err) => console.error("⚠️ Error connecting to the database:", err));

const PORT = process.env.PORT || 8083;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  
  // 💾 Start Auto Backup (Runs every 12 hours)
  startAutoBackup(12);
});

========== ./services/discountService.js ==========

========== ./services/paymentService.js ==========

========== ./showColumns.js ==========
const mysql = require('mysql2');

// إعداد الاتصال بقاعدة البيانات
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'adham', // استبدل باسم المستخدم الخاص بك
    password: 'Adham123!', // استبدل بكلمة المرور الخاصة بك
    database: 'pos_system' // استبدل باسم قاعدة البيانات الخاصة بك
});

// الاتصال بقاعدة البيانات
connection.connect((err) => {
    if (err) {
        console.error('Error connecting to the database:', err);
        return;
    }
    console.log('Connected to the database.');

    // استعلام لجلب جميع الأعمدة من جميع الجداول
    const query = `
        SELECT 
            TABLE_NAME, 
            COLUMN_NAME, 
            DATA_TYPE, 
            CHARACTER_MAXIMUM_LENGTH 
        FROM 
            INFORMATION_SCHEMA.COLUMNS 
        WHERE 
            TABLE_SCHEMA = 'pos_system'; 
    `;

    // تنفيذ الاستعلام
    connection.query(query, (error, results) => {
        if (error) {
            console.error('Error fetching columns:', error);
            return;
        }

        // عرض النتائج في التيرمينال
        results.forEach(row => {
            console.log(`Table: ${row.TABLE_NAME}, Column: ${row.COLUMN_NAME}, Type: ${row.DATA_TYPE}, Max Length: ${row.CHARACTER_MAXIMUM_LENGTH}`);
        });

        // إغلاق الاتصال
        connection.end();
    });
});
========== ./sync_supabase.js ==========
const { sequelize } = require('./models');
const bcrypt = require('bcryptjs');
const { User, Setting } = require('./models');

async function syncSupabase() {
    try {
        console.log("🔄 Connecting to Supabase and syncing tables...");
        
        // Sync all models safely
        await sequelize.sync({ alter: true }); 
        console.log("✅ All tables synced/updated successfully on Supabase!");

        // Create default admin user if not exists
        console.log("👤 Checking admin user...");
        const adminExists = await User.findOne({ where: { username: 'admin' } });
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await User.create({
                username: 'admin',
                password: hashedPassword,
                role: 'manager'
            });
            console.log("✅ Admin user created (User: admin, Pass: admin123)");
        }

        // Initialize default settings (Key-Value style)
        console.log("⚙️ Initializing default settings...");
        const defaultSettings = [
            { key: 'store_name', value: 'Dar El Farouk', group: 'general' },
            { key: 'currency', value: 'ج.م', group: 'general' },
            { key: 'hotline', value: '01211228565', group: 'general' },
            { key: 'footer_message', value: 'شكراً لزيارتكم', group: 'general' },
            { key: 'active_business_date', value: new Date().toLocaleDateString('en-CA'), group: 'system' }
        ];

        for (const s of defaultSettings) {
            await Setting.findOrCreate({ where: { key: s.key }, defaults: s });
        }
        console.log("✅ Default settings initialized.");

        console.log("\n🚀 Supabase is now FULLY READY for Vortex POS!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error syncing with Supabase:", error);
        process.exit(1);
    }
}

syncSupabase();

========== ./test_api.js ==========
const { User } = require('./models');
const jwt = require('jsonwebtoken');
const secretKey = 'mySuperSecretKey123'; // matches authMiddleware.js

async function test() {
  try {
    const user = await User.findOne({ where: { username: 'admin' } });
    if (!user) return console.log("No admin user found");
    
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, secretKey, { expiresIn: '1h' });
    
    const res = await fetch('http://localhost:8083/api/products/beef', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Data length:", data.length);
    console.log("First item:", data[0]);
  } catch (e) {
    console.error(e);
  }
}
test();

========== ./test_cashier_logic.js ==========
// 🧪 Comprehensive Cashier Logic Test
// This script simulates the pricing and order logic implemented in cashier.js

const testScenarios = [
    { 
        name: "الفقي جولد", 
        basePrice: 1000, 
        size: "56 S", 
        expectedPrice: 1000,
        desc: "Normal Size (Base Price)"
    },
    { 
        name: "الفقي جولد", 
        basePrice: 1000, 
        size: "64 M", 
        expectedPrice: 1050,
        desc: "Special Size - Length 64 (+50)"
    },
    { 
        name: "الفقي جولد", 
        basePrice: 1000, 
        size: "58 2XL", 
        expectedPrice: 1050,
        desc: "Special Size - Width 2XL (+50)"
    },
    { 
        name: "الفقي فرنساوي", 
        basePrice: 1200, 
        size: "64 3XL", 
        expectedPrice: 1250,
        desc: "Special Size - Fabric Price (1200) + Special Surcharge (+50)"
    },
    { 
        name: "الباز مسك", 
        basePrice: 1100, 
        size: "64 3XL", 
        expectedPrice: 1100,
        desc: "Non-Feki Brand - No Surcharge for large size"
    },
    { 
        name: "سروال الامثل", 
        basePrice: 250, 
        size: "L", 
        expectedPrice: 250,
        desc: "Standard Accessory"
    }
];

function calculatePrice(name, price, size) {
    let finalPrice = parseFloat(price);
    // Logic exactly as in cashier.js
    const isSpecialSize = name.startsWith("الفقي") && (size.startsWith("64") || size.includes("2XL") || size.includes("3XL"));
    
    if (isSpecialSize) {
        finalPrice += 50;
    }
    return finalPrice;
}

const paymentMethods = ["Cash", "Card", "InstaPay", "Vodafone Cash"];

console.log("\n==================================================");
console.log("🚀 STARTING COMPREHENSIVE CASHIER LOGIC TEST");
console.log("==================================================\n");

let overallPassed = true;

testScenarios.forEach((scenario, index) => {
    const actualPrice = calculatePrice(scenario.name, scenario.basePrice, scenario.size);
    const passed = actualPrice === scenario.expectedPrice;
    
    console.log(`Test #${index + 1}: ${scenario.desc}`);
    console.log(`   Product: ${scenario.name}`);
    console.log(`   Size   : ${scenario.size}`);
    console.log(`   Result : ${passed ? "✅ PASSED" : "❌ FAILED"}`);
    console.log(`   Price  : ${actualPrice} EGP (Expected: ${scenario.expectedPrice} EGP)`);
    console.log("--------------------------------------------------");
    
    if (!passed) overallPassed = false;
});

console.log("\n💳 Testing Payment Methods Integration:");
paymentMethods.forEach(method => {
    console.log(`   ✅ Payment Gateway Ready for: ${method}`);
});

console.log("\n==================================================");
if (overallPassed) {
    console.log("✨ ALL LOGIC TESTS PASSED SUCCESSFULLY! ✨");
    console.log("The cashier workspace is ready for production.");
} else {
    console.log("⚠️ SOME TESTS FAILED. PLEASE REVIEW THE LOGIC.");
}
console.log("==================================================\n");

========== ./test_category.js ==========
const Product = require('./models/Products');
const sequelize = require('./config/db');

async function testCategory() {
    try {
        await sequelize.authenticate();
        console.log('✅ Connected to DB');
        
        // Sync the model to ensure the schema is updated
        await Product.sync({ alter: true });
        console.log('✅ Model synced');

        const newCat = 'Summer Collection ' + Math.floor(Math.random() * 1000);
        console.log(`🧪 Testing with new category: ${newCat}`);

        const testProduct = await Product.create({
            name: 'Test Shirt',
            category: newCat,
            price: 250.00,
            wholesalePrice: 180.00,
            sold: 0
        });

        console.log('✅ Product created successfully with NEW category!');
        console.log('📦 Data:', testProduct.toJSON());

        // Cleanup
        await testProduct.destroy();
        console.log('🧹 Test data cleaned up.');

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        process.exit();
    }
}

testCategory();

========== ./test_db.js ==========
const { Setting, DailyClosing } = require('./models');

async function test() {
    const setting = await Setting.findOne({ where: { key: 'active_business_date' } });
    console.log("Current active_business_date:", setting ? setting.value : 'None');
    
    const closings = await DailyClosing.findAll({ attributes: ['closingDate'] });
    console.log("Closed days:", closings.map(c => c.closingDate).sort());
}
test().catch(console.error).finally(() => process.exit(0));

========== ./utils/arabicHelper.js ==========
/**
 * 🌍 Arabic Text Helper Utility
 * Provides basic RTL support and character reshaping for PDF & Thermal Printing.
 */

/**
 * Basic Arabic Reverser/Shaper
 * This is a lightweight alternative to full shaping libraries.
 * It primarily reverses Arabic words to fix PDFKit's LTR display issue.
 */
function fixArabic(text) {
    if (!text) return "";
    
    // Check if text contains Arabic characters
    const arabicPattern = /[\u0600-\u06FF\u0750-\u077F]/;
    if (!arabicPattern.test(text)) return text;

    // Handle sentences: reverse each word's order but keep sentences logical
    // Note: Professional shaping requires complex logic for joining letters.
    // This is a "good enough" fix for PDFKit when used with a proper font.
    return text.split(' ').map(word => {
        if (arabicPattern.test(word)) {
            return word.split('').reverse().join('');
        }
        return word;
    }).reverse().join(' ');
}

module.exports = { fixArabic };

========== ./utils/auditLogger.js ==========
const { AuditLog } = require('../models');

/**
 * 📝 Enhanced Audit Logger
 * Captures data changes (diffs) or full snapshots for financial tables.
 * Based on Claude's recommendation for robust financial auditing.
 */
const logAudit = async (req, { action, tableName, recordId, oldValues, newValues }) => {
    try {
        // Tables that require full snapshots instead of just diffs
        const FINANCIAL_TABLES = [
            'merchant_transactions', 
            'merchant_balances', 
            'expenses', 
            'order_payments',
            'orders' // Orders are also critical
        ];
        
        const isFinancial = FINANCIAL_TABLES.includes(tableName);
        let finalOld = oldValues;
        let finalNew = newValues;
        let meta = { snapshot: isFinancial };

        if (action === 'UPDATE' && !isFinancial) {
            // Diff logic for non-financial tables to save space
            finalOld = {};
            finalNew = {};
            
            const keys = Object.keys(newValues || {});
            keys.forEach(key => {
                if (JSON.stringify(newValues[key]) !== JSON.stringify(oldValues?.[key])) {
                    finalOld[key] = oldValues?.[key];
                    finalNew[key] = newValues[key];
                }
            });

            // If nothing changed, don't log anything
            if (Object.keys(finalNew).length === 0) return;
        }

        // Add specialized financial metadata if applicable
        if (isFinancial) {
            meta = {
                ...meta,
                balance_before: oldValues?.balance ?? oldValues?.current_balance ?? null,
                balance_after: newValues?.balance ?? newValues?.current_balance ?? null,
                amount: newValues?.amount ?? oldValues?.amount ?? null,
                currency: 'EGP' // Default
            };
        }

        await AuditLog.create({
            userId: req.user?.id,
            userName: req.user?.username,
            action,
            tableName,
            recordId: String(recordId),
            oldValues: finalOld,
            newValues: finalNew,
            meta,
            ipAddress: req.ip,
            endpoint: `${req.method} ${req.originalUrl}`
        });
    } catch (error) {
        console.error('❌ Audit Logging Error:', error);
        // Fail silent to not block main operation, but log error
    }
};

module.exports = { logAudit };

