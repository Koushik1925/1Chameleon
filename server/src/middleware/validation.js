const { z } = require('zod');

const activateSchema = z.object({
  license_key: z.string().min(10).max(50),
  device_id: z.string().min(5).max(255)
});

const validateSchema = z.object({
  device_id: z.string().min(5).max(255)
});

module.exports = {
  activateSchema,
  validateSchema
};
