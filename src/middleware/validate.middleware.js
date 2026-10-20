/**
 * Zod validation middleware factory — compatible with Zod v4.
 *
 * For 'body' : stores parsed data back on req.body (Express body is writable)
 * For 'query': stores parsed data on req.validatedQuery (req.query is read-only in Express)
 * For 'params': stores parsed data on req.validatedParams
 *
 * Controllers should read:
 *   req.body            for validated body
 *   req.validatedQuery  for validated query params
 *   req.validatedParams for validated route params
 */
import { sendError } from '../utils/response.js';

/**
 * @param {import('zod').ZodSchema} schema
 * @param {'body'|'query'|'params'} [source='body']
 */
export function validate(schema, source = 'body') {
  return function (req, res, next) {
    const input  = source === 'query'  ? req.query
                 : source === 'params' ? req.params
                 : req.body;

    const result = schema.safeParse(input);

    if (!result.success) {
      // Zod v4 uses .issues (not .errors)
      const issues = result.error?.issues ?? [];
      const errors = issues.map((issue) => ({
        field:   issue.path.join('.') || '_root',
        message: issue.message,
      }));
      return sendError(res, { statusCode: 422, message: 'Validation failed.', errors });
    }

    // Store parsed data — use dedicated properties for query/params
    // because req.query is read-only in Express
    if (source === 'query') {
      req.validatedQuery = result.data;
    } else if (source === 'params') {
      req.validatedParams = result.data;
    } else {
      req.body = result.data;
    }

    next();
  };
}
