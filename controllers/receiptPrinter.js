const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { ThermalPrinter, PrinterTypes } = require('node-thermal-printer');
const branding = require('../config/branding');
const { Setting } = require('../models');
const { fixArabic } = require('../utils/arabicHelper');

const ARABIC_FONT = '/System/Library/Fonts/Supplemental/Arial.ttf';

/**
 * Helper to fetch settings from DB
 */
async function getStoreSettings() {
    try {
        const settings = await Setting.findAll();
        const settingsObj = {};
        settings.forEach(s => settingsObj[s.key] = s.value);
        
        return {
            restaurantName: settingsObj.store_name || branding.restaurantName,
            hotline: settingsObj.store_phone || branding.hotline,
            footerMessage: settingsObj.receipt_footer || branding.footerMessage,
            currency: settingsObj.currency || branding.currency || "EGP",
            showDiscount: settingsObj.show_discount || 'yes',
            showComments: settingsObj.show_comments || 'yes'
        };
    } catch (err) {
        console.error("❌ Failed to fetch settings for printer, using defaults", err);
        return branding;
    }
}

/**
 * دالة طباعة الإيصال الرئيسية
 * @param {Object} orderData - بيانات الطلب
 */
async function printReceipt(orderData) {
    console.log("📄 Starting print process for order:", orderData.id);

    try {
        const storeConfig = await getStoreSettings();

        // ✅ محاولة الطباعة الصامتة عبر Electron (الطريقة الأضمن للويندوز)
        try {
            const { ipcMain } = require('electron');
            if (ipcMain) {
                console.log("🔌 Emitting print-receipt event to Electron...");
                ipcMain.emit('print-receipt', null, orderData);
            }
        } catch (e) {
            console.log("⚠️ Not running in Electron environment, skipping silent print.");
        }

        const subtotal = orderData.orderDetails?.reduce((total, item) => {
            const basePrice = parseFloat(item.price) || 0;
            const quantity = parseFloat(item.quantity) || 0;
            
            let addonsTotal = 0;
            if (Array.isArray(item.comments)) {
                addonsTotal = item.comments.reduce((sum, c) => sum + (parseFloat(c.price) > 0 ? parseFloat(c.price) : 0), 0);
            }
            return total + (quantity * (basePrice + addonsTotal));
        }, 0) || 0;

        const deliveryPrice = parseFloat(orderData.deliveryPrice) || 0;
        const discount = parseFloat(orderData.discount) || 0;
        const calculatedTotal = subtotal + deliveryPrice - discount;

        // 1. Generate PDF (With Arabic Fixes)
        generatePDF(orderData, subtotal, deliveryPrice, discount, calculatedTotal, storeConfig);

        // 2. Thermal Print
        await printThermal(orderData, subtotal, deliveryPrice, discount, calculatedTotal, storeConfig);
    } catch (error) {
        console.error("❌ Receipt Printing System Failure:", error);
    }
}

/**
 * Generate PDF Receipt (A4 or Small Format)
 */
