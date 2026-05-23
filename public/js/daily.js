document.addEventListener("DOMContentLoaded", function () {

    // ربط زر إغلاق اليوم بالدالة الصحيحة
    const closeDayBtn = document.getElementById("close-day-btn");
    if (closeDayBtn) {
        closeDayBtn.addEventListener("click", closeDay);
    }

    // استدعاء الدوال عند تحميل الصفحة
    fetchDailySummary();
    checkIfDayClosed();
});

// 🟢 دالة جلب ملخص اليوم من السيرفر
async function fetchDailySummary() {
    try {
        const response = await fetch("/api/daily-summary");
        const data = await response.json();

        console.log('🔍 API Response:', data); // ✅ تأكد أن البيانات تصل للواجهة

        document.getElementById("totalOrders").textContent = data.totalOrders;
        document.getElementById("totalSandwiches").textContent = data.totalSandwiches;
        document.getElementById("total-revenue").textContent = data.totalRevenue + " EGP";
        document.getElementById("total-cost").textContent = data.totalCost + " EGP";
        document.getElementById("total-earnings").textContent = data.totalEarnings + " EGP";

        // ✅ إظهار الخصومات بالقيمة الصحيحة
        document.getElementById("total-discount").textContent = data.discount + " EGP";

        // ✅ إظهار المدفوعات الإلكترونية بالقيمة الصحيحة
        document.getElementById("total-online-payments").textContent = data.onlinePaymentsTotal + " EGP";

    } catch (error) {
        console.error("❌ Error fetching daily summary:", error);
    }
}

document.addEventListener("DOMContentLoaded", fetchDailySummary);

// 🔴 دالة إغلاق اليوم وتحديث قاعدة البيانات
async function closeDay() {
    const result = await Swal.fire({
        title: 'هل أنت متأكد؟',
        text: "إغلاق اليوم سيقوم بتصفير المبيعات الحالية، ولا يمكن التراجع!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ff4500',
        cancelButtonColor: '#333',
        confirmButtonText: 'نعم، أغلق اليوم',
        cancelButtonText: 'إلغاء'
    });

    if (!result.isConfirmed) return;

    try {
        const response = await fetch("/api/close-day", { method: "POST" });
        const data = await response.json();

        if (data.success) {
            Swal.fire({
                icon: 'success',
                title: 'تم الإغلاق',
                text: 'تم إغلاق اليوم وتصفير العدادات بنجاح.',
                timer: 2000,
                showConfirmButton: false
            }).then(() => {
                location.reload();
            });
        }
    } catch (error) {
        console.error("❌ Error closing the day:", error);
        Swal.fire('خطأ', 'حدث خطأ أثناء محاولة إغلاق اليوم', 'error');
    }
}

// 🟢 دالة التحقق من إذا كان اليوم مغلقًا
async function checkIfDayClosed() {
    try {
        const response = await fetch("/api/daily-summary");
        const data = await response.json();

        if (data.totalOrders === 0) {
            const closeDayBtn = document.getElementById("close-day-btn");
            if (closeDayBtn) {
                closeDayBtn.disabled = true;
                closeDayBtn.textContent = "🔒 Closed";
            }
        }
    } catch (error) {
        console.error("❌ خطأ أثناء التحقق من إغلاق اليوم:", error);
    }
}

// 🟢 دالة فتح التقرير والطباعة
function openReport() {
    const printWindow = window.open('/daily_closing.html', '_blank', 'width=400,height=600');
    printWindow.onload = function () {
        printWindow.print();
    };
}

// 🟢 دالة تصدير البيانات إلى إكسل
function exportToExcel() {
    const currentLang = localStorage.getItem('lang') || 'ar';
    const isAr = currentLang === 'ar';

    const title = isAr ? "Vortex POS - تقرير المبيعات اليومي" : "Vortex POS - Daily Sales Report";
    const dateLabel = isAr ? "التاريخ" : "Date";
    const metricHeader = isAr ? "المؤشر" : "Metric";
    const valueHeader = isAr ? "القيمة" : "Value";

    const metrics = [
        { key: isAr ? "إجمالي الطلبات" : "Total Orders", val: document.getElementById("totalOrders").textContent },
        { key: isAr ? "إجمالي السندوتشات" : "Total Sandwiches", val: document.getElementById("totalSandwiches").textContent },
        { key: isAr ? "إجمالي الإيرادات" : "Total Revenue", val: document.getElementById("total-revenue").textContent },
        { key: isAr ? "إجمالي التكلفة" : "Total Cost", val: document.getElementById("total-cost").textContent },
        { key: isAr ? "إجمالي الأرباح" : "Total Earnings", val: document.getElementById("total-earnings").textContent },
        { key: isAr ? "إجمالي الخصومات" : "Total Discounts", val: document.getElementById("total-discount").textContent },
        { key: isAr ? "المدفوعات الإلكترونية" : "Online Payments", val: document.getElementById("total-online-payments").textContent }
    ];

    const data = [
        [title],
        [dateLabel, new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US')],
        [],
        [metricHeader, valueHeader],
        ...metrics.map(m => [m.key, m.val])
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // Auto-size columns to look super clean and prevent text clipping
    ws['!cols'] = [
        { wch: isAr ? 35 : 25 }, // Metric column
        { wch: 18 }  // Value column
    ];

    const wb = XLSX.utils.book_new();
    if (!wb.Workbook) wb.Workbook = {};
    if (!wb.Workbook.Views) wb.Workbook.Views = [];
    wb.Workbook.Views[0] = { RTL: isAr };

    XLSX.utils.book_append_sheet(wb, ws, isAr ? "الملخص اليومي" : "Daily Summary");
    
    const fileName = isAr ? `تقرير_المبيعات_اليومي_${new Date().toISOString().split('T')[0]}.xlsx` : `Daily_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
}