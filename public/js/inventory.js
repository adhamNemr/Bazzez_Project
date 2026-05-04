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
        colorTotal: 'إجمالي اللون',
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
        colorTotal: 'Color Total',
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
        const hasVariants = item.variants && item.variants.length > 0;
        
        // 📊 Aggregate Data for Parent (Level 1)
        let totalQty = parseFloat(item.quantity || 0);
        let totalMin = parseFloat(item.min || 0);
        let totalValue = totalQty * parseFloat(item.cost || 0);
        let latestUpdateDate = item.updatedAt || item.createdAt || new Date().toISOString();

        let hasLowStockVariant = false;

        if (hasVariants) {
            totalQty = item.variants.reduce((sum, v) => sum + parseFloat(v.quantity || 0), 0);
            totalMin = item.variants.reduce((sum, v) => sum + parseFloat(v.min || 0), 0);
            totalValue = item.variants.reduce((sum, v) => sum + (parseFloat(v.quantity || 0) * parseFloat(v.cost || item.cost || 0)), 0);
            
            // Find the most recent update across all variants and check for low stock
            item.variants.forEach(v => {
                const vDate = v.updatedAt || v.createdAt;
                if (vDate && new Date(vDate) > new Date(latestUpdateDate)) {
                    latestUpdateDate = vDate;
                }
                if (parseFloat(v.quantity || 0) <= parseFloat(v.min || 0)) {
                    hasLowStockVariant = true;
                }
            });
        }

        const isLow = totalQty <= totalMin || hasLowStockVariant;
        const isNearExpiry = !isRetail && checkIfNearExpiry(item.expiryDate);
        const formattedQty = isRetail ? Math.round(totalQty) : totalQty.toFixed(2);
        
        // 🏗️ Build Parent Row
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

        row.innerHTML = `
            <td style="opacity: 0.5;">
                ${toggleIconHTML}
                #${item.id}
            </td>
            <td style="font-weight: 800; color: var(--luxury-emerald);">
                ${item.name}
                ${expiryWarningHTML}
            </td>
            <td>
                <span class="${isLow ? 'badge-low' : 'badge-ok'}">${formattedQty}</span>
            </td>
            <td style="opacity: 0.6;">${formattedMin}</td>
            <td style="opacity: ${hasVariants ? '0.3' : '1'};">${hasVariants ? '---' : parseFloat(item.cost || 0).toFixed(2) + ' <small>EGP</small>'}</td>
            <td style="font-weight: 800; color: var(--luxury-emerald);">${totalValue.toFixed(2)} <small>EGP</small></td>
            <td style="font-size: 0.85rem; opacity: 0.6;">${formatDate(latestUpdateDate)}</td>
            ${!isRetail ? `
            <td style="font-size: 0.85rem; font-weight: 700; color: ${isNearExpiry ? '#ef4444' : 'inherit'};">
                ${formatDate(item.expiryDate)}
            </td>` : ''}
        `;

        // 🎨 Styling Parent Row
        if (hasVariants) {
            row.style.cursor = 'pointer';
            row.classList.add('parent-row');
        } else {
            row.addEventListener('click', () => selectItem(item));
        }

        if (isNearExpiry) {
            row.classList.add('row-near-expiry');
        }

        tableBody.appendChild(row);

        // 🌿 Build 3-Level Tree (Product -> Color -> Size)
        if (hasVariants) {
            const langT = t[currentLang];
            const groupedByColor = {};
            item.variants.forEach(v => {
                // 🎨 Robust Color Extraction: Prioritize 'color' field, then clean 'name'
                let colorKey = v.color || v.name || langT.other;
                
                // If the name is something like "Red - S", we only want "Red" for grouping
                if (!v.color && v.name && v.name.includes('-')) {
                    colorKey = v.name.split('-')[0].trim();
                } else if (!v.color && v.name && v.name.includes('(')) {
                    colorKey = v.name.split('(')[0].trim();
                }
                
                if (!groupedByColor[colorKey]) groupedByColor[colorKey] = [];
                groupedByColor[colorKey].push(v);
            });

            const colorGroupBaseClass = `color-group-${item.id}`;
            let isParentExpanded = false;

            // 🟢 Level 1 Click (Expand/Collapse Colors)
            row.addEventListener('click', () => {
                // 🛑 Accordion Behavior: Close other expanded parents before expanding this one
                if (!isParentExpanded) {
                    const otherExpandedParents = document.querySelectorAll('.parent-row.expanded-row');
                    otherExpandedParents.forEach(otherParent => {
                        if (otherParent !== row) {
                            otherParent.click(); // Trigger collapse safely
                        }
                    });
                }

                isParentExpanded = !isParentExpanded;
                
                // Track expansion to pause auto-refresh and apply highlight
                if (isParentExpanded) {
                    row.classList.add('expanded-row', 'tree-node-expanded');
                } else {
                    row.classList.remove('expanded-row', 'tree-node-expanded');
                }

                const icon = row.querySelector('.toggle-icon');
                if (icon) {
                    icon.style.transform = isParentExpanded ? 'rotate(90deg)' : 'rotate(0deg)';
                }
                
                const colorRows = document.querySelectorAll(`.${colorGroupBaseClass}`);
                
                if (isParentExpanded) {
                    colorRows.forEach(cRow => {
                        cRow.style.display = 'table-row';
                        cRow.classList.add('closing'); // Initial compressed state
                        requestAnimationFrame(() => {
                            requestAnimationFrame(() => {
                                cRow.classList.remove('closing'); // Expand smoothly
                            });
                        });
                    });
                } else {
                    colorRows.forEach(cRow => {
                        cRow.classList.add('closing'); // Compress smoothly
                        setTimeout(() => {
                            if (cRow.classList.contains('closing')) {
                                cRow.style.display = 'none';
                                cRow.classList.remove('closing');
                            }
                        }, 200); // Wait for fast transition
                        
                        // Auto-collapse Level 3 if Level 1 is collapsed
                        const cIcon = cRow.querySelector('.color-toggle-icon');
                        if (cIcon) cIcon.style.transform = 'rotate(0deg)';
                        cRow.dataset.expanded = 'false';
                        cRow.classList.remove('expanded-row', 'tree-node-expanded');
                        
                        const sizeRows = document.querySelectorAll(`.size-group-${item.id}-${cRow.dataset.colorId}`);
                        sizeRows.forEach(sRow => {
                            if (sRow.style.display !== 'none') {
                                sRow.classList.add('closing');
                                setTimeout(() => {
                                    if (sRow.classList.contains('closing')) {
                                        sRow.style.display = 'none';
                                        sRow.classList.remove('closing');
                                    }
                                }, 200);
                            }
                        });
                    });
                }
            });

            // 🟢 Level 2: Render Color Rows
            Object.keys(groupedByColor).forEach((color, index) => {
                const variantsInColor = groupedByColor[color];
                
                // 📊 Aggregate Data for Color (Level 2)
                const colorTotalQty = variantsInColor.reduce((sum, v) => sum + parseFloat(v.quantity || 0), 0);
                const colorTotalMin = variantsInColor.reduce((sum, v) => sum + parseFloat(v.min || 0), 0);
                const colorTotalValue = variantsInColor.reduce((sum, v) => sum + (parseFloat(v.quantity || 0) * parseFloat(v.cost || item.cost || 0)), 0);
                const colorHasLowStock = variantsInColor.some(v => parseFloat(v.quantity || 0) <= parseFloat(v.min || 0));
                const colorIsLow = colorTotalQty <= colorTotalMin || colorHasLowStock;
                
                const colorId = `c${index}`; // safe identifier
                
                const colorRow = document.createElement('tr');
                colorRow.className = `${colorGroupBaseClass} tree-child-row tree-level-2`;
                colorRow.dataset.colorId = colorId;
                colorRow.dataset.expanded = 'false';
                colorRow.style.display = 'none'; // Hidden initially
                colorRow.style.cursor = 'pointer';

                const cToggleIcon = `<i class="fas fa-chevron-${isAr ? 'left' : 'right'} color-toggle-icon" style="cursor:pointer; margin-${isAr ? 'left' : 'right'}:8px; color:#64748b; transition: transform 0.3s; width: 15px; text-align: center;"></i>`;

                const colorFormattedMin = isRetail ? Math.round(colorTotalMin) : colorTotalMin.toFixed(2);

                colorRow.innerHTML = `
                    <td style="padding-${isAr ? 'right' : 'left'}: 2rem; opacity: 0.8; font-weight: 700; color: #475569;">
                        ${cToggleIcon} 
                        <i class="fas fa-palette" style="margin: 0 5px; opacity: 0.5;"></i> ${color}
                    </td>
                    <td style="font-weight: 700; color: #64748b; font-size: 0.85rem;">
                        ${langT.colorTotal}
                    </td>
                    <td><span class="${colorIsLow ? 'badge-low' : 'badge-ok'}" style="transform: scale(0.9);">${isRetail ? Math.round(colorTotalQty) : colorTotalQty.toFixed(2)}</span></td>
                    <td style="opacity: 0.6; font-size: 0.9rem;">${colorFormattedMin}</td>
                    <td style="opacity: 0.3;">---</td>
                    <td style="font-weight: 700; color: var(--luxury-emerald); font-size: 0.9rem;">${colorTotalValue.toFixed(2)} <small>EGP</small></td>
                    <td style="opacity: 0.3;">---</td>
                    ${!isRetail ? `<td>---</td>` : ''}
                `;

                tableBody.appendChild(colorRow);

                // 🟢 Level 2 Click (Expand/Collapse Sizes)
                colorRow.addEventListener('click', (e) => {
                    e.stopPropagation();
                    let cExpanded = colorRow.dataset.expanded === 'true';
                    cExpanded = !cExpanded;
                    colorRow.dataset.expanded = cExpanded.toString();

                    // Track expansion
                    if (cExpanded) {
                        colorRow.classList.add('expanded-row', 'tree-node-expanded');
                    } else {
                        colorRow.classList.remove('expanded-row', 'tree-node-expanded');
                    }

                    const cIcon = colorRow.querySelector('.color-toggle-icon');
                    if (cIcon) cIcon.style.transform = cExpanded ? 'rotate(90deg)' : 'rotate(0deg)';

                    const sizeRows = document.querySelectorAll(`.size-group-${item.id}-${colorId}`);
                    
                    if (cExpanded) {
                        sizeRows.forEach(sRow => {
                            sRow.style.display = 'table-row';
                            sRow.classList.add('closing');
                            requestAnimationFrame(() => {
                                requestAnimationFrame(() => {
                                    sRow.classList.remove('closing');
                                });
                            });
                        });
                    } else {
                        sizeRows.forEach(sRow => {
                            sRow.classList.add('closing');
                            setTimeout(() => {
                                if (sRow.classList.contains('closing')) {
                                    sRow.style.display = 'none';
                                    sRow.classList.remove('closing');
                                }
                            }, 200);
                        });
                    }
                });

                // 🟢 Level 3: Render Size Rows
                variantsInColor.forEach(variant => {
                    const childRow = document.createElement('tr');
                    childRow.className = `size-group-${item.id}-${colorId} child-row tree-child-row tree-level-3`;
                    childRow.style.display = 'none'; // Hidden initially
                    
                    const childQty = isRetail ? Math.round(variant.quantity) : parseFloat(variant.quantity).toFixed(2);
                    const childLow = variant.quantity <= (variant.min || 0);
                    const branchIcon = isAr ? '<i class="fas fa-level-down-alt fa-rotate-90" style="margin-left: 10px; color:#cbd5e1;"></i>' : '<i class="fas fa-level-up-alt fa-rotate-90" style="margin-right: 10px; color:#cbd5e1;"></i>';

                    const childFormattedMin = isRetail ? Math.round(variant.min || 0) : parseFloat(variant.min || 0).toFixed(2);

                    childRow.innerHTML = `
                        <td style="padding-${isAr ? 'right' : 'left'}: 3.5rem; opacity: 0.5; font-size: 0.85rem; font-family: monospace;">
                            ${branchIcon} <bdi>#${variant.id || `${item.id}-${variant.size || index}`}</bdi>
                        </td>
                        <td style="font-weight: 600; color: #475569;">
                            ${variant.size ? `<span style="background: var(--luxury-emerald-light); color: var(--luxury-emerald); padding: 3px 10px; border-radius: 12px; font-size: 0.75rem;">${langT.size} ${variant.size}</span>` : `<span style="opacity:0.5;">-</span>`}
                        </td>
                        <td><span class="${childLow ? 'badge-low' : 'badge-ok'}" style="transform: scale(0.85);">${childQty}</span></td>
                        <td style="opacity: 0.6; font-size: 0.85rem;">${childFormattedMin}</td>
                        <td style="font-size: 0.85rem;">${parseFloat(variant.cost || item.cost || 0).toFixed(2)} <small>EGP</small></td>
                        <td style="font-weight: 700; color: #64748b; font-size: 0.85rem;">${(variant.quantity * (variant.cost || item.cost || 0)).toFixed(2)} <small>EGP</small></td>
                        <td style="font-size: 0.8rem; opacity: 0.6;">${formatDate(variant.updatedAt || variant.createdAt || latestUpdateDate)}</td>
                        ${!isRetail ? `<td>---</td>` : ''}
                    `;

                    // Edit variant directly
                    childRow.addEventListener('click', async (e) => {
                        e.stopPropagation(); 
                        
                        // Open the small, focused variant modal instead of the full item modal
                        const updatedVariant = await openVariantEntryModal(isAr, langT, variant);
                        
                        if (updatedVariant) {
                            // Find and update this specific variant in the parent's array
                            const vIndex = item.variants.findIndex(v => v === variant);
                            if (vIndex !== -1) {
                                const updatedVariants = [...item.variants];
                                updatedVariants[vIndex] = updatedVariant;
                                // Save using the parent's valid DB ID
                                handleEdit(item.id, { ...item, variants: updatedVariants });
                            }
                        }
                    });
                    
                    tableBody.appendChild(childRow);
                });

                // ➕ Add "Add Size" row for this color group
                const addSizeRow = document.createElement('tr');
                addSizeRow.className = `size-group-${item.id}-${colorId} child-row tree-child-row tree-level-3 add-action-row`;
                addSizeRow.style.display = 'none';
                addSizeRow.style.cursor = 'pointer';
                addSizeRow.style.background = 'rgba(16, 185, 129, 0.03)';
                
                addSizeRow.innerHTML = `
                    <td colspan="${isRetail ? 7 : 8}" style="padding-${isAr ? 'right' : 'left'}: 3.5rem; color: var(--luxury-emerald); font-weight: 700; font-size: 0.85rem; border: 1px dashed rgba(16, 185, 129, 0.2);">
                        <i class="fas fa-plus-circle" style="margin-${isAr ? 'left' : 'right'}: 8px;"></i>
                        ${isAr ? `إضافة مقاس جديد للون (${color})` : `Add new size for (${color})`}
                    </td>
                `;

                addSizeRow.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const newVariant = await openVariantEntryModal(isAr, langT, { name: color, cost: item.cost });
                    if (newVariant) {
                        const updatedVariants = [...(item.variants || []), newVariant];
                        handleEdit(item.id, { ...item, variants: updatedVariants });
                    }
                });

                tableBody.appendChild(addSizeRow);
            });

            // ➕ Level 2: Add "Add New Color/Variant" row for the entire product
            const addColorRow = document.createElement('tr');
            addColorRow.className = `${colorGroupBaseClass} child-row tree-child-row tree-level-2 add-action-row`;
            addColorRow.style.display = 'none';
            addColorRow.style.cursor = 'pointer';
            addColorRow.style.background = 'rgba(0, 128, 96, 0.05)';
            
            addColorRow.innerHTML = `
                <td colspan="${isRetail ? 7 : 8}" style="padding-${isAr ? 'right' : 'left'}: 2rem; color: var(--luxury-emerald); font-weight: 800; font-size: 0.9rem; border: 1px solid rgba(0, 128, 96, 0.1);">
                    <i class="fas fa-plus-circle" style="margin-${isAr ? 'left' : 'right'}: 8px;"></i>
                    ${isAr ? 'إضافة لون أو تفريعة جديدة لهذا المنتج' : 'Add new color or variant for this product'}
                </td>
            `;

            addColorRow.addEventListener('click', async (e) => {
                e.stopPropagation();
                // Open modal with empty name to allow adding a new color
                const newVariant = await openVariantEntryModal(isAr, langT, { cost: item.cost });
                if (newVariant) {
                    const updatedVariants = [...(item.variants || []), newVariant];
                    handleEdit(item.id, { ...item, variants: updatedVariants });
                }
            });

            tableBody.appendChild(addColorRow);
        }
    });

    // 🏁 Add two empty spacer rows at the bottom for better visual breathing room
    for (let i = 0; i < 2; i++) {
        const spacerRow = document.createElement('tr');
        spacerRow.style.height = '30px';
        spacerRow.style.border = 'none';
        spacerRow.innerHTML = `<td colspan="${isRetail ? 7 : 8}" style="border:none;"></td>`;
        tableBody.appendChild(spacerRow);
    }
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

