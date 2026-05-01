/**
 * Vortex POS - Inventory Management Logic
 * Optimized for Luxury Workstation Theme
 */

let allInventory = [];
const currentLang = localStorage.getItem('lang') || 'ar';
const isAr = currentLang === 'ar';

const t = {
    ar: {
        pageTitle: 'إدارة المخزن',
        searchPlaceholder: 'ابحث عن صنف...',
        totalItems: 'إجمالي الأصناف',
        lowStock: 'نواقص المخزن',
        nearExpiry: 'قرب الانتهاء',
        msgAdded: '✅ تم إضافة الصنف بنجاح.',
        msgEdited: '✅ تم تعديل البيانات بنجاح.',
        msgDeleted: '🗑️ تم حذف الصنف نهائياً.',
        msgError: '⚠️ حدث خطأ ما.',
        confirmDelete: 'هل أنت متأكد من الحذف؟',
        noResults: 'لم يتم العثور على نتائج مطابقة',
        tableId: 'ID',
        tableName: 'اسم الصنف',
        tableQty: 'الكمية',
        tableMin: 'الحد الأدنى',
        tableCost: 'التكلفة',
        tableTotal: 'إجمالي القيمة',
        tableAdded: 'تاريخ الإضافة',
        tableExpiry: 'تاريخ الصلاحية',
        filterAll: 'كل الأصناف',
        filterLow: 'النواقص',
        filterExpiry: 'قرب الانتهاء',
        btnAdd: 'إضافة صنف جديد',
        editTitle: 'تعديل الصنف',
        addTitle: 'إضافة صنف جديد للمخزن',
        saveChanges: 'حفظ التعديلات',
        deleteItem: 'حذف الصنف',
        cancelBtn: 'إلغاء',
        exportPdf: 'تصدير PDF',
        exportExcel: 'تصدير Excel'
    },
    en: {
        pageTitle: 'Inventory Management',
        searchPlaceholder: 'Search items...',
        totalItems: 'Total Items',
        lowStock: 'Low Stock',
        nearExpiry: 'Near Expiry',
        msgAdded: '✅ Item added successfully.',
        msgEdited: '✅ Data updated successfully.',
        msgDeleted: '🗑️ Item deleted successfully.',
        msgError: '⚠️ Something went wrong.',
        confirmDelete: 'Are you sure you want to delete?',
        noResults: 'No matching results found',
        tableId: 'ID',
        tableName: 'Name',
        tableQty: 'Qty (KG/Unit)',
        tableMin: 'Min Limit',
        tableCost: 'Unit Cost',
        tableTotal: 'Total Value',
        tableAdded: 'Added Date',
        tableExpiry: 'Expiry Date',
        filterAll: 'All Items',
        filterLow: 'Low Stock',
        filterExpiry: 'Near Expiry',
        btnAdd: 'Add New Item',
        editTitle: 'Edit Item',
        addTitle: 'Add New Inventory Item',
        saveChanges: 'Save Changes',
        deleteItem: 'Delete Item',
        cancelBtn: 'Cancel',
        exportPdf: 'Export PDF',
        exportExcel: 'Export Excel'
    }
};

document.addEventListener("DOMContentLoaded", () => {
    applyTranslations();
    fetchInventory();
    setupEventListeners();
});

function applyTranslations() {
    const langT = t[currentLang];
    document.title = langT.pageTitle;
    document.documentElement.dir = isAr ? 'rtl' : 'ltr';

    document.getElementById('search-input').placeholder = langT.searchPlaceholder;
    document.getElementById('loc-stat-total').textContent = langT.totalItems;
    document.getElementById('loc-stat-low').textContent = langT.lowStock;
    document.getElementById('loc-stat-expiry').textContent = langT.nearExpiry;
    
    document.getElementById('loc-id').textContent = langT.tableId;
    document.getElementById('loc-name').textContent = langT.tableName;
    document.getElementById('loc-qty').textContent = langT.tableQty;
    document.getElementById('loc-min').textContent = langT.tableMin;
    document.getElementById('loc-cost').textContent = langT.tableCost;
    document.getElementById('loc-total').textContent = langT.tableTotal;
    document.getElementById('loc-added').textContent = langT.tableAdded;
    document.getElementById('loc-expiry').textContent = langT.tableExpiry;

    document.getElementById('loc-filter-all').textContent = langT.filterAll;
    document.getElementById('loc-filter-low').textContent = langT.filterLow;
    document.getElementById('loc-filter-expiry').textContent = langT.filterExpiry;

    document.getElementById('loc-btn-add').textContent = langT.btnAdd;
    const pdfText = document.getElementById('loc-pdf-text');
    const excelText = document.getElementById('loc-excel-text');
    if (pdfText) pdfText.textContent = langT.exportPdf;
    if (excelText) excelText.textContent = langT.exportExcel;
}

