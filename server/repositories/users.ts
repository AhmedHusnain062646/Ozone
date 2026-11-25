// ABOUTME: User persistence: lookups by id/email (case-insensitive), creation, and the seller link.
// ABOUTME: Only this module touches the users table for auth; services never build SQL for it.
import { eq, sql } from 'drizzle-orm';
import { db } from '../db/client.ts';
import * as s from '../db/schema.ts';

export type UserRow = typeof s.users.$inferSelect;
export type AuthUser = Omit<UserRow, 'passwordHash'> & { sellerId: string | null };

const publicColumns = {
  id: s.users.id,
  email: s.users.email,
  displayName: s.users.displayName,
  role: s.users.role,
  createdAt: s.users.createdAt,
  sellerId: s.sellers.id,
};

export async function findAuthUserById(id: string): Promise<AuthUser | undefined> {
  const [row] = await db
    .select(publicColumns)
    .from(s.users)
    .leftJoin(s.sellers, eq(s.sellers.userId, s.users.id))
    .where(eq(s.users.id, id));
  return row;
}

export async function findByEmail(email: string): Promise<UserRow | undefined> {
  const [row] = await db.select().from(s.users).where(sql`lower(${s.users.email}) = lower(${email})`);
  return row;
}

export async function createBuyer(input: { email: string; passwordHash: string; displayName: string }): Promise<UserRow> {
  const [row] = await db.insert(s.users).values({ ...input, role: 'buyer' }).returning();
  return row;
}

/** Creates the login and its atelier together so a half-created applicant can never exist. */
export async function createSellerApplicant(
  input: { email: string; passwordHash: string; displayName: string },
  atelier: { slug: string; name: string; tagline: string; location: string; commissionBps: number },
): Promise<UserRow> {
  return db.transaction(async (tx) => {
    const [user] = await tx.insert(s.users).values({ ...input, role: 'seller' }).returning();
    await tx.insert(s.sellers).values({ ...atelier, userId: user.id, status: 'pending_approval', verified: false });
    return user;
  });
}

export async function getDefaultCommissionBps(): Promise<number> {
  const [row] = await db.select().from(s.settings).where(eq(s.settings.key, s.defaultFee.key));
  return Number(row?.value ?? s.defaultFee.initial);
}
