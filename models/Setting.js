module.exports = (sequelize, DataTypes) => {
  const Setting = sequelize.define("Setting", {
    key: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    group: {
      type: DataTypes.STRING,
      defaultValue: 'general'
    }
  }, {
    timestamps: true
  });

  return Setting;
};
