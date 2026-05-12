const express = require('express');
const router = express.Router();
const merchantController = require('../controllers/merchantController');

// Merchants
router.get('/', merchantController.getMerchants);
router.post('/', merchantController.createMerchant);
router.put('/:id', merchantController.updateMerchant);
router.delete('/:id', merchantController.deleteMerchant);

// Transactions
router.get('/:merchantId/transactions', merchantController.getTransactions);
router.post('/:merchantId/transactions', merchantController.addTransaction);
router.put('/transactions/:id', merchantController.updateTransaction);
router.delete('/transactions/:id', merchantController.deleteTransaction);

module.exports = router;
