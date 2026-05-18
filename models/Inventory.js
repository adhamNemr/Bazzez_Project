module.exports = (sequelize, DataTypes) => {
    const Inventory = sequelize.define("Inventory", {
        name: {
            type: DataTypes.STRING,
            allowNull: true,
            unique: true
        },
        quantity: {
            type: DataTypes.DECIMAL(10,2),
            allowNull: true
        },
        total: {
            type: DataTypes.DECIMAL(10,2),
            allowNull: false,
            defaultValue: 0.00
        },
        cost: {
            type: DataTypes.DECIMAL(10,2),
            allowNull: false
        },
        unit: {
            type: DataTypes.STRING,
            allowNull: true
        },
        dateAdded: {
            type: DataTypes.DATE,
            defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
        },
        expiryDate: {
            type: DataTypes.DATE,
            allowNull: true
        },
        min: {
            type: DataTypes.DECIMAL(10,2),
            allowNull: false,
            defaultValue: 0.00
        },
        variants: {
            type: DataTypes.JSON,
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
        tableName: "inventory",
        timestamps: true
    });

    return Inventory;
};