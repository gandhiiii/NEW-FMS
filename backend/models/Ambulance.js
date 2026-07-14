const mongoose = require('mongoose');

const ambulanceSchema = new mongoose.Schema({
  vehicleNo: { type: String, required: true, unique: true },
  driverName: { type: String, required: true },
  driverContact: String,
  attendantName: String,
  attendantContact: String,
  ambulanceType: { type: String, enum: ['basic', 'advanced', 'icu'], default: 'basic' },
  status: { type: String, enum: ['available', 'on_duty', 'maintenance', 'offline'], default: 'available' },
  currentLocation: {
    lat: { type: Number, default: 0 },
    lng: { type: Number, default: 0 },
    address: String,
    updatedAt: Date
  },
  destination: {
    lat: Number,
    lng: Number,
    address: String
  },
  hospital: String,
  patientName: String,
  patientCondition: String,
  departureTime: Date,
  estimatedArrival: Date,
  speed: { type: Number, default: 0 },
  lastMaintenance: Date,
  nextMaintenance: Date,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Ambulance', ambulanceSchema);
