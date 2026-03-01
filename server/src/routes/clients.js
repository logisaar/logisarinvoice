const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware');
const {
  getClients,
  getClient,
  createClient,
  updateClient,
  deleteClient
} = require('../controllers/clientsController');

// All routes are protected
router.use(authMiddleware);

router.get('/', getClients);
router.post('/', createClient);
router.get('/:id', getClient);
router.put('/:id', updateClient);
router.delete('/:id', deleteClient);

module.exports = router;
