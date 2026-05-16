import { pgTable, uuid, text, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { projects } from './projects';

export const dataModels = pgTable('data_models', {
  id: uuid('id')
    .default(sql`gen_random_uuid()`)
    .primaryKey(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' })
    .unique(),
  entities: jsonb('entities').notNull().default([]),
  relationships: jsonb('relationships').notNull().default([]),
  indexes: jsonb('indexes').notNull().default([]),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type DataModelSelect = typeof dataModels.$inferSelect;
export type DataModelInsert = typeof dataModels.$inferInsert;
