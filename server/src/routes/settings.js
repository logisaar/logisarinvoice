const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware');
const { getSettings, updateSettings } = require('../controllers/settingsController');

// All routes are protected
router.use(authMiddleware);

router.get('/', getSettings);
router.put('/', updateSettings);

module.exports = router;
