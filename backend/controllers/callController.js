const CallHistory = require('../models/callHistory');

// @desc    Log a new call to the history
// @route   POST /api/calls/log
// @access  Private
const logCall = async (req, res) => {
  try {
    const { participants, initiator, callType, status, startTime, endTime, duration } = req.body;

    // Basic validation
    if (!participants || !initiator || !callType || !status || !startTime) {
      return res.status(400).json({ message: 'Missing required fields for call log' });
    }

    const newLog = new CallHistory({
      participants,
      initiator,
      callType,
      status,
      startTime,
      endTime,
      duration,
    });

    await newLog.save();
    res.status(201).json({ message: 'Call logged successfully' });

  } catch (error) {
    console.error('Error logging call:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get call history for the logged-in user
// @route   GET /api/calls
// @access  Private
const getCallHistory = async (req, res) => {
  try {
    const callLogs = await CallHistory.find({ participants: req.user._id })
      .sort({ startTime: -1 }) // Sort by most recent first
      .populate('participants', 'username email _id') // Populate with participant details
      .populate('initiator', 'username'); // Populate with initiator's name

    res.status(200).json(callLogs);

  } catch (error) {
    console.error('Error fetching call history:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = { logCall, getCallHistory };