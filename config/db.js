const { Sequelize } = require('sequelize');
require("dotenv").config();

// 🛡️ CRITICAL: Use in-memory SQLite for tests to prevent wiping production data
const isTest = process.env.NODE_ENV === 'test';
const dbStorage = isTest ? ':memory:' : (process.env.DB_PATH || './database.sqlite');

// 🗄️ Vortex POS - Standard SQLite Configuration
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: dbStorage,
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
        if (isTest) {
            console.log('✅ Test Database Ready (In-Memory Mode)');
        } else {
            console.log('✅ Local Database Ready (Standard Mode)');
        }
    })
    .catch(err => {
        console.error('❌ Local DB Error:', err.message);
    });

module.exports = sequelize;
