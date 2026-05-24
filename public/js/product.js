// Vortex POS - Product Management Logic
const currentLang = localStorage.getItem("lang") || "ar";
const isAr = currentLang === "ar";

const t = {
  ar: {
    allCats: "كل الفئات",
    editProduct: "تعديل المنتج",
    addProduct: "إضافة منتج جديد",
    saveSuccess: "تم الحفظ بنجاح",
    deleteConfirm: "هل أنت متأكد من الحذف؟",
    deleted: "تم الحذف بنجاح",
    error: "حدث خطأ ما",
    retailSales: "مبيعات القطاعي",
    wholesaleSales: "مبيعات الجملة",
  },
  en: {
    allCats: "All Categories",
    editProduct: "Edit Product",
    addProduct: "Add New Product",
    saveSuccess: "Saved Successfully",
    deleteConfirm: "Are you sure you want to delete?",
    deleted: "Deleted Successfully",
    error: "Something went wrong",
    retailSales: "Retail Sales",
    wholesaleSales: "Wholesale Sales",
  },
};

const translations = t[currentLang];
const systemMode = localStorage.getItem("systemMode") || "retail";

const defaultCategories = {
  restaurant: isAr
    ? ["مشروبات", "وجبات رئيسية", "مقبلات", "حلويات"]
    : ["Drinks", "Main Courses", "Appetizers", "Desserts"],
  retail: isAr
    ? ["ملابس", "إكسسوارات", "أحذية", "إلكترونيات"]
    : ["Clothing", "Accessories", "Shoes", "Electronics"],
};

let allProducts = [];

document.addEventListener("DOMContentLoaded", () => {
  fetchProducts();

  const openDrawerBtn = document.getElementById("open-add-drawer");
  const closeDrawerBtn = document.getElementById("close-drawer");
  const drawerOverlay = document.getElementById("drawer-overlay");
  const productForm = document.getElementById("drawer-product-form");

  if (openDrawerBtn) openDrawerBtn.onclick = () => openEditDrawer();
  if (closeDrawerBtn) closeDrawerBtn.onclick = closeDrawer;
  if (drawerOverlay) drawerOverlay.onclick = closeDrawer;

  if (productForm) {
    productForm.onsubmit = async (e) => {
      e.preventDefault();
      await saveProduct();
    };
  }

  const deleteBtn = document.getElementById("delete-btn");
  if (deleteBtn) {
    deleteBtn.onclick = async () => {
      const id = document.getElementById("product-id").value;
      if (id) await deleteProduct(id);
    };
  }
});

