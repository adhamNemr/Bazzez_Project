let allProducts = []; 
const currentLang = localStorage.getItem('lang') || 'ar';
const isAr = currentLang === 'ar';

const t = {
    ar: {
        pageTitle: 'إدارة المنتجات',
        searchPlaceholder: 'ابحث بالاسم أو الفئة...',
        filterBy: 'تصفية حسب...',
        bestSeller: 'الأكثر مبيعاً',
        expensive: 'الأعلى سعراً',
        cheapest: 'الأقل سعراً',
        byType: 'حسب الفئة',
        placeholderName: 'اسم المنتج',
        placeholderCategory: 'الفئة',
        placeholderPrice: 'السعر',
        btnAdd: 'إضافة منتج',
        btnEdit: 'تعديل',
        btnDelete: 'حذف',
        btnPdf: 'تصدير PDF',
        btnExcel: 'تصدير Excel',
        tableId: 'ID',
        tableName: 'الاسم',
        tableCategory: 'الفئة',
        tablePrice: 'قطاعي',
        tableWholesale: 'جملة',
        tableSold: 'المبيعات',
        msgAdded: '✅ تم إضافة المنتج بنجاح.',
        msgEdited: '✅ تم تعديل المنتج بنجاح.',
        msgDeleted: '🗑️ تم حذف المنتج بنجاح.',
        msgError: '⚠️ حدث خطأ ما.',
        msgSelect: '⚠️ يرجى اختيار منتج أولاً.',
        confirmDeleteTitle: 'هل أنت متأكد؟',
        confirmDeleteText: 'لن تتمكن من التراجع عن حذف هذا المنتج!',
        confirmDeleteBtn: 'نعم، احذف',
        cancelBtn: 'تراجع',
        noExport: '⚠️ لا يوجد بيانات للتصدير',
        allCats: 'كل الفئات',
        drawerTitle: 'تفاصيل المنتج',
        labelName: 'اسم المنتج',
        labelCategory: 'الفئة / التصنيف',
        labelPrice: 'سعر القطاعي',
        labelWholesale: 'سعر الجملة',
        btnSave: 'حفظ المنتج',
        btnCancel: 'إلغاء',
        btnAddProduct: 'إضافة منتج',
        retailSales: 'مبيعات القطاعي',
        wholesaleSales: 'مبيعات الجملة'
    },
    en: {
        pageTitle: 'Products Management',
        searchPlaceholder: 'Search by name, category or ID...',
        filterBy: 'Filter by...',
        bestSeller: 'Best Seller',
        expensive: 'Most Expensive',
        cheapest: 'Cheapest',
        byType: 'By Category',
        placeholderName: 'Product Name',
        placeholderCategory: 'Category',
        placeholderPrice: 'Price',
        btnAdd: 'Add Product',
        btnEdit: 'Edit',
        btnDelete: 'Delete',
        btnPdf: 'Export PDF',
        btnExcel: 'Export Excel',
        tableId: 'ID',
        tableName: 'Name',
        tableCategory: 'Category',
        tablePrice: 'Retail',
        tableWholesale: 'Wholesale',
        tableSold: 'Sold',
        msgAdded: '✅ Product added successfully.',
        msgEdited: '✅ Product edited successfully.',
        msgDeleted: '🗑️ Product deleted successfully.',
        msgError: '⚠️ Something went wrong.',
        msgSelect: '⚠️ Please select a product first.',
        confirmDeleteTitle: 'Are you sure?',
        confirmDeleteText: "You won't be able to revert this!",
        confirmDeleteBtn: 'Yes, delete it!',
        cancelBtn: 'Cancel',
        noExport: '⚠️ Nothing to export',
        allCats: 'All Categories',
        drawerTitle: 'Product Details',
        labelName: 'Product Name',
        labelCategory: 'Category / Type',
        labelPrice: 'Retail Price',
        labelWholesale: 'Wholesale Price',
        btnSave: 'Save Product',
        btnCancel: 'Cancel',
        btnAddProduct: 'Add Product',
        retailSales: 'Retail Sales',
        wholesaleSales: 'Wholesale Sales'
    }
}[currentLang];

