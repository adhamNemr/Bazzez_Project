const mysql = require('mysql2');

// إعداد الاتصال بقاعدة البيانات
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'adham', // استبدل باسم المستخدم الخاص بك
    password: 'Adham123!', // استبدل بكلمة المرور الخاصة بك
    database: 'pos_system' // استبدل باسم قاعدة البيانات الخاصة بك
});

// الاتصال بقاعدة البيانات
connection.connect((err) => {
    if (err) {
        console.error('Error connecting to the database:', err);
        return;
    }
    console.log('Connected to the database.');

    // استعلام لجلب جميع الأعمدة من جميع الجداول
    const query = `
        SELECT 
            TABLE_NAME, 
            COLUMN_NAME, 
            DATA_TYPE, 
            CHARACTER_MAXIMUM_LENGTH 
        FROM 
            INFORMATION_SCHEMA.COLUMNS 
        WHERE 
            TABLE_SCHEMA = 'pos_system'; 
    `;

    // تنفيذ الاستعلام
    connection.query(query, (error, results) => {
        if (error) {
            console.error('Error fetching columns:', error);
            return;
        }

        // عرض النتائج في التيرمينال
        results.forEach(row => {
            console.log(`Table: ${row.TABLE_NAME}, Column: ${row.COLUMN_NAME}, Type: ${row.DATA_TYPE}, Max Length: ${row.CHARACTER_MAXIMUM_LENGTH}`);
        });

        // إغلاق الاتصال
        connection.end();
    });
});