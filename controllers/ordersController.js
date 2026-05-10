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

        // 📊 Unified Count Calculation
        const countsWhere = { businessDate: filterDate };
        const counts = {
            all: await Order.count({ where: countsWhere }),
            paid: await Order.count({ where: { ...countsWhere, payment_status: 'Paid', isCancelled: { [Op.ne]: 'Yes' } } }),
            pending: await Order.count({ where: { ...countsWhere, payment_status: 'Pending', isCancelled: { [Op.ne]: 'Yes' } } }),
            cancelled: await Order.count({ where: { ...countsWhere, isCancelled: 'Yes' } }),
            today: await Order.count({ where: { businessDate: activeBusinessDate } }) // ✅ Total for current active day
        };

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
