const { Expense } = require('../models');
const { Op } = require('sequelize');

// ✅ جلب كل المصروفات
exports.getAllExpenses = async (req, res) => {
    try {
        const expenses = await Expense.findAll({
            order: [['date', 'DESC'], ['createdAt', 'DESC']]
        });
        res.json(expenses);
    } catch (error) {
        console.error('❌ Error fetching expenses:', error);
        res.status(500).json({ message: 'فشل في جلب المصروفات' });
    }
};

// ✅ إضافة مصروف جديد
exports.createExpense = async (req, res) => {
    try {
        const { description, amount, category, date, payment_method } = req.body;
        const expense = await Expense.create({
            description,
            amount,
            category,
            date: date || new Date(),
            payment_method: payment_method || 'cash',
            addedBy: req.user ? req.user.username : 'Unknown'
        });
        res.status(201).json({ message: '✅ تم تسجيل المصروف بنجاح', expense });
    } catch (error) {
        console.error('❌ Error creating expense:', error);
        res.status(500).json({ message: 'فشل في تسجيل المصروف' });
    }
};

// ✅ حذف مصروف
exports.deleteExpense = async (req, res) => {
    try {
        const { id } = req.params;
        await Expense.destroy({ where: { id } });
        res.json({ message: '✅ تم حذف المصروف بنجاح' });
    } catch (error) {
        console.error('❌ Error deleting expense:', error);
        res.status(500).json({ message: 'فشل في حذف المصروف' });
    }
};

// ✅ جلب ملخص المصروفات لليوم
exports.getDailyExpensesSummary = async (date) => {
    try {
        const summary = await Expense.sum('amount', {
            where: {
                date: date || new Date().toISOString().slice(0, 10)
            }
        });
        return summary || 0;
    } catch (error) {
        console.error('❌ Error summing daily expenses:', error);
        return 0;
    }
};
