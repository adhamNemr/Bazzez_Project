document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("header-container");
    if (!container) return;

    // Get config from data attributes
    const rawTitle = container.getAttribute("data-title") || "Vortex POS";
    const icon = container.getAttribute("data-icon") || "fa-list-alt";
    
    // Auto-detect Language
    const currentLang = localStorage.getItem('lang') || 'ar';
    const isAr = currentLang === 'ar';
    
    const translations = {
        'Admin Dashboard': isAr ? 'لوحة التحكم الإدارية' : 'Admin Dashboard',
        'إدارة المخزن': isAr ? 'إدارة المخزن' : 'Inventory Management',
        'إدارة الطلبات': isAr ? 'إدارة الطلبات' : 'Manage Orders',
        'إعدادات النظام': isAr ? 'إعدادات النظام' : 'System Settings',
        'إدارة المنتجات': isAr ? 'إدارة المنتجات' : 'Products Management',
        'إدارة المصروفات': isAr ? 'إدارة المصروفات' : 'Expense Management',
        'حسابات الجملة': isAr ? 'حسابات الجملة' : 'Wholesale Ledger'
    };

    const finalTitle = translations[rawTitle] || rawTitle;
    const homeText = isAr ? 'الرئيسية' : 'Home';
    
    container.innerHTML = `
        <header class="main-brand-header">
            <div class="brand-group">
                <img src="/img/logo.png" alt="Bazzez" class="brand-logo">
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
                <!-- 🔄 Offline-First Sync Indicator -->
                <div id="sync-indicator" class="sync-indicator online" title="Sync Status">
                    <i class="fas fa-wifi"></i>
                    <span class="sync-count">0</span>
                </div>

                <a href="/launcher.html" class="header-nav-btn">
                    <i class="fas fa-th-large"></i>
                    <span>${homeText}</span>
                </a>
            </div>
        </header>
    `;

    // 🚀 Start Sync Status Polling
    initSyncMonitor();
});

function initSyncMonitor() {
    const indicator = document.getElementById('sync-indicator');
    const countSpan = indicator ? indicator.querySelector('.sync-count') : null;
    const icon = indicator ? indicator.querySelector('i') : null;

    if (!indicator) return;

    const updateSyncStatus = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const res = await fetch('/api/sync/status', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Status check failed');
            
            const status = await res.json();
            
            // Update UI
            if (status.isOnline) {
                indicator.classList.remove('offline');
                indicator.classList.add('online');
                icon.className = 'fas fa-wifi';
            } else {
                indicator.classList.remove('online');
                indicator.classList.add('offline');
                icon.className = 'fas fa-wifi-slash';
            }

            if (status.isSyncing) {
                indicator.classList.add('syncing');
            } else {
                indicator.classList.remove('syncing');
            }

            countSpan.textContent = status.pendingCount || 0;
            countSpan.style.display = status.pendingCount > 0 ? 'inline-block' : 'none';

        } catch (err) {
            console.error('Sync monitor error:', err);
            indicator.classList.add('offline');
            icon.className = 'fas fa-wifi-slash';
        }
    };

    // Poll every 10 seconds
    setInterval(updateSyncStatus, 10000);
    updateSyncStatus();
}
