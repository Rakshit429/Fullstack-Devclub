const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { logCall, getCallHistory } = require('../controllers/callController');

// All routes in this file are protected
router.use(protect);

router.route('/')
  .get(getCallHistory); // GET /api/calls

router.route('/log')
  .post(logCall); // POST /api/calls/log

module.exports = router;