const mongoose = require('mongoose');

const checklistItemSchema = new mongoose.Schema({
  item: { type: String, required: true },
  category: String,
  isChecked: { type: Boolean, default: false },
  note: String,
  checkedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const roomChecklistSchema = new mongoose.Schema({
  roomNo: { type: String, required: true },
  floor: String,
  department: String,
  checklistType: { type: String, enum: ['pre_admission', 'post_discharge', 'daily', 'weekly', 'monthly'], required: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  items: [checklistItemSchema],
  status: { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' },
  completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  completedAt: Date,
  note: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('RoomChecklist', roomChecklistSchema);
