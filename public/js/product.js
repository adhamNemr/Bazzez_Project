// Vortex POS - Product Management Logic
const currentLang = localStorage.getItem('lang') || 'ar';
const isAr = currentLang === 'ar';

const t = {
    ar: {
        allCats: 'كل الفئات',
        editProduct: 'تعديل المنتج',
        addProduct: 'إضافة منتج جديد',
        saveSuccess: 'تم الحفظ بنجاح',
        deleteConfirm: 'هل أنت متأكد من الحذف؟',
        deleted: 'تم الحذف بنجاح',
        error: 'حدث خطأ ما',
        retailSales: 'مبيعات القطاعي',
        wholesaleSales: 'مبيعات الجملة'
    },
    en: {
        allCats: 'All Categories',
        editProduct: 'Edit Product',
        addProduct: 'Add New Product',
        saveSuccess: 'Saved Successfully',
        deleteConfirm: 'Are you sure you want to delete?',
        deleted: 'Deleted Successfully',
        error: 'Something went wrong',
        retailSales: 'Retail Sales',
        wholesaleSales: 'Wholesale Sales'
    }
};

const translations = t[currentLang];

let allProducts = [];

document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    
    const openDrawerBtn = document.getElementById('open-add-drawer');
    const closeDrawerBtn = document.getElementById('close-drawer');
    const drawerOverlay = document.getElementById('drawer-overlay');
    const productForm = document.getElementById('drawer-product-form');

    if (openDrawerBtn) openDrawerBtn.onclick = () => openEditDrawer();
    if (closeDrawerBtn) closeDrawerBtn.onclick = closeDrawer;
    if (drawerOverlay) drawerOverlay.onclick = closeDrawer;

    if (productForm) {
        productForm.onsubmit = async (e) => {
            e.preventDefault();
            await saveProduct();
        };
    }

    const deleteBtn = document.getElementById('delete-btn');
    if (deleteBtn) {
        deleteBtn.onclick = async () => {
            const id = document.getElementById('product-id').value;
            if (id) await deleteProduct(id);
        };
    }
});

async function fetchProducts() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/products', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) return;
        
        allProducts = await response.json();
        const products = Object.values(allProducts).flat();
        
        renderProducts(products);
        populateCategoryList(products);
    } catch (error) {
        console.error('Fetch error:', error);
    }
}

