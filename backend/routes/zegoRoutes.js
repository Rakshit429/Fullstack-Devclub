const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware'); // We reuse our existing protection!
const { generateZegoToken } = require('../controllers/zegoController');

// @desc    Generate a ZegoCloud Kit Token
// @route   POST /api/zegocloud/token
// @access  Private (only logged-in users can generate a token)
router.post('/token', protect, generateZegoToken);

module.exports = router;