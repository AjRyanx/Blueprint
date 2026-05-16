import { pgTable, uuid, text, timestamp, integer, varchar, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

export const creditLedger = pgTable(
  'credit_ledger',
  {
    id: uuid('id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    operation: varchar('operation', { length: 50 }).notNull(),
    amount: integer('amount').notNull(),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('credits_user_id_idx').on(table.userId),
  }),
);

export type CreditLedgerSelect = typeof creditLedger.$inferSelect;
export type CreditLedgerInsert = typeof creditLedger.$inferInsert;
