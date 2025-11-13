const Joi = require('joi');

/**
 * A middleware factory for validating request data against a Joi schema.
 * @param {Joi.Schema} schema - The Joi schema to validate against.
 * @param {string} property - The property of the request object to validate ('body', 'query', 'params').
 */
const validator = (schema, property = 'body') => (req, res, next) => {
  // Validate the specified part of the request object
  const { error } = schema.validate(req[property]);

  if (error) {
    // If validation fails, send a 400 Bad Request response
    const { details } = error;
    const message = details.map((i) => i.message).join(',');

    return res.status(400).json({
      message: `Validation error: ${message}`,
      error: details,
    });
  }

  // Validation passed
  next();
};

module.exports = validator;