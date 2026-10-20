/**
 * Standardised API response helpers.
 *
 * Every endpoint MUST use these so the frontend always receives:
 *   { success, message, data }        — success
 *   { success, message, errors? }     — failure
 */

/**
 * Send a successful response.
 * @param {import('express').Response} res
 * @param {object} options
 * @param {number}  [options.statusCode=200]
 * @param {string}  [options.message='Success']
 * @param {*}       [options.data=null]
 * @param {object}  [options.meta]   - pagination meta, counts, etc.
 */
export function sendSuccess(res, { statusCode = 200, message = 'Success', data = null, meta } = {}) {
  const body = { success: true, message, data };
  if (meta !== undefined) body.meta = meta;
  return res.status(statusCode).json(body);
}

/**
 * Send an error response.
 * @param {import('express').Response} res
 * @param {object} options
 * @param {number}   [options.statusCode=500]
 * @param {string}   [options.message='An error occurred']
 * @param {Array}    [options.errors]  - validation error array
 */
export function sendError(res, { statusCode = 500, message = 'An error occurred', errors } = {}) {
  const body = { success: false, message };
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
}

/**
 * Build pagination meta object from query params + total count.
 * @param {number} page       - current page (1-based)
 * @param {number} limit      - items per page
 * @param {number} total      - total matching documents
 * @returns {{ page, limit, total, totalPages, hasNext, hasPrev }}
 */
export function paginationMeta(page, limit, total) {
  const totalPages = Math.ceil(total / limit) || 1;
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * Parse and validate pagination query params with safe defaults.
 * @param {object} query - req.query
 * @param {number} [defaultLimit=20]
 * @param {number} [maxLimit=100]
 * @returns {{ page: number, limit: number, skip: number }}
 */
export function parsePagination(query, defaultLimit = 20, maxLimit = 100) {
  const page  = Math.max(1, parseInt(query.page,  10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  const skip  = (page - 1) * limit;
  return { page, limit, skip };
}
