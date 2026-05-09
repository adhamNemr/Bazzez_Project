const { sequelize } = require('./models');
const bcrypt = require('bcryptjs');
const { User, Setting } = require('./models');

async function syncSupabase() {
    try {
        console.log("🔄 Connecting to Supabase and syncing tables...");
        
        // Sync all models safely
        await sequelize.sync({ alter: true }); 
        console.log("✅ All tables synced/updated successfully on Supabase!");

        // Create default admin user if not exists
        console.log("👤 Checking admin user...");
        const adminExists = await User.findOne({ where: { username: 'admin' } });
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await User.create({
                username: 'admin',
                password: hashedPassword,
                role: 'manager'
            });
            console.log("✅ Admin user created (User: admin, Pass: admin123)");
        }

        // Initialize default settings (Key-Value style)
        console.log("⚙️ Initializing default settings...");
        const defaultSettings = [
            { key: 'store_name', value: 'Dar El Farouk', group: 'general' },
            { key: 'currency', value: 'ج.م', group: 'general' },
            { key: 'hotline', value: '01211228565', group: 'general' },
            { key: 'footer_message', value: 'شكراً لزيارتكم', group: 'general' },
            { key: 'active_business_date', value: new Date().toLocaleDateString('en-CA'), group: 'system' }
        ];

        for (const s of defaultSettings) {
            await Setting.findOrCreate({ where: { key: s.key }, defaults: s });
        }
        console.log("✅ Default settings initialized.");

        console.log("\n🚀 Supabase is now FULLY READY for Vortex POS!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error syncing with Supabase:", error);
        process.exit(1);
    }
}

syncSupabase();
