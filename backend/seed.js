const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Department = require('./models/Department');

dotenv.config();

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const existing = await User.findOne({ email: 'admin@hospital.com' });
    if (existing) {
      console.log('Super admin already exists');
      process.exit(0);
    }

    await User.create({
      name: 'Super Admin',
      email: 'admin@hospital.com',
      mobile: '9999999999',
      password: 'admin123',
      role: 'superadmin',
      employeeId: 'EMP0001',
      designation: 'System Administrator',
      isActive: true
    });

    await Department.create([
      { name: 'Emergency', category: 'Clinical', floor: 'Ground' },
      { name: 'Radiology', category: 'Clinical', floor: '1st' },
      { name: 'OPD', category: 'Clinical', floor: '2nd' },
      { name: 'Operation Theatre', category: 'Clinical', floor: '3rd' },
      { name: 'IPD', category: 'Clinical', floor: '4th-6th' },
      { name: 'Pharmacy', category: 'Support', floor: 'Ground' },
      { name: 'Laboratory', category: 'Support', floor: '2nd' },
      { name: 'Administration', category: 'Administrative', floor: '1st' },
      { name: 'Engineering', category: 'Support', floor: 'B-1' },
      { name: 'Housekeeping', category: 'Support', floor: 'All' }
    ]);

    console.log('Seed data created successfully!');
    console.log('Super Admin Login:');
    console.log('  Email: admin@hospital.com');
    console.log('  Password: admin123');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seed();
