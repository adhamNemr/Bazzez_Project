document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("header-container");
    if (!container) return;

    // Get config from data attributes
    const rawTitle = container.getAttribute("data-title") || "Vortex POS";
    const icon = container.getAttribute("data-icon") || "fa-list-alt";
    
    // Auto-detect Language
    const currentLang = localStorage.getItem('lang') || 'ar';
    const isAr = currentLang === 'ar';
    
    // Self-Localization for known pages to prevent ID mismatch errors
    const translations = {
        'Admin Dashboard': isAr ? 'لوحة التحكم الإدارية' : 'Admin Dashboard',
        'إدارة المخزن': isAr ? 'إدارة المخزن' : 'Inventory Management',
        'إدارة الطلبات': isAr ? 'إدارة الطلبات' : 'Manage Orders',
        'إعدادات النظام': isAr ? 'إعدادات النظام' : 'System Settings',
        'إدارة المنتجات': isAr ? 'إدارة المنتجات' : 'Products Management',
        'إدارة المصروفات': isAr ? 'إدارة المصروفات' : 'Expense Management'
    };

    const finalTitle = translations[rawTitle] || rawTitle;
    const homeText = isAr ? 'الرئيسية' : 'Home';
    
    container.innerHTML = `
        <header class="main-brand-header">
            <div class="brand-group">
                <img src="/img/logo.png" alt="Vortex" class="brand-logo" onerror="this.src='https://cdn-icons-png.flaticon.com/512/5164/5164023.png'">
                <div class="brand-text">
                    <h1>VORTEX</h1>
                    <span>SYSTEMS</span>
                </div>
            </div>

            <div class="page-context">
                <span class="context-pill">
                    <i class="fas ${icon}"></i>
                    <span>${finalTitle}</span>
                </span>
            </div>

            <div class="system-controls">
                <a href="/launcher.html" class="header-nav-btn">
                    <i class="fas fa-th-large"></i>
                    <span>${homeText}</span>
                </a>
            </div>
        </header>
    `;
});
