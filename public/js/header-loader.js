document.addEventListener("DOMContentLoaded", () => {
  try {
    const container = document.getElementById("header-container");
    if (!container) return;

    // Get config from data attributes
    const rawTitle = container.getAttribute("data-title") || "Vortex POS";
    const icon = container.getAttribute("data-icon") || "fa-list-alt";

    // Auto-detect Language & Mode
    const currentLang = localStorage.getItem("lang") || "ar";
    const isAr = currentLang === "ar";
    const systemMode = localStorage.getItem("systemMode") || "retail";

    const translations = {
      "Admin Dashboard": isAr ? "لوحة التحكم الإدارية" : "Admin Dashboard",
      "إدارة المخزن": isAr
        ? systemMode === "restaurant"
          ? "إدارة الخامات"
          : "إدارة المخزن"
        : "Inventory Management",
      "إدارة الطلبات": isAr
        ? systemMode === "restaurant"
          ? "فواتير المطعم"
          : "إدارة الطلبات"
        : "Manage Orders",
      "إعدادات النظام": isAr ? "إعدادات النظام" : "System Settings",
      "إدارة المنتجات": isAr ? "إدارة المنتجات" : "Products Management",
      "إدارة الخصومات": isAr ? "إدارة الخصومات" : "Discounts Management",
      "إدارة المصروفات": isAr ? "إدارة المصروفات" : "Expense Management",
      "حسابات الجملة": isAr ? "حسابات الجملة" : "Wholesale Ledger",
    };

    const finalTitle = translations[rawTitle] || rawTitle;
    const homeText = isAr ? "الرئيسية" : "Home";

    container.innerHTML = `
            <header class="main-brand-header">
                <div class="brand-group">
                    <img src="/img/logo.png" alt="Bazzez" class="brand-logo" onerror="this.style.display='none'">
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
  } catch (err) {
    console.error("❌ Header Loader Failed:", err);
    const header = document.getElementById("header-container");
    if (header) {
      header.innerHTML = `<div style="padding:10px; background:#1e293b; color:#fff; display:flex; justify-content:space-between; align-items:center;">
                <strong>VORTEX POS</strong>
                <a href="/launcher.html" style="color:#fff; text-decoration:none; background:#008060; padding:5px 15px; border-radius:5px;">Home</a>
            </div>`;
    }
  }
});

async function initSyncMonitor() {
  const indicator = document.getElementById("sync-indicator");
  if (!indicator) return;

  const countSpan = indicator.querySelector(".sync-count");
  const icon = indicator.querySelector("i");

  const updateSyncStatus = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await fetch("/api/sync/status", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Status check failed");

      const status = await res.json();

      if (indicator && icon && countSpan) {
        if (status.isOnline) {
          indicator.classList.remove("offline", "has-pending");
          indicator.classList.add("online");
          icon.className = "fas fa-wifi";
        } else {
          indicator.classList.remove("online");
          indicator.classList.add("offline");
          icon.className = "fas fa-wifi-slash";

          if (status.pendingCount > 0 || status.failedCount > 0) {
            indicator.classList.add("has-pending");
          } else {
            indicator.classList.remove("has-pending");
          }
        }

        if (status.isSyncing) {
          indicator.classList.add("syncing");
        } else {
          indicator.classList.remove("syncing");
        }

        countSpan.textContent = status.pendingCount || 0;
        countSpan.style.display =
          status.pendingCount > 0 ? "inline-block" : "none";
      }
    } catch (err) {
      console.warn("📡 Sync Monitor Error:", err.message);
      if (indicator) {
        indicator.classList.remove("online", "has-pending");
        indicator.classList.add("offline");
        if (icon) icon.className = "fas fa-wifi-slash";
      }
    }
  };

  setInterval(updateSyncStatus, 10000);
  updateSyncStatus();
}
