const { Order} = require("../models");

exports.fetchOrders = async (req, res) => {
    try {
        const orders = await Order.findAll({ order: [["id", "DESC"]] });
        res.json(orders);
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
