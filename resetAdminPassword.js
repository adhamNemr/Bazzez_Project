const bcrypt = require('bcrypt');
const { User } = require('./models');

async function resetAdminPassword() {
    try {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        
        await User.update(
            { password: hashedPassword },
            { where: { username: 'admin' } }
        );
        
        console.log('✅ تم تحديث كلمة المرور بنجاح!');
        console.log('Username: admin');
        console.log('Password: admin123');
        
        // التحقق من النتيجة
        const admin = await User.findOne({ where: { username: 'admin' } });
        const isMatch = await bcrypt.compare('admin123', admin.password);
        console.log('✅ تم التحقق من الباسورد:', isMatch);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ خطأ:', error);
        process.exit(1);
    }
}

resetAdminPassword();
