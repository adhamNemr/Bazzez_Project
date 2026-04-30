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
        sidebarTotal: 'الإجمالي النهائي:'
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
        sidebarTotal: 'Grand Total:'
    }
}[currentLang];

let activeFilter = 'all';
let currentOrders = [];
let selectedDate = new Date().toISOString().split('T')[0]; // Default to today

document.addEventListener('DOMContentLoaded', () => {
    applyTranslations();
    
    // Set default date in picker
    const dateInput = document.getElementById('date-filter');
    dateInput.value = selectedDate;

    fetchOrders();

    // Tab Filtering
    document.querySelectorAll('.tab-item').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            activeFilter = tab.dataset.filter;
            filterAndRender();
        });
    });

    // Search Filtering
    document.getElementById('order-search').addEventListener('input', (e) => {
        filterAndRender(e.target.value);
    });

    // Date Filtering
    dateInput.addEventListener('change', (e) => {
        selectedDate = e.target.value;
        const clearBtn = document.getElementById('clear-date-btn');
        if (selectedDate) {
            clearBtn.style.display = 'block';
        } else {
            clearBtn.style.display = 'none';
        }
        updateCounts(); // 🔢 Sync tab counts
        filterAndRender();
    });

    // Clear Date Filter (Back to Today)
    document.getElementById('clear-date-btn').addEventListener('click', () => {
        selectedDate = new Date().toISOString().split('T')[0];
        dateInput.value = selectedDate;
        document.getElementById('clear-date-btn').style.display = 'none';
        updateCounts(); // 🔢 Sync tab counts
        filterAndRender();
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
    }
    const finalTotalLabel = document.querySelector('.total-label');
    if (finalTotalLabel) finalTotalLabel.textContent = t.sidebarTotal;
    
    const printBtn = document.getElementById('print-receipt-btn');
    if (printBtn) printBtn.innerHTML = `<i class="fas fa-print"></i> ${t.printBtn}`;
    
    const cancelBtn = document.getElementById('cancel-order-btn');
    if (cancelBtn) cancelBtn.innerHTML = `<i class="fas fa-ban"></i> ${t.cancelBtn}`;

    // Update document and page titles
    document.title = `${t.pageTitle} - Vortex POS`;
    const pillTextEl = document.getElementById('pill-text');
    if (pillTextEl) pillTextEl.textContent = t.pageTitle;
    
    const homeBtnTextEl = document.getElementById('home-btn-text');
    if (homeBtnTextEl) homeBtnTextEl.textContent = isAr ? 'الرئيسية' : 'Home';

    const todayLabel = document.getElementById('today-total-label');
    if (todayLabel) todayLabel.textContent = t.todayTotal;
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

async function fetchOrders() {
    const tbody = document.getElementById('orders-table-body');
    const refreshIcon = document.querySelector('.btn-refresh-inline i');
    
    // Show Skeleton Loader
    tbody.innerHTML = Array(6).fill(0).map(() => `
        <tr class="skeleton-row">
            <td><div class="skeleton-box" style="width: 40px"></div></td>
            <td><div class="skeleton-box" style="width: 100px"></div></td>
            <td><div class="skeleton-box" style="width: 150px"></div></td>
            <td><div class="skeleton-box" style="width: 80px"></div></td>
            <td><div class="skeleton-pill"></div></td>
            <td><div class="skeleton-pill"></div></td>
            <td><div class="skeleton-pill"></div></td>
        </tr>
    `).join('');

    if (refreshIcon) refreshIcon.classList.add('fa-spin');

    try {
        const response = await fetch('/api/orders');
        currentOrders = await response.json();
        updateCounts(); // 🔢 Update tab counts
        filterAndRender();
    } catch (error) {
        console.error('❌ Error fetching orders:', error);
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:4rem; color:var(--error)">${t.errorLoading}</td></tr>`;
    } finally {
        if (refreshIcon) {
            setTimeout(() => refreshIcon.classList.remove('fa-spin'), 600);
        }
    }
}

function filterAndRender(searchQuery = '') {
    let filtered = [...currentOrders];

    // Date Filter
    if (selectedDate) {
        filtered = filtered.filter(o => {
            const d = o.createdAt ? new Date(o.createdAt) : new Date();
            if (isNaN(d.getTime())) return false; // Skip truly invalid dates
            const orderDateStr = d.toISOString().split('T')[0];
            return orderDateStr === selectedDate;
        });
    }

    // Status Filter
    if (activeFilter === 'cancelled') {
        filtered = filtered.filter(o => o.isCancelled === 'Yes');
    } else if (activeFilter !== 'all') {
        filtered = filtered.filter(o => o.payment_status === activeFilter && o.isCancelled !== 'Yes');
    }

    // Search Filter
    if (!searchQuery) {
        searchQuery = document.getElementById('order-search').value;
    }

    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(o => 
            o.id.toString().includes(q) || 
            (o.customerName && o.customerName.toLowerCase().includes(q)) ||
            (o.customerPhone && o.customerPhone.includes(q))
        );
    }

    renderOrders(filtered);
}

