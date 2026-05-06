const { Order, Recipe, Inventory, DailyClosing, MonthlyClosing, sequelize, Payment, Product, Expense } = require('../models');
const { Op } = require('sequelize');

// Helper to get active business date
async function getActiveBusinessDate() {
    const { Setting } = require('../models');
    const activeDateSetting = await Setting.findOne({ where: { key: 'active_business_date' } });
    return activeDateSetting ? activeDateSetting.value : new Date().toLocaleDateString('en-CA');
}

exports.getDailySummary = async (req, res) => {
    try {
        const businessDate = req.query.date || await getActiveBusinessDate();

        // 🟢 Total Orders
        const totalOrders = await Order.count({
            where: { businessDate, isCancelled: "No" }
        });

        // 🟢 Total Sandwiches
        const orders = await Order.findAll({
            where: { businessDate, isCancelled: "No" },
            attributes: ['orderDetails']
        });

        let totalItems = 0;
        const productStats = {};
        const categoryStats = {};

        for (const order of orders) {
            const orderDetails = JSON.parse(order.orderDetails);
            for (const item of orderDetails) {
                if (!item.quantity || isNaN(item.quantity) || item.name === "تعليق") continue;
                totalItems += item.quantity;
                productStats[item.name] = (productStats[item.name] || 0) + item.quantity;
                
                // Track category
                const product = await Product.findOne({ where: { name: item.name } });
                if (product && product.category) {
                    categoryStats[product.category] = (categoryStats[product.category] || 0) + item.quantity;
                }
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

        // 🟢 Total Ingredient Costs
        const totalCost = await calculateTotalCost(businessDate);

        // 🟢 Total Revenue
        const totalRevenue = await Order.sum('orderTotal', {
            where: { businessDate, isCancelled: "No" }
        }) || 0;

        // 🟢 Total Discounts
        const totalDiscount = await Order.sum('discountAmount', {
            where: { businessDate, isCancelled: "No" }
        }) || 0;

        // 🔴 NEW: Total Daily Expenses
        const totalExpenses = await Expense.sum('amount', {
            where: { date: businessDate }
        }) || 0;

        // 💰 Calculate Breakdown (In-Memory for maximum accuracy)
        const activeOrders = await Order.findAll({
            where: { businessDate, isCancelled: "No" },
            attributes: ['orderTotal', 'payment_method']
        });

        let cashTotal = 0;
        let instaPayTotal = 0;
        let vcashTotal = 0;
        let cardTotal = 0;
        let othersTotal = 0;

        activeOrders.forEach(o => {
            const amount = parseFloat(o.orderTotal) || 0;
            const method = (o.payment_method || '').toLowerCase();
            if (method === 'cash') cashTotal += amount;
            else if (method === 'instapay') instaPayTotal += amount;
            else if (method === 'vcash') vcashTotal += amount;
            else if (method === 'card') cardTotal += amount;
            else othersTotal += amount;
        });

        // 💰 Net Earnings (Revenue - Cost - Expenses)
        const totalEarnings = parseFloat((totalRevenue - totalCost - totalExpenses).toFixed(2));

        // 📜 Get Detailed Orders List
        const ordersList = await Order.findAll({
            where: { businessDate, isCancelled: "No" },
            attributes: ['id', 'customerName', 'orderTotal', 'payment_method', 'createdAt'],
            order: [['createdAt', 'ASC']]
        });

        // 📜 Get Detailed Expenses List
        const expensesList = await Expense.findAll({
            where: { date: businessDate },
            attributes: ['description', 'category', 'amount'],
            order: [['createdAt', 'ASC']]
        });

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
            expensesList
        });

    } catch (error) {
        console.error('⚠️ Daily Summary Error:', error);
        res.status(500).json({ error: '⚠️ Error loading summary data!' });
    }
};

