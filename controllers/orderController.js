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

        // ✅ حساب إجمالي المنتجات مع مراعاة الإضافات (Add-ons) والخصومات اليدوية في الكومنتات
        let manualDiscountTotal = 0;
        const productTotal = orderDetails.reduce((total, product) => {
            let itemBase = Number(product.price) * (Number(product.quantity) || 0);
            
            // إضافة أسعار الكومنتات/الإضافات (الموجبة) وحساب الخصومات اليدوية (السالبة)
            let addonsPrice = 0;
            if (Array.isArray(product.comments)) {
                product.comments.forEach(c => {
                    const price = Number(c.price) || 0;
                    if (price < 0) {
                        manualDiscountTotal += Math.abs(price) * (Number(product.quantity) || 0);
                    } else {
                        addonsPrice += price;
                    }
                });
            }
            
            return total + itemBase + (addonsPrice * (Number(product.quantity) || 0));
        }, 0);

        // ✅ تطبيق الخصم تلقائيًا (Promo Codes)
        const { discountValue, appliedDiscounts } = await this.applyAutomaticDiscount(orderDetails, orderTotal, discountCode);
        
        // إجمالي الخصم = الخصم التلقائي + الخصم اليدوي
        const totalDiscountAmount = discountValue + manualDiscountTotal;
        
        const finalProductTotal = productTotal - discountValue - manualDiscountTotal;
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

        // ✅ الحصول على تاريخ العمل الحالي من الإعدادات (Source of Truth)
        const closingController = require('./closingController');
        let businessDate = await closingController.checkAndPerformAutoShift();
        
        if (!businessDate) {
            const { Setting } = require('../models');
            let activeDateSetting = await Setting.findOne({ where: { key: 'active_business_date' } });
            businessDate = activeDateSetting ? activeDateSetting.value : new Date().toLocaleDateString('en-CA');
        }

        // ✅ حساب الرقم التسلسلي اليومي (Daily Serial) - Looking at ALL orders for this business day
        const lastOrderOfDay = await Order.findOne({
            where: { businessDate: businessDate },
            order: [['dailySerial', 'DESC']],
            paranoid: false // Ensure we see everything
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
            discountAmount: totalDiscountAmount,
            payment_status: payment_method === 'cash' ? "Pending" : "Paid",
            payment_method: payment_method,
            businessDate: businessDate,
            createdAt: new Date(),
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

                // ✅ تحديث المخزون بناءً على الوصفة (المواد الخام)
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
                        const newQuantity = (inventoryItem.quantity || 0) - (recipeQuantity * itemQuantity);
                        await inventoryItem.update({ quantity: newQuantity });
                    }
                }

                // ✅ تحديث المخزون للمنتج الأصلي والتفريعات (الريتيل)
                const inventoryItem = await Inventory.findOne({ where: { name: item.name } });
                if (inventoryItem) {
                    const newParentQuantity = (inventoryItem.quantity || 0) - item.quantity;
                    
                    if (item.variant && inventoryItem.variants) {
                        let variants = typeof inventoryItem.variants === 'string' 
                            ? JSON.parse(inventoryItem.variants) 
                            : inventoryItem.variants;
                        
                        let variantUpdated = false;
                        variants = variants.map(v => {
                            const vLabel = `${v.color || ''} ${v.size || ''}`.trim();
                            // Flexible match: Exact match OR item.variant starts with the fabric name (vLabel)
                            if (vLabel === item.variant || (vLabel && item.variant.startsWith(vLabel + ' '))) {
                                variantUpdated = true;
                                return { ...v, quantity: (v.quantity || 0) - item.quantity };
                            }
                            return v;
                        });

                        await inventoryItem.update({ quantity: newParentQuantity, variants: variantUpdated ? variants : inventoryItem.variants });
                        console.log(`✅ تم خصم الكمية من المنتج الأصلي والتفريعة: ${item.variant} للمنتج: ${item.name}`);
                    } else {
                        await inventoryItem.update({ quantity: newParentQuantity });
                        console.log(`✅ تم خصم الكمية من المنتج الأصلي: ${item.name}`);
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

// ✅ دالة جلب جميع الطلبات مع الفلترة والبحث (إضافة الدالة الناقصة)
exports.getAllOrders = async (req, res) => {
    try {
        const { page = 1, limit = 10, date, status, search } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = {};

        // فلترة بالتاريخ
        if (date) {
            whereClause.businessDate = date;
        }

        // فلترة بالحالة
        if (status && status !== 'all') {
            whereClause.payment_status = status;
        }

        // بحث بالاسم أو الهاتف أو العنوان
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