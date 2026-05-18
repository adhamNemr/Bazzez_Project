const { Sequelize } = require('sequelize');
require("dotenv").config();

// 🗄️ Vortex POS - Standard SQLite Configuration
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: process.env.DB_PATH || './database.sqlite',
    logging: false,
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
});

sequelize.authenticate()
    .then(() => {
        console.log('✅ Local Database Ready (Standard Mode)');
    })
    .catch(err => {
        console.error('❌ Local DB Error:', err.message);
    });

module.exports = sequelize;