function generatePDF(orderData, subtotal, deliveryPrice, discount, calculatedTotal, storeConfig) {
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
        doc.fontSize(18).text(fixArabic(storeConfig.restaurantName), { align: 'center' });
        doc.fontSize(22).text(`#${orderData.id}`, { align: 'center' });
        doc.fontSize(8).text('V O R T E X  P O S', { align: 'center', opacity: 0.5 });
        doc.moveDown(0.4);
        doc.lineWidth(1.5).moveTo(15, doc.y).lineTo(211, doc.y).stroke();
        doc.moveDown(0.6);

        // Improved Info logic
        const cleanValue = (val, forbiddenKeywords = []) => {
            let trimmed = val?.trim() || "";
            if (!trimmed) return "-";
            const isForbidden = forbiddenKeywords.some(k => trimmed.includes(k));
            if (isForbidden) return "-";
            if (["0000000000", "0", "--", "Store", "Local"].includes(trimmed)) return "-";
            return trimmed;
        };

        const cName = cleanValue(orderData.customerName, ["تيك أوي", "نقدي", "Guest"]);
        const cPhone = cleanValue(orderData.customerPhone);
        const cAddress = cleanValue(orderData.customerAddress);

        // Grid-like rows: Both columns align towards the center line
        const startY = doc.y;
        doc.fontSize(9);
        
        // Row 1
        doc.text(fixArabic(`العميل: ${cName}`), 15, startY, { width: 98, align: 'left' }); // Ends at center
        doc.text(fixArabic(`التاريخ: ${orderData.orderDate}`), 113, startY, { width: 98, align: 'right' }); // Starts at center
        doc.moveDown(0.6);

        // Row 2
        const nextY = doc.y;
        doc.text(fixArabic(`الهاتف: ${cPhone}`), 15, nextY, { width: 98, align: 'left' });
        doc.text(fixArabic(`العنوان: ${cAddress}`), 113, nextY, { width: 98, align: 'right' });
        
        doc.moveDown(0.2);
        doc.lineWidth(0.5).dash(1.5, { space: 1.5 }).moveTo(15, doc.y).lineTo(211, doc.y).stroke().undash();
        doc.moveDown(0.4);

        // Items Header: Boxed with lines
        doc.moveDown(0.2);
        doc.lineWidth(0.5).moveTo(15, doc.y).lineTo(211, doc.y).stroke();
        doc.moveDown(0.2);
        doc.fontSize(10).text(fixArabic('الصنف                                 الكمية         السعر'), { align: 'right' });
        doc.moveDown(0.2);
        doc.lineWidth(0.5).moveTo(15, doc.y).lineTo(211, doc.y).stroke();
        doc.moveDown(0.2);
        
        // Items List
        doc.moveDown(0.2);
        orderData.orderDetails?.forEach(item => {
            let addonsTotal = 0;
            let commentsToPrint = [];

            if (item.comments && item.comments.length > 0) {
                item.comments.forEach(c => {
                    const addonPrice = parseFloat(c.price || 0);
                    
                    if (addonPrice < 0 && storeConfig.showDiscount === 'no') return;
                    if (addonPrice > 0) addonsTotal += addonPrice;
                    
                    if (storeConfig.showComments !== 'no') {
                        commentsToPrint.push(`${c.text} ${addonPrice > 0 ? '(+'+addonPrice+')' : ''}`);
                    }
                });
            }

            const finalPrice = ((parseFloat(item.price) + addonsTotal) * item.quantity).toFixed(2);
            doc.fontSize(10).text(`${finalPrice} ${storeConfig.currency}     x${item.quantity}     ${fixArabic(item.name)}`, { align: 'right' });

            commentsToPrint.forEach(c => {
                doc.fontSize(8).text(fixArabic(`  └─ ${c}`), { align: 'right', color: '#666666' });
            });
            doc.moveDown(0.2);
        });
        
        doc.fontSize(9).text('==========================================');

        // Totals Section
        doc.moveDown(0.4);
        doc.lineWidth(0.5).moveTo(15, doc.y).lineTo(211, doc.y).stroke();
        doc.moveDown(0.4);

        doc.fontSize(8); // Smaller sub-totals
        doc.text(fixArabic(`المجموع: ${subtotal.toFixed(2)}`), { align: 'right' });
        if (deliveryPrice > 0) doc.text(fixArabic(`التوصيل: ${deliveryPrice.toFixed(2)}`), { align: 'right' });
        if (discount > 0 && storeConfig.showDiscount !== 'no') {
            doc.text(fixArabic(`الخصم: -${discount.toFixed(2)}`), { align: 'right' });
        }
        
        doc.moveDown(0.4);
        doc.lineWidth(0.5).dash(1.5, { space: 1.5 }).moveTo(15, doc.y).lineTo(211, doc.y).stroke().undash();
        doc.moveDown(0.4);

        // Grand Total: Centered
        doc.fontSize(11).text(fixArabic(`الإجمالي النهائي: ${calculatedTotal.toFixed(2)} ${storeConfig.currency}`), { align: 'center' });

        // Footer Section
        doc.moveDown(0.8);
        doc.lineWidth(0.5).moveTo(15, doc.y).lineTo(211, doc.y).stroke();
        doc.moveDown(0.6);
        
        doc.fontSize(9).text(fixArabic(`رقم التواصل: ${storeConfig.hotline}`), { align: 'center' });
        doc.fontSize(7).text(fixArabic(storeConfig.footerMessage), { align: 'center' });
        doc.moveDown(0.3);
        doc.fontSize(6).text(`Vortex POS - ${new Date().toLocaleDateString()}`, { align: 'center', opacity: 0.2 });

        doc.end();
        console.log(`✅ PDF Generated: receipt_${orderData.id}.pdf`);
    } catch (error) {
        console.error('❌ PDF Generation Error:', error);
    }
}

