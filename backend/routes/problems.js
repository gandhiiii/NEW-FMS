const express = require('express');
const router = express.Router();
const ProblemSolution = require('../models/ProblemSolution');
const { protect } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
  try {
    const { status, category, department } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (department) filter.department = department;
    const problems = await ProblemSolution.find(filter)
      .populate('reportedBy', 'name')
      .populate('assignedTo', 'name')
      .populate('resolvedBy', 'name')
      .sort({ createdAt: -1 });
    res.json(problems);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    const problem = await ProblemSolution.create({ ...req.body, reportedBy: req.user._id });
    res.status(201).json(problem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', protect, async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (req.body.status === 'resolved') {
      updateData.resolvedBy = req.user._id;
      updateData.resolvedAt = new Date();
    }
    const problem = await ProblemSolution.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json(problem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
