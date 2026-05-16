import { pgTable, uuid, varchar, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { projects } from './projects';

export const requirements = pgTable(
  'requirements',
  {
    id: uuid('id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    userStory: text('user_story').notNull(),
    actor: varchar('actor', { length: 255 }).notNull(),
    action: text('action').notNull(),
    benefit: text('benefit').notNull(),
    priority: varchar('priority', { length: 20 })
      .notNull()
      .default('must'),
    status: varchar('status', { length: 20 })
      .notNull()
      .default('draft'),
    dependencies: jsonb('dependencies').notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    projectIdIdx: index('requirements_project_id_idx').on(table.projectId),
  }),
);

export type RequirementSelect = typeof requirements.$inferSelect;
export type RequirementInsert = typeof requirements.$inferInsert;
