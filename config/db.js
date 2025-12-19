const { Sequelize } = require('sequelize');
require("dotenv").config();
const config = require("./config.json").development; // تحميل إعدادات البيئة `development`

// إنشاء اتصال بقاعدة البيانات باستخدام الإعدادات من `config.json` أو `.env`
const sequelize = new Sequelize(
    process.env.DB_NAME || config.database,
    process.env.DB_USER || config.username,
    process.env.DB_PASSWORD || config.password,
    {
        host: process.env.DB_HOST || config.host,
        dialect: config.dialect,
        logging: false // تعطيل تسجيل الاستعلامات في الكونسول
    }
);

// اختبار الاتصال
sequelize.authenticate()
    .then(() => console.log('✅ Database Connected'))
    .catch(err => console.error('❌ Error:', err));

module.exports = sequelize; // ✅ تأكد من تصدير `sequelize`
