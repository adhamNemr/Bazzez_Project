const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const sequelize = require("./config/db");

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

const app = express();

app.use(cors());
app.use(bodyParser.json());

app.use("/api/users", userRoutes); 
app.use("/api/auth", authRoutes); 
app.use("/api/products", productsRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/discounts", discountRoutes);
app.use("/api", closingRoutes);
app.use("/api/customers", customerRoutes); 
app.use("/login", loginRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/", indexRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api", dashboardRoutes);
app.use("/api", systemRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/comments', commentRoutes);

app.use(express.static(path.join(__dirname, "public")));

require("dotenv").config();
console.log("🔑 JWT Secret عند التشغيل:", process.env.JWT_SECRET);

sequelize
  .authenticate()
  .then(() => console.log("✅ Connected to the database successfully!"))
  .catch((err) => console.error("⚠️ Error connecting to the database:", err));

// ✅ تشغيل السيرفر
const PORT = process.env.PORT || 8083;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
