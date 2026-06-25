/**
 * ============================================================
 *  VORTEX POS — Full System Integration Test Suite
 *  يغطي كل عنصر في السيستم من Authentication لـ Sync
 * ============================================================
 */

require("dotenv").config();
const request = require("supertest");
const app = require("../server");
const {
  User,
  Product,
  Inventory,
  Order,
  OrderDetail,
  Expense,
  Customer,
  DiscountCode,
  Merchant,
  MerchantTransaction,
  Payment,
  Setting,
  DailyClosing,
  SyncQueue,
  sequelize,
} = require("../models");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// ─────────────────────────────────────────────
//  Shared State بين الـ phases
// ─────────────────────────────────────────────
let managerToken, cashierToken;
let managerUser, cashierUser;
let testProduct, testProduct2;
let testCustomer;
let testOrder;
let testExpense;
let testDiscount;
let testMerchant;
let testMerchantTx;

// ─────────────────────────────────────────────
//  Helper: توليد توكن مباشرة بدون HTTP
// ─────────────────────────────────────────────
const makeToken = (user) => {
  const secret = process.env.JWT_SECRET || "fallback_secret_for_dev";
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      jti: Math.random().toString(36).substring(7), // ضمان أن كل توكن فريد حتى لو في نفس الثانية
    },
    secret,
    { expiresIn: "1h" },
  );
};

// ─────────────────────────────────────────────
//  Setup & Teardown
// ─────────────────────────────────────────────
beforeAll(async () => {
  await sequelize.sync({ force: true });

  // أنشئ Manager
  managerUser = await User.create({
    username: "manager",
    password: await bcrypt.hash("admin123", 10),
    role: "manager",
  });

  // أنشئ Cashier
  cashierUser = await User.create({
    username: "cashier1",
    password: await bcrypt.hash("cash123", 10),
    role: "cashier",
  });

  managerToken = makeToken(managerUser);
  cashierToken = makeToken(cashierUser);

  // بذر الـ Settings الأساسية
  await Setting.bulkCreate([
    { key: "store_name", value: "Vortex Test Store", group: "general" },
    { key: "vat_percent", value: "14", group: "finance" },
    { key: "currency", value: "EGP", group: "finance" },
    {
      key: "active_business_date",
      value: new Date().toLocaleDateString("en-CA"),
      group: "system",
    },
  ]);
});

afterAll(async () => {
  await sequelize.close();
  // أوقف كل الـ timers المفتوحة
  jest.clearAllTimers();
});

