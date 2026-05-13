# 🌌 Vortex POS — Wholesale Ledger Edition

![License](https://img.shields.io/github/license/adhamNemr/Bazzez_Project?style=flat-square)
![Node](https://img.shields.io/badge/Node.js-v18%2B-green?style=flat-square)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-lightgrey?style=flat-square)

Vortex POS is a production-ready Wholesale and Retail Management System built for high-concurrency environments. It features atomic inventory management, professional financial tracking for merchants, and a robust security layer.

---

## 📦 Tech Stack

- **Backend:** Node.js (Express)
- **Database:** PostgreSQL (Production) / SQLite (Development) via Sequelize ORM
- **Security:** JWT Authentication with Token Revocation (Blacklisting)
- **Concurrency:** Atomic Row-Level Locking for inventory and financial consistency
- **Frontend:** HTML5, Vanilla CSS, JavaScript (Dynamic UI with Glassmorphism)
- **Analytics:** Chart.js for deep sales and financial insights
- **Storage:** Multer for asset management

---

## ⚙️ Core Features

- **🛡️ Enterprise Security:** 
  - **Fine-grained RBAC:** 5 distinct roles (Manager, Supervisor, Accountant, Cashier, Owner).
  - **Audit Logs:** Full history of all financial transactions and order cancellations (with diff tracking).
  - **Rate Limiting:** Protects sensitive endpoints (Login) from brute-force attacks.
  - **JWT Blacklisting:** Secure logout and session invalidation.
- **📈 Wholesale & Retail Logic:**
  - Automated merchant balance tracking (Debt/Credit).
  - Atomic inventory decrements to prevent race conditions.
  - Daily & Monthly closing cycles with strict business date tracking.
- **🧾 Professional Printing:** USB Thermal Printer integration with Arabic font support.
- **📊 Real-time Analytics:** Revenue tracking, best-seller charts, and inventory expiry alerts.

---

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/adhamNemr/Bazzez_Project.git
cd Bazzez_Project/pos-system/server
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create a `.env` file

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password_here
DB_NAME=pos_system
JWT_SECRET=your_super_secret_key
```

### 4. Run the server

```bash
node server.js
```

---

## 🖼️ Screenshots

### 🔐 Login
![Login](./screenshots/Login.png)

### 📊 Dashboard
![Dashboard](./screenshots/Dashboard.png)

### 💸 Cashier Page
![Cashier](./screenshots/Cashier.png)

### 📦 Order Management
![Order Management](./screenshots/Order%20Management.png)

### 🍔 Product Management
![Product Management](./screenshots/Product%20Management.png)

### 📈 Daily Sales
![Daily Sales](./screenshots/Daily%20Sales.png)

### 📆 Monthly Sales
![Monthly Sales](./screenshots/Monthly%20Sales.png)

### 📋 Inventory Management
![Inventory Management](./screenshots/Inventory%20Management.png)

### 🏷️ Discount Management
![Discount Management](./screenshots/Discount%20Management.png)

### 📊 Analytics Dashboard
![Analytics Dashboard](./screenshots/Analytics%20Dashboard.png)

### 👤 Manage Customers
![Manage Customers](./screenshots/Manage%20Customers.png)

### 📉 Total Order Chart
![Total Order Chart](./screenshots/Total%20Order%20Chart.png)

### 💰 Revenue Chart
![Revenue Chart](./screenshots/Revenue%20Chart.png)

### 🥇 Best Seller Chart
![Best Seller Chart](./screenshots/Best%20Seller%20Chart.png)

### 🥄 Least Seller Chart
![Least Seller Chart](./screenshots/Least%20Seller%20Chart.png)

### 🧑‍🤝‍🧑 Best Customers Chart
![Best Customers Chart](./screenshots/Best%20Customers%20Chart.png)

### 📦 Inventory Chart
![Inventory Chart](./screenshots/Inventory%20Chart.png)
