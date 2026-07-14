const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  mobile: { type: String, required: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['superadmin', 'admin', 'hod', 'storekeeper', 'employee'],
    default: 'employee'
  },
  department: { type: String, default: '' },
  designation: { type: String, default: '' },
  employeeId: { type: String, unique: true },
  isActive: { type: Boolean, default: true },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  permissions: {
    inventory: { view: Boolean, create: Boolean, edit: Boolean, delete: Boolean },
    gate: { view: Boolean, approve: Boolean, create: Boolean },
    ambulance: { view: Boolean, track: Boolean, create: Boolean },
    tasks: { view: Boolean, assign: Boolean, create: Boolean },
    patients: { view: Boolean, admit: Boolean, discharge: Boolean },
    complaints: { view: Boolean, resolve: Boolean, create: Boolean },
    rooms: { view: Boolean, checklist: Boolean },
    lostfound: { view: Boolean, resolve: Boolean, create: Boolean },
    projects: { view: Boolean, create: Boolean, edit: Boolean },
    problems: { view: Boolean, resolve: Boolean, create: Boolean },
    employees: { view: Boolean, create: Boolean, edit: Boolean, delete: Boolean },
    reports: { view: Boolean }
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