function applyTranslations() {
    document.title = `${t.pageTitle} - Vortex POS`;
    const pillText = document.getElementById('pill-text');
    if (pillText) pillText.textContent = t.pageTitle;

    const homeBtnText = document.getElementById('home-btn-text');
    if (homeBtnText) homeBtnText.textContent = isAr ? 'الرئيسية' : 'Home';

    const searchInput = document.getElementById('search-bar');
    if (searchInput) searchInput.placeholder = t.searchPlaceholder;

    const filterOptions = document.getElementById('filter-options');
    if (filterOptions) {
        document.getElementById('loc-filter-by').textContent = t.filterBy;
        document.getElementById('loc-best-seller').textContent = t.bestSeller;
        document.getElementById('loc-expensive').textContent = t.expensive;
        document.getElementById('loc-cheapest').textContent = t.cheapest;
    }
    
    const catFilter = document.getElementById('loc-all-cats');
    if (catFilter) catFilter.textContent = t.allCats;

    // Drawer Labels
    const drawerTitle = document.getElementById('loc-drawer-title');
    if (drawerTitle) drawerTitle.textContent = t.drawerTitle;
    const labelName = document.getElementById('loc-label-name');
    if (labelName) labelName.textContent = t.labelName;
    const labelCategory = document.getElementById('loc-label-category');
    if (labelCategory) labelCategory.textContent = t.labelCategory;
    const labelPrice = document.getElementById('loc-label-price');
    if (labelPrice) labelPrice.textContent = t.labelPrice;
    const labelWholesale = document.getElementById('loc-label-wholesale');
    if (labelWholesale) labelWholesale.textContent = t.labelWholesale;

    const btnSave = document.getElementById('loc-btn-save');
    if (btnSave) btnSave.textContent = t.btnSave;
    const btnCancel = document.getElementById('loc-btn-cancel');
    if (btnCancel) btnCancel.textContent = t.btnCancel;
    const btnDelete = document.getElementById('loc-btn-delete');
    if (btnDelete) btnDelete.textContent = t.btnDelete;
    const btnAddProduct = document.getElementById('loc-btn-add-new');
    if (btnAddProduct) btnAddProduct.textContent = t.btnAddProduct;

    const retailSales = document.getElementById('loc-retail-sales');
    if (retailSales) retailSales.textContent = t.retailSales;
    const wholesaleSales = document.getElementById('loc-wholesale-sales');
    if (wholesaleSales) wholesaleSales.textContent = t.wholesaleSales;

    const pdfBtn = document.getElementById('loc-btn-pdf');
    const excelBtn = document.getElementById('loc-btn-excel');
    if (pdfBtn) pdfBtn.textContent = t.btnPdf;
    if (excelBtn) excelBtn.textContent = t.btnExcel;

    document.getElementById('loc-id').textContent = t.tableId;
    document.getElementById('loc-name').textContent = t.tableName;
    document.getElementById('loc-category').textContent = t.tableCategory;
    document.getElementById('loc-price').textContent = t.tablePrice;
    document.getElementById('loc-wholesale').textContent = t.tableWholesale;
    document.getElementById('loc-sold').textContent = t.tableSold;

    // Stats Labels
    document.getElementById('loc-stat-total').textContent = isAr ? 'إجمالي المنتجات' : 'Total Products';
    document.getElementById('loc-stat-best').textContent = isAr ? 'الأكثر مبيعاً' : 'Best Seller';
    document.getElementById('loc-stat-sold').textContent = isAr ? 'إجمالي المبيعات' : 'Total Sold';
}



// 🛒 جلب المنتجات من الـ API وتخزينها في allProducts
async function fetchProducts() {
    try {
        const response = await fetch("/api/products", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.status === 401) {
            // showToast("⚠️ يجب تسجيل الدخول للوصول إلى هذه الصفحة.", "error");
            window.location.href = "/index.html";
            return;
        }

        console.log("📦 الاستجابة من الـ API:", response);

        if (!response.ok) {
            console.error(`❌ خطأ في الطلب: ${response.status} ${response.statusText}`);
            return;
        }

        allProducts = await response.json(); // ✅ تخزين البيانات في المتغير العام
        console.log("📦 البيانات المستلمة:", allProducts);

        const products = Object.values(allProducts).flat(); // ✅ تحويل الكائنات إلى مصفوفة موحدة للعرض
        console.log("✅ البيانات المجهزة للعرض:", products);

        renderProducts(products);
        populateCategoryList(products);

    } catch (error) {
        console.error('⚠️ خطأ أثناء جلب المنتجات:', error);
    }
}

