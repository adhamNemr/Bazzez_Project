# 🍽️ Advanced Restaurant Management System

A full-featured restaurant management system that includes:
- Order management (Takeaway / Delivery)
- Customer management
- Daily & monthly reports
- Sales analytics with charts
- Role-based access (Manager / Cashier)
- Discount codes & expiry alerts
- Inventory management With Alerts
- Receipt printing with USB thermal printer

---

## 📦 Tech Stack

- Node.js (Express)
- MySQL (Sequelize ORM)
- JWT Authentication
- HTML, CSS, JavaScript (for testing UI)
- Chart.js (for analytics charts)
- Multer (file uploads)
- dotenv, CORS

---

## 📬 API Documentation

You can explore and test the full API using Postman:

🔗 [Click here to open the Postman Docs](https://www.postman.com/adhamnemr/workspace/my-workspace/documentation/40823925-ad580d36-633f-4ce2-a451-06a7d8f8d401)

> Note: The project supports USB thermal printer integration on Windows.

---

## ⚙️ Features

- Secure login with JWT & role-based redirection
- Add / Edit / Delete customers and orders
- Daily closing & monthly closing with reset analytics
- Sales analytics: top products, total revenue, delivery earnings
- Discount code management with product linking & expiration
- Alerts for low stock & product expiry dates
- Dynamic dashboard with blurred popups & filterable data
- USB Thermal Printer integration for receipt printing

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/adham4/pos_system.git
cd pos-system/server
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create a `.env` file

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=*********
DB_NAME=pos_system
JWT_SECRET=mySuperSecretKey123
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
