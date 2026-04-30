document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("token");
    const userRole = localStorage.getItem("role");
    const currentLang = localStorage.getItem("lang") || "ar";
    const isAr = currentLang === "ar";

    const translations = {
        ar: {
            sold: 'مباع',
            healthy: 'سليم',
            issues: 'توجد مشاكل',
            syncing: 'جاري المزامنة...',
            minsAgo: 'منذ دقائق',
            initializing: 'جاري التشغيل...',
            currency: 'ج.م'
        },
        en: {
            sold: 'Sold',
            healthy: 'Healthy',
            issues: 'Issues Detected',
            syncing: 'Syncing...',
            minsAgo: 'mins ago',
            initializing: 'Initializing...',
            currency: 'L.E'
        }
    };
    const t = translations[currentLang];

    // ✅ Security Check
    if (userRole !== "manager") {
        window.location.href = "/cashier.html";
        return;
    }

    // ✅ Initialize Chart.js (Shopify Emerald Theme)
    const ctxElement = document.getElementById('salesPulseChart');
    if (ctxElement) {
        const ctx = ctxElement.getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, 'rgba(0, 128, 96, 0.1)');
        gradient.addColorStop(1, 'rgba(0, 128, 96, 0)');

        const salesChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'],
                datasets: [{
                    label: isAr ? 'إجمالي المبيعات' : 'Gross Sales',
                    data: [420, 650, 1200, 2800, 3400, 3100, 4200, 3800],
                    borderColor: '#008060',
                    borderWidth: 2.5,
                    fill: true,
                    backgroundColor: gradient,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    pointHoverBackgroundColor: '#008060',
                    pointHoverBorderColor: '#ffffff',
                    pointHoverBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#202223',
                        padding: 10,
                        titleFont: { size: 12, weight: '600' },
                        bodyFont: { size: 12 },
                        displayColors: false
                    }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 11, weight: 500 }, color: '#6d7175' } },
                    y: { grid: { color: '#f1f2f3', drawBorder: false }, ticks: { font: { size: 11, weight: 500 }, color: '#6d7175' } }
                }
            }
        });
    }

    // ✅ Fetch Real Data
    const loadDashboardData = async () => {
        try {
            const response = await fetch('/api/dashboard-data', {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to fetch stats');
            const data = await response.json();

            // Update UI with counting animation
            animateValue("orderCount", 0, data.totalOrders || 0, 800);
            animateValue("revenueCount", 0, (data.totalOrders || 0) * 145, 1000, ` ${t.currency}`);
            animateValue("avgOrderValue", 0, 145, 1200, ` ${t.currency}`);
            animateValue("activeCustomers", 0, Math.floor((data.totalOrders || 0) * 0.4), 1400);

            injectTopProducts();
            injectActivityStream();

        } catch (error) {
            console.error("❌ Data load error:", error);
        }
    };

    const injectTopProducts = () => {
        const container = document.getElementById("topProductsList");
        if (!container) return;
        const mockProducts = [
            { name: "Super Vortex Burger", sales: 840, share: 100 },
            { name: "Cheese Master Fries", sales: 620, share: 74 },
            { name: "Vintage Cola 500ml", sales: 410, share: 49 },
            { name: "Crunchy Chicken Strip", sales: 210, share: 25 }
        ];

        container.innerHTML = mockProducts.map((p, i) => `
            <div class="product-item">
                <div class="product-rank">${i + 1}</div>
                <span class="product-name">${p.name}</span>
                <div class="product-bar-bg">
                    <div class="product-bar-fill" style="width: ${p.share}%"></div>
                </div>
                <div class="product-sales">
                    <span class="product-sales-num">${p.sales} ${t.sold}</span>
                </div>
            </div>
        `).join('');
    };

    const injectStockAlerts = () => {
        const container = document.getElementById("stockAlerts");
        if (!container) return;
        const mockAlerts = [
            { name: isAr ? "كوكا كولا 500مل" : "Cola 500ml", qty: 3, min: 10, unit: isAr ? "قطعة" : "pcs", critical: true },
            { name: isAr ? "صلصة الشيف" : "Chef Sauce", qty: 1, min: 5, unit: isAr ? "زجاجة" : "bottles", critical: true },
            { name: isAr ? "خبز الهامبرغر" : "Burger Buns", qty: 8, min: 20, unit: isAr ? "كيس" : "bags", critical: false }
        ].sort((a, b) => b.critical - a.critical); // Critical first
        if (mockAlerts.length === 0) return;

        const alertsHTML = mockAlerts.map(a => `
            <div class="panel-alert-item ${a.critical ? 'critical' : ''}">
                <div class="alert-icon-wrap">
                    <i class="fas fa-${a.critical ? 'circle-exclamation' : 'triangle-exclamation'}"></i>
                </div>
                <div class="alert-body">
                    <div class="alert-name">${a.name}</div>
                    <div class="alert-details">
                        <span class="alert-qty">${isAr ? 'المتبقي:' : 'Remaining:'} <strong>${a.qty} ${a.unit}</strong></span>
                        <span class="alert-min">${isAr ? 'الحد الأدنى:' : 'Min:'} ${a.min} ${a.unit}</span>
                    </div>
                </div>
                <div class="alert-actions">
                    <a href="/products.html" class="alert-restock-btn">
                        <i class="fas fa-plus"></i> ${isAr ? 'تعبئة مخزون' : 'Restock'}
                    </a>
                </div>
            </div>
        `).join('');

        container.innerHTML = `
            <div class="panel-alerts-header">
                <span><i class="fas fa-boxes-stacked"></i> ${isAr ? 'تنبيهات المخزون' : 'Stock Alerts'} <span class="alerts-count-badge">${mockAlerts.length}</span></span>
                <a href="/products.html" class="section-link">${isAr ? 'إدارة المخزن' : 'Manage Inventory'} <i class="fas fa-arrow-left"></i></a>
            </div>
            <div class="panel-alerts-list">${alertsHTML}</div>
        `;
    };

    const injectActivityStream = () => {
        const container = document.getElementById("recentActivityStream");
        if (!container) return;
        const mockActivities = [
            { id: "1048", customer: "Adham Nemr", time: isAr ? "منذ دقيقتين" : "2 mins ago", amount: "240.00" },
            { id: "1047", customer: isAr ? "عميل نقدي" : "Walk-in Customer", time: isAr ? "منذ 12 دقيقة" : "12 mins ago", amount: "125.50" },
            { id: "1046", customer: "Sarah Ahmed", time: isAr ? "منذ 45 دقيقة" : "45 mins ago", amount: "89.00" }
        ];

        container.innerHTML = mockActivities.map(a => `
            <div class="activity-item">
                <div class="activity-marker"></div>
                <div class="activity-meta">
                    <span class="activity-customer">${a.customer}</span>
                    <span class="activity-time">#${a.id} • ${a.time}</span>
                </div>
                <span class="activity-amount">${a.amount} ${t.currency}</span>
            </div>
        `).join('');
    };

    const checkHealth = async () => {
        const label = document.getElementById("systemStatusLabel");
        const circle = document.getElementById("systemHealthCircle");
        if (!label || !circle) return;
        try {
            const response = await fetch('/api/system-status');
            const health = await response.json();
            const isHealthy = health.systemStatus.includes('✅');
            label.textContent = isHealthy ? t.healthy : t.issues;
            circle.style.backgroundColor = isHealthy ? '#008060' : '#d72c0d';
        } catch (error) {
            label.textContent = t.syncing;
        }
    };

    function animateValue(id, start, end, duration, suffix = "") {
        const obj = document.getElementById(id);
        if (!obj) return;
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const value = Math.floor(progress * (end - start) + start);
            obj.innerHTML = value.toLocaleString() + suffix;
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            localStorage.removeItem("token");
            localStorage.removeItem("role");
            window.location.href = "/index.html";
        });
    }

    const restartBtn = document.getElementById("restartServerBtn");
    if (restartBtn) {
        restartBtn.addEventListener("click", async () => {
            restartBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${t.initializing}`;
            restartBtn.disabled = true;
            try {
                await fetch("/api/restart-server", { method: "POST" });
                setTimeout(() => { window.location.reload(); }, 3000);
            } catch (error) {
                restartBtn.disabled = false;
            }
        });
    }

    loadDashboardData();
    checkHealth();
    injectStockAlerts();

    // ⏱️ Time Toggle Interactivity
    const chartDataSets = {
        today:     [420, 650, 1200, 2800, 3400, 3100, 4200, 3800],
        yesterday: [300, 500, 900,  2100, 2700, 2500, 3100, 2900],
        week:      [3200, 4100, 5500, 6800, 7200, 6900, 8100, 7500]
    };
    document.querySelectorAll('.time-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const chart = Chart.getChart('salesPulseChart');
            if (chart) {
                chart.data.datasets[0].data = chartDataSets[btn.dataset.period];
                chart.update('active');
            }
        });
    });
});