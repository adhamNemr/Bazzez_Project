// 🔹 إنشاء حاوية الإشعارات عند تحميل الصفحة
const toastContainer = document.createElement('div');
toastContainer.id = 'toast-container';
document.body.appendChild(toastContainer);

// 🔹 دالة عرض الإشعارات (Toast)
window.showToast = function(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = '';
    if (type === 'success') icon = '✓'; // Simple checkmark
    if (type === 'error') icon = '✕';   // Simple X
    if (type === 'warning') icon = '!';
    if (type === 'info') icon = 'i';

    // Use SVG icons for better look if possible, or simple text for now
    if (type === 'success') icon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>';
    if (type === 'error') icon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
    if (type === 'warning') icon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
    if (type === 'info') icon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';

    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-content">
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close">&times;</button>
    `;
    
    toastContainer.appendChild(toast);

    // Close button logic
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.onclick = () => {
        removeToast(toast);
    };

    // Auto dismiss after 10 seconds
    const timeout = setTimeout(() => {
        removeToast(toast);
    }, 10000);

    // Pause on hover (optional nice-to-have)
    toast.onmouseenter = () => clearTimeout(timeout);
    toast.onmouseleave = () => {
        setTimeout(() => removeToast(toast), 10000);
    };

    function removeToast(element) {
        if (element.classList.contains('removing')) return;
        
        // 1. Start the exit animation (slide out)
        element.style.animation = 'fadeOut 0.4s ease-in forwards';
        
        // 2. Add class to collapse height smoothly
        element.classList.add('removing');

        // 3. Remove from DOM after animation
        element.addEventListener('animationend', () => {
            if (element.parentElement) {
                element.remove();
            }
        });
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

    const allowedPagesForCashier = ['/cashier.html', '/receipt.html', '/manage_orders.html', '/expenses.html'];
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
        '/pages/products.html',  // ✅ Subdirectory path
        '/sales.html',
        '/pages/sales.html',     // ✅ Subdirectory path
        '/users.html',
        '/pages/users.html',     // ✅ Subdirectory path
        '/receipt.html',
        '/customers.html',
        '/discount.html',
        '/analytics.html',
        '/expenses.html',
        '/settings.html'
    ];


    // إذا المستخدم غير مسجل الدخول
    if (!userRole) {
        window.location.href = '/index.html';
        return;
    }

    // التحقق من صلاحيات الكاشير
    if (userRole === 'cashier' && !allowedPagesForCashier.includes(currentPage)) {
        // showToast('غير مصرح لك بالدخول لهذه الصفحة.', 'error');
        window.location.href = '/index.html';
        return;
    }

    // التحقق من صلاحيات المدير
    if (userRole === 'manager' && !allowedPagesForManager.includes(currentPage)) {
        // showToast('غير مصرح لك بالدخول لهذه الصفحة.', 'error');
        window.location.href = '/index.html';
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
