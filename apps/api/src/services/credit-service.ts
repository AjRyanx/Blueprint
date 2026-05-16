import { db } from '../db/index.js';
import { users } from '../db/schema/users.js';
import { creditLedger } from '../db/schema/credits.js';
import { eq, sql } from 'drizzle-orm';

const OPERATION_COSTS: Record<string, number> = {
  chat_message: 1,
  synthesize_brief: 5,
  generate_requirements: 5,
  generate_security: 5,
  generate_tasks: 10,
};

export async function deductCredits(userId: string, operation: string): Promise<boolean> {
  const cost = OPERATION_COSTS[operation] ?? 1;

  const [user] = await db
    .select({ creditsRemaining: users.creditsRemaining })
    .from(users)
    .where(eq(users.id, userId));

  if (!user || user.creditsRemaining < cost) {
    return false;
  }

  await db
    .update(users)
    .set({
      creditsRemaining: sql`${users.creditsRemaining} - ${cost}`,
    })
    .where(eq(users.id, userId));

  await db.insert(creditLedger).values({
    userId,
    operation,
    amount: -cost,
    description: `${operation} cost`,
  });

  return true;
}

export async function addCredits(
  userId: string,
  amount: number,
  description: string,
) {
  await db
    .update(users)
    .set({
      creditsRemaining: sql`${users.creditsRemaining} + ${amount}`,
    })
    .where(eq(users.id, userId));

  await db.insert(creditLedger).values({
    userId,
    operation: 'purchase',
    amount,
    description,
  });
}

export async function getCreditBalance(userId: string) {
  const [user] = await db
    .select({ creditsRemaining: users.creditsRemaining, planTier: users.planTier })
    .from(users)
    .where(eq(users.id, userId));
  return user ?? null;
}

export const PLAN_LIMITS = {
  free: { initialCredits: 50, maxProjects: 1 },
  builder: { initialCredits: 500, maxProjects: 5 },
  pro: { initialCredits: 2000, maxProjects: 100 },
  team: { initialCredits: 8000, maxProjects: 1000 },
};
