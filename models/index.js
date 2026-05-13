const { Sequelize, DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const User = require("./User");
const Customer = require("./Customer")(sequelize, DataTypes);
const Product = require("./Products"); // ✅ تم التعديل هنا
const Order = require("./Order")(sequelize, DataTypes);
const OrderDetail = require("./OrderDetail")(sequelize, DataTypes);
const Sale = require("./Sale")(sequelize, DataTypes);
const Inventory = require("./Inventory")(sequelize, DataTypes);
const Recipe = require("./Recipe")(sequelize, DataTypes);
const DailyClosing = require('./DailyClosing')(sequelize, DataTypes);
const MonthlyClosing = require('./MonthlyClosing')(sequelize, DataTypes);
const Payment = require('./Payments'); 
const DiscountCode = require("./DiscountCode"); // تأكد أن الاسم متطابق
const Comment = require("./Comment")(sequelize, DataTypes);
const Expense = require("./Expense")(sequelize, DataTypes);
const Setting = require("./Setting")(sequelize, DataTypes);
const Merchant = require("./Merchant")(sequelize, DataTypes);
const MerchantTransaction = require("./MerchantTransaction")(sequelize, DataTypes);
const AuditLog = require("./AuditLog")(sequelize, DataTypes);
const RateLimitLog = require("./RateLimitLog")(sequelize, DataTypes);
const TokenBlacklist = require("./TokenBlacklist")(sequelize, DataTypes);

// ✅ العلاقات بين الجداول
Product.hasMany(Sale, { foreignKey: "product_id" });
Sale.belongsTo(Product, { foreignKey: "product_id" });

Customer.hasMany(Order, { foreignKey: "customerId", as: 'orders' });
Order.belongsTo(Customer, { foreignKey: "customerId", as: 'customer_info' });

Order.hasMany(OrderDetail, { foreignKey: "orderId" });
OrderDetail.belongsTo(Order, { foreignKey: "orderId" });

Product.hasMany(OrderDetail, { foreignKey: "productId" });
OrderDetail.belongsTo(Product, { foreignKey: "productId" });

Merchant.hasMany(MerchantTransaction, { foreignKey: "merchantId", as: "transactions", onDelete: 'CASCADE' });
MerchantTransaction.belongsTo(Merchant, { foreignKey: "merchantId", as: "merchant" });

// ✅ تصدير الموديلات
module.exports = {
    sequelize,
    User,
    Customer,
    Product,
    Order,
    OrderDetail,
    Sale,
    Inventory,
    Recipe,
    DailyClosing,
    MonthlyClosing,
    Payment,
    DiscountCode,
    Comment,
    Expense,
    Setting,
    Merchant,
    MerchantTransaction,
    AuditLog,
    RateLimitLog,
    TokenBlacklist
};