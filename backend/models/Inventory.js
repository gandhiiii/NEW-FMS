const mongoose = require('mongoose');

const inventoryTransactionSchema = new mongoose.Schema({
  type: { type: String, enum: ['in', 'out'], required: true },
  quantity: { type: Number, required: true },
  referenceNo: String,
  personName: String,
  department: String,
  note: String,
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const inventorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  subCategory: String,
  brand: String,
  model: String,
  serialNumber: String,
  quantity: { type: Number, default: 0 },
  unit: { type: String, default: 'pcs' },
  location: String,
  department: String,
  purchaseDate: Date,
  purchasePrice: Number,
  supplier: String,
  warrantyExpiry: Date,
  expiryDate: Date,
  lifecycleYears: Number,
  lifecycleBar: { type: Number, default: 100 },
  status: { type: String, enum: ['active', 'expired', 'damaged', 'disposed'], default: 'active' },
  image: String,
  documents: [String],
  transactions: [inventoryTransactionSchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

inventorySchema.methods.calculateLifecycle = function () {
  if (!this.lifecycleYears || !this.purchaseDate) return 100;
  const now = new Date();
  const purchase = new Date(this.purchaseDate);
  const endDate = new Date(purchase);
  endDate.setFullYear(endDate.getFullYear() + this.lifecycleYears);
  const totalMs = endDate - purchase;
  const elapsedMs = now - purchase;
  const remaining = Math.max(0, ((totalMs - elapsedMs) / totalMs) * 100);
  return Math.round(remaining);
};

module.exports = mongoose.model('Inventory', inventorySchema);
