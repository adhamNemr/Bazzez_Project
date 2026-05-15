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
        tableAdded: 'آخر تحديث',
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
        exportExcel: 'تصدير Excel',
        colorTotal: 'إجمالي الخامة',
        other: 'أخرى',
        size: 'مقاس:'
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
        tableAdded: 'Updated Date',
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
        exportExcel: 'Export Excel',
        colorTotal: 'Fabric Total',
        other: 'Other',
        size: 'Size:'
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

    // 🌐 Global Arabic to English Number Converter (Reliable for Mobile/Pasting/IME)
    document.addEventListener('input', function(e) {
        if (e.target.tagName.toLowerCase() === 'input' || e.target.tagName.toLowerCase() === 'textarea') {
            const arabicNumbers = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
            let value = e.target.value;
            let hasArabic = false;
            
            for (let i = 0; i < 10; i++) {
                if (arabicNumbers[i].test(value)) {
                    value = value.replace(arabicNumbers[i], i);
                    hasArabic = true;
                }
            }
            
            if (hasArabic) {
                const start = e.target.selectionStart;
                const end = e.target.selectionEnd;
                e.target.value = value;
                try {
                    e.target.setSelectionRange(start, end);
                } catch(err) {} // Fallback for inputs that don't support selection
            }
        }
    });
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

