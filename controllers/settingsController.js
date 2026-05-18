const { 
    sequelize, 
    Setting, 
    Order, 
    OrderDetail, 
    Payment, 
    Expense, 
    MerchantTransaction, 
    AuditLog, 
    RateLimitLog, 
    TokenBlacklist, 
    DailyClosing, 
    MonthlyClosing, 
    SyncQueue, 
    Sale 
} = require('../models');

// ✅ جلب كل الإعدادات
exports.getAllSettings = async (req, res) => {
    try {
        const settings = await Setting.findAll();
        // تحويل المصفوفة إلى Object لسهولة التعامل في الفرونت إند
        const settingsObj = {};
        settings.forEach(s => {
            settingsObj[s.key] = s.value;
        });
        res.json(settingsObj);
    } catch (error) {
        console.error('❌ Error fetching settings:', error);
        res.status(500).json({ message: 'فشل في جلب الإعدادات' });
    }
};

// ✅ تحديث أو إضافة إعداد
exports.updateSetting = async (req, res) => {
    try {
        const { key, value, group } = req.body;
        await Setting.upsert({
            key,
            value: typeof value === 'string' ? value : JSON.stringify(value),
            group: group || 'general'
        });
        res.json({ message: `✅ تم تحديث ${key} بنجاح` });
    } catch (error) {
        console.error('❌ Error updating setting:', error);
        res.status(500).json({ message: 'فشل في تحديث الإعداد' });
    }
};

// ✅ تحديث مجموعة إعدادات مرة واحدة
exports.updateSettingsBulk = async (req, res) => {
    try {
        const settings = req.body; // { store_name: 'Vortex', vat: '14' }
        for (const [key, value] of Object.entries(settings)) {
            await Setting.upsert({
                key,
                value: typeof value === 'string' ? value : JSON.stringify(value)
            });
        }
        res.json({ message: '✅ تم تحديث الإعدادات بنجاح' });
    } catch (error) {
        console.error('❌ Error bulk updating settings:', error);
        res.status(500).json({ message: 'فشل في تحديث الإعدادات' });
    }
};

// ✅ تصفير قاعدة البيانات بالكامل (محلي وسحابي)
exports.resetDatabase = async (req, res) => {
    try {
        console.log("🧹 Wiping Local Database Transactional Tables...");
        // 1. إيقاف قيود المفاتيح الأجنبية مؤقتاً لتفادي تعارض الـ Foreign Key
        await sequelize.query('PRAGMA foreign_keys = OFF;');

        // 2. مسح جداول الحركات والعمليات المحلية بالكامل
        await Order.destroy({ where: {}, truncate: true });
        await OrderDetail.destroy({ where: {}, truncate: true });
        await Payment.destroy({ where: {}, truncate: true });
        await Expense.destroy({ where: {}, truncate: true });
        await MerchantTransaction.destroy({ where: {}, truncate: true });
        await AuditLog.destroy({ where: {}, truncate: true });
        await RateLimitLog.destroy({ where: {}, truncate: true });
        await TokenBlacklist.destroy({ where: {}, truncate: true });
        await DailyClosing.destroy({ where: {}, truncate: true });
        await MonthlyClosing.destroy({ where: {}, truncate: true });
        await SyncQueue.destroy({ where: {}, truncate: true });
        await Sale.destroy({ where: {}, truncate: true });

        // 3. إعادة تفعيل قيود المفاتيح الأجنبية
        await sequelize.query('PRAGMA foreign_keys = ON;');
        console.log("✅ Local Database Reset Complete!");

        // 4. مسح الجداول السحابية على Supabase
        const SUPABASE_URL = process.env.SUPABASE_URL;
        const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

        if (SUPABASE_URL && SUPABASE_KEY) {
            console.log("☁️ Wiping Remote Cloud Database (Supabase)...");
            const tablesToClear = [
                'Orders', 
                'OrderDetails', 
                'payments', 
                'Expenses', 
                'merchant_transactions', 
                'audit_logs', 
                'rate_limit_logs', 
                'token_blacklist', 
                'daily_closing', 
                'monthly_closing'
            ];

            for (const table of tablesToClear) {
                try {
                    await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=not.is.null`, {
                        method: 'DELETE',
                        headers: {
                            'apikey': SUPABASE_KEY,
                            'Authorization': `Bearer ${SUPABASE_KEY}`
                        }
                    });
                } catch (err) {
                    console.error(`⚠️ Error wiping remote table ${table}:`, err.message);
                }
            }
            console.log("✅ Remote Database Reset Complete!");
        }

        res.json({ message: '✅ تم تصفير العمليات والفواتير المحلية والسحابية بنجاح!' });
    } catch (error) {
        console.error('❌ Error resetting database:', error);
        res.status(500).json({ message: 'فشل في تصفير قاعدة البيانات' });
    }
};