function populateCategoryList(products) {
    const datalist = document.getElementById('category-list');
    const catFilter = document.getElementById('category-filter');
    if (!datalist || !catFilter) return;
    
    // Get unique categories
    const categories = [...new Set(products.map(p => p.category))].sort();
    
    // Fill datalist for form
    datalist.innerHTML = '';
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        datalist.appendChild(option);
    });

    // Fill filter dropdown
    const currentVal = catFilter.value;
    catFilter.innerHTML = `<option value="all" id="loc-all-cats">${t.allCats}</option>`;
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        catFilter.appendChild(option);
    });
    catFilter.value = currentVal || 'all';
}

function getCategoryClass(category) {
    const cat = category.toLowerCase();
    if (cat.includes('beef') || cat.includes('لحم')) return 'cat-beef';
    if (cat.includes('chicken') || cat.includes('دجاج')) return 'cat-chicken';
    if (cat.includes('drink') || cat.includes('مشروب')) return 'cat-drink';
    if (cat.includes('combo') || cat.includes('كومبو')) return 'cat-combo';
    if (cat.includes('dessert') || cat.includes('حلو')) return 'cat-dessert';
    if (cat.includes('appetizer') || cat.includes('مقبلات')) return 'cat-appetizer';
    return '';
}

// عرض المنتجات في الجدول
function renderProducts(products) {
    if (!Array.isArray(products)) {
        console.error("⚠️ البيانات المستلمة ليست مصفوفة:", products);
        return;
    }

    // 📊 Update Stats
    updateStats(products);

    const tableBody = document.getElementById('product-table');
    tableBody.innerHTML = '';

    // If no products found, show message
    if (products.length === 0) {
        const noResultRow = document.createElement('tr');
        noResultRow.innerHTML = `
            <td colspan="6" style="padding: 3rem; color: #94a3b8; font-weight: 700; font-size: 1.1rem; text-align:center;">
                <i class="fas fa-search" style="display: block; font-size: 2rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                ${isAr ? 'لم يتم العثور على منتجات مطابقة' : 'No matching products found'}
            </td>
        `;
        tableBody.appendChild(noResultRow);
        
        // Fill remaining rows (7 more to make 8 total)
        for (let i = 0; i < 7; i++) {
            const emptyRow = document.createElement('tr');
            emptyRow.className = 'empty-row';
            emptyRow.innerHTML = `<td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td>`;
            tableBody.appendChild(emptyRow);
        }
        return;
    }

    // Render actual products
    products.forEach(product => {
        const catClass = getCategoryClass(product.category);
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>#${product.id}</td>
            <td style="font-weight: 700;">${product.name}</td>
            <td><span class="category-pill ${catClass}">${product.category}</span></td>
            <td style="font-weight: 800; color: var(--luxury-emerald);">${parseFloat(product.price).toFixed(2)} <small>EGP</small></td>
            <td style="font-weight: 800; color: #3b82f6;">${parseFloat(product.wholesalePrice || product.price).toFixed(2)} <small>EGP</small></td>
            <td>${product.sold || 0}</td>
        `;

        row.addEventListener('click', () => fillFormFields(product));
        tableBody.appendChild(row);
    });

    // Fill with empty rows if less than 8
    const minRows = 8;
    if (products.length < minRows) {
        for (let i = 0; i < minRows - products.length; i++) {
            const emptyRow = document.createElement('tr');
            emptyRow.className = 'empty-row';
            emptyRow.innerHTML = `
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
            `;
            tableBody.appendChild(emptyRow);
        }
    }
}

function updateStats(products) {
    const totalProducts = products.length;
    let totalSold = 0;
    let bestSeller = { name: '---', sold: -1 };

    products.forEach(p => {
        totalSold += (p.sold || 0);
        if ((p.sold || 0) > bestSeller.sold) {
            bestSeller = { name: p.name, sold: p.sold };
        }
    });

    document.getElementById('stat-total-count').textContent = totalProducts;
    document.getElementById('stat-total-sold').textContent = totalSold;
    document.getElementById('stat-best-seller').textContent = bestSeller.name;
}


// 🎭 Drawer Controls
function openDrawer(mode = 'add') {
    const drawer = document.getElementById('product-drawer');
    const overlay = document.getElementById('drawer-overlay');
    const deleteBtn = document.getElementById('delete-btn');
    const salesSection = document.getElementById('drawer-sales-section');
    
    drawer.classList.add('open');
    overlay.style.display = 'block';
    setTimeout(() => overlay.style.opacity = '1', 10);

    if (mode === 'add') {
        resetProductForm();
        deleteBtn.style.display = 'none';
        if (salesSection) salesSection.style.display = 'none';
    } else {
        deleteBtn.style.display = 'flex';
        if (salesSection) salesSection.style.display = 'flex';
    }
}

function closeDrawer() {
    const drawer = document.getElementById('product-drawer');
    const overlay = document.getElementById('drawer-overlay');
    
    drawer.classList.remove('open');
    overlay.style.opacity = '0';
    setTimeout(() => overlay.style.display = 'none', 300);
}

// تعبئة الحقول العلوية عند اختيار منتج من الجدول
function fillFormFields(product) {
    document.getElementById('product-id').value = product.id;
    document.getElementById('product-name').value = product.name;
    document.getElementById('product-category').value = product.category;
    document.getElementById('product-price').value = product.price;
    document.getElementById('product-wholesale-price').value = product.wholesalePrice || product.price;

    // 📊 Populate Sales Stats
    document.getElementById('drawer-retail-sold').textContent = product.retailSold || product.sold || 0;
    document.getElementById('drawer-wholesale-sold').textContent = product.wholesaleSold || 0;

    openDrawer('edit');
}

function resetProductForm() {
    document.getElementById('drawer-product-form').reset();
    document.getElementById('product-id').value = '';
}


// 🔀 دالة الترتيب
const sortTable = (columnIndex) => {
    const table = document.getElementById("product-table");
    const rows = Array.from(table.rows);
    
    // 👀 تحديد إذا كان الترتيب تصاعدي أو تنازلي
    let ascending = table.getAttribute(`data-sort-${columnIndex}`) !== "asc";
    
    rows.sort((a, b) => {
        let valueA = a.cells[columnIndex].textContent.trim();
        let valueB = b.cells[columnIndex].textContent.trim();

        // 🔢 لو القيم أرقام، حولها لأرقام للمقارنة
        if (!isNaN(valueA) && !isNaN(valueB)) {
            valueA = Number(valueA);
            valueB = Number(valueB);
        }

        if (ascending) {
            return valueA > valueB ? 1 : -1;
        } else {
            return valueA < valueB ? 1 : -1;
        }
    });

    // 🧹 إعادة ترتيب الصفوف في الجدول
    rows.forEach(row => table.appendChild(row));
    
    // 🔄 تحديث حالة الترتيب
    table.setAttribute(`data-sort-${columnIndex}`, ascending ? "asc" : "desc");
};

// التعامل مع الفورم (إضافة أو تعديل)
document.getElementById('drawer-product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const productId = document.getElementById('product-id').value;
    const isEdit = productId !== '';
    
    const product = {
        name: document.getElementById('product-name').value,
        category: document.getElementById('product-category').value,
        price: parseFloat(document.getElementById('product-price').value),
        wholesalePrice: parseFloat(document.getElementById('product-wholesale-price').value)
    };

    const url = isEdit ? `/api/products/${productId}` : "/api/products/add";
    const method = isEdit ? "PUT" : "POST";

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(product)
        });

        if (response.ok) {
            Swal.fire({ icon: 'success', title: isEdit ? t.msgEdited : t.msgAdded, timer: 1500, showConfirmButton: false });
            fetchProducts();
            closeDrawer();
        } else {
            Swal.fire({ icon: 'error', title: t.msgError });
        }
    } catch (error) {
        console.error('⚠️ خطأ أثناء الاتصال بالخادم:', error);
        Swal.fire({ icon: 'error', title: t.msgError });
    }
});

// حذف منتج
document.getElementById('delete-btn').addEventListener('click', async () => {
    const productId = document.getElementById('product-id').value;
    if (!productId) return;

    const result = await Swal.fire({
        title: t.confirmDeleteTitle,
        text: t.confirmDeleteText,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        confirmButtonText: t.confirmDeleteBtn,
        cancelButtonText: t.cancelBtn
    });

    if (!result.isConfirmed) return;

    try {
        const response = await fetch(`/api/products/${productId}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            Swal.fire({ icon: 'success', title: t.msgDeleted, timer: 1500, showConfirmButton: false });
            fetchProducts();
            closeDrawer();
        } else {
            Swal.fire({ icon: 'error', title: t.msgError });
        }
    } catch (error) {
        console.error('⚠️ خطأ أثناء الاتصال بالخادم:', error);
        Swal.fire({ icon: 'error', title: t.msgError });
    }
});

