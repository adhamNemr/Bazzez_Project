module.exports = (sequelize, DataTypes) => {
    const MerchantTransaction = sequelize.define("MerchantTransaction", {
        merchantId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        type: {
            type: DataTypes.ENUM('invoice', 'payment'),
            allowNull: false
        },
        amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        },
        date: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    }, {
        tableName: "merchant_transactions",
        timestamps: true,
        indexes: [
            { fields: ['merchantId'] },
            { fields: ['date'] }
        ]
    });

    return MerchantTransaction;
};
