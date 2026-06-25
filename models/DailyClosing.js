module.exports = (sequelize, DataTypes) => {
    const DailyClosing = sequelize.define("DailyClosing", {
        closingDate: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            unique: true 
        },
        totalOrders: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 0
        },
        totalSandwiches: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 0
        },
        totalRevenue: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: 0.00
        },
        totalCost: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: 0.00
        },
        totalExpenses: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: 0.00
        },
        totalEarnings: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: 0.00
        },
        totalDiscount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0.00
        },
        onlinePaymentsTotal: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: 0.00
        }
    }, {
        tableName: "daily_closing",
        timestamps: false
    });

    return DailyClosing;
};