function fetchInventory(force = false) {
    // 🛑 Prevent auto-refresh from collapsing the tree if user is interacting (unless forced)
    if (document.querySelector('.expanded-row') && !force) return;

    const token = localStorage.getItem("token");
    const tableBody = document.getElementById('product-table');
    if (tableBody.innerHTML === '') showLoading();

    fetch('/api/inventory', {
        headers: { "Authorization": `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
       

        allInventory = data;
        applyFilter();
    })
    .catch(err => {
        console.error("❌ Error fetching inventory:", err);
        tableBody.innerHTML = `<tr><td colspan="8" style="padding: 4rem; color: #ef4444;">${t[currentLang].msgError}</td></tr>`;
    });
}

function renderInventory(items) {
    const tableBody = document.getElementById('product-table');
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

    // 🚀 Performance Optimization: Use a single string join to minimize DOM reflows
    const tableRows = items.map(item => {
        const hasVariants = item.variants && item.variants.length > 0;
        
        let totalQty = parseFloat(item.quantity || 0);
        let totalMin = parseFloat(item.min || 0);
        let totalValue = 0;
        let latestUpdateDate = item.updatedAt || item.createdAt || new Date().toISOString();
        let hasLowStockVariant = false;

        if (hasVariants) {
            const variantsSum = item.variants.reduce((sum, v) => sum + parseFloat(v.quantity || 0), 0);
            totalQty = variantsSum;
            totalMin = item.variants.reduce((sum, v) => sum + parseFloat(v.min || 0), 0);
            
            if (totalQty > variantsSum) {
                totalValue = totalQty * parseFloat(item.cost || 0);
            } else {
                totalValue = item.variants.reduce((sum, v) => sum + (parseFloat(v.quantity || 0) * parseFloat(v.cost || item.cost || 0)), 0);
            }
            
            item.variants.forEach(v => {
                const vDate = v.updatedAt || v.createdAt;
                if (vDate && new Date(vDate) > new Date(latestUpdateDate)) latestUpdateDate = vDate;
                const vMin = parseFloat(v.min || 0);
                const vQty = parseFloat(v.quantity || 0);
                if (vMin > 0 && vQty <= vMin) hasLowStockVariant = true;
            });
        } else {
            totalValue = totalQty * parseFloat(item.cost || 0);
        }

        const isLow = totalQty <= totalMin || hasLowStockVariant;
        const isNearExpiry = !isRetail && checkIfNearExpiry(item.expiryDate);
        const formattedQty = isRetail ? Math.round(totalQty) : totalQty.toFixed(2);
        
        let toggleIconHTML = hasVariants 
            ? `<i class="fas fa-chevron-left toggle-icon" style="cursor:pointer; margin-left:8px; color:var(--luxury-emerald); transition: transform 0.3s; width: 15px; text-align: center;"></i>` 
            : `<span style="display:inline-block; width:23px;"></span>`;

        if (!isAr && hasVariants) {
            toggleIconHTML = `<i class="fas fa-chevron-right toggle-icon" style="cursor:pointer; margin-right:8px; color:var(--luxury-emerald); transition: transform 0.3s; width: 15px; text-align: center;"></i>`;
        }

        const formattedMin = hasVariants 
            ? (isRetail ? Math.round(totalMin) : totalMin.toFixed(2)) 
            : (isRetail ? Math.round(item.min || 0) : parseFloat(item.min || 0).toFixed(2));

        const expiryWarningHTML = isNearExpiry ? `<i class="fas fa-exclamation-circle expiry-pulse" title="${isAr ? 'قرب الانتهاء' : 'Expiring Soon'}"></i>` : '';

        const editParentBtnHTML = `
            <button class="edit-parent-btn" data-id="${item.id}" style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); width: 32px; height: 32px; border-radius: 8px; color: var(--luxury-emerald); cursor: pointer; transition: 0.3s; display: flex; align-items: center; justify-content: center;">
                <i class="fas fa-edit" style="font-size: 0.85rem;"></i>
            </button>
        `;

        // 🏗️ Build Parent Row HTML
        let rowHtml = `
            <tr class="${hasVariants ? 'parent-row' : ''} ${isNearExpiry ? 'row-near-expiry' : ''}" data-id="${item.id}" style="${hasVariants ? 'cursor:pointer;' : ''}">
                <td style="color: #64748b; font-family: monospace; font-weight: 800;">#${item.id} ${toggleIconHTML}</td>
                <td style="font-weight: 800; color: var(--luxury-emerald);">
                    <div style="display: flex; align-items: center; justify-content: center; gap: 12px; min-width: 200px;">
                        <span style="flex: 1; text-align: center;">${item.name} ${expiryWarningHTML}</span>
                        <div style="width: 40px; display: flex; justify-content: center;">
                            ${editParentBtnHTML}
                        </div>
                    </div>
                </td>
                <td><span class="${isLow ? 'badge-low' : 'badge-ok'}">${formattedQty}</span></td>
                <td style="color: #64748b; font-weight: 800;">${formattedMin}</td>
                <td style="opacity: ${hasVariants ? '0.3' : '1'}; color: #64748b;">${hasVariants ? '---' : parseFloat(item.cost || 0).toFixed(2)} <small>EGP</small></td>
                <td style="opacity: ${hasVariants ? '0.3' : '1'}; color: var(--luxury-emerald); font-weight: 800;">${hasVariants ? '---' : (parseFloat(item.price || item.cost || 0)).toFixed(2)} <small>EGP</small></td>
                <td style="font-weight: 800; color: var(--luxury-emerald);">${totalValue.toFixed(2)} <small>EGP</small></td>
                <td style="font-size: 0.9rem; color: #64748b; font-weight: 800;">${formatDate(latestUpdateDate)}</td>
                ${!isRetail ? `<td style="font-size: 0.85rem; font-weight: 700; color: ${isNearExpiry ? '#ef4444' : 'inherit'};">${formatDate(item.expiryDate)}</td>` : ''}
            </tr>
        `;

        // 🏗️ Build Child Rows (Variants)
        if (hasVariants) {
            const langT = t[currentLang];
            const colorGroupBaseClass = `color-group-${item.id}`;
            const branchIcon = isAr ? '<i class="fas fa-level-down-alt fa-rotate-90" style="margin-left: 10px; color:#cbd5e1;"></i>' : '<i class="fas fa-level-up-alt fa-rotate-90" style="margin-right: 10px; color:#cbd5e1;"></i>';

            item.variants.forEach((variant, vIdx) => {
                const variantQty = isRetail ? Math.round(variant.quantity) : parseFloat(variant.quantity).toFixed(2);
                const isVLow = variant.quantity <= (variant.min || 0);

                rowHtml += `
                    <tr class="${colorGroupBaseClass} tree-child-row tree-level-2" data-pid="${item.id}" data-vidx="${vIdx}" style="display: none; cursor: pointer;">
                        <!-- 1. ID Column (Hierarchy Icon) -->
                        <td style="text-align: center; color: #64748b; font-weight: 800;">${branchIcon}</td>
                        
                        <!-- 2. Name Column (Indented) -->
                        <td style="font-weight: 700; color: #475569;">
                            <div style="display: flex; align-items: center; justify-content: center; gap: 10px; min-width: 200px;">
                                <span style="flex: 1; text-align: center;">${variant.name || (isAr ? 'بدون اسم' : 'Unnamed')}</span>
                                <div style="width: 40px; display: flex; justify-content: center; opacity: 0.4; font-size: 0.9rem;">
                                    <i class="fas fa-shirt"></i>
                                </div>
                            </div>
                        </td>

                        <!-- 3. Qty Column -->
                        <td><span class="${isVLow ? 'badge-low' : 'badge-ok'}" style="transform: scale(0.9);">${variantQty}</span></td>
                        
                        <!-- 4. Min Column -->
                        <td style="color: #64748b; font-size: 0.9rem; font-weight: 800;">${isRetail ? Math.round(variant.min || 0) : (variant.min || 0).toFixed(2)}</td>
                        
                        <!-- 5. Cost Column -->
                        <td style="font-size: 0.95rem; color: #64748b; font-weight: 800;">${parseFloat(variant.cost || item.cost || 0).toFixed(2)} <small>EGP</small></td>
                        
                        <!-- 6. Price Column -->
                        <td style="font-size: 0.9rem; color: var(--luxury-emerald); font-weight: 800;">${parseFloat(variant.price || variant.cost || item.cost || 0).toFixed(2)} <small>EGP</small></td>
                        
                        <!-- 7. Total Column -->
                        <td style="font-weight: 800; color: var(--luxury-emerald); font-size: 0.9rem;">${((variant.quantity || 0) * (variant.cost || item.cost || 0)).toFixed(2)} <small>EGP</small></td>
                        
                        <!-- 8. Added Column -->
                        <td style="font-size: 0.9rem; color: #64748b; font-weight: 800;">${formatDate(variant.updatedAt || variant.createdAt || new Date())}</td>
                        
                        <!-- 9. Expiry Column (If not retail) -->
                        ${!isRetail ? `<td style="font-size: 0.8rem; opacity: 0.5;">---</td>` : ''}
                    </tr>
                `;
            });

            // Add Variant Row
            rowHtml += `
                <tr class="${colorGroupBaseClass} child-row tree-child-row tree-level-2 add-action-row" data-pid="${item.id}" data-action="add-variant" style="display: none; cursor: pointer;">
                    <td style="opacity: 0.3; text-align: center;">${branchIcon}</td>
                    <td colspan="${isRetail ? 7 : 8}" style="text-align: center; color: var(--luxury-emerald); font-weight: 700; font-size: 0.85rem;">
                        <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                            <i class="fas fa-plus-circle"></i> 
                            <span>${isAr ? 'إضافة خامة/لون جديد' : 'Add new fabric/color'}</span>
                        </div>
                    </td>
                </tr>
            `;
        }

        return rowHtml;
    }).join('');

    tableBody.innerHTML = tableRows + `
        <tr class="spacer-row" style="height: 30px; border: none; pointer-events: none;"><td colspan="${isRetail ? 8 : 9}" style="border:none;"></td></tr>
    `;

    // ⚡ Attach Event Listeners to the newly created DOM elements
    attachInventoryListeners();
}

function attachInventoryListeners() {
    const tableBody = document.getElementById('product-table');
    
    // 🟢 Level 1: Parent Rows & Expansion
    tableBody.querySelectorAll('.parent-row').forEach(row => {
        const id = row.dataset.id;
        const item = allInventory.find(i => i.id == id);
        if (!item) return;

        row.addEventListener('click', (e) => {
            if (e.target.closest('.edit-parent-btn')) return; // Handled separately

            const isExpanded = row.classList.contains('expanded-row');
            
            // Accordion: Close others
            if (!isExpanded) {
                tableBody.querySelectorAll('.parent-row.expanded-row').forEach(other => {
                    if (other !== row) other.click();
                });
            }

            row.classList.toggle('expanded-row');
            row.classList.toggle('tree-node-expanded');
            
            const icon = row.querySelector('.toggle-icon');
            if (icon) icon.style.transform = !isExpanded ? 'rotate(90deg)' : 'rotate(0deg)';

            const children = tableBody.querySelectorAll(`.color-group-${id}`);
            children.forEach(c => {
                c.style.display = !isExpanded ? 'table-row' : 'none';
            });
        });

        const editBtn = row.querySelector('.edit-parent-btn');
        if (editBtn) {
            editBtn.onclick = (e) => { e.stopPropagation(); selectItem(item); };
        }
    });

    // Handle Simple Rows (No Variants)
    tableBody.querySelectorAll('tr:not(.parent-row):not(.tree-child-row)').forEach(row => {
        if (row.dataset.id) {
            const item = allInventory.find(i => i.id == row.dataset.id);
            if (item) row.onclick = () => selectItem(item);
        }
    });

    // 🟢 Level 2: Variant Interactions
    tableBody.querySelectorAll('.tree-child-row').forEach(row => {
        const pid = row.dataset.pid;
        const vidx = row.dataset.vidx;
        const action = row.dataset.action;
        const item = allInventory.find(i => i.id == pid);
        if (!item) return;

        row.onclick = async (e) => {
            e.stopPropagation();
            if (action === 'add-variant') {
                const newV = await openVariantEntryModal(isAr, t[currentLang], { cost: item.cost });
                if (newV) handleEdit(item.id, { ...item, variants: [...(item.variants || []), newV] });
            } else if (vidx !== undefined) {
                const variant = item.variants[vidx];
                const updated = await openVariantEntryModal(isAr, t[currentLang], variant);
                if (updated) {
                    const newVs = [...item.variants];
                    newVs[vidx] = updated;
                    handleEdit(item.id, { ...item, variants: newVs });
                }
            }
        };
    });
}

function updateStats(items) {
    const isRetail = (localStorage.getItem('systemMode') || 'restaurant') === 'retail';
    const lowStock = items.filter(i => i.quantity <= (i.min || 0)).length;
    const expiring = items.filter(i => checkIfNearExpiry(i.expiryDate)).length;

    const totalEl = document.getElementById('stat-total-items');
    const lowEl   = document.getElementById('stat-low-stock');
    const expEl   = document.getElementById('stat-near-expiry');
    
    if (totalEl) totalEl.textContent = items.length;
    if (lowEl)   lowEl.textContent   = lowStock;
    if (expEl) {
        expEl.textContent = expiring;
        // 🛑 Hide card in retail mode
        const card = expEl.closest('.stat-card');
        if (card) card.style.display = isRetail ? 'none' : 'flex';
    }
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

async function openVariantEntryModal(isAr, langT, initialData = null) {
    const { value: variant } = await Swal.fire({
        title: isAr ? (initialData?.name ? 'تعديل تفريعة' : 'إضافة تفريعة') : (initialData?.name ? 'Edit Variant' : 'Add Variant'),
        html: `
            <div style="display: grid; grid-template-columns: 1fr; gap: 1rem; padding: 1rem; text-align: ${isAr ? 'right' : 'left'};">
                <div>
                    <label style="display:block; font-weight:700; margin-bottom:5px;">${isAr ? 'الاسم / الخامة' : 'Name / Fabric'}</label>
                    <input id="v-name" class="swal2-input" style="width:100%; margin:0;" value="${initialData?.name || ''}" placeholder="${isAr ? 'أحمر' : 'Red'}" ${initialData?.name ? 'disabled' : ''}>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div>
                        <label style="display:block; font-weight:700; margin-bottom:5px;">${langT.tableQty}</label>
                        <input id="v-qty" type="text" inputmode="decimal" class="swal2-input" style="width:100%; margin:0;" value="${initialData && initialData.quantity !== undefined ? initialData.quantity : ''}" placeholder="0" oninput="this.value = this.value.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[^0-9.-]/g, '')">
                    </div>
                    <div>
                        <label style="display:block; font-weight:700; margin-bottom:5px;">${langT.tableMin}</label>
                        <input id="v-min" type="text" inputmode="decimal" class="swal2-input" style="width:100%; margin:0;" value="${initialData && initialData.min !== undefined ? initialData.min : ''}" placeholder="0" oninput="this.value = this.value.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[^0-9.-]/g, '')">
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div>
                        <label style="display:block; font-weight:700; margin-bottom:5px; color: #008060;">${isAr ? '💰 سعر البيع' : '💰 Selling Price'}</label>
                        <input id="v-price" type="text" inputmode="decimal" class="swal2-input" style="width:100%; margin:0; border-color: #008060;" value="${initialData && initialData.price !== undefined ? initialData.price : (initialData?.cost || '')}" placeholder="0.00" oninput="this.value = this.value.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[^0-9.]/g, '')">
                    </div>
                    <div>
                        <label style="display:block; font-weight:700; margin-bottom:5px; color: #ca8a04;">${isAr ? '📦 سعر التكلفة' : '📦 Cost Price'}</label>
                        <input id="v-cost" type="text" inputmode="decimal" class="swal2-input" style="width:100%; margin:0;" value="${initialData && initialData.cost !== undefined ? initialData.cost : ''}" placeholder="0.00" oninput="this.value = this.value.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[^0-9.]/g, '')">
                    </div>
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: isAr ? 'حفظ' : 'Save',
        cancelButtonText: langT.cancelBtn,
        confirmButtonColor: 'var(--luxury-emerald)',
        preConfirm: () => {
            const name = document.getElementById('v-name').value.trim();
            if (!name) return Swal.showValidationMessage(isAr ? 'يرجى إدخال الاسم' : 'Name is required');
            const price = parseFloat(document.getElementById('v-price').value) || 0;
            const cost = parseFloat(document.getElementById('v-cost').value) || 0;
            if (price <= 0) return Swal.showValidationMessage(isAr ? 'يرجى إدخال سعر البيع' : 'Selling price is required');
            return {
                name,
                color: name,
                quantity: parseFloat(document.getElementById('v-qty').value) || 0,
                min: parseFloat(document.getElementById('v-min').value) || 0,
                price,
                cost
            };
        }
    });
    return variant;
}

