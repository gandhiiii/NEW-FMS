const express = require('express');
const router = express.Router();
const Patient = require('../models/Patient');
const { protect } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
  try {
    const { status, department, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (department) filter.department = department;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { contactNo: { $regex: search, $options: 'i' } },
        { roomNo: { $regex: search, $options: 'i' } }
      ];
    }
    const patients = await Patient.find(filter).sort({ createdAt: -1 });
    res.json(patients);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    const patient = await Patient.create({ ...req.body, createdBy: req.user._id, admissionDate: new Date() });
    res.status(201).json(patient);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', protect, async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (req.body.status === 'discharged') {
      updateData.dischargeDate = new Date();
    }
    const patient = await Patient.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json(patient);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id', protect, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    res.json(patient);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
