const currentLang = localStorage.getItem('lang') || 'ar';
const isAr = currentLang === 'ar';

const t = {
    ar: {
        pageTitle: 'الطلبات',
        refresh: 'تحديث',
        all: 'الكل',
        paid: 'أونلاين',
        pending: 'نقدي',
        cancelled: 'ملغي',
        searchPlaceholder: 'ابحث برقم الطلب أو اسم العميل...',
        tableOrder: 'الطلب',
        tableDate: 'التاريخ',
        tableCustomer: 'العميل',
        tableTotal: 'الإجمالي',
        tablePayment: 'حالة الدفع',
        tableDelivery: 'التوصيل',
        tableStatus: 'الحالة',
        sidebarTitle: 'تفاصيل الطلب',
        sidebarItems: 'الأصناف',
        sidebarCustomer: 'بيانات العميل',
        sidebarPayment: 'حالة الدفع',
        sidebarSubtotal: 'المجموع:',
        sidebarDelivery: 'خدمة التوصيل:',
        sidebarDiscount: 'الخصم:',
        sidebarGrandTotal: 'الإجمالي النهائي:',
        printBtn: 'طباعة فاتورة',
        cancelBtn: 'إلغاء الطلب',
        cashCustomer: 'عميل نقدي',
        noPhone: 'بدون هاتف',
        noAddress: 'بدون عنوان',
        paidStatus: 'أونلاين',
        pendingStatus: 'نقدي',
        deliveryStatus: 'دليفري',
        inStoreStatus: 'في المحل',
        activeStatus: 'نشط',
        cancelledStatus: 'ملغي',
        loading: 'جاري التحميل...',
        errorLoading: '⚠️ فشل في تحميل التفاصيل',
        todayTotal: 'إجمالي الطلبات اليوم:',
        sidebarPrice: 'السعر:',
        sidebarVat: 'القيمة المضافة (14%):',
        sidebarTotal: 'الإجمالي النهائي:',
        prev: 'السابق',
        next: 'التالي',
        pageOf: 'صفحة {current} من {total}',
        exportExcel: 'تصدير الطلبات (Excel)',
        home: 'الرئيسية',
        card: 'فيزا / محفظة',
        cash: 'نقدي',
        shiftTotal: 'إجمالي طلبات وردية العمل:',
        onlineTotal: 'إجمالي الطلبات الأونلاين:',
        cashTotal: 'إجمالي الطلبات النقدي:',
        cancelledTotal: 'إجمالي الطلبات الملغاة:'
    },
    en: {
        pageTitle: 'Orders',
        refresh: 'Refresh',
        all: 'All',
        paid: 'Online',
        pending: 'Cash',
        cancelled: 'Cancelled',
        searchPlaceholder: 'Search by order ID or customer...',
        tableOrder: 'Order',
        tableDate: 'Date',
        tableCustomer: 'Customer',
        tableTotal: 'Total',
        tablePayment: 'Payment Status',
        tableDelivery: 'Delivery',
        tableStatus: 'Status',
        sidebarTitle: 'Order Details',
        sidebarItems: 'Items',
        sidebarCustomer: 'Customer Info',
        sidebarPayment: 'Payment Status',
        sidebarSubtotal: 'Subtotal:',
        sidebarDelivery: 'Delivery Fee:',
        sidebarDiscount: 'Discount:',
        sidebarGrandTotal: 'Grand Total:',
        printBtn: 'Print Receipt',
        cancelBtn: 'Cancel Order',
        cashCustomer: 'Cash Customer',
        noPhone: 'No Phone',
        noAddress: 'No Address',
        paidStatus: 'Online',
        pendingStatus: 'Cash',
        deliveryStatus: 'Delivery',
        inStoreStatus: 'In Store',
        activeStatus: 'Active',
        cancelledStatus: 'Cancelled',
        loading: 'Loading...',
        errorLoading: '⚠️ Failed to load details',
        todayTotal: "Today's Total Orders:",
        sidebarPrice: 'Price:',
        sidebarVat: 'VAT (14%):',
        sidebarTotal: 'Grand Total:',
        prev: 'Previous',
        next: 'Next',
        pageOf: 'Page {current} of {total}',
        exportExcel: 'Export Orders (Excel)',
        home: 'Home',
        card: 'Card / Wallet',
        cash: 'Cash',
        shiftTotal: 'Business Shift Total:',
        onlineTotal: 'Online Orders Total:',
        cashTotal: 'Cash Orders Total:',
        cancelledTotal: 'Cancelled Orders Total:'
    }
}[currentLang];

