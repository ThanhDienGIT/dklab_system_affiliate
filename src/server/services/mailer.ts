import nodemailer from "nodemailer";
import { env } from "../config/env";
import { AppError } from "../domain/errors";

export interface Mail { to: string; subject: string; html: string; text: string }
export interface Mailer { readonly name: string; send(m: Mail): Promise<void> }

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

async function post(url: string, headers: Record<string, string>, body: unknown, label: string) {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body), signal: AbortSignal.timeout(10_000) });
  if (!res.ok) {
    const t = (await res.text().catch(() => "")).slice(0, 200);
    console.error(`[mail] ${label} loi ${res.status}: ${t}`);
    throw new AppError("INTERNAL", `Không gửi được email (${label} HTTP ${res.status})`);
  }
}

/** Brevo (300 mail/ngay mien phi, chi can xac minh 1 dia chi gui, KHONG can ten mien, gui toi bat ky email nao) */
export function brevo(key: string, from: string, fromName: string): Mailer {
  return { name: "brevo", send: (m) => post("https://api.brevo.com/v3/smtp/email", { "api-key": key },
    { sender: { email: from, name: fromName }, to: [{ email: m.to }], subject: m.subject, htmlContent: m.html, textContent: m.text }, "Brevo") };
}

/** Resend (3000 mail/thang). Chua xac minh ten mien chi gui duoc toi email chu tai khoan. */
export function resend(key: string, from: string, fromName: string): Mailer {
  return { name: "resend", send: (m) => post("https://api.resend.com/emails", { authorization: `Bearer ${key}` },
    { from: `${fromName} <${from}>`, to: [m.to], subject: m.subject, html: m.html, text: m.text }, "Resend") };
}

/** Gmail SMTP (App Password, ~500 mail/ngay). Chay duoc tren Vercel (nodejs runtime). */
export function gmail(user: string, pass: string, fromName: string): Mailer {
  const t = nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user, pass }, connectionTimeout: 10_000, socketTimeout: 15_000 });
  return { name: "gmail", async send(m) {
    try { await t.sendMail({ from: `"${fromName}" <${user}>`, to: m.to, subject: m.subject, html: m.html, text: m.text }); }
    catch (e) { console.error("[mail] gmail loi:", e instanceof Error ? e.message : e); throw new AppError("INTERNAL", "Không gửi được email qua Gmail (kiểm tra App Password)"); }
  } };
}

/** Chon nha cung cap theo EMAIL_PROVIDER, hoac khoa nao dang co. null = chua cau hinh. */
export function mailerFromEnv(): Mailer | null {
  const e = env();
  const from = e.MAIL_FROM ?? e.GMAIL_USER ?? "";
  const want = e.EMAIL_PROVIDER;
  if ((!want || want === "brevo") && e.BREVO_API_KEY && from) return brevo(e.BREVO_API_KEY, from, e.MAIL_FROM_NAME);
  if ((!want || want === "resend") && e.RESEND_API_KEY && from) return resend(e.RESEND_API_KEY, from, e.MAIL_FROM_NAME);
  if ((!want || want === "gmail") && e.GMAIL_USER && e.GMAIL_APP_PASSWORD) return gmail(e.GMAIL_USER, e.GMAIL_APP_PASSWORD.replace(/\s+/g, ""), e.MAIL_FROM_NAME);
  return null;
}

export function verifyEmail(name: string, link: string, brand: string): Pick<Mail, "subject" | "html" | "text"> {
  const n = esc(name || "bạn"), b = esc(brand), l = esc(link);
  return {
    subject: `Xác thực email tài khoản ${brand}`,
    text: `Chào ${name || "bạn"},\n\nBấm vào liên kết sau để xác thực email (hiệu lực 24 giờ):\n${link}\n\nNếu bạn không đăng ký, hãy bỏ qua email này.\n— ${brand}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#1a1a1a">
<h2 style="font-weight:600">Xác thực email của bạn</h2>
<p>Chào ${n},</p><p>Cảm ơn bạn đã đăng ký tại <b>${b}</b>. Bấm nút bên dưới để xác thực email (hiệu lực 24 giờ).</p>
<p style="margin:28px 0"><a href="${l}" style="background:#1a1a1a;color:#fff;padding:14px 28px;text-decoration:none;display:inline-block">Xác thực email</a></p>
<p style="font-size:13px;color:#666">Hoặc dán liên kết này vào trình duyệt:<br><span style="word-break:break-all">${l}</span></p>
<p style="font-size:13px;color:#666">Nếu bạn không đăng ký, hãy bỏ qua email này.</p></div>`,
  };
}
