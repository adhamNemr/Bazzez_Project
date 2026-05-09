const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { User } = require("../models");

exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        console.log("📥 بيانات تسجيل الدخول المستقبلة:", req.body);

        // البحث عن المستخدم في قاعدة البيانات
        const user = await User.findOne({ where: { username } });

        if (!user) {
            console.log("🚫 المستخدم غير موجود!");
            return res.status(401).json({ message: "❌ اسم المستخدم أو كلمة المرور غير صحيحة." });
        }

        // التحقق من صحة كلمة المرور
        const isMatch = await bcrypt.compare(password, user.password);
        console.log("🔑 هل كلمة المرور متطابقة؟", isMatch);

        if (!isMatch) {
            console.log("🚫 كلمة المرور غير صحيحة!");
            return res.status(401).json({ message: "❌ اسم المستخدم أو كلمة المرور غير صحيحة." });
        }

        // إنشاء التوكن مع تضمين دور المستخدم
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role }, 
            'mySuperSecretKey123', 
            { expiresIn: "7d" }
        );

        console.log("🟢 تسجيل الدخول ناجح، دور المستخدم:", user.role);

        res.json({
            success: true,
            message: "✅ تسجيل الدخول ناجح!",
            token,
            role: user.role, // Changed userRole to role to match frontend expectation
            username: user.username
        });

    } catch (error) {
        console.error("🚨 خطأ أثناء تسجيل الدخول:", error);
        res.status(500).json({ message: "🚨 حدث خطأ أثناء تسجيل الدخول." });
    }
};