let activeFilter = 'all';
let currentOrders = [];
let appSettings = {};
let vatRate = 0.14; // Default fallback
let selectedDate = ""; // Will be fetched from settings
let currentPage = 1;
const ordersPerPage = 10;
let totalPages = 1;

document.addEventListener('DOMContentLoaded', async () => {
    applyTranslations();
    
    const dateInput = document.getElementById('date-filter');
    const todayStr = new Date().toLocaleDateString('en-CA');
    
    // Initial Fallback
    selectedDate = todayStr;
    if (dateInput) dateInput.value = todayStr;

    await fetchSettings(); // This will populate appSettings including active_business_date
    
    if (appSettings.active_business_date) {
        selectedDate = appSettings.active_business_date;
        if (dateInput) dateInput.value = selectedDate;
    }

    // Update Label to "Business Day Total"
    const label = document.getElementById('today-total-label');
    if (label) label.textContent = isAr ? 'إجمالي طلبات وردية العمل:' : 'Business Shift Total:';

    fetchOrders(1);

    // Tab Filtering
    document.querySelectorAll('.tab-item').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            activeFilter = tab.dataset.filter;
            fetchOrders(1);
        });
    });

    // Search Filtering
    const searchInput = document.getElementById('order-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            // 🌍 Auto-convert Arabic numerals to English in real-time
            const arabicMap = { '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9' };
            const originalValue = e.target.value;
            const normalizedValue = originalValue.replace(/[٠-٩]/g, d => arabicMap[d]);
            
            if (originalValue !== normalizedValue) {
                e.target.value = normalizedValue;
            }

            const searchIcon = document.querySelector('.search-container i');
            if (searchIcon) searchIcon.className = 'fas fa-spinner fa-spin';
            fetchOrders(1);
        });
    }

    // Date Filtering
    dateInput.addEventListener('change', (e) => {
        if (!e.target.value) {
            selectedDate = appSettings.active_business_date || new Date().toLocaleDateString('en-CA');
            dateInput.value = selectedDate;
        } else {
            selectedDate = e.target.value;
        }
        
        const clearBtn = document.getElementById('clear-date-btn');
        if (selectedDate && selectedDate !== appSettings.active_business_date) {
            clearBtn.style.display = 'block';
        } else {
            clearBtn.style.display = 'none';
        }
        fetchOrders(1);
    });

    // Clear Date Filter (Back to Current Shift)
    document.getElementById('clear-date-btn').addEventListener('click', () => {
        selectedDate = appSettings.active_business_date || new Date().toLocaleDateString('en-CA');
        dateInput.value = selectedDate;
        document.getElementById('clear-date-btn').style.display = 'none';
        fetchOrders(1);
    });

    // Pagination Buttons
    document.getElementById('prev-page').addEventListener('click', () => {
        if (currentPage > 1) fetchOrders(currentPage - 1);
    });

    document.getElementById('next-page').addEventListener('click', () => {
        if (currentPage < totalPages) fetchOrders(currentPage + 1);
    });

    // Close sidebar on overlay click
    document.getElementById('modal-overlay').addEventListener('click', closeSidebar);

    // 🏗️ Pre-position sidebar based on language
    const sidebar = document.getElementById('details-sidebar');
    if (isAr) {
        sidebar.style.left = '0';
        sidebar.style.right = 'auto';
        sidebar.style.transform = 'translateX(-100%)';
    } else {
        sidebar.style.right = '0';
        sidebar.style.left = 'auto';
        sidebar.style.transform = 'translateX(100%)';
    }
});

