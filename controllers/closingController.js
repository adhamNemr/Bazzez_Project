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