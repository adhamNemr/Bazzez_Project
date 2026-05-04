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
document.addEventListener('DOMContentLoaded', () => {
    applyTranslations();
    initUser();
    initDelivery();
    fetchProducts();
    setupEventListeners();
    
    // Clean up empty sidebar space
    setTimeout(() => {
        const sidebar = document.getElementById('sidebar-container');
        if (sidebar && sidebar.innerHTML.trim() === '') {
            sidebar.style.display = 'none';
        }
    }, 500);
});

function applyTranslations() {
    const langT = t[currentLang];
    document.title = langT.pageTitle;
    document.documentElement.dir = isAr ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLang;

    // Static Texts
    const updateLoc = (id, text) => {
        const el = document.getElementById(id);
        if(el) el.textContent = text;
    };

    updateLoc('loc-header-pill', langT.headerPill);
    updateLoc('loc-home', langT.home);
    updateLoc('loc-cash', langT.cash);
    updateLoc('loc-card', langT.card);
    updateLoc('loc-instapay', langT.instapay);
    updateLoc('loc-vcash', langT.vcash);
    updateLoc('loc-cart-summary', langT.cartSummary);
    updateLoc('loc-empty-cart', langT.emptyCart);
    updateLoc('loc-subtotal', langT.subtotal);
    updateLoc('loc-delivery', langT.delivery);
    updateLoc('loc-total', langT.total);
    updateLoc('loc-checkout', langT.checkout);

    // Placeholders
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
    if (deliveryPriceSelect) {
        deliveryPriceSelect.innerHTML = `<option value="0">${t[currentLang].selectDelivery}</option>`;
        for (let i = 5; i <= 100; i += 5) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `${i} EGP`;
            option.dir = 'ltr';
            deliveryPriceSelect.appendChild(option);
        }
        deliveryPriceSelect.addEventListener('change', renderOrderSummary);
    }
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
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.message || `Server responded with ${response.status}`);
        }
        
        const rawData = await response.json();
        allCategorizedProducts = rawData;
        
        renderCategories();
        
        const categories = Object.keys(allCategorizedProducts);
        if (categories.length > 0) {
            showCategory(categories[0]);
        } else {
             menuItemsContainer.innerHTML = `<div class="empty-state">
                <i class="fas fa-box-open" style="font-size:2.5rem; margin-bottom:1rem; opacity:0.5;"></i>
                <p>${isAr ? 'لا يوجد منتجات متاحة حالياً' : 'No products available'}</p>
                <small>${isAr ? 'أضف منتجات من صفحة المخزن لتظهر هنا' : 'Add products from inventory to see them here'}</small>
             </div>`;
        }

    } catch (error) {
        console.error("❌ Error loading products:", error);
        menuItemsContainer.innerHTML = `<div class="empty-state">
            <i class="fas fa-exclamation-triangle" style="font-size:2rem; margin-bottom:1rem; color:#f59e0b;"></i>
            <p>${isAr ? 'عذراً، فشل الاتصال بالسيرفر' : 'Connection failed'}</p>
            <small style="margin-top:10px; font-size:0.8rem; opacity:0.6;">${error.message}</small>
            <button onclick="fetchProducts()" class="btn-primary" style="margin-top:20px; padding:10px 20px; border-radius:10px; border:none; cursor:pointer;">${isAr ? 'إعادة المحاولة' : 'Retry'}</button>
        </div>`;
    }
}

function renderCategories() {
    if (!categoryPillsContainer) return;
    categoryPillsContainer.innerHTML = '';
    
    const categories = Object.keys(allCategorizedProducts);
    if (categories.length === 0) return;

    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'pill';
        btn.textContent = cat;
        btn.dataset.category = cat;
        btn.onclick = () => showCategory(cat);
        categoryPillsContainer.appendChild(btn);
    });
}

function showCategory(category) {
    // Update active pill UI
    document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
    const activePill = document.querySelector(`.pill[data-category="${category}"]`);
    if (activePill) activePill.classList.add('active');

    const products = allCategorizedProducts[category] || [];
    menuItemsContainer.innerHTML = '';

    if (products.length === 0) {
        menuItemsContainer.innerHTML = `<div class="empty-state">${isAr ? 'لا توجد منتجات في هذا القسم' : 'No products in this category'}</div>`;
        return;
    }

    products.forEach(product => {
        const hasVariants = product.variants && product.variants.length > 0;
        const card = document.createElement('div');
        card.className = 'menu-item animate-fade-in';
        card.onclick = () => {
            if (hasVariants) {
                showVariantModal(product);
            } else {
                addToOrder(product.name, product.price);
            }
        };
        card.innerHTML = `
            <h3>${product.name}</h3>
            <p>${parseFloat(product.price).toFixed(2)} <small>EGP</small></p>
        `;
        menuItemsContainer.appendChild(card);
    });
}

function showVariantModal(product) {
    currentProductForModal = product;
    const variants = product.variants;

    // Get unique colors and unique sizes
    const colors = [...new Set(variants.map(v => v.color).filter(c => c && c.trim() !== ""))];
    const allUniqueSizes = [...new Set(variants.map(v => v.size).filter(s => s))];
    
    // If no colors are defined at all, jump straight to size selection
    if (colors.length === 0) {
        renderVariantSizes(null);
        return;
    }

    let variantsHtml = `
        <div class="variant-modal-header" style="text-align:center; margin-bottom:2rem; padding-bottom: 1.5rem; border-bottom: 1px solid #f1f5f9;">
            <h2 style="font-size:1.75rem; font-weight:900; color:#1e293b; margin-bottom: 5px;">${product.name}</h2>
            <p style="color:#64748b; font-weight: 500;">${isAr ? 'تخصيص المنتج حسب طلب العميل' : 'Customize product for customer'}</p>
        </div>
        
        <div class="variant-selection-container" style="padding: 0 1rem;">
            <!-- 🎨 Colors Section -->
            <div style="margin-bottom: 2.5rem; text-align: center;">
                <h4 style="margin-bottom:1.5rem; font-size:1rem; font-weight:800; color:#1e293b; display:flex; align-items:center; justify-content:center; gap:10px;">
                    <div style="width:32px; height:32px; background:rgba(0,128,96,0.1); border-radius:10px; display:flex; align-items:center; justify-content:center;">
                        <i class="fas fa-palette" style="color:var(--primary); font-size:0.9rem;"></i>
                    </div>
                    ${isAr ? 'اختر اللون' : 'Choose Color'}
                </h4>
                <div style="display:flex; flex-wrap:wrap; justify-content:center; gap:15px;">
                    ${colors.map(color => `
                        <button class="variant-btn-select color-choice-btn" style="min-width: 140px;" data-color="${color}" onclick="renderVariantSizes('${color}')">
                            <span style="font-weight:700; font-size:1rem; color:#1e293b;">${color}</span>
                        </button>
                    `).join('')}
                </div>
            </div>
            
            <!-- 📏 Sizes Section -->
            <div id="size-selection-area" style="text-align: center;">
                <h4 style="margin-bottom:1.5rem; font-size:1rem; font-weight:800; color:#1e293b; display:flex; align-items:center; justify-content:center; gap:10px;">
                    <div style="width:32px; height:32px; background:rgba(0,128,96,0.1); border-radius:10px; display:flex; align-items:center; justify-content:center;">
                        <i class="fas fa-ruler-combined" style="color:var(--primary); font-size:0.9rem;"></i>
                    </div>
                    ${isAr ? 'اختر المقاس' : 'Choose Size'}
                </h4>
                <div id="size-buttons-grid" style="display:flex; flex-wrap:wrap; justify-content:center; gap:15px;">
                    ${allUniqueSizes.map(size => `
                        <button class="variant-btn-select disabled size-btn" data-size="${size}">
                            <span style="font-weight:700; font-size:1.1rem; color:#1e293b;">${size}</span>
                        </button>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    commentCard.innerHTML = variantsHtml;
    overlay.style.display = 'block';
    commentCard.classList.add('active');
}

function renderVariantSizes(color) {
    if (!currentProductForModal) return;
    const variants = currentProductForModal.variants;
    const sizeButtonsGrid = document.getElementById('size-buttons-grid');
    
    // UI Feedback: Highlight selected color button
    document.querySelectorAll('.color-choice-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.color === color) btn.classList.add('active');
    });

    // Filter variants by chosen color
    const colorVariants = variants.filter(v => (color ? v.color === color : !v.color || v.color.trim() === ""));
    const availableSizesForColor = colorVariants.map(v => v.size);

    if (sizeButtonsGrid) {
        // Clear and Re-render only buttons to update click handlers with specific color
        sizeButtonsGrid.style.display = 'flex';
        sizeButtonsGrid.style.flexWrap = 'wrap';
        sizeButtonsGrid.style.justifyContent = 'center';
        
        sizeButtonsGrid.innerHTML = colorVariants.map(v => `
            <button class="variant-btn-select" style="min-width: 110px;" onclick="addVariantToOrder('${currentProductForModal.name}', ${currentProductForModal.price}, '${color || ''}', '${v.size}')">
                <span style="font-weight:700; font-size:1.1rem; color:#1e293b;">${v.size}</span>
            </button>
        `).join('');
    } else {
        // Fallback for products with no color (show all sizes active from start)
        const allSizesHtml = `
            <div class="variant-modal-header" style="text-align:center; margin-bottom:2rem; padding-bottom: 1.5rem; border-bottom: 1px solid #f1f5f9;">
                <h2 style="font-size:1.75rem; font-weight:900; color:#1e293b; margin-bottom: 5px;">${currentProductForModal.name}</h2>
                <p style="color:#64748b; font-weight: 500;">${isAr ? 'اختر المقاس المطلوب' : 'Select required size'}</p>
            </div>
            <div class="variant-selection-container" style="padding: 0 1rem; text-align: center;">
                <h4 style="margin-bottom:1.5rem; font-size:1rem; font-weight:800; color:#1e293b; display:flex; align-items:center; justify-content:center; gap:10px;">
                    <div style="width:32px; height:32px; background:rgba(0,128,96,0.1); border-radius:10px; display:flex; align-items:center; justify-content:center;">
                        <i class="fas fa-ruler-combined" style="color:var(--primary); font-size:0.9rem;"></i>
                    </div>
                    ${isAr ? 'المقاسات المتاحة' : 'Available Sizes'}
                </h4>
                <div style="display:flex; flex-wrap:wrap; justify-content:center; gap:15px;">
                    ${variants.map(v => `
                        <button class="variant-btn-select" style="min-width: 110px;" onclick="addVariantToOrder('${currentProductForModal.name}', ${currentProductForModal.price}, '', '${v.size}')">
                            <span style="font-weight:700; font-size:1.1rem; color:#1e293b;">${v.size}</span>
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
        commentCard.innerHTML = allSizesHtml;
    }
}

function addVariantToOrder(name, price, color, size) {
    const variantLabel = `${color || ''} ${size || ''}`.trim();
    const uniqueKey = `${name} (${variantLabel})`;
    
    if (!currentOrder[uniqueKey]) {
        currentOrder[uniqueKey] = { 
            baseName: name,
            variant: variantLabel,
            price: parseFloat(price), 
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
function addToOrder(name, price) {
    if (!currentOrder[name]) {
        currentOrder[name] = { price: parseFloat(price), quantity: 1, comment: [] };
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
    let itemCount = 0;
    orderSummary.innerHTML = '';

    const items = Object.keys(currentOrder);
    
    if (items.length === 0) {
        orderSummary.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-basket"></i>
                <p>${t[currentLang].emptyCart}</p>
            </div>
        `;
    } else {
        items.forEach(name => {
            const item = currentOrder[name];
            const cost = item.price * item.quantity;
            subtotal += cost;
            itemCount += item.quantity;

            // Handle comments/add-ons
            let commentsHtml = '';
            item.comment.forEach((c, idx) => {
                const addPrice = parseFloat(c.price) || 0;
                subtotal += addPrice * item.quantity;
                commentsHtml += `
                    <div style="display: inline-flex; align-items: center; background: rgba(0, 128, 96, 0.1); color: var(--primary); padding: 4px 10px; border-radius: 8px; font-size: 0.7rem; font-weight: 700; gap: 8px;">
                        <span>${c.text} (+${addPrice})</span>
                        <button onclick="removeComment('${name}', ${idx})" style="background:none; border:none; color:inherit; cursor:pointer; font-size:0.8rem;"><i class="fas fa-times-circle"></i></button>
                    </div>
                `;
            });

            const row = document.createElement('div');
            row.className = 'order-row';
            row.innerHTML = `
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
            `;
            orderSummary.appendChild(row);
        });
    }

    const delivery = parseFloat(deliveryPriceSelect.value) || 0;
    const total = subtotal + delivery;

    document.getElementById('subtotal-val').innerHTML = `<span dir="ltr">${subtotal.toFixed(2)} EGP</span>`;
    document.getElementById('delivery-val').innerHTML = `<span dir="ltr">${delivery.toFixed(2)} EGP</span>`;
    document.getElementById('order-total').innerHTML = `<span dir="ltr">${total.toFixed(2)} EGP</span>`;
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
        <div class="variant-modal-header" style="text-align:center; margin-bottom:2rem; padding-bottom: 1.5rem; border-bottom: 1px solid #f1f5f9;">
            <h2 style="font-size:1.75rem; font-weight:900; color:#1e293b; margin-bottom: 5px;">${itemName}</h2>
            <p style="color:#64748b; font-weight: 500;">${isAr ? 'أضف ملاحظات خاصة أو تكاليف إضافية' : 'Add special instructions or extra charges'}</p>
        </div>
        
        <div class="variant-selection-container" style="padding: 0 1rem; text-align: center;">
            <div style="margin-bottom: 1.5rem;">
                <h4 style="margin-bottom:1rem; font-size:1rem; font-weight:800; color:#1e293b; display:flex; align-items:center; justify-content:center; gap:10px;">
                    <i class="fas fa-edit" style="color:var(--primary);"></i> ${isAr ? 'ملاحظة خاصة' : 'Special Note'}
                </h4>
                <textarea id="customComment" 
                    style="width: 100%; height: 100px; padding: 15px; border-radius: 16px; border: 2px solid #f1f5f9; font-family: inherit; font-size: 1rem; transition: 0.3s;"
                    placeholder="${isAr ? 'مثال: بدون بصل، زيادة صوص...' : 'Ex: No onions, extra sauce...'}"></textarea>
            </div>

            <div style="margin-bottom: 2rem;">
                <h4 style="margin-bottom:1rem; font-size:1rem; font-weight:800; color:#1e293b; display:flex; align-items:center; justify-content:center; gap:10px;">
                    <i class="fas fa-plus-circle" style="color:var(--primary);"></i> ${isAr ? 'تكلفة إضافية (اختياري)' : 'Extra Charge (Optional)'}
                </h4>
                <input type="text" id="manualPriceInput" 
                       placeholder="${isAr ? '0.00 EGP' : '0.00 EGP'}" 
                       style="text-align: center; width: 200px; font-size: 1.25rem; padding: 12px; border-radius: 14px; border: 2px solid #f1f5f9; font-weight: 700; color: var(--primary);"
                       oninput="this.value = this.value.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[^0-9.]/g, '')">
            </div>

            <div class="popular-comments" id="popularComments" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-bottom: 2rem;"></div>
            
            <div style="border-top: 1px solid #f1f5f9; padding-top: 2rem;">
                <button class="save-comment-btn" onclick="saveCustomComment()" 
                        style="width: 100%; max-width: 400px; padding: 1.25rem; background: var(--primary); color: white; border: none; border-radius: 16px; font-weight: 800; font-size: 1.1rem; cursor: pointer; box-shadow: 0 10px 20px rgba(0, 128, 96, 0.2); transition: 0.3s;">
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
    const price = document.getElementById('manualPriceInput').value;
    if (text) {
        addCommentToItem(selectedItem, text, price);
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
        name: currentOrder[key].baseName || key,
        variant: currentOrder[key].variant || null,
        price: currentOrder[key].price,
        quantity: currentOrder[key].quantity,
        comments: currentOrder[key].comment
    }));

    // Auto-fetch best discount
    const discountCode = await getBestDiscountCode(orderDetails);

    const orderData = {
        customer: {
            name: nameInput.value || (isAr ? 'عميل تيك أواي' : 'Walk-in'),
            phone: phoneInput.value || '0000000000',
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
phoneInput.addEventListener('input', async () => {
    const phone = phoneInput.value.trim();
    if (phone.length < 3) {
        suggestionsBox.style.display = 'none';
        return;
    }

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