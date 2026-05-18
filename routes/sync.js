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

module.exports = router;
