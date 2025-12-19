const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { ThermalPrinter, PrinterTypes, CharacterSet, BreakLine } = require('node-thermal-printer');

/**
 * دالة طباعة الإيصال (PDF + Thermal Printer)
 * @param {Object} orderData - بيانات الطلب
 */
async function printReceipt(orderData) {
    if (!orderData) {
        console.error("❌ لا توجد بيانات لطباعة الإيصال!");
        return;
    }

    // 1. حساب القيم المالية
    const subtotal = orderData.orderDetails?.reduce((acc, item) => {
        return acc + (parseFloat(item.quantity) * parseFloat(item.price));
    }, 0) || 0;

    const deliveryPrice = parseFloat(orderData.deliveryPrice) || 0;
    const discount = parseFloat(orderData.discount) || 0;
    const calculatedTotal = subtotal + deliveryPrice - discount;

    // 2. إنشاء نسخة PDF كنسخة احتياطية (Log)
    generatePDF(orderData, subtotal, deliveryPrice, discount, calculatedTotal);

    // 3. الطباعة الحرارية الحقيقية
    await printThermal(orderData, subtotal, deliveryPrice, discount, calculatedTotal);
}

/**
 * إنشاء ملف PDF
 */
function generatePDF(orderData, subtotal, deliveryPrice, discount, calculatedTotal) {
    try {
        const doc = new PDFDocument({ margin: 20 });
        const receiptPath = path.join(__dirname, 'receipt.pdf');
        const writeStream = fs.createWriteStream(receiptPath);

        doc.pipe(writeStream);

        // Header
        doc.fontSize(20).text('BAZEZZ', { align: 'center' });
        doc.moveDown();

        // Info
        doc.fontSize(12)
            .text(`Order: #${orderData.id || "N/A"}`)
            .text(`Date: ${orderData.orderDate || new Date().toLocaleString()}`)
            .text(`Name: ${orderData.customerName?.trim() || "Guest"}`) // Fixed: Handle unnamed customers
            .text(`Phone: ${orderData.customerPhone?.trim() || "-"}`)
            .text(`Address: ${orderData.customerAddress?.trim() || "In-Store"}`)
            .moveDown();

        // Table Header
        doc.text('Item'.padEnd(20, ' ') + 'Qty'.padStart(5, ' ') + 'Price'.padStart(10, ' '));
        doc.text(''.padEnd(40, '-'));

        // Items
        orderData.orderDetails?.forEach(item => {
            const name = (item.name || "Item").substring(0, 18).padEnd(20, ' ');
            const quantity = String(item.quantity || 0).padStart(5, ' ');
            const price = String(item.price).padStart(10, ' ');
            doc.text(`${name}${quantity}${price}`);
        });

        doc.text(''.padEnd(40, '-'));

        // Totals
        doc.text(`Subtotal: ${subtotal.toFixed(2)}`, { align: 'right' });
        doc.text(`Delivery: ${deliveryPrice.toFixed(2)}`, { align: 'right' });
        doc.text(`Discount: ${discount.toFixed(2)}`, { align: 'right' });
        doc.moveDown(0.5);
        doc.fontSize(14).text(`TOTAL: ${calculatedTotal.toFixed(2)} EGP`, { align: 'right' });

        // Footer
        doc.moveDown();
        doc.fontSize(10).text('Thank you for ordering!', { align: 'center' });
        doc.text('01005078132 - 01211228565', { align: 'center' });

        doc.end();
        console.log('✅ PDF Receipt generated: receipt.pdf');
    } catch (error) {
        console.error('❌ PDF Generation Error:', error.message);
    }
}

/**
 * الطباعة على الطابعة الحرارية
 */
async function printThermal(orderData, subtotal, deliveryPrice, discount, calculatedTotal) {
    try {
        // قراءة الإعدادات من env
        const printerType = process.env.PRINTER_TYPE || PrinterTypes.EPSON; // 'epson' or 'star'
        const printerInterface = process.env.PRINTER_INTERFACE; // e.g., 'tcp://xxx' or '//./COM1'

        if (!printerInterface) {
            console.warn("⚠️ No printer interface configured in .env (PRINTER_INTERFACE). Skipping thermal print.");
            return;
        }

        const printer = new ThermalPrinter({
            type: printerType,
            interface: printerInterface,
            characterSet: CharacterSet.PC852_LATIN2, // Supports some special chars
            removeSpecialCharacters: false,
            lineCharacter: "-",
            options: {
                timeout: 5000
            }
        });

        const isConnected = await printer.isPrinterConnected();
        if (!isConnected) {
            console.warn("⚠️ Printer is not connected or not found.");
            return;
        }

        // --- بناء الفاتورة ---
        printer.alignCenter();
        printer.bold(true);
        printer.setTextSize(1, 1);
        printer.println("BAZEZZ RESTAURANT");
        printer.newLine();

        printer.bold(false);
        printer.setTextNormal();
        printer.alignLeft();
        printer.println(`Order: #${orderData.id}`);
        printer.println(`Date:  ${orderData.orderDate || new Date().toLocaleString()}`);
        printer.println(`Name:  ${orderData.customerName || "Guest"}`);
        printer.println(`Phone: ${orderData.customerPhone || "-"}`);
        if(orderData.customerAddress) printer.println(`Addr:  ${orderData.customerAddress}`);

        printer.drawLine();

        // Table Header
        printer.tableCustom([
            { text: "Item", align: "LEFT", width: 0.5 },
            { text: "Qty", align: "CENTER", width: 0.2 },
            { text: "Price", align: "RIGHT", width: 0.3 }
        ]);
        printer.drawLine();

        // Items
        orderData.orderDetails?.forEach(item => {
            printer.tableCustom([
                { text: item.name || "Item", align: "LEFT", width: 0.5 },
                { text: String(item.quantity), align: "CENTER", width: 0.2 },
                { text: String(item.price), align: "RIGHT", width: 0.3 }
            ]);
        });

        printer.drawLine();

        // Totals
        printer.alignRight();
        printer.println(`Subtotal: ${subtotal.toFixed(2)}`);
        if(deliveryPrice > 0) printer.println(`Delivery: ${deliveryPrice.toFixed(2)}`);
        if(discount > 0) printer.println(`Discount: -${discount.toFixed(2)}`);
        
        printer.bold(true);
        printer.setTextSize(1, 1);
        printer.println(`TOTAL: ${calculatedTotal.toFixed(2)} EGP`);
        
        // Footer
        printer.newLine();
        printer.alignCenter();
        printer.setTextNormal();
        printer.println("Thank you for your visit!");
        printer.println("Hotline: 01005078132");
        printer.cut();

        // Execute Print
        await printer.execute();
        console.log("🖨️ Thermal print job sent successfully!");

    } catch (error) {
        console.error("❌ Thermal Print Error:", error);
    }
}

module.exports = { printReceipt };