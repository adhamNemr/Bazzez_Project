module.exports = (sequelize, DataTypes) => {
  const Expense = sequelize.define("Expense", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    description: {
      type: DataTypes.STRING,
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false
    },
    date: {
      type: DataTypes.DATEONLY,
      defaultValue: DataTypes.NOW
    },
    addedBy: {
      type: DataTypes.STRING,
      allowNull: true
    },
    payment_method: {
      type: DataTypes.STRING,
      defaultValue: 'cash'
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
    tableName: "expenses",
    timestamps: true
  });

  return Expense;
};
