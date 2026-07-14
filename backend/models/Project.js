const mongoose = require('mongoose');

const projectMilestoneSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  dueDate: Date,
  status: { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' },
  completedAt: Date
});

const projectCostSchema = new mongoose.Schema({
  category: { type: String, required: true },
  estimatedAmount: { type: Number, required: true },
  actualAmount: Number,
  vendor: String,
  note: String
});

const projectSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  category: { type: String, required: true },
  department: String,
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  status: { type: String, enum: ['planning', 'in_progress', 'completed', 'on_hold', 'cancelled'], default: 'planning' },
  startDate: Date,
  endDate: Date,
  estimatedCost: Number,
  actualCost: Number,
  milestones: [projectMilestoneSchema],
  costs: [projectCostSchema],
  assignedTeam: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  projectHead: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: String,
  attachments: [String],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);
