const express = require('express');
const router = express.Router();
const FloorChecklist = require('../models/FloorChecklist');
const { protect } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
  try {
    const { floor, zone, status } = req.query;
    const filter = {};
    if (floor) filter.floor = floor;
    if (zone) filter.zone = zone;
    if (status) filter.status = status;
    const checklists = await FloorChecklist.find(filter)
      .populate('assignedTo', 'name')
      .populate('completedBy', 'name')
      .sort({ createdAt: -1 });
    res.json(checklists);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    const checklist = await FloorChecklist.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json(checklist);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id/items', protect, async (req, res) => {
  try {
    const { items } = req.body;
    const checklist = await FloorChecklist.findById(req.params.id);
    if (!checklist) return res.status(404).json({ message: 'Not found' });
    checklist.items = items;
    const allOk = items.every(i => i.status === 'ok' || i.status === 'not_applicable');
    if (allOk) {
      checklist.status = 'completed';
      checklist.completedBy = req.user._id;
      checklist.completedAt = new Date();
    }
    await checklist.save();
    res.json(checklist);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', protect, async (req, res) => {
  try {
    const checklist = await FloorChecklist.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(checklist);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
