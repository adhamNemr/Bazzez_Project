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
        exportPdf: 'تصدير PDF',
        exportExcel: 'تصدير Excel',
        home: 'الرئيسية'
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
        exportPdf: 'Export PDF',
        exportExcel: 'Export Excel',
        home: 'Home'
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
    
    // 🌍 Dynamic Layout Direction
    document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLang;

    document.getElementById('loc-header-pill').textContent = langT.pageTitle;
    document.getElementById('search-input').placeholder = langT.searchPlaceholder;
    document.getElementById('loc-stat-total').textContent = langT.totalItems;
    document.getElementById('loc-stat-low').textContent = langT.lowStock;
    document.getElementById('loc-stat-expiry').textContent = langT.nearExpiry;
    
    // Table Headers
    document.getElementById('loc-id').textContent = langT.tableId;
    document.getElementById('loc-name').textContent = langT.tableName;
    document.getElementById('loc-qty').textContent = langT.tableQty;
    document.getElementById('loc-min').textContent = langT.tableMin;
    document.getElementById('loc-cost').textContent = langT.tableCost;
    document.getElementById('loc-total').textContent = langT.tableTotal;
    document.getElementById('loc-added').textContent = langT.tableAdded;
    document.getElementById('loc-expiry').textContent = langT.tableExpiry;

    // Filter Options
    document.getElementById('loc-filter-all').textContent = langT.filterAll;
    document.getElementById('loc-filter-low').textContent = langT.filterLow;
    document.getElementById('loc-filter-expiry').textContent = langT.filterExpiry;

    // Form Button & Export
    document.getElementById('loc-btn-add').textContent = langT.btnAdd;
    document.getElementById('loc-pdf-text').textContent = langT.exportPdf;
    document.getElementById('loc-excel-text').textContent = langT.exportExcel;
    document.getElementById('loc-home').textContent = langT.home;

    // Placeholders
    document.getElementById('product-name').placeholder = langT.tableName;
    document.getElementById('product-quantity').placeholder = langT.tableQty;
    document.getElementById('product-min').placeholder = langT.tableMin;
    document.getElementById('product-cost').placeholder = langT.tableCost;
}

function setupEventListeners() {
    // Mode Switching
    const modeSelect = document.getElementById('system-mode');
    const savedMode = localStorage.getItem('systemMode') || 'restaurant';
    if (modeSelect) {
        modeSelect.value = savedMode;
        applySystemMode(savedMode);

        modeSelect.addEventListener('change', (e) => {
            localStorage.setItem('systemMode', e.target.value);
            applySystemMode(e.target.value);
        });
    }

    // Reset Form
    document.getElementById('reset-btn').addEventListener('click', resetForm);
    
    // Add/Edit Form
    document.getElementById('add-product-form').addEventListener('submit', handleFormSubmit);
}

