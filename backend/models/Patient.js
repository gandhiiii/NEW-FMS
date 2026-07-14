const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: Number,
  gender: { type: String, enum: ['male', 'female', 'other'] },
  contactNo: String,
  emergencyContact: String,
  address: String,
  bloodGroup: String,
  aadharNo: String,
  admissionDate: { type: Date },
  dischargeDate: Date,
  admissionTime: String,
  dischargeTime: String,
  admissionType: { type: String, enum: ['emergency', 'regular', 'referral'] },
  department: String,
  wardNo: String,
  roomNo: String,
  bedNo: String,
  doctorAssigned: String,
  diagnosis: String,
  symptoms: String,
  treatmentPlan: String,
  status: { type: String, enum: ['admitted', 'discharged', 'transferred'], default: 'admitted' },
  isInsured: { type: Boolean, default: false },
  insuranceProvider: String,
  insuranceNo: String,
  dischargeSummary: String,
  referredBy: String,
  referredTo: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Patient', patientSchema);
