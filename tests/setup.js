const { sequelize } = require('../models');

module.exports = async () => {
  await sequelize.sync({ force: true });
  console.log('Test Database Synced');
};
