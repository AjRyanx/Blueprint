import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z
    .string()
    .min(1, 'Project name is required')
    .max(200, 'Project name too long'),
  description: z.string().max(2000).optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(['active', 'archived']).optional(),
  currentPhase: z.number().int().min(1).max(6).optional(),
});

export const projectBriefSchema = z.object({
  projectName: z.string().min(1),
  oneLineDescription: z.string().min(1),
  problemStatement: z.string().min(1),
  targetUsers: z.string().min(1),
  coreValueProposition: z.string().min(1),
  outOfScope: z.array(z.string()),
  successMetrics: z.array(z.string()),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ProjectBriefInput = z.infer<typeof projectBriefSchema>;
