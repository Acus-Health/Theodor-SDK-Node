const Joi = require('joi');
const { ApiResponse } = require('../utils/api-response');

/**
 * Request validation middleware
 * @param {Joi.Schema} schema - Joi validation schema
 * @param {string} property - Request property to validate (body, params, query)
 * @returns {Function} Express middleware function
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error } = schema.validate(req[property]);
    
    if (!error) {
      return next();
    }
    
    const message = error.details.map(detail => detail.message).join(', ');
    return ApiResponse.badRequest(res, message);
  };
};

// Validation schemas
const schemas = {
  submitAudio: Joi.object({
    site: Joi.string().valid('heart', 'lung', 'abdomen').default('heart'),
    examId: Joi.string().optional()
  }),
  
  submitBase64Audio: Joi.object({
    data: Joi.string().required(),
    mimeType: Joi.string().required(),
    site: Joi.string().valid('heart', 'lung', 'abdomen').default('heart'),
    examId: Joi.string().optional()
  }),
  
  idParam: Joi.object({
    id: Joi.string().uuid().required()
  })
};

module.exports = {
  validate,
  schemas
};