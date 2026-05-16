import { z } from 'zod';

export const createRequirementSchema = z.object({
  userStory: z.string().min(10, 'User story must be at least 10 characters'),
  priority: z.enum(['must', 'should', 'could', 'wont']),
  dependencies: z.array(z.string().uuid()).optional(),
});

export const updateRequirementSchema = z.object({
  userStory: z.string().min(10).optional(),
  priority: z.enum(['must', 'should', 'could', 'wont']).optional(),
  status: z.enum(['draft', 'approved', 'implemented', 'blocked']).optional(),
  dependencies: z.array(z.string().uuid()).optional(),
});

export type CreateRequirementInput = z.infer<typeof createRequirementSchema>;
export type UpdateRequirementInput = z.infer<typeof updateRequirementSchema>;
