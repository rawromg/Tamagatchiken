const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const router = express.Router();

// Signup
router.post('/signup', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('🔐 Signup attempt failed - validation errors:', JSON.stringify({
        timestamp: new Date().toISOString(),
        email: req.body.email,
        errors: errors.array()
      }));
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      console.log('🔐 Signup attempt failed - user already exists:', JSON.stringify({
        timestamp: new Date().toISOString(),
        email: email,
        ip: req.ip
      }));
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Create new user
    const user = await User.create(email, password);
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    
    console.log('🔐 New user signed up successfully:', JSON.stringify({
      timestamp: new Date().toISOString(),
      userId: user.id,
      email: user.email,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    }));
    
    res.status(201).json({
      message: 'User created successfully',
      user: { id: user.id, email: user.email },
      token
    });
  } catch (error) {
    console.error('🔐 Signup error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').exists()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('🔐 Login attempt failed - validation errors:', JSON.stringify({
        timestamp: new Date().toISOString(),
        email: req.body.email,
        errors: errors.array()
      }));
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    
    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
      console.log('🔐 Login attempt failed - user not found:', JSON.stringify({
        timestamp: new Date().toISOString(),
        email: email,
        ip: req.ip
      }));
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    // Verify password
    const isValidPassword = await User.verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      console.log('🔐 Login attempt failed - invalid password:', JSON.stringify({
        timestamp: new Date().toISOString(),
        email: email,
        userId: user.id,
        ip: req.ip
      }));
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    
    console.log('🔐 User logged in successfully:', JSON.stringify({
      timestamp: new Date().toISOString(),
      userId: user.id,
      email: user.email,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    }));
    
    res.json({
      message: 'Login successful',
      user: { id: user.id, email: user.email },
      token
    });
  } catch (error) {
    console.error('🔐 Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Logout (client-side token removal)
router.get('/logout', (req, res) => {
  res.json({ message: 'Logout successful' });
});

module.exports = router; 