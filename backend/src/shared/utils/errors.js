// src/shared/utils/errors.js
export class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}

export function handleError(reply, err) {
  const code = err.statusCode || 500;
  const message = err.message || 'Erro interno do servidor';
  return reply.code(code).send({ error: message });
}
