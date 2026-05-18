document.addEventListener("DOMContentLoaded", async function () {
    let receiptData = null;

    // 🏆 محاولة الحصول على الداتا من الإليكترون مباشرة (Handshake)
    try {
        const { ipcRenderer } = require('electron');
        receiptData = ipcRenderer.sendSync('get-receipt-data');
    } catch (e) {
        console.warn("⚠️ Not running in Electron or IPC failed, falling back to localStorage");
        receiptData = JSON.parse(localStorage.getItem("receiptData"));
    }

    if (!receiptData) {
        console.error("❌ لم يتم العثور على بيانات الإيصال!");
        document.getElementById("receipt-container").innerHTML = "<p style='text-align:center;'>❌ لا يوجد إيصال متاح!</p>";
        return;
    }

    let showDiscountSetting = 'yes';
    let showCommentsSetting = 'yes';
    
    // 1. Fetch Store Settings dynamically
    try {
        const token = localStorage.getItem('token');
        if (token) {
            const res = await fetch('/api/settings', { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
                const settings = await res.json();
                // فرض اسم "دار الفاروق" وتجاهل إعدادات قاعدة البيانات مؤقتاً لضمان ظهور الاسم المطلوب
                document.getElementById('store-name').innerText = "دار الفاروق";
                if (settings.store_phone) document.getElementById('store-phone-footer').innerText = settings.store_phone;
                if (settings.receipt_footer) document.getElementById('store-footer-msg').innerText = settings.receipt_footer;
                if (settings.show_discount) showDiscountSetting = settings.show_discount;
                if (settings.show_comments) showCommentsSetting = settings.show_comments;
            }
        }
    } catch (e) {
        console.error("Failed to fetch settings for receipt", e);
    }

    // 2. Format Currency
    const fmt = (n) => `${Number(parseFloat(n || 0).toFixed(2)).toLocaleString('en-US', {minimumFractionDigits: 2})} ج.م`;

    // 🏆 Large Order ID
    const largeIdEl = document.getElementById("order-id-large");
    if (largeIdEl) largeIdEl.innerText = `#${receiptData.id || "000"}`;

    // 👤 Customer Data Logic
    const cleanValue = (val, forbiddenKeywords = []) => {
        let trimmed = val?.trim() || "";
        if (!trimmed) return "-";
        
        // Check if value includes any forbidden keyword (like "تيك أوي")
        const isForbidden = forbiddenKeywords.some(k => trimmed.includes(k));
        if (isForbidden) return "-";
        
        // Check for specific dummy values
        if (["0000000000", "0", "--", "Store", "Local"].includes(trimmed)) return "-";
        
        return trimmed;
    };

    document.getElementById("customer-name").innerText = cleanValue(receiptData.customerName, ["تيك أوي", "نقدي", "Guest"]);
    document.getElementById("customer-phone").innerText = cleanValue(receiptData.customerPhone);
    
    // ✅ وضع رقم الأوردر مكان العنوان كما طلب العميل
    const orderIdLabel = document.getElementById("order-id-label");
    if (orderIdLabel) orderIdLabel.innerText = receiptData.id || "-";
    
    document.getElementById("order-date").innerText = receiptData.orderDate || "-";
    const deliveryEl = document.getElementById("delivery-price");
    if (deliveryEl) deliveryEl.innerText = fmt(receiptData.deliveryPrice);
    
    let subtotal = 0;
    const orderDetailsContainer = document.getElementById("order-details");
    if (orderDetailsContainer) {
        orderDetailsContainer.innerHTML = "";

        // 🔄 معالجة البيانات: لو جاية نص نحولها لقائمة
        let items = receiptData.orderDetails;
        if (typeof items === 'string') {
            try { items = JSON.parse(items); } catch(e) { items = []; }
        }

        if (items && Array.isArray(items)) {
            items.forEach(item => {
                const quantity = Number(item.quantity) || 0;
                const price = parseFloat(item.price) || 0;
                let name = item.name || item.productName || "صنف غير معروف";
                
                // استخدم variant بس — هو بالفعل فيه color و size مدمجين
                const variantText = (item.variant && String(item.variant) !== "null") 
                    ? String(item.variant).trim() 
                    : '';

                // إضافة التفريعة للاسم لو مش موجودة بالفعل
                if (variantText && !name.includes(variantText)) {
                    name += ` (${variantText})`;
                }
                let addonsTotal = 0;
                let commentsText = "";

                if (Array.isArray(item.comments)) {
                    item.comments.forEach(c => {
                        const addonPrice = parseFloat(c.price || 0);
                        if (addonPrice < 0 && showDiscountSetting === 'no') return;
                        if (addonPrice > 0) addonsTotal += addonPrice;
                        if (showCommentsSetting !== 'no') {
                            commentsText += `<div class="addon-line">• ${c.text} ${addonPrice > 0 ? '(+'+addonPrice+')' : ''}</div>`;
                        }
                    });
                }
                
                const itemFinalTotal = (price + addonsTotal) * quantity;
                subtotal += itemFinalTotal;

                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>
                        <div class="item-name">${name}</div>
                        <div class="item-addons">${commentsText}</div>
                    </td>
                    <td style="text-align: center; font-weight: bold;">x${quantity}</td>
                    <td style="text-align: left;">${(price + addonsTotal).toFixed(2)}</td>
                `;
                orderDetailsContainer.appendChild(row);
            });
        }
    }

    const subtotalEl = document.getElementById("subtotal");
    if (subtotalEl) subtotalEl.innerText = fmt(subtotal);
    
    const discount = parseFloat(receiptData.discount || 0);
    const discountEl = document.getElementById("discount");
    
    if (discount === 0 || showDiscountSetting === 'no') {
        const discContainer = document.getElementById("discount-container");
        if (discContainer) discContainer.remove();
    } else {
        if (discountEl) discountEl.innerText = fmt(discount);
    }
    
    const delivery = parseFloat(receiptData.deliveryPrice || 0);
    const grandTotal = subtotal + delivery - discount;
    const orderTotalEl = document.getElementById("order-total");
    if (orderTotalEl) orderTotalEl.innerText = fmt(grandTotal);

    // 3. Auto Print after rendering (optional but recommended for POS)
    setTimeout(() => {
        window.print();
    }, 500);
});