function fetchInventory() {
    const token = localStorage.getItem("token");
    fetch('/api/inventory', {
        headers: { "Authorization": `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
        allInventory = data;
        renderInventory(data);
    })
    .catch(err => console.error("❌ Error fetching inventory:", err));
}

function applySystemMode(mode) {
    const isRetail = mode === 'retail';
    const expiryInput = document.getElementById('product-expiry');
    const expiryTh = document.getElementById('loc-expiry');
    const table = document.querySelector('.orders-table');
    
    // Hide/Show Expiry Input
    if (expiryInput) {
        expiryInput.style.display = isRetail ? 'none' : 'block';
        expiryInput.required = !isRetail;
    }
    
    // Hide/Show Expiry Table Column
    if (expiryTh) expiryTh.style.display = isRetail ? 'none' : 'table-cell';
    
    // Adjust Table Layout Widths for Retail Mode
    if (table) {
        const ths = table.querySelectorAll('th');
        if (isRetail) {
            ths[0].style.width = '8%';
            ths[1].style.width = '32%';
            ths[2].style.width = '15%';
            ths[3].style.width = '15%';
            ths[4].style.width = '15%';
            ths[5].style.width = '15%';
        } else {
            ths[0].style.width = '6%';
            ths[1].style.width = '22%';
            ths[2].style.width = '14%';
            ths[3].style.width = '10%';
            ths[4].style.width = '12%';
            ths[5].style.width = '12%';
            ths[6].style.width = '12%';
            ths[7].style.width = '12%';
        }
    }

    // Adjust Form Grid
    const formRow = document.querySelector('.form-inputs-row');
    if (formRow) {
        formRow.style.gridTemplateColumns = isRetail ? '2fr 1fr 1fr 1fr' : '2fr 1fr 1fr 1fr 1fr';
        // Enforce step on inputs
        document.getElementById('product-quantity').step = isRetail ? '1' : '0.01';
        document.getElementById('product-min').step = isRetail ? '1' : '0.01';
    }
    
    // Re-render table to hide/show cells
    renderInventory(allInventory);
}

function renderInventory(items) {
    const tableBody = document.getElementById('product-table');
    tableBody.innerHTML = '';
    const isRetail = (localStorage.getItem('systemMode') || 'restaurant') === 'retail';

    // Update Stats
    updateStats(items);

    if (items.length === 0) {
        const noResultRow = document.createElement('tr');
        noResultRow.innerHTML = `
            <td colspan="${isRetail ? 7 : 8}" style="padding: 5rem 2rem; text-align: center;">
                <div style="opacity: 0.3; margin-bottom: 1.5rem;">
                    <i class="fas fa-box-open" style="font-size: 4rem;"></i>
                </div>
                <h3 style="color: #64748b; font-weight: 700; margin-bottom: 0.5rem;">${t[currentLang].noResults}</h3>
                <p style="color: #94a3b8; font-size: 0.9rem;">${currentLang === 'ar' ? 'ابدأ بإضافة أصناف جديدة للمخزن لتظهر هنا' : 'Start adding new items to see them here'}</p>
            </td>
        `;
        tableBody.appendChild(noResultRow);
        fillEmptyRows(tableBody, 5, isRetail);
        return;
    }

    items.forEach(item => {
        const row = document.createElement('tr');
        const isLow = parseFloat(item.quantity) <= parseFloat(item.min || 0);
        const isNearExpiry = !isRetail && checkIfNearExpiry(item.expiryDate);
        
        // Dynamic Formatting based on Mode
        const formattedQty = isRetail ? Math.round(item.quantity) : parseFloat(item.quantity).toFixed(2);
        const formattedMin = isRetail ? Math.round(item.min || 0) : parseFloat(item.min || 0).toFixed(2);

        let statusBadge = '';
        if (isLow) {
            statusBadge = `<span class="badge" style="padding: 2px 8px; border-radius: 4px; font-size: 0.65rem; background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); font-weight: 700;">${currentLang === 'ar' ? 'نقص مخزون' : 'Low Stock'}</span>`;
        } else if (isNearExpiry) {
            statusBadge = `<span class="badge" style="padding: 2px 8px; border-radius: 4px; font-size: 0.65rem; background: rgba(245, 158, 11, 0.1); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.2); font-weight: 700;">${currentLang === 'ar' ? 'قرب الانتهاء' : 'Expiring'}</span>`;
        }

        row.innerHTML = `
            <td style="color: #94a3b8;">#${item.id}</td>
            <td>
                <div style="display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                    ${statusBadge}
                    <span style="font-weight: 700;">${item.name}</span>
                </div>
            </td>
            <td style="font-weight: 800; color: ${isLow ? '#ef4444' : 'var(--luxury-slate)'}">${formattedQty}</td>
            <td style="color: #64748b;">${formattedMin}</td>
            <td>${parseFloat(item.cost).toFixed(2)} <small>EGP</small></td>
            <td style="font-weight: 800; color: var(--luxury-emerald);">${(item.quantity * item.cost).toFixed(2)} <small>EGP</small></td>
            <td style="font-size: 0.85rem; color: #64748b;">${formatDate(item.createdAt)}</td>
            ${!isRetail ? `
            <td style="font-size: 0.85rem; font-weight: 700; color: ${isNearExpiry ? '#ef4444' : '#64748b'};">
                ${formatDate(item.expiryDate)}
            </td>` : ''}
        `;

        row.addEventListener('click', () => selectItem(item));
        tableBody.appendChild(row);
    });

    fillEmptyRows(tableBody, 8 - items.length, isRetail);
}

function fillEmptyRows(parent, count, isRetail) {
    if (count <= 0) return;
    const cols = isRetail ? 7 : 8;
    for (let i = 0; i < count; i++) {
        const row = document.createElement('tr');
        row.className = 'empty-row';
        row.innerHTML = Array(cols).fill('<td>&nbsp;</td>').join('');
        parent.appendChild(row);
    }
}

function updateStats(items) {
    const total = items.length;
    const lowStock = items.filter(i => i.quantity <= (i.min || 5)).length;
    const expiring = items.filter(i => checkIfNearExpiry(i.expiryDate)).length;

    document.getElementById('stat-total-items').textContent = total;
    document.getElementById('stat-low-stock').textContent = lowStock;
    document.getElementById('stat-near-expiry').textContent = expiring;
}

function checkIfNearExpiry(dateStr) {
    if (!dateStr) return false;
    const expiry = new Date(dateStr);
    const today = new Date();
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
}

function formatDate(dateStr) {
    if (!dateStr) return '---';
    const date = new Date(dateStr);
    return date.toLocaleDateString(currentLang === 'ar' ? 'ar-EG' : 'en-US', {
        day: '2-digit',
        month: 'short'
    });
}

async function selectItem(item) {
    const isRetail = (localStorage.getItem('systemMode') || 'restaurant') === 'retail';
    const langT = t[currentLang];
    
    const result = await Swal.fire({
        title: `${langT.editTitle}: ${item.name}`,
        html: `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; padding: 1rem 0; text-align: ${currentLang === 'ar' ? 'right' : 'left'};">
                <div class="swal-field" style="grid-column: span 2;">
                    <label>${langT.tableName}</label>
                    <input id="swal-name" class="swal2-input" value="${item.name}" placeholder="${langT.tableName}">
                </div>
                <div class="swal-field">
                    <label>${langT.tableQty}</label>
                    <input id="swal-quantity" type="number" step="${isRetail ? '1' : '0.01'}" class="swal2-input" value="${item.quantity}">
                </div>
                <div class="swal-field">
                    <label>${langT.tableMin}</label>
                    <input id="swal-min" type="number" step="${isRetail ? '1' : '0.01'}" class="swal2-input" value="${item.min || 0}">
                </div>
                <div class="swal-field">
                    <label>${langT.tableCost}</label>
                    <input id="swal-cost" type="number" step="0.01" class="swal2-input" value="${item.cost}">
                </div>
                ${!isRetail ? `
                <div class="swal-field">
                    <label>${langT.tableExpiry}</label>
                    <input id="swal-expiry" type="date" class="swal2-input" value="${item.expiryDate ? item.expiryDate.split('T')[0] : ''}">
                </div>` : ''}
            </div>
        `,
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: langT.saveChanges,
        denyButtonText: langT.deleteItem,
        cancelButtonText: langT.cancelBtn,
        confirmButtonColor: 'var(--primary)',
        denyButtonColor: '#ef4444',
        focusConfirm: false,
        preConfirm: () => {
            const name = document.getElementById('swal-name').value;
            const quantity = parseFloat(document.getElementById('swal-quantity').value);
            const min = parseFloat(document.getElementById('swal-min').value);
            const cost = parseFloat(document.getElementById('swal-cost').value);
            const expiryDate = !isRetail ? document.getElementById('swal-expiry').value : null;

            if (!name) {
                Swal.showValidationMessage(langT.msgEnterName);
                return false;
            }
            return { name, quantity, min, cost, expiryDate };
        }
    });

    if (result.isConfirmed) {
        handleEdit(item.id, result.value);
    } else if (result.isDenied) {
        handleDelete(item.id);
    }
}

function resetForm() {
    document.getElementById('add-product-form').reset();
    document.getElementById('product-id').value = '';
    
    // Switch to Add Mode
    document.getElementById('loc-btn-add').style.display = 'block';
    document.getElementById('edit-btn').style.display = 'none';
    document.getElementById('delete-btn').style.display = 'none';
    document.getElementById('reset-btn').style.display = 'none';
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const token = localStorage.getItem("token");
    const data = {
        name: document.getElementById('product-name').value,
        quantity: parseFloat(document.getElementById('product-quantity').value),
        min: parseFloat(document.getElementById('product-min').value),
        cost: parseFloat(document.getElementById('product-cost').value),
        expiryDate: document.getElementById('product-expiry').value
    };

    try {
        const res = await fetch("/api/inventory/add", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify(data)
        });

        if (res.ok) {
            Swal.fire({ icon: 'success', title: t[currentLang].msgAdded, timer: 1500, showConfirmButton: false });
            fetchInventory();
            resetForm();
        }
    } catch (err) {
        Swal.fire({ icon: 'error', title: t[currentLang].msgError });
    }
}

async function handleEdit(id, data) {
    const token = localStorage.getItem("token");
    const updatedData = {
        ...data,
        total: data.quantity * data.cost
    };

    try {
        const res = await fetch(`/api/inventory/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify(updatedData)
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

function applyFilter() {
    const query = document.getElementById('search-input').value.toLowerCase();
    const filter = document.getElementById('filter-option').value;
    
    let filtered = allInventory.filter(item => item.name.toLowerCase().includes(query));
    
    if (filter === 'low-stock') {
        filtered = filtered.filter(item => item.quantity <= (item.min || 5));
    } else if (filter === 'near-expiry') {
        filtered = filtered.filter(item => checkIfNearExpiry(item.expiryDate));
    }
    
    renderInventory(filtered);
}

function exportToPDF() {
    const element = document.querySelector(".products-card");
    const langSuffix = currentLang === 'ar' ? 'ar' : 'en';
    const opt = {
        margin:       0.5,
        filename:     `inventory_${langSuffix}_${new Date().toISOString().split('T')[0]}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'in', format: 'a4', orientation: 'landscape' }
    };
    
    // Check if library exists
    if (typeof html2pdf !== 'undefined') {
        html2pdf().set(opt).from(element).save();
    } else {
        Swal.fire({ icon: 'error', title: 'Library Error', text: 'PDF library not loaded' });
    }
}

function exportToExcel() {
    const table = document.querySelector(".orders-table");
    const wb = XLSX.utils.table_to_book(table);
    XLSX.writeFile(wb, `inventory_${new Date().toLocaleDateString()}.xlsx`);
}

function sortTable(n) {
    // Standard sorting logic...
    const table = document.querySelector(".orders-table");
    let rows, switching, i, x, y, shouldSwitch, dir, switchcount = 0;
    switching = true;
    dir = "asc";
    while (switching) {
        switching = false;
        rows = table.rows;
        for (i = 1; i < (rows.length - 1); i++) {
            if (rows[i].classList.contains('empty-row')) continue;
            shouldSwitch = false;
            x = rows[i].getElementsByTagName("TD")[n];
            y = rows[i + 1].getElementsByTagName("TD")[n];
            if (rows[i + 1].classList.contains('empty-row')) break;
            if (dir == "asc") {
                if (x.innerHTML.toLowerCase() > y.innerHTML.toLowerCase()) {
                    shouldSwitch = true;
                    break;
                }
            } else if (dir == "desc") {
                if (x.innerHTML.toLowerCase() < y.innerHTML.toLowerCase()) {
                    shouldSwitch = true;
                    break;
                }
            }
        }
        if (shouldSwitch) {
            rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
            switching = true;
            switchcount++;
        } else {
            if (switchcount == 0 && dir == "asc") {
                dir = "desc";
                switching = true;
            }
        }
    }
}