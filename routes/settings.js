const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');

router.get('/', settingsController.getAllSettings);
router.post('/', settingsController.updateSetting);
router.post('/bulk', settingsController.updateSettingsBulk);

module.exports = router;
