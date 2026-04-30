const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
// افترض وجود ميدلوير للتحقق من التوكن والـ Role
// const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

router.get('/', expenseController.getAllExpenses);
router.post('/', expenseController.createExpense);
router.delete('/:id', expenseController.deleteExpense);

module.exports = router;