function applyTranslations() {
    const refreshBtn = document.getElementById('refresh-btn-text');
    if (refreshBtn) refreshBtn.innerHTML = `<i class="fas fa-sync-alt"></i> ${t.refresh}`;
    
    const searchInput = document.getElementById('order-search');
    if (searchInput) searchInput.placeholder = t.searchPlaceholder;
    
    const tabTexts = document.querySelectorAll('.tab-text');
    if (tabTexts.length >= 4) {
        tabTexts[0].textContent = t.all;
        tabTexts[1].textContent = t.paid;
        tabTexts[2].textContent = t.pending;
        tabTexts[3].textContent = t.cancelled;
    }

    // Translate table headers
    const headers = document.querySelectorAll('.orders-table thead th');
    if (headers.length >= 7) {
        headers[0].textContent = t.tableOrder;
        headers[1].textContent = t.tableDate;
        headers[2].textContent = t.tableCustomer;
        headers[3].textContent = t.tableTotal;
        headers[4].textContent = t.tablePayment;
        headers[5].textContent = t.tableDelivery;
        headers[6].textContent = t.tableStatus;
    }

    // Sidebar Titles & Labels
    const sideTitle = document.querySelector('.sidebar-header h3');
    if (sideTitle) sideTitle.innerHTML = `${t.sidebarTitle} <span id="side-order-id" style="color: var(--primary); font-family: monospace;"></span>`;
    
    const sideHeaders = document.querySelectorAll('.info-card h4');
    if (sideHeaders.length >= 3) {
        sideHeaders[0].innerHTML = `<i class="fas fa-utensils"></i> ${t.sidebarItems}`;
        sideHeaders[1].innerHTML = `<i class="fas fa-user-circle"></i> ${t.sidebarCustomer}`;
        sideHeaders[2].innerHTML = `<i class="fas fa-credit-card"></i> ${t.sidebarPayment}`;
    }

    const receiptLabels = document.querySelectorAll('.receipt-row span:first-child');
    if (receiptLabels.length >= 3) {
        receiptLabels[0].textContent = t.sidebarPrice;
        receiptLabels[1].textContent = t.sidebarVat;
        receiptLabels[2].textContent = t.sidebarDelivery;
        receiptLabels[3].textContent = t.sidebarDiscount;
    }
    const finalTotalLabel = document.querySelector('.total-label');
    if (finalTotalLabel) finalTotalLabel.textContent = t.sidebarTotal;
    
    const printBtn = document.getElementById('print-receipt-btn');
    if (printBtn) printBtn.innerHTML = `<i class="fas fa-print"></i> ${t.printBtn}`;
    
    const cancelBtn = document.getElementById('cancel-order-btn');
    if (cancelBtn) cancelBtn.innerHTML = `<i class="fas fa-ban"></i> ${t.cancelBtn}`;

    const excelBtn = document.querySelector('.btn-export-excel');
    if (excelBtn) excelBtn.innerHTML = `<i class="fas fa-file-excel"></i> ${t.exportExcel}`;

    // Update document and page titles
    document.title = `${t.pageTitle} - Vortex POS`;
    const pillTextEl = document.getElementById('pill-text');
    if (pillTextEl) pillTextEl.textContent = t.pageTitle;
    
    const homeBtnTextEl = document.getElementById('home-btn-text');
    if (homeBtnTextEl) homeBtnTextEl.textContent = t.home;

    const todayLabel = document.getElementById('today-total-label');
    if (todayLabel) todayLabel.textContent = t.shiftTotal;

    const vatLabel = document.querySelector('span[data-i18n="sidebarVat"]');
    if (vatLabel) {
        const percentage = (vatRate * 100).toFixed(0);
        vatLabel.textContent = isAr ? `القيمة المضافة (${percentage}%):` : `VAT (${percentage}%):`;
    }
}

