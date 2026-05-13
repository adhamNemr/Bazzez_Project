const express = require('express');
const router = express.Router();
const merchantController = require('../controllers/merchantController');
const authorize = require('../middleware/authorize');
const { authMiddleware } = require('../middleware/authMiddleware'); // ✅ Added this
const { PERMISSIONS: P } = require('../config/permissions');

// 🛡️ Apply authMiddleware to all routes here to populate req.user
router.use(authMiddleware(['manager', 'supervisor', 'accountant', 'cashier', 'owner']));

// Merchants
router.get('/', authorize(P.finance.view), merchantController.getMerchants);
router.post('/', authorize(P.finance.edit), merchantController.createMerchant);
router.put('/:id', authorize(P.finance.edit), merchantController.updateMerchant);
router.delete('/:id', authorize(P.users.manage), merchantController.deleteMerchant); // Deleting a merchant is restricted to managers

// Transactions
router.get('/:merchantId/transactions', authorize(P.finance.ledger), merchantController.getTransactions);
router.post('/:merchantId/transactions', authorize(P.finance.edit), merchantController.addTransaction);
router.put('/transactions/:id', authorize(P.finance.edit), merchantController.updateTransaction);
router.delete('/transactions/:id', authorize(P.finance.edit), merchantController.deleteTransaction);

module.exports = router;
