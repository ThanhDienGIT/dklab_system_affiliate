import type { UserRepository, MiscRepository } from "../repositories/user.repo";
import type { UserRow } from "../domain/types";
import { signVerifyToken, verifyVerifyToken } from "../security/email-token";
import { limit } from "../security/rate-limit";
import { verifyEmail, type Mailer } from "./mailer";

export type ConfirmStatus = "ok" | "already" | "expired" | "invalid";
export interface SendResult { sent: boolean; reason?: "no_provider" | "already_verified" | "failed" | "cooldown" }

/** Xac thuc email bang link ky so (khong luu DB). Gui mail loi KHONG lam hong dang ky - nguoi dung bam "Gui lai". */
export class VerificationService {
  constructor(
    private users: Pick<UserRepository, "findById" | "update">,
    private misc: Pick<MiscRepository, "audit">,
    private getMailer: () => Mailer | null,
    private cfg: () => { appUrl: string; brand: string },
  ) {}

  enabled() { return this.getMailer() !== null; }

  async send(user: Pick<UserRow, "id" | "email" | "fullName" | "emailVerified">, opts: { throttle?: boolean } = {}): Promise<SendResult> {
    if (user.emailVerified) return { sent: false, reason: "already_verified" };
    const mailer = this.getMailer();
    if (!mailer) return { sent: false, reason: "no_provider" };
    const email = user.email.toLowerCase();
    if (opts.throttle !== false) {
      // 1 mail / 5 phut va toi da 5 mail / gio cho moi dia chi -> khong bi lam dung de spam hop thu nguoi khac
      if (!(await limit(`vmail:cd:${email}`, 1, 300_000)).ok || !(await limit(`vmail:h:${email}`, 5, 3_600_000)).ok) return { sent: false, reason: "cooldown" };
    }
    const { appUrl, brand } = this.cfg();
    const link = `${appUrl.replace(/\/$/, "")}/xac-thuc-email?token=${encodeURIComponent(await signVerifyToken(user.id, email))}`;
    try {
      await Promise.race([
        mailer.send({ to: user.email, ...verifyEmail(user.fullName, link, brand) }),
        new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 9000)),
      ]);
      return { sent: true };
    } catch (e) {
      console.error("[verify-email] gui that bai:", e instanceof Error ? e.message : e);
      return { sent: false, reason: "failed" };
    }
  }

  async confirm(token: string): Promise<ConfirmStatus> {
    const r = await verifyVerifyToken(token);
    if (!r.ok) return r.reason;
    const u = await this.users.findById(r.userId);
    if (!u || u.email.toLowerCase() !== r.email) return "invalid"; // tai khoan bi xoa / doi email
    if (u.emailVerified) return "already";
    await this.users.update(u.id, { emailVerified: true });
    await this.misc.audit({ actorId: u.id, action: "user.verify_email", entity: "user", entityId: u.id });
    return "ok";
  }
}
