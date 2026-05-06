const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const helmet = require("helmet");
const errorHandler = require("./middleware/errorHandler");
const sequelize = require("./config/db");
const { startAutoBackup } = require("./utils/backup");

// ✅ Route Imports
const userRoutes = require("./routes/users");
const loginRoutes = require("./routes/login");
const productsRoutes = require("./routes/Products");
const orderRoutes = require("./routes/order");
const salesRoutes = require("./routes/sales");
const inventoryRoutes = require("./routes/inventory");
const discountRoutes = require("./routes/discountRoutes");
const closingRoutes = require("./routes/closing");
const customerRoutes = require("./routes/customers");
const authRoutes = require("./routes/auth");
const ordersRoutes = require("./routes/orders");
const indexRoutes = require("./routes/index");
const paymentRoutes = require("./routes/payments");
const dashboardRoutes = require("./routes/dashboard");
const systemRoutes = require("./routes/systemRoutes");
const analyticsRoutes = require("./routes/analytics");
const commentRoutes = require('./routes/comment');
const expenseRoutes = require("./routes/expenses");
const settingsRoutes = require("./routes/settings");

const app = express();

app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(cors());
app.use(bodyParser.json());

// ✅ Static file serving - this handles ALL .html files directly
app.use(express.static(path.join(__dirname, "public")));

// ✅ API Routes (prefixed with /api to avoid conflicts)
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/discounts", discountRoutes);
app.use("/api/closing", closingRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api", dashboardRoutes);
app.use("/api", systemRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/comments', commentRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/settings", settingsRoutes);

// ✅ Auth & Login
app.use("/login", loginRoutes);

// ✅ Other index helpers
app.use("/", indexRoutes);

// ✅ Error Handler (must be last)
app.use(errorHandler);

require("dotenv").config();
console.log("🔑 JWT Secret:", process.env.JWT_SECRET);

const { Setting } = require("./models");

sequelize
  .authenticate()
  .then(async () => {
    console.log("✅ Connected to the database successfully!");
    try {
      await Setting.sync();
      
      // ✅ Check and add 'variants' column to 'inventory' table if missing
      const [results] = await sequelize.query("SHOW COLUMNS FROM inventory LIKE 'variants'");
      if (results.length === 0) {
        await sequelize.query("ALTER TABLE inventory ADD COLUMN variants JSON NULL AFTER min");
        console.log("✅ Column 'variants' added to 'inventory' table.");
      }

      console.log("✅ Settings table synced");
    } catch (err) {
      console.error("⚠️ Error during DB initialization:", err);
    }
  })
  .catch((err) => console.error("⚠️ Error connecting to the database:", err));

const PORT = process.env.PORT || 8083;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  
  // 💾 Start Auto Backup (Runs every 12 hours)
  startAutoBackup(12);
});
