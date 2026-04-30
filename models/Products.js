const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

class Product extends Model {}

Product.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    category: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'General'
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    wholesalePrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0
    },
    sold: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    }
}, {
    sequelize,
    modelName: 'Product', // ✅ اسم الموديل بالمفرد وبحرف كبير (يفضل للتوافقية)
    tableName: 'products', // ✅ تحديد اسم الجدول كما هو في قاعدة البيانات
    timestamps: true
});

module.exports = Product;