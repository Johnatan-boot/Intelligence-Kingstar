// src/shared/utils/helpers.js

/**
 * Monta objeto de paginação padrão para respostas de lista
 */
export function paginate(data, total, page, limit) {
  return {
    data,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      has_next: page * limit < total,
      has_prev: page > 1,
    },
  };
}

/**
 * Converte string para número inteiro seguro
 */
export function toInt(value, fallback = 1) {
  const n = parseInt(value, 10);
  return isNaN(n) || n < 1 ? fallback : n;
}

/**
 * Remove campos undefined/null de um objeto (útil para UPDATEs parciais)
 */
export function cleanPayload(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== '')
  );
}

/**
 * Formata data para MySQL (YYYY-MM-DD)
 */
export function toMySQLDate(date) {
  if (!date) return null;
  return new Date(date).toISOString().slice(0, 10);
}

/**
 * Verifica se um valor é um número positivo válido
 */
export function isPositiveNumber(value) {
  return typeof value === 'number' && isFinite(value) && value > 0;
}
