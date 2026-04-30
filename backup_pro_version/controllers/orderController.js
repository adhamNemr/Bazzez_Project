const { Op , Sequelize} = require('sequelize');
const { Order, Customer, Product, DiscountCode, Payment, Recipe, Inventory, Comment } = require('../models');
const { printReceipt } = require('./receiptPrinter');

// ✅ دالة لحساب الخصم تلقائيًا بناءً على المنتجات الموجودة في الطلب
exports.applyAutomaticDiscount = async (orderDetails, orderTotal, discountCode) => {
    let discountValue = 0;
    let appliedDiscounts = [];

    if (discountCode) {
        // console.log("🎯 كود الخصم:", discountCode);

        const discount = await DiscountCode.findOne({
            where: { 
                code: discountCode, 
                end_date: { [Op.gte]: new Date() },
                is_active: 1
            }
        });

        if (discount) {
            // console.log("✅ تم العثور على كود خصم صالح");

            let applicableProducts = discount.applicable_products;

            // ✅ تأكد إن applicable_products عبارة عن Array
            if (!Array.isArray(applicableProducts)) {
                try {
                    applicableProducts = JSON.parse(discount.applicable_products);
                } catch (error) {
                    console.error('❌ خطأ في تحويل applicable_products إلى JSON:', discount.applicable_products);
                    applicableProducts = [];
                }
            }

            // console.log("✅ المنتجات القابلة للخصم:", applicableProducts);

            for (const item of orderDetails) {
                if (applicableProducts.includes(item.name)) {
                    // console.log(`🔎 المنتج المطابق: ${item.name}`);

                    let itemDiscount = 0;

                    if (discount.discount_type === 'percentage') {
                        // ✅ خصم بنسبة مئوية على كل منتج
                        itemDiscount = (item.price * discount.discount_value) / 100;
                        // console.log(`💸 خصم بنسبة (${discount.discount_value}%) على ${item.name}: ${itemDiscount.toFixed(2)}`);
                    } else if (discount.discount_type === 'fixed') {
                        // ✅ خصم بقيمة ثابتة على كل منتج
                        itemDiscount = discount.discount_value;
                        // console.log(`💸 خصم بقيمة ثابتة (${discount.discount_value}) على ${item.name}`);
                    }

                    // ✅ خصم على كل منتج حسب الكمية
                    const totalItemDiscount = itemDiscount * item.quantity;
                    discountValue += totalItemDiscount;

                    appliedDiscounts.push({
                        product: item.name,
                        discount: totalItemDiscount
                    });

                    // console.log(`✅ إجمالي الخصم على ${item.name} = ${totalItemDiscount.toFixed(2)}`);
                }
            }

            // console.log("🔹 أفضل كود خصم متاح:", discountCode);
            // console.log("💰 إجمالي قيمة الخصم:", discountValue.toFixed(2));
        } else {
            console.log("❌ كود الخصم غير صالح أو منتهي");
        }
    } else {
        console.log("❌ لا يوجد كود خصم مُدخل");
    }

    return { discountValue, appliedDiscounts };
};

// ✅ جلب قائمة الطاولات المشغولة حالياً
exports.getActiveTables = async (req, res) => {
    try {
        const activeOrders = await Order.findAll({
            where: {
                orderType: 'table',
                status: 'open',
                isCancelled: 'No'
            },
            attributes: ['tableNumber']
        });
        const tableNumbers = activeOrders.map(o => o.tableNumber);
        res.json(tableNumbers);
    } catch (error) {
        console.error("❌ خطأ في جلب الطاولات النشطة:", error);
        res.status(500).json({ message: "❌ خطأ في السيرفر" });
    }
};

// ✅ جلب تفاصيل أوردر معين بناءً على رقم الطاولة
exports.getOrderByTable = async (req, res) => {
    try {
        const { tableNumber } = req.params;
        const order = await Order.findOne({
            where: {
                tableNumber: tableNumber,
                orderType: 'table',
                status: 'open',
                isCancelled: 'No'
            },
            order: [['id', 'DESC']]
        });

        if (!order) {
            return res.status(404).json({ message: "❌ لا يوجد طلب مفتوح لهذه الطاولة" });
        }

        res.json(order);
    } catch (error) {
        console.error("❌ خطأ في جلب تفاصيل الطلب:", error);
        res.status(500).json({ message: "❌ خطأ في السيرفر" });
    }
};

