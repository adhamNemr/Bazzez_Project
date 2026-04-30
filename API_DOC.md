# 📚 API Documentation - Vortex POS POS System

This document provides a reference for all API endpoints used in the Vortex POS Restaurant POS system.

---

## 🧑‍💼 Authentication

### ▶️ Login
- `POST /api/login`
- **Body:**
```json
{
  "username": "admin",
  "password": "123456"
}
```
- **Response:**
```json
{
  "token": "JWT_TOKEN"
}
```

---

## 🍔 Products

### 📥 Create Product
- `POST /api/products`
- **Headers:** `{ Authorization: Bearer TOKEN }`
- **Body (form-data):**
```
name: "Burger"
price: 45
category: "Meals"
image: (file)
```

### 📤 Get All Products
- `GET /api/products`
- **Headers:** `{ Authorization: Bearer TOKEN }`

---

## 📦 Orders

### 📥 Create Order
- `POST /api/orders`
- **Headers:** `{ Authorization: Bearer TOKEN }`
- **Body:**
```json
{
  "customerName": "Ahmed",
  "customerPhone": "01012345678",
  "customerAddress": "Cairo",
  "deliveryPrice": 10,
  "orderTotal": 100,
  "discount": 5,
  "orderDetails": [
    { "productId": 1, "name": "Burger", "quantity": 2, "price": 45 }
  ],
  "comments": [
    { "commentText": "No onions", "color": "red", "price": 5 }
  ]
}
```

### 📤 Get All Orders
- `GET /api/orders`
- **Headers:** `{ Authorization: Bearer TOKEN }`

---

## 💳 Payments

### 📥 Create Payment
- `POST /api/payments`
- **Headers:** `{ Authorization: Bearer TOKEN }`
- **Body:**
```json
{
  "order_id": 1,
  "payment_method": "Cash",
  "payment_amount": 95
}
```

### 📤 Get All Payments
- `GET /api/payments`
- **Headers:** `{ Authorization: Bearer TOKEN }`

---

## 🎁 Discounts

### 📥 Create Discount Code
- `POST /api/discounts`
- **Headers:** `{ Authorization: Bearer TOKEN }`
- **Body:**
```json
{
  "code": "OFF10",
  "value": 10,
  "type": "percent",
  "startDate": "2025-05-01",
  "endDate": "2025-05-31",
  "applicable_products": [1, 2]
}
```

### 📤 Get All Discount Codes
- `GET /api/discounts`
- **Headers:** `{ Authorization: Bearer TOKEN }`

---

## 🛠️ Notes

- All endpoints require Bearer Token for authorization unless stated otherwise.
- Dates should be in `YYYY-MM-DD` format.
- All amounts are in EGP.

---