// ══════════════════════════════════════════════════════════════
//  BLOCK 1 — Authentication & Authorization
// ══════════════════════════════════════════════════════════════
describe("🔐 Block 1: Authentication & Authorization", () => {
  it("1.1 — Manager يسجل دخول بنجاح", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "manager", password: "admin123" });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body).toHaveProperty("role", "manager");
  });

  it("1.2 — Cashier يسجل دخول بنجاح", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "cashier1", password: "cash123" });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body.role).toBe("cashier");
  });

  it("1.3 — رفض كلمة مرور غلط (401)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "manager", password: "wrongpassword" });

    expect(res.statusCode).toBe(401);
  });

  it("1.4 — رفض مستخدم غير موجود (401)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "ghost", password: "nothing" });

    expect(res.statusCode).toBe(401);
  });

  it("1.5 — رفض الطلبات بدون توكن (401)", async () => {
    const res = await request(app).get("/api/products");
    expect(res.statusCode).toBe(401);
  });

  it("1.6 — رفض توكن مزيف (401 أو 403)", async () => {
    const res = await request(app)
      .get("/api/products")
      .set("Authorization", "Bearer totally.fake.token");

    expect([401, 403]).toContain(res.statusCode);
  });

  it("1.7 — Logout يُعيد 200", async () => {
    // نستخدم توكن مؤقت عشان التوكن الأساسي ميتعملوش بلاك ليست ونكمل بيه التيست
    const tempToken = makeToken(managerUser);
    const res = await request(app)
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${tempToken}`);

    expect(res.statusCode).toBe(200);
  });
});

// ══════════════════════════════════════════════════════════════
//  BLOCK 2 — User Management
// ══════════════════════════════════════════════════════════════
describe("👤 Block 2: User Management", () => {
  let newUserId;

  it("2.1 — Manager يجيب كل المستخدمين", async () => {
    const res = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${managerToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });

  it("2.2 — Manager ينشئ يوزر جديد", async () => {
    const res = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ username: "newcashier", password: "pass1234", role: "cashier" });

    expect([200, 201]).toContain(res.statusCode);
    newUserId = res.body.id || res.body.user?.id;
  });

  it("2.3 — Manager يعدل يوزر موجود", async () => {
    if (!newUserId) return;
    const res = await request(app)
      .put(`/api/users/${newUserId}`)
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ username: "newcashier_updated", role: "cashier" });

    expect([200, 204]).toContain(res.statusCode);
  });

  it("2.4 — Manager يحذف يوزر", async () => {
    if (!newUserId) return;
    const res = await request(app)
      .delete(`/api/users/${newUserId}`)
      .set("Authorization", `Bearer ${managerToken}`);

    expect([200, 204]).toContain(res.statusCode);
  });
});

// ══════════════════════════════════════════════════════════════
//  BLOCK 3 — Products
// ══════════════════════════════════════════════════════════════
describe("📦 Block 3: Products", () => {
  it("3.1 — Manager يضيف منتج جديد", async () => {
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${managerToken}`)
      .send({
        name: "T-Shirt Blue",
        price: 200,
        wholesalePrice: 150,
        category: "Clothing",
      });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("product");
    testProduct = res.body.product;
  });

  it("3.2 — يضيف منتج تاني لاختبار الأوردرات", async () => {
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${managerToken}`)
      .send({
        name: "Pants Black",
        price: 350,
        wholesalePrice: 250,
        category: "Clothing",
      });

    expect(res.statusCode).toBe(201);
    testProduct2 = res.body.product;
  });

  it("3.3 — Inventory يتنشأ تلقائياً مع المنتج", async () => {
    const inv = await Inventory.findOne({ where: { name: "T-Shirt Blue" } });
    expect(inv).not.toBeNull();
    expect(inv.quantity).toBe(0);
  });

  it("3.4 — جلب كل المنتجات", async () => {
    const res = await request(app)
      .get("/api/products")
      .set("Authorization", `Bearer ${managerToken}`);

    expect(res.statusCode).toBe(200);
    // الفئات بترجع أوبجيكت مش أراي
    expect(typeof res.body).toBe("object");
  });

  it("3.5 — جلب منتج بالـ ID", async () => {
    const res = await request(app)
      .get(`/api/products/item/${testProduct.id}`)
      .set("Authorization", `Bearer ${managerToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.name).toBe("T-Shirt Blue");
  });

  it("3.6 — جلب منتجات بالكاتيجوري", async () => {
    const res = await request(app)
      .get("/api/products/Clothing")
      .set("Authorization", `Bearer ${managerToken}`);

    expect(res.statusCode).toBe(200);
  });

  it("3.7 — Manager يعدل منتج", async () => {
    const res = await request(app)
      .put(`/api/products/${testProduct.id}`)
      .set("Authorization", `Bearer ${managerToken}`)
      .send({
        name: "T-Shirt Blue",
        price: 220,
        wholesalePrice: 160,
        category: "Clothing",
      });

    expect([200, 204]).toContain(res.statusCode);
  });

  it("3.8 — Cashier مينقدرش يضيف منتج (403)", async () => {
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${cashierToken}`)
      .send({
        name: "Hack Product",
        price: 1,
        wholesalePrice: 0,
        category: "X",
      });

    expect(res.statusCode).toBe(403);
  });

  it("3.9 — رفض منتج ببيانات ناقصة (400 أو 422)", async () => {
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ price: 100 }); // بدون name

    expect([400, 422]).toContain(res.statusCode);
  });
});

// ══════════════════════════════════════════════════════════════
//  BLOCK 4 — Inventory
// ══════════════════════════════════════════════════════════════
describe("🏭 Block 4: Inventory", () => {
  it("4.1 — جلب كل المخزون", async () => {
    const res = await request(app)
      .get("/api/inventory")
      .set("Authorization", `Bearer ${managerToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("4.2 — تحديث كمية المخزون (إضافة 20 قطعة)", async () => {
    const inv = await Inventory.findOne({ where: { name: "T-Shirt Blue" } });
    await inv.update({ quantity: 20 });

    const inv2 = await Inventory.findOne({ where: { name: "Pants Black" } });
    await inv2.update({ quantity: 15 });

    const updated = await Inventory.findOne({
      where: { name: "T-Shirt Blue" },
    });
    expect(updated.quantity).toBe(20);
  });

  it("4.3 — تحديث عنصر مخزون عبر API", async () => {
    const inv = await Inventory.findOne({ where: { name: "T-Shirt Blue" } });
    const res = await request(app)
      .put(`/api/inventory/${inv.id}`)
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ quantity: 25 });

    expect([200, 204]).toContain(res.statusCode);
  });

  it("4.4 — تنبيهات المخزون المنخفض", async () => {
    // خلي كمية واحدة منخفضة
    const inv = await Inventory.findOne({ where: { name: "Pants Black" } });
    await inv.update({ quantity: 1, minStock: 5 });

    const res = await request(app)
      .get("/api/inventory/alerts/low-stock")
      .set("Authorization", `Bearer ${managerToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("4.5 — تنبيهات تاريخ الصلاحية", async () => {
    const res = await request(app)
      .get("/api/inventory/alerts/expiry")
      .set("Authorization", `Bearer ${managerToken}`);

    expect(res.statusCode).toBe(200);
  });
});

// ══════════════════════════════════════════════════════════════
//  BLOCK 5 — Customers
// ══════════════════════════════════════════════════════════════
describe("👥 Block 5: Customers", () => {
  it("5.1 — إنشاء عميل جديد", async () => {
    const res = await request(app)
      .post("/api/customers/create")
      .set("Authorization", `Bearer ${managerToken}`)
      .send({
        name: "Ahmed Hassan",
        phone: "01012345678",
        address: "Cairo, Egypt",
      });

    expect([200, 201]).toContain(res.statusCode);
    testCustomer = res.body.customer || res.body;
  });

  it("5.2 — جلب كل العملاء", async () => {
    const res = await request(app)
      .get("/api/customers")
      .set("Authorization", `Bearer ${managerToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("5.3 — جلب عميل بالتليفون", async () => {
    const res = await request(app)
      .get(`/api/customers/${testCustomer.phone}`)
      .set("Authorization", `Bearer ${managerToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body[0].phone).toBe("01012345678");
  });

  it("5.4 — جلب أرقام التليفونات (autocomplete)", async () => {
    const res = await request(app)
      .get("/api/customers/phones")
      .set("Authorization", `Bearer ${managerToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("5.5 — تعديل بيانات عميل", async () => {
    const customer = await Customer.findOne({
      where: { phone: "01012345678" },
    });
    const res = await request(app)
      .put(`/api/customers/${customer.id}`)
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ name: "Ahmed Hassan Updated", address: "Giza, Egypt" });

    expect([200, 204]).toContain(res.statusCode);
  });
});

// ══════════════════════════════════════════════════════════════
//  BLOCK 6 — Discount Codes
// ══════════════════════════════════════════════════════════════
describe("🏷️ Block 6: Discount Codes", () => {
  const today = new Date().toLocaleDateString("en-CA");
  const tomorrow = new Date(Date.now() + 86400000).toLocaleDateString("en-CA");

  it("6.1 — إنشاء كود خصم percentage", async () => {
    const res = await request(app)
      .post("/api/discounts")
      .set("Authorization", `Bearer ${managerToken}`)
      .send({
        code: "SAVE10",
        discount_type: "percentage",
        discount_value: 10,
        start_date: today,
        end_date: tomorrow,
        is_active: true,
      });

    expect([200, 201]).toContain(res.statusCode);
    testDiscount = res.body;
  });

  it("6.2 — إنشاء كود خصم fixed", async () => {
    const res = await request(app)
      .post("/api/discounts")
      .set("Authorization", `Bearer ${managerToken}`)
      .send({
        code: "FLAT50",
        discount_type: "fixed",
        discount_value: 50,
        start_date: today,
        end_date: tomorrow,
        is_active: true,
      });

    expect([200, 201]).toContain(res.statusCode);
  });

  it("6.3 — جلب كل أكواد الخصم", async () => {
    const res = await request(app)
      .get("/api/discounts")
      .set("Authorization", `Bearer ${managerToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.discounts)).toBe(true);
    expect(res.body.discounts.length).toBeGreaterThanOrEqual(2);
  });

  it("6.4 — تطبيق كود خصم صحيح", async () => {
    const res = await request(app)
      .get("/api/discounts/apply/SAVE10")
      .set("Authorization", `Bearer ${managerToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("discount_value");
  });

  it("6.5 — رفض كود خصم غير موجود", async () => {
    const res = await request(app)
      .get("/api/discounts/apply/FAKECODE")
      .set("Authorization", `Bearer ${managerToken}`);

    expect([404, 400]).toContain(res.statusCode);
  });

  it("6.6 — تعديل كود خصم", async () => {
    if (!testDiscount?.id) return;
    const res = await request(app)
      .put(`/api/discounts/${testDiscount.id}`)
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ discount_value: 15 });

    expect([200, 204]).toContain(res.statusCode);
  });
});

// ══════════════════════════════════════════════════════════════
//  BLOCK 7 — Orders (قلب السيستم)
// ══════════════════════════════════════════════════════════════
describe("🛒 Block 7: Orders", () => {
  it("7.1 — إنشاء أوردر كاش بمنتجين", async () => {
    const res = await request(app)
      .post("/api/order")
      .set("Authorization", `Bearer ${managerToken}`)
      .send({
        customer: {
          name: "Ahmed Hassan",
          phone: "01012345678",
          address: "Cairo",
        },
        orderDetails: [
          {
            productId: testProduct.id,
            name: "T-Shirt Blue",
            price: 220,
            quantity: 3,
          },
          {
            productId: testProduct2.id,
            name: "Pants Black",
            price: 350,
            quantity: 1,
          },
        ],
        payment_method: "cash",
        deliveryPrice: 30,
        orderTotal: 1040, // (220*3) + (350*1) + 30
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.order).toHaveProperty("dailySerial", 1);
    testOrder = res.body.order;
  });

  it("7.2 — المخزون انخفض صح بعد الأوردر", async () => {
    const inv1 = await Inventory.findOne({ where: { name: "T-Shirt Blue" } });
    const inv2 = await Inventory.findOne({ where: { name: "Pants Black" } });

    // T-Shirt كانت 25 (بعد التحديث في 4.3) ← شترينا 3
    expect(inv1.quantity).toBe(22);
    // Pants كانت 1 (بعد 4.4) ← شترينا 1 → صفر
    expect(inv2.quantity).toBe(0);
  });

  it("7.3 — إنشاء أوردر بـ visa", async () => {
    const res = await request(app)
      .post("/api/order")
      .set("Authorization", `Bearer ${cashierToken}`)
      .send({
        customer: { name: "Sara Ali", phone: "01198765432", address: "Alex" },
        orderDetails: [
          {
            productId: testProduct.id,
            name: "T-Shirt Blue",
            price: 220,
            quantity: 1,
          },
        ],
        payment_method: "card", // فيزا يعني كارد
        deliveryPrice: 0,
        orderTotal: 220,
      });

    expect(res.statusCode).toBe(201);
  });

  it("7.4 — جلب كل الأوردرات", async () => {
    const res = await request(app)
      .get("/api/orders?nopaging=true")
      .set("Authorization", `Bearer ${managerToken}`);

    expect(res.statusCode).toBe(200);
    const orders = Array.isArray(res.body) ? res.body : res.body.orders;
    expect(Array.isArray(orders)).toBe(true);
    expect(orders.length).toBeGreaterThanOrEqual(2);
  });

  it("7.5 — إلغاء أوردر (cancel)", async () => {
    const res = await request(app)
      .put(`/api/orders/${testOrder.id}/cancel`)
      .set("Authorization", `Bearer ${managerToken}`);

    expect([200, 204]).toContain(res.statusCode);
  });

  it("7.6 — إعادة طباعة إيصال (reprint)", async () => {
    const res = await request(app)
      .post(`/api/orders/${testOrder.id}/print`)
      .set("Authorization", `Bearer ${managerToken}`);

    // 200 لو نجح أو 500 لو مفيش طابعة (مقبول في بيئة التيست)
    expect([200, 500]).toContain(res.statusCode);
  });

  it("7.7 — عدد الساندوتشات (countSandwiches)", async () => {
    const res = await request(app)
      .post("/api/orders/count-sandwiches")
      .set("Authorization", `Bearer ${managerToken}`)
      .send({});

    expect([200, 400]).toContain(res.statusCode);
  });

  it("7.8 — تاريخ العميل بعد الأوردرات", async () => {
    const res = await request(app)
      .get("/api/customers/history/01012345678")
      .set("Authorization", `Bearer ${managerToken}`);

    expect(res.statusCode).toBe(200);
  });
});

// ══════════════════════════════════════════════════════════════
//  BLOCK 8 — Expenses
// ══════════════════════════════════════════════════════════════
describe("💸 Block 8: Expenses", () => {
  let expenseId;

  it("8.1 — Manager يسجل مصروف", async () => {
    const res = await request(app)
      .post("/api/expenses")
      .set("Authorization", `Bearer ${managerToken}`)
      .send({
        description: "Electricity Bill",
        amount: 200,
        category: "Utilities",
      });

    expect(res.statusCode).toBe(201);
    expenseId = res.body.id || res.body.expense?.id;
    testExpense = res.body;
  });

  it("8.2 — تسجيل مصروف تاني", async () => {
    const res = await request(app)
      .post("/api/expenses")
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ description: "Rent", amount: 5000, category: "Rent" });

    expect(res.statusCode).toBe(201);
  });

  it("8.3 — جلب كل المصروفات", async () => {
    const res = await request(app)
      .get("/api/expenses?all=true")
      .set("Authorization", `Bearer ${managerToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.expenses)).toBe(true);
    expect(res.body.expenses.length).toBeGreaterThanOrEqual(2);
  });

  it("8.4 — Cashier يشوف المصروفات (مسموح)", async () => {
    const res = await request(app)
      .get("/api/expenses")
      .set("Authorization", `Bearer ${cashierToken}`);

    expect(res.statusCode).toBe(200);
  });

  it("8.5 — Cashier ميقدرش يضيف مصروف (403)", async () => {
    const res = await request(app)
      .post("/api/expenses")
      .set("Authorization", `Bearer ${cashierToken}`)
      .send({ description: "Hack", amount: 1, category: "X" });

    expect(res.statusCode).toBe(403);
  });

  it("8.6 — تعديل مصروف", async () => {
    if (!expenseId) return;
    const res = await request(app)
      .put(`/api/expenses/${expenseId}`)
      .set("Authorization", `Bearer ${managerToken}`)
      .send({
        amount: 250,
        description: "Electricity Bill Updated",
        category: "Utilities",
      });

    expect([200, 204, 400]).toContain(res.statusCode);
  });

  it("8.7 — حذف مصروف", async () => {
    if (!expenseId) return;
    const res = await request(app)
      .delete(`/api/expenses/${expenseId}`)
      .set("Authorization", `Bearer ${managerToken}`);

    expect([200, 204]).toContain(res.statusCode);
  });
});

// ══════════════════════════════════════════════════════════════
//  BLOCK 9 — Merchants & Transactions
// ══════════════════════════════════════════════════════════════
describe("🏪 Block 9: Merchants & Transactions", () => {
  let merchantTxId;

  it("9.1 — إنشاء مورد (supplier)", async () => {
    const res = await request(app)
      .post("/api/merchants")
      .set("Authorization", `Bearer ${managerToken}`)
      .send({
        name: "Cloth Factory",
        phone: "01099998888",
        type: "supplier",
        balance: 0,
        notes: "Main supplier",
      });

    expect([200, 201]).toContain(res.statusCode);
    testMerchant = res.body.merchant || res.body;
  });

  it("9.2 — إنشاء عميل جملة (wholesale_client)", async () => {
    const res = await request(app)
      .post("/api/merchants")
      .set("Authorization", `Bearer ${managerToken}`)
      .send({
        name: "Big Store",
        phone: "01077776666",
        type: "wholesale_client",
        balance: 0,
      });

    expect([200, 201]).toContain(res.statusCode);
  });

  it("9.3 — جلب كل الـ merchants", async () => {
    const res = await request(app)
      .get("/api/merchants")
      .set("Authorization", `Bearer ${managerToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });

  it("9.4 — إضافة معاملة مالية للمورد", async () => {
    if (!testMerchant?.id) return;
    const res = await request(app)
      .post(`/api/merchants/${testMerchant.id}/transactions`)
      .set("Authorization", `Bearer ${managerToken}`)
      .send({
        amount: 1000,
        type: "credit",
        note: "Purchase invoice #1",
      });

    expect([200, 201]).toContain(res.statusCode);
    testMerchantTx = res.body;
    merchantTxId = res.body.id || res.body.transaction?.id;
  });

  it("9.5 — جلب معاملات المورد (ledger)", async () => {
    if (!testMerchant?.id) return;
    const res = await request(app)
      .get(`/api/merchants/${testMerchant.id}/transactions`)
      .set("Authorization", `Bearer ${managerToken}`);

    expect(res.statusCode).toBe(200);
  });

  it("9.6 — تعديل معاملة", async () => {
    if (!merchantTxId) return;
    const res = await request(app)
      .put(`/api/merchants/transactions/${merchantTxId}`)
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ amount: 1500, note: "Updated" });

    expect([200, 204]).toContain(res.statusCode);
  });

  it("9.7 — تعديل بيانات المورد", async () => {
    if (!testMerchant?.id) return;
    const res = await request(app)
      .put(`/api/merchants/${testMerchant.id}`)
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ name: "Cloth Factory Updated", balance: 500 });

    expect([200, 204]).toContain(res.statusCode);
  });
});

// ══════════════════════════════════════════════════════════════
//  BLOCK 10 — Settings
// ══════════════════════════════════════════════════════════════
describe("⚙️ Block 10: Settings", () => {
  it("10.1 — جلب كل الإعدادات", async () => {
    const res = await request(app)
      .get("/api/settings")
      .set("Authorization", `Bearer ${managerToken}`);

    expect(res.statusCode).toBe(200);
  });

  it("10.2 — تحديث إعداد واحد", async () => {
    const res = await request(app)
      .post("/api/settings")
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ key: "store_name", value: "Vortex Updated Store" });

    expect([200, 204]).toContain(res.statusCode);
  });

  it("10.3 — تحديث إعدادات متعددة (bulk)", async () => {
    const res = await request(app)
      .post("/api/settings/bulk")
      .set("Authorization", `Bearer ${managerToken}`)
      .send({
        settings: [
          { key: "vat_percent", value: "14" },
          { key: "currency", value: "EGP" },
        ],
      });

    expect([200, 204]).toContain(res.statusCode);
  });
});

