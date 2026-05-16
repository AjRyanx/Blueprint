import { pgTable, uuid, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { projects } from './projects';

export const securityChecklists = pgTable(
  'security_checklists',
  {
    id: uuid('id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' })
      .unique(),
    threats: jsonb('threats').notNull().default([]),
    checklist: jsonb('checklist').notNull().default([]),
    signedOffAt: timestamp('signed_off_at', { withTimezone: true }),
    signedOffBy: uuid('signed_off_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    projectIdIdx: index('security_project_id_idx').on(table.projectId),
  }),
);

export type SecurityChecklistSelect = typeof securityChecklists.$inferSelect;
export type SecurityChecklistInsert = typeof securityChecklists.$inferInsert;
