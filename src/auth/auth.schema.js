const { z } = require('zod');

const registroSchema = z.object({
  email: z.string().email().max(255),
  senha: z.string().min(8).max(128),
  nome: z.string().min(2).max(255),
});

const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(1),
});

module.exports = { registroSchema, loginSchema };