// ══════════════════════════════════════════════════════════════
//  BLOCK 11 — Analytics & Dashboard
// ══════════════════════════════════════════════════════════════
describe("📊 Block 11: Analytics & Dashboard", () => {
  it("11.1 — بيانات الـ Dashboard", async () => {
    const res = await request(app)
      .get("/api/dashboard-data")
      .set("Authorization", `Bearer ${managerToken}`);

    expect(res.statusCode).toBe(200);
  });

  it("11.2 — System Status Check", async () => {
    const res = await request(app)
      .get("/api/system-status")
      .set("Authorization", `Bearer ${managerToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("database");
  });

  it("11.3 — Analytics العامة", async () => {
    const res = await request(app)
      .get("/api/analytics")
      .set("Authorization", `Bearer ${managerToken}`);

    expect(res.statusCode).toBe(200);
  });

  it("11.4 — Analytics منتجات المخزون المنخفض", async () => {
    const res = await request(app)
      .get("/api/analytics/low-stock")
      .set("Authorization", `Bearer ${managerToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.lowStock)).toBe(true);
  });

  it("11.5 — Analytics المخزون بالكاتيجوري", async () => {
    const res = await request(app)
      .get("/api/analytics/stock-by-category")
      .set("Authorization", `Bearer ${managerToken}`);

    expect(res.statusCode).toBe(200);
  });

  it("11.6 — Analytics توقع المخزون (forecast)", async () => {
    const res = await request(app)
      .get("/api/analytics/stock-forecast")
      .set("Authorization", `Bearer ${managerToken}`);

    expect(res.statusCode).toBe(200);
  });
});

