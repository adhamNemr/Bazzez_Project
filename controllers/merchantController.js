const { Merchant, MerchantTransaction, sequelize } = require('../models');

exports.getMerchants = async (req, res) => {
    try {
        const { type } = req.query;
        const whereClause = type ? { type } : {};
        const merchants = await Merchant.findAll({ where: whereClause, order: [['name', 'ASC']] });

        // Enrich each merchant with transaction totals in ONE query to avoid N+1 problem
        const totals = await MerchantTransaction.findAll({
            attributes: [
                'merchantId',
                [sequelize.literal("SUM(CASE WHEN type = 'payment' THEN amount ELSE 0 END)"), 'totalPayments'],
            ],
            group: ['merchantId'],
            raw: true
        });

        // Convert totals array to a lookup map for fast O(1) access
        const totalsMap = {};
        totals.forEach(t => {
            totalsMap[t.merchantId] = parseFloat(t.totalPayments || 0);
        });

        const enriched = merchants.map(m => {
            const totalPayments = totalsMap[m.id] || 0;
            const balance = parseFloat(m.balance || 0);
            
            return {
                ...m.toJSON(),
                totalPayments: totalPayments,
                totalInvoices: balance + totalPayments, // المبلغ كامل = المتبقي + المدفوع
            };
        });

        res.json(enriched);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'حدث خطأ أثناء جلب البيانات' });
    }
};

exports.createMerchant = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { name, phone, type, notes, initialBalance } = req.body;
        if (!name || !type) return res.status(400).json({ error: 'الاسم والنوع مطلوبان' });
        
        const numericInitial = parseFloat(initialBalance) || 0;
        
        const merchant = await Merchant.create(
            { name, phone, type, notes, balance: numericInitial },
            { transaction: t }
        );
        
        // If initial balance provided, log it as an opening transaction
        if (numericInitial > 0) {
            await MerchantTransaction.create({
                merchantId: merchant.id,
                type: type === 'supplier' ? 'invoice' : 'invoice', // debt for both
                amount: numericInitial,
                date: new Date(),
                notes: 'رصيد افتتاحي'
            }, { transaction: t });
        }
        
        await t.commit();
        res.status(201).json(merchant);
    } catch (err) {
        await t.rollback();
        console.error(err);
        res.status(500).json({ error: 'فشل في إضافة التاجر' });
    }
};

exports.updateMerchant = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, phone, notes } = req.body;
        await Merchant.update({ name, phone, notes }, { where: { id } });
        res.json({ success: true, message: 'تم التحديث بنجاح' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'فشل التحديث' });
    }
};

exports.deleteMerchant = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;

        // Force delete all associated transactions first to maintain integrity
        await MerchantTransaction.destroy({ where: { merchantId: id }, transaction: t });
        
        // Delete the merchant itself
        const deletedCount = await Merchant.destroy({ where: { id }, transaction: t });

        if (deletedCount === 0) {
            await t.rollback();
            return res.status(404).json({ error: 'العميل/المورد غير موجود' });
        }

        await t.commit();
        res.json({ success: true, message: 'تم الحذف بنجاح مع كافة البيانات المرتبطة' });
    } catch (err) {
        await t.rollback();
        console.error('❌ Deletion Error:', err);
        res.status(500).json({ error: 'فشل الحذف. قد تكون هناك بيانات مرتبطة في أقسام أخرى.' });
    }
};

// Transactions
exports.getTransactions = async (req, res) => {
    try {
        const { merchantId } = req.params;
        const transactions = await MerchantTransaction.findAll({
            where: { merchantId },
            order: [['date', 'DESC'], ['createdAt', 'DESC']]
        });
        const merchant = await Merchant.findByPk(merchantId);
        res.json({ merchant, transactions });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'فشل جلب الحركات' });
    }
};

