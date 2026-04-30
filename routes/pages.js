// routes/pages.js - Clean URL Page Routing (No Auth Middleware)
// Security is handled client-side via localStorage token checks in each page's JS.
const express = require('express');
const router = express.Router();
const path = require('path');

const publicDir = path.join(__dirname, '../public');

// Root -> redirect based on role (client-side handles it)
router.get('/', (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
});

// Login
router.get('/login', (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
});

// Cashier
router.get('/cashier', (req, res) => {
    res.sendFile(path.join(publicDir, 'cashier.html'));
});

// Dashboard
router.get('/dashboard', (req, res) => {
    res.sendFile(path.join(publicDir, 'dashboard.html'));
});

// Inventory
router.get('/inventory', (req, res) => {
    res.sendFile(path.join(publicDir, 'inventory.html'));
});

// Products Management Page
router.get('/products', (req, res) => {
    res.sendFile(path.join(publicDir, 'pages/products.html'));
});

// Sales Reports Page
router.get('/sales', (req, res) => {
    res.sendFile(path.join(publicDir, 'pages/sales.html'));
});

// Users Management Page
router.get('/users', (req, res) => {
    res.sendFile(path.join(publicDir, 'pages/users.html'));
});

module.exports = router;
