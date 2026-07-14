const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect, superAdminOnly } = require('../middleware/auth');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });
};

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, isActive: true });
    if (user && (await user.matchPassword(password))) {
      const token = generateToken(user._id);
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        department: user.department,
        designation: user.designation,
        employeeId: user.employeeId,
        permissions: user.permissions,
        token
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/register', protect, superAdminOnly, async (req, res) => {
  try {
    const { name, email, mobile, password, role, department, designation, permissions } = req.body;
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: 'User already exists' });
    }
    const count = await User.countDocuments();
    const employeeId = `EMP${String(count + 1).padStart(4, '0')}`;
    const user = await User.create({
      name, email, mobile, password, role, department, designation,
      employeeId, permissions, createdBy: req.user._id
    });
    res.status(201).json({ message: 'User created successfully', user: { id: user._id, name: user.name, email: user.email, role: user.role, employeeId: user.employeeId } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/reset-password', async (req, res) => {
  try {
    const { email, mobile, newPassword } = req.body;
    const user = await User.findOne({ $or: [{ email }, { mobile }] });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    if (await user.matchPassword(currentPassword)) {
      user.password = newPassword;
      await user.save();
      res.json({ message: 'Password changed successfully' });
    } else {
      res.status(400).json({ message: 'Current password is incorrect' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
