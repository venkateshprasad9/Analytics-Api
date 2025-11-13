const App = require('../models/appModel');

/**
 * Middleware to authenticate requests using an API key.
 * It checks for an 'X-API-KEY' header.
 */
const apiKeyAuth = async (req, res, next) => {
  const apiKey = req.get('X-API-KEY'); 

  if (!apiKey) {
    return res.status(401).json({
      message: 'Access denied. Missing X-API-KEY header.',
    });
  }

  try {
    
    const app = await App.findOne({ apiKey: apiKey });

    if (!app) {
      return res.status(403).json({
        message: 'Forbidden. Invalid API Key.',
      });
    }

    // Check if the key is revoked
    if (app.status === 'revoked') {
      return res.status(403).json({
        message: 'Forbidden. API Key has been revoked.',
      });
    }

    // Check for expiration (if the feature is used)
    if (app.expiresAt && app.expiresAt < new Date()) {
      return res.status(403).json({
        message: 'Forbidden. API Key has expired.',
      });
    }

    // --- Success ---
  
    req.appId = app._id;

    next(); 
  } catch (error) {
    console.error('Error in apiKeyAuth middleware:', error);
    res.status(500).json({ message: 'Server error during API key validation.' });
  }
};

module.exports = apiKeyAuth;