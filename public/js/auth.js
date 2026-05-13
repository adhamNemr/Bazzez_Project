// 🔹 دالة عرض الإشعارات (Toast) الموحدة والمتميزة
window.showToast = function(message, type = 'success', retryCount = 0) {
    // التحقق من وجود مكتبة SweetAlert2
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: type,
            title: message,
            showConfirmButton: false,
            timer: 4000,
            timerProgressBar: true,
            didOpen: (toast) => {
                toast.addEventListener('mouseenter', Swal.stopTimer)
                toast.addEventListener('mouseleave', Swal.resumeTimer)
            }
        });
    } else if (retryCount < 10) {
        // إذا لم يتم تحميل Swal بعد، حاول مجدداً بعد 200ms
        setTimeout(() => window.showToast(message, type, retryCount + 1), 200);
    } else {
        // fallback نهائي في حال فشل تحميل المكتبة تماماً
        console.warn(`[Toast ${type}]: ${message}`);
    }
};

window.addEventListener('DOMContentLoaded', () => {
    const userRole = localStorage.getItem('role'); // "cashier" أو "manager"
    const token = localStorage.getItem('token'); // التوكن
    const currentPage = window.location.pathname;

    if (!token) {
        // showToast('غير مصرح لك بالدخول. من فضلك سجل الدخول أولًا.', 'error'); // لا يمكن استخدام التوست هنا لأننا سننتقل فوراً
        window.location.href = '/index.html';
        return;
    }

    // Skip the /protected-route check - it was causing false redirects
    // Security is enforced by the API endpoints themselves.

    const allowedPagesForCashier = ['/cashier.html', '/receipt.html'];
    const allowedPagesForManager = [
        '/dashboard.html',
        '/cashier.html',
        '/inventory.html',
        '/manage_orders.html',
        '/monthly.html',
        '/daily.html',
        '/daily_closing.html',
        '/monthly_report.html',
        '/products.html',
        '/pages/products.html',
        '/sales.html',
        '/pages/sales.html',
        '/users.html',
        '/pages/users.html',
        '/receipt.html',
        '/customers.html',
        '/discount.html',
        '/analytics.html',
        '/expenses.html',
        '/daily_closing.html',
        '/monthly_closing.html',
        '/settings.html'
    ];

    // Redirect if not logged in
    if (!token || !userRole) {
        window.location.href = '/index.html';
        return;
    }

    // Strictly redirect cashier to cashier page if they try to access management
    if (userRole === 'cashier' && !allowedPagesForCashier.includes(currentPage)) {
        window.location.href = '/cashier.html';
        return;
    }

    // Redirect manager if somehow they hit an illegal page
    if (userRole === 'manager' && !allowedPagesForManager.includes(currentPage)) {
        window.location.href = '/dashboard.html';
        return;
    }

    // تسجيل الخروج عند الضغط على زر تسجيل الخروج
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('role');
            localStorage.removeItem('token');
            window.location.href = '/index.html';
        });
    }

    // 🔹 تعديل زر "Dashboard" ليصبح "Logout" للكاشير
    const navBtn = document.querySelector('.nav-back-btn');
    if (navBtn && userRole === 'cashier') {
        // تغيير الأيقونة والنص
        navBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
        `;
        
        // إضافة كلاس التنسيق الخاص بالخروج
        navBtn.classList.add('nav-logout-btn');
        
        // تغيير الوظيفة عند الضغط
        navBtn.onclick = (e) => {
            e.preventDefault(); // منع الانتقال للداشبورد
            localStorage.removeItem('role');
            localStorage.removeItem('token');
            window.location.href = 'index.html'; // التوجيه لصفحة الدخول
        };
        
        navBtn.title = "Logout"; // تحديث التلميح
    }
});
