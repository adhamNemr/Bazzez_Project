const bcrypt = require("bcrypt");
const { User } = require("./models");

const createManager = async () => {
    try {
        const hashedPassword = await bcrypt.hash("1234", 10);

        const newUser = await User.create({
            username: "adham",
            password: hashedPassword,
            role: "cashier", // ✅ تأكد أن الدور يتم تحديده هنا
        });

        console.log("✅ تم إنشاء المستخدم المدير بنجاح:", newUser);
    } catch (error) {
        console.error("❌ حدث خطأ أثناء إنشاء المستخدم:", error);
    }
};

createManager();
