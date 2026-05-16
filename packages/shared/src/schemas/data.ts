import { z } from 'zod';

export const attributeSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  required: z.boolean().default(true),
  unique: z.boolean().default(false),
  notes: z.string().optional().default(''),
});

export const entitySchema = z.object({
  name: z.string().min(1),
  description: z.string().default(''),
  attributes: z.array(attributeSchema).default([]),
});

export const relationshipSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['one-to-one', 'one-to-many', 'many-to-many']),
  source: z.string().min(1),
  target: z.string().min(1),
  description: z.string().default(''),
});

export const indexSchema = z.object({
  name: z.string().min(1),
  entity: z.string().min(1),
  columns: z.array(z.string()).default([]),
  unique: z.boolean().default(false),
});

export const dataModelSchema = z.object({
  entities: z.array(entitySchema).default([]),
  relationships: z.array(relationshipSchema).default([]),
  indexes: z.array(indexSchema).default([]),
  notes: z.string().optional().default(''),
});

export type Attribute = z.infer<typeof attributeSchema>;
export type Entity = z.infer<typeof entitySchema>;
export type Relationship = z.infer<typeof relationshipSchema>;
export type Index = z.infer<typeof indexSchema>;
export type DataModel = z.infer<typeof dataModelSchema>;
