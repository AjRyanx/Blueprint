import { pgTable, uuid, text, timestamp, integer, jsonb, varchar, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { projects } from './projects';
import { requirements } from './requirements';

export const implementationTasks = pgTable(
  'implementation_tasks',
  {
    id: uuid('id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    requirementId: uuid('requirement_id')
      .references(() => requirements.id, { onDelete: 'cascade' }),
    sequenceOrder: integer('sequence_order').notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    objective: text('objective').notNull(),
    promptText: text('prompt_text'),
    acceptanceCriteria: jsonb('acceptance_criteria').notNull().default([]),
    status: varchar('status', { length: 20 })
      .notNull()
      .default('pending'),
    reviewStatus: varchar('review_status', { length: 20 })
      .notNull()
      .default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    projectIdIdx: index('tasks_project_id_idx').on(table.projectId),
    requirementIdIdx: index('tasks_requirement_id_idx').on(table.requirementId),
  }),
);

export type ImplementationTaskSelect = typeof implementationTasks.$inferSelect;
export type ImplementationTaskInsert = typeof implementationTasks.$inferInsert;
