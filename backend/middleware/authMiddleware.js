const jwt = require('jsonwebtoken');
const User = require('../models/user');

const protect = async (req, res, next) => {
  let token;

  // Read the JWT from the 'token' cookie
  if (req.cookies.token) {
    try {
      token = req.cookies.token;
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Attach user to the request, excluding the password
      req.user = await User.findById(decoded.id).select('-password');
      
      next();
    } catch (error) {
      console.error('Token verification failed:', error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

module.exports = { protect };