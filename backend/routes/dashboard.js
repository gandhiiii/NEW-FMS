const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const Patient = require('../models/Patient');
const Inventory = require('../models/Inventory');
const Task = require('../models/Task');
const Complaint = require('../models/Complaint');
const Ambulance = require('../models/Ambulance');
const GateEntry = require('../models/GateEntry');
const LostFound = require('../models/LostFound');
const Project = require('../models/Project');
const ProblemSolution = require('../models/ProblemSolution');

router.get('/', protect, async (req, res) => {
  try {
    const [
      totalPatients, admittedPatients, dischargedPatients,
      totalInventory, lowStockItems, expiringItems,
      pendingTasks, inProgressTasks,
      pendingComplaints, resolvedComplaints,
      availableAmbulances, onDutyAmbulances,
      pendingGateEntries, approvedGateEntries,
      activeProjects, planningProjects,
      pendingProblems, resolvedProblems,
      totalUsers, pendingLostFound
    ] = await Promise.all([
      Patient.countDocuments(),
      Patient.countDocuments({ status: 'admitted' }),
      Patient.countDocuments({ status: 'discharged' }),
      Inventory.countDocuments(),
      Inventory.countDocuments({ quantity: { $lte: 5 } }),
      Inventory.countDocuments({ expiryDate: { $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), $gte: new Date() } }),
      Task.countDocuments({ status: 'pending' }),
      Task.countDocuments({ status: 'in_progress' }),
      Complaint.countDocuments({ status: 'pending' }),
      Complaint.countDocuments({ status: 'resolved' }),
      Ambulance.countDocuments({ status: 'available' }),
      Ambulance.countDocuments({ status: 'on_duty' }),
      GateEntry.countDocuments({ status: 'pending' }),
      GateEntry.countDocuments({ status: 'approved' }),
      Project.countDocuments({ status: 'in_progress' }),
      Project.countDocuments({ status: 'planning' }),
      ProblemSolution.countDocuments({ status: 'reported' }),
      ProblemSolution.countDocuments({ status: 'resolved' }),
      User.countDocuments(),
      LostFound.countDocuments({ status: 'pending' })
    ]);

    res.json({
      patients: { total: totalPatients, admitted: admittedPatients, discharged: dischargedPatients },
      inventory: { total: totalInventory, lowStock: lowStockItems, expiringSoon: expiringItems },
      tasks: { pending: pendingTasks, inProgress: inProgressTasks },
      complaints: { pending: pendingComplaints, resolved: resolvedComplaints },
      ambulances: { available: availableAmbulances, onDuty: onDutyAmbulances },
      gate: { pending: pendingGateEntries, approved: approvedGateEntries },
      projects: { active: activeProjects, planning: planningProjects },
      problems: { pending: pendingProblems, resolved: resolvedProblems },
      users: totalUsers,
      lostFound: pendingLostFound
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
