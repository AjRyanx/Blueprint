import { db } from '../db/index.js';
import { users } from '../db/schema/users.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export async function createUser(email: string, password: string, name: string) {
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  const [user] = await db
    .insert(users)
    .values({ email, hashedPassword, name })
    .returning({ id: users.id, email: users.email, name: users.name, planTier: users.planTier });
  return user;
}

export async function findUserByEmail(email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email));
  return user ?? null;
}

export async function findUserById(id: string) {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      avatarUrl: users.avatarUrl,
      planTier: users.planTier,
      creditsRemaining: users.creditsRemaining,
    })
    .from(users)
    .where(eq(users.id, id));
  return user ?? null;
}

export async function findOrCreateOAuthUser(email: string, name: string, avatarUrl?: string) {
  const existing = await findUserByEmail(email);
  if (existing) {
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (name) updates.name = name;
    if (avatarUrl) updates.avatarUrl = avatarUrl;
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.email, email))
      .returning({ id: users.id, email: users.email, name: users.name, planTier: users.planTier });
    return user!;
  }
  const [user] = await db
    .insert(users)
    .values({ email, name, avatarUrl })
    .returning({ id: users.id, email: users.email, name: users.name, planTier: users.planTier });
  return user;
}

export async function verifyPassword(password: string, hashedPassword: string) {
  return bcrypt.compare(password, hashedPassword);
}
