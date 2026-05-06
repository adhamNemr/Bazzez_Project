/**
 * Vortex POS — Monthly Closing Script (Full Version)
 */

const fmt = (n) => `${Number(parseFloat(n || 0).toFixed(2)).toLocaleString('en-US', {minimumFractionDigits: 2})} ج.م`;
let currentMonthData = null;

// ─── Init ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const monthInput = document.getElementById('month-input');

    // Default to current month
    const today = new Date();
    const thisMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    monthInput.value = thisMonth;

    loadMonthlySummary(thisMonth);

    monthInput.addEventListener('change', () => {
        loadMonthlySummary(monthInput.value);
    });
});

// ─── Load Summary ────────────────────────────────────────────────────────────
async function loadMonthlySummary(month) {
    try {
        const url = `/api/closing/monthly-summary?month=${month}`;
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();

        if (data.error) {
            Swal.fire('خطأ', data.error, 'error');
            return;
        }

        currentMonthData = data;

        // ── Computed values
        const revenue    = data.total_revenue      || 0;
        const cost       = data.total_cost         || 0;
        const expenses   = data.totalExpenses      || 0;
        const profit     = data.total_earnings     || 0;
        const discount   = data.totalDiscount      || 0;
        const digital    = data.onlinePaymentsTotal|| 0;
        const cash       = revenue - digital;

        // ── Hero
        document.getElementById('stat-profit').textContent = fmt(profit);

        // ── Month label
        const [yr, mo] = (data.currentMonth || month).split('-');
        const displayMonth = new Date(yr, mo - 1).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });
        document.getElementById('current-month-display').textContent = displayMonth;

        // ── Live badge
        const liveBadge = document.getElementById('live-badge');
        const liveText  = document.getElementById('live-text');
        if (data.liveOrdersCount > 0) {
            liveBadge.style.display = 'inline-flex';
            liveText.textContent = `${data.liveOrdersCount} أوردر بقيمة ${fmt(data.liveRevenue)} لم تُقفَّل بعد`;
        } else {
            liveBadge.style.display = 'none';
        }

        // ── Top Stats Grid
        document.getElementById('stat-revenue').textContent     = fmt(revenue);
        document.getElementById('stat-cost').textContent        = fmt(cost);
        document.getElementById('stat-expenses').textContent    = fmt(expenses);
        document.getElementById('stat-discount').textContent    = fmt(discount);
        document.getElementById('stat-orders-count').textContent= data.total_orders      || 0;
        document.getElementById('stat-items-count').textContent = data.total_sandwiches  || 0;
        document.getElementById('stat-digital').textContent     = fmt(digital);
        document.getElementById('stat-cash').textContent        = fmt(cash);

        // ── Flow Detail Card
        document.getElementById('stat-cash-detail').textContent    = fmt(cash);
        document.getElementById('stat-digital-detail').textContent = fmt(digital);
        document.getElementById('stat-expenses-detail').textContent= fmt(expenses);
        document.getElementById('stat-discount-detail').textContent= fmt(discount);
        document.getElementById('stat-total-cash').textContent     = fmt(revenue);

        // ── Performance Detail Card
        document.getElementById('stat-orders-detail').textContent  = data.total_orders     || 0;
        document.getElementById('stat-items-detail').textContent   = data.total_sandwiches || 0;
        document.getElementById('stat-revenue-detail').textContent = fmt(revenue);
        document.getElementById('stat-cost-detail').textContent    = fmt(cost);
        document.getElementById('stat-profit-detail').textContent  = fmt(profit);

        // ── Day-by-day table
        renderDailyTable(data.dailyBreakdown || []);

    } catch (err) {
        console.error('Failed to load monthly summary:', err);
        Swal.fire('خطأ', 'فشل في تحميل البيانات الشهرية', 'error');
    }
}

