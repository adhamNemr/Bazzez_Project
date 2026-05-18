module.exports = (sequelize, DataTypes) => {
    const Order = sequelize.define("Order", {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        customerId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        deliveryPrice: {
            type: DataTypes.DECIMAL(10,2),
            allowNull: true
        },
        customerName: {
            type: DataTypes.STRING,
            allowNull: true
        },
        customerAddress: {
            type: DataTypes.STRING,
            allowNull: true
        },
        customerPhone: {
            type: DataTypes.STRING,
            allowNull: true
        },
        orderDetails: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        orderTotal: {
            type: DataTypes.FLOAT,
            allowNull: true
        },
        isCancelled: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: "No"
        },
        archived: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: false
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: true
        },
        payment_status: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        payment_method: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        discountAmount: {
            type: DataTypes.DECIMAL(10,2),
            allowNull: false,
            defaultValue: 0
        },
        businessDate: {
            type: DataTypes.DATEONLY,
            allowNull: true
        },
        dailySerial: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        sync_status: { 
            type: DataTypes.STRING(20), 
            defaultValue: 'pending' 
        },
        local_id: { 
            type: DataTypes.UUID, 
            defaultValue: DataTypes.UUIDV4 
        }
    }, {
        timestamps: false,  // ✅ تعطيل `createdAt` و `updatedAt` لأن `updatedAt` غير موجود
        indexes: [
            { fields: ['businessDate'] },
            { fields: ['createdAt'] },
            { fields: ['archived'] },
            { fields: ['isCancelled'] }
        ]
    });

    return Order;
};
