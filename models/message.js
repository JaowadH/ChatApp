const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender:       { type: String, required: true },
  userId:       { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  content:      { type: String, required: true },
  timestamp:    { type: Date,   default: Date.now },
  readBy:       { type: [String], default: [] }  // usernames who have read this message
});

module.exports = mongoose.model('Message', messageSchema);
