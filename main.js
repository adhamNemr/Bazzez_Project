// main.js - Vortex POS | Production Entry Point
const { app, BrowserWindow, net } = require('electron');
const path = require('path');
const fs = require('fs');

// ══════════════════════════════════════════════
// 1. SINGLE INSTANCE LOCK
// ══════════════════════════════════════════════
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
} else {
    let mainWindow;
    let serverStarted = false;

    // ══════════════════════════════════════════════
    // 2. تحميل الـ .env
    // ══════════════════════════════════════════════
    function loadEnv() {
        const envPath = path.join(__dirname, '.env');
        if (fs.existsSync(envPath)) {
            const lines = fs.readFileSync(envPath, 'utf8').split('\n');
            lines.forEach(line => {
                const index = line.indexOf('=');
                if (index > 0) {
                    const key = line.substring(0, index).trim();
                    const value = line.substring(index + 1).trim();
                    if (key && !process.env[key]) process.env[key] = value;
                }
            });
        }
        process.env.DB_PATH  = path.join(app.getPath('userData'), 'database.sqlite');
        process.env.PORT     = '8083';
        process.env.NODE_ENV = 'production';
    }

    // ══════════════════════════════════════════════
    // 3. شاشة خطأ
    // ══════════════════════════════════════════════
    function showError(title, message) {
        if (!mainWindow) return;
        const html = `<html dir="rtl"><body style="background:#0f172a;color:#ef4444;font-family:Arial,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;padding:20px;box-sizing:border-box"><div style="font-size:48px;margin-bottom:16px">⚠️</div><h2 style="margin:0 0 12px;color:#f87171">${title}</h2><p style="color:#94a3b8;text-align:center;max-width:500px;line-height:1.6">${message}</p><p style="color:#475569;font-size:12px;margin-top:24px">Port: 8083</p><button onclick="location.reload()" style="margin-top:20px;padding:10px 24px;background:#3b82f6;color:white;border:none;border-radius:8px;cursor:pointer;font-size:14px">إعادة المحاولة</button></body></html>`;
        mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    }

    // ══════════════════════════════════════════════
    // 4. تشغيل السيرفر
    // ══════════════════════════════════════════════
    function startServer() {
        if (serverStarted) return true;
        try {
            require('./server.js');
            serverStarted = true;
            return true;
        } catch (err) {
            showError('فشل تشغيل السيرفر', err.message);
            return false;
        }
    }

    // ══════════════════════════════════════════════
    // 5. انتظار السيرفر — 60 ثانية + 127.0.0.1
    // ══════════════════════════════════════════════
    function waitForServer(retriesLeft) {
        if (retriesLeft === undefined) retriesLeft = 60;
        if (retriesLeft <= 0) {
            showError(
                'تعذر الاتصال بالسيرفر',
                'السيرفر لم يستجب خلال 60 ثانية.<br>حاول تشغيل البرنامج كـ Administrator أو تحقق من Windows Firewall.'
            );
            return;
        }
        try {
            const request = net.request({ method: 'GET', url: 'http://127.0.0.1:8083/index.html' });
            request.on('response', (response) => {
                if (response.statusCode < 500) {
                    mainWindow.loadURL('http://127.0.0.1:8083/index.html');
                } else {
                    setTimeout(() => waitForServer(retriesLeft - 1), 1000);
                }
            });
            request.on('error', () => {
                setTimeout(() => waitForServer(retriesLeft - 1), 1000);
            });
            request.end();
        } catch (e) {
            setTimeout(() => waitForServer(retriesLeft - 1), 1000);
        }
    }

    // ══════════════════════════════════════════════
    // 6. إنشاء النافذة
    // ══════════════════════════════════════════════
    function logToUI(msg, type = 'log') {
        if (!mainWindow) return;
        const safeMsg = JSON.stringify(String(msg));
        mainWindow.webContents.executeJavaScript(`console.${type}("🖥️ SERVER: " + ${safeMsg})`).catch(() => {});
    }

    // 🛡️ الربط بين الكونسول والسيرفر
    global.logToUI = logToUI;

    function createWindow() {
        mainWindow = new BrowserWindow({
            width: 1366,
            height: 768,
            minWidth: 1024,
            minHeight: 600,
            title: 'Vortex POS',
            backgroundColor: '#0f172a',
            show: false,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                webSecurity: false
            }
        });

        mainWindow.setMenuBarVisibility(false);

        const loadingHTML = `<html dir="rtl"><body style="background:#0f172a;color:#94a3b8;font-family:Arial,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0"><div style="font-size:48px;margin-bottom:20px">⚡</div><h2 style="color:#e2e8f0;margin:0 0 8px">Vortex POS</h2><p style="margin:0 0 24px">جاري تشغيل النظام...</p><div style="width:200px;height:4px;background:#1e293b;border-radius:2px;overflow:hidden"><div style="height:100%;background:#3b82f6;border-radius:2px;animation:l 1.5s ease-in-out infinite" id="bar"></div></div><style>@keyframes l{0%{width:0%}50%{width:70%}100%{width:100%}}</style></body></html>`;

        mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(loadingHTML));
        mainWindow.show();

        app.on('second-instance', () => {
            if (mainWindow) {
                if (mainWindow.isMinimized()) mainWindow.restore();
                mainWindow.focus();
            }
        });

        mainWindow.on('closed', () => { mainWindow = null; });
    }

    // ══════════════════════════════════════════════
    // 7. التشغيل
    // ══════════════════════════════════════════════
    app.commandLine.appendSwitch('high-dpi-support', '1');
    app.commandLine.appendSwitch('force-device-scale-factor', '1');

    app.whenReady().then(() => {
        loadEnv();
        createWindow();

        // 🖨️ مستمع الطباعة (Print Listener)
        const { ipcMain } = require('electron');
        ipcMain.on('print-receipt', (event, orderData) => {
            if (global.logToUI) {
                global.logToUI(`🖨️ Received print request for Order #${orderData?.id}`);
                global.logToUI(`📦 INCOMING ORDER DETAILS: ${JSON.stringify(orderData?.orderDetails)}`);
            }
            global.lastOrderData = orderData; // ✅ حفظ الداتا
            
            let printWindow = new BrowserWindow({ 
                show: false, 
                webPreferences: { 
                    nodeIntegration: true, 
                    contextIsolation: false 
                } 
            });
            
            const printerName = (process.env.PRINTER_INTERFACE || '').replace('printer:', '');
            
            // تحميل صفحة الإيصال من السيرفر لضمان مشاركة الـ localStorage
            const receiptURL = `http://localhost:8083/receipt.html`;
            printWindow.loadURL(receiptURL);

            printWindow.webContents.on('did-finish-load', () => {
                // الانتظار أجزاء من الثانية للتأكد من رندر الصفحة بالداتا قبل الطباعة
                setTimeout(() => {
                    const printOptions = {
                        silent: true,
                        deviceName: printerName || 'POSPrinter POS80',
                        printBackground: true,
                        margins: { marginType: 'none' },
                        pageSize: { width: 72000, height: 200000 } // 72mm width
                    };

                    printWindow.webContents.print(printOptions, (success, errorType) => {
                        if (!success) {
                            if (global.logToUI) global.logToUI(`❌ Print failed: ${errorType}`, 'error');
                        } else {
                            if (global.logToUI) global.logToUI(`✅ Print success for Order #${orderData.id}`);
                        }
                        printWindow.close();
                    });
                }, 300);
            });
        });
        // ✅ مستمع مستقل لطلب بيانات الإيصال (Handshake)
        ipcMain.on('get-receipt-data', (event) => {
            if (global.logToUI) {
                global.logToUI(`📡 Receipt page requested data. Sending Order #${global.lastOrderData?.id}`);
                global.logToUI(`📤 OUTGOING ORDER DETAILS: ${JSON.stringify(global.lastOrderData?.orderDetails)}`);
            }
            event.returnValue = global.lastOrderData || null;
        });
    // لا يوجد أقواس إضافية هنا

        const ok = startServer();
        if (ok) setTimeout(() => waitForServer(60), 2000);
    });

    app.on('window-all-closed', () => { app.quit(); });
}