const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware');
const { register, login, getMe, changePassword } = require('../controllers/authController');

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.get('/me', authMiddleware, getMe);
router.put('/password', authMiddleware, changePassword);

module.exports = router;
