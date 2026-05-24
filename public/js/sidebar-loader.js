/**
 * Hub Navigation Controller - Dynamic Injection (Luxury Refinement)
 */

(function() {
    const run = () => {
        try {
            const currentLang = localStorage.getItem('lang') || 'ar';
            const isAr = currentLang === 'ar';
            const isLauncher = window.location.pathname.includes('launcher.html');

            // Fix global page direction and language
            document.documentElement.lang = currentLang;
            document.documentElement.dir = isAr ? 'rtl' : 'ltr';

            const style = document.createElement('style');
            style.innerHTML = `
                /* ✨ Luxury Floating Home Button */
                .chic-home-btn {
                    position: fixed;
                    bottom: 30px;
                    ${isAr ? 'left: 30px' : 'right: 30px'};
                    width: 52px;
                    height: 52px;
                    background: #1e293b;
                    border-radius: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: ${isAr ? 'flex-end' : 'flex-start'};
                    padding: ${isAr ? '0 14px' : '0 14px'};
                    color: white;
                    text-decoration: none;
                    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2);
                    z-index: 99999;
                    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    overflow: hidden;
                    border: none !important;
                }

                .chic-home-btn:hover {
                    width: 150px;
                    background: #008060;
                    box-shadow: 0 15px 35px rgba(0, 128, 96, 0.3);
                    transform: translateY(-5px);
                    border-radius: 20px;
                    justify-content: center;
                    padding: 0;
                }

                .chic-home-btn i {
                    font-size: 1.25rem;
                    transition: all 0.4s ease;
                    z-index: 2;
                    margin: 0;
                }

                .chic-home-btn .btn-text {
                    position: absolute;
                    opacity: 0;
                    font-weight: 700;
                    font-size: 0.9rem;
                    white-space: nowrap;
                    transition: all 0.4s ease;
                    transform: translateX(${isAr ? '-20px' : '20px'});
                }

                .chic-home-btn:hover .btn-text {
                    opacity: 1;
                    transform: translateX(${isAr ? '25px' : '-25px'});
                }

                .chic-home-btn:hover i {
                    transform: translateX(${isAr ? '-45px' : '45px'});
                }
            `;
            document.head.appendChild(style);

            // Inject Chic Floating Home Button
            const isDashboard = window.location.pathname.includes('dashboard.html');
            const isCashier = window.location.pathname.includes('cashier.html');
            const isOrders = window.location.pathname.includes('manage_orders.html');
            const isProducts = window.location.pathname.includes('products.html');
            const isExpenses = window.location.pathname.includes('expenses.html');
            const isInventory = window.location.pathname.includes('inventory.html');
            const isSettings = window.location.pathname.includes('settings.html');
            const isDailyClosing = window.location.pathname.includes('daily_closing.html');
            const isMonthlyClosing = window.location.pathname.includes('monthly_closing.html');

            if (!isLauncher && !isDashboard && !isCashier && !isOrders && !isProducts && !isExpenses && !isInventory && !isSettings && !isDailyClosing && !isMonthlyClosing) {
                const homeBtn = document.createElement('a');
                homeBtn.href = '/launcher.html';
                homeBtn.className = 'chic-home-btn';
                homeBtn.innerHTML = `
                    <i class="fas fa-th-large"></i>
                    <span class="btn-text">${isAr ? 'الرئيسية' : 'Home Hub'}</span>
                `;
                document.body.appendChild(homeBtn);
            }
        } catch (err) {
            console.error('❌ Sidebar Loader Failed:', err);
            // Minimal Fallback: Just a basic link if everything fails
            const fallback = document.createElement('a');
            fallback.href = '/launcher.html';
            fallback.style.cssText = 'position:fixed; bottom:10px; right:10px; z-index:9999; background:#000; color:#fff; padding:5px 10px; border-radius:5px; text-decoration:none; font-size:12px;';
            fallback.textContent = 'Home';
            document.body.appendChild(fallback);
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', run);
    } else {
        run();
    }
})();
