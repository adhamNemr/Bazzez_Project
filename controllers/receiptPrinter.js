const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { ThermalPrinter, PrinterTypes } = require('node-thermal-printer');
const branding = require('../config/branding');

/**
 * دالة طباعة الإيصال الرئيسية
 * @param {Object} orderData - بيانات الطلب
 */
async function printReceipt(orderData) {
    if (!orderData) {
        console.error("❌ No order data provided for printing.");
        return;
    }

    try {
        // 1. Calculate Financials (Including Add-ons)
        const subtotal = orderData.orderDetails?.reduce((acc, item) => {
            const basePrice = parseFloat(item.price) || 0;
            const quantity = parseFloat(item.quantity) || 0;
            
            // Calculate Add-ons from comments
            let addonsTotal = 0;
            if (Array.isArray(item.comments)) {
                addonsTotal = item.comments.reduce((sum, c) => sum + (parseFloat(c.price) || 0), 0);
            }
            
            return acc + (quantity * (basePrice + addonsTotal));
        }, 0) || 0;

        const deliveryPrice = parseFloat(orderData.deliveryPrice) || 0;
        const discount = parseFloat(orderData.discount) || 0;
        const calculatedTotal = subtotal + deliveryPrice - discount;

        // 2. Generate PDF Backup
        generatePDF(orderData, subtotal, deliveryPrice, discount, calculatedTotal);

        // 3. Thermal Print
        await printThermal(orderData, subtotal, deliveryPrice, discount, calculatedTotal);
    } catch (error) {
        console.error("❌ Receipt Printing System Failure:", error);
    }
}

/**
 * Generate PDF Receipt (A4 or Small Format)
 */
function generatePDF(orderData, subtotal, deliveryPrice, discount, calculatedTotal) {
    try {
        const doc = new PDFDocument({ size: [226, 600], margin: 10 }); // 80mm width approx
        const receiptPath = path.join(__dirname, `receipt_${orderData.id}.pdf`);
        const writeStream = fs.createWriteStream(receiptPath);

        doc.pipe(writeStream);

        // Branding
        doc.fontSize(16).text(branding.restaurantName, { align: 'center' });
        doc.moveDown(0.5);

        // Info
        doc.fontSize(9)
            .text(`Order ID: #${orderData.id}`)
            .text(`Date: ${orderData.orderDate}`)
            .text(`Customer: ${orderData.customerName || "Walk-in"}`)
            .text(`Phone: ${orderData.customerPhone || "N/A"}`);
        
        if (orderData.customerAddress) {
            doc.text(`Address: ${orderData.customerAddress}`);
        }
        doc.moveDown();

        // Items
        doc.text('-'.repeat(40));
        orderData.orderDetails?.forEach(item => {
            const name = item.name.substring(0, 20);
            doc.text(`${name.padEnd(22)} x${item.quantity} ${item.price} EGP`);
            if (item.comments && item.comments.length > 0) {
                item.comments.forEach(c => doc.text(`  * ${c.text}`, { color: 'grey' }));
            }
        });
        doc.text('-'.repeat(40));

        // Totals
        doc.moveDown(0.5);
        doc.text(`Subtotal: ${subtotal.toFixed(2)}`, { align: 'right' });
        if (deliveryPrice > 0) doc.text(`Delivery: ${deliveryPrice.toFixed(2)}`, { align: 'right' });
        if (discount > 0) doc.text(`Discount: -${discount.toFixed(2)}`, { align: 'right' });
        
        doc.fontSize(12).text(`TOTAL: ${calculatedTotal.toFixed(2)} EGP`, { align: 'right' });

        // Footer
        doc.moveDown();
        doc.fontSize(8).text(branding.hotline, { align: 'center' });
        doc.text(branding.footerMessage, { align: 'center' });

        doc.end();
    } catch (error) {
        console.error('❌ PDF Error:', error.message);
    }
}

/**
 * Professional Thermal Print Logic
 */
async function printThermal(orderData, subtotal, deliveryPrice, discount, calculatedTotal) {
    const { interface, type } = branding.printerSettings;

    if (!interface) return;

    const printer = new ThermalPrinter({
        type: type === 'star' ? PrinterTypes.STAR : PrinterTypes.EPSON,
        interface: interface,
        removeSpecialCharacters: false,
        options: { timeout: 3000 }
    });

    try {
        const isConnected = await printer.isPrinterConnected();
        if (!isConnected) throw new Error("Printer not connected");

        printer.alignCenter();
        printer.setTextDoubleHeight();
        printer.setTextDoubleWidth();
        printer.println(branding.restaurantName);
        printer.setTextNormal();
        printer.newLine();

        printer.alignLeft();
        printer.println(`Order: #${orderData.id}`);
        printer.println(`Date:  ${orderData.orderDate}`);
        printer.println(`Cust:  ${orderData.customerName || "Guest"}`);
        if (orderData.customerPhone) printer.println(`Phone: ${orderData.customerPhone}`);

        printer.drawLine();
        printer.tableCustom([
            { text: "Item", align: "LEFT", width: 0.5 },
            { text: "Qty", align: "CENTER", width: 0.2 },
            { text: "Price", align: "RIGHT", width: 0.3 }
        ]);
        printer.drawLine();

        orderData.orderDetails?.forEach(item => {
            printer.tableCustom([
                { text: item.name, align: "LEFT", width: 0.5 },
                { text: String(item.quantity), align: "CENTER", width: 0.2 },
                { text: String(item.price), align: "RIGHT", width: 0.3 }
            ]);
            // Handle comments properly in thermal
            if (item.comments && item.comments.length > 0) {
                item.comments.forEach(c => printer.println(` > ${c.text}`));
            }
        });

        printer.drawLine();
        printer.alignRight();
        printer.println(`Subtotal: ${subtotal.toFixed(2)}`);
        if (deliveryPrice > 0) printer.println(`Delivery: ${deliveryPrice.toFixed(2)}`);
        if (discount > 0) printer.println(`Discount: -${discount.toFixed(2)}`);
        
        printer.bold(true);
        printer.println(`TOTAL: ${calculatedTotal.toFixed(2)} EGP`);
        printer.bold(false);

        printer.newLine();
        printer.alignCenter();
        printer.println(branding.hotline);
        printer.println(branding.footerMessage);
        
        printer.cut();
        await printer.execute();
        console.log("🖨️ Thermal Receipt Printed Successfully");

    } catch (error) {
        console.error("❌ Thermal Printing Failed:", error.message);
    }
}

module.exports = { printReceipt };