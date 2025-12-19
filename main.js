const { app, BrowserWindow } = require('electron');
const path = require('path');
const waitOn = require('wait-on');

// Start the Express server
require('./server.js');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false, // Security best practice
      contextIsolation: true,
    },
    icon: path.join(__dirname, 'public/img/logo.png') // Assuming there is a logo
  });

  // Wait for the server to be ready before loading the URL
  const opts = {
    resources: [
      'http://localhost:8083'
    ],
    delay: 1000, // initial delay in ms
    interval: 100, // poll interval in ms
    simultaneous: 1, // limit to 1 connection per resource at a time
    timeout: 30000, // timeout in ms
    tcpTimeout: 1000, // tcp timeout in ms
    window: 1000, // stabilization time in ms
  };

  waitOn(opts).then(() => {
    win.loadURL('http://localhost:8083');
  }).catch((err) => {
    console.error('Error waiting for server:', err);
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
