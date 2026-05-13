const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { ThermalPrinter, PrinterTypes } = require('node-thermal-printer');
const branding = require('../config/branding');
const { Setting } = require('../models');
const { fixArabic } = require('../utils/arabicHelper');

const ARABIC_FONT = path.join(__dirname, '../assets/fonts/Tahoma.ttf');
const ARABIC_FONT_BOLD = path.join(__dirname, '../assets/fonts/Tahoma Bold.ttf');

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
        const doc = new PDFDocument({ size: [226, 600], margin: 5 }); // 80mm with minimal margin
        const receiptPath = path.join(__dirname, `receipt_${orderData.id}.pdf`);
        const writeStream = fs.createWriteStream(receiptPath);

        doc.pipe(writeStream);

        // --- Branding & Header ---
        if (fs.existsSync(ARABIC_FONT_BOLD)) {
            doc.font(ARABIC_FONT_BOLD);
        } else if (fs.existsSync(ARABIC_FONT)) {
            doc.font(ARABIC_FONT);
        }

        const pageWidth = 226;
        const leftX = 5;
        const rightX = 221;
        const centerX = pageWidth / 2;

        doc.fontSize(22).text(fixArabic("دار الفاروق"), { align: 'center' });
        doc.fontSize(14).text(fixArabic(storeConfig.restaurantName), { align: 'center' });
        doc.moveDown(0.2);
        doc.fontSize(32).text(`#${orderData.id}`, { align: 'center' });
        doc.fontSize(8).text('V O R T E X  P O S', { align: 'center', opacity: 0.3 });
        doc.moveDown(0.4);
        
        doc.lineWidth(1.5).moveTo(leftX, doc.y).lineTo(rightX, doc.y).stroke();
        doc.moveDown(0.6);

        // --- Info Section ---
        doc.fontSize(10);
        const infoY = doc.y;
        doc.text(fixArabic(`التاريخ: ${orderData.orderDate}`), leftX, infoY, { align: 'right', width: pageWidth - 10 });
        doc.moveDown(0.3);
        
        const cleanName = (val) => (val?.includes("تيك أوي") || val?.includes("--") || !val) ? "--" : val;
        doc.text(fixArabic(`العميل: ${cleanName(orderData.customerName)}`), leftX, doc.y, { align: 'right', width: pageWidth - 10 });
        
        if (orderData.customerPhone && orderData.customerPhone !== "0000000000") {
            doc.moveDown(0.3);
            doc.text(fixArabic(`الهاتف: ${orderData.customerPhone}`), leftX, doc.y, { align: 'right', width: pageWidth - 10 });
        }

        doc.moveDown(0.5);
        doc.lineWidth(0.5).dash(3, { space: 2 }).moveTo(leftX, doc.y).lineTo(rightX, doc.y).stroke().undash();
        doc.moveDown(0.5);

        // --- Table Header (FULL WIDTH) ---
        const colPriceX = 5;    // Left
        const colQtyX = 85;     // Center-Left
        const colItemX = 120;   // Right

        doc.fontSize(11);
        const hY = doc.y;
        doc.text(fixArabic('السعر'), colPriceX, hY, { width: 70, align: 'left' });
        doc.text(fixArabic('الكمية'), colQtyX, hY, { width: 35, align: 'center' });
        doc.text(fixArabic('الصنف'), colItemX, hY, { width: 101, align: 'right' });
        
        doc.moveDown(0.3);
        doc.lineWidth(0.8).moveTo(leftX, doc.y).lineTo(rightX, doc.y).stroke();
        doc.moveDown(0.5);

        // --- Items List ---
        orderData.orderDetails?.forEach(item => {
            const curY = doc.y;
            const priceVal = ((parseFloat(item.price) || 0) * (parseFloat(item.quantity) || 1)).toFixed(2);
            
            doc.fontSize(11);
            doc.text(`${priceVal}`, colPriceX, curY, { width: 75, align: 'left' });
            doc.text(`x${item.quantity}`, colQtyX, curY, { width: 35, align: 'center' });
            doc.text(fixArabic(item.name), colItemX, curY, { width: 101, align: 'right' });

            if (item.comments && item.comments.length > 0) {
                item.comments.forEach(c => {
                    doc.moveDown(0.1);
                    const txt = c.price > 0 ? `${c.text} (+${c.price})` : c.text;
                    doc.fontSize(9).text(fixArabic(`└─ ${txt}`), colItemX, doc.y, { width: 101, align: 'right', color: '#555555' });
                });
            }
            doc.moveDown(0.5);
        });

        doc.lineWidth(0.8).moveTo(leftX, doc.y).lineTo(rightX, doc.y).stroke();
        doc.moveDown(0.8);

        // --- Totals Section (Clearer & More Spacious) ---
        doc.fontSize(10);
        const drawTotalRow = (label, value) => {
            doc.text(fixArabic(label), centerX, doc.y, { width: centerX - 5, align: 'right' });
            doc.text(value, leftX, doc.y - 10, { width: centerX - 5, align: 'left' });
            doc.moveDown(0.3);
        };

        drawTotalRow('الإجمالي الفرعي:', subtotal.toFixed(2));
        if (deliveryPrice > 0) drawTotalRow('خدمة التوصيل:', deliveryPrice.toFixed(2));
        if (discount > 0) drawTotalRow('الخصم:', `-${discount.toFixed(2)}`);

        doc.moveDown(0.4);
        doc.lineWidth(1.5).moveTo(leftX + 20, doc.y).lineTo(rightX - 20, doc.y).stroke();
        doc.moveDown(0.6);

        // --- GRAND TOTAL (HERO SECTION) ---
        doc.fontSize(16).text(fixArabic('الإجمالي الكلي'), { align: 'center' });
        doc.moveDown(0.2);
        doc.fontSize(24).text(`${calculatedTotal.toFixed(2)} ${storeConfig.currency}`, { align: 'center', underline: true });

        // --- Footer ---
        doc.moveDown(1.2);
        doc.lineWidth(0.5).dash(1, { space: 1 }).moveTo(leftX, doc.y).lineTo(rightX, doc.y).stroke().undash();
        doc.moveDown(0.6);

        doc.fontSize(12).text(fixArabic(storeConfig.hotline), { align: 'center' });
        doc.fontSize(9).text(fixArabic(storeConfig.footerMessage), { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(7).text(`Vortex POS - ${new Date().toLocaleString('ar-EG')}`, { align: 'center', opacity: 0.2 });

        doc.end();
        console.log(`✅ Professional Receipt #${orderData.id} Generated with Arabic Fonts.`);
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