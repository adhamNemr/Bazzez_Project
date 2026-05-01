const { Order, sequelize } = require("../models");

exports.fetchOrders = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const nopaging = req.query.nopaging === 'true';
        const { date, status, search } = req.query;
        const { Op } = require("sequelize");

        const { Setting } = require('../models');
        const activeDateSetting = await Setting.findOne({ where: { key: 'active_business_date' } });
        const activeBusinessDate = activeDateSetting ? activeDateSetting.value : new Date().toLocaleDateString('en-CA');

        const where = {};

        // 🗓️ Strict Date Filter (Always filter by businessDate)
        const filterDate = (date && date.trim() !== "" && date !== 'undefined') ? date : activeBusinessDate;
        console.log("🔍 Filtering by business date:", filterDate);
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
        
        // 🌍 Normalize Arabic/Hindi Numerals to English
        const arabicMap = { '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9' };
        cleanSearch = cleanSearch.replace(/[٠-٩]/g, d => arabicMap[d]);

        const isNumericSearch = !isNaN(cleanSearch) && cleanSearch !== "";

        if (cleanSearch !== "") {
            where[Op.or] = [
                { dailySerial: isNumericSearch ? parseInt(cleanSearch) : 0 },
                sequelize.where(sequelize.cast(sequelize.col('dailySerial'), 'CHAR'), { [Op.like]: `%${cleanSearch}%` }),
                { customerName: { [Op.like]: `%${cleanSearch}%` } },
                { customerPhone: { [Op.like]: `%${cleanSearch}%` } }
            ];
            console.log("🔍 Searching for:", cleanSearch, "within", filterDate);
        }

        console.log("🛠️ Sequelize Where Clause:", JSON.stringify(where));

        if (nopaging) {
            const orders = await Order.findAll({ where, order: [["id", "DESC"]] });
            return res.json(orders);
        }

        const { count, rows } = await Order.findAndCountAll({
            attributes: {
                include: [
                    [
                        sequelize.literal(`(CASE 
                            WHEN dailySerial = ${isNumericSearch ? parseInt(cleanSearch) : -1} THEN 1
                            WHEN CAST(dailySerial AS CHAR) LIKE '%${cleanSearch}%' THEN 2
                            ELSE 100 END)`),
                        'relevance'
                    ]
                ]
            },
            where,
            order: (isNumericSearch && cleanSearch !== "") ? [
                [sequelize.literal('relevance'), 'ASC'],
                ["dailySerial", "ASC"]
            ] : [["id", "DESC"]],
            limit: limit,
            offset: offset
        });

        // 📊 Unified Count Calculation (Scoped ONLY to Business Date)
        const countsWhere = { businessDate: filterDate };
        const counts = {
            all: await Order.count({ where: countsWhere }),
            paid: await Order.count({ where: { ...countsWhere, payment_status: 'Paid', isCancelled: { [Op.ne]: 'Yes' } } }),
            pending: await Order.count({ where: { ...countsWhere, payment_status: 'Pending', isCancelled: { [Op.ne]: 'Yes' } } }),
            cancelled: await Order.count({ where: { ...countsWhere, isCancelled: 'Yes' } })
        };

        const rankedRows = rows.map(r => {
            const data = r.get({ plain: true });
            // Remove relevance from the final object if you want it super clean, 
            // but keeping it is fine as it doesn't affect the UI.
            return data;
        });

        res.json({
            orders: rankedRows,
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

        const sandwiches = JSON.parse(orderDetails);
        const total = sandwiches.reduce((total, sandwich) => total + sandwich.quantity, 0);

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

        console.log("✅ orderDetails:", orderDetails);
        console.log("🔎 typeof orderDetails:", typeof orderDetails);

        let items;

        // ✅ تنظيف النص قبل التحويل
        const cleanedOrderDetails = orderDetails.replace(/\u200B/g, "").trim();

        if (typeof cleanedOrderDetails === "string") {
            items = JSON.parse(cleanedOrderDetails);
        } else {
            items = cleanedOrderDetails;
        }

        // ✅ تحويل إلى مصفوفة بشكل مضمون
        items = Array.from(items);

        console.log("🚨 items بعد JSON.parse:", items);
        console.log("🔍 Array.isArray:", Array.isArray(items));
        console.log("🔍 instanceof Array:", items instanceof Array);

        // ✅ التحقق النهائي
        if (!Array.isArray(items)) {
            console.error("❌ items ليست مصفوفة بعد JSON.parse");
            throw new Error("⚠️ items ليست مصفوفة بعد JSON.parse");
        }

        // ✅ بناء مصفوفة منسقة بدلاً من HTML
        const formatted = items.map((item) => {
            let addonsTotal = 0;

            // 🔥 حساب إجمالي الإضافات (Add-ons)
            const comments = (item.comments || []).map(comment => {
                const addPrice = parseFloat(comment.price || 0);
                addonsTotal += addPrice;
                return {
                    text: comment.text,
                    price: addPrice.toFixed(2)
                };
            });

            // دعم manualComments كحالة احتياطية للطلبات القديمة
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

        order.isCancelled = "Yes"; // ✅ تعديل القيمة هنا إلى "Yes"
        await order.save();

        res.json({ success: true, order }); // ✅ إرجاع الطلب المحدث
    } catch (error) {
        console.error("❌ خطأ أثناء إلغاء الطلب:", error);
        res.status(500).json({ success: false, message: "❌ خطأ أثناء الإلغاء" });
    }
};
