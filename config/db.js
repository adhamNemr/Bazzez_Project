const { Sequelize } = require('sequelize');
require("dotenv").config();

// بيانات الاتصال السحابية مثبتة لضمان عمل النسخة الـ Portable
const DB_USER = 'postgres.glvqdcucqgshdkotmwfs';
const DB_PASSWORD = encodeURIComponent('MARWANroma77@#$');
const DB_HOST = 'aws-0-eu-west-1.pooler.supabase.com';
const DB_PORT = '6543';
const DB_NAME = 'postgres';

const connectionString = `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?pgbouncer=true`;

const sequelize = new Sequelize(connectionString, {
    dialect: 'postgres',
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    },
    logging: false
});

sequelize.authenticate()
    .then(() => console.log('✅ Connected to Supabase Pooler!'))
    .catch(err => {
        console.error('❌ Connection Error:', err.message);
    });

module.exports = sequelize;
