const { Sequelize } = require('sequelize');
require("dotenv").config();

const sequelize = new Sequelize(process.env.DATABASE_URL || {
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
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
