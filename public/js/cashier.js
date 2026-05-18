/**
 * Vortex POS - Cashier Engine
 * Optimized for Luxury Workstation Theme & Enterprise Best Practices
 */

const currentLang = localStorage.getItem('lang') || 'ar';
const isAr = currentLang === 'ar';

const t = {
    ar: {
        pageTitle: 'نافذة البيع - Vortex POS',
        headerPill: 'منصة البيع المباشر',
        home: 'الرئيسية',
        operator: 'المشغل',
        searchCustomer: 'ابحث عن عميل بالاسم أو الرقم...',
        phonePlaceholder: 'رقم الهاتف...',
        cash: 'كاش',
        card: 'فيزا / بطاقة',
        instapay: 'إنستاباي',
        vcash: 'فودافون كاش',
        cartSummary: 'ملخص السلة',
        emptyCart: 'السلة فارغة حالياً',
        subtotal: 'المجموع الفرعي',
        delivery: 'توصيل',
        total: 'الإجمالي',
        discount: 'الخصم',
        checkout: 'إتمام الطلب',
        selectDelivery: 'اختر منطقة التوصيل',
        items: 'أصناف',
        msgEmptyCart: '⚠️ لا يمكن إرسال طلب فارغ',
        sessionExpired: 'انتهت الجلسة، يرجى تسجيل الدخول مجدداً',
        confirmPayment: 'تأكيد استلام المبلغ',
        confirmReceipt: 'تم تأكيد الاستلام',
        cancel: 'إلغاء'
    },
    en: {
        pageTitle: 'Cashier Workspace - Vortex POS',
        headerPill: 'Direct Sales Platform',
        home: 'Home',
        operator: 'Operator',
        searchCustomer: 'Search customer by name or phone...',
        phonePlaceholder: 'Phone number...',
        cash: 'Cash',
        card: 'Card',
        instapay: 'InstaPay',
        vcash: 'V-Cash',
        cartSummary: 'Cart Summary',
        emptyCart: 'Cart is currently empty',
        subtotal: 'Subtotal',
        delivery: 'Delivery',
        total: 'Total',
        discount: 'Discount',
        checkout: 'Complete',
        selectDelivery: 'Select Delivery Area',
        items: 'items',
        msgEmptyCart: '⚠️ Cannot submit an empty order',
        sessionExpired: 'Session expired, please log in again',
        confirmPayment: 'Confirm Payment Receipt',
        confirmReceipt: 'Confirm Receipt',
        cancel: 'Cancel'
    }
};

let allCategorizedProducts = {};
let currentOrder = {};
let selectedItem = null;
let currentProductForModal = null;

// --- DOM Elements ---
const orderSummary = document.getElementById('order-summary');
const menuItemsContainer = document.getElementById('menu-items');
const categoryPillsContainer = document.getElementById('category-pills');
const phoneInput = document.getElementById('customer-phone');
const nameInput = document.getElementById('customer-name');
const deliveryPriceSelect = document.getElementById('delivery-price');
const submitButton = document.getElementById('submit-order');
const suggestionsBox = document.getElementById("suggestions");

// --- 1. Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    // 🚀 Parallel Boot: Do everything at once
    Promise.all([
        applyTranslations(),
        initUser(),
        initDelivery(),
        fetchProducts()
    ]);
    
    setupEventListeners();
    
    // Clean up empty sidebar space fast
    setTimeout(() => {
        const sidebar = document.getElementById('sidebar-container');
        if (sidebar && sidebar.innerHTML.trim() === '') {
            sidebar.style.display = 'none';
        }
    }, 50);
});

function applyTranslations() {
    const langT = t[currentLang];
    document.title = langT.pageTitle;
    document.documentElement.dir = isAr ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLang;

    const locIds = [
        ['loc-header-pill', langT.headerPill],
        ['loc-home', langT.home],
        ['loc-cash', langT.cash],
        ['loc-card', langT.card],
        ['loc-instapay', langT.instapay],
        ['loc-vcash', langT.vcash],
        ['loc-cart-summary', langT.cartSummary],
        ['loc-empty-cart', langT.emptyCart],
        ['loc-subtotal', langT.subtotal],
        ['loc-delivery', langT.delivery],
        ['loc-discount', langT.discount],
        ['loc-total', langT.total],
        ['loc-checkout', langT.checkout]
    ];

    locIds.forEach(([id, text]) => {
        const el = document.getElementById(id);
        if(el) el.textContent = text;
    });

    if(nameInput) nameInput.placeholder = langT.searchCustomer;
    if(phoneInput) {
        phoneInput.placeholder = langT.phonePlaceholder;
        phoneInput.oninput = (e) => {
            e.target.value = e.target.value.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[^0-9]/g, '');
        };
    }
}

function initUser() {
    const activeUserBadge = document.getElementById('activeUserBadge');
    let storedUsername = localStorage.getItem('username') || t[currentLang].operator;
    if (activeUserBadge) {
        activeUserBadge.querySelector('span').textContent = storedUsername;
    }
}

