const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const apiKeyMiddleware = require('../middlewares/apiKeyMiddleware');
const validator = require('../middlewares/validatorMiddleware');
const {
  collectSchema,
  summarySchema,
  userStatsSchema,
} = require('../utils/validators');
const isAuth = require('../middlewares/authMiddleware');

// --- Event Data Collection ---
router.post(
  '/collect',
  apiKeyMiddleware,
  validator(collectSchema),
  analyticsController.collectEvent
);

// --- Analytics & Reporting ---
router.get(
  '/event-summary',
  isAuth,
  validator(summarySchema, 'query'),
  analyticsController.getEventSummary
);

router.get(
  '/user-stats',
  isAuth,
  validator(userStatsSchema, 'query'),
  analyticsController.getUserStats
);

module.exports = router;