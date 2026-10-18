import { and, asc, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import type { Db } from "../db/client";
import { auditLog, favorites, newsletterSubscribers, refreshTokens, searchLogs, siteSettings, userStyles, users } from "../db/schema";
import type { UserRow } from "../domain/types";
import type { Role } from "../security/rbac";
import { escapeLike } from "@/lib/text";

export type UserPatch = Partial<Omit<UserRow, "id" | "createdAt">> & { updatedAt?: Date };

export interface UserRepository {
  findByEmail(email: string): Promise<UserRow | null>;
  findById(id: string): Promise<UserRow | null>;
  findByGoogleSub(sub: string): Promise<UserRow | null>;
  create(v: Partial<UserRow> & { email: string }): Promise<UserRow>;
  update(id: string, v: UserPatch): Promise<void>;
  styleIds(userId: string): Promise<number[]>;
  setStyles(userId: string, ids: number[]): Promise<void>;
  list(opts: { q?: string; role?: Role; page: number; pageSize: number }): Promise<{ items: UserRow[]; total: number }>;
  bumpTokenVersion(id: string): Promise<void>;
}

export interface TokenRecord {
  id: string; userId: string; familyId: string; tokenHash: string; expiresAt: Date; revokedAt: Date | null; replacedBy: string | null;
}
export interface TokenRepository {
  create(v: { userId: string; familyId: string; tokenHash: string; expiresAt: Date; userAgent: string; ipHash: string }): Promise<string>;
  findByHash(hash: string): Promise<TokenRecord | null>;
  markRotated(id: string, replacedBy: string): Promise<void>;
  revokeFamily(familyId: string): Promise<void>;
  revokeAllForUser(userId: string): Promise<void>;
  purgeExpired(): Promise<void>;
}

export interface FavoriteRepository {
  ids(userId: string): Promise<number[]>;
  add(userId: string, productId: number): Promise<void>;
  remove(userId: string, productId: number): Promise<void>;
  merge(userId: string, productIds: number[]): Promise<void>;
}

export interface SettingsRepository {
  getAll(): Promise<Record<string, unknown>>;
  set(key: string, value: unknown): Promise<void>;
}

export interface MiscRepository {
  subscribe(email: string, source: string): Promise<void>;
  logSearch(v: { query: string; plan: Record<string, unknown>; planner: string; resultCount: number; userId: string | null }): Promise<void>;
  topEmptySearches(limit: number): Promise<{ query: string; n: number }[]>;
  audit(v: { actorId: string | null; action: string; entity: string; entityId?: string; meta?: Record<string, unknown>; ipHash?: string }): Promise<void>;
  recentAudit(limit: number): Promise<{ id: number; action: string; entity: string; entityId: string | null; createdAt: string; actorEmail: string | null }[]>;
}

const toUser = (r: typeof users.$inferSelect): UserRow => ({ ...r, birthDate: r.birthDate, role: r.role as Role });

export class DrizzleUserRepository implements UserRepository {
  constructor(private db: Db) {}
  async findByEmail(email: string) {
    const r = await this.db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
    return r[0] ? toUser(r[0]) : null;
  }
  async findById(id: string) {
    const r = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return r[0] ? toUser(r[0]) : null;
  }
  async findByGoogleSub(sub: string) {
    const r = await this.db.select().from(users).where(eq(users.googleSub, sub)).limit(1);
    return r[0] ? toUser(r[0]) : null;
  }
  async create(v: Partial<UserRow> & { email: string }) {
    const [r] = await this.db.insert(users).values({ ...v, email: v.email.toLowerCase() } as typeof users.$inferInsert).returning();
    return toUser(r!);
  }
  async update(id: string, v: UserPatch) {
    await this.db.update(users).set({ ...v, updatedAt: new Date() } as Partial<typeof users.$inferInsert>).where(eq(users.id, id));
  }
  async styleIds(userId: string) {
    const r = await this.db.select({ id: userStyles.styleId }).from(userStyles).where(eq(userStyles.userId, userId));
    return r.map((x) => x.id);
  }
  async setStyles(userId: string, ids: number[]) {
    await this.db.transaction(async (tx) => {
      await tx.delete(userStyles).where(eq(userStyles.userId, userId));
      if (ids.length) await tx.insert(userStyles).values(ids.map((styleId) => ({ userId, styleId }))).onConflictDoNothing();
    });
  }
  async list({ q, role, page, pageSize }: { q?: string; role?: Role; page: number; pageSize: number }) {
    const c = [];
    if (q) {
      const like = `%${escapeLike(q)}%`;
      c.push(or(ilike(users.email, like), ilike(users.fullName, like), ilike(users.phone, like)));
    }
    if (role) c.push(eq(users.role, role));
    const where = c.length ? and(...c) : undefined;
    const [items, total] = await Promise.all([
      this.db.select().from(users).where(where).orderBy(desc(users.createdAt)).limit(pageSize).offset((page - 1) * pageSize),
      this.db.select({ n: count() }).from(users).where(where),
    ]);
    return { items: items.map(toUser), total: total[0]?.n ?? 0 };
  }
  async bumpTokenVersion(id: string) {
    await this.db.update(users).set({ tokenVersion: sql`${users.tokenVersion} + 1` }).where(eq(users.id, id));
  }
}

export class DrizzleTokenRepository implements TokenRepository {
  constructor(private db: Db) {}
  async create(v: { userId: string; familyId: string; tokenHash: string; expiresAt: Date; userAgent: string; ipHash: string }) {
    const [r] = await this.db.insert(refreshTokens).values(v).returning({ id: refreshTokens.id });
    return r!.id;
  }
  async findByHash(hash: string) {
    const r = await this.db.select().from(refreshTokens).where(eq(refreshTokens.tokenHash, hash)).limit(1);
    return r[0] ?? null;
  }
  async markRotated(id: string, replacedBy: string) {
    await this.db.update(refreshTokens).set({ revokedAt: new Date(), replacedBy }).where(eq(refreshTokens.id, id));
  }
  async revokeFamily(familyId: string) {
    await this.db.update(refreshTokens).set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.familyId, familyId), sql`${refreshTokens.revokedAt} is null`));
  }
  async revokeAllForUser(userId: string) {
    await this.db.update(refreshTokens).set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.userId, userId), sql`${refreshTokens.revokedAt} is null`));
  }
  async purgeExpired() {
    await this.db.delete(refreshTokens).where(sql`${refreshTokens.expiresAt} < now() - interval '7 days'`);
  }
}