async function openAddModal(preExistingData = null) {
    const isRetail = (localStorage.getItem('systemMode') || 'restaurant') === 'retail';
    const langT = t[currentLang];
    
    const state = preExistingData || {
        name: '', quantity: 0, min: 0, cost: 0, expiryDate: '', variants: []
    };

    const { value: formValues, isConfirmed } = await Swal.fire({
        title: langT.addTitle,
        html: `
            <div style="padding: 1rem; text-align: ${isAr ? 'right' : 'left'};">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div style="grid-column: span 2;">
                        <label style="display:block; font-weight:700; margin-bottom:5px;">${langT.tableName}</label>
                        <input id="swal-name" class="swal2-input" style="width:100%; margin:0;" value="${state.name}" placeholder="${langT.tableName}">
                    </div>
                    <div>
                        <label style="display:block; font-weight:700; margin-bottom:5px;">${langT.tableQty}</label>
                        <input id="swal-qty" type="text" class="swal2-input" style="width:100%; margin:0;" value="${state.quantity}">
                    </div>
                    <div>
                        <label style="display:block; font-weight:700; margin-bottom:5px;">${langT.tableMin}</label>
                        <input id="swal-min" type="text" class="swal2-input" style="width:100%; margin:0;" value="${state.min}">
                    </div>
                    <div>
                        <label style="display:block; font-weight:700; margin-bottom:5px;">${langT.tableCost}</label>
                        <input id="swal-cost" type="text" class="swal2-input" style="width:100%; margin:0;" value="${state.cost}">
                    </div>
                    ${!isRetail ? `
                    <div>
                        <label style="display:block; font-weight:700; margin-bottom:5px;">${langT.tableExpiry}</label>
                        <input id="swal-expiry" type="date" class="swal2-input" style="width:100%; margin:0;" value="${state.expiryDate}">
                    </div>
                    ` : ''}
                </div>

                <div id="variants-summary-list" style="margin-top: 1.5rem; border-top: 2px dashed #e2e8f0; padding-top: 1rem;">
                    ${state.variants.length > 0 ? state.variants.map((v, i) => `
                        <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 10px; border-radius: 8px; margin-bottom: 5px; border: 1px solid #e2e8f0;">
                            <div>
                                <strong style="color: var(--luxury-emerald);">${v.name}</strong> 
                                <small style="opacity: 0.7;">Qty: ${v.quantity || 0} | Price: ${v.price || 0} EGP</small>
                            </div>
                            <div style="display: flex; gap: 10px;">
                                <button type="button" class="edit-v-btn" data-index="${i}" style="background:none; border:none; color:var(--luxury-emerald); cursor:pointer;"><i class="fas fa-edit"></i></button>
                                <button type="button" class="del-v-btn" data-index="${i}" style="background:none; border:none; color:#ef4444; cursor:pointer;"><i class="fas fa-trash"></i></button>
                            </div>
                        </div>
                    `).join('') : `<p style="text-align:center; opacity:0.5;">${isAr ? 'لا يوجد تفريعات' : 'No variants'}</p>`}
                </div>

                <div style="margin-top: 1rem;">
                    <button type="button" id="btn-add-variant-modal" style="width:100%; height: 45px; border-radius: 8px; border: 2px dashed var(--luxury-emerald); background: transparent; color: var(--luxury-emerald); font-weight: bold; cursor: pointer;">
                        <i class="fas fa-plus"></i> ${isAr ? 'إضافة تفريعة' : 'Add Variant'}
                    </button>
                </div>
            </div>
        `,
        didOpen: () => {
            const getCur = () => ({
                name: document.getElementById('swal-name').value,
                quantity: document.getElementById('swal-qty').value,
                min: document.getElementById('swal-min').value,
                cost: document.getElementById('swal-cost').value,
                expiryDate: !isRetail ? document.getElementById('swal-expiry').value : '',
                variants: state.variants
            });

            document.getElementById('btn-add-variant-modal').onclick = async () => {
                const cur = getCur();
                const v = await openVariantEntryModal(isAr, langT, { min: cur.min, cost: cur.cost });
                if (v) { cur.variants.push(v); openAddModal(cur); }
                else openAddModal(cur);
            };

            document.querySelectorAll('.edit-v-btn').forEach(btn => {
                btn.onclick = async () => {
                    const idx = btn.dataset.index;
                    const cur = getCur();
                    const updated = await openVariantEntryModal(isAr, langT, cur.variants[idx]);
                    if (updated) { cur.variants[idx] = updated; openAddModal(cur); }
                    else openAddModal(cur);
                };
            });

            document.querySelectorAll('.del-v-btn').forEach(btn => {
                btn.onclick = () => {
                    const idx = btn.dataset.index;
                    const cur = getCur();
                    cur.variants.splice(idx, 1);
                    openAddModal(cur);
                };
            });
        },
        preConfirm: () => {
            const name = document.getElementById('swal-name').value.trim();
            if (!name) return Swal.showValidationMessage(isAr ? 'يرجى إدخال الاسم' : 'Name is required');
            return {
                name,
                quantity: parseFloat(document.getElementById('swal-qty').value) || 0,
                min: parseFloat(document.getElementById('swal-min').value) || 0,
                cost: parseFloat(document.getElementById('swal-cost').value) || 0,
                expiryDate: !isRetail ? document.getElementById('swal-expiry').value : null,
                variants: state.variants
            };
        }
    });

    if (isConfirmed && formValues) handleFormSubmit(formValues);
}

