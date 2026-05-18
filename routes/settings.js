const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');

router.get('/', settingsController.getAllSettings);
router.post('/', settingsController.updateSetting);
router.post('/bulk', settingsController.updateSettingsBulk);
router.post('/reset-database', settingsController.resetDatabase);

module.exports = router;
