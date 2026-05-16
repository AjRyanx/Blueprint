import { z } from 'zod';

export const updateChecklistItemSchema = z.object({
  itemId: z.string(),
  passed: z.boolean(),
  notes: z.string().max(1000).optional(),
});

export const signOffSchema = z.object({
  projectId: z.string().uuid(),
});

export type UpdateChecklistItemInput = z.infer<typeof updateChecklistItemSchema>;
export type SignOffInput = z.infer<typeof signOffSchema>;