async function selectItem(item, preExistingData = null) {
    const isRetail = (localStorage.getItem('systemMode') || 'restaurant') === 'retail';
    const langT = t[currentLang];

    const state = preExistingData || {
        name: item.name,
        quantity: isRetail ? Math.round(item.quantity) : item.quantity,
        min: isRetail ? Math.round(item.min || 0) : (item.min || 0),
        cost: item.cost,
        expiryDate: item.expiryDate ? item.expiryDate.split('T')[0] : '',
        variants: item.variants ? [...item.variants] : []
    };

    const { value: result, isConfirmed, isDenied } = await Swal.fire({
        title: `${langT.editTitle}: ${state.name}`,
        html: `
            <div style="padding: 1rem; text-align: ${isAr ? 'right' : 'left'};">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div style="grid-column: span 2;">
                        <label style="display:block; font-weight:700; margin-bottom:5px;">${langT.tableName}</label>
                        <input id="swal-edit-name" class="swal2-input" value="${state.name}" style="width:100%; margin:0;">
                    </div>
                    <div>
                        <label style="display:block; font-weight:700; margin-bottom:5px;">${langT.tableQty}</label>
                        <input id="swal-edit-qty" type="text" inputmode="decimal" class="swal2-input" value="${state.quantity}" style="width:100%; margin:0;" oninput="this.value = this.value.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[^0-9.-]/g, '')">
                    </div>
                    <div>
                        <label style="display:block; font-weight:700; margin-bottom:5px;">${langT.tableMin}</label>
                        <input id="swal-edit-min" type="text" inputmode="decimal" class="swal2-input" value="${state.min}" style="width:100%; margin:0;" oninput="this.value = this.value.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[^0-9.-]/g, '')">
                    </div>
                    <div>
                        <label style="display:block; font-weight:700; margin-bottom:5px;">${langT.tableCost}</label>
                        <input id="swal-edit-cost" type="text" inputmode="decimal" class="swal2-input" value="${state.cost}" style="width:100%; margin:0;" oninput="this.value = this.value.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[^0-9.-]/g, '')">
                    </div>
                    ${!isRetail ? `
                    <div>
                        <label style="display:block; font-weight:700; margin-bottom:5px;">${langT.tableExpiry}</label>
                        <input id="swal-edit-expiry" type="date" class="swal2-input" value="${state.expiryDate}" style="width:100%; margin:0;">
                    </div>
                    ` : ''}
                </div>

                <div id="variants-summary-list" style="margin-top: 1.5rem; border-top: 2px dashed #e2e8f0; padding-top: 1rem;">
                    ${state.variants.length > 0 ? state.variants.map((v, i) => `
                        <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 10px; border-radius: 8px; margin-bottom: 5px; border: 1px solid #e2e8f0;">
                            <div>
                                <strong style="color: var(--luxury-emerald);">${v.name || v.color}</strong> 
                                <small style="opacity: 0.7;">(${v.size || '-'}) | Qty: ${v.quantity || 0} | Price: ${v.price || 0} EGP</small>
                            </div>
                            <div style="display: flex; gap: 10px;">
                                <button type="button" class="edit-v-btn" data-index="${i}" style="background:none; border:none; color:var(--luxury-emerald); cursor:pointer;"><i class="fas fa-edit"></i></button>
                                <button type="button" class="del-v-btn" data-index="${i}" style="background:none; border:none; color:#ef4444; cursor:pointer;"><i class="fas fa-trash"></i></button>
                            </div>
                        </div>
                    `).join('') : `<p style="text-align:center; opacity:0.5;">${isAr ? 'لا يوجد تفريعات' : 'No variants'}</p>`}
                </div>

                <div style="margin-top: 1rem;">
                    <button type="button" id="btn-add-variant-modal" style="width:100%; height: 45px; border-radius: 8px; border: 2px dashed var(--luxury-emerald); background: transparent; color: var(--luxury-emerald); font-weight: bold; cursor: pointer;">
                        <i class="fas fa-plus"></i> ${isAr ? 'إضافة تفريعة' : 'Add Variant'}
                    </button>
                </div>
            </div>
        `,
        didOpen: () => {
            const getCur = () => ({
                name: document.getElementById('swal-edit-name').value,
                quantity: document.getElementById('swal-edit-qty').value,
                min: document.getElementById('swal-edit-min').value,
                cost: document.getElementById('swal-edit-cost').value,
                expiryDate: !isRetail ? document.getElementById('swal-edit-expiry').value : '',
                variants: state.variants
            });

            document.getElementById('btn-add-variant-modal').onclick = async () => {
                const cur = getCur();
                const v = await openVariantEntryModal(isAr, langT, { min: cur.min, cost: cur.cost });
                if (v) { cur.variants.push(v); selectItem(item, cur); }
                else selectItem(item, cur);
            };

            document.querySelectorAll('.edit-v-btn').forEach(btn => {
                btn.onclick = async () => {
                    const idx = btn.dataset.index;
                    const cur = getCur();
                    const updated = await openVariantEntryModal(isAr, langT, cur.variants[idx]);
                    if (updated) { cur.variants[idx] = updated; selectItem(item, cur); }
                    else selectItem(item, cur);
                };
            });

            document.querySelectorAll('.del-v-btn').forEach(btn => {
                btn.onclick = () => {
                    const idx = btn.dataset.index;
                    const cur = getCur();
                    cur.variants.splice(idx, 1);
                    selectItem(item, cur);
                };
            });
        },
        showDenyButton: true,
        confirmButtonText: langT.saveChanges,
        denyButtonText: langT.deleteItem,
        confirmButtonColor: 'var(--luxury-emerald)',
        denyButtonColor: '#ef4444',
        preConfirm: () => {
            const name = document.getElementById('swal-edit-name').value.trim();
            if (!name) return Swal.showValidationMessage(isAr ? 'يرجى إدخال اسم الصنف' : 'Name is required');
            
            const parentQty = parseFloat(document.getElementById('swal-edit-qty').value) || 0;
            const variantsSum = state.variants.reduce((sum, v) => sum + parseFloat(v.quantity || 0), 0);
            
            let variantsToSave = [...state.variants];
            
            // 🧠 Rule: If parent quantity is explicitly set and different from the variants sum,
            // we assume the user wants "Bulk Tracking". Zero out the children quantities AND min.
            if (parentQty > 0 && parentQty !== variantsSum) {
                variantsToSave = variantsToSave.map(v => ({ ...v, quantity: 0, min: 0 }));
            }

            return {
                name,
                quantity: parentQty,
                min: parseFloat(document.getElementById('swal-edit-min').value) || 0,
                cost: parseFloat(document.getElementById('swal-edit-cost').value) || 0,
                expiryDate: !isRetail ? document.getElementById('swal-edit-expiry').value : null,
                variants: variantsToSave
            };
        }
    });

    if (isConfirmed) handleEdit(item.id, result);
    else if (isDenied) handleDelete(item.id);
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
            fetchInventory(true);
        } else {
            const err = await res.json().catch(() => ({}));
            Swal.fire({ icon: 'error', title: t[currentLang].msgError, text: err.error || `Server: ${res.status}` });
        }
    } catch (err) {
        Swal.fire({ icon: 'error', title: t[currentLang].msgError });
    }
}

