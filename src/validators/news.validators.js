import { z } from 'zod';
import { NEWS_CATEGORIES } from '../models/NewsPost.model.js';

export const createNewsSchema = z.object({
  title:    z.string().min(1, 'Title is required').max(300).trim(),
  category: z.enum(NEWS_CATEGORIES, { errorMap: () => ({ message: 'Invalid category' }) }),
  date:     z.string()
    .optional()
    .transform(v => (v && v !== '') ? v : new Date().toISOString().slice(0, 10))
    .refine(v => !isNaN(Date.parse(v)), 'Invalid date'),
  summary:  z.string().max(500).trim().optional().default(''),
  body:     z.string().optional().default(''),
  status:   z.enum(['draft', 'published']).optional().default('draft'),
});

export const updateNewsSchema = createNewsSchema.partial().extend({
  isFeatured: z.boolean().optional(),
  status:     z.enum(['draft', 'published']).optional(),
});

export const newsQuerySchema = z.object({
  page:     z.string().optional().transform(v => parseInt(v) || 1),
  limit:    z.string().optional().transform(v => Math.min(50, parseInt(v) || 10)),
  category: z.enum([...NEWS_CATEGORIES, 'all']).optional().default('all'),
  status:   z.enum(['draft', 'published', 'all']).optional().default('all'),
  search:   z.string().max(100).optional().default(''),
});