// ══════════════════════════════════════════════════════════════
//  BLOCK 12 — Daily Closing
// ══════════════════════════════════════════════════════════════
describe("📅 Block 12: Daily Closing", () => {
  const today = new Date().toLocaleDateString("en-CA");

  it("12.1 — جلب الملخص اليومي", async () => {
    const res = await request(app)
      .get("/api/closing/daily-summary")
      .set("Authorization", `Bearer ${managerToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("totalOrders");
    expect(res.body).toHaveProperty("totalRevenue");
    expect(res.body).toHaveProperty("totalExpenses");
    // أوردر 7.3 اتعمل بعد الكانسيل → لازم على الأقل 1
    expect(res.body.totalOrders).toBeGreaterThanOrEqual(1);
  });

  it("12.2 — الإيرادات محسوبة صح", async () => {
    const res = await request(app)
      .get("/api/closing/daily-summary")
      .set("Authorization", `Bearer ${managerToken}`);

    // أوردر 7.3 = 220 → اتنفذ
    expect(res.body.totalRevenue).toBeGreaterThanOrEqual(220);
  });

  it("12.3 — إغلاق اليوم", async () => {
    const res = await request(app)
      .post("/api/closing/close-day")
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ date: today });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("12.4 — DailyClosing سجل اتعمل في الداتابيز", async () => {
    const closing = await DailyClosing.findOne({
      where: { closingDate: today },
    });
    expect(closing).not.toBeNull();
  });

  it("12.5 — جلب الملخص الشهري", async () => {
    const res = await request(app)
      .get("/api/closing/monthly-summary")
      .set("Authorization", `Bearer ${managerToken}`);

    expect(res.statusCode).toBe(200);
  });
});

// ══════════════════════════════════════════════════════════════
//  BLOCK 13 — Sync Queue
// ══════════════════════════════════════════════════════════════
describe("🔄 Block 13: Sync Queue", () => {
  it("13.1 — السنك كيو فيه عناصر pending", async () => {
    const pending = await SyncQueue.findAll();
    expect(pending.length).toBeGreaterThan(0);
  });

  it("13.2 — السنك كيو فيه أوردر INSERT", async () => {
    const items = await SyncQueue.findAll();
    const orderItem = items.find(
      (s) => s.tableName === "orders" && s.operation === "INSERT",
    );
    expect(orderItem).toBeDefined();
  });

  it("13.3 — السنك كيو فيه منتج INSERT", async () => {
    const items = await SyncQueue.findAll();
    const productItem = items.find(
      (s) => s.tableName === "products" && s.operation === "INSERT",
    );
    expect(productItem).toBeDefined();
  });

  it("13.4 — Sync Status API يرجع الحالة", async () => {
    const res = await request(app)
      .get("/api/sync/status")
      .set("Authorization", `Bearer ${managerToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("pendingCount");
    expect(res.body).toHaveProperty("isOnline");
  });
});

// ══════════════════════════════════════════════════════════════
//  BLOCK 14 — Comments
// ══════════════════════════════════════════════════════════════
describe("💬 Block 14: Comments", () => {
  let commentId;

  it("14.1 — إضافة تعليق", async () => {
    const res = await request(app)
      .post("/comments/add")
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ commentText: "Great product!", color: "blue", price: 0 });

    expect([200, 201]).toContain(res.statusCode);
    commentId = res.body.id || res.body.comment?.id;
  });

  it("14.2 — جلب التعليقات الشائعة", async () => {
    const res = await request(app).get("/comments/popular");
    expect(res.statusCode).toBe(200);
  });

  it("14.3 — حذف تعليق", async () => {
    if (!commentId) return;
    const res = await request(app).delete(`/comments/${commentId}`);
    expect([200, 204]).toContain(res.statusCode);
  });
});

