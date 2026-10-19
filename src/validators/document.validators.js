import { z } from 'zod';
import { DOCUMENT_CATEGORIES, DOCUMENT_PAGE_LIST, DOCUMENT_FILE_TYPES } from '../models/Document.model.js';

export const createDocumentSchema = z.object({
  title:     z.string().min(1, 'Title is required').max(300).trim(),
  category:  z.enum(DOCUMENT_CATEGORIES, { errorMap: () => ({ message: 'Invalid category' }) }),
  page:      z.enum(DOCUMENT_PAGE_LIST,  { errorMap: () => ({ message: 'Invalid page'     }) }),
  fileType:  z.enum(DOCUMENT_FILE_TYPES, { errorMap: () => ({ message: 'Invalid file type'}) }),
  issueDate: z.string().optional().transform(v => v ? new Date(v) : null),
  status:    z.enum(['published', 'draft']).optional().default('published'),
});

export const updateDocumentSchema = createDocumentSchema.partial();

export const documentQuerySchema = z.object({
  page:     z.string().optional().transform(v => parseInt(v) || 1),
  limit:    z.string().optional().transform(v => Math.min(100, parseInt(v) || 20)),
  category: z.string().optional().default('all'),
  docPage:  z.string().optional().default('all'),  // 'page' is reserved for pagination
  status:   z.enum(['published', 'draft', 'all']).optional().default('all'),
});