// ─── Day Table ───────────────────────────────────────────────────────────────
function renderDailyTable(days) {
    const tbody = document.getElementById('daily-table-body');
    if (!days || days.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="empty-table">
            <i class="fas fa-inbox fa-2x" style="display:block;margin-bottom:0.5rem;"></i>
            لا توجد أيام مقفلة لهذا الشهر
        </td></tr>`;
        return;
    }

    tbody.innerHTML = days.map((d, i) => {
        const profitColor = d.totalEarnings >= 0 ? '#16a34a' : '#dc2626';
        return `<tr>
            <td>${i + 1}</td>
            <td><strong>${(d.closingDate || '').slice(0, 10)}</strong></td>
            <td>${d.totalOrders || 0}</td>
            <td>${d.totalSandwiches || 0}</td>
            <td class="badge-green">${fmt(d.totalRevenue)}</td>
            <td class="badge-red">${fmt(d.totalExpenses)}</td>
            <td class="badge-red">${fmt(d.totalDiscount)}</td>
            <td class="badge-red">${fmt(d.totalCost)}</td>
            <td style="color:#8b5cf6;">${fmt(d.onlinePaymentsTotal)}</td>
            <td style="color:${profitColor}; font-size:1rem;">${fmt(d.totalEarnings)}</td>
        </tr>`;
    }).join('');
}

// ─── Excel Export ────────────────────────────────────────────────────────────
async function downloadMonthlyExcel() {
    if (!currentMonthData) {
        Swal.fire('خطأ', 'يرجى تحميل البيانات أولاً', 'error');
        return;
    }

    const data     = currentMonthData;
    const month    = document.getElementById('month-input').value;
    const revenue  = data.total_revenue        || 0;
    const cost     = data.total_cost           || 0;
    const expenses = data.totalExpenses        || 0;
    const profit   = data.total_earnings       || 0;
    const discount = data.totalDiscount        || 0;
    const digital  = data.onlinePaymentsTotal  || 0;
    const cash     = revenue - digital;

    const workbook = new ExcelJS.Workbook();

    // ── Helper: add a colored section header ──
    const addHeader = (sheet, title, colorArgb) => {
        const row = sheet.addRow([title, '']);
        sheet.mergeCells(`A${row.number}:B${row.number}`);
        row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorArgb } };
        row.alignment = { horizontal: 'right' };
    };

    // ════════════════════════════════════
    // SHEET 1: Monthly Summary
    // ════════════════════════════════════
    const summary = workbook.addWorksheet('ملخص الشهر', { views: [{ rightToLeft: true }] });
    summary.columns = [{ width: 30 }, { width: 25 }];

    // Title
    const titleRow = summary.insertRow(1, [`تقرير التقفيل الشهري - ${month} - Vortex POS`]);
    summary.mergeCells('A1:B1');
    titleRow.font      = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleRow.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    titleRow.alignment = { horizontal: 'center' };
    titleRow.height    = 36;

    summary.addRow([]);

    addHeader(summary, 'الملخص المالي', 'FF008060');
    summary.addRow(['إجمالي المبيعات',   fmt(revenue)]);
    summary.addRow(['إجمالي التكاليف',   fmt(cost)]);
    summary.addRow(['إجمالي المصروفات',  fmt(expenses)]);
    summary.addRow(['إجمالي الخصومات',   fmt(discount)]);
    const profitRow = summary.addRow(['صافي الربح',  fmt(profit)]);
    profitRow.getCell(2).font = { bold: true, color: { argb: profit >= 0 ? 'FF16A34A' : 'FFDC2626' } };

    summary.addRow([]);
    addHeader(summary, 'تفاصيل الخزنة', 'FF2563EB');
    summary.addRow(['مبيعات كاش',        fmt(cash)]);
    summary.addRow(['مبيعات إلكترونية',  fmt(digital)]);
    const totalRow = summary.addRow(['إجمالي المحصل', fmt(revenue)]);
    totalRow.font = { bold: true };

    summary.addRow([]);
    addHeader(summary, 'إحصائيات الأداء', 'FF64748B');
    summary.addRow(['إجمالي الطلبات',    data.total_orders     || 0]);
    summary.addRow(['إجمالي القطع المباعة', data.total_sandwiches || 0]);

    // Borders
    summary.eachRow(row => {
        row.eachCell(cell => {
            cell.border = { top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} };
            cell.alignment = cell.alignment || { vertical: 'middle', horizontal: 'right' };
        });
    });

    // ════════════════════════════════════
    // SHEET 2: Day-by-Day Breakdown
    // ════════════════════════════════════
    const dailySheet = workbook.addWorksheet('تفاصيل الأيام', { views: [{ rightToLeft: true }] });
    dailySheet.columns = [
        { header: '#',               key: 'num',      width: 6  },
        { header: 'التاريخ',          key: 'date',     width: 15 },
        { header: 'الطلبات',          key: 'orders',   width: 12 },
        { header: 'القطع',            key: 'items',    width: 12 },
        { header: 'المبيعات (EGP)',   key: 'revenue',  width: 18 },
        { header: 'المصروفات (EGP)',  key: 'expenses', width: 18 },
        { header: 'الخصومات (EGP)',   key: 'discount', width: 18 },
        { header: 'التكاليف (EGP)',   key: 'cost',     width: 18 },
        { header: 'إلكتروني (EGP)',   key: 'online',   width: 18 },
        { header: 'صافي الربح (EGP)', key: 'profit',   width: 20 },
    ];

    // Style header row
    const hRow = dailySheet.getRow(1);
    hRow.height = 32;
    hRow.eachCell(cell => {
        cell.font   = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    (data.dailyBreakdown || []).forEach((d, i) => {
        const row = dailySheet.addRow({
            num:      i + 1,
            date:     d.closingDate,
            orders:   d.totalOrders    || 0,
            items:    d.totalSandwiches|| 0,
            revenue:  parseFloat(d.totalRevenue  || 0).toFixed(2),
            expenses: parseFloat(d.totalExpenses || 0).toFixed(2),
            discount: parseFloat(d.totalDiscount || 0).toFixed(2),
            cost:     parseFloat(d.totalCost     || 0).toFixed(2),
            online:   parseFloat(d.onlinePaymentsTotal || 0).toFixed(2),
            profit:   parseFloat(d.totalEarnings || 0).toFixed(2),
        });
        row.height = 22;
        // Color profit cell
        const profitCell = row.getCell('profit');
        profitCell.font = { bold: true, color: { argb: (d.totalEarnings >= 0) ? 'FF16A34A' : 'FFDC2626' } };
        // Alternate row color
        if (i % 2 === 0) {
            row.eachCell(cell => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
            });
        }
    });

    // Borders for daily sheet
    dailySheet.eachRow(row => {
        row.eachCell(cell => {
            cell.border = { top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} };
            cell.alignment = cell.alignment || { vertical: 'middle', horizontal: 'center' };
        });
    });

    // ── Write & Download ──
    const buffer = await workbook.xlsx.writeBuffer();
    const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url    = window.URL.createObjectURL(blob);
    const a      = document.createElement('a');
    a.href       = url;
    a.download   = `Monthly_Report_Vortex_${month}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
}

// ─── Close Month ─────────────────────────────────────────────────────────────
async function handleClosing() {
    const month = document.getElementById('month-input').value;
    const today = new Date();
    const thisMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    if (month !== thisMonth) {
        Swal.fire('تنبيه', 'يمكن إغلاق الشهر الحالي فقط. الأشهر الماضية مقفلة بالفعل.', 'info');
        return;
    }

    const result = await Swal.fire({
        title: 'هل أنت متأكد من إغلاق الشهر؟',
        html: `
            <p style="color:#64748b; margin-bottom:1rem;">سيتم أرشفة مبيعات الشهر وتصفير عدادات المنتجات للبدء في شهر جديد.</p>
            <div style="background:#fef2f2; border-radius:12px; padding:1rem; color:#dc2626; font-weight:700;">
                ⚠️ هذا الإجراء نهائي ولا يمكن التراجع عنه!
            </div>`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#64748b',
        confirmButtonText: '🔒 نعم، إغلاق الشهر',
        cancelButtonText: 'إلغاء'
    });

    if (result.isConfirmed) {
        try {
            const response = await fetch('/api/closing/close-month', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();

            if (data.success) {
                await Swal.fire({
                    title: '✅ تم الإغلاق',
                    text: data.message,
                    icon: 'success',
                    confirmButtonColor: '#8b5cf6'
                });
                window.location.href = '/launcher.html';
            } else {
                Swal.fire('خطأ', data.error || 'فشل في إتمام العملية', 'error');
            }
        } catch (err) {
            Swal.fire('خطأ', 'حدث خطأ غير متوقع أثناء إغلاق الشهر', 'error');
        }
    }
}
