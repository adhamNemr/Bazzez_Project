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
                    data: [0, 0, 0, 0, 0, 0, 0, 0], // Start empty
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
                    y: { 
                        grid: { color: '#f1f2f3', drawBorder: false }, 
                        ticks: { 
                            font: { size: 11, weight: 500 }, 
                            color: '#6d7175',
                            callback: function(value) { return value + (isAr ? ' ج.م' : ' LE'); }
                        } 
                    }
                }
            }
        });
    }

    // ✅ Global Chart Storage
    let realChartData = {
        today: new Array(12).fill(0),
        yesterday: new Array(12).fill(0),
        week: { labels: [], data: [] }
    };
    const hourlyLabels = ['00:00', '02:00', '04:00', '06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];

    // ✅ Fetch Real Data
    const loadDashboardData = async () => {
        try {
            const response = await fetch('/api/dashboard-data', {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to fetch stats');
            const data = await response.json();

            console.log("📊 Received Dashboard Data:", data);
            realChartData = data.charts;

            // Update UI with real data
            animateValue("orderCount", 0, data.totalOrders || 0, 800);
            animateValue("revenueCount", 0, data.totalRevenue || 0, 1000, ` ${t.currency}`);
            animateValue("avgOrderValue", 0, data.avgOrderValue || 0, 1200, ` ${t.currency}`);
            animateValue("activeCustomers", 0, data.activeCustomers || 0, 1400);

            injectTopProducts(data.topProducts || []);
            injectActivityStream(data.recentActivity || []);

            // Initial Chart (Today)
            updateDashboardChart('today');

        } catch (error) {
            console.error("❌ Data load error:", error);
        }
    };

    function updateDashboardChart(period) {
        const chart = Chart.getChart('salesPulseChart');
        if (!chart) return;

        if (period === 'week') {
            chart.data.labels = realChartData.week.labels;
            chart.data.datasets[0].data = realChartData.week.data;
        } else {
            chart.data.labels = hourlyLabels;
            chart.data.datasets[0].data = realChartData[period];
        }
        chart.update();
    }

    const injectTopProducts = (products) => {
        const container = document.getElementById("topProductsList");
        if (!container) return;
        
        if (products.length === 0) {
            container.innerHTML = `<p style="text-align:center; padding:20px; color:#6d7175;">${isAr ? 'لا توجد بيانات اليوم' : 'No data today'}</p>`;
            return;
        }

        const maxSales = Math.max(...products.map(p => p.sales), 1);

        container.innerHTML = products.map((p, i) => `
            <div class="product-item">
                <div class="product-rank">${i + 1}</div>
                <span class="product-name">${p.name}</span>
                <div class="product-bar-bg">
                    <div class="product-bar-fill" style="width: ${(p.sales / maxSales) * 100}%"></div>
                </div>
                <div class="product-sales">
                    <span class="product-sales-num">${p.sales} ${t.sold}</span>
                </div>
            </div>
        `).join('');
    };

    const injectActivityStream = (activities) => {
        const container = document.getElementById("recentActivityStream");
        if (!container) return;

        if (activities.length === 0) {
            container.innerHTML = `<p style="text-align:center; padding:20px; color:#6d7175;">${isAr ? 'لا توجد عمليات بعد' : 'No activity yet'}</p>`;
            return;
        }

        container.innerHTML = activities.map(a => {
            const time = new Date(a.createdAt).toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' });
            return `
                <div class="activity-item">
                    <div class="activity-marker"></div>
                    <div class="activity-meta">
                        <span class="activity-customer">${a.customerName || (isAr ? 'عميل نقدي' : 'Cash Customer')}</span>
                        <span class="activity-time">#${a.id} • ${time}</span>
                    </div>
                    <span class="activity-amount">${parseFloat(a.orderTotal).toFixed(2)} ${t.currency}</span>
                </div>
            `;
        }).join('');
    };

    const injectStockAlerts = async () => {
        const container = document.getElementById("stockAlerts");
        if (!container) return;

        try {
            const response = await fetch('/api/analytics/low-stock', {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await response.json();
            
            if (!data.success || data.lowStock.length === 0) {
                container.innerHTML = "";
                return;
            }

            const alertsHTML = data.lowStock.slice(0, 3).map(a => `
                <div class="panel-alert-item critical">
                    <div class="alert-icon-wrap"><i class="fas fa-circle-exclamation"></i></div>
                    <div class="alert-body">
                        <div class="alert-name">${a.name}</div>
                        <div class="alert-details">
                            <span class="alert-qty">${isAr ? 'المتبقي:' : 'Remaining:'} <strong>${a.quantity}</strong></span>
                            <span class="alert-min">${isAr ? 'الحد الأدنى:' : 'Min:'} ${a.min}</span>
                        </div>
                    </div>
                    <div class="alert-actions">
                        <a href="/inventory.html" class="alert-restock-btn"><i class="fas fa-plus"></i> ${isAr ? 'تعبئة' : 'Restock'}</a>
                    </div>
                </div>
            `).join('');

            container.innerHTML = `
                <div class="panel-alerts-header">
                    <span><i class="fas fa-boxes-stacked"></i> ${isAr ? 'تنبيهات المخزون' : 'Stock Alerts'} <span class="alerts-count-badge">${data.lowStock.length}</span></span>
                    <a href="/inventory.html" class="section-link">${isAr ? 'إدارة المخزن' : 'Manage Inventory'} <i class="fas fa-arrow-left"></i></a>
                </div>
                <div class="panel-alerts-list">${alertsHTML}</div>
            `;
        } catch (error) {
            console.error("❌ Stock alerts error:", error);
        }
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
    document.querySelectorAll('.time-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateDashboardChart(btn.dataset.period);
        });
    });
});