function renderProducts(products) {
    const tableBody = document.getElementById('product-table');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    updateStats(products);

    if (products.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="6" style="padding: 3rem; text-align: center; color: #94a3b8;">${isAr ? 'لا توجد منتجات' : 'No products found'}</td>`;
        tableBody.appendChild(row);
        return;
    }

    products.forEach(product => {
        const row = document.createElement('tr');
        row.onclick = () => openEditDrawer(product);
        row.innerHTML = `
            <td>${product.id}</td>
            <td>${product.name}</td>
            <td><span class="category-pill ${getCategoryClass(product.category)}">${product.category}</span></td>
            <td>${product.price} <small>EGP</small></td>
            <td>${product.wholesalePrice || product.price} <small>EGP</small></td>
            <td>${product.sold || 0}</td>
        `;
        tableBody.appendChild(row);
    });
}

function updateStats(products) {
    const totalCountEl = document.getElementById('stat-total-count');
    const totalSoldEl  = document.getElementById('stat-total-sold');
    const bestSellerEl = document.getElementById('stat-best-seller');

    if (totalCountEl) totalCountEl.textContent = products.length;

    let totalSold = 0;
    let bestSeller = { name: '---', sold: -1 };

    products.forEach(p => {
        const sold = p.sold || 0;
        totalSold += sold;
        if (sold > bestSeller.sold) {
            bestSeller = { name: p.name, sold: sold };
        }
    });

    if (totalSoldEl)  totalSoldEl.textContent  = totalSold;
    if (bestSellerEl) bestSellerEl.textContent = bestSeller.name;
}

function getCategoryClass(category) {
    const cat = (category || '').toLowerCase();
    if (cat.includes('beef') || cat.includes('لحم')) return 'cat-beef';
    if (cat.includes('chicken') || cat.includes('دجاج')) return 'cat-chicken';
    if (cat.includes('drink') || cat.includes('مشروب')) return 'cat-drink';
    return '';
}

function populateCategoryList(products) {
    const categories = [...new Set(products.map(p => p.category))].sort();
    const datalist = document.getElementById('category-list');
    const catFilter = document.getElementById('category-filter');
    
    if (datalist) {
        datalist.innerHTML = categories.map(c => `<option value="${c}">`).join('');
    }
    
    if (catFilter) {
        const current = catFilter.value;
        catFilter.innerHTML = `<option value="all">${translations.allCats}</option>` + 
            categories.map(c => `<option value="${c}">${c}</option>`).join('');
        catFilter.value = current || 'all';
    }
}

function applyFilter() {
    const sort = document.getElementById('filter-options').value;
    const cat = document.getElementById('category-filter').value;
    const search = document.getElementById('search-bar').value.toLowerCase();
    
    let filtered = Object.values(allProducts).flat();

    if (search) {
        filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(search) || 
            p.category.toLowerCase().includes(search) ||
            p.id.toString().includes(search)
        );
    }

    if (cat !== 'all') {
        filtered = filtered.filter(p => p.category === cat);
    }

    if (sort === 'most-sold') filtered.sort((a, b) => (b.sold || 0) - (a.sold || 0));
    else if (sort === 'highest-price') filtered.sort((a, b) => b.price - a.price);
    else if (sort === 'lowest-price') filtered.sort((a, b) => a.price - b.price);
    else filtered.sort((a, b) => b.id - a.id);

    renderProducts(filtered);
}

function searchProducts() {
    applyFilter();
}

function openEditDrawer(product = null) {
    const drawer = document.getElementById('product-drawer');
    const overlay = document.getElementById('drawer-overlay');
    const title = document.getElementById('drawer-title');
    const deleteBtn = document.getElementById('delete-btn');
    const salesSection = document.getElementById('drawer-sales-section');

    if (!drawer || !overlay) return;

    if (product) {
        title.textContent = translations.editProduct;
        document.getElementById('product-id').value = product.id;
        document.getElementById('product-name').value = product.name;
        document.getElementById('product-category').value = product.category;
        document.getElementById('product-price').value = product.price;
        document.getElementById('product-wholesale-price').value = product.wholesalePrice || product.price;
        
        if (salesSection) {
            salesSection.style.display = 'block';
            document.getElementById('drawer-retail-sold').textContent = product.retail_sold || 0;
            document.getElementById('drawer-wholesale-sold').textContent = product.wholesale_sold || 0;
        }
        deleteBtn.style.display = 'flex';
    } else {
        title.textContent = translations.addProduct;
        document.getElementById('drawer-product-form').reset();
        document.getElementById('product-id').value = '';
        if (salesSection) salesSection.style.display = 'none';
        deleteBtn.style.display = 'none';
    }

    overlay.style.display = 'block';
    setTimeout(() => {
        overlay.style.opacity = '1';
        drawer.classList.add('open');
    }, 10);
}

function closeDrawer() {
    const drawer = document.getElementById('product-drawer');
    const overlay = document.getElementById('drawer-overlay');
    if (drawer) drawer.classList.remove('open');
    if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.style.display = 'none', 300);
    }
}

async function saveProduct() {
    const id = document.getElementById('product-id').value;
    const productData = {
        name: document.getElementById('product-name').value,
        category: document.getElementById('product-category').value,
        price: parseFloat(document.getElementById('product-price').value),
        wholesalePrice: parseFloat(document.getElementById('product-wholesale-price').value)
    };

    const url = id ? `/api/products/${id}` : '/api/products';
    const method = id ? 'PUT' : 'POST';

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(url, {
            method: method,
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(productData)
        });

        if (response.ok) {
            Swal.fire(translations.saveSuccess, '', 'success');
            closeDrawer();
            fetchProducts();
        } else {
            const err = await response.json().catch(() => ({}));
            Swal.fire(translations.error, err.message || '', 'error');
        }
    } catch (error) {
        Swal.fire(translations.error, '', 'error');
    }
}

async function deleteProduct(id) {
    const result = await Swal.fire({
        title: translations.deleteConfirm,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444'
    });

    if (result.isConfirmed) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/products/${id}`, { 
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                Swal.fire(translations.deleted, '', 'success');
                closeDrawer();
                fetchProducts();
            }
        } catch (error) {
            Swal.fire(translations.error, '', 'error');
        }
    }
}

function exportProductsToExcel() {
    const products = Object.values(allProducts).flat();
    const worksheet = XLSX.utils.json_to_sheet(products);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
    XLSX.writeFile(workbook, "vortex_products.xlsx");
}
