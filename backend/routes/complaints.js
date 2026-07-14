const express = require('express');
const router = express.Router();
const Complaint = require('../models/Complaint');
const { protect } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
  try {
    const { status, priority } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    const complaints = await Complaint.find(filter)
      .populate('assignedTo', 'name')
      .populate('resolvedBy', 'name')
      .sort({ createdAt: -1 });
    res.json(complaints);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    const complaint = await Complaint.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json(complaint);
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
    const complaint = await Complaint.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json(complaint);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    await Complaint.findByIdAndDelete(req.params.id);
    res.json({ message: 'Complaint deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
