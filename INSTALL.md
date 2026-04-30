# 🍽️ Vortex POS POS System - Setup & Installation Guide

Congratulations on your purchase of the Vortex POS POS System. This document will guide you through the setup process to get the system running for your restaurant.

---

## 📋 Prerequisites

Before starting, ensure you have the following installed on your machine:
- **Node.js** (v16 or higher)
- **MySQL** (v8 or higher)
- **Git** (optional, for updates)

---

## 🚀 Installation Steps

### 1. Database Setup
1. Open your MySQL client (e.g., MySQL Workbench or phpMyAdmin).
2. Create a new database named `pos_system`.
3. The system uses Sequelize, so the tables will be created automatically on the first run.

### 2. Configure Environment
1. In the `server` directory, locate the `.env` file (or create one using `.env.example`).
2. Update the credentials to match your setup:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=pos_system
   JWT_SECRET=pick_a_strong_random_string
   PORT=8083

   # Printer Settings
   PRINTER_INTERFACE=//./COM1  # For USB/Serial (Windows)
   PRINTER_TYPE=epson          # star or epson
   ```

### 3. Install Dependencies
Open your terminal in the `server` directory and run:
```bash
npm install
```

### 4. Customizing Branding
To change the restaurant name or hotline without touching the code, edit `server/config/branding.js`:
```javascript
module.exports = {
    restaurantName: "YOUR RESTAURANT NAME",
    hotline: "01XXXXXXXXX",
    // ...
};
```

### 5. Running the System
Start the server by running:
```bash
npm start
```
The application will be accessible at `http://localhost:8083`.

---

## 🖨️ Printer Support

The system supports most ESC/POS compatible thermal printers.
- **Windows**: Use the full path to the printer port (e.g., `//./COM1` or `//ComputerName/PrinterName`).
- **Linux/macOS**: Use the device path (e.g., `/dev/usb/lp0`).

---

## 🛠️ Maintenance & Reports
- **Daily Reports**: Access the "Reports" tab to view sales and export as Excel.
- **Security**: The system uses JWT for authentication. Ensure your `JWT_SECRET` is kept private.

---

**Developed for Commercial Use.**
For support or customization, contact the developer.
