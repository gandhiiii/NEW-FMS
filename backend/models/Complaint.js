const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  patientName: { type: String, required: true },
  roomNo: String,
  complaintType: { type: String, enum: ['service', 'facility', 'staff', 'billing', 'other'], required: true },
  description: { type: String, required: true },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  status: { type: String, enum: ['pending', 'in_progress', 'resolved', 'closed'], default: 'pending' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolution: String,
  resolvedAt: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Complaint', complaintSchema);
