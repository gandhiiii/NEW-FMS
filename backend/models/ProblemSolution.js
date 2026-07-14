const mongoose = require('mongoose');

const problemSolutionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  department: String,
  location: String,
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  status: { type: String, enum: ['reported', 'reviewing', 'in_progress', 'resolved', 'closed'], default: 'reported' },
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  solution: String,
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: Date,
  rootCause: String,
  preventiveMeasures: String,
  attachments: [String]
}, { timestamps: true });

module.exports = mongoose.model('ProblemSolution', problemSolutionSchema);
