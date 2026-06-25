const express = require('express');
const router = express.Router();
const syncService = require('../services/syncService');
const { SyncQueue } = require('../models');
const { authMiddleware } = require('../middleware/authMiddleware');

router.get('/status', authMiddleware(['manager', 'supervisor', 'cashier']), async (req, res) => {
    try {
        const pending = await SyncQueue.count({ where: { status: 'pending' } });
        const failed  = await SyncQueue.count({ where: { status: 'failed'  } });
        
        res.json({
            isOnline: syncService.isOnline,
            isSyncing: syncService.isSyncing,
            pendingCount: pending,
            failedCount: failed
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/force-push-all', authMiddleware(['manager']), async (req, res) => {
    try {
        res.json({ success: true, message: 'Force push started in background!' });
        await syncService.forcePushAllLocalData();
    } catch (err) {
        console.error('❌ Force push error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