async function openVariantEntryModal(isAr, langT, initialData = null) {
    const { value: variant } = await Swal.fire({
        title: isAr ? (initialData?.name ? 'تعديل تفريعة' : 'إضافة تفريعة') : (initialData?.name ? 'Edit Variant' : 'Add Variant'),
        html: `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; padding: 1rem; text-align: ${isAr ? 'right' : 'left'};">
                <div style="grid-column: span 2;">
                    <label style="display:block; font-weight:700; margin-bottom:5px;">${isAr ? 'الاسم / اللون' : 'Name / Color'}</label>
                    <input id="v-name" class="swal2-input" style="width:100%; margin:0;" value="${initialData?.name || ''}" placeholder="${isAr ? 'أحمر' : 'Red'}" ${initialData?.name ? 'disabled' : ''}>
                </div>
                <div>
                    <label style="display:block; font-weight:700; margin-bottom:5px;">${isAr ? 'المقاس' : 'Size'}</label>
                    <input list="size-options" id="v-size" class="swal2-input" style="width:100%; margin:0;" value="${initialData?.size || ''}" placeholder="${isAr ? 'اختر أو اكتب مقاس...' : 'Select or type...'}">
                    <datalist id="size-options">
                        <!-- التيشيرتات / Tops -->
                        <option value="XS">
                        <option value="S">
                        <option value="M">
                        <option value="L">
                        <option value="XL">
                        <option value="XXL">
                        <option value="3XL">
                        <!-- البناطيل / Pants -->
                        <option value="28">
                        <option value="30">
                        <option value="32">
                        <option value="34">
                        <option value="36">
                        <option value="38">
                        <option value="40">
                        <option value="42">
                        <!-- الكوتشيات / Shoes -->
                        <option value="37">
                        <option value="38">
                        <option value="39">
                        <option value="40">
                        <option value="41">
                        <option value="42">
                        <option value="43">
                        <option value="44">
                        <option value="45">
                        <option value="Free Size">
                    </datalist>
                </div>
                <div>
                    <label style="display:block; font-weight:700; margin-bottom:5px;">${langT.tableQty}</label>
                    <input id="v-qty" type="text" inputmode="decimal" class="swal2-input" style="width:100%; margin:0;" value="${initialData && initialData.quantity !== undefined ? initialData.quantity : ''}" placeholder="0" oninput="this.value = this.value.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[^0-9.]/g, '')">
                </div>
                <div>
                    <label style="display:block; font-weight:700; margin-bottom:5px;">${langT.tableMin}</label>
                    <input id="v-min" type="text" inputmode="decimal" class="swal2-input" style="width:100%; margin:0;" value="${initialData && initialData.min !== undefined ? initialData.min : ''}" placeholder="0" oninput="this.value = this.value.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[^0-9.]/g, '')">
                </div>
                <div>
                    <label style="display:block; font-weight:700; margin-bottom:5px;">${langT.tableCost}</label>
                    <input id="v-cost" type="text" inputmode="decimal" class="swal2-input" style="width:100%; margin:0;" value="${initialData && initialData.cost !== undefined ? initialData.cost : ''}" placeholder="0.00" oninput="this.value = this.value.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[^0-9.]/g, '')">
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
            return {
                name,
                color: name, // 🎨 Save explicitly as color for robust grouping
                size: document.getElementById('v-size').value.trim(),
                quantity: parseFloat(document.getElementById('v-qty').value) || 0,
                min: parseFloat(document.getElementById('v-min').value) || 0,
                cost: parseFloat(document.getElementById('v-cost').value) || 0
            };
        }
    });
    return variant;
}

async function openAddModal(preExistingData = null) {
    const isRetail = (localStorage.getItem('systemMode') || 'retail') === 'retail';
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
                                <small style="opacity: 0.7;">(${v.size || '-'}) | Qty: ${v.quantity} | ${v.cost} EGP</small>
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
    const isRetail = (localStorage.getItem('systemMode') || 'retail') === 'retail';
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
                        <input id="swal-edit-qty" type="text" inputmode="decimal" class="swal2-input" value="${state.quantity}" style="width:100%; margin:0;" oninput="this.value = this.value.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[^0-9.]/g, '')">
                    </div>
                    <div>
                        <label style="display:block; font-weight:700; margin-bottom:5px;">${langT.tableMin}</label>
                        <input id="swal-edit-min" type="text" inputmode="decimal" class="swal2-input" value="${state.min}" style="width:100%; margin:0;" oninput="this.value = this.value.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[^0-9.]/g, '')">
                    </div>
                    <div>
                        <label style="display:block; font-weight:700; margin-bottom:5px;">${langT.tableCost}</label>
                        <input id="swal-edit-cost" type="text" inputmode="decimal" class="swal2-input" value="${state.cost}" style="width:100%; margin:0;" oninput="this.value = this.value.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[^0-9.]/g, '')">
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
                                <small style="opacity: 0.7;">(${v.size || '-'}) | Qty: ${v.quantity} | ${v.cost} EGP</small>
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
            return {
                name,
                quantity: parseFloat(document.getElementById('swal-edit-qty').value) || 0,
                min: parseFloat(document.getElementById('swal-edit-min').value) || 0,
                cost: parseFloat(document.getElementById('swal-edit-cost').value) || 0,
                expiryDate: !isRetail ? document.getElementById('swal-edit-expiry').value : null,
                variants: state.variants
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