async function fetchProducts() {
  try {
    const token = localStorage.getItem("token");
    const response = await fetch("/api/products", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return;

    allProducts = await response.json();
    const products = Object.values(allProducts).flat();

    renderProducts(products);
    populateCategoryList(products);
  } catch (error) {
    console.error("Fetch error:", error);
  }
}

function renderProducts(products) {
  const tableBody = document.getElementById("product-table");
  if (!tableBody) return;

  tableBody.innerHTML = "";
  updateStats(products);

  if (products.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="6" style="padding: 3rem; text-align: center; color: #94a3b8;">${isAr ? "لا توجد منتجات" : "No products found"}</td>`;
    tableBody.appendChild(row);
    return;
  }

  products.forEach((product) => {
    const row = document.createElement("tr");
    row.onclick = () => openEditDrawer(product);
    row.innerHTML = `
            <td>${product.id}</td>
            <td>${product.name}</td>
            <td><span class="category-pill ${getCategoryClass(product.category)}">${product.category}</span></td>
            <td>${parseFloat(product.price || 0).toFixed(2)} <small>EGP</small></td>
            <td>${parseFloat(product.wholesalePrice || product.price || 0).toFixed(2)} <small>EGP</small></td>
            <td>${product.sold || 0}</td>
        `;
    tableBody.appendChild(row);
  });
}

function updateStats(products) {
  const totalCountEl = document.getElementById("stat-total-count");
  const totalSoldEl = document.getElementById("stat-total-sold");
  const bestSellerEl = document.getElementById("stat-best-seller");

  if (totalCountEl) totalCountEl.textContent = products.length;

  let totalSold = 0;
  let bestSeller = { name: "---", sold: -1 };

  products.forEach((p) => {
    const sold = p.sold || 0;
    totalSold += sold;
    if (sold > bestSeller.sold) {
      bestSeller = { name: p.name, sold: sold };
    }
  });

  if (totalSoldEl) totalSoldEl.textContent = totalSold;
  if (bestSellerEl) bestSellerEl.textContent = bestSeller.name;
}

function getCategoryClass(category) {
  const cat = (category || "").toLowerCase();
  if (cat.includes("beef") || cat.includes("لحم")) return "cat-beef";
  if (cat.includes("chicken") || cat.includes("دجاج")) return "cat-chicken";
  if (cat.includes("drink") || cat.includes("مشروب")) return "cat-drink";
  return "";
}

function populateCategoryList(products) {
  const categories = [
    ...new Set([
      ...(defaultCategories[systemMode] || []),
      ...products.map((p) => p.category),
    ]),
  ].sort();
  const datalist = document.getElementById("category-list");
  const catFilter = document.getElementById("category-filter");

  if (datalist) {
    datalist.innerHTML = categories
      .map((c) => `<option value="${c}">`)
      .join("");
  }

  if (catFilter) {
    const current = catFilter.value;
    catFilter.innerHTML =
      `<option value="all">${translations.allCats}</option>` +
      categories.map((c) => `<option value="${c}">${c}</option>`).join("");
    catFilter.value = current || "all";
  }
}

function applyFilter() {
  const sort = document.getElementById("filter-options").value;
  const cat = document.getElementById("category-filter").value;
  const search = document.getElementById("search-bar").value.toLowerCase();

  let filtered = Object.values(allProducts).flat();

  if (search) {
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(search) ||
        p.category.toLowerCase().includes(search) ||
        p.id.toString().includes(search),
    );
  }

  if (cat !== "all") {
    filtered = filtered.filter((p) => p.category === cat);
  }

  if (sort === "most-sold")
    filtered.sort((a, b) => (b.sold || 0) - (a.sold || 0));
  else if (sort === "highest-price") filtered.sort((a, b) => b.price - a.price);
  else if (sort === "lowest-price") filtered.sort((a, b) => a.price - b.price);
  else filtered.sort((a, b) => b.id - a.id);

  renderProducts(filtered);
}

function searchProducts() {
  applyFilter();
}

function openEditDrawer(product = null) {
  const drawer = document.getElementById("product-drawer");
  const overlay = document.getElementById("drawer-overlay");
  const title = document.getElementById("drawer-title");
  const deleteBtn = document.getElementById("delete-btn");
  const salesSection = document.getElementById("drawer-sales-section");

  if (!drawer || !overlay) return;

  if (product) {
    title.textContent = translations.editProduct;
    document.getElementById("product-id").value = product.id;
    document.getElementById("product-name").value = product.name;
    document.getElementById("product-category").value = product.category;
    document.getElementById("product-price").value = product.price;
    document.getElementById("product-wholesale-price").value =
      product.wholesalePrice || product.price;

    if (salesSection) {
      salesSection.style.display = "block";
      document.getElementById("drawer-retail-sold").textContent =
        product.retail_sold || 0;
      document.getElementById("drawer-wholesale-sold").textContent =
        product.wholesale_sold || 0;
    }
    deleteBtn.style.display = "flex";
  } else {
    title.textContent = translations.addProduct;
    document.getElementById("drawer-product-form").reset();
    document.getElementById("product-id").value = "";
    if (salesSection) salesSection.style.display = "none";
    deleteBtn.style.display = "none";
  }

  overlay.style.display = "block";
  setTimeout(() => {
    overlay.style.opacity = "1";
    drawer.classList.add("open");
  }, 10);
}

function closeDrawer() {
  const drawer = document.getElementById("product-drawer");
  const overlay = document.getElementById("drawer-overlay");
  if (drawer) drawer.classList.remove("open");
  if (overlay) {
    overlay.style.opacity = "0";
    setTimeout(() => (overlay.style.display = "none"), 300);
  }
}

async function saveProduct() {
  const id = document.getElementById("product-id").value;
  const saveBtn = document.getElementById("save-product-btn");
  const originalBtnHtml = saveBtn.innerHTML;

  const name = document.getElementById("product-name").value.trim();
  const category = document.getElementById("product-category").value.trim();
  const price = parseFloat(document.getElementById("product-price").value);
  const wholesalePrice = parseFloat(
    document.getElementById("product-wholesale-price").value,
  );

  // 🛑 Basic Validation
  if (!name || !category || isNaN(price) || isNaN(wholesalePrice)) {
    Swal.fire(
      isAr
        ? "يرجى ملء جميع الحقول بشكل صحيح"
        : "Please fill all fields correctly",
      "",
      "warning",
    );
    return;
  }

  if (price < 0 || wholesalePrice < 0) {
    Swal.fire(
      isAr ? "الأسعار لا يمكن أن تكون سالبة" : "Prices cannot be negative",
      "",
      "warning",
    );
    return;
  }

  const productData = {
    name,
    category,
    price,
    wholesalePrice,
  };

  const url = id ? `/api/products/${id}` : "/api/products";
  const method = id ? "PUT" : "POST";

  try {
    // ⏳ Loading State
    saveBtn.disabled = true;
    saveBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${isAr ? "جاري الحفظ..." : "Saving..."}`;

    const token = localStorage.getItem("token");
    const response = await fetch(url, {
      method: method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(productData),
    });

    if (response.ok) {
      Swal.fire(translations.saveSuccess, "", "success");
      closeDrawer();
      fetchProducts();
    } else {
      const err = await response.json().catch(() => ({}));
      Swal.fire(translations.error, err.message || "", "error");
    }
  } catch (error) {
    Swal.fire(translations.error, "", "error");
  } finally {
    // 🔙 Restore State
    saveBtn.disabled = false;
    saveBtn.innerHTML = originalBtnHtml;
  }
}

async function deleteProduct(id) {
  const result = await Swal.fire({
    title: translations.deleteConfirm,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#ef4444",
  });

  if (result.isConfirmed) {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/products/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        Swal.fire(translations.deleted, "", "success");
        closeDrawer();
        fetchProducts();
      }
    } catch (error) {
      Swal.fire(translations.error, "", "error");
    }
  }
}

