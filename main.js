const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const waitOn = require('wait-on');

// Start the Express server
require('./server.js');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    icon: path.join(__dirname, 'public/img/logo.png')
  });

  const opts = {
    resources: ['http://localhost:8083'],
    timeout: 30000,
  };

  waitOn(opts).then(() => {
    mainWindow.loadURL('http://localhost:8083');
  });
}

// ✅ وظيفة الطباعة الصامتة (Silent Printing)
ipcMain.on('print-receipt', (event, orderData) => {
  let printWin = new BrowserWindow({
    show: false, // مخفية
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  });

  // تحميل صفحة الإيصال مع البيانات
  const receiptUrl = `http://localhost:8083/receipt.html?orderId=${orderData.id}&silent=true`;
  printWin.loadURL(receiptUrl);

  printWin.webContents.on('did-finish-load', () => {
    // الطباعة للطابعة المحددة أوتوماتيكياً
    printWin.webContents.print({
      silent: true,
      printBackground: true,
      deviceName: 'POSPrinter POS80', // اسم الطابعة اللي أنت سطبتها
    }, (success, failureReason) => {
      if (!success) console.error('❌ Print failed:', failureReason);
      printWin.close();
    });
  });
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
