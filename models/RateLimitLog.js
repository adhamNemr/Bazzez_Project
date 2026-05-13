module.exports = (sequelize, DataTypes) => {
    const RateLimitLog = sequelize.define('RateLimitLog', {
        key: {
            type: DataTypes.TEXT,
            primaryKey: true
        },
        windowStart: {
            type: DataTypes.DATE,
            primaryKey: true
        },
        count: {
            type: DataTypes.INTEGER,
            defaultValue: 1
        }
    }, {
        tableName: 'rate_limit_log',
        timestamps: false
    });

    return RateLimitLog;
};
