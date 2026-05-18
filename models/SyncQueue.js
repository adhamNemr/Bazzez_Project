module.exports = (sequelize, DataTypes) => {
    return sequelize.define('SyncQueue', {
        id: { 
            type: DataTypes.UUID, 
            defaultValue: DataTypes.UUIDV4, 
            primaryKey: true 
        },
        
        operation: { 
            type: DataTypes.STRING(10), 
            allowNull: false 
            // 'INSERT' | 'UPDATE' | 'DELETE'
        },
        
        tableName: { 
            type: DataTypes.STRING(50), 
            allowNull: false 
            // 'orders' | 'expenses' | 'merchant_transactions' | 'inventory'
        },
        
        recordId: { 
            type: DataTypes.STRING(50), 
            allowNull: false 
        },
        
        payload: { 
            type: DataTypes.JSON, 
            allowNull: false 
            // البيانات الكاملة اللي محتاجة تتبعت للسيرفر
        },
        
        retryCount: { 
            type: DataTypes.INTEGER, 
            defaultValue: 0 
        },
        
        status: { 
            type: DataTypes.STRING(20), 
            defaultValue: 'pending'
            // 'pending' | 'syncing' | 'done' | 'failed'
        },
        
        createdAt: { 
            type: DataTypes.DATE, 
            defaultValue: DataTypes.NOW 
        }
        
    }, { 
        tableName: 'sync_queue',
        timestamps: false 
    });
};
