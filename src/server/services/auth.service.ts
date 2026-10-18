import type { UserRepository, TokenRepository, FavoriteRepository, MiscRepository } from "../repositories/user.repo";
import type { UserRow } from "../domain/types";
import { AppError } from "../domain/errors";
import { registerSchema, loginSchema, passwordChangeSchema } from "../domain/validators";
import { hashPassword, verifyPassword } from "../security/password";
import { ACCESS_TTL_S, REFRESH_TTL_S, hashRefreshToken, newRefreshToken, signAccessToken } from "../security/jwt";
import type { OAuthIdentity } from "../security/google";
import { randomUUID } from "node:crypto";
import type { VerificationService } from "./verification.service";
import { env } from "../config/env";

export interface RequestMeta { ip: string; ipHash: string; userAgent: string }
export interface IssuedTokens { access: string; refresh: string; refreshExpiresAt: Date; user: UserRow; mailSent?: boolean }

const MAX_FAILS = 5;
const LOCK_MS = 15 * 60_000;
const REUSE_GRACE_MS = 10_000;

let dummyHash: Promise<string> | null = null;

export class AuthService {
  constructor(
    private users: UserRepository,
    private tokens: TokenRepository,
    private favorites: FavoriteRepository,
    private misc: MiscRepository,
    private verification?: VerificationService,
  ) {}

  private async issue(user: UserRow, meta: RequestMeta, familyId: string = randomUUID()): Promise<IssuedTokens> {
    const access = await signAccessToken({ sub: user.id, role: user.role, tv: user.tokenVersion });
    const { token, hash } = newRefreshToken();
    const refreshExpiresAt = new Date(Date.now() + REFRESH_TTL_S * 1000);
    await this.tokens.create({ userId: user.id, familyId, tokenHash: hash, expiresAt: refreshExpiresAt, userAgent: meta.userAgent, ipHash: meta.ipHash });
    return { access, refresh: token, refreshExpiresAt, user };
  }

  async register(raw: unknown, meta: RequestMeta): Promise<IssuedTokens> {
    const parsed = registerSchema.safeParse(raw);
    if (!parsed.success) throw validation(parsed.error.issues);
    const v = parsed.data;
    if (await this.users.findByEmail(v.email)) throw new AppError("CONFLICT", "Email này đã được đăng ký", { email: "Email đã tồn tại" });
    const user = await this.users.create({
      email: v.email, fullName: v.fullName, phone: v.phone ?? null, passwordHash: await hashPassword(v.password), consentAt: new Date(),
    });
    await this.misc.audit({ actorId: user.id, action: "user.register", entity: "user", entityId: user.id, ipHash: meta.ipHash });
    // Gui email xac thuc (loi gui khong chan dang ky). requiresVerification = che do bat buoc xac thuc truoc khi dang nhap
    const mail = await this.verification?.send(user);
    return { ...(await this.issue(user, meta)), mailSent: mail?.sent ?? false };
  }

  async login(raw: unknown, meta: RequestMeta): Promise<IssuedTokens> {
    const parsed = loginSchema.safeParse(raw);
    if (!parsed.success) throw new AppError("VALIDATION", "Email hoặc mật khẩu chưa đúng định dạng");
    const { email, password } = parsed.data;
    const user = await this.users.findByEmail(email);
    // Luon bam mat khau de thoi gian phan hoi khong lo tai khoan co ton tai hay khong
    dummyHash ??= hashPassword("eleonore-dummy-password");
    const ok = user ? await verifyPassword(password, user.passwordHash) : (await verifyPassword(password, await dummyHash), false);

    if (user?.lockedUntil && user.lockedUntil > new Date()) throw new AppError("LOCKED", "Tài khoản tạm khóa do nhập sai nhiều lần. Thử lại sau ít phút.");
    if (!user || !ok) {
      if (user) {
        const fails = user.failedLogins + 1;
        await this.users.update(user.id, fails >= MAX_FAILS ? { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MS) } : { failedLogins: fails });
      }
      throw new AppError("UNAUTHORIZED", "Email hoặc mật khẩu không đúng");
    }
    if (user.status === "blocked") throw new AppError("FORBIDDEN", "Tài khoản đã bị khóa");
    if (env().REQUIRE_VERIFIED_EMAIL === "true" && !user.emailVerified && user.role === "customer") {
      await this.verification?.send(user); // gui lai (co gioi han 1 mail/phut)
      throw new AppError("FORBIDDEN", "Vui lòng xác thực email trước khi đăng nhập. Chúng tôi vừa gửi lại email xác thực, hãy kiểm tra hộp thư (cả mục Spam).");
    }
    await this.users.update(user.id, { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() });
    return this.issue(user, meta);
  }

  /** Dang nhap Google: gop vao tai khoan co san theo email da xac minh, neu khong thi tao moi */
  async loginWithIdentity(id: OAuthIdentity, meta: RequestMeta): Promise<IssuedTokens> {
    let user = await this.users.findByGoogleSub(id.sub);
    if (!user) {
      const byEmail = await this.users.findByEmail(id.email);
      if (byEmail) {
        await this.users.update(byEmail.id, { googleSub: id.sub, emailVerified: true, avatarUrl: byEmail.avatarUrl ?? id.picture });
        user = { ...byEmail, googleSub: id.sub };
      } else {
        user = await this.users.create({ email: id.email, emailVerified: true, googleSub: id.sub, fullName: id.name, avatarUrl: id.picture });
        await this.misc.audit({ actorId: user.id, action: "user.register.google", entity: "user", entityId: user.id, ipHash: meta.ipHash });
      }
    }
    if (user.status === "blocked") throw new AppError("FORBIDDEN", "Tài khoản đã bị khóa");
    await this.users.update(user.id, { lastLoginAt: new Date() });
    return this.issue(user, meta);
  }

  /** Xoay vong refresh token; dung lai token cu -> huy ca ho token (nghi bi danh cap) */
  async refresh(rawToken: string | undefined, meta: RequestMeta): Promise<IssuedTokens> {
    if (!rawToken) throw new AppError("UNAUTHORIZED", "Phiên đăng nhập đã hết hạn");
    const rec = await this.tokens.findByHash(hashRefreshToken(rawToken));
    if (!rec) throw new AppError("UNAUTHORIZED", "Phiên đăng nhập không hợp lệ");
    if (rec.revokedAt) {
      if (Date.now() - rec.revokedAt.getTime() > REUSE_GRACE_MS) {
        await this.tokens.revokeFamily(rec.familyId);
        await this.misc.audit({ actorId: rec.userId, action: "auth.refresh_reuse", entity: "user", entityId: rec.userId, ipHash: meta.ipHash });
      }
      throw new AppError("UNAUTHORIZED", "Phiên đăng nhập không hợp lệ");
    }
    if (rec.expiresAt < new Date()) throw new AppError("UNAUTHORIZED", "Phiên đăng nhập đã hết hạn");
    const user = await this.users.findById(rec.userId);
    if (!user || user.status !== "active") {
      await this.tokens.revokeFamily(rec.familyId);
      throw new AppError("UNAUTHORIZED", "Tài khoản không khả dụng");
    }
    const next = await this.issue(user, meta, rec.familyId);
    const nextRec = await this.tokens.findByHash(hashRefreshToken(next.refresh));
    await this.tokens.markRotated(rec.id, nextRec!.id);
    return next;
  }

  async logout(rawToken: string | undefined) {
    if (!rawToken) return;
    const rec = await this.tokens.findByHash(hashRefreshToken(rawToken));
    if (rec) await this.tokens.revokeFamily(rec.familyId);
  }

  async changePassword(userId: string, raw: unknown, meta: RequestMeta) {
    const parsed = passwordChangeSchema.safeParse(raw);
    if (!parsed.success) throw validation(parsed.error.issues);
    const user = await this.users.findById(userId);
    if (!user) throw new AppError("NOT_FOUND", "Không tìm thấy tài khoản");
    if (user.passwordHash && !(await verifyPassword(parsed.data.current, user.passwordHash))) {
      throw new AppError("VALIDATION", "Mật khẩu hiện tại không đúng", { current: "Mật khẩu hiện tại không đúng" });
    }
    await this.users.update(userId, { passwordHash: await hashPassword(parsed.data.next) });
    await this.users.bumpTokenVersion(userId); // huy moi access token dang con han
    await this.tokens.revokeAllForUser(userId);
    await this.misc.audit({ actorId: userId, action: "user.change_password", entity: "user", entityId: userId, ipHash: meta.ipHash });
  }

  async mergeFavorites(userId: string, ids: number[]) {
    await this.favorites.merge(userId, ids.slice(0, 200));
  }
}

export function validation(issues: { path: PropertyKey[]; message: string }[]): AppError {
  const fields: Record<string, string> = {};
  for (const i of issues) fields[String(i.path[0] ?? "_")] ??= i.message;
  return new AppError("VALIDATION", issues[0]?.message ?? "Dữ liệu không hợp lệ", fields);
}

export { ACCESS_TTL_S };
