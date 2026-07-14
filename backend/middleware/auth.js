const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        return res.status(401).json({ message: 'User not found' });
      }
      next();
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user && (req.user.role === 'superadmin' || req.user.role === 'admin')) {
    next();
  } else {
    return res.status(403).json({ message: 'Access denied. Admin only.' });
  }
};

const superAdminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'superadmin') {
    next();
  } else {
    return res.status(403).json({ message: 'Access denied. Super admin only.' });
  }
};

const checkPermission = (module, action) => {
  return (req, res, next) => {
    if (req.user.role === 'superadmin') return next();
    if (req.user.permissions && req.user.permissions[module] && req.user.permissions[module][action]) {
      return next();
    }
    return res.status(403).json({ message: `Access denied. No ${action} permission for ${module}.` });
  };
};

module.exports = { protect, adminOnly, superAdminOnly, checkPermission };
