// routes/authRoutes.js

const express = require('express');
const passport = require('passport');
const router = express.Router();
const authController = require('../controllers/authController');
const isAuth = require('../middlewares/authMiddleware');

// --- Google OAuth Routes ---
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/login-failed',
    successRedirect: '/api/auth/status', 
  }),
  (req, res) => {
    res.json({
      message: 'Login successful',
      user: req.user,
    });
  }
);

router.get('/status', isAuth, authController.getUserStatus);
router.get('/logout', authController.logoutUser);

// --- API Key Management Routes ---
router.post('/register', isAuth, authController.registerApp);
router.get('/api-key', isAuth, authController.getApiKeys);
router.post('/revoke', isAuth, authController.revokeApiKey);
router.post('/regenerate', isAuth, authController.regenerateApiKey);

module.exports = router;