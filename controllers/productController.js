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
 
        // دمج بيانات التفريعات والمخزون مع المنتجات
        const productsWithDetails = products.map(p => {
            const inv = inventoryItems.find(i => i.name === p.name);
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

