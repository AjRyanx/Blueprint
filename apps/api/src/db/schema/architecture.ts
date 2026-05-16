import { pgTable, uuid, text, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { projects } from './projects';

export const architectureDesigns = pgTable('architecture_designs', {
  id: uuid('id')
    .default(sql`gen_random_uuid()`)
    .primaryKey(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' })
    .unique(),
  overview: text('overview'),
  techStack: jsonb('tech_stack').notNull().default([]),
  patterns: jsonb('patterns').notNull().default([]),
  decisions: jsonb('decisions').notNull().default([]),
  constraints: jsonb('constraints').notNull().default([]),
  qualityAttributes: jsonb('quality_attributes').notNull().default([]),
  diagrams: text('diagrams'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type ArchitectureDesignSelect = typeof architectureDesigns.$inferSelect;
export type ArchitectureDesignInsert = typeof architectureDesigns.$inferInsert;
