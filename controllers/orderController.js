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
                                const vColor = (v.color || v.name || '').trim();
                                const vSize = (v.size || '').trim();
                                
                                // 🎯 Precise Matching: If frontend sends color/size separately
                                if (item.color !== undefined) {
                                    const itemColor = (item.color || '').trim();
                                    const itemSize = (item.size || '').trim();
                                    
                                    // Match if color matches AND (size matches OR variant has no size)
                                    if (vColor === itemColor && (vSize === itemSize || !vSize)) {
                                        return { ...v, quantity: (v.quantity || 0) - item.quantity };
                                    }
                                    return v;
                                }

                                // 🔄 Fallback: String-based matching for safety
                                const vLabel = `${vColor} ${vSize}`.trim();
                                if (vLabel === item.variant || (vLabel && item.variant && item.variant.startsWith(vLabel + ' '))) {
                                    return { ...v, quantity: (v.quantity || 0) - item.quantity };
                                }
                                return v;
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