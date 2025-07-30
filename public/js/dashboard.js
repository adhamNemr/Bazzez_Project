document.addEventListener("DOMContentLoaded", async () => {
    // ✅ الحصول على العناصر من الـ HTML
    const orderCount = document.getElementById("orderCount");
    const discountCodeInput = document.getElementById('discountCodeInput');
    const logoutBtn = document.getElementById("logoutBtn");
    const restartBtn = document.getElementById("restartServerBtn");

    // ✅ التحقق من صلاحيات المستخدم
    const userRole = localStorage.getItem("role");
    const token = localStorage.getItem("token");

    if (userRole !== "manager") {
        alert("🚫 ليس لديك صلاحية لدخول هذه الصفحة!");
        window.location.href = "/cashier.html";
        return;
    }

    try {
        // ✅ جلب البيانات من الـ API
        const response = await fetch('/api/dashboard-data', {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Network response was not ok');

        const data = await response.json();

        // ✅ تحديث البيانات على الصفحة
        orderCount.textContent = data.totalOrders || "0";

    } catch (error) {
        console.error("❌ خطأ في تحميل بيانات اللوحة:", error);
        discountCodeInput.disabled = true;
        discountCodeInput.placeholder = '⚠️ Error loading system status';
    }

    // ✅ زر تسجيل الخروج
    logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        window.location.href = "/index.html";
    });

    // ✅ زر Restart Server
    restartBtn.addEventListener("click", async () => {
        try {
            const originalText = restartBtn.textContent;
            restartBtn.textContent = "Restarting server... 🚀";
            restartBtn.disabled = true;

            // ✅ إرسال طلب إعادة تشغيل السيرفر
            const response = await fetch("http://127.0.0.1:8083/api/restart-server", {
                method: "POST"
            });

            if (!response.ok) throw new Error("Failed to restart server");

            // ✅ انتظار السيرفر حتى يبدأ العمل مجددًا
            let isServerUp = false;
            const maxAttempts = 10; // عدد المحاولات للتحقق من السيرفر
            let attempts = 0;

            while (!isServerUp && attempts < maxAttempts) {
                try {
                    await new Promise(resolve => setTimeout(resolve, 2000)); // الانتظار لمدة ثانيتين
                    const healthCheck = await fetch("http://127.0.0.1:8083/api/system-status");
                    if (healthCheck.ok) {
                        isServerUp = true;
                    }
                } catch (error) {
                    console.log("🚦 Waiting for server to restart...");
                }
                attempts++;
            }

            if (isServerUp) {
                sessionStorage.setItem("serverRestartSuccess", "true");
                window.location.reload(); // إعادة تحميل الصفحة بعد التشغيل الناجح
            } else {
                alert("❌ لم يتم تشغيل السيرفر بعد إعادة التشغيل. حاول مرة أخرى.");
                restartBtn.textContent = originalText;
                restartBtn.disabled = false;
            }

        } catch (error) {
            console.error("❌ Error restarting server:", error);
            alert("❌ حدث خطأ أثناء إعادة تشغيل السيرفر.");
            restartBtn.textContent = "Restart Server";
            restartBtn.disabled = false;
        }
    });

    document.getElementById('openCustomersPage').addEventListener('click', () => {
        window.location.href = './customers.html';
    });

    // ✅ عرض رسالة النجاح بعد إعادة التحميل فقط إذا كانت العملية ناجحة
    if (sessionStorage.getItem("serverRestartSuccess") === "true") {
        alert("✅ Server restarted successfully!");
        sessionStorage.removeItem("serverRestartSuccess");
    }
});