export class DrizzleFavoriteRepository implements FavoriteRepository {
  constructor(private db: Db) {}
  async ids(userId: string) {
    const r = await this.db.select({ id: favorites.productId }).from(favorites).where(eq(favorites.userId, userId)).orderBy(desc(favorites.createdAt));
    return r.map((x) => x.id);
  }
  async add(userId: string, productId: number) {
    await this.db.insert(favorites).values({ userId, productId }).onConflictDoNothing();
  }
  async remove(userId: string, productId: number) {
    await this.db.delete(favorites).where(and(eq(favorites.userId, userId), eq(favorites.productId, productId)));
  }
  async merge(userId: string, productIds: number[]) {
    if (!productIds.length) return;
    // chi chen id san pham con ton tai (tranh loi FK khi localStorage chua id cu)
    await this.db.execute(sql`
      insert into favorites (user_id, product_id)
      select ${userId}::uuid, p.id from products p where p.id in ${productIds} on conflict do nothing`);
  }
}

export class DrizzleSettingsRepository implements SettingsRepository {
  constructor(private db: Db) {}
  async getAll() {
    const r = await this.db.select().from(siteSettings);
    return Object.fromEntries(r.map((x) => [x.key, x.value]));
  }
  async set(key: string, value: unknown) {
    await this.db.insert(siteSettings).values({ key, value })
      .onConflictDoUpdate({ target: siteSettings.key, set: { value, updatedAt: new Date() } });
  }
}

export class DrizzleMiscRepository implements MiscRepository {
  constructor(private db: Db) {}
  async subscribe(email: string, source: string) {
    await this.db.insert(newsletterSubscribers).values({ email: email.toLowerCase(), source }).onConflictDoNothing();
  }
  async logSearch(v: { query: string; plan: Record<string, unknown>; planner: string; resultCount: number; userId: string | null }) {
    await this.db.insert(searchLogs).values({ ...v, query: v.query.slice(0, 200) });
  }
  async topEmptySearches(limit: number) {
    const r = await this.db.execute(sql`
      select lower(query) as query, count(*)::int as n from search_logs
      where result_count = 0 and created_at > now() - interval '30 days' group by 1 order by n desc limit ${limit}`);
    return Array.from(r) as { query: string; n: number }[];
  }
  async audit(v: { actorId: string | null; action: string; entity: string; entityId?: string; meta?: Record<string, unknown>; ipHash?: string }) {
    await this.db.insert(auditLog).values({ ...v, meta: v.meta ?? {} });
  }
  async recentAudit(limit: number) {
    const r = await this.db.execute(sql`
      select a.id, a.action, a.entity, a.entity_id as "entityId", to_char(a.created_at at time zone 'Asia/Ho_Chi_Minh', 'DD/MM HH24:MI') as "createdAt",
             u.email as "actorEmail"
      from audit_log a left join users u on u.id = a.actor_id order by a.id desc limit ${limit}`);
    return Array.from(r) as unknown as Awaited<ReturnType<MiscRepository["recentAudit"]>>;
  }
}
void asc;
