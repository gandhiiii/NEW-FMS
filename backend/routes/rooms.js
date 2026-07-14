const express = require('express');
const router = express.Router();
const RoomChecklist = require('../models/RoomChecklist');
const { protect } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
  try {
    const { roomNo, status, checklistType } = req.query;
    const filter = {};
    if (roomNo) filter.roomNo = roomNo;
    if (status) filter.status = status;
    if (checklistType) filter.checklistType = checklistType;
    const checklists = await RoomChecklist.find(filter)
      .populate('items.checkedBy', 'name')
      .populate('completedBy', 'name')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });
    res.json(checklists);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    const checklist = await RoomChecklist.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json(checklist);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id/items', protect, async (req, res) => {
  try {
    const { items } = req.body;
    const checklist = await RoomChecklist.findById(req.params.id);
    if (!checklist) return res.status(404).json({ message: 'Checklist not found' });
    items.forEach(updateItem => {
      const item = checklist.items.id(updateItem._id);
      if (item) {
        item.isChecked = updateItem.isChecked;
        item.note = updateItem.note;
        item.checkedBy = req.user._id;
      }
    });
    const allChecked = checklist.items.every(i => i.isChecked);
    if (allChecked) {
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
    const checklist = await RoomChecklist.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(checklist);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