function renderOrders(orders) {
    const tbody = document.getElementById('orders-table-body');
    tbody.innerHTML = '';

    if (orders.length === 0) {
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

    // 🏆 Calculate Daily Serials: Rank orders of the same day by ID/Time ASC
    const sortedAll = [...currentOrders].sort((a, b) => (a.id || 0) - (b.id || 0));
    const dailyCounts = {};
    const orderSerials = {};

    sortedAll.forEach(o => {
        const d = new Date(o.createdAt || Date.now());
        const dateKey = `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
        dailyCounts[dateKey] = (dailyCounts[dateKey] || 0) + 1;
        orderSerials[o.id] = dailyCounts[dateKey];
    });

    // 🚀 Render latest orders first (DESC)
    orders.sort((a, b) => (b.id || 0) - (a.id || 0));

    orders.forEach(order => {
        const tr = document.createElement('tr');
        const dailySerial = orderSerials[order.id] || order.id;
        
        tr.onclick = () => openSidebar(order, dailySerial);

        const createdAt = new Date(order.createdAt || Date.now());
        const dateMain = createdAt.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const dateSub = createdAt.toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' });

        const isCancelled = order.isCancelled === 'Yes';
        const isPaid = order.payment_status === 'Paid';
        const isCash = order.payment_status === 'Pending'; // We treat Cash as Pending in DB but want it green
        const isDelivery = parseFloat(order.deliveryPrice) > 0;

        tr.innerHTML = `
            <td><span class="order-id">#${dailySerial}</span></td>
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
    const paymentMethod = order.payment_method || (isPaid ? 'Card/Wallet' : 'Cash');
    
    const statusBadge = `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem;">
            <span class="status-badge status-completed">
                <i class="fas fa-check-circle"></i>
                ${isPaid ? t.paidStatus : t.pendingStatus}
            </span>
            ${isPaid ? `<span style="font-size: 0.75rem; color: #6d7175; font-weight: 600;">
                <i class="fas fa-wallet" style="font-size: 0.7rem; margin-left: 2px;"></i> ${paymentMethod}
            </span>` : ''}
        </div>`;
    document.getElementById('side-payment-status').innerHTML = statusBadge;

    const total = parseFloat(order.orderTotal || 0);
    const delivery = parseFloat(order.deliveryPrice || 0);
    const subtotalWithVat = total - delivery;
    
    // Calculate Base Price and 14% VAT from the subtotal
    // Base * 1.14 = SubtotalWithVat => Base = SubtotalWithVat / 1.14
    const basePrice = subtotalWithVat / 1.14;
    const vatAmount = subtotalWithVat - basePrice;

    document.getElementById('side-subtotal').innerHTML = `<span style="color: var(--text-main);">${basePrice.toFixed(2)}</span> <small style="font-size: 0.7rem; opacity: 0.7;">EGP</small>`;
    document.getElementById('side-vat').innerHTML = `<span style="color: var(--text-main);">${vatAmount.toFixed(2)}</span> <small style="font-size: 0.7rem; opacity: 0.7;">EGP</small>`;
    document.getElementById('side-delivery').innerHTML = `<span style="color: var(--text-main);">${delivery.toFixed(2)}</span> <small style="font-size: 0.7rem; opacity: 0.7;">EGP</small>`;
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
            
            const comments = [...item.comments, ...item.manualComments].map(c => c.text).join(', ');
            
            div.innerHTML = `
                <div class="item-main">
                    <div class="item-qty">${item.quantity}</div>
                    <div>
                        <div style="font-weight:700; color: var(--text-main);">${item.name}</div>
                        ${comments ? `<div style="font-size:0.75rem; color:#6d7175; font-style: italic;">${comments}</div>` : ''}
                    </div>
                </div>
                <span style="font-weight:800; color: var(--text-main); font-size: 1.05rem;">
                    ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                    <small style="font-size: 0.7rem; opacity: 0.6; font-weight: 600;">EGP</small>
                </span>
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
                fetchOrders();
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
            orderDate: new Date(order.createdAt).toLocaleString(isAr ? 'ar-EG' : 'en-US'),
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