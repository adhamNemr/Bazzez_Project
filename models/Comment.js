module.exports = (sequelize, DataTypes) => {
    const Comment = sequelize.define("Comment", {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        commentText: {
            type: DataTypes.STRING, 
            allowNull: false
        },
        color: {
            type: DataTypes.STRING, 
            allowNull: false
        },
        price: {
            type: DataTypes.DECIMAL(10, 2), 
            allowNull: false
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
        }
    }, {
        tableName: 'Comments', 
        timestamps: false 
    });

    return Comment;
};