function setupEventListeners() {
    setInterval(fetchInventory, 30000);
}

function showLoading() {
    const tableBody = document.getElementById('product-table');
    tableBody.innerHTML = `
        <tr>
            <td colspan="8" style="padding: 10rem 0; text-align: center;">
                <div class="loader-container">
                    <i class="fas fa-circle-notch fa-spin" style="font-size: 3rem; color: var(--luxury-emerald); opacity: 0.8;"></i>
                    <p style="margin-top: 1rem; font-weight: 700; color: #64748b; letter-spacing: 0.1em;">${isAr ? 'جاري تحميل البيانات...' : 'LOADING INVENTORY...'}</p>
                </div>
            </td>
        </tr>
    `;
}

function fetchInventory() {
    const token = localStorage.getItem("token");
    const tableBody = document.getElementById('product-table');
    if (tableBody.innerHTML === '') showLoading();

    fetch('/api/inventory', {
        headers: { "Authorization": `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
        allInventory = data;
        renderInventory(data);
    })
    .catch(err => {
        console.error("❌ Error fetching inventory:", err);
        tableBody.innerHTML = `<tr><td colspan="8" style="padding: 4rem; color: #ef4444;">${t[currentLang].msgError}</td></tr>`;
    });
}

function renderInventory(items) {
    const tableBody = document.getElementById('product-table');
    tableBody.innerHTML = '';
    const isRetail = (localStorage.getItem('systemMode') || 'restaurant') === 'retail';

    const expiryHeader = document.getElementById('loc-expiry');
    if (expiryHeader) {
        expiryHeader.style.display = isRetail ? 'none' : 'table-cell';
    }

    updateStats(items);

    if (items.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="${isRetail ? 7 : 8}" style="padding: 5rem 2rem; text-align: center;">
                    <i class="fas fa-box-open" style="font-size: 3rem; opacity: 0.2; margin-bottom: 1rem;"></i>
                    <h3 style="color: #64748b;">${t[currentLang].noResults}</h3>
                </td>
            </tr>
        `;
        return;
    }

    items.forEach(item => {
        const row = document.createElement('tr');
        const isLow = parseFloat(item.quantity) <= parseFloat(item.min || 0);
        const isNearExpiry = !isRetail && checkIfNearExpiry(item.expiryDate);
        
        const formattedQty = isRetail ? Math.round(item.quantity) : parseFloat(item.quantity).toFixed(2);
        
        row.innerHTML = `
            <td style="opacity: 0.5;">#${item.id}</td>
            <td style="font-weight: 700;">${item.name}</td>
            <td>
                <span class="${isLow ? 'badge-low' : 'badge-ok'}">
                    ${formattedQty}
                </span>
            </td>
            <td style="opacity: 0.6;">${parseFloat(item.min || 0).toFixed(2)}</td>
            <td>${parseFloat(item.cost).toFixed(2)} <small>EGP</small></td>
            <td style="font-weight: 800; color: var(--luxury-emerald);">${(item.quantity * item.cost).toFixed(2)} <small>EGP</small></td>
            <td style="font-size: 0.85rem; opacity: 0.6;">${formatDate(item.createdAt)}</td>
            ${!isRetail ? `
            <td style="font-size: 0.85rem; font-weight: 700; color: ${isNearExpiry ? '#ef4444' : 'inherit'};">
                ${formatDate(item.expiryDate)}
            </td>` : ''}
        `;

        row.addEventListener('click', () => selectItem(item));
        tableBody.appendChild(row);
    });
}

function updateStats(items) {
    const lowStock = items.filter(i => i.quantity <= (i.min || 5)).length;
    const expiring = items.filter(i => checkIfNearExpiry(i.expiryDate)).length;

    document.getElementById('stat-total-items').textContent = items.length;
    document.getElementById('stat-low-stock').textContent = lowStock;
    document.getElementById('stat-near-expiry').textContent = expiring;
}

function checkIfNearExpiry(dateStr) {
    if (!dateStr) return false;
    const expiry = new Date(dateStr);
    const today = new Date();
    const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
}

function formatDate(dateStr) {
    if (!dateStr) return '---';
    return new Date(dateStr).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { day: '2-digit', month: 'short' });
}

async function openAddModal() {
    const isRetail = (localStorage.getItem('systemMode') || 'restaurant') === 'retail';
    const langT = t[currentLang];

    const { value: formValues } = await Swal.fire({
        title: langT.addTitle,
        html: `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; padding: 1rem; text-align: ${isAr ? 'right' : 'left'};">
                <div style="grid-column: span 2;">
                    <label style="display:block; font-weight:700; margin-bottom:5px;">${langT.tableName}</label>
                    <input id="swal-name" class="swal2-input" style="width:100%; margin:0;" placeholder="${langT.tableName}">
                </div>
                <div>
                    <label style="display:block; font-weight:700; margin-bottom:5px;">${langT.tableQty}</label>
                    <input id="swal-qty" type="number" step="0.01" min="0" class="swal2-input" style="width:100%; margin:0;">
                </div>
                <div>
                    <label style="display:block; font-weight:700; margin-bottom:5px;">${langT.tableMin}</label>
                    <input id="swal-min" type="number" step="0.01" min="0" class="swal2-input" style="width:100%; margin:0;">
                </div>
                <div>
                    <label style="display:block; font-weight:700; margin-bottom:5px;">${langT.tableCost}</label>
                    <input id="swal-cost" type="number" step="0.01" min="0" class="swal2-input" style="width:100%; margin:0;">
                </div>
                ${!isRetail ? `
                <div>
                    <label style="display:block; font-weight:700; margin-bottom:5px;">${langT.tableExpiry}</label>
                    <input id="swal-expiry" type="date" class="swal2-input" style="width:100%; margin:0;">
                </div>` : ''}
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: isAr ? 'إضافة' : 'Add',
        cancelButtonText: langT.cancelBtn,
        confirmButtonColor: 'var(--luxury-emerald)',
        preConfirm: () => {
            const name = document.getElementById('swal-name').value;
            const quantity = parseFloat(document.getElementById('swal-qty').value);
            const min = parseFloat(document.getElementById('swal-min').value);
            const cost = parseFloat(document.getElementById('swal-cost').value);
            
            if (!name) return Swal.showValidationMessage(isAr ? 'يرجى إدخال اسم الصنف' : 'Name is required');
            if (isNaN(quantity) || quantity < 0) return Swal.showValidationMessage(isAr ? 'الكمية يجب أن تكون 0 أو أكثر' : 'Quantity must be 0 or more');
            if (isNaN(cost) || cost < 0) return Swal.showValidationMessage(isAr ? 'التكلفة يجب أن تكون 0 أو أكثر' : 'Cost must be 0 or more');

            return {
                name, quantity, min: isNaN(min) ? 0 : min, cost,
                expiryDate: !isRetail ? document.getElementById('swal-expiry').value : null
            }
        }
    });

    if (formValues) handleFormSubmit(formValues);
}

async function selectItem(item) {
    const langT = t[currentLang];
    const isRetail = (localStorage.getItem('systemMode') || 'restaurant') === 'retail';
    
    const { value: result, isConfirmed, isDenied } = await Swal.fire({
        title: `${langT.editTitle}: ${item.name}`,
        html: `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; padding: 1rem; text-align: ${isAr ? 'right' : 'left'};">
                <div style="grid-column: span 2;">
                    <label style="display:block; font-weight:700; margin-bottom:5px;">${langT.tableName}</label>
                    <input id="swal-edit-name" class="swal2-input" value="${item.name}" style="width:100%; margin:0;">
                </div>
                <div>
                    <label style="display:block; font-weight:700; margin-bottom:5px;">${langT.tableQty}</label>
                    <input id="swal-edit-qty" type="number" step="0.01" min="0" class="swal2-input" value="${item.quantity}" style="width:100%; margin:0;">
                </div>
                <div>
                    <label style="display:block; font-weight:700; margin-bottom:5px;">${langT.tableMin}</label>
                    <input id="swal-edit-min" type="number" step="0.01" min="0" class="swal2-input" value="${item.min || 0}" style="width:100%; margin:0;">
                </div>
                <div>
                    <label style="display:block; font-weight:700; margin-bottom:5px;">${langT.tableCost}</label>
                    <input id="swal-edit-cost" type="number" step="0.01" min="0" class="swal2-input" value="${item.cost}" style="width:100%; margin:0;">
                </div>
                ${!isRetail ? `
                <div>
                    <label style="display:block; font-weight:700; margin-bottom:5px;">${langT.tableExpiry}</label>
                    <input id="swal-edit-expiry" type="date" class="swal2-input" value="${item.expiryDate ? item.expiryDate.split('T')[0] : ''}" style="width:100%; margin:0;">
                </div>` : ''}
            </div>
        `,
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: langT.saveChanges,
        denyButtonText: langT.deleteItem,
        cancelButtonText: langT.cancelBtn,
        confirmButtonColor: 'var(--luxury-emerald)',
        denyButtonColor: '#ef4444',
        preConfirm: () => {
            const name = document.getElementById('swal-edit-name').value;
            const quantity = parseFloat(document.getElementById('swal-edit-qty').value);
            const cost = parseFloat(document.getElementById('swal-edit-cost').value);

            if (!name) return Swal.showValidationMessage(isAr ? 'يرجى إدخال اسم الصنف' : 'Name is required');
            if (isNaN(quantity) || quantity < 0) return Swal.showValidationMessage(isAr ? 'الكمية يجب أن تكون 0 أو أكثر' : 'Quantity must be 0 or more');
            if (isNaN(cost) || cost < 0) return Swal.showValidationMessage(isAr ? 'التكلفة يجب أن تكون 0 أو أكثر' : 'Cost must be 0 or more');

            return {
                name, quantity, cost,
                min: parseFloat(document.getElementById('swal-edit-min').value) || 0,
                expiryDate: !isRetail ? document.getElementById('swal-edit-expiry').value : null
            }
        }
    });

    if (isConfirmed) {
        handleEdit(item.id, result);
    } else if (isDenied) {
        handleDelete(item.id);
    }
}

async function handleFormSubmit(data) {
    const token = localStorage.getItem("token");
    Swal.fire({ title: isAr ? 'جاري الحفظ...' : 'Saving...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        const res = await fetch("/api/inventory/add", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            Swal.fire({ icon: 'success', title: t[currentLang].msgAdded, timer: 1500, showConfirmButton: false });
            fetchInventory();
        }
    } catch (err) {
        Swal.fire({ icon: 'error', title: t[currentLang].msgError });
    }
}

async function handleEdit(id, data) {
    const token = localStorage.getItem("token");
    Swal.fire({ title: isAr ? 'جاري التحديث...' : 'Updating...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        const res = await fetch(`/api/inventory/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            Swal.fire({ icon: 'success', title: t[currentLang].msgEdited, timer: 1500, showConfirmButton: false });
            fetchInventory();
        }
    } catch (err) {
        Swal.fire({ icon: 'error', title: t[currentLang].msgError });
    }
}

async function handleDelete(id) {
    const result = await Swal.fire({
        title: t[currentLang].confirmDelete,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: isAr ? 'نعم، احذف' : 'Yes, Delete',
        cancelButtonText: t[currentLang].cancelBtn
    });

    if (!result.isConfirmed) return;

    const token = localStorage.getItem("token");
    try {
        const res = await fetch(`/api/inventory/${id}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
            Swal.fire({ icon: 'success', title: t[currentLang].msgDeleted, timer: 1500, showConfirmButton: false });
            fetchInventory();
        }
    } catch (err) {
        Swal.fire({ icon: 'error', title: t[currentLang].msgError });
    }
}

let filterTimeout;
function applyFilter() {
    clearTimeout(filterTimeout);
    filterTimeout = setTimeout(() => {
        const query = document.getElementById('search-input').value.toLowerCase();
        const filter = document.getElementById('filter-option').value;
        
        let filtered = allInventory.filter(item => item.name.toLowerCase().includes(query));
        
        if (filter === 'low-stock') {
            filtered = filtered.filter(item => item.quantity <= (item.min || 5));
        } else if (filter === 'near-expiry') {
            filtered = filtered.filter(item => checkIfNearExpiry(item.expiryDate));
        }
        
        renderInventory(filtered);
    }, 300);
}

function exportToPDF() {
    try {
        const element = document.getElementById("printable-content");
        if (!element) throw new Error("Printable content not found");

        // 1. Prepare for capture: Hide interactive elements and fix Arabic direction
        const noPrintElements = document.querySelectorAll('.no-print');
        noPrintElements.forEach(el => el.style.display = 'none');
        element.classList.add('pdf-capture-mode');
        
        const reportDateElem = document.getElementById("pdf-report-date");
        if (reportDateElem) {
            reportDateElem.textContent = `${isAr ? 'بتاريخ' : 'Date'}: ${new Date().toLocaleString(isAr ? 'ar-EG' : 'en-US')}`;
        }

        // 2. Export Options
        const opt = {
            margin: [0.3, 0.3], // Minimal margins
            filename: `vortex_inventory_${new Date().toISOString().split('T')[0]}.pdf`,
            image: { type: 'jpeg', quality: 1.0 },
            html2canvas: { 
                scale: 3, 
                useCORS: true,
                letterRendering: false,
                allowTaint: true,
                backgroundColor: "#ffffff"
            },
            jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape', compress: true }
        };
        
        Swal.fire({
            title: isAr ? 'جاري تحضير التقرير...' : 'Preparing Report...',
            didOpen: () => { Swal.showLoading(); },
            allowOutsideClick: false,
            showConfirmButton: false
        });

        html2pdf().set(opt).from(element).save().then(() => {
            // 3. Restore visibility and layout
            noPrintElements.forEach(el => el.style.display = '');
            element.classList.remove('pdf-capture-mode');
            Swal.close();
        }).catch(err => {
            noPrintElements.forEach(el => el.style.display = '');
            element.classList.remove('pdf-capture-mode');
            console.error("PDF Error:", err);
            Swal.fire({ icon: 'error', title: 'PDF Error', text: err.message });
        });
    } catch (err) {
        console.error("Export Error:", err);
        Swal.fire({ icon: 'error', title: 'Error', text: err.message });
    }
}

function exportToExcel() {
    try {
        if (!allInventory || allInventory.length === 0) {
            Swal.fire({ icon: 'warning', title: isAr ? 'لا توجد بيانات لتصديرها' : 'No data to export' });
            return;
        }

        Swal.fire({
            title: isAr ? 'جاري تجهيز ملف الأكسيل...' : 'Preparing Excel...',
            didOpen: () => { Swal.showLoading(); },
            allowOutsideClick: false,
            showConfirmButton: false
        });

        // Prepare data with clean formatting
        const excelData = allInventory.map(item => {
            let addedDate = '-';
            let expiryDate = '-';
            try {
                if (item.createdAt) addedDate = new Date(item.createdAt).toISOString().split('T')[0];
                if (item.expiryDate) expiryDate = new Date(item.expiryDate).toISOString().split('T')[0];
            } catch (e) { console.error(e); }

            return {
                [isAr ? 'كود' : 'ID']: item.id,
                [isAr ? 'اسم الصنف' : 'Name']: item.name,
                [isAr ? 'الكمية' : 'Quantity']: item.quantity,
                [isAr ? 'الحد الأدنى' : 'Min Limit']: item.min || 0,
                [isAr ? 'سعر الوحدة' : 'Unit Cost']: item.unitCost || 0,
                [isAr ? 'إجمالي القيمة' : 'Total Value']: (item.quantity * (item.unitCost || 0)).toFixed(2),
                [isAr ? 'تاريخ الإضافة' : 'Added Date']: addedDate,
                [isAr ? 'تاريخ الانتهاء' : 'Expiry Date']: expiryDate
            };
        });

        const ws = XLSX.utils.json_to_sheet(excelData);
        const wscols = [
            {wch: 10}, {wch: 30}, {wch: 12}, {wch: 12}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 15}
        ];
        ws['!cols'] = wscols;

        const wb = XLSX.utils.book_new();
        
        // 🛠️ Proper Workbook-level RTL setting
        if (!wb.Workbook) wb.Workbook = {};
        if (!wb.Workbook.Views) wb.Workbook.Views = [];
        wb.Workbook.Views[0] = { RTL: isAr };

        XLSX.utils.book_append_sheet(wb, ws, isAr ? "المخزن" : "Inventory");

        XLSX.writeFile(wb, `vortex_inventory_${new Date().toISOString().split('T')[0]}.xlsx`);
        
        Swal.close();
    } catch (err) {
        console.error("Excel Error:", err);
        Swal.fire({ icon: 'error', title: 'Excel Error', text: err.message });
    }
}