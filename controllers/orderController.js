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

exports.createOrder = async (req, res) => {
    try {
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

        // ✅ البحث عن العميل أو إنشاؤه
        let existingCustomer = await Customer.findOne({ where: { phone } });
        if (!existingCustomer) {
            existingCustomer = await Customer.create({ name, phone, address });
        }

        // ✅ حساب إجمالي المنتجات مع مراعاة الإضافات (Add-ons) في الكومنتات
        const productTotal = orderDetails.reduce((total, product) => {
            let itemBase = Number(product.price) * (Number(product.quantity) || 0);
            
            // إضافة أسعار الكومنتات/الإضافات إذا وجدت
            let addonsPrice = 0;
            if (Array.isArray(product.comments)) {
                addonsPrice = product.comments.reduce((sum, c) => sum + (Number(c.price) || 0), 0);
            }
            
            return total + itemBase + (addonsPrice * (Number(product.quantity) || 0));
        }, 0);

        // ✅ تطبيق الخصم تلقائيًا
        const { discountValue, appliedDiscounts } = await this.applyAutomaticDiscount(orderDetails, orderTotal, discountCode);
        const finalProductTotal = productTotal - discountValue;
        const finalTotal = Math.max(finalProductTotal + finalDeliveryPrice, 0);

        // ✅ إضافة التعليق للـ orderDetails (إذا وُجد)
        if (commentText) {
            orderDetails.push({
                name: "تعليق",
                price: 0,
                quantity: 1,
                commentText: commentText
            });
        }

        // ✅ الحصول على تاريخ العمل الحالي من الإعدادات أو التاريخ الحالي
        const { Setting } = require('../models');
        const activeDateSetting = await Setting.findOne({ where: { key: 'active_business_date' } });
        const businessDate = activeDateSetting ? activeDateSetting.value : new Date().toLocaleDateString('en-CA');

        // ✅ حساب الرقم التسلسلي اليومي (Daily Serial)
        const lastOrderOfDay = await Order.findOne({
            where: { businessDate: businessDate },
            order: [['dailySerial', 'DESC']]
        });
        const nextSerial = lastOrderOfDay ? (Number(lastOrderOfDay.dailySerial) || 0) + 1 : 1;

        // ✅ إنشاء الطلب
        const order = await Order.create({
            customerId: existingCustomer.id,
            customerName: existingCustomer.name,
            customerPhone: existingCustomer.phone,
            customerAddress: existingCustomer.address,
            deliveryPrice: finalDeliveryPrice,
            orderTotal: finalTotal,
            orderDetails: JSON.stringify(orderDetails),
            discountAmount: discountValue,
            payment_status: payment_method === 'cash' ? "Pending" : "Paid",
            payment_method: payment_method,
            businessDate: businessDate,
            dailySerial: nextSerial
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

        // ✅ طباعة الإيصال لجميع طرق الدفع
        printReceipt(orderData);

        res.status(201).json({
            message: "✅ تم إنشاء الطلب بنجاح مع تطبيق الخصم تلقائيًا!",
            order: orderData,
        });

    } catch (error) {
        console.error("❌ خطأ أثناء إنشاء الطلب:", error);
        res.status(500).json({ message: "❌ فشل إنشاء الطلب", error });
    }
};