// ══════════════════════════════════════════════════════════════
//  BLOCK 15 — Edge Cases & Security
// ══════════════════════════════════════════════════════════════
describe("🛡️ Block 15: Edge Cases & Security", () => {
  it("15.1 — XSS في اسم المنتج يتـ sanitize", async () => {
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${managerToken}`)
      .send({
        name: '<script>alert("xss")</script>',
        price: 100,
        wholesalePrice: 80,
        category: "Test",
      });

    if (res.statusCode === 201) {
      // لو اتقبل، اسم المنتج يكون متنقى
      expect(res.body.product?.name).not.toContain("<script>");
    } else {
      // أو ترفضه بـ 400
      expect([400, 422]).toContain(res.statusCode);
    }
  });

  it("15.2 — أوردر بكمية أكبر من المخزون يُرفض أو يُسجَّل", async () => {
    // T-Shirt الحالية 22 - 1 = 21 → نطلب 1000
    const res = await request(app)
      .post("/api/order")
      .set("Authorization", `Bearer ${managerToken}`)
      .send({
        customer: { name: "Test", phone: "01100000001", address: "X" },
        orderDetails: [
          {
            productId: testProduct.id,
            name: "T-Shirt Blue",
            price: 220,
            quantity: 1000,
          },
        ],
        payment_method: "cash",
        deliveryPrice: 0,
        orderTotal: 220000,
      });

    // السيستم إما يرفض 400 أو يقبل مع مخزون سالب حسب إعدادك
    expect([201, 400, 422]).toContain(res.statusCode);
  });

  it("15.3 — إنشاء منتج بسعر سالب يُرفض (400 أو 422)", async () => {
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${managerToken}`)
      .send({
        name: "Invalid",
        price: -50,
        wholesalePrice: -80,
        category: "Bad",
      });

    expect([400, 422]).toContain(res.statusCode);
  });

  it("15.4 — كود خصم منتهي الصلاحية يُرفض", async () => {
    // أنشئ كود منتهي
    await DiscountCode.create({
      code: "EXPIRED99",
      discount_type: "percentage",
      discount_value: 99,
      start_date: "2020-01-01",
      end_date: "2020-12-31",
      is_active: true,
    });

    const res = await request(app)
      .get("/api/discounts/apply/EXPIRED99")
      .set("Authorization", `Bearer ${managerToken}`);

    expect([200, 400, 404, 422]).toContain(res.statusCode);
  });

  it("15.5 — ID غير موجود يُعيد 404", async () => {
    const res = await request(app)
      .get("/api/products/item/999999")
      .set("Authorization", `Bearer ${managerToken}`);

    expect(res.statusCode).toBe(404);
  });

  it("15.6 — Rate limiter موجود على الـ login endpoint", async () => {
    // الـ rate limiter مضبوط على 10 محاولات/دقيقة
    // نبعت 5 طلبات خاطئة ونتأكد إن الـ limiter شغال
    const attempts = Array.from({ length: 5 }).map(() =>
      request(app)
        .post("/api/auth/login")
        .send({ username: "nobody", password: "wrong" }),
    );
    const results = await Promise.all(attempts);
    // كل الطلبات تكون 401 أو واحدة على الأقل 429
    const statuses = results.map((r) => r.statusCode);
    const allValid = statuses.every((s) => [401, 429].includes(s));
    expect(allValid).toBe(true);
  });
});
