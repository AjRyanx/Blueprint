import { z } from 'zod';

export const techStackItemSchema = z.object({
  name: z.string().min(1),
  version: z.string().optional().default(''),
  notes: z.string().optional().default(''),
});

export const techStackCategorySchema = z.object({
  category: z.string().min(1),
  items: z.array(techStackItemSchema).default([]),
});

export const patternSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(''),
  rationale: z.string().default(''),
});

export const decisionSchema = z.object({
  title: z.string().min(1),
  context: z.string().default(''),
  decision: z.string().default(''),
  consequences: z.string().default(''),
});

export const qualityAttributeSchema = z.object({
  attribute: z.string().min(1),
  target: z.string().default(''),
  notes: z.string().default(''),
});

export const architectureDesignSchema = z.object({
  overview: z.string().optional().default(''),
  techStack: z.array(techStackCategorySchema).default([]),
  patterns: z.array(patternSchema).default([]),
  decisions: z.array(decisionSchema).default([]),
  constraints: z.array(z.string()).default([]),
  qualityAttributes: z.array(qualityAttributeSchema).default([]),
  diagrams: z.string().optional().default(''),
});

export type TechStackItem = z.infer<typeof techStackItemSchema>;
export type TechStackCategory = z.infer<typeof techStackCategorySchema>;
export type Pattern = z.infer<typeof patternSchema>;
export type Decision = z.infer<typeof decisionSchema>;
export type QualityAttribute = z.infer<typeof qualityAttributeSchema>;
export type ArchitectureDesign = z.infer<typeof architectureDesignSchema>;