function initDelivery() {
    if (!deliveryPriceSelect) return;
    deliveryPriceSelect.innerHTML = `<option value="0">${t[currentLang].selectDelivery}</option>`;
    const fragment = document.createDocumentFragment();
    for (let i = 5; i <= 100; i += 5) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `${i} EGP`;
        option.dir = 'ltr';
        fragment.appendChild(option);
    }
    deliveryPriceSelect.appendChild(fragment);
    deliveryPriceSelect.addEventListener('change', renderOrderSummary);
}

// --- 2. Data Fetching ---
async function fetchProducts() {
    try {
        const response = await fetch('/api/products', {
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                Swal.fire({ icon: 'error', title: t[currentLang].sessionExpired })
                .then(() => window.location.href = "/index.html");
                return;
            }
            throw new Error(`Server error: ${response.status}`);
        }
        
        const rawData = await response.json();
        
        // 🧪 Sort products alphabetically within each category for consistency
        for (const cat in rawData) {
            rawData[cat].sort((a, b) => a.name.localeCompare(b.name, 'ar'));
        }

        // Optimized Category Override (Single Pass)
        let saruwalProducts = [];
        for (const cat in rawData) {
            rawData[cat] = rawData[cat].filter(p => {
                if (p.name === 'سروال الامثل') {
                    p.category = 'سراويل';
                    saruwalProducts.push(p);
                    return false;
                }
                return true;
            });
        }
        if (saruwalProducts.length > 0) rawData['سراويل'] = saruwalProducts;

        allCategorizedProducts = rawData;
        renderCategories();
        
        const categories = Object.keys(allCategorizedProducts);
        if (categories.length > 0) showCategory(categories[0]);
        else {
             menuItemsContainer.innerHTML = `<div class="empty-state">
                <i class="fas fa-box-open" style="font-size:2.5rem; margin-bottom:1rem; opacity:0.5;"></i>
                <p>${isAr ? 'لا يوجد منتجات متاحة حالياً' : 'No products available'}</p>
             </div>`;
        }
    } catch (error) {
        console.error("❌ Error loading products:", error);
        menuItemsContainer.innerHTML = `<div class="empty-state"><p>${isAr ? 'فشل الاتصال' : 'Connection failed'}</p></div>`;
    }
}

function renderCategories() {
    if (!categoryPillsContainer) return;
    const fragment = document.createDocumentFragment();
    const categories = Object.keys(allCategorizedProducts);

    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'pill';
        btn.textContent = cat;
        btn.dataset.category = cat;
        btn.onclick = () => showCategory(cat);
        fragment.appendChild(btn);
    });

    categoryPillsContainer.innerHTML = '';
    categoryPillsContainer.appendChild(fragment);
}

function showCategory(category) {
    document.querySelectorAll('.pill').forEach(p => {
        p.classList.toggle('active', p.dataset.category === category);
    });

    const products = allCategorizedProducts[category] || [];
    if (products.length === 0) {
        menuItemsContainer.innerHTML = `<div class="empty-state">${isAr ? 'لا توجد منتجات' : 'No products'}</div>`;
        return;
    }

    const fragment = document.createDocumentFragment();
    products.forEach(product => {
        const variants = product.variants || [];
        const hasVariants = variants.length > 0;
        const sizes = getSizesForCategory(product.category, product.name);
        const isSuperSimple = variants.length === 1 && sizes.length === 1 && sizes[0] === 'مقاس واحد';

        const card = document.createElement('div');
        card.className = 'menu-item animate-fade-in';
        card.onclick = () => {
            if (isSuperSimple) {
                addVariantToOrder(product.id, product.name, variants[0].price, variants[0].name || variants[0].color, sizes[0]);
            } else if (hasVariants) {
                showVariantModal(product);
            } else {
                addToOrder(product.id, product.name, product.price);
            }
        };
        card.innerHTML = `<h3>${product.name}</h3><p>${parseFloat(product.price).toFixed(2)} <small>EGP</small></p>`;
        fragment.appendChild(card);
    });

    menuItemsContainer.innerHTML = '';
    menuItemsContainer.appendChild(fragment);
}

function getSizesForCategory(category, productName) {
    const isKids = productName.includes("أطفالي");

    if (category === "ملابس إحرام") {
        if (isKids) {
            return ["1", "2", "3", "4", "5"];
        } else {
            return ["مقاس واحد"];
        }
    }

    if (category === "جلباب أطفالي") {
        // Even sizes from 30 to 54
        let sizes = [];
        for (let i = 30; i <= 54; i += 2) {
            sizes.push(i.toString());
        }
        return sizes;
    }

    const isHalfSleeve = productName.includes("نص كم") || productName.includes("نص كم");
    const isAlAzzLongSleeve = productName.includes("العز") && productName.includes("فخامه كم طويل");

    if (category === "جلباب رجالي" && (isHalfSleeve || isAlAzzLongSleeve)) {
        // Numeric sizes from 54 to 68
        let sizes = [];
        for (let i = 54; i <= 68; i += 2) {
            sizes.push(i.toString());
        }
        return sizes;
    }

    if (category === "سراويل") {
        // Even sizes from 22 to 34
        let sizes = [];
        for (let i = 22; i <= 34; i += 2) {
            sizes.push(i.toString());
        }
        return sizes;
    }

    if (category === "جلباب رجالي") {
        // Standard Men's sizes (56-64 with S-3XL)
        return [
            "56 S", "56 M", "56 L", "56 XL", "56 2XL", "56 3XL",
            "58 S", "58 M", "58 L", "58 XL", "58 2XL", "58 3XL",
            "60 S", "60 M", "60 L", "60 XL", "60 2XL", "60 3XL",
            "62 S", "62 M", "62 L", "62 XL", "62 2XL", "62 3XL",
            "64 S", "64 M", "64 L", "64 XL", "64 2XL", "64 3XL"
        ];
    }

    // Default fallback
    return ["Free Size"];
}

