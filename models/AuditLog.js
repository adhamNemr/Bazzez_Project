module.exports = (sequelize, DataTypes) => {
    const AuditLog = sequelize.define('AuditLog', {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        userName: {
            type: DataTypes.STRING(100),
            allowNull: true
        },
        action: {
            type: DataTypes.STRING(20),
            allowNull: false
        },
        tableName: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        recordId: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        oldValues: {
            type: DataTypes.JSON,
            allowNull: true
        },
        newValues: {
            type: DataTypes.JSON,
            allowNull: true
        },
        meta: {
            type: DataTypes.JSON,
            allowNull: true
        },
        ipAddress: {
            type: DataTypes.STRING(45),
            allowNull: true
        },
        endpoint: {
            type: DataTypes.STRING(200),
            allowNull: true
        }
    }, {
        tableName: 'audit_logs',
        timestamps: true,
        updatedAt: false
    });

    return AuditLog;
};