exports.createOrder = async (req, res) => {
    try {
        console.log("📥 البيانات المستلمة عند إنشاء الطلب:", req.body);

        const { customer, deliveryPrice, orderTotal, orderDetails, payment_method, discountCode, commentText } = req.body;

        if (!customer || !customer.phone) {
            return res.status(400).json({ message: "❌ رقم الهاتف مطلوب لإنشاء الطلب." });
        }

        const { name, phone, address } = customer;

        // ✅ تحويل القيم لضمان صحتها
        const finalDeliveryPrice = Number(deliveryPrice) || 0;
        const finalOrderTotal = Number(orderTotal) || 0;

        if (!Array.isArray(orderDetails) || orderDetails.length === 0) {
            return res.status(400).json({ message: "❌ الطلب يجب أن يحتوي على منتج واحد على الأقل." });
        }

        // ✅ البحث عن العميل أو إنشاؤه (مع استثناء التيك أواي والطاولات من الزحمة)
        let existingCustomer;
        if (phone === "0000") {
            // ✅ استخدام عميل وهمي للطلبات السريعة
            existingCustomer = await Customer.findOne({ where: { phone: "0000" } });
            if (!existingCustomer) {
                existingCustomer = await Customer.create({ 
                    name: "Fast Checkout", 
                    phone: "0000", 
                    address: "Store",
                    totalOrders: 0,
                    totalSpent: 0
                });
            }
        } else {
            // ✅ العميل العادي
            existingCustomer = await Customer.findOne({ where: { phone } });
            if (!existingCustomer) {
                existingCustomer = await Customer.create({ name, phone, address });
            }
        }

        // ✅ تطبيق الخصم تلقائيًا
        const { discountValue, appliedDiscounts } = await this.applyAutomaticDiscount(orderDetails, orderTotal, discountCode);
        const productTotal = orderDetails.reduce((total, product) => total + (product.price * product.quantity), 0);
        const finalProductTotal = productTotal - discountValue;
        const finalTotal = Math.max(finalProductTotal + deliveryPrice, 0);

        // ✅ إضافة التعليق للـ orderDetails (إذا وُجد)
        if (commentText) {
            orderDetails.push({
                name: "تعليق",
                price: 0,
                quantity: 1,
                commentText: commentText
            });
        }

        // ✅ إنشاء الطلب
        const order = await Order.create({
            customerId: existingCustomer.id,
            customerName: name || existingCustomer.name, // حفظ الاسم المدخل فعلياً في الطلب
            customerPhone: phone || existingCustomer.phone,
            customerAddress: address || existingCustomer.address,
            deliveryPrice: finalDeliveryPrice,
            orderTotal: finalTotal,
            orderDetails: JSON.stringify(orderDetails),
            discountAmount: discountValue,
            payment_status: payment_method === 'cash' ? "Pending" : "Paid",
            orderType: req.body.orderType || 'takeaway',
            tableNumber: req.body.tableNumber || null,
            status: req.body.status || (req.body.orderType === 'table' ? 'open' : 'paid')
        });

        // ✅ تسجيل الدفع إذا المبلغ النهائي أكبر من الصفر
        if (finalTotal > 0) {
            await Payment.create({
                order_id: order.id,
                payment_method: payment_method,
                payment_amount: finalTotal,
                payment_date: new Date()
            });
        }

        // ✅ إضافة التعليق إذا موجود
        if (commentText) {
            await Comment.create({
                orderId: order.id,
                commentText
            });
            console.log(`✅ تم إضافة التعليق: ${commentText}`);
        }

        // ✅ تحديث عدد مرات بيع المنتجات وخصم الخامات من المخزون
        for (const item of orderDetails) {
            if (!item.productId) {
                const product = await Product.findOne({ where: { name: item.name } });
                if (product) {
                    item.productId = product.id;
                }
            }

            if (item.productId && item.quantity > 0) {
                // ✅ تحديث عدد مرات البيع
                await Product.increment("sold", {
                    by: item.quantity,
                    where: { id: item.productId }
                });

                // ✅ تحديث المخزون بناءً على الوصفة
                const recipeItems = await Recipe.findAll({ where: { sandwich: item.name } });

                for (const recipe of recipeItems) {
                    const recipeQuantity = recipe.amount ?? 1;
                    const itemQuantity = item.quantity ?? 0;

                    const inventoryItem = await Inventory.findOne({
                        where: Sequelize.where(
                            Sequelize.fn('LOWER', Sequelize.col('name')),
                            'LIKE',
                            recipe.ingredient.toLowerCase()
                        )
                    });

                    if (inventoryItem) {
                        const newQuantity = inventoryItem.quantity - (recipeQuantity * itemQuantity);
                        if (newQuantity >= 0) {
                            await inventoryItem.update({ quantity: newQuantity });
                        }
                    }
                }
            }
        }

        const orderData = {
            id: order.id,
            customerName: order.customerName,
            customerPhone: order.customerPhone,
            customerAddress: order.customerAddress,
            deliveryPrice: order.deliveryPrice,
            orderTotal: order.orderTotal,
            orderDetails,
            discount: discountValue || 0,
            orderDate: new Date().toLocaleString("en-US", { timeZone: "Africa/Cairo" }),
            appliedDiscounts,
            comment: commentText || null
        };

        // ✅ طباعة الإيصال عند الدفع كاش
        if (payment_method === 'cash') {
            printReceipt(orderData);
        }

        res.status(201).json({
            message: "✅ تم إنشاء الطلب بنجاح مع تطبيق الخصم تلقائيًا!",
            order: orderData,
        });

    } catch (error) {
        console.error("❌ خطأ أثناء إنشاء الطلب:", error);
        res.status(500).json({ message: "❌ فشل إنشاء الطلب", error });
    }
};