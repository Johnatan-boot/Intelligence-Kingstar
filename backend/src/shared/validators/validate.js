// src/shared/validators/validate.js
import { ZodError } from 'zod';

/**
 * Valida dados com um schema Zod.
 * Lança AppError formatado se inválido.
 * Retorna o dado parseado (com defaults aplicados) se válido.
 */
export function validate(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const messages = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
    const err = new Error(messages.join(' | '));
    err.statusCode = 400;
    throw err;
  }
  return result.data;
}