let selectedFabricForModal = '';
let selectedPriceForModal = 0;

function showVariantModal(product) {
    currentProductForModal = product;
    selectedFabricForModal = ''; 
    selectedPriceForModal = product.price;
    const variants = product.variants || [];
    const sizes = getSizesForCategory(product.category, product.name);

    const fabricMap = {};
    variants.forEach(v => {
        const fName = v.name || v.color;
        if (fName && fName.trim() !== "") {
            fabricMap[fName] = v.price || v.cost || product.price;
        }
    });
    
    const fabrics = Object.keys(fabricMap);
    const hasFabrics = fabrics.length > 0;
    const isSingleFabric = fabrics.length === 1;
    
    // Unlock sizes immediately if there's only one fabric choice
    const initialButtonStyle = (hasFabrics && !isSingleFabric) ? 'opacity: 0.4; pointer-events: none;' : '';

    // ⚡ Auto-select if single fabric
    if (isSingleFabric) {
        selectedFabricForModal = fabrics[0];
        selectedPriceForModal = fabricMap[fabrics[0]];
    }

    let variantsHtml = `
        <div class="variant-selection-container" style="padding: 1.2rem 0.8rem; font-family: 'Almarai', 'Tajawal', sans-serif;">
            <!-- 🏷️ Brand Header -->
            <div style="text-align: center; margin-bottom: 1.5rem;">
                <h2 style="
                    font-size: 1.8rem; 
                    font-weight: 800; 
                    color: var(--secondary); 
                    margin-bottom: 5px;
                    font-family: 'Almarai', sans-serif;
                ">${product.name}</h2>
                <div style="width: 50px; height: 3px; background: var(--primary); margin: 0 auto; border-radius: 10px; opacity: 0.6;"></div>
            </div>

            <!-- 🎨 Fabric Selection Section (Expanded slightly to avoid scroll) -->
            <div style="margin-bottom: 1rem; text-align: center;">
                <div style="
                    display: flex; 
                    flex-wrap: wrap; 
                    justify-content: center; 
                    gap: 8px; 
                    max-height: 160px; 
                    overflow-y: auto; 
                    padding: 8px 4px;
                    scrollbar-width: none;
                ">
                    ${fabrics.length > 0 ? fabrics.map(fabric => `
                        <button class="variant-btn-select color-choice-btn ${fabric === selectedFabricForModal ? 'active' : ''}" 
                                style="min-width: 140px; padding: 10px 5px; border-radius: 12px;" 
                                data-fabric="${fabric}" 
                                data-price="${fabricMap[fabric]}"
                                onclick="selectFabricForOrder('${fabric}', ${fabricMap[fabric]})">
                            <span style="font-weight:800; font-size:1rem; color:#1e293b;">${fabric}</span>
                            <span style="font-size:0.8rem; color:var(--primary); font-weight:900;">${fabricMap[fabric]} EGP</span>
                        </button>
                    `).join('') : `<p style="opacity:0.5;">${isAr ? 'لا يوجد خامات معرفة' : 'No fabrics defined'}</p>`}
                </div>
            </div>
            
            <!-- 📏 Sizes Selection Section (Ultra Compact) -->
            <div id="size-selection-area" style="text-align: center; display: ${sizes.length === 1 && sizes[0] === 'مقاس واحد' ? 'none' : 'block'}; border-top: 1px solid #f1f5f9; padding-top: 1.2rem;">
                <div id="size-buttons-grid" style="display: flex; flex-wrap: nowrap; justify-content: center; gap: 15px; padding: 5px;">
                    ${product.category === 'جلباب رجالي' ? 
                        // Grouping for Men's Galabeya
                        (() => {
                            const groups = {};
                            sizes.forEach(s => {
                                const length = s.split(' ')[0];
                                if (!groups[length]) groups[length] = [];
                                groups[length].push(s);
                            });
                            return Object.keys(groups).map(len => `
                                <div class="size-column" style="background: #ffffff; border: 1.5px solid #f1f5f9; border-radius: 16px; padding: 12px 8px; display: flex; flex-direction: column; gap: 8px; min-width: 150px; box-shadow: 0 4px 15px rgba(0,0,0,0.03);">
                                    <div style="font-weight: 900; color: var(--primary); margin-bottom: 5px; font-size: 1.3rem; border-bottom: 2px solid var(--primary); padding-bottom: 4px; display: inline-block; font-family: 'Almarai', sans-serif;">${len}</div>
                                    ${groups[len].map(s => `
                                        <button class="variant-btn-select size-btn" 
                                                style="width: 100%; background:#f8fafc !important; border: 1px solid #e2e8f0; padding: 6px 4px; border-radius: 10px; ${initialButtonStyle}" 
                                                onclick="handleSizeClick('${s}')">
                                            <span style="font-weight:800; font-size:1.05rem; color:#334155;">${s.split(' ')[1] || s}</span>
                                        </button>
                                    `).join('')}
                                </div>
                            `).join('');
                        })() : 
                        // Default simple grid for other categories
                        sizes.map(size => `
                            <button class="variant-btn-select size-btn" style="min-width: 140px; height: 50px; background:white !important; border: 1.5px solid #e2e8f0; border-radius: 12px; ${initialButtonStyle}" onclick="handleSizeClick('${size}')">
                                <span style="font-weight:800; font-size:1.1rem; color:#1e293b; font-family: 'Almarai', sans-serif;">${size}</span>
                            </button>
                        `).join('')
                    }
                </div>
            </div>
        </div>
    `;

    commentCard.innerHTML = variantsHtml;
    overlay.style.display = 'block';
    commentCard.classList.add('active');
}

