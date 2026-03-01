const { query } = require('../config/db');
const { asyncHandler, ApiError } = require('../middleware');
const { validateRequired, sanitizeString, parsePagination } = require('../utils');

/**
 * Get all clients for current user
 * GET /api/clients
 */
const getClients = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { search } = req.query;
  const { page, limit, offset } = parsePagination(req.query);
  
  let whereClause = 'WHERE user_id = ?';
  const params = [userId];
  
  if (search) {
    whereClause += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam, searchParam);
  }
  
  // Get total count
  const countResult = await query(
    `SELECT COUNT(*) as total FROM clients ${whereClause}`,
    params
  );
  const total = countResult[0].total;
  
  // Get clients
  const clients = await query(
    `SELECT * FROM clients ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  
  res.json({
    success: true,
    data: {
      clients,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  });
});

/**
 * Get single client with invoice history
 * GET /api/clients/:id
 */
const getClient = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  
  // Get client
  const clients = await query(
    'SELECT * FROM clients WHERE id = ? AND user_id = ?',
    [id, userId]
  );
  
  if (clients.length === 0) {
    throw ApiError.notFound('Client not found');
  }
  
  const client = clients[0];
  
  // Get client's invoices
  const invoices = await query(
    `SELECT id, invoice_number, invoice_date, due_date, grand_total, status, created_at
     FROM invoices 
     WHERE client_id = ? 
     ORDER BY created_at DESC`,
    [id]
  );
  
  // Calculate client statistics
  const stats = await query(
    `SELECT 
      COUNT(*) as total_invoices,
      SUM(CASE WHEN status = 'paid' THEN grand_total ELSE 0 END) as total_paid,
      SUM(CASE WHEN status IN ('draft', 'sent') THEN grand_total ELSE 0 END) as total_pending
     FROM invoices 
     WHERE client_id = ?`,
    [id]
  );
  
  res.json({
    success: true,
    data: {
      client,
      invoices,
      statistics: {
        totalInvoices: parseInt(stats[0].total_invoices) || 0,
        totalPaid: parseFloat(stats[0].total_paid) || 0,
        totalPending: parseFloat(stats[0].total_pending) || 0
      }
    }
  });
});

/**
 * Create new client
 * POST /api/clients
 */
const createClient = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { name, email, phone, address, gst_number } = req.body;
  
  // Validate required fields
  validateRequired({ name }, ['name']);
  
  // Check for duplicate email
  if (email) {
    const existing = await query(
      'SELECT id FROM clients WHERE user_id = ? AND email = ?',
      [userId, email]
    );
    
    if (existing.length > 0) {
      throw ApiError.conflict('Client with this email already exists');
    }
  }
  
  // Create client
  const result = await query(
    `INSERT INTO clients (user_id, name, email, phone, address, gst_number)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, sanitizeString(name), email || null, phone || null, address || null, gst_number || null]
  );
  
  // Fetch created client
  const clients = await query('SELECT * FROM clients WHERE id = ?', [result.insertId]);
  
  res.status(201).json({
    success: true,
    message: 'Client created successfully',
    data: clients[0]
  });
});

/**
 * Update client
 * PUT /api/clients/:id
 */
const updateClient = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { name, email, phone, address, gst_number } = req.body;
  
  // Check client exists
  const existing = await query(
    'SELECT id FROM clients WHERE id = ? AND user_id = ?',
    [id, userId]
  );
  
  if (existing.length === 0) {
    throw ApiError.notFound('Client not found');
  }
  
  // Check for duplicate email
  if (email) {
    const duplicate = await query(
      'SELECT id FROM clients WHERE user_id = ? AND email = ? AND id != ?',
      [userId, email, id]
    );
    
    if (duplicate.length > 0) {
      throw ApiError.conflict('Another client with this email already exists');
    }
  }
  
  // Update client
  await query(
    `UPDATE clients SET
      name = COALESCE(?, name),
      email = COALESCE(?, email),
      phone = COALESCE(?, phone),
      address = COALESCE(?, address),
      gst_number = COALESCE(?, gst_number),
      updated_at = NOW()
     WHERE id = ?`,
    [name ? sanitizeString(name) : null, email, phone, address, gst_number, id]
  );
  
  // Fetch updated client
  const clients = await query('SELECT * FROM clients WHERE id = ?', [id]);
  
  res.json({
    success: true,
    message: 'Client updated successfully',
    data: clients[0]
  });
});

/**
 * Delete client
 * DELETE /api/clients/:id
 */
const deleteClient = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  
  // Check client exists
  const existing = await query(
    'SELECT id FROM clients WHERE id = ? AND user_id = ?',
    [id, userId]
  );
  
  if (existing.length === 0) {
    throw ApiError.notFound('Client not found');
  }
  
  // Check if client has invoices
  const invoices = await query(
    'SELECT COUNT(*) as count FROM invoices WHERE client_id = ?',
    [id]
  );
  
  if (invoices[0].count > 0) {
    throw ApiError.badRequest('Cannot delete client with existing invoices');
  }
  
  // Delete client
  await query('DELETE FROM clients WHERE id = ?', [id]);
  
  res.json({
    success: true,
    message: 'Client deleted successfully'
  });
});

module.exports = {
  getClients,
  getClient,
  createClient,
  updateClient,
  deleteClient
};
