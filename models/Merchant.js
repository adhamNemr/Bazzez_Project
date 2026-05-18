module.exports = (sequelize, DataTypes) => {
    const Merchant = sequelize.define("Merchant", {
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        phone: {
            type: DataTypes.STRING,
            allowNull: true
        },
        type: {
            type: DataTypes.ENUM('supplier', 'wholesale_client'),
            allowNull: false
        },
        balance: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0.00
        },
        notes: {
            type: DataTypes.TEXT,
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
        tableName: "merchants",
        timestamps: true
    });

    return Merchant;
};
