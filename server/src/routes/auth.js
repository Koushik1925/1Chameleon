const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Log = require('../models/Log');

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const adminUser = process.env.ADMIN_USERNAME || 'rithvik4774';
  const adminPass = process.env.ADMIN_PASSWORD || 'admin_password_secure_9988';
  const jwtSecret = process.env.JWT_SECRET || 'super_secret_jwt_key_12345';

  if (username === adminUser && password === adminPass) {
    // Generate JWT token
    const token = jwt.sign(
      { username, role: 'admin' }, 
      jwtSecret,
      { expiresIn: '24h' }
    );

    await Log.create({
      eventType: 'Admin Login',
      description: `Admin user '${username}' successfully logged in.`,
      severity: 'info'
    });

    return res.json({ token, username });
  }

  // Failed login tracking
  await Log.create({
    eventType: 'Failed Login Attempt',
    description: `Failed login attempt for username: '${username || 'empty'}' from IP: ${req.ip}`,
    severity: 'warning'
  });

  res.status(401).json({ error: 'Invalid username or password' });
});

module.exports = router;
