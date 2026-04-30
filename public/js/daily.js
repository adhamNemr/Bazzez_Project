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
    const data = [
        ["Vortex POS - Daily Sales Report"],
        ["Date", new Date().toLocaleDateString()],
        [],
        ["Metric", "Value"],
        ["Total Orders", document.getElementById("totalOrders").textContent],
        ["Total Sandwiches", document.getElementById("totalSandwiches").textContent],
        ["Total Revenue", document.getElementById("total-revenue").textContent],
        ["Total Cost", document.getElementById("total-cost").textContent],
        ["Total Earnings", document.getElementById("total-earnings").textContent],
        ["Total Discounts", document.getElementById("total-discount").textContent],
        ["Online Payments", document.getElementById("total-online-payments").textContent]
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Daily Summary");
    
    XLSX.writeFile(wb, `Daily_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
}