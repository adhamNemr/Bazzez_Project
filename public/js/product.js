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
        noExport: '⚠️ لا يوجد بيانات للتصدير'
    },
    en: {
        pageTitle: 'Products Management',
        searchPlaceholder: 'Search by name or category...',
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
        noExport: '⚠️ Nothing to export'
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
        document.getElementById('loc-by-type').textContent = t.byType;
    }

    document.getElementById('product-name').placeholder = t.placeholderName;
    document.getElementById('product-category').placeholder = t.placeholderCategory;
    document.getElementById('product-price').placeholder = t.placeholderPrice;

    document.getElementById('loc-btn-add').textContent = t.btnAdd;
    document.getElementById('edit-btn').textContent = t.btnEdit;
    document.getElementById('delete-btn').textContent = t.btnDelete;
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
    if (!datalist) return;
    
    // Get unique categories
    const categories = [...new Set(products.map(p => p.category))];
    
    datalist.innerHTML = '';
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        datalist.appendChild(option);
    });
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
            <td colspan="5" style="padding: 3rem; color: #94a3b8; font-weight: 700; font-size: 1.1rem;">
                <i class="fas fa-search" style="display: block; font-size: 2rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                ${isAr ? 'لم يتم العثور على منتجات مطابقة' : 'No matching products found'}
            </td>
        `;
        tableBody.appendChild(noResultRow);
        
        // Fill remaining rows (7 more to make 8 total)
        for (let i = 0; i < 7; i++) {
            const emptyRow = document.createElement('tr');
            emptyRow.className = 'empty-row';
            emptyRow.innerHTML = `<td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td>`;
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
            <td>${product.sold}</td>
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


// تعبئة الحقول العلوية عند اختيار منتج من الجدول
function fillFormFields(product) {
    document.getElementById('product-id').value = product.id;
    document.getElementById('product-name').value = product.name;
    document.getElementById('product-category').value = product.category;
    document.getElementById('product-price').value = product.price;
    document.getElementById('product-wholesale-price').value = product.wholesalePrice || product.price;

    // Show Edit/Delete/Reset buttons, hide Add button
    document.getElementById('loc-btn-add').style.display = 'none';
    document.getElementById('edit-btn').style.display = 'inline-block';
    document.getElementById('delete-btn').style.display = 'inline-block';
    document.getElementById('reset-btn').style.display = 'inline-block';
}

function resetProductForm() {
    document.getElementById('add-product-form').reset();
    document.getElementById('product-id').value = '';
    document.getElementById('loc-btn-add').style.display = 'inline-block';
    document.getElementById('edit-btn').style.display = 'none';
    document.getElementById('delete-btn').style.display = 'none';
    document.getElementById('reset-btn').style.display = 'none';
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

// إضافة منتج جديد
document.getElementById('add-product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const product = {
        name: document.getElementById('product-name').value,
        category: document.getElementById('product-category').value,
        price: parseFloat(document.getElementById('product-price').value),
        wholesalePrice: parseFloat(document.getElementById('product-wholesale-price').value)
    };

    try {
        const response = await fetch("/api/products/add", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(product)
        });

        if (response.ok) {
            Swal.fire({ icon: 'success', title: t.msgAdded, timer: 1500, showConfirmButton: false });
            fetchProducts();
            resetProductForm();
        } else {
            Swal.fire({ icon: 'error', title: t.msgError });
        }
    } catch (error) {
        console.error('⚠️ خطأ أثناء الاتصال بالخادم:', error);
        Swal.fire({ icon: 'error', title: t.msgError });
    }
});

// تعديل منتج
document.getElementById('edit-btn').addEventListener('click', async () => {
    const productId = document.getElementById('product-id').value;
    if (!productId) {
        showToast('⚠️ يرجى اختيار منتج للتعديل.', 'warning');
        return;
    }

    const product = {
        name: document.getElementById('product-name').value,
        category: document.getElementById('product-category').value,
        price: parseFloat(document.getElementById('product-price').value),
        wholesalePrice: parseFloat(document.getElementById('product-wholesale-price').value)
    };

    try {
        const response = await fetch(`/api/products/${productId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(product)
        });

        if (response.ok) {
            Swal.fire({ icon: 'success', title: t.msgEdited, timer: 1500, showConfirmButton: false });
            fetchProducts();
            resetProductForm();
        } else {
            Swal.fire({ icon: 'error', title: t.msgError });
        }
    } catch (error) {
        console.error('⚠️ خطأ أثناء الاتصال بالخادم:', error);
        Swal.fire({ icon: 'error', title: t.msgError });
    }
});

document.getElementById('delete-btn').addEventListener('click', async () => {
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
            resetProductForm();
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
    const searchTerm = document.getElementById('search-bar').value.toLowerCase();

    if (!allProducts || allProducts.length === 0) {
        console.warn("⚠️ لم يتم تحميل المنتجات بعد.");
        return;
    }

    const filteredProducts = Object.values(allProducts).flat().filter(product =>
        product.name.toLowerCase().includes(searchTerm) ||
        product.category.toLowerCase().includes(searchTerm)
    );

    renderProducts(filteredProducts);
}

// تطبيق الفلترة بناءً على الخيار المحدد في القائمة المنسدلة
function applyFilter() {
    const filterOption = document.getElementById('filter-options').value;
    const searchTerm = document.getElementById('search-bar').value.toLowerCase();
    
    let filteredProducts = Object.values(allProducts).flat();

    // 🔍 تطبيق البحث أولاً إذا كان هناك نص مكتوب في البحث
    if (searchTerm) {
        filteredProducts = filteredProducts.filter(product =>
            product.name.toLowerCase().includes(searchTerm) ||
            product.category.toLowerCase().includes(searchTerm)
        );
    }

    // 📌 تطبيق الفلترة بعد البحث
    switch (filterOption) {
        case 'most-sold':
            filteredProducts.sort((a, b) => b.sold - a.sold);
            break;
        case 'highest-price':
            filteredProducts.sort((a, b) => b.price - a.price);
            break;
        case 'lowest-price':
            filteredProducts.sort((a, b) => a.price - b.price);
            break;
        case 'category':
            filteredProducts.sort((a, b) => a.category.localeCompare(b.category));
            break;
        default:
            break;
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
window.onload = () => {
    applyTranslations();
    fetchProducts();
    
    // Initial reset listener
    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) resetBtn.onclick = resetProductForm;
};