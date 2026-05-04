const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { ThermalPrinter, PrinterTypes } = require('node-thermal-printer');
const branding = require('../config/branding');
const { fixArabic } = require('../utils/arabicHelper');

const ARABIC_FONT = '/System/Library/Fonts/Supplemental/Arial.ttf';

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
        const subtotal = orderData.orderDetails?.reduce((acc, item) => {
            const basePrice = parseFloat(item.price) || 0;
            const quantity = parseFloat(item.quantity) || 0;
            
            let addonsTotal = 0;
            if (Array.isArray(item.comments)) {
                // Only sum positive prices (actual add-ons). Negative prices are manual discounts
                // which are already included in orderData.discount
                addonsTotal = item.comments.reduce((sum, c) => {
                    const p = parseFloat(c.price) || 0;
                    return sum + (p > 0 ? p : 0);
                }, 0);
            }
            
            return acc + (quantity * (basePrice + addonsTotal));
        }, 0) || 0;

        const deliveryPrice = parseFloat(orderData.deliveryPrice) || 0;
        const discount = parseFloat(orderData.discount) || 0;
        const calculatedTotal = subtotal + deliveryPrice - discount;

        // 1. Generate PDF (With Arabic Fixes)
        generatePDF(orderData, subtotal, deliveryPrice, discount, calculatedTotal);

        // 2. Thermal Print
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
        const doc = new PDFDocument({ size: [226, 600], margin: 15 }); // 80mm
        const receiptPath = path.join(__dirname, `receipt_${orderData.id}.pdf`);
        const writeStream = fs.createWriteStream(receiptPath);

        doc.pipe(writeStream);

        // Load Font
        if (fs.existsSync(ARABIC_FONT)) {
            doc.font(ARABIC_FONT);
        }

        // Branding
        doc.fontSize(18).text(fixArabic(branding.restaurantName), { align: 'center' });
        doc.fontSize(8).text('V O R T E X  P O S', { align: 'center', opacity: 0.5 });
        doc.moveDown(0.5);

        // Info
        doc.fontSize(9)
            .text(fixArabic(`رقم الطلب: #${orderData.id}`), { align: 'right' })
            .text(fixArabic(`التاريخ: ${orderData.orderDate}`), { align: 'right' })
            .text(fixArabic(`العميل: ${orderData.customerName || "نقدي"}`), { align: 'right' });
        
        doc.moveDown(0.5);

        // Items Header
        doc.fontSize(9).text('==========================================');
        doc.fontSize(10).text(fixArabic('الصنف                                 الكمية         السعر'), { align: 'right' });
        doc.fontSize(9).text('----------------------------------------------------------------------');
        
        // Items List
        doc.moveDown(0.2);
        orderData.orderDetails?.forEach(item => {
            const price = (parseFloat(item.price) * item.quantity).toFixed(2);
            doc.fontSize(10).text(`${price} EGP     x${item.quantity}     ${fixArabic(item.name)}`, { align: 'right' });

            if (item.comments && item.comments.length > 0) {
                item.comments.forEach(c => doc.fontSize(8).text(fixArabic(`  └─ ${c.text}`), { align: 'right', color: '#666666' }));
            }
            doc.moveDown(0.2);
        });
        
        doc.fontSize(9).text('==========================================');

        // Totals
        doc.moveDown(0.5);
        doc.fontSize(10).text(fixArabic(`المجموع: ${subtotal.toFixed(2)}`), { align: 'left' });
        if (deliveryPrice > 0) doc.text(fixArabic(`التوصيل: ${deliveryPrice.toFixed(2)}`), { align: 'left' });
        if (discount > 0) doc.text(fixArabic(`الخصم: -${discount.toFixed(2)}`), { align: 'left' });
        
        doc.moveDown(0.5);
        doc.rect(10, doc.y, 206, 25).fill('#f1f1f1').stroke();
        doc.fill('#000000').fontSize(14).text(fixArabic(`الإجمالي: ${calculatedTotal.toFixed(2)} EGP`), 15, doc.y - 18, { align: 'center' });

        // Footer
        doc.moveDown(1.5);
        doc.fontSize(10).text(fixArabic(branding.hotline), { align: 'center' });
        doc.fontSize(8).text(fixArabic(branding.footerMessage), { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(7).text(`Printed at: ${new Date().toLocaleString()}`, { align: 'center', opacity: 0.4 });

        doc.end();
        console.log(`✅ PDF Generated: receipt_${orderData.id}.pdf`);
    } catch (error) {
        console.error('❌ PDF Generation Error:', error);
    }
}

/**
 * Professional Thermal Print Logic
 */
async function printThermal(orderData, subtotal, deliveryPrice, discount, calculatedTotal) {
    const { interface, type, characterSet } = branding.printerSettings;

    if (!interface || interface === 'none') return;

    const printer = new ThermalPrinter({
        type: type === 'star' ? PrinterTypes.STAR : PrinterTypes.EPSON,
        interface: interface,
        removeSpecialCharacters: false,
        characterSet: characterSet || 'PC864_ARABIC',
        options: { timeout: 3000 }
    });

    try {
        const isConnected = await printer.isPrinterConnected();
        if (!isConnected) {
            console.warn("⚠️ Thermal printer not found at", interface);
            return;
        }

        printer.alignCenter();
        printer.setTextDoubleHeight();
        printer.setTextDoubleWidth();
        printer.println(fixArabic(branding.restaurantName));
        printer.setTextNormal();
        printer.newLine();

        printer.alignLeft();
        printer.println(fixArabic(`Order: #${orderData.id}`));
        printer.println(fixArabic(`Date:  ${orderData.orderDate}`));
        printer.println(fixArabic(`Cust:  ${orderData.customerName || "Guest"}`));
        
        printer.drawLine();
        
        // Table Header
        printer.tableCustom([
            { text: fixArabic("Item"), align: "LEFT", width: 0.4 },
            { text: fixArabic("Qty"), align: "CENTER", width: 0.2 },
            { text: fixArabic("Price"), align: "RIGHT", width: 0.4 }
        ]);
        printer.drawLine();

        orderData.orderDetails?.forEach(item => {
            printer.tableCustom([
                { text: fixArabic(item.name), align: "LEFT", width: 0.4 },
                { text: String(item.quantity), align: "CENTER", width: 0.2 },
                { text: (parseFloat(item.price) * item.quantity).toFixed(2), align: "RIGHT", width: 0.4 }
            ]);
            
            if (item.comments && item.comments.length > 0) {
                item.comments.forEach(c => printer.println(fixArabic(` > ${c.text}`)));
            }
        });

        printer.drawLine();
        printer.alignRight();
        printer.println(fixArabic(`Subtotal: ${subtotal.toFixed(2)}`));
        if (deliveryPrice > 0) printer.println(fixArabic(`Delivery: ${deliveryPrice.toFixed(2)}`));
        if (discount > 0) printer.println(fixArabic(`Discount: -${discount.toFixed(2)}`));
        
        printer.bold(true);
        printer.println(fixArabic(`TOTAL: ${calculatedTotal.toFixed(2)} EGP`));
        printer.bold(false);

        printer.newLine();
        printer.alignCenter();
        printer.println(fixArabic(branding.hotline));
        printer.println(fixArabic(branding.footerMessage));
        
        printer.cut();
        await printer.execute();
        console.log("🖨️ Thermal Receipt Printed Successfully");

    } catch (error) {
        console.error("❌ Thermal Printing Failed:", error.message);
    }
}

module.exports = { printReceipt };