/**
 * Vortex POS — Daily Closing Script
 */

const fmt = (n) => `${Number(parseFloat(n || 0).toFixed(2)).toLocaleString('en-US', {minimumFractionDigits: 2})} ج.م`;

document.addEventListener('DOMContentLoaded', () => {
    const dateInput = document.getElementById('closing-date-input');
    
    // Set default to today (in local-compatible format for input type date)
    const today = new Date().toLocaleDateString('en-CA');
    if (dateInput) {
        dateInput.value = today;
        dateInput.addEventListener('change', () => loadDailySummary(dateInput.value));
    }

    loadDailySummary(today);
});
let currentClosingData = null;

async function loadDailySummary(date) {
    try {
        const url = date ? `/api/closing/daily-summary?date=${date}` : '/api/closing/daily-summary';
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        currentClosingData = data;

        if (data.error) {
            Swal.fire('خطأ', data.error, 'error');
            return;
        }

        // Update UI
        document.getElementById('stat-revenue').textContent = fmt(data.totalRevenue);
        document.getElementById('stat-expenses').textContent = fmt(data.totalExpenses);
        document.getElementById('stat-profit').textContent = fmt(data.totalEarnings);
        document.getElementById('stat-discount').textContent = fmt(data.discount);
        document.getElementById('stat-orders-count').textContent = data.totalOrders;
        
        // Breakdown
        const digital = (data.instaPayTotal || 0) + (data.vcashTotal || 0) + (data.cardTotal || 0) + (data.othersTotal || 0);
        document.getElementById('stat-cash').textContent = fmt(data.cashTotal);
        document.getElementById('stat-digital').textContent = fmt(digital);
        document.getElementById('stat-total-cash').textContent = fmt(data.totalRevenue);

        // Sales Metrics
        document.getElementById('stat-items-count').textContent = data.totalItems;
        document.getElementById('stat-top-product').textContent = data.topProduct || "لا يوجد";
        
        // Show current date in Hero Label
        const dateEl = document.getElementById('current-business-date');
        if (dateEl) {
            const displayDate = date ? new Date(date).toLocaleDateString('ar-EG') : new Date().toLocaleDateString('ar-EG');
            dateEl.textContent = displayDate;
        }

    } catch (err) {
        console.error('Failed to load daily summary:', err);
    }
}

async function handleClosing() {
    const result = await Swal.fire({
        title: 'إغلاق الوردية واعتماد اليوم؟',
        text: 'سيتم ترحيل البيانات للأرشيف وتغيير تاريخ العمل لليوم التالي. تأكد من مطابقة الخزنة!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'نعم، إغلاق اليوم',
        cancelButtonText: 'إلغاء'
    });

    if (result.isConfirmed) {
        try {
            const response = await fetch('/api/closing/close-day', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();

            if (data.success) {
                await Swal.fire('تم التقفيل بنجاح', data.message, 'success');
                window.location.href = '/launcher.html';
            } else {
                Swal.fire('خطأ', data.error || 'فشل في إتمام العملية', 'error');
            }
        } catch (err) {
            Swal.fire('خطأ', 'حدث خطأ أثناء التقفيل', 'error');
        }
    }
}

async function downloadExcelReport() {
    if (!currentClosingData) {
        Swal.fire('خطأ', 'يرجى تحميل البيانات أولاً', 'error');
        return;
    }

    const data = currentClosingData;
    const dateInput = document.getElementById('closing-date-input');
    const date = dateInput ? dateInput.value : new Date().toLocaleDateString('en-CA');
    
    const workbook = new ExcelJS.Workbook();
    
    // --- 1. SUMMARY SHEET ---
    const summarySheet = workbook.addWorksheet('ملخص اليوم', { views: [{ rightToLeft: true }] });
    summarySheet.columns = [{ width: 30 }, { width: 25 }];
    
    const titleRow = summarySheet.insertRow(1, ['تقرير التقفيل اليومي - Vortex POS']);
    summarySheet.mergeCells('A1:B1');
    titleRow.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    titleRow.alignment = { horizontal: 'center' };

    summarySheet.addRow(['تاريخ التقرير', date]).font = { bold: true };
    summarySheet.addRow([]);

    const addSectionHeader = (sheet, title, color) => {
        const row = sheet.addRow([title, '']);
        sheet.mergeCells(`A${row.number}:B${row.number}`);
        row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
    };

    addSectionHeader(summarySheet, 'الملخص المالي', 'FF008060');
    summarySheet.addRow(['إجمالي المبيعات', fmt(data.totalRevenue)]);
    summarySheet.addRow(['إجمالي الخصومات', fmt(data.discount)]);
    summarySheet.addRow(['إجمالي المصروفات', fmt(data.totalExpenses)]);
    const profitRow = summarySheet.addRow(['صافي الربح', fmt(data.totalEarnings)]);
    profitRow.getCell(2).font = { color: { argb: 'FF16A34A' }, bold: true };

    summarySheet.addRow([]);
    addSectionHeader(summarySheet, 'تفاصيل الخزنة', 'FF2563EB');
    summarySheet.addRow(['كاش (الدرج)', fmt(data.cashTotal)]);
    summarySheet.addRow(['دفع إلكتروني', fmt((data.instaPayTotal || 0) + (data.vcashTotal || 0) + (data.cardTotal || 0) + (data.othersTotal || 0))]);
    summarySheet.addRow(['إجمالي المحصل', fmt(data.totalRevenue)]).font = { bold: true };

    // --- 2. ORDERS SHEET ---
    const ordersSheet = workbook.addWorksheet('تفاصيل الطلبات', { views: [{ rightToLeft: true }] });
    ordersSheet.columns = [
        { header: 'رقم الطلب', key: 'id', width: 15 },
        { header: 'العميل', key: 'customer', width: 25 },
        { header: 'المبلغ', key: 'total', width: 15 },
        { header: 'طريقة الدفع', key: 'method', width: 20 },
        { header: 'الوقت', key: 'time', width: 20 }
    ];

    const orderHeader = ordersSheet.getRow(1);
    orderHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    orderHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };

    (data.ordersList || []).forEach(o => {
        ordersSheet.addRow({
            id: o.id,
            customer: o.customerName,
            total: fmt(o.orderTotal),
            method: o.payment_method,
            time: new Date(o.createdAt).toLocaleTimeString('ar-EG')
        });
    });

    // --- 3. EXPENSES SHEET ---
    const expensesSheet = workbook.addWorksheet('تفاصيل المصروفات', { views: [{ rightToLeft: true }] });
    expensesSheet.columns = [
        { header: 'البيان', key: 'desc', width: 35 },
        { header: 'التصنيف', key: 'cat', width: 20 },
        { header: 'المبلغ', key: 'amount', width: 15 }
    ];

    const expHeader = expensesSheet.getRow(1);
    expHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    expHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' } };

    (data.expensesList || []).forEach(e => {
        expensesSheet.addRow({
            desc: e.description,
            cat: e.category,
            amount: fmt(e.amount)
        });
    });

    // Apply borders to all sheets
    workbook.eachSheet(sheet => {
        sheet.eachRow(row => {
            row.eachCell(cell => {
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
            });
        });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Full_Report_Vortex_${date}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
}
