const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const { protect, checkPermission } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
  try {
    const { status, category } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    const projects = await Project.find(filter)
      .populate('projectHead', 'name')
      .populate('assignedTeam', 'name')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', protect, checkPermission('projects', 'create'), async (req, res) => {
  try {
    const project = await Project.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', protect, checkPermission('projects', 'edit'), async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id/milestone', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    project.milestones.push(req.body);
    await project.save();
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id/cost', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    project.costs.push(req.body);
    project.actualCost = project.costs.reduce((sum, c) => sum + (c.actualAmount || 0), 0);
    await project.save();
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('projectHead', 'name')
      .populate('assignedTeam', 'name');
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
