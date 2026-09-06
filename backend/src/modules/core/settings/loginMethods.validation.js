const { z } = require('zod');

const methodParamSchema = z.object({
  method: z.enum(['google_oauth', 'email_password', 'magic_link']),
});

const updateBodySchema = z.object({
  isEnabled: z.boolean(),
});

module.exports = { methodParamSchema, updateBodySchema };
