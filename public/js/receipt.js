document.addEventListener("DOMContentLoaded", function () {
    const receiptData = JSON.parse(localStorage.getItem("receiptData"));

    if (!receiptData) {
        console.error("❌ لم يتم العثور على بيانات الإيصال!");
        document.getElementById("receipt-container").innerHTML = "<p>❌ لا يوجد إيصال متاح!</p>";
        return;
    }

    document.getElementById("order-id").innerText = receiptData.id || "N/A";
    document.getElementById("customer-name").innerText = receiptData.customerName?.trim() || "N/A";
    document.getElementById("customer-phone").innerText = receiptData.customerPhone?.trim() || "N/A";
    document.getElementById("customer-address").innerText = receiptData.customerAddress?.trim() || "N/A";
    document.getElementById("order-date").innerText = receiptData.orderDate || "N/A";
    document.getElementById("delivery-price").innerText = `${receiptData.deliveryPrice || 0} EGP`;
    document.getElementById("order-total").innerText = `${receiptData.orderTotal || 0} EGP`;

    let subtotal = 0;
    const orderDetailsContainer = document.getElementById("order-details");
    orderDetailsContainer.innerHTML = "";

    if (receiptData.orderDetails && Array.isArray(receiptData.orderDetails)) {
        receiptData.orderDetails.forEach(item => {
            const quantity = Number(item.quantity) || 0;
            const price = parseFloat(item.price) || 0;
            
            // Calculate item total including add-ons
            let addonsTotal = 0;
            let commentsText = "";
            if (Array.isArray(item.comments)) {
                item.comments.forEach(c => {
                    addonsTotal += parseFloat(c.price || 0);
                    commentsText += `<div class="addon-line">• ${c.text} (+${c.price})</div>`;
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
                <td>${quantity}</td>
                <td>${(price + addonsTotal).toFixed(2)} EGP</td>
            `;
            orderDetailsContainer.appendChild(row);
        });
    }

    document.getElementById("subtotal").innerText = `${subtotal.toFixed(2)} EGP`;
    const discount = parseFloat(receiptData.discount || 0);
    document.getElementById("discount").innerText = `${discount.toFixed(2)} EGP`;
    
    // Force Grand Total update based on actual subtotal + delivery - discount
    const delivery = parseFloat(receiptData.deliveryPrice || 0);
    const grandTotal = subtotal + delivery - discount;
    document.getElementById("order-total").innerText = `${grandTotal.toFixed(2)} EGP`;
});
