const { query } = require('../config/db');
const { asyncHandler, ApiError } = require('../middleware');

/**
 * Get business settings for current user
 * GET /api/settings
 */
const getSettings = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  const settings = await query(
    'SELECT * FROM business_settings WHERE user_id = ?',
    [userId]
  );
  
  if (settings.length === 0) {
    // Return default settings if none exist
    res.json({
      success: true,
      data: {
        business_name: '',
        business_address: '',
        gst_number: '',
        logo_url: '',
        email: req.user.email,
        phone: '',
        invoice_prefix: 'INV',
        default_notes: '',
        default_terms: ''
      }
    });
  } else {
    res.json({
      success: true,
      data: settings[0]
    });
  }
});

/**
 * Update business settings
 * PUT /api/settings
 */
const updateSettings = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const {
    business_name,
    business_address,
    gst_number,
    logo_url,
    email,
    phone,
    invoice_prefix,
    default_notes,
    default_terms
  } = req.body;
  
  // Check if settings exist
  const existing = await query(
    'SELECT id FROM business_settings WHERE user_id = ?',
    [userId]
  );
  
  if (existing.length === 0) {
    // Create new settings
    await query(
      `INSERT INTO business_settings 
       (user_id, business_name, business_address, gst_number, logo_url, email, phone, invoice_prefix, default_notes, default_terms)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, business_name, business_address, gst_number, logo_url, email, phone, invoice_prefix || 'INV', default_notes, default_terms]
    );
  } else {
    // Update existing settings
    await query(
      `UPDATE business_settings SET
        business_name = COALESCE(?, business_name),
        business_address = COALESCE(?, business_address),
        gst_number = COALESCE(?, gst_number),
        logo_url = COALESCE(?, logo_url),
        email = COALESCE(?, email),
        phone = COALESCE(?, phone),
        invoice_prefix = COALESCE(?, invoice_prefix),
        default_notes = COALESCE(?, default_notes),
        default_terms = COALESCE(?, default_terms),
        updated_at = NOW()
       WHERE user_id = ?`,
      [business_name, business_address, gst_number, logo_url, email, phone, invoice_prefix, default_notes, default_terms, userId]
    );
  }
  
  // Fetch updated settings
  const settings = await query(
    'SELECT * FROM business_settings WHERE user_id = ?',
    [userId]
  );
  
  res.json({
    success: true,
    message: 'Settings updated successfully',
    data: settings[0]
  });
});

module.exports = {
  getSettings,
  updateSettings
};
