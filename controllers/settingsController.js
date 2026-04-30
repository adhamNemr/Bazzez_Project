const { Setting } = require('../models');

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