exports.closeDay = async (req, res) => {
    try {
        const businessDate = await getActiveBusinessDate();

        const existingClosing = await DailyClosing.findOne({ where: { closingDate: businessDate } });
        if (existingClosing) {
            return res.status(400).json({ error: '⚠️ اليوم قد تم إغلاقه بالفعل!' });
        }

        // Re-calculate everything to be sure (using robust Order-based logic)
        const totalOrders = await Order.count({ where: { businessDate, isCancelled: "No" } });
        const totalRevenue = await Order.sum("orderTotal", { where: { businessDate, isCancelled: "No" } }) || 0;
        const totalDiscount = await Order.sum("discountAmount", { where: { businessDate, isCancelled: "No" } }) || 0;
        const totalCost = await calculateTotalCost(businessDate);
        const totalExpenses = await Expense.sum('amount', { where: { date: businessDate } }) || 0;

        // Calculate Digital Breakdown from Order table
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
            const details = JSON.parse(order.orderDetails);
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
        
        const nextDate = new Date(businessDate);
        nextDate.setDate(nextDate.getDate() + 1);
        const nextDateStr = nextDate.toLocaleDateString('en-CA');
        
        const { Setting } = require('../models');
        await Setting.upsert({ key: 'active_business_date', value: nextDateStr, group: 'system' });

        res.json({ success: true, message: '✅ تم إغلاق اليوم بنجاح!', nextDate: nextDateStr });

    } catch (error) {
        console.error('❌ Close Day Error:', error);
        res.status(500).json({ error: '⚠️ Error closing the day' });
    }
};

async function calculateTotalCost(businessDate) {
    let totalCost = 0;
    const ingredientMap = {};
    const orders = await Order.findAll({ where: { businessDate, isCancelled: "No" }, attributes: ['orderDetails'] });
    for (const order of orders) {
        const details = JSON.parse(order.orderDetails);
        for (const item of details) {
            const recipes = await Recipe.findAll({ where: { sandwich: item.name } });
            recipes.forEach(recipe => {
                const ingredient = recipe.ingredient.trim().toLowerCase();
                const quantityUsed = recipe.amount * item.quantity;
                ingredientMap[ingredient] = (ingredientMap[ingredient] || 0) + quantityUsed;
            });
        }
    }
    const inventoryData = await Inventory.findAll({
        where: { name: { [Op.in]: Object.keys(ingredientMap) } },
        attributes: ['name', 'cost']
    });
    inventoryData.forEach(item => {
        const name = item.name.trim().toLowerCase();
        if (ingredientMap[name]) totalCost += ingredientMap[name] * item.cost;
    });
    return parseFloat(totalCost.toFixed(2));
}

exports.getMonthlySummary = async (req, res) => {
    try {
        const currentMonth = req.query.month || new Date().toISOString().slice(0, 7); // "yyyy-MM"
        
        // Use MySQL DATE() function to avoid UTC timezone offset issues
        // This ensures e.g. '2026-04-30 00:00:00 UTC' is treated as April, not March
        const whereClause = {
            [Op.and]: [
                sequelize.where(sequelize.fn('DATE', sequelize.col('closingDate')), { [Op.gte]: `${currentMonth}-01` }),
                sequelize.where(sequelize.fn('DATE', sequelize.col('closingDate')), { [Op.lte]: sequelize.literal(`LAST_DAY('${currentMonth}-01')`) })
            ]
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
                        [Op.startsWith]: currentMonth
                    },
                    isCancelled: "No"
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

        const total_orders = await DailyClosing.sum("totalOrders", { where: { closingDate: { [Op.startsWith]: currentMonth } } }) || 0;
        const total_sandwiches = await DailyClosing.sum("totalSandwiches", { where: { closingDate: { [Op.startsWith]: currentMonth } } }) || 0;
        const total_revenue = await DailyClosing.sum("totalRevenue", { where: { closingDate: { [Op.startsWith]: currentMonth } } }) || 0;
        const total_cost = await DailyClosing.sum("totalCost", { where: { closingDate: { [Op.startsWith]: currentMonth } } }) || 0;
        const totalExpenses = await DailyClosing.sum("totalExpenses", { where: { closingDate: { [Op.startsWith]: currentMonth } } }) || 0;
        const totalDiscount = await DailyClosing.sum("totalDiscount", { where: { closingDate: { [Op.startsWith]: currentMonth } } }) || 0;
        const onlinePaymentsTotal = await DailyClosing.sum("onlinePaymentsTotal", { where: { closingDate: { [Op.startsWith]: currentMonth } } }) || 0;

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

        // Archive daily closings for the month
        await DailyClosing.destroy({ where: { closingDate: { [Op.startsWith]: currentMonth } } });
        
        await Product.update({ sold: 0 }, { where: {} });

        res.json({ success: true, message: "✅ تم إغلاق الشهر بنجاح!" });

    } catch (error) {
        console.error("❌ Close Month Error:", error);
        res.status(500).json({ error: "⚠️ Error closing month" });
    }
};