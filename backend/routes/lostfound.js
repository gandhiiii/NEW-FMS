const express = require('express');
const router = express.Router();
const LostFound = require('../models/LostFound');
const { protect } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
  try {
    const { type, status } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;
    const items = await LostFound.find(filter).sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    const item = await LostFound.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', protect, async (req, res) => {
  try {
    const item = await LostFound.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id/claim', protect, async (req, res) => {
  try {
    const { claimedBy, claimedContact } = req.body;
    const item = await LostFound.findByIdAndUpdate(req.params.id, {
      status: 'claimed', claimedBy, claimedContact, claimedAt: new Date()
    }, { new: true });
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