function selectFabricForOrder(fabric, price) {
    selectedFabricForModal = fabric;
    selectedPriceForModal = parseFloat(price);
    
    // UI Feedback: Highlight selected fabric button
    document.querySelectorAll('.color-choice-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.fabric === fabric) btn.classList.add('active');
    });

    // ⚡ Automation: If category is Ihram and only One Size exists, add to order immediately
    const sizes = getSizesForCategory(currentProductForModal.category, currentProductForModal.name);
    if (sizes.length === 1 && sizes[0] === 'مقاس واحد') {
        handleSizeClick('مقاس واحد');
        return;
    }

    // 🔄 Dynamic Size Refresh: If fabric is Half-Sleeve, change sizes to numeric 54-68
    const isHalfSleeve = fabric.includes("نص كم");
    const isAlAzzLongSleeve = (currentProductForModal.name.includes("العز") && fabric.includes("فخامه كم طويل"));
    
    if (isHalfSleeve || isAlAzzLongSleeve) {
        const sizes = [];
        for (let i = 54; i <= 68; i += 2) sizes.push(i.toString());
        renderSizeButtons(sizes);
    } else {
        // Revert to original category sizes
        const originalSizes = getSizesForCategory(currentProductForModal.category, currentProductForModal.name);
        renderSizeButtons(originalSizes);
    }

    // 🔓 Unlock size buttons
    document.querySelectorAll('.size-btn').forEach(btn => {
        btn.classList.remove('disabled');
        btn.style.opacity = '1';
        btn.style.pointerEvents = 'auto';
    });
}

function renderSizeButtons(sizes) {
    const grid = document.getElementById('size-buttons-grid');
    const initialButtonStyle = (selectedFabricForModal) ? '' : 'opacity: 0.4; pointer-events: none;';
    
    // 🧹 Reset any dynamic grid styles to prevent layout leaks between products
    grid.style.display = 'flex';
    grid.style.flexWrap = 'nowrap';
    grid.style.gridTemplateColumns = '';
    grid.style.gap = '15px';
    grid.style.width = '';
    grid.style.maxWidth = '';
    grid.style.margin = '';
    grid.style.padding = '5px';

    const isNumericCategory = currentProductForModal.category === 'جلباب أطفالي' || currentProductForModal.category === 'سراويل' || (currentProductForModal.category === 'جلباب رجالي' && !sizes[0].includes('S'));

    if (isNumericCategory) {
        // 📏 Large & Bold Numeric Grid (Two Rows)
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'repeat(4, 1fr)'; // 4 columns
        grid.style.gap = '15px';
        grid.style.width = '100%';
        grid.style.maxWidth = '600px';
        grid.style.margin = '0 auto';
        grid.style.padding = '10px';

        grid.innerHTML = sizes.map(size => {
            const isSpecial = size === '66' || size === '68' || size === '32' || size === '34';
            return `
                <button class="variant-btn-select size-btn numeric-btn ${isSpecial ? 'special-price-btn' : ''}" 
                        style="height: 90px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: white !important; border: 2.5px solid #f1f5f9; border-radius: 18px; transition: 0.3s; ${initialButtonStyle}" 
                        onclick="handleSizeClick('${size}')">
                    <span style="font-weight: 900; font-size: 1.5rem; color: #1e293b; line-height: 1.1;">${size}</span>
                </button>
            `;
        }).join('');
    } else if (currentProductForModal.category === 'جلباب رجالي') {
        // Standard grouped grid for Men's Galabeya
        const groups = {};
        sizes.forEach(s => {
            const length = s.split(' ')[0];
            if (!groups[length]) groups[length] = [];
            groups[length].push(s);
        });
        grid.innerHTML = Object.keys(groups).map(len => `
            <div class="size-column" style="background: #ffffff; border: 1.5px solid #f1f5f9; border-radius: 16px; padding: 12px 8px; display: flex; flex-direction: column; gap: 8px; min-width: 150px; box-shadow: 0 4px 15px rgba(0,0,0,0.03);">
                <div style="font-weight: 900; color: var(--primary); margin-bottom: 5px; font-size: 1.3rem; border-bottom: 2px solid var(--primary); padding-bottom: 4px; display: inline-block;">${len}</div>
                ${groups[len].map(s => `
                    <button class="variant-btn-select size-btn" style="width: 100%; background:#f8fafc !important; border: 1px solid #e2e8f0; padding: 6px 4px; border-radius: 10px; ${initialButtonStyle}" onclick="handleSizeClick('${s}')">
                        <span style="font-weight:800; font-size:1.05rem; color:#334155;">${s.split(' ')[1] || s}</span>
                    </button>
                `).join('')}
            </div>
        `).join('');
    } else {
        grid.innerHTML = sizes.map(size => `
            <button class="variant-btn-select size-btn" style="min-width: 140px; height: 50px; background:white !important; border: 1.5px solid #e2e8f0; border-radius: 12px; ${initialButtonStyle}" onclick="handleSizeClick('${size}')">
                <span style="font-weight:800; font-size:1.1rem; color:#1e293b;">${size}</span>
            </button>
        `).join('');
    }
}

