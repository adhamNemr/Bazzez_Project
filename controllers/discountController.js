const { DiscountCode } = require("../models");
const { Op } = require("sequelize");

exports.checkBestDiscount = async (req, res) => {
  try {
    const { products, totalPrice } = req.body;

    if (!products || products.length === 0) {
      return res.status(400).json({ message: "❌ لم يتم تحديد أي منتجات." });
    }

    // ✅ البحث عن أكواد الخصم الفعالة فقط
    const discountCodes = await DiscountCode.findAll({
      where: {
        is_active: true,
        end_date: { [Op.gte]: new Date() },
      },
    });

    let bestDiscount = null;
    let maxDiscountAmount = 0;
    let usedProducts = new Set(); // 🔥 لمنع تكرار الخصم على نفس المنتج

    for (let discount of discountCodes) {
      console.log("Raw Data: ", discount.applicable_products);

      let applicableProducts;
      if (Array.isArray(discount.applicable_products)) {
        // ✅ إذا كانت مصفوفة، نستخدمها مباشرة
        applicableProducts = discount.applicable_products;
      } else if (typeof discount.applicable_products === "string") {
        try {
          applicableProducts = JSON.parse(discount.applicable_products);
        } catch (error) {
          console.error(
            `❌ خطأ في JSON.parse() للقيمة: ${discount.applicable_products}`,
          );
          applicableProducts = [];
        }
      } else {
        applicableProducts = [];
      }

      if (Array.isArray(applicableProducts)) {
        // ✅ التحقق مما إذا كان كود الخصم ينطبق على أي منتج لم يُستخدم عليه خصم مسبقًا
        let validProducts = applicableProducts.filter(
          (p) => products.includes(p) && !usedProducts.has(p),
        );

        if (discount.discount_type === "buy_x_get_y") {
          const buyQty = discount.buy_quantity || 0;
          const getQty = discount.get_quantity || 0;
          const getDisc = parseFloat(discount.get_discount_value) || 100;

          // المنتجات اللي بيشتغل عليها العرض
          const targetProducts =
            applicableProducts.length > 0
              ? products.filter(
                  (p) =>
                    applicableProducts.includes(p.id) &&
                    !usedProducts.has(p.id),
                )
              : products;

          // اعمل حساب المجموع بتاع الكميات
          let totalQty = targetProducts.reduce(
            (sum, p) => sum + (p.quantity || 1),
            0,
          );

          if (totalQty >= buyQty + getQty) {
            // ترتيب المنتجات من الأغلى للأرخص
            const sorted = [...targetProducts].sort(
              (a, b) => b.price - a.price,
            );
            // المنتجات المجانية/المخفضة هي الأرخص
            const freeItems = sorted.slice(buyQty, buyQty + getQty);
            const discountAmount = freeItems.reduce(
              (sum, p) => sum + p.price * (getDisc / 100),
              0,
            );

            if (discountAmount > maxDiscountAmount) {
              maxDiscountAmount = discountAmount;
              bestDiscount = discount.code;
              freeItems.forEach((p) => usedProducts.add(p.id));
            }
          }
          continue; // تخطى باقي الـ logic
        }

        if (validProducts.length > 0) {
          let discountAmount =
            discount.discount_type === "percentage"
              ? (discount.discount_value / 100) * totalPrice
              : discount.discount_value;

          if (discountAmount > maxDiscountAmount) {
            maxDiscountAmount = discountAmount;
            bestDiscount = discount.code;

            // 🔥 أضف المنتجات المستخدمة لهذا الخصم إلى `usedProducts`
            validProducts.forEach((p) => usedProducts.add(p));
          }
        }
      }
    }

    // ✅ إرسال الخصم الأفضل فقط إذا تم العثور عليه
    res.json({
      bestDiscountCode: bestDiscount,
      discountAmount: maxDiscountAmount,
    });
  } catch (error) {
    console.error("❌ خطأ أثناء جلب كود الخصم:", error);
    res.status(500).json({ message: "❌ حدث خطأ أثناء جلب كود الخصم." });
  }
};

exports.applyDiscount = async (req, res) => {
  try {
    const { discountCode } = req.params;
    const today = new Date().toISOString().split("T")[0];

    const discount = await DiscountCode.findOne({
      where: {
        code: discountCode,
        is_active: true,
        start_date: { [Op.lte]: today },
        end_date: { [Op.gte]: today },
      },
    });

    if (!discount) {
      return res
        .status(404)
        .json({ message: "❌ كود الخصم غير صالح أو منتهي الصلاحية." });
    }

    res.json({ discount_value: discount.discount_value });
  } catch (error) {
    console.error("❌ خطأ أثناء تطبيق كود الخصم:", error);
    res.status(500).json({ message: "❌ حدث خطأ أثناء تطبيق كود الخصم." });
  }
};

exports.addDiscount = async (req, res) => {
  try {
    const {
      code,
      discount_type,
      discount_value,
      buy_quantity, // ← جديد
      get_quantity, // ← جديد
      get_discount_value, // ← جديد
      start_date,
      end_date,
      applicable_products,
      is_active,
    } = req.body;

    // ✅ تأكد أن applicable_products مصفوفة قبل الحفظ
    const formattedProducts = Array.isArray(applicable_products)
      ? applicable_products
      : [];

    const discount = await DiscountCode.create({
      code,
      discount_type,
      discount_value,
      buy_quantity: buy_quantity || null,
      get_quantity: get_quantity || null,
      get_discount_value: get_discount_value || null,
      start_date,
      end_date,
      applicable_products: formattedProducts, // ✅ تخزين كمصفوفة JSON مباشرة
      is_active,
    });

    res.json({
      success: true,
      message: "✅ تم إضافة كود الخصم بنجاح",
      discount,
    });
  } catch (error) {
    console.error("❌ خطأ أثناء إضافة كود الخصم:", error);
    res
      .status(500)
      .json({ success: false, message: "❌ فشل في إضافة كود الخصم." });
  }
};

exports.updateDiscount = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      code,
      discount_type,
      discount_value,
      buy_quantity, // ← جديد
      get_quantity, // ← جديد
      get_discount_value, // ← جديد
      start_date,
      end_date,
      applicable_products,
      is_active,
    } = req.body;

    const discount = await DiscountCode.findByPk(id);
    if (!discount)
      return res
        .status(404)
        .json({ success: false, message: "❌ كود الخصم غير موجود" });

    // ✅ الحفاظ على المنتجات السابقة إذا لم يتم إرسال منتجات جديدة
    const formattedProducts = Array.isArray(applicable_products)
      ? applicable_products
      : discount.applicable_products;

    await discount.update({
      code,
      discount_type,
      discount_value,
      buy_quantity: buy_quantity || null,
      get_quantity: get_quantity || null,
      get_discount_value: get_discount_value || null,
      start_date,
      end_date,
      applicable_products: formattedProducts, // ✅ تحديث بدون مسح المنتجات السابقة
      is_active,
    });

    res.json({
      success: true,
      message: "✅ تم تحديث كود الخصم بنجاح",
      discount,
    });
  } catch (error) {
    console.error("❌ خطأ أثناء تحديث كود الخصم:", error);
    res
      .status(500)
      .json({ success: false, message: "❌ فشل في تحديث كود الخصم." });
  }
};

exports.getAllDiscounts = async (req, res) => {
  try {
    const discounts = await DiscountCode.findAll();

    res.json({
      success: true,
      discounts,
    });
  } catch (error) {
    console.error("❌ خطأ أثناء جلب أكواد الخصم:", error);
    res
      .status(500)
      .json({ success: false, message: "❌ فشل في جلب أكواد الخصم." });
  }
};

// ✅ حذف كود خصم
exports.deleteDiscount = async (req, res) => {
  try {
    const { id } = req.params;

    const discount = await DiscountCode.findByPk(id);
    if (!discount) {
      return res
        .status(404)
        .json({ success: false, message: "❌ كود الخصم غير موجود!" });
    }

    await discount.destroy();

    res.json({ success: true, message: "✅ تم حذف كود الخصم بنجاح!" });
  } catch (error) {
    console.error("❌ خطأ أثناء حذف كود الخصم:", error);
    res.status(500).json({ success: false, message: "❌ فشل حذف كود الخصم!" });
  }
};
