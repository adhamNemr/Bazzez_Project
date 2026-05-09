const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User } = require('../models'); // تأكد من صحة المسار حسب مشروعك

const secretKey = 'mySuperSecretKey123';

router.post('/', async (req, res) => {
    const { username, password } = req.body;

    console.log('📥 بيانات تسجيل الدخول المستقبلة:', { username, password });

    try {
        // البحث عن المستخدم في قاعدة البيانات
        const user = await User.findOne({ where: { username } });

        if (!user) {
            console.log('❌ اسم المستخدم غير موجود!');
            return res.status(401).json({ error: '❌ بيانات الدخول غير صحيحة!' });
        }

        // التحقق من كلمة المرور باستخدام bcrypt
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            console.log('❌ كلمة المرور غير صحيحة!');
            return res.status(401).json({ error: '❌ بيانات الدخول غير صحيحة!' });
        }

        // إنشاء توكن JWT
        const token = jwt.sign(
            { username: user.username, role: user.role }, 
            process.env.JWT_SECRET || 'mySuperSecretKey123', 
            { expiresIn: '1h' }
        );

        console.log('🟢 تسجيل الدخول ناجح، اسم المستخدم:', user.username);
        return res.json({ 
            token, 
            role: user.role,
            username: user.username // ✅ إضافة اسم المستخدم للرد
        });

    } catch (error) {
        console.error('❌ خطأ أثناء تسجيل الدخول:', error);
        return res.status(500).json({ error: '❌ حدث خطأ أثناء تسجيل الدخول.' });
    }
});

module.exports = router;