// تصفية المنتجات بناءً على البحث
function searchProducts() {
    applyFilter(); // Logic is merged in applyFilter for better coordination
}

// تطبيق الفلترة بناءً على الخيار المحدد في القائمة المنسدلة والبحث
function applyFilter() {
    const sortOption = document.getElementById('filter-options').value;
    const catOption = document.getElementById('category-filter').value;
    const searchTerm = document.getElementById('search-bar').value.trim().toLowerCase();
    
    if (!allProducts || allProducts.length === 0) return;

    let filteredProducts = Object.values(allProducts).flat();

    // 1️⃣ Filtering logic
    if (searchTerm) {
        filteredProducts = filteredProducts.filter(product =>
            product.name.toLowerCase().includes(searchTerm) ||
            product.category.toLowerCase().includes(searchTerm) ||
            product.id.toString().includes(searchTerm)
        );
    }

    if (catOption && catOption !== 'all') {
        filteredProducts = filteredProducts.filter(product => product.category === catOption);
    }

    // 2️⃣ 🧠 Intelligent Search Ranking (if searching)
    if (searchTerm) {
        console.log(`--- 🔍 SEARCH DIAGNOSTICS [Query: ${searchTerm}] ---`);
        filteredProducts.forEach(p => {
            const name = p.name.toLowerCase();
            const cat = p.category.toLowerCase();
            const id = p.id.toString();
            
            // Assign Ranks (Lower is Better)
            if (id === searchTerm) {
                p._rank = 1;
                p._reason = "Exact ID Match";
            } else if (name.startsWith(searchTerm)) {
                p._rank = 2;
                p._reason = "Name Starts With";
            } else if (cat.startsWith(searchTerm)) {
                p._rank = 3;
                p._reason = "Category Starts With";
            } else if (name.includes(searchTerm)) {
                p._rank = 4;
                p._reason = "Name Contains";
            } else {
                p._rank = 100;
                p._reason = "Partial Match";
            }
            console.log(`Product: ${p.name} | Rank: ${p._rank} | Reason: ${p._reason}`);
        });

        // Sort by Rank, then by ID descending
        filteredProducts.sort((a, b) => {
            if (a._rank !== b._rank) return a._rank - b._rank;
            return b.id - a.id;
        });
    } else {
        // 3️⃣ Standard Sorting (when not searching)
        switch (sortOption) {
            case 'most-sold':
                filteredProducts.sort((a, b) => (b.sold || 0) - (a.sold || 0));
                break;
            case 'highest-price':
                filteredProducts.sort((a, b) => b.price - a.price);
                break;
            case 'lowest-price':
                filteredProducts.sort((a, b) => a.price - b.price);
                break;
            default:
                filteredProducts.sort((a, b) => b.id - a.id);
                break;
        }
    }

    renderProducts(filteredProducts);
}

