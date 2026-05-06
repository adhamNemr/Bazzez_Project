document.addEventListener("DOMContentLoaded", async function () {
    const receiptData = JSON.parse(localStorage.getItem("receiptData"));

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
                if (settings.store_name) document.getElementById('store-name').innerText = settings.store_name;
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
    document.getElementById("customer-address").innerText = cleanValue(receiptData.customerAddress);
    
    document.getElementById("order-date").innerText = receiptData.orderDate || "-";
    document.getElementById("delivery-price").innerText = fmt(receiptData.deliveryPrice);
    
    let subtotal = 0;
    const orderDetailsContainer = document.getElementById("order-details");
    orderDetailsContainer.innerHTML = "";

    if (receiptData.orderDetails && Array.isArray(receiptData.orderDetails)) {
        receiptData.orderDetails.forEach(item => {
            const quantity = Number(item.quantity) || 0;
            const price = parseFloat(item.price) || 0;
            
            let addonsTotal = 0;
            let commentsText = "";
            if (Array.isArray(item.comments)) {
                item.comments.forEach(c => {
                    const addonPrice = parseFloat(c.price || 0);
                    
                    // Skip printing manual discount comment if disabled
                    if (addonPrice < 0 && showDiscountSetting === 'no') return;
                    
                    if (addonPrice > 0) addonsTotal += addonPrice;
                    
                    // Print comment only if show_comments is enabled
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
                    <div class="item-name">${item.name || "N/A"}</div>
                    <div class="item-addons">${commentsText}</div>
                </td>
                <td style="text-align: center; font-weight: bold;">x${quantity}</td>
                <td style="text-align: left;">${fmt(price + addonsTotal)}</td>
            `;
            orderDetailsContainer.appendChild(row);
        });
    }

    document.getElementById("subtotal").innerText = fmt(subtotal);
    const discount = parseFloat(receiptData.discount || 0);
    
    // Hide discount line if it's 0 or if settings say 'no'
    if (discount === 0 || showDiscountSetting === 'no') {
        const discContainer = document.getElementById("discount-container");
        if (discContainer) discContainer.remove();
    } else {
        document.getElementById("discount").innerText = fmt(discount);
    }
    
    const delivery = parseFloat(receiptData.deliveryPrice || 0);
    const grandTotal = subtotal + delivery - discount;
    document.getElementById("order-total").innerText = fmt(grandTotal);

    // 3. Auto Print after rendering (optional but recommended for POS)
    setTimeout(() => {
        window.print();
    }, 500);
});
