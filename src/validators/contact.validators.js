import { z } from 'zod';

export const createContactSchema = z.object({
  name:    z.string().min(1, 'Name is required').max(150).trim(),
  email:   z.string().email('Invalid email address').toLowerCase(),
  phone:   z.string().max(20).trim().optional().default(''),
  subject: z.string().max(300).trim().optional().default(''),
  message: z.string().min(1, 'Message is required').max(2000).trim(),

  // Honeypot — must be empty; bots tend to fill every field
  _hp: z.string().max(0, 'Bot detected').optional(),
});

export const updateContactStatusSchema = z.object({
  status: z.enum(['unread', 'read', 'replied'], {
    errorMap: () => ({ message: 'Status must be unread, read, or replied' }),
  }),
});
