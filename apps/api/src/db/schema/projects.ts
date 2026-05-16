import { pgTable, uuid, varchar, text, timestamp, integer, jsonb, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

export const projects = pgTable(
  'projects',
  {
    id: uuid('id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    status: varchar('status', { length: 20 })
      .notNull()
      .default('active'),
    currentPhase: integer('current_phase').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('projects_user_id_idx').on(table.userId),
  }),
);

export const projectBriefs = pgTable(
  'project_briefs',
  {
    id: uuid('id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' })
      .unique(),
    projectName: varchar('project_name', { length: 255 }).notNull(),
    oneLineDescription: text('one_line_description').notNull(),
    problemStatement: text('problem_statement').notNull(),
    targetUsers: text('target_users').notNull(),
    coreValueProposition: text('core_value_proposition').notNull(),
    outOfScope: jsonb('out_of_scope').notNull().default([]),
    successMetrics: jsonb('success_metrics').notNull().default([]),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    projectIdIdx: index('brief_project_id_idx').on(table.projectId),
  }),
);

export type ProjectSelect = typeof projects.$inferSelect;
export type ProjectInsert = typeof projects.$inferInsert;
export type ProjectBriefSelect = typeof projectBriefs.$inferSelect;
export type ProjectBriefInsert = typeof projectBriefs.$inferInsert;