function exportProductsToPDF() {
    const productsArray = Object.values(allProducts).flat(); // تحويل `allProducts` إلى مصفوفة

    if (!productsArray.length) {
        showToast("Nothing To Export ⚠️", "warning");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.text("Products List", 14, 10);

    let y = 20;
    productsArray.forEach((product, index) => {
        doc.text(`${index + 1}. ${product.name} - ${product.category} - ${product.price} EGP`, 10, y);
        y += 10;
    });

    doc.save("products-list.pdf");
}

function exportProductsToExcel() {
    const productsArray = Object.values(allProducts).flat(); // تحويل `allProducts` إلى مصفوفة

    if (!productsArray.length) {
        showToast("Nothing To Export ⚠️", "warning");
        return;
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(productsArray);

    XLSX.utils.book_append_sheet(wb, ws, "Products");
    XLSX.writeFile(wb, "products-list.xlsx");
}

// تحميل البيانات عند فتح الصفحة
document.addEventListener('DOMContentLoaded', () => {
    applyTranslations();
    fetchProducts();
    
    // 🎭 Drawer Event Listeners
    const addBtn = document.getElementById('open-add-drawer');
    const closeBtn = document.getElementById('close-drawer');
    const cancelBtn = document.getElementById('cancel-drawer');
    const overlay = document.getElementById('drawer-overlay');

    if (addBtn) addBtn.onclick = () => openDrawer('add');
    if (closeBtn) closeBtn.onclick = closeDrawer;
    if (cancelBtn) cancelBtn.onclick = closeDrawer;
    if (overlay) overlay.onclick = closeDrawer;
});