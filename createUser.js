const { User } = require('./models');
const bcrypt = require('bcryptjs');
const sequelize = require('./config/db');

async function createUsers() {
    try {
        await sequelize.authenticate();
        console.log('✅ Connected to Supabase Pooler!');

        // إنشاء يوزر الأدمن الأساسي
        const adminExists = await User.findOne({ where: { username: 'admin' } });
        if (!adminExists) {
            const hashedAdminPassword = await bcrypt.hash('admin123', 10);
            await User.create({
                username: 'admin',
                password: hashedAdminPassword,
                role: 'manager'
            });
            console.log('✅ Admin user created: admin / admin123');
        } else {
            console.log('ℹ️ Admin user already exists.');
        }

        // إنشاء يوزر أدهم (اختياري)
        const adhamExists = await User.findOne({ where: { username: 'adham' } });
        if (!adhamExists) {
            const hashedAdhamPassword = await bcrypt.hash('adham123', 10);
            await User.create({
                username: 'adham',
                password: hashedAdhamPassword,
                role: 'manager'
            });
            console.log('✅ Adham user created: adham / adham123');
        }

        console.log('🚀 All users are ready!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

createUsers();
