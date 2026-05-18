const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const helmet = require("helmet");
const errorHandler = require("./middleware/errorHandler");
const sequelize = require("./config/db");
const { startAutoBackup } = require("./utils/backup");
const syncService = require('./services/syncService');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');

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
const merchantsRoutes = require("./routes/merchants");
const syncRoutes = require("./routes/sync");

const sanitizeInput = require("./middleware/sanitize");
const rateLimiter = require("./middleware/rateLimiter");

const app = express();

// 🛡️ Security Middleware Chain
app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(cors());
app.use(bodyParser.json({ limit: '1mb' }));
app.use(sanitizeInput);

// 🚦 Global API Rate Limiter
const apiLimiter = rateLimiter({ windowMinutes: 1, maxRequests: 100, keyPrefix: 'api_global' });
app.use("/api", apiLimiter);

// ✅ Static file serving - Robust path resolution for Electron/Portable
const publicPath = path.resolve(__dirname, "public");
app.use(express.static(publicPath));
console.log(`📂 Serving static files from: ${publicPath}`);

// ✅ API Routes
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
app.use("/api/merchants", merchantsRoutes);
app.use("/api/sync", syncRoutes);

// ✅ Auth & Login
app.use("/login", loginRoutes);

// ✅ Other index helpers
app.use("/", indexRoutes);

// ✅ Error Handler (must be last)
app.use(errorHandler);

const { Setting, SyncQueue, User } = require("./models");

// ✅ Server Startup Logic
const startServer = () => {
  if (process.env.NODE_ENV === 'test') return;

  const PORT = process.env.PORT || 8083;
  app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    
    // ✅ Start Sync Service (Offline-First Engine)
    syncService.start();

    // 💾 Start Auto Backup (Every 12 hours)
    startAutoBackup(12);

    // 🕒 Auto Shift Check
    const { checkAndPerformAutoShift } = require('./controllers/closingController');
    checkAndPerformAutoShift();
    setInterval(checkAndPerformAutoShift, 60 * 60 * 1000); 

    // ✅ Sync Queue Cleanup (Every 24 hours)
    setInterval(async () => {
        try {
            const deletedCount = await SyncQueue.destroy({ 
                where: { 
                    status: 'done', 
                    createdAt: { [Op.lt]: new Date(Date.now() - 86400000) } 
                }
            });
            if (deletedCount > 0) console.log(`🧹 Cleaned up ${deletedCount} synced items from queue.`);
        } catch (err) {
            console.error('❌ Sync Queue cleanup error:', err.message);
        }
    }, 86400000);
  });
};

// ✅ Database Initialization
if (process.env.NODE_ENV !== 'test') {
  sequelize.authenticate()
    .then(async () => {
      console.log("✅ Local SQLite Database Connected!");
      try {
        // Sync models to ensure local schema is up to date
        await sequelize.sync(); 
        console.log("✅ Database schema synchronized.");

        // Seed Default Settings if empty
        const settingsCount = await Setting.count();
        if (settingsCount === 0) {
          console.log("🌱 Seeding default settings...");
          await Setting.bulkCreate([
            { key: 'store_name', value: 'Vortex POS', group: 'general' },
            { key: 'vat_percent', value: '0', group: 'finance' },
            { key: 'currency', value: 'EGP', group: 'finance' },
            { key: 'active_business_date', value: new Date().toLocaleDateString('en-CA'), group: 'system' }
          ]);
          console.log("✅ Default settings seeded.");
        }

        // 👤 Seed Default Admin if empty
        const userCount = await User.count();
        if (userCount === 0) {
          console.log("👤 Seeding default admin user...");
          const hashedPassword = await bcrypt.hash('admin123', 10);
          await User.create({
            username: 'admin',
            password: hashedPassword,
            role: 'manager'
          });
          console.log("✅ Default admin seeded (admin / admin123).");
        }

        // 🚀 Start the server ONLY after DB is ready
        startServer();

      } catch (err) {
        console.error("⚠️ Error during DB initialization:", err);
      }
    })
    .catch((err) => console.error("⚠️ Error connecting to the database:", err));
}

// ✅ Clean Shutdown
const gracefulShutdown = () => {
    console.log('🛑 Shutting down gracefully...');
    syncService.stop();
    process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

module.exports = app;
