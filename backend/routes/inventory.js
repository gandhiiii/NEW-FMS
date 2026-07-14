const express = require('express');
const router = express.Router();
const Inventory = require('../models/Inventory');
const { protect, checkPermission } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
  try {
    const { category, status, department, search } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (department) filter.department = department;
    if (search) filter.name = { $regex: search, $options: 'i' };
    const items = await Inventory.find(filter).sort({ createdAt: -1 }).populate('transactions.createdBy', 'name');
    items.forEach(item => {
      item.lifecycleBar = item.calculateLifecycle();
    });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', protect, checkPermission('inventory', 'create'), async (req, res) => {
  try {
    const item = await Inventory.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', protect, checkPermission('inventory', 'edit'), async (req, res) => {
  try {
    const item = await Inventory.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', protect, checkPermission('inventory', 'delete'), async (req, res) => {
  try {
    await Inventory.findByIdAndDelete(req.params.id);
    res.json({ message: 'Item deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/:id/transaction', protect, async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    const { type, quantity, personName, department, note } = req.body;
    const change = type === 'in' ? quantity : -quantity;
    item.quantity += change;
    item.transactions.push({ type, quantity, personName, department, note, createdBy: req.user._id });
    await item.save();
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/stats', protect, async (req, res) => {
  try {
    const total = await Inventory.countDocuments();
    const active = await Inventory.countDocuments({ status: 'active' });
    const expired = await Inventory.countDocuments({ status: 'expired' });
    const lowStock = await Inventory.countDocuments({ quantity: { $lte: 5 } });
    const totalValue = await Inventory.aggregate([
      { $group: { _id: null, total: { $sum: { $multiply: ['$quantity', '$purchasePrice'] } } } }
    ]);
    const categoryWise = await Inventory.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);
    res.json({ total, active, expired, lowStock, totalValue: totalValue[0]?.total || 0, categoryWise });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
