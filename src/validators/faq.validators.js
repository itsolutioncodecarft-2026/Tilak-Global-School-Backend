import { z } from 'zod';

export const createFaqSchema = z.object({
  question: z.string().min(1, 'Question is required').max(500).trim(),
  answer:   z.string().min(1, 'Answer is required').max(2000).trim(),
  order:    z.number().int().optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export const updateFaqSchema = createFaqSchema.partial();

export const reorderFaqSchema = z.object({
  // Array of { id, order } pairs
  items: z.array(
    z.object({
      id:    z.string().min(1),
      order: z.number().int(),
    })
  ).min(1, 'At least one item required'),
});