function exportProductsToExcel() {
  const products = Object.values(allProducts).flat();
  if (!products || products.length === 0) {
    Swal.fire({
      icon: "warning",
      title: isAr ? "لا توجد منتجات لتصديرها" : "No products to export",
    });
    return;
  }

  const excelData = products.map((product) => {
    return {
      [isAr ? "كود المنتج" : "Product Code"]: product.id,
      [isAr ? "الاسم" : "Name"]: product.name,
      [isAr ? "الفئة" : "Category"]: product.category || "-",
      [isAr ? "سعر البيع قطاعي (EGP)" : "Retail Price (EGP)"]: parseFloat(
        product.price || 0,
      ).toFixed(2),
      [isAr ? "سعر الجملة (EGP)" : "Wholesale Price (EGP)"]: parseFloat(
        product.wholesalePrice || product.price || 0,
      ).toFixed(2),
      [isAr ? "الكمية المباعة" : "Quantity Sold"]: parseInt(
        product.sold || 0,
        10,
      ),
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(excelData);

  // Auto-size columns to look super clean and prevent text clipping
  const maxCols = [];
  if (excelData.length > 0) {
    const headers = Object.keys(excelData[0]);
    headers.forEach((header, colIndex) => {
      maxCols[colIndex] = header.length + 5; // header length padding
    });
    excelData.forEach((row) => {
      headers.forEach((header, colIndex) => {
        const val = row[header] ? row[header].toString() : "";
        const len = val.length + 3;
        if (len > maxCols[colIndex]) {
          maxCols[colIndex] = len;
        }
      });
    });
    worksheet["!cols"] = maxCols.map((w) => ({ wch: Math.max(w, 12) }));
  }

  const workbook = XLSX.utils.book_new();
  if (!workbook.Workbook) workbook.Workbook = {};
  if (!workbook.Workbook.Views) workbook.Workbook.Views = [];
  workbook.Workbook.Views[0] = { RTL: isAr };

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    isAr ? "المنتجات" : "Products",
  );

  const fileName = isAr
    ? `تقرير_المنتجات_${new Date().toISOString().split("T")[0]}.xlsx`
    : `vortex_products_${new Date().toISOString().split("T")[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
