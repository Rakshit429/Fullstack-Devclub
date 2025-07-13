const mongoose = require('mongoose');

const callHistorySchema = new mongoose.Schema(
  {
    // An array containing the MongoDB _id of the two participants
    participants: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // This creates a reference to our existing User model
      required: true,
    }],
    // The MongoDB _id of the user who initiated the call
    initiator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    callType: {
      type: String,
      enum: ['audio', 'video'], // Can only be one of these values
      required: true,
    },
    status: {
      type: String,
      enum: ['completed', 'missed', 'declined', 'cancelled'], // Possible call outcomes
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
    },
    // Duration in seconds
    duration: {
      type: Number, // Stored in seconds
      default: 0,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

const CallHistory = mongoose.model('CallHistory', callHistorySchema);
module.exports = CallHistory;