exports.addTransaction = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { merchantId } = req.params;
        const { type, amount, date, notes } = req.body; // type: 'invoice' or 'payment'

        if (!amount || amount <= 0) return res.status(400).json({ error: 'المبلغ غير صحيح' });

        const merchant = await Merchant.findByPk(merchantId, { 
            transaction: t,
            lock: t.LOCK.UPDATE 
        });
        if (!merchant) throw new Error('التاجر غير موجود');

        const transaction = await MerchantTransaction.create({
            merchantId,
            type,
            amount,
            date: date || new Date(),
            notes
        }, { transaction: t });

        // Update balance
        // Invoice increases debt, Payment decreases debt
        const numericAmount = parseFloat(amount);
        if (type === 'invoice') {
            merchant.balance = parseFloat(merchant.balance) + numericAmount;
        } else if (type === 'payment') {
            merchant.balance = parseFloat(merchant.balance) - numericAmount;
        }

        await merchant.save({ transaction: t });
        await t.commit();

        // 📝 Audit Log
        const { logAudit } = require('../utils/auditLogger');
        logAudit(req, {
            action: 'CREATE',
            tableName: 'MerchantTransaction',
            recordId: transaction.id,
            newValues: transaction.toJSON()
        });

        res.json({ success: true, transaction, newBalance: merchant.balance });
    } catch (err) {
        await t.rollback();
        console.error(err);
        res.status(500).json({ error: 'فشل إضافة الحركة المالية' });
    }
};

exports.deleteTransaction = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const transaction = await MerchantTransaction.findByPk(id, { transaction: t });
        if (!transaction) throw new Error('الحركة غير موجودة');

        const merchant = await Merchant.findByPk(transaction.merchantId, { 
            transaction: t,
            lock: t.LOCK.UPDATE
        });
        
        // Reverse the balance
        const numericAmount = parseFloat(transaction.amount);
        if (transaction.type === 'invoice') {
            merchant.balance = parseFloat(merchant.balance) - numericAmount;
        } else if (transaction.type === 'payment') {
            merchant.balance = parseFloat(merchant.balance) + numericAmount;
        }

        const oldData = transaction.toJSON();
        await merchant.save({ transaction: t });
        await transaction.destroy({ transaction: t });
        
        await t.commit();

        // 📝 Audit Log
        const { logAudit } = require('../utils/auditLogger');
        logAudit(req, {
            action: 'DELETE',
            tableName: 'MerchantTransaction',
            recordId: id,
            oldValues: oldData
        });

        res.json({ success: true, newBalance: merchant.balance });
    } catch (err) {
        await t.rollback();
        console.error(err);
        res.status(500).json({ error: 'فشل حذف الحركة' });
    }
};

exports.updateTransaction = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const { amount, date, notes } = req.body;
        
        const transaction = await MerchantTransaction.findByPk(id, { transaction: t });
        if (!transaction) return res.status(404).json({ error: 'الحركة غير موجودة' });

        const merchant = await Merchant.findByPk(transaction.merchantId, { 
            transaction: t,
            lock: t.LOCK.UPDATE
        });
        
        // 1. Reverse old amount
        const oldAmount = parseFloat(transaction.amount);
        if (transaction.type === 'invoice') {
            merchant.balance = parseFloat(merchant.balance) - oldAmount;
        } else {
            merchant.balance = parseFloat(merchant.balance) + oldAmount;
        }

        // 2. Apply new amount
        const newAmount = parseFloat(amount);
        if (transaction.type === 'invoice') {
            merchant.balance = parseFloat(merchant.balance) + newAmount;
        } else {
            merchant.balance = parseFloat(merchant.balance) - newAmount;
        }

        // 3. Update transaction record
        const oldData = transaction.toJSON();
        transaction.amount = newAmount;
        transaction.date = date || transaction.date;
        transaction.notes = notes;

        await merchant.save({ transaction: t });
        await transaction.save({ transaction: t });

        await t.commit();

        // 📝 Audit Log
        const { logAudit } = require('../utils/auditLogger');
        logAudit(req, {
            action: 'UPDATE',
            tableName: 'MerchantTransaction',
            recordId: id,
            oldValues: oldData,
            newValues: transaction.toJSON()
        });

        res.json({ success: true, newBalance: merchant.balance });
    } catch (err) {
        await t.rollback();
        console.error(err);
        res.status(500).json({ error: 'فشل تعديل الحركة' });
    }
};
