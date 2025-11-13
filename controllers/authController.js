const { v4: uuidv4 } = require('uuid'); 
const User = require('../models/userModel');
const App = require('../models/appModel');

// --- Google Auth Handlers ---

/**
 * @desc Get the status of the currently logged-in user
 * @route GET /api/auth/status
 * @access Private (requires isAuth middleware)
 */
exports.getUserStatus = (req, res) => {
  
  res.status(200).json({
    message: 'User is logged in.',
    user: {
      id: req.user._id,
      displayName: req.user.displayName,
      email: req.user.email,
    },
  });
};

/**
 * @desc Log out the user by destroying the session
 * @route GET /api/auth/logout
 * @access Public
 */
exports.logoutUser = (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    // Destroy the session
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: 'Failed to destroy session.' });
      }
      // Clear the session cookie
      res.clearCookie('connect.sid'); 
      res.status(200).json({ message: 'Successfully logged out.' });
    });
  });
};

// --- API Key Management Handlers ---

/**
 * @desc Register a new app/website for the logged-in user
 * @route POST /api/auth/register
 * @access Private
 * @body { name: "My Website", url: "https://mywebsite.com" }
 */
exports.registerApp = async (req, res) => {
  try {
    const { name, url } = req.body;
    const userId = req.user._id; 

    if (!name || !url) {
      return res
        .status(400)
        .json({ message: 'App name and URL are required.' });
    }

    // Generate a new, unique API key
    const apiKey = `key_${uuidv4()}`;

    const newApp = new App({
      owner: userId,
      name,
      url,
      apiKey,
      status: 'active',
    });

    await newApp.save();

    res.status(201).json({
      message: 'App registered successfully.',
      app: {
        id: newApp._id,
        name: newApp.name,
        url: newApp.url,
        apiKey: newApp.apiKey,
        status: newApp.status,
      },
    });
  } catch (error) {
    console.error('Error in registerApp:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'API Key conflict, try again.' });
    }
    res.status(500).json({ message: 'Server error during app registration.' });
  }
};

/**
 * @desc Get all API keys (apps) for the logged-in user
 * @route GET /api/auth/api-key
 * @access Private
 */
exports.getApiKeys = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find all apps registered by this user
    const apps = await App.find({ owner: userId }).select(
      '-__v -owner' 
    );

    if (!apps || apps.length === 0) {
      return res.status(404).json({ message: 'No apps found for this user.' });
    }

    res.status(200).json(apps);
  } catch (error) {
    console.error('Error in getApiKeys:', error);
    res.status(500).json({ message: 'Server error retrieving API keys.' });
  }
};

/**
 * @desc Revoke an API key
 * @route POST /api/auth/revoke
 * @access Private
 * @body { appId: "mongo_id_of_app" }
 */
exports.revokeApiKey = async (req, res) => {
  try {
    const { appId } = req.body;
    const userId = req.user._id;

    if (!appId) {
      return res.status(400).json({ message: 'App ID is required.' });
    }

    // Find the app, ensuring it belongs to the logged-in user
    const app = await App.findOne({ _id: appId, owner: userId });

    if (!app) {
      return res
        .status(404)
        .json({ message: 'App not found or you do not have permission.' });
    }

    if (app.status === 'revoked') {
      return res.status(400).json({ message: 'API key is already revoked.' });
    }

    // Revoke the key
    app.status = 'revoked';
    await app.save();

    res.status(200).json({
      message: 'API key has been successfully revoked.',
      appId: app._id,
      status: app.status,
    });
  } catch (error) {
    console.error('Error in revokeApiKey:', error);
    res.status(500).json({ message: 'Server error revoking API key.' });
  }
};

/**
 * @desc Regenerate an API key
 * @route POST /api/auth/regenerate
 * @access Private
 * @body { appId: "mongo_id_of_app" }
 */
exports.regenerateApiKey = async (req, res) => {
  try {
    const { appId } = req.body;
    const userId = req.user._id;

    if (!appId) {
      return res.status(400).json({ message: 'App ID is required.' });
    }

    const app = await App.findOne({ _id: appId, owner: userId });

    if (!app) {
      return res
        .status(404)
        .json({ message: 'App not found or you do not have permission.' });
    }

    // Generate new key
    const newApiKey = `key_${uuidv4()}`;
    app.apiKey = newApiKey;
    app.status = 'active'; // Ensure it's active

    await app.save();

    res.status(200).json({
      message: 'API key has been successfully regenerated.',
      appId: app._id,
      newApiKey: app.apiKey,
      status: app.status,
    });
  } catch (error) {
    console.error('Error in regenerateApiKey:', error);
    res.status(500).json({ message: 'Server error regenerating API key.' });
  }
};