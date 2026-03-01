const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const { asyncHandler, ApiError } = require('../middleware');
const { validateRequired, isValidEmail } = require('../utils');

/**
 * Register new admin user
 * POST /api/auth/register
 * Note: Disabled after first user is created (admin setup only)
 */
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  
  // Validate required fields
  validateRequired({ name, email, password }, ['name', 'email', 'password']);
  
  // Validate email format
  if (!isValidEmail(email)) {
    throw ApiError.badRequest('Invalid email format');
  }
  
  // Password validation
  if (password.length < 6) {
    throw ApiError.badRequest('Password must be at least 6 characters');
  }
  
  // Check if any users exist (only allow registration if no users)
  const existingUsers = await query('SELECT COUNT(*) as count FROM users');
  if (existingUsers[0].count > 0) {
    throw ApiError.forbidden('Registration is disabled. Please contact administrator.');
  }
  
  // Check if email already exists
  const existingEmail = await query('SELECT id FROM users WHERE email = ?', [email]);
  if (existingEmail.length > 0) {
    throw ApiError.conflict('Email already registered');
  }
  
  // Hash password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);
  
  // Create user
  const result = await query(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
    [name, email, passwordHash, 'admin']
  );
  
  // Create default business settings
  await query(
    `INSERT INTO business_settings (user_id, business_name, invoice_prefix) VALUES (?, ?, ?)`,
    [result.insertId, name + "'s Business", 'INV']
  );
  
  // Generate JWT token
  const token = jwt.sign(
    { userId: result.insertId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
  
  res.status(201).json({
    success: true,
    message: 'Registration successful',
    data: {
      token,
      user: {
        id: result.insertId,
        name,
        email,
        role: 'admin'
      }
    }
  });
});

/**
 * Login user
 * POST /api/auth/login
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  
  // Validate required fields
  validateRequired({ email, password }, ['email', 'password']);
  
  // Find user by email
  const users = await query('SELECT * FROM users WHERE email = ?', [email]);
  
  if (users.length === 0) {
    throw ApiError.unauthorized('Invalid email or password');
  }
  
  const user = users[0];
  
  // Verify password
  const isMatch = await bcrypt.compare(password, user.password_hash);
  
  if (!isMatch) {
    throw ApiError.unauthorized('Invalid email or password');
  }
  
  // Generate JWT token
  const token = jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
  
  res.json({
    success: true,
    message: 'Login successful',
    data: {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        created_at: user.created_at
      }
    }
  });
});

/**
 * Get current user info
 * GET /api/auth/me
 */
const getMe = asyncHandler(async (req, res) => {
  // User is already attached by authMiddleware
  const user = req.user;
  
  // Get business settings
  const settings = await query(
    'SELECT * FROM business_settings WHERE user_id = ?',
    [user.id]
  );
  
  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        created_at: user.created_at
      },
      settings: settings.length > 0 ? settings[0] : null
    }
  });
});

/**
 * Change password
 * PUT /api/auth/password
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;
  
  // Validate required fields
  validateRequired({ currentPassword, newPassword }, ['currentPassword', 'newPassword']);
  
  // Password validation
  if (newPassword.length < 6) {
    throw ApiError.badRequest('New password must be at least 6 characters');
  }
  
  // Get current user
  const users = await query('SELECT password_hash FROM users WHERE id = ?', [userId]);
  
  if (users.length === 0) {
    throw ApiError.notFound('User not found');
  }
  
  // Verify current password
  const isMatch = await bcrypt.compare(currentPassword, users[0].password_hash);
  
  if (!isMatch) {
    throw ApiError.unauthorized('Current password is incorrect');
  }
  
  // Hash new password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(newPassword, salt);
  
  // Update password
  await query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, userId]);
  
  res.json({
    success: true,
    message: 'Password changed successfully'
  });
});

module.exports = {
  register,
  login,
  getMe,
  changePassword
};
