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
    /* Zod 3+: issues; alguns bundlers expõem legacy .errors */
    const issues = result.error?.issues ?? result.error?.errors ?? [];
    const messages = issues.map((e) => {
      const path = Array.isArray(e.path) ? e.path.join('.') : String(e.path ?? '');
      return path ? `${path}: ${e.message}` : e.message;
    });
    const err = new Error(messages.length ? messages.join(' | ') : 'Dados inválidos');
    err.statusCode = 400;
    throw err;
  }
  return result.data;
}
