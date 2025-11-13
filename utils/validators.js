
const Joi = require('joi');

// Joi schema for the /collect endpoint body
const collectSchema = Joi.object({
  event: Joi.string().min(1).max(100).required(),
  url: Joi.string().uri().allow(null, ''),
  referrer: Joi.string().uri().allow(null, ''),
  device: Joi.string().max(50).allow(null, ''),
  ipAddress: Joi.string().ip({ version: ['ipv4', 'ipv6'] }).allow(null, ''),
  timestamp: Joi.date().iso().optional(), // The brief example had this, but our model uses `createdAt`
  userId: Joi.string().min(1).max(256).allow(null, ''), // For /user-stats
  metadata: Joi.object({
    browser: Joi.string().max(100),
    os: Joi.string().max(100),
    screenSize: Joi.string().max(50),
  }).optional(),
});

// Joi schema for the /event-summary endpoint query
const summarySchema = Joi.object({
  event: Joi.string().min(1).max(100).required(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  app_id: Joi.string().alphanum().length(24).optional(), // MongoDB ObjectId length
});

// Joi schema for the /user-stats endpoint query
const userStatsSchema = Joi.object({
  userId: Joi.string().min(1).max(256).required(),
});

module.exports = {
  collectSchema,
  summarySchema,
  userStatsSchema,
};