import type { UserRepository, MiscRepository } from "../repositories/user.repo";
import type { ProfileDTO, UserRow } from "../domain/types";
import { AppError } from "../domain/errors";
import { profileSchema } from "../domain/validators";
import { decryptPii, encryptPii, maskCccd } from "../security/pii";
import { can, type Role } from "../security/rbac";
import { validation } from "./auth.service";

export function toProfile(u: UserRow, styleIds: number[]): ProfileDTO {
  return {
    id: u.id, email: u.email, role: u.role, fullName: u.fullName, phone: u.phone, birthDate: u.birthDate, gender: u.gender,
    province: u.province, addressLine: u.addressLine, size: u.size, heightCm: u.heightCm, budgetMax: u.budgetMax,
    avatarUrl: u.avatarUrl, cccdMasked: maskCccd(u.cccdLast4), hasCccd: Boolean(u.cccdEnc), newsletter: u.newsletter,
    styleIds, emailVerified: u.emailVerified, hasPassword: Boolean(u.passwordHash), hasGoogle: Boolean(u.googleSub), createdAt: u.createdAt.toISOString(),
  };
}

export class ProfileService {
  constructor(private users: UserRepository, private misc: MiscRepository) {}

  async get(userId: string): Promise<ProfileDTO> {
    const u = await this.users.findById(userId);
    if (!u) throw new AppError("NOT_FOUND", "Không tìm thấy tài khoản");
    return toProfile(u, await this.users.styleIds(userId));
  }

  async update(userId: string, raw: unknown, opts: { clearCccd?: boolean; ipHash?: string } = {}): Promise<ProfileDTO> {
    const parsed = profileSchema.safeParse(raw);
    if (!parsed.success) throw validation(parsed.error.issues);
    const v = parsed.data;
    const u = await this.users.findById(userId);
    if (!u) throw new AppError("NOT_FOUND", "Không tìm thấy tài khoản");

    const patch: Parameters<UserRepository["update"]>[1] = {
      fullName: v.fullName, phone: v.phone, birthDate: v.birthDate, gender: v.gender, province: v.province,
      addressLine: v.addressLine, size: v.size, heightCm: v.heightCm, budgetMax: v.budgetMax, newsletter: v.newsletter,
    };
    if (opts.clearCccd) { patch.cccdEnc = null; patch.cccdLast4 = null; }
    else if (v.cccd) {
      if (!u.consentAt && !v.consent) throw new AppError("VALIDATION", "Cần đồng ý chính sách xử lý dữ liệu cá nhân để lưu CCCD", { cccd: "Cần đồng ý chính sách dữ liệu cá nhân" });
      patch.cccdEnc = encryptPii(v.cccd);
      patch.cccdLast4 = v.cccd.slice(-4);
      await this.misc.audit({ actorId: userId, action: "pii.cccd.set", entity: "user", entityId: userId, ipHash: opts.ipHash });
    }
    if (v.consent && !u.consentAt) patch.consentAt = new Date();
    await this.users.update(userId, patch);
    await this.users.setStyles(userId, v.styleIds);
    return this.get(userId);
  }

  async setAvatar(userId: string, url: string | null) {
    await this.users.update(userId, { avatarUrl: url });
  }

  /** Chi admin; luon ghi audit log */
  async revealCccd(actor: { id: string; role: Role }, targetId: string, ipHash?: string): Promise<string | null> {
    if (!can(actor.role, "pii.reveal")) throw new AppError("FORBIDDEN", "Không có quyền xem CCCD");
    const u = await this.users.findById(targetId);
    if (!u?.cccdEnc) return null;
    await this.misc.audit({ actorId: actor.id, action: "pii.cccd.reveal", entity: "user", entityId: targetId, ipHash });
    return decryptPii(u.cccdEnc);
  }

  async setRole(actor: { id: string; role: Role }, targetId: string, role: Role, status: "active" | "blocked") {
    if (!can(actor.role, "user.manage")) throw new AppError("FORBIDDEN", "Không có quyền quản lý người dùng");
    if (actor.id === targetId && (role !== "admin" || status !== "active")) throw new AppError("VALIDATION", "Không thể tự hạ quyền hoặc khóa chính mình");
    await this.users.update(targetId, { role, status });
    await this.users.bumpTokenVersion(targetId);
    await this.misc.audit({ actorId: actor.id, action: "user.update_role", entity: "user", entityId: targetId, meta: { role, status } });
  }
}
