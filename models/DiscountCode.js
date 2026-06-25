module.exports = (sequelize, DataTypes) => {
    const DiscountCode = sequelize.define('DiscountCode', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        code: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        discount_type: {
            type: DataTypes.ENUM('percentage', 'fixed', 'buy_x_get_y'),
            allowNull: false
        },
        discount_value: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        },
        buy_quantity: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        get_quantity: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        get_discount_value: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true // لو 100 يبقى مجاناً، لو أقل يبقى بخصم
        },
        start_date: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        end_date: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        applicable_products: {
            type: DataTypes.JSON,
            allowNull: true
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        tableName: 'discount_codes',
        timestamps: false
    });

    return DiscountCode;
};