import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { env } from "../config/env";

/** CCCD la du lieu dinh danh ca nhan -> ma hoa AES-256-GCM khi luu (Luat BVDLCN 91/2025/QH15). */
function key(): Buffer {
  const raw = Buffer.from(env().PII_ENCRYPTION_KEY, "base64");
  if (raw.length !== 32) throw new Error("[eleonore] PII_ENCRYPTION_KEY phải là base64 của đúng 32 byte (openssl rand -base64 32)");
  return raw;
}

const b64u = (b: Buffer) => b.toString("base64url");

export function encryptPii(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", b64u(iv), b64u(c.getAuthTag()), b64u(enc)].join(".");
}

export function decryptPii(token: string): string {
  const [v, iv, tag, data] = token.split(".");
  if (v !== "v1" || !iv || !tag || !data) throw new Error("PII token sai định dạng");
  const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([d.update(Buffer.from(data, "base64url")), d.final()]).toString("utf8");
}

export const maskCccd = (last4: string | null | undefined) => (last4 ? `••••••••${last4}` : "");

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
export const hashIp = (ip: string) => sha256(`${env().AUTH_SECRET}|ip|${ip}`).slice(0, 32);
