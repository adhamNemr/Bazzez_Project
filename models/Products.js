module.exports = (sequelize, DataTypes) => {
    class Product extends sequelize.Sequelize.Model {}

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
        modelName: 'Product',
        tableName: 'products',
        timestamps: true
    });

    return Product;
};