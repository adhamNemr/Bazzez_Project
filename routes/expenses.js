const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const { authMiddleware } = require('../middleware/authMiddleware');

// ✅ All endpoints require authentication (manager only)
router.get('/', authMiddleware(['manager', 'cashier']), expenseController.getAllExpenses);
router.post('/', authMiddleware(['manager']), expenseController.createExpense);
router.put('/:id', authMiddleware(['manager']), expenseController.updateExpense);
router.delete('/:id', authMiddleware(['manager']), expenseController.deleteExpense);

module.exports = router;