function updateCounts() {
    // Use local date string (YYYY-MM-DD) to avoid timezone shifts
    const getLocalDate = (date) => {
        const d = new Date(date);
        if (isNaN(d.getTime())) return null;
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const todayStr = getLocalDate(new Date());
    const activeDate = selectedDate || todayStr;

    // Filter orders for the active date once for tab counts
    const ordersForDate = currentOrders.filter(o => {
        const orderDate = getLocalDate(o.createdAt || new Date());
        return orderDate === activeDate;
    });

    const counts = {
        all: ordersForDate.length,
        paid: ordersForDate.filter(o => o.payment_status === 'Paid' && o.isCancelled !== 'Yes').length,
        pending: ordersForDate.filter(o => o.payment_status === 'Pending' && o.isCancelled !== 'Yes').length,
        cancelled: ordersForDate.filter(o => o.isCancelled === 'Yes').length,
        todayGlobal: currentOrders.filter(o => getLocalDate(o.createdAt || new Date()) === todayStr).length
    };

    document.getElementById('count-all').textContent = counts.all;
    document.getElementById('count-paid').textContent = counts.paid;
    document.getElementById('count-pending').textContent = counts.pending;
    document.getElementById('count-cancelled').textContent = counts.cancelled;
    document.getElementById('today-count').textContent = counts.todayGlobal;
}

async function fetchSettings() {
    try {
        const response = await fetch('/api/settings');
        appSettings = await response.json();
        if (appSettings.vat_percent !== undefined) {
            vatRate = parseFloat(appSettings.vat_percent) / 100;
        }
    } catch (error) {
        console.error('❌ Error fetching settings:', error);
    }
}

async function fetchOrders(page = 1) {
    console.log("🚀 fetchOrders called for page:", page);
    const tbody = document.getElementById('orders-table-body');
    const searchInput = document.getElementById('order-search');
    const refreshIcon = document.querySelector('.btn-refresh-inline i');
    
    if (!tbody) return console.error("❌ tbody not found");
    
    currentPage = page;
    const query = searchInput ? searchInput.value.trim() : "";

    // 🏷️ Dynamic Label Update
    const label = document.getElementById('today-total-label');
    if (query !== "") {
        if (label) label.textContent = isAr ? 'نتائج البحث:' : 'Search Results:';
    } else {
        if (label) label.textContent = isAr ? 'إجمالي طلبات وردية العمل:' : 'Business Shift Total:';
    }

    // Reset counts to dash while loading
    const countIds = ['count-all', 'count-paid', 'count-pending', 'count-cancelled', 'today-count'];
    countIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '-';
    });

    // Show Skeleton Loader
    tbody.innerHTML = Array(4).fill(0).map(() => `
        <tr class="fade-in">
            <td><div class="skeleton" style="width: 40px; height: 20px;"></div></td>
            <td><div class="skeleton" style="width: 100px; height: 20px;"></div></td>
            <td><div class="skeleton" style="width: 150px; height: 20px;"></div></td>
            <td><div class="skeleton" style="width: 80px; height: 20px;"></div></td>
            <td><div class="skeleton" style="width: 70px; height: 20px; border-radius: 20px;"></div></td>
            <td><div class="skeleton" style="width: 70px; height: 20px; border-radius: 20px;"></div></td>
            <td><div class="skeleton" style="width: 70px; height: 20px; border-radius: 20px;"></div></td>
        </tr>
    `).join('');

    if (refreshIcon) refreshIcon.classList.add('fa-spin');

    try {
        const url = `/api/orders?page=${page}&limit=${ordersPerPage}&date=${selectedDate}&status=${activeFilter}&search=${encodeURIComponent(query)}`;
        console.log("📡 Fetching from:", url);
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        
        // 🔄 Hybrid Compatibility (Handle both old Array and new Object formats)
        let orders = [];
        let total = 0;
        let tPages = 1;
        let cPage = page;
        let statusCounts = {};

        if (Array.isArray(data)) {
            orders = data;
            // 📊 Local Filter Fallback
            let filtered = data;
            if (selectedDate) {
                filtered = data.filter(o => {
                    const d = o.createdAt ? new Date(o.createdAt) : new Date();
                    return d.toLocaleDateString('en-CA') === selectedDate;
                });
            }
            
            orders = filtered;
            total = filtered.length;
            tPages = 1;
            
            // Calculate status counts from the filtered set
            statusCounts = {
                all: filtered.length,
                paid: filtered.filter(o => o.payment_status === 'Paid' && o.isCancelled !== 'Yes').length,
                pending: filtered.filter(o => o.payment_status === 'Pending' && o.isCancelled !== 'Yes').length,
                cancelled: filtered.filter(o => o.isCancelled === 'Yes').length
            };
        } else if (data && data.orders) {
            orders = data.orders;
            total = data.total || 0;
            tPages = data.totalPages || 1;
            cPage = data.currentPage || page;
            statusCounts = data.counts || {};
        } else {
            throw new Error('Invalid data format from server');
        }

        currentOrders = orders;
        totalPages = tPages;
        
        renderOrders(orders);
        renderPagination(cPage, tPages);
        updateCounts(total, statusCounts);
    } catch (error) {
        console.error('❌ Error fetching orders:', error);
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:4rem; color:var(--error)">${t.errorLoading}</td></tr>`;
    } finally {
        if (refreshIcon) {
            setTimeout(() => refreshIcon.classList.remove('fa-spin'), 600);
        }
    }
}

function renderPagination(current, total) {
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    const pageInfo = document.getElementById('page-info');

    if (!prevBtn || !nextBtn || !pageInfo) return;

    prevBtn.disabled = current <= 1;
    nextBtn.disabled = current >= (total || 1);
    
    // 🌍 Translate & Flip Icons
    if (isAr) {
        prevBtn.innerHTML = `<i class="fas fa-chevron-right"></i> ${t.prev}`;
        nextBtn.innerHTML = `${t.next} <i class="fas fa-chevron-left"></i>`;
        pageInfo.textContent = t.pageOf.replace('{current}', current).replace('{total}', total || 1);
    } else {
        prevBtn.innerHTML = `<i class="fas fa-chevron-left"></i> ${t.prev}`;
        nextBtn.innerHTML = `${t.next} <i class="fas fa-chevron-right"></i>`;
        pageInfo.textContent = t.pageOf.replace('{current}', current).replace('{total}', total || 1);
    }
}

