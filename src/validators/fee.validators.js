import { z } from 'zod';
import { FEE_CLASS_GROUPS } from '../models/FeeRow.model.js';

export const createFeeSchema = z.object({
  classGroup:         z.enum(FEE_CLASS_GROUPS, { errorMap: () => ({ message: 'Invalid class group' }) }),
  admissionFee:       z.number().nonnegative().nullable().optional().default(null),
  tuitionFeePerTerm:  z.number().nonnegative().nullable().optional().default(null),
  otherCharges:       z.number().nonnegative().nullable().optional().default(null),
  notes:              z.string().max(500).trim().optional().default(''),
  order:              z.number().int().optional().default(0),
  isActive:           z.boolean().optional().default(true),
});

export const updateFeeSchema = createFeeSchema.partial().omit({ classGroup: true });