async function handleEdit(id, data) {
    if (typeof id === 'string' && id.includes('-') || parseInt(id) >= 1000) {
        Swal.fire({ icon: 'info', title: isAr ? 'هذه بيانات تجريبية (Mock Data) للتوضيح فقط ولا يمكن تعديلها في قاعدة البيانات حالياً' : 'This is mock data for demonstration and cannot be edited in the DB yet.' });
        return;
    }

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
            fetchInventory(true);
        } else {
            Swal.fire({ icon: 'error', title: t[currentLang].msgError, text: `Server returned ${res.status}` });
        }
    } catch (err) {
        Swal.fire({ icon: 'error', title: t[currentLang].msgError });
    }
}

async function handleDelete(id) {
    if (typeof id === 'string' && id.includes('-') || parseInt(id) >= 1000) {
        Swal.fire({ icon: 'info', title: isAr ? 'هذه بيانات تجريبية (Mock Data) للتوضيح فقط ولا يمكن حذفها' : 'This is mock data and cannot be deleted.' });
        return;
    }

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
            fetchInventory(true);
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
            filtered = filtered.filter(item => {
                const hasVariants = item.variants && item.variants.length > 0;
                if (hasVariants) {
                    const totalQty = item.variants.reduce((sum, v) => sum + parseFloat(v.quantity || 0), 0);
                    const totalMin = item.variants.reduce((sum, v) => sum + parseFloat(v.min || 0), 0);
                    const hasLowVariant = item.variants.some(v => parseFloat(v.quantity || 0) <= parseFloat(v.min || 0));
                    return totalQty <= totalMin || hasLowVariant;
                } else {
                    const q = parseFloat(item.quantity || 0);
                    const m = parseFloat(item.min || 0);
                    return q <= m;
                }
            });
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