import { z } from "zod";
import { api, assertSameOrigin, json, readJson } from "@/server/http";
import { getContainer } from "@/server/container";
import { AppError } from "@/server/domain/errors";
import { enforceRate } from "@/server/security/rate-limit";
import { currentUser } from "@/server/session";

/**
 * Gui lai email xac thuc. Da dang nhap -> gui cho chinh minh. Chua dang nhap -> can email; luon tra cung 1 ket qua
 * (khong lo email nao co tai khoan). Gioi han theo IP + theo dia chi email (xem VerificationService.send).
 */
export const POST = api(async (req: Request) => {
  assertSameOrigin(req);
  await enforceRate("resend-verify", 10, 3_600_000);
  const c = getContainer();
  if (!c.verification.enabled()) throw new AppError("VALIDATION", "Hệ thống chưa cấu hình gửi email. Liên hệ quản trị viên.");
  const me = await currentUser().catch(() => null);
  if (me) {
    if (me.emailVerified) return json({ ok: true, already: true });
    const r = await c.verification.send(me);
    if (r.reason === "cooldown") throw new AppError("RATE_LIMITED", "Vừa gửi email xong, vui lòng đợi 5 phút rồi bấm gửi lại.");
    if (!r.sent) throw new AppError("INTERNAL", "Không gửi được email, vui lòng thử lại sau.");
    return json({ ok: true });
  }
  const { email } = z.object({ email: z.string().trim().toLowerCase().email().max(254) }).parse(await readJson(req));
  const u = await c.users.findByEmail(email);
  if (u && !u.emailVerified) await c.verification.send(u);
  return json({ ok: true });
});
