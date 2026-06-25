const request = require("supertest");
const app = require("../server");
const {
  User,
  Product,
  Inventory,
  Order,
  Expense,
  SyncQueue,
  sequelize,
} = require("../models");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

describe("Vortex POS - Full System Integration Test", () => {
  let token;
  let adminUser;
  let testProduct;

  beforeAll(async () => {
    // 1. Sync Database
    await sequelize.sync({ force: true });

    // 2. Create Admin User
    const hashedPassword = await bcrypt.hash("admin123", 10);
    adminUser = await User.create({
      username: "manager",
      password: hashedPassword,
      role: "manager",
    });

    token = jwt.sign(
      { id: adminUser.id, username: adminUser.username, role: adminUser.role },
      process.env.JWT_SECRET || "fallback_secret_for_dev",
      { expiresIn: "1h" },
    );
  });

  afterAll(async () => {
    await sequelize.close();
  });

  // --- PHASE 1: Authentication ---
  it("Phase 1: Manager should login successfully", async () => {
    const res = await request(app).post("/api/auth/login").send({
      username: "manager",
      password: "admin123",
    });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("token");
  });

  // --- PHASE 2: Products & Inventory ---
  it("Phase 2: Should create a product and verify inventory auto-creation", async () => {
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "T-Shirt Blue",
        price: 200,
        wholesalePrice: 150,
        category: "Clothing",
      });

    expect(res.statusCode).toEqual(201);
    testProduct = res.body.product;

    // Verify Inventory entry was created
    const invItem = await Inventory.findOne({
      where: { name: "T-Shirt Blue" },
    });
    expect(invItem).not.toBeNull();
    expect(invItem.quantity).toBe(0);

    // Add Stock to Inventory
    await invItem.update({ quantity: 10 });
  });

  // --- PHASE 3: Orders & Inventory Deduction ---
  it("Phase 3: Should create an order and verify inventory deduction", async () => {
    const orderData = {
      customer: {
        name: "Test Customer",
        phone: "0123456789",
        address: "Test Street",
      },
      orderDetails: [
        {
          productId: testProduct.id,
          name: "T-Shirt Blue",
          price: 200,
          quantity: 2,
        },
      ],
      payment_method: "cash",
      deliveryPrice: 20,
      orderTotal: 420, // (200 * 2) + 20
    };

    const res = await request(app)
      .post("/api/order")
      .set("Authorization", `Bearer ${token}`)
      .send(orderData);

    expect(res.statusCode).toEqual(201);
    expect(res.body.order.dailySerial).toBe(1);

    // Verify Inventory deduction
    const invItem = await Inventory.findOne({
      where: { name: "T-Shirt Blue" },
    });
    expect(invItem.quantity).toBe(8); // 10 - 2
  });

  // --- PHASE 4: Expenses ---
  it("Phase 4: Should record an expense", async () => {
    const res = await request(app)
      .post("/api/expenses")
      .set("Authorization", `Bearer ${token}`)
      .send({
        description: "Electricity Bill",
        amount: 50,
        category: "Utilities",
      });

    expect(res.statusCode).toEqual(201);
  });

  // --- PHASE 5: Daily Closing & Summary ---
  it("Phase 5: Should fetch daily summary and close the day", async () => {
    // Check Summary
    const summaryRes = await request(app)
      .get("/api/closing/daily-summary")
      .set("Authorization", `Bearer ${token}`);

    expect(summaryRes.statusCode).toEqual(200);
    expect(summaryRes.body.totalOrders).toBe(1);
    expect(summaryRes.body.totalRevenue).toBe(420);
    expect(summaryRes.body.totalExpenses).toBe(50);

    // Close Day
    const closeRes = await request(app)
      .post("/api/closing/close-day")
      .set("Authorization", `Bearer ${token}`)
      .send({ date: new Date().toLocaleDateString("en-CA") });

    expect(closeRes.statusCode).toEqual(200);
    expect(closeRes.body.success).toBe(true);
  });

  // --- PHASE 6: Sync Queue ---
  it("Phase 6: Should verify sync queue has pending items", async () => {
    const pendingSync = await SyncQueue.findAll();
    expect(pendingSync.length).toBeGreaterThan(0);

    // Check for Order INSERT in queue
    const orderSync = pendingSync.find(
      (s) => s.tableName === "orders" && s.operation === "INSERT",
    );
    expect(orderSync).toBeDefined();
  });
});