function handleSizeClick(size) {
    if (!currentProductForModal) return;
    
    // Check if fabric is required and selected
    const variants = currentProductForModal.variants || [];
    const hasFabrics = variants.some(v => (v.name || v.color));
    
    if (hasFabrics && !selectedFabricForModal) {
        Swal.fire({
            icon: 'warning',
            title: isAr ? 'تنبيه' : 'Attention',
            text: isAr ? 'يرجى اختيار الخامة / اللون أولاً' : 'Please select fabric / color first',
            confirmButtonColor: 'var(--primary)'
        });
        return;
    }

    addVariantToOrder(currentProductForModal.id, currentProductForModal.name, selectedPriceForModal, selectedFabricForModal, size);
}

function addVariantToOrder(id, name, price, color, size) {
    // 🧠 Automatic Special Size Surcharge (+50 EGP)
    let finalPrice = parseFloat(price);
    let finalSizeLabel = size || '';
    
    // Check if size is "Special"
    // Rule 1: 'الفقي' products with size starting with "64" OR containing "2XL" or "3XL"
    const isFaqiSpecial = name.startsWith("الفقي") && (size.startsWith("64") || size.includes("2XL") || size.includes("3XL"));
    
    // Rule 2: 'سراويل' category with size "32" or "34"
    const isSaruwalSpecial = currentProductForModal && currentProductForModal.category === "سراويل" && (size === "32" || size === "34");

    // Rule 3: Half-sleeve or specific long-sleeve with size "66" or "68"
    const isLargeSizeGalabeya = (color.includes("نص كم") || color.includes("فخامه كم طويل")) && 
                               (size === "66" || size === "68");

    if (isFaqiSpecial || isSaruwalSpecial || isLargeSizeGalabeya) {
        finalPrice += 50;
    }

    // 🎨 Smart Labeling: Hide "عادي" or empty colors
    const displayColor = (color && color !== 'عادي') ? color : '';
    const variantLabel = `${displayColor} ${finalSizeLabel}`.trim();
    const uniqueKey = variantLabel ? `${name} (${variantLabel})` : name;
    
    if (!currentOrder[uniqueKey]) {
        currentOrder[uniqueKey] = { 
            id: id,
            baseName: name,
            variant: variantLabel,
            color: color || '',
            size: finalSizeLabel || '',
            price: finalPrice, 
            quantity: 1, 
            comment: [] 
        };
    } else {
        currentOrder[uniqueKey].quantity++;
    }
    
    closeCommentCard();
    renderOrderSummary();
}

// --- 3. Order Logic ---
function addToOrder(id, name, price) {
    if (!currentOrder[name]) {
        currentOrder[name] = { id: id, price: parseFloat(price), quantity: 1, comment: [] };
    } else {
        currentOrder[name].quantity++;
    }
    renderOrderSummary();
}

function updateQty(name, delta) {
    if (!currentOrder[name]) return;
    currentOrder[name].quantity += delta;
    if (currentOrder[name].quantity <= 0) delete currentOrder[name];
    renderOrderSummary();
}

function renderOrderSummary() {
    let subtotal = 0;
    let totalDiscount = 0;
    let itemCount = 0;
    orderSummary.innerHTML = '';

    const items = Object.keys(currentOrder);
    
    if (items.length === 0) {
        orderSummary.innerHTML = `
            <div class="empty-cart">
                <div class="empty-cart-icon-wrapper">
                    <i class="fas fa-shopping-basket"></i>
                </div>
                <p>${t[currentLang].emptyCart}</p>
                <span>${t[currentLang].startAdding || 'ابدأ بإضافة منتجات لطلبك'}</span>
            </div>
        `;
    } else {
        // 🚀 Optimization: Batch all rows into a single fragment string to minimize reflows
        const rowsHtml = items.map(name => {
            const item = currentOrder[name];
            const cost = item.price * item.quantity;
            subtotal += cost;
            itemCount += item.quantity;

            let commentsHtml = item.comment.map((c, idx) => {
                const addPrice = parseFloat(c.price) || 0;
                if (c.isDiscount) {
                    totalDiscount += Math.abs(addPrice) * item.quantity;
                    return `
                        <div style="display: inline-flex; align-items: center; background: rgba(239,68,68,0.1); color: #ef4444; padding: 4px 10px; border-radius: 8px; font-size: 0.7rem; font-weight: 700; gap: 8px;">
                            <i class="fas fa-tag"></i>
                            <span>${c.text} (${addPrice.toFixed(2)} EGP)</span>
                            <button onclick="removeComment('${name}', ${idx})" style="background:none; border:none; color:inherit; cursor:pointer; font-size:0.8rem;"><i class="fas fa-times-circle"></i></button>
                        </div>
                    `;
                } else {
                    subtotal += addPrice * item.quantity;
                    return `
                        <div style="display: inline-flex; align-items: center; background: rgba(0, 128, 96, 0.1); color: var(--primary); padding: 4px 10px; border-radius: 8px; font-size: 0.7rem; font-weight: 700; gap: 8px;">
                            <span>${c.text} ${addPrice > 0 ? `(+${addPrice})` : ''}</span>
                            <button onclick="removeComment('${name}', ${idx})" style="background:none; border:none; color:inherit; cursor:pointer; font-size:0.8rem;"><i class="fas fa-times-circle"></i></button>
                        </div>
                    `;
                }
            }).join('');

            return `
                <div class="order-row animate-fade-in">
                    <div class="order-info">
                        <span class="order-item-name">${name}</span>
                        <span class="order-price">${cost.toFixed(2)}</span>
                    </div>
                    <div class="order-actions-row">
                        <div class="order-actions">
                            <button onclick="updateQty('${name}', -1)"><i class="fas fa-minus"></i></button>
                            <span style="font-weight: 800; min-width: 20px; text-align: center;">${item.quantity}</span>
                            <button onclick="updateQty('${name}', 1)"><i class="fas fa-plus"></i></button>
                        </div>
                        <div class="row-tools" style="display: flex; gap: 10px;">
                            <button onclick="openCommentCard('${name}')" style="background:none; border:none; color:var(--primary); cursor:pointer;"><i class="fas fa-comment-medical"></i></button>
                            <button onclick="updateQty('${name}', -${item.quantity})" style="background:none; border:none; color:#ef4444; cursor:pointer;"><i class="fas fa-trash-alt"></i></button>
                        </div>
                    </div>
                    <div class="comments-container" style="display:flex; flex-wrap:wrap; gap:6px; margin-top:10px;">
                        ${commentsHtml}
                    </div>
                </div>
            `;
        }).join('');

        orderSummary.innerHTML = rowsHtml;
    }

    const delivery = parseFloat(deliveryPriceSelect.value) || 0;
    const total = subtotal + delivery - totalDiscount;

    const subtotalEl = document.getElementById('subtotal-val');
    const deliveryEl = document.getElementById('delivery-val');
    const discountEl = document.getElementById('discount-val');
    const totalEl = document.getElementById('order-total');

    subtotalEl.textContent = subtotal.toFixed(2);
    subtotalEl.className = subtotal === 0 ? 'zero-val' : 'active-val';

    deliveryEl.textContent = delivery.toFixed(2);
    deliveryEl.className = delivery === 0 ? 'zero-val' : 'active-val';

    discountEl.textContent = totalDiscount === 0 ? '0.00' : totalDiscount.toFixed(2);
    discountEl.className = totalDiscount === 0 ? 'zero-val' : 'active-discount';

    totalEl.textContent = total.toFixed(2);
    totalEl.className = total === 0 ? 'zero-val' : 'active-total';
    document.getElementById('cart-count').textContent = `${itemCount} ${t[currentLang].items}`;
}

// --- 4. Comment & Add-ons System ---
const overlay = document.createElement('div');
overlay.className = 'overlay';
const commentCard = document.createElement('div');
commentCard.className = 'comment-card';

document.body.appendChild(overlay);
document.body.appendChild(commentCard);

function openCommentCard(itemName) {
    selectedItem = itemName;
    const lang = t[currentLang];
    
    commentCard.innerHTML = `
        <div class="variant-modal-header" style="text-align:center; margin-bottom:1rem; padding-bottom: 1rem; border-bottom: 1px solid #f1f5f9;">
            <h2 style="font-size:1.5rem; font-weight:900; color:#1e293b; margin-bottom: 5px;">${itemName}</h2>
            <p style="color:#64748b; font-size: 0.9rem; font-weight: 500;">${isAr ? 'تخصيص الصنف (ملاحظات، إضافات، أو خصم)' : 'Customize item (Notes, Add-ons, or Discount)'}</p>
        </div>
        
        <div class="variant-selection-container" style="padding: 0 0.5rem; text-align: center;">
            <div style="margin-bottom: 1rem;">
                <h4 style="margin-bottom:0.75rem; font-size:0.9rem; font-weight:800; color:#1e293b; display:flex; align-items:center; justify-content:center; gap:8px;">
                    <i class="fas fa-edit" style="color:var(--primary);"></i> ${isAr ? 'ملاحظة خاصة' : 'Special Note'}
                </h4>
                <textarea id="customComment" 
                    style="width: 100%; height: 80px; padding: 12px; border-radius: 14px; border: 2px solid #f1f5f9; font-family: inherit; font-size: 0.95rem; transition: 0.3s; resize: none;"
                    placeholder="${isAr ? 'ملاحظة هامة  ...' : 'any notes ...'}"></textarea>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                <div style="background: rgba(0, 128, 96, 0.02); padding: 0.75rem; border-radius: 16px; border: 1px solid #f1f5f9;">
                    <h4 style="margin-bottom:0.5rem; font-size:0.85rem; font-weight:800; color:#1e293b; display:flex; align-items:center; justify-content:center; gap:8px;">
                        <i class="fas fa-plus-circle" style="color:var(--primary);"></i> ${isAr ? 'تكلفة إضافية' : 'Extra Charge'}
                    </h4>
                    <input type="text" id="manualPriceInput" 
                           placeholder="0.00" 
                           style="text-align: center; width: 100%; font-size: 1.1rem; padding: 10px; border-radius: 12px; border: 2px solid #f1f5f9; font-weight: 700; color: var(--primary);"
                           oninput="this.value = this.value.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[^0-9.]/g, '')">
                </div>

                <div style="background: rgba(239, 68, 68, 0.02); padding: 0.75rem; border-radius: 16px; border: 1px solid #fee2e2;">
                    <h4 style="margin-bottom:0.5rem; font-size:0.85rem; font-weight:800; color:#1e293b; display:flex; align-items:center; justify-content:center; gap:8px;">
                        <i class="fas fa-tag" style="color:#ef4444;"></i> ${isAr ? 'خصم يدوي' : 'Manual Discount'}
                    </h4>
                    <input type="text" id="manualDiscountInput" 
                           placeholder="0.00" 
                           style="text-align: center; width: 100%; font-size: 1.1rem; padding: 10px; border-radius: 12px; border: 2px solid #fee2e2; font-weight: 700; color: #ef4444; background: white;"
                           oninput="this.value = this.value.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[^0-9.]/g, '')">
                </div>
            </div>

            <div class="popular-comments" id="popularComments" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-bottom: 1.5rem;"></div>
            
            <div style="border-top: 1px solid #f1f5f9; padding-top: 1rem;">
                <button class="save-comment-btn" onclick="saveCustomComment()" 
                        style="width: 100%; padding: 1rem; background: var(--primary); color: white; border: none; border-radius: 16px; font-weight: 800; font-size: 1.1rem; cursor: pointer; box-shadow: 0 10px 20px rgba(0, 128, 96, 0.2); transition: 0.3s;">
                    <i class="fas fa-save" style="margin-inline-end: 8px;"></i> ${isAr ? 'حفظ وإضافة للسلة' : 'Save & Update Cart'}
                </button>
            </div>
        </div>
    `;
    
    fetchPopularComments();
    overlay.style.display = 'block';
    commentCard.classList.add('active');
}

function closeCommentCard() {
    overlay.style.display = 'none';
    commentCard.classList.remove('active');
}

function removeComment(itemName, commentIdx) {
    if (!currentOrder[itemName]) return;
    currentOrder[itemName].comment.splice(commentIdx, 1);
    renderOrderSummary();
}

async function fetchPopularComments() {
    const container = document.getElementById('popularComments');
    if (!container) return;
    try {
        const res = await fetch('/comments/popular');
        const comments = await res.json();
        container.innerHTML = '';
        comments.slice(0, 6).forEach(c => {
            const btn = document.createElement('button');
            btn.className = 'comment-btn';
            btn.innerHTML = `<div>${c.commentText}</div><div style="color:var(--primary)">+${c.price}</div>`;
            btn.onclick = () => {
                addCommentToItem(selectedItem, c.commentText, c.price);
                closeCommentCard();
            };
            container.appendChild(btn);
        });
    } catch (e) { console.error(e); }
}

function addCommentToItem(itemName, text, price) {
    if (!currentOrder[itemName]) return;
    currentOrder[itemName].comment.push({ text, price: parseFloat(price) || 0 });
    renderOrderSummary();
}

function saveCustomComment() {
    const text = document.getElementById('customComment').value.trim();
    const price = parseFloat(document.getElementById('manualPriceInput').value) || 0;
    const discount = parseFloat(document.getElementById('manualDiscountInput').value) || 0;

    if (text || price > 0) {
        addCommentToItem(selectedItem, text || (isAr ? 'إضافة' : 'Add-on'), price);
    }
    if (discount > 0) {
        // Store discount as a negative price entry tagged with isDiscount flag
        if (!currentOrder[selectedItem]) return closeCommentCard();
        currentOrder[selectedItem].comment.push({
            text: isAr ? `خصم يدوي` : 'Manual Discount',
            price: -discount,
            isDiscount: true
        });
        renderOrderSummary();
    }
    closeCommentCard();
}

overlay.onclick = closeCommentCard;

// --- 5. Order Submission ---
async function getBestDiscountCode(orderDetails) {
    try {
        const productNames = orderDetails.map(item => item.name);
        const response = await fetch(`/api/discounts/check`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ products: productNames })
        });
        if (!response.ok) return null;
        const data = await response.json();
        return data.bestDiscountCode || null;
    } catch (error) {
        console.error("❌ Error fetching discount:", error);
        return null;
    }
}

async function submitOrder() {
    const items = Object.keys(currentOrder);
    if (items.length === 0) {
        Swal.fire({ icon: 'warning', title: t[currentLang].msgEmptyCart });
        return;
    }

    const paymentMethod = document.getElementById('payment-method').value;
    const total = parseFloat(document.getElementById('order-total').textContent);

    if (paymentMethod !== 'cash') {
        const confirmed = await Swal.fire({
            title: t[currentLang].confirmPayment,
            html: `
                <div style="font-size: 1.1rem; line-height: 1.6;">
                    ${t[currentLang].total}: <span dir="ltr" style="font-weight: 800; color: var(--primary);">${total.toFixed(2)} EGP</span>
                    <br>
                    <span style="color: #666; font-size: 0.9rem;">
                        ${currentLang === 'ar' ? 'عبر' : 'via'} <b style="color: var(--text-main);">${paymentMethod.toUpperCase()}</b>
                    </span>
                </div>
            `,
            icon: 'info',
            showCancelButton: true,
            confirmButtonText: t[currentLang].confirmReceipt,
            cancelButtonText: t[currentLang].cancel
        });
        if (!confirmed.isConfirmed) return;
    }

    const orderDetails = items.map(key => ({
        productId: currentOrder[key].id,
        name: currentOrder[key].baseName || key,
        variant: currentOrder[key].variant || null,
        color: currentOrder[key].color || null,
        size: currentOrder[key].size || null,
        price: currentOrder[key].price,
        quantity: currentOrder[key].quantity,
        comments: currentOrder[key].comment
    }));

    // Skip discount fetch for now (System core version)
    const discountCode = null; // await getBestDiscountCode(orderDetails);

    const orderData = {
        customer: {
            name: nameInput.value || "--",
            phone: phoneInput.value || "0000000000",
            address: 'Store'
        },
        orderDetails,
        deliveryPrice: parseFloat(deliveryPriceSelect.value) || 0,
        orderTotal: total,
        payment_method: paymentMethod,
        discountCode
    };

    try {
        submitButton.disabled = true;
        submitButton.style.opacity = '0.5';
        submitButton.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${isAr ? 'جاري الحفظ...' : 'Saving...'}`;

        const res = await fetch('/api/order', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(orderData)
        });
        
        if (res.ok) {
            // ✅ حفظ بيانات الإيصال في localStorage عشان صفحة الإيصال تلاقيها
            const savedOrder = await res.json().catch(() => ({}));
            const receiptData = {
                id: savedOrder.id || savedOrder.orderId || Date.now(),
                orderDate: new Date().toLocaleString('ar-EG'),
                customerName: orderData.customer.name,
                customerPhone: orderData.customer.phone,
                customerAddress: orderData.customer.address,
                orderDetails: orderData.orderDetails,
                deliveryPrice: orderData.deliveryPrice,
                discount: 0,
                total: orderData.orderTotal
            };
            localStorage.setItem('receiptData', JSON.stringify(receiptData));
            
            Swal.fire({ icon: 'success', title: isAr ? 'تم بنجاح' : 'Success', timer: 1500, showConfirmButton: false });
            resetForm();
        } else {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.message || 'Server error');
        }
    } catch (e) {
        Swal.fire({ icon: 'error', title: 'Error', text: e.message });
    } finally {
        submitButton.disabled = false;
        submitButton.style.opacity = '1';
        submitButton.innerHTML = `<i class="fas fa-check-circle"></i> ${t[currentLang].checkout}`;
    }
}

function resetForm() {
    currentOrder = {};
    nameInput.value = '';
    phoneInput.value = '';
    deliveryPriceSelect.value = '0';
    renderOrderSummary();
}

function setPaymentMethod(method) {
    document.getElementById('payment-method').value = method;
    document.querySelectorAll('.payment-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.payment-btn[data-method="${method}"]`).classList.add('active');
}

// --- 5. Customer Search ---
let searchTimeout;
phoneInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    const phone = phoneInput.value.trim();
    if (phone.length < 3) {
        suggestionsBox.style.display = 'none';
        return;
    }

    // 🕒 Debounce for 400ms to avoid flooding the server
    searchTimeout = setTimeout(async () => {
        try {
            const res = await fetch(`/api/customers/${phone}`);
            const data = await res.json();
            suggestionsBox.innerHTML = '';
            
            if (data.length > 0) {
                data.forEach(c => {
                    const div = document.createElement('div');
                    div.className = 'suggestion-item';
                    div.textContent = `${c.name} (${c.phone})`;
                    div.onclick = () => {
                        nameInput.value = c.name;
                        phoneInput.value = c.phone;
                        suggestionsBox.style.display = 'none';
                    };
                    suggestionsBox.appendChild(div);
                });
                suggestionsBox.style.display = 'block';
            }
        } catch (e) { console.error(e); }
    }, 400);
});

function setupEventListeners() {
    if (submitButton) submitButton.addEventListener('click', submitOrder);
    
    // Close suggestions on outside click
    document.addEventListener('click', (e) => {
        if (!phoneInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
            suggestionsBox.style.display = 'none';
        }
    });
}