/**
 * Professional Thermal Print Logic using escpos (USB Direct)
 */
async function printThermal(orderData, subtotal, deliveryPrice, discount, calculatedTotal, storeConfig) {
    const escpos = require('escpos');
    escpos.USB = require('escpos-usb');

    try {
        // البحث عن طابعة USB
        const devices = escpos.USB.findPrinter();
        if (!devices || devices.length === 0) {
            console.warn("⚠️ No USB Thermal Printer found via escpos-usb");
            return;
        }

        const device = new escpos.USB();
        const printer = new escpos.Printer(device);

        device.open(async function(error) {
            if (error) {
                console.error("❌ Failed to open printer device:", error);
                return;
            }

            try {
                printer
                    .font('a')
                    .align('ct')
                    .style('bu')
                    .size(2, 2)
                    .text(fixArabic(storeConfig.restaurantName))
                    .size(1, 1)
                    .text(`#${orderData.id}`)
                    .text("V O R T E X  P O S")
                    .text("--------------------------------")
                    .align('lt');

                const cleanValue = (val, forbiddenKeywords = []) => {
                    let trimmed = val?.trim() || "";
                    if (!trimmed) return "-";
                    const isForbidden = forbiddenKeywords.some(k => trimmed.includes(k));
                    if (isForbidden) return "-";
                    if (["0000000000", "0", "--", "Store", "Local"].includes(trimmed)) return "-";
                    return trimmed;
                };

                const cName = cleanValue(orderData.customerName, ["تيك أوي", "نقدي", "Guest"]);
                const cPhone = cleanValue(orderData.customerPhone);
                const cAddress = cleanValue(orderData.customerAddress);

                printer
                    .text(fixArabic(`Date: ${orderData.orderDate}`))
                    .text(fixArabic(`Customer: ${cName}`))
                    .text(fixArabic(`Phone: ${cPhone}`))
                    .text(fixArabic(`Address: ${cAddress}`))
                    .text("--------------------------------");

                orderData.orderDetails?.forEach(item => {
                    let addonsTotal = 0;
                    if (item.comments && item.comments.length > 0) {
                        item.comments.forEach(c => {
                            if (parseFloat(c.price) > 0) addonsTotal += parseFloat(c.price);
                        });
                    }
                    const finalPrice = ((parseFloat(item.price) + addonsTotal) * item.quantity).toFixed(2);
                    printer.text(`${item.quantity} x ${fixArabic(item.name)} : ${finalPrice}`);
                });

                printer
                    .text("--------------------------------")
                    .align('rt')
                    .text(fixArabic(`Total: ${calculatedTotal.toFixed(2)} ${storeConfig.currency}`))
                    .align('ct')
                    .text("--------------------------------")
                    .text(fixArabic(storeConfig.footerMessage))
                    .text(`Vortex POS - ${new Date().toLocaleDateString()}`)
                    .cut()
                    .close();

                console.log("🖨️ Thermal Receipt Printed via Direct USB");
            } catch (err) {
                console.error("❌ Error during print sequence:", err);
                device.close();
            }
        });

    } catch (error) {
        console.error("❌ Direct USB Thermal Printing Failed:", error.message);
    }
}

module.exports = { printReceipt };