function updateCounts(totalCount, counts = {}) {
    const todayCountEl = document.getElementById('today-count');
    const todayLabelEl = document.getElementById('today-total-label');
    
    if (todayCountEl && todayLabelEl) {
        // 🚀 Dynamic Label & Value based on Filter
        let displayCount = totalCount;
        let labelText = t.shiftTotal;

        const f = activeFilter.toLowerCase();
        if (f === 'paid') {
            displayCount = counts.paid || 0;
            labelText = t.onlineTotal;
        } else if (f === 'pending') {
            displayCount = counts.pending || 0;
            labelText = t.cashTotal;
        } else if (f === 'cancelled') {
            displayCount = counts.cancelled || 0;
            labelText = t.cancelledTotal;
        }

        todayCountEl.textContent = displayCount;
        todayLabelEl.textContent = labelText;
    }

    if (counts.all !== undefined) {
        document.getElementById('count-all').textContent = counts.all;
        document.getElementById('count-paid').textContent = counts.paid;
        document.getElementById('count-pending').textContent = counts.pending;
        document.getElementById('count-cancelled').textContent = counts.cancelled;
    }
}

async function exportOrdersToExcel() {
    try {
        Swal.fire({
            title: isAr ? 'جاري تجهيز تقرير الطلبات...' : 'Preparing Orders Report...',
            didOpen: () => { Swal.showLoading(); },
            allowOutsideClick: false,
            showConfirmButton: false
        });

        // Fetch orders matching current filters
        const query = document.getElementById('order-search').value;
        const url = `/api/orders?nopaging=true&date=${selectedDate}&status=${activeFilter}&search=${query}`;
        
        const response = await fetch(url);
        let orders = await response.json();

        // 🔄 Hybrid Local Filter (Fallback if backend doesn't filter yet)
        if (Array.isArray(orders)) {
            if (selectedDate) {
                orders = orders.filter(o => {
                    const d = o.createdAt ? new Date(o.createdAt) : new Date();
                    return d.toLocaleDateString('en-CA') === selectedDate;
                });
            }
            if (activeFilter !== 'all') {
                if (activeFilter === 'cancelled') {
                    orders = orders.filter(o => o.isCancelled === 'Yes');
                } else {
                    orders = orders.filter(o => o.payment_status === activeFilter && o.isCancelled !== 'Yes');
                }
            }
            if (query) {
                const q = query.toLowerCase();
                orders = orders.filter(o => 
                    o.id.toString().includes(q) || 
                    (o.customerName && o.customerName.toLowerCase().includes(q))
                );
            }
        }

        if (!orders || orders.length === 0) {
            Swal.fire({ icon: 'warning', title: isAr ? 'لا توجد بيانات لتصديرها' : 'No data to export' });
            return;
        }

        const excelData = orders.map(o => {
            const date = o.createdAt ? new Date(o.createdAt) : (o.businessDate ? new Date(o.businessDate) : new Date());
            const serial = o.dailySerial || o.id;
            return {
                [isAr ? 'رقم الطلب' : 'Order #']: serial,
                [isAr ? 'كود النظام' : 'System ID']: o.id,
                [isAr ? 'التاريخ' : 'Date']: date.toLocaleDateString('en-CA'),
                [isAr ? 'الوقت' : 'Time']: date.toLocaleTimeString('en-US', { hour12: false }),
                [isAr ? 'العميل' : 'Customer']: o.customerName || (isAr ? 'عميل نقدي' : 'Cash Customer'),
                [isAr ? 'الهاتف' : 'Phone']: o.customerPhone || '-',
                [isAr ? 'الإجمالي' : 'Total']: parseFloat(o.orderTotal).toFixed(2),
                [isAr ? 'حالة الدفع' : 'Payment Status']: o.payment_status,
                [isAr ? 'طريقة الدفع' : 'Payment Method']: o.payment_method || '-',
                [isAr ? 'الحالة' : 'Status']: o.isCancelled === 'Yes' ? (isAr ? 'ملغي' : 'Cancelled') : (isAr ? 'نشط' : 'Active')
            };
        });

        const ws = XLSX.utils.json_to_sheet(excelData);
        ws['!cols'] = [{wch: 12}, {wch: 15}, {wch: 12}, {wch: 25}, {wch: 15}, {wch: 12}, {wch: 15}, {wch: 15}, {wch: 12}];

        const wb = XLSX.utils.book_new();
        if (!wb.Workbook) wb.Workbook = {};
        if (!wb.Workbook.Views) wb.Workbook.Views = [];
        wb.Workbook.Views[0] = { RTL: isAr };

        XLSX.utils.book_append_sheet(wb, ws, isAr ? "الطلبات" : "Orders");
        XLSX.writeFile(wb, `vortex_orders_${selectedDate || 'all'}.xlsx`);
        
        Swal.close();
    } catch (err) {
        console.error("Excel Error:", err);
        Swal.fire({ icon: 'error', title: 'Excel Error', text: err.message });
    }
}


function renderOrders(orders = []) {
    const tbody = document.getElementById('orders-table-body');
    const refreshIcon = document.querySelector('.btn-refresh-inline i');
    const searchIcon = document.querySelector('.search-container i');
    
    if (refreshIcon) refreshIcon.classList.remove('fa-spin');
    if (searchIcon) searchIcon.className = 'fas fa-search';

    tbody.innerHTML = '';

    if (!orders || orders.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 4rem; color: var(--text-muted);">
                    <i class="fas fa-search" style="font-size: 3rem; opacity: 0.1; display: block; margin-bottom: 1rem;"></i>
                    ${isAr ? 'لا توجد طلبات تطابق بحثك حالياً' : 'No orders found matching your criteria'}
                </td>
            </tr>
        `;
        return;
    }

    // 🚀 Only sort by ID if we are NOT searching. If searching, preserve server's rank.
    const searchVal = document.getElementById('order-search')?.value.trim();
    const ordersToRender = (searchVal && searchVal !== "") ? [...orders] : [...orders].sort((a, b) => (b.id || 0) - (a.id || 0));

    ordersToRender.forEach((order, index) => {
        const tr = document.createElement('tr');
        tr.className = 'fade-in';
        tr.style.animationDelay = `${index * 0.05}s`;
        
        const displaySerial = order.dailySerial || order.id;
        
        tr.onclick = () => openSidebar(order, displaySerial);

        const createdAt = order.createdAt ? new Date(order.createdAt) : (order.businessDate ? new Date(order.businessDate) : new Date());
        const dateMain = createdAt.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const dateSub = createdAt.toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' });

        const isCancelled = order.isCancelled === 'Yes';
        const isPaid = order.payment_status === 'Paid';
        const isDelivery = parseFloat(order.deliveryPrice) > 0;

        tr.innerHTML = `
            <td><span class="order-id">#${displaySerial}</span></td>
            <td>
                <div class="order-date-cell">
                    <span class="date-main">${dateMain}</span>
                    <span class="date-sub">${dateSub}</span>
                </div>
            </td>
            <td>
                <div class="customer-info">
                    <div style="font-weight:600">${order.customerName || t.cashCustomer}</div>
                    <div style="font-size:0.75rem; color:#6d7175">${order.customerPhone || ''}</div>
                </div>
            </td>
            <td style="text-align: center;">
                <span style="font-weight:700; font-size: 1.1rem; color: var(--text-main);">${parseFloat(order.orderTotal).toFixed(2)}</span>
                <small style="font-size: 0.7rem; opacity: 0.6; font-weight: 600;">EGP</small>
            </td>
            <td>
                <span class="status-badge status-completed">
                    <i class="fas fa-check-circle"></i>
                    ${isPaid ? t.paidStatus : t.pendingStatus}
                </span>
            </td>
            <td>
                <span class="status-badge ${isDelivery ? 'status-pending' : 'status-completed'}">
                    <i class="fas ${isDelivery ? 'fa-truck' : 'fa-store'}"></i>
                    ${isDelivery ? t.deliveryStatus : t.inStoreStatus}
                </span>
            </td>
            <td>
                <span class="status-badge ${isCancelled ? 'status-cancelled' : 'status-completed'}">
                    <i class="fas ${isCancelled ? 'fa-times-circle' : 'fa-play-circle'}"></i>
                    ${isCancelled ? t.cancelledStatus : t.activeStatus}
                </span>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openSidebar(order, dailySerial = null) {
    const displayId = dailySerial || order.id;
    document.getElementById('side-order-id').textContent = `#${displayId}`;
    document.getElementById('side-customer-name').textContent = order.customerName || t.cashCustomer;
    document.getElementById('side-customer-phone').textContent = order.customerPhone || t.noPhone;
    document.getElementById('side-customer-address').textContent = order.customerAddress || t.noAddress;
    
    const isPaid = order.payment_status === 'Paid';
    const rawMethod = (order.payment_method || (isPaid ? 'Card' : 'Cash')).toLowerCase();
    
    // Friendly display for payment methods
    let displayMethod = order.payment_method || (isPaid ? t.card : t.cash);
    if (rawMethod.includes('vcash') || rawMethod.includes('vodafone')) displayMethod = isAr ? 'فودافون كاش' : 'Vodafone Cash';
    else if (rawMethod.includes('instapay')) displayMethod = isAr ? 'إنستا باي' : 'Instapay';
    else if (rawMethod.includes('card') || rawMethod.includes('wallet') || rawMethod.includes('visa')) displayMethod = t.card;
    else if (rawMethod.includes('cash')) displayMethod = t.cash;

    const statusBadge = `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem;">
            <span class="status-badge status-completed">
                <i class="fas fa-check-circle"></i>
                ${isPaid ? t.paidStatus : t.pendingStatus}
            </span>
            ${isPaid ? `<span style="font-size: 0.75rem; color: #6d7175; font-weight: 600;">
                <i class="fas fa-wallet" style="font-size: 0.7rem; margin-left: 2px;"></i> ${displayMethod}
            </span>` : ''}
        </div>`;
    document.getElementById('side-payment-status').innerHTML = statusBadge;

    const total = parseFloat(order.orderTotal || 0);
    const delivery = parseFloat(order.deliveryPrice || 0);
    const discount = parseFloat(order.discountAmount || 0);
    const subtotalWithVat = total - delivery + discount;
    
    // Calculate Base Price and VAT from the subtotal using the live vatRate
    // Base * (1 + vatRate) = SubtotalWithVat => Base = SubtotalWithVat / (1 + vatRate)
    const basePrice = subtotalWithVat / (1 + vatRate);
    const vatAmount = subtotalWithVat - basePrice;

    document.getElementById('side-subtotal').innerHTML = `<span style="color: var(--text-main);">${basePrice.toFixed(2)}</span> <small style="font-size: 0.7rem; opacity: 0.7;">EGP</small>`;
    
    // 💡 Only show VAT row if VAT is > 0
    const vatRow = document.getElementById('side-vat').parentElement;
    if (vatRate > 0) {
        vatRow.style.display = 'flex';
        document.getElementById('side-vat').innerHTML = `<span style="color: var(--text-main);">${vatAmount.toFixed(2)}</span> <small style="font-size: 0.7rem; opacity: 0.7;">EGP</small>`;
    } else {
        vatRow.style.display = 'none';
    }

    document.getElementById('side-delivery').innerHTML = `<span style="color: var(--text-main);">${delivery.toFixed(2)}</span> <small style="font-size: 0.7rem; opacity: 0.7;">EGP</small>`;
    
    const sideDiscountRow = document.getElementById('side-discount').parentElement;
    if (discount > 0) {
        sideDiscountRow.style.display = 'flex';
        document.getElementById('side-discount').innerHTML = `<span style="color: #ef4444;">-${discount.toFixed(2)}</span> <small style="font-size: 0.7rem; opacity: 0.7;">EGP</small>`;
    } else {
        sideDiscountRow.style.display = 'none';
    }
    
    document.getElementById('side-total').innerHTML = `<span>${total.toFixed(2)}</span> <small style="font-size: 0.8rem; opacity: 0.9;">EGP</small>`;

    // Load Items
    loadOrderItems(order.orderDetails);

    // Setup Actions
    const cancelBtn = document.getElementById('cancel-order-btn');
    if (order.isCancelled === 'Yes') {
        cancelBtn.style.display = 'none';
    } else {
        cancelBtn.style.display = 'block';
        cancelBtn.onclick = () => cancelOrder(order.id);
    }

    document.getElementById('print-receipt-btn').onclick = () => printReceipt(order.id);

    const sidebar = document.getElementById('details-sidebar');
    sidebar.style.display = 'flex';
    
    setTimeout(() => {
        sidebar.classList.add('open');
        sidebar.style.transform = 'translateX(0)';
    }, 10);
    
    document.getElementById('modal-overlay').style.display = 'block';
}

function closeSidebar() {
    const sidebar = document.getElementById('details-sidebar');
    // Slide back to the side it came from
    sidebar.style.transform = isAr ? 'translateX(-100%)' : 'translateX(100%)';
    setTimeout(() => {
        sidebar.classList.remove('open');
        sidebar.style.display = 'none';
        document.getElementById('modal-overlay').style.display = 'none';
    }, 300);
}

async function loadOrderItems(orderDetails) {
    const list = document.getElementById('side-items-list');
    list.innerHTML = t.loading;

    try {
        const response = await fetch('/api/orders/format-details', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderDetails })
        });
        const data = await response.json();
        
        list.innerHTML = '';
        data.formatted.forEach(item => {
            const div = document.createElement('div');
            div.className = 'item-row';
            div.style.flexDirection = 'column';
            div.style.alignItems = 'stretch';
            div.style.padding = '1rem 0';
            
            // Generate list of comments/addons with prices if any
            let commentsHtml = '';
            const allComments = [...item.comments, ...item.manualComments];
            if (allComments.length > 0) {
                commentsHtml = '<div style="margin-top: 0.5rem; padding-right: 2.5rem;">';
                allComments.forEach(c => {
                    const cPrice = parseFloat(c.price || 0);
                    const color = cPrice < 0 ? '#ef4444' : (cPrice > 0 ? '#008060' : '#6d7175');
                    const priceLabel = cPrice !== 0 ? ` (${cPrice > 0 ? '+' : ''}${cPrice})` : '';
                    commentsHtml += `
                        <div style="font-size: 0.8rem; color: ${color}; margin-bottom: 2px; display: flex; align-items: center; gap: 0.4rem;">
                            <i class="fas fa-caret-left" style="font-size: 0.6rem; opacity: 0.5;"></i>
                            <span>${c.text}${priceLabel}</span>
                        </div>`;
                });
                commentsHtml += '</div>';
            }
            
            div.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                    <div class="item-main">
                        <div class="item-qty">${item.quantity}</div>
                        <div style="font-weight:700; color: var(--text-main); font-size: 1rem;">${item.name}</div>
                    </div>
                    <span style="font-weight:800; color: var(--text-main); font-size: 1.05rem;">
                        ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                        <small style="font-size: 0.7rem; opacity: 0.6; font-weight: 600;">EGP</small>
                    </span>
                </div>
                ${commentsHtml}
            `;
            list.appendChild(div);
        });
    } catch (error) {
        list.innerHTML = t.errorLoading;
    }
}

async function cancelOrder(orderId) {
    const result = await Swal.fire({
        title: isAr ? 'هل أنت متأكد؟' : 'Are you sure?',
        text: isAr ? "لن تتمكن من التراجع عن إلغاء هذا الطلب!" : "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: isAr ? 'نعم، إلغاء الطلب' : 'Yes, cancel it!',
        cancelButtonText: isAr ? 'تراجع' : 'Cancel'
    });

    if (result.isConfirmed) {
        try {
            const response = await fetch(`/api/orders/${orderId}/cancel`, { method: 'PUT' });
            if (response.ok) {
                Swal.fire(
                    isAr ? 'تم الإلغاء!' : 'Cancelled!',
                    isAr ? 'تم إلغاء الطلب بنجاح.' : 'Your order has been cancelled.',
                    'success'
                );
                fetchOrders(currentPage);
                closeSidebar();
            }
        } catch (error) {
            Swal.fire(
                isAr ? 'خطأ' : 'Error',
                isAr ? 'فشل في إلغاء الطلب' : 'Failed to cancel the order',
                'error'
            );
        }
    }
}

async function printReceipt(orderId) {
    const order = currentOrders.find(o => o.id == orderId);
    if (!order) return;

    try {
        // Fetch formatted details
        const response = await fetch('/api/orders/format-details', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderDetails: order.orderDetails })
        });
        const data = await response.json();
        
        const receiptData = {
            id: order.id,
            customerName: order.customerName,
            customerPhone: order.customerPhone,
            customerAddress: order.customerAddress,
            orderDate: (() => {
                const d = new Date(order.createdAt);
                const day = d.getDate();
                const month = d.getMonth() + 1;
                let hours = d.getHours();
                const minutes = String(d.getMinutes()).padStart(2, '0');
                const ampm = hours >= 12 ? 'PM' : 'AM';
                hours = hours % 12 || 12;
                return `${day}/${month} ${hours}:${minutes} ${ampm}`;
            })(),
            deliveryPrice: order.deliveryPrice,
            orderTotal: order.orderTotal,
            orderDetails: data.formatted,
            discount: order.discountAmount || 0
        };

        localStorage.setItem("receiptData", JSON.stringify(receiptData));
        window.open('/receipt.html', '_blank');
    } catch (error) {
        console.error("❌ Error printing receipt:", error);
        Swal.fire(
            isAr ? 'خطأ' : 'Error', 
            isAr ? 'فشل في تجهيز الفاتورة' : 'Failed to prepare receipt', 
            'error'
        );
    }
}