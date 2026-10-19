import { z } from 'zod';
import { CLASS_LIST, APPLICATION_STATUSES } from '../models/AdmissionApplication.model.js';

const indianPhone = z
  .string()
  .regex(/^(\+91)?[6-9]\d{9}$/, 'Please enter a valid Indian mobile number (+91XXXXXXXXXX)');

export const createApplicationSchema = z.object({
  source:        z.enum(['enquiry', 'application']).default('enquiry'),
  studentName:   z.string().min(1, 'Student name is required').max(150).trim(),
  classApplying: z.enum(CLASS_LIST, { errorMap: () => ({ message: 'Invalid class selected' }) }),
  parentName:    z.string().min(1, 'Parent name is required').max(150).trim(),
  phone:         indianPhone,

  // Optional fields
  dateOfBirth:    z.string().optional().transform(v => v ? new Date(v) : undefined),
  gender:         z.enum(['male', 'female', 'other']).optional(),
  previousSchool: z.string().max(200).trim().optional().default(''),
  email:          z.string().email('Invalid email').optional().default(''),
  address:        z.string().max(500).trim().optional().default(''),
  occupation:     z.string().max(100).trim().optional().default(''),
  message:        z.string().max(1000).trim().optional().default(''),
});

export const updateStatusSchema = z.object({
  status: z.enum(APPLICATION_STATUSES, {
    errorMap: () => ({ message: `Status must be one of: ${APPLICATION_STATUSES.join(', ')}` }),
  }),
  note: z.string().max(1000).trim().optional().default(''),
});

export const applicationQuerySchema = z.object({
  page:    z.string().optional().transform(v => parseInt(v) || 1),
  limit:   z.string().optional().transform(v => Math.min(100, parseInt(v) || 20)),
  search:  z.string().max(100).trim().optional().default(''),
  status:  z.enum([...APPLICATION_STATUSES, 'all']).optional().default('all'),
  class:   z.enum([...CLASS_LIST, 'all']).optional().default('all'),
  from:    z.string().optional(),
  to:      z.string().optional(),
});
