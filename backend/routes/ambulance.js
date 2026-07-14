const express = require('express');
const router = express.Router();
const Ambulance = require('../models/Ambulance');
const { protect } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const ambulances = await Ambulance.find(filter).sort({ createdAt: -1 });
    res.json(ambulances);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    const ambulance = await Ambulance.create(req.body);
    res.status(201).json(ambulance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id/location', protect, async (req, res) => {
  try {
    const { lat, lng, address } = req.body;
    const ambulance = await Ambulance.findByIdAndUpdate(req.params.id, {
      currentLocation: { lat, lng, address, updatedAt: new Date() }
    }, { new: true });
    res.json(ambulance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id/dispatch', protect, async (req, res) => {
  try {
    const { destination, patientName, patientCondition } = req.body;
    const ambulance = await Ambulance.findByIdAndUpdate(req.params.id, {
      status: 'on_duty',
      destination,
      patientName,
      patientCondition,
      departureTime: new Date()
    }, { new: true });
    res.json(ambulance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id/complete', protect, async (req, res) => {
  try {
    const ambulance = await Ambulance.findByIdAndUpdate(req.params.id, {
      status: 'available',
      patientName: '',
      patientCondition: '',
      destination: {},
      currentLocation: { lat: 0, lng: 0 }
    }, { new: true });
    res.json(ambulance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', protect, async (req, res) => {
  try {
    const ambulance = await Ambulance.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(ambulance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
