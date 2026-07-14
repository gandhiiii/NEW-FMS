const mongoose = require('mongoose');

const gateEntrySchema = new mongoose.Schema({
  type: { type: String, enum: ['goods_in', 'goods_out', 'visitor', 'staff', 'vendor'], required: true },
  personName: { type: String, required: true },
  companyName: String,
  contactNo: String,
  vehicleNo: String,
  purpose: String,
  items: [{
    name: String,
    quantity: Number,
    description: String
  }],
  inTime: { type: Date, default: Date.now },
  outTime: Date,
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'completed'], default: 'pending' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvalNote: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  gatePassNo: { type: String, unique: true }
}, { timestamps: true });

module.exports = mongoose.model('GateEntry', gateEntrySchema);
