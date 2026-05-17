import { pgTable, uuid, text, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';
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
  needsDatabase: boolean('needs_database').default(true).notNull(),
  persistenceNotes: text('persistence_notes'),
  needsServer: boolean('needs_server').default(true).notNull(),
  serverNotes: text('server_notes'),
  targetPlatform: text('target_platform').default('web').notNull(),
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
