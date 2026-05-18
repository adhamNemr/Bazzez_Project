const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

// 🛡️ Safe Mode: قفل تسريع الأجهزة لحل مشكلة الشاشة السودة
app.disableHardwareAcceleration();

function createWindow() {
    const rootPath = app.getAppPath();
    
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        backgroundColor: '#1a1a1a',
        show: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            sandbox: false // لضمان تشغيل الكود المحلي
        }
    });

    mainWindow.setMenuBarVisibility(false);
    mainWindow.webContents.openDevTools();

    const logToUI = (msg) => {
        if (!mainWindow) return;
        const safeMsg = JSON.stringify(String(msg)); // 🛡️ أمن جداً لأي رموز
        mainWindow.webContents.executeJavaScript(`console.log("🖥️ " + ${safeMsg})`).catch(() => {});
    };

    // صفحة اختبار بسيطة جداً

    setTimeout(() => {
        try {
            logToUI('Booting server...');
            
            // قراءة الإعدادات
            const envPath = path.join(rootPath, '.env');
            if (fs.existsSync(envPath)) {
                const envConfig = fs.readFileSync(envPath, 'utf8');
                envConfig.split('\n').forEach(line => {
                    const index = line.indexOf('=');
                    if (index > 0) {
                        const key = line.substring(0, index).trim();
                        const value = line.substring(index + 1).trim();
                        process.env[key] = value;
                    }
                });
            }

            process.env.DB_PATH = path.join(app.getPath('userData'), 'database.sqlite');
            process.env.PORT = '8083';
            process.env.NODE_ENV = 'production';

            const serverPath = path.join(rootPath, 'server.js');
            require(serverPath);
            logToUI('✅ Server is running');

        } catch (err) {
            logToUI(`❌ ERROR: ${err.message}`);
        }
    }, 2000);

    const checkServer = () => {
        mainWindow.loadURL('http://localhost:8083/index.html').catch(() => {
            setTimeout(checkServer, 1000);
        });
    };

    setTimeout(checkServer, 6000);

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// إعدادات الشاشة
app.commandLine.appendSwitch('high-dpi-support', '1');
app.commandLine.appendSwitch('force-device-scale-factor', '1');

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    app.quit();
});
