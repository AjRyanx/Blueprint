import { z } from 'zod';

export const phaseTransitionSchema = z.object({
  projectId: z.string().uuid(),
  fromPhase: z.number().int().min(1).max(6),
  toPhase: z.number().int().min(1).max(6),
  acknowledged: z.boolean(),
});

export type PhaseTransitionInput = z.infer<typeof phaseTransitionSchema>;
