const mongoose = require('mongoose');

const floorChecklistSchema = new mongoose.Schema({
  floor: { type: String, required: true },
  zone: { type: String, required: true },
  items: [{
    name: String,
    category: String,
    status: { type: String, enum: ['ok', 'not_ok', 'not_applicable'], default: 'ok' },
    note: String,
    checkedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    checkedAt: { type: Date, default: Date.now }
  }],
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' },
  completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  completedAt: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('FloorChecklist', floorChecklistSchema);
