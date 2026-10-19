import { z } from 'zod';
import { PAGE_LIST, CONTENT_TYPES } from '../models/Content.model.js';

export const createContentSchema = z.object({
  key:     z.string().regex(/^[a-z0-9._-]+$/, 'Key must be lowercase alphanumeric with dots/dashes').max(150),
  page:    z.enum(PAGE_LIST,    { errorMap: () => ({ message: 'Invalid page'  }) }),
  section: z.string().min(1).max(100).trim(),
  label:   z.string().min(1).max(200).trim(),
  type:    z.enum(CONTENT_TYPES, { errorMap: () => ({ message: 'Invalid content type' }) }),
  value:   z.any().optional(),
});

export const updateContentSchema = z.object({
  value:      z.any().optional(),
  draftValue: z.any().optional(),
  label:      z.string().min(1).max(200).trim().optional(),
});
