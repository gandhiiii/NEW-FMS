const mongoose = require('mongoose');

const lostFoundSchema = new mongoose.Schema({
  type: { type: String, enum: ['lost', 'found'], required: true },
  itemName: { type: String, required: true },
  description: String,
  location: String,
  dateFound: Date,
  dateLost: Date,
  reportedBy: String,
  reportedContact: String,
  storedLocation: String,
  status: { type: String, enum: ['pending', 'claimed', 'disposed', 'transferred'], default: 'pending' },
  claimedBy: String,
  claimedContact: String,
  claimedAt: Date,
  actionTaken: String,
  actionTakenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('LostFound', lostFoundSchema);
