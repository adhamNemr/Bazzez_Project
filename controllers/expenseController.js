const { Expense } = require('../models');
const { Op } = require('sequelize');
const Joi = require('joi');

// ✅ Joi Validation Schema
const expenseSchema = Joi.object({
    description: Joi.string().min(2).max(255).required().messages({
        'string.empty': 'الوصف مطلوب',
        'string.min': 'الوصف يجب أن يكون حرفين على الأقل'
    }),
    amount: Joi.number().positive().required().messages({
        'number.positive': 'المبلغ يجب أن يكون أكبر من صفر',
        'any.required': 'المبلغ مطلوب'
    }),
    category: Joi.string().valid('Supplies', 'Rent', 'Utilities', 'Salaries', 'Maintenance', 'Marketing', 'Other').required(),
    payment_method: Joi.string().valid('cash', 'card', 'vcash', 'instapay').default('cash'),
    date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
    notes: Joi.string().max(500).allow('', null).optional()
});

// ✅ جلب المصروفات — مع فلتر بالتاريخ من الـ Backend
exports.getAllExpenses = async (req, res) => {
    try {
        const { Setting } = require('../models');
        const activeDateSetting = await Setting.findOne({ where: { key: 'active_business_date' } });
        const activeBusinessDate = activeDateSetting
            ? activeDateSetting.value
            : new Date().toLocaleDateString('en-CA');

        // Allow overriding date via query param
        const filterDate = (req.query.date && req.query.date !== 'undefined')
            ? req.query.date
            : activeBusinessDate;

        const where = {};

        if (req.query.all !== 'true') {
            where.date = filterDate;
        }

        const expenses = await Expense.findAll({
            where,
            order: [['date', 'DESC'], ['createdAt', 'DESC']]
        });

        // Also return summary stats for the current business date
        const todayExpenses = await Expense.findAll({ where: { date: filterDate } });
        const todayTotal = todayExpenses.reduce((s, e) => s + parseFloat(e.amount), 0);
        const cashTotal = todayExpenses.filter(e => e.payment_method === 'cash').reduce((s, e) => s + parseFloat(e.amount), 0);
        const cardTotal = todayExpenses.filter(e => e.payment_method === 'card').reduce((s, e) => s + parseFloat(e.amount), 0);
        const vcashTotal = todayExpenses.filter(e => e.payment_method === 'vcash').reduce((s, e) => s + parseFloat(e.amount), 0);
        const instapayTotal = todayExpenses.filter(e => e.payment_method === 'instapay').reduce((s, e) => s + parseFloat(e.amount), 0);

        // Month total — use Op.between to avoid Moment.js DATEONLY warning
        const [year, month] = filterDate.split('-');
        const firstDay = `${year}-${month}-01`;
        const lastDay = new Date(parseInt(year), parseInt(month), 0).toLocaleDateString('en-CA'); // last day of month
        const monthExpenses = await Expense.findAll({
            where: { date: { [Op.between]: [firstDay, lastDay] } }
        });
        const monthTotal = monthExpenses.reduce((s, e) => s + parseFloat(e.amount), 0);

        res.json({
            expenses,
            stats: {
                activeBusinessDate: activeBusinessDate, // The TRUE business date from settings
                filteredDate: filterDate,               // The date actually being viewed
                todayTotal,
                monthTotal,
                byMethod: { cash: cashTotal, card: cardTotal, vcash: vcashTotal, instapay: instapayTotal }
            }
        });
    } catch (error) {
        console.error('❌ Error fetching expenses:', error);
        res.status(500).json({ message: 'فشل في جلب المصروفات' });
    }
};

// ✅ إضافة مصروف جديد — مع Validation
exports.createExpense = async (req, res) => {
    try {
        const { error, value } = expenseSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        const { Setting } = require('../models');
        const activeDateSetting = await Setting.findOne({ where: { key: 'active_business_date' } });
        const businessDate = activeDateSetting
            ? activeDateSetting.value
            : new Date().toLocaleDateString('en-CA');

        const expense = await Expense.create({
            description: value.description,
            amount: value.amount,
            category: value.category,
            date: value.date || businessDate,
            payment_method: value.payment_method || 'cash',
            notes: value.notes || null,
            addedBy: req.user ? req.user.username : 'Unknown'
        });

        res.status(201).json({ message: '✅ تم تسجيل المصروف بنجاح', expense });
    } catch (error) {
        console.error('❌ Error creating expense:', error);
        res.status(500).json({ message: 'فشل في تسجيل المصروف' });
    }
};

// ✅ تعديل مصروف
exports.updateExpense = async (req, res) => {
    try {
        const { id } = req.params;
        const { error, value } = expenseSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        const expense = await Expense.findByPk(id);
        if (!expense) {
            return res.status(404).json({ message: 'المصروف غير موجود' });
        }

        await expense.update(value);
        res.json({ message: '✅ تم تعديل المصروف بنجاح', expense });
    } catch (error) {
        console.error('❌ Error updating expense:', error);
        res.status(500).json({ message: 'فشل في تعديل المصروف' });
    }
};

// ✅ حذف مصروف
exports.deleteExpense = async (req, res) => {
    try {
        const { id } = req.params;
        const expense = await Expense.findByPk(id);
        if (!expense) {
            return res.status(404).json({ message: 'المصروف غير موجود' });
        }
        await expense.destroy();
        res.json({ message: '✅ تم حذف المصروف بنجاح' });
    } catch (error) {
        console.error('❌ Error deleting expense:', error);
        res.status(500).json({ message: 'فشل في حذف المصروف' });
    }
};

// ✅ ملخص المصروفات لليوم (للاستخدام الداخلي في تقرير الوردية)
exports.getDailyExpensesSummary = async (date) => {
    try {
        const summary = await Expense.sum('amount', {
            where: { date: date || new Date().toLocaleDateString('en-CA') }
        });
        return summary || 0;
    } catch (error) {
        console.error('❌ Error summing daily expenses:', error);
        return 0;
    }
};
