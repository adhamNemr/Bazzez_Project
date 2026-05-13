module.exports = (sequelize, DataTypes) => {
    const TokenBlacklist = sequelize.define('TokenBlacklist', {
        token: {
            type: DataTypes.TEXT,
            primaryKey: true
        },
        expiresAt: {
            type: DataTypes.DATE,
            allowNull: false
        }
    }, {
        tableName: 'token_blacklist',
        timestamps: true,
        updatedAt: false
    });

    return TokenBlacklist;
};
