import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number, opts: object) => Promise<Buffer>;
const N = 16384, R = 8, P = 1, KEYLEN = 64;

/** scrypt (Node built-in, khong can native module) - dinh dang: scrypt$N$r$p$salt$hash */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const dk = await scrypt(password, salt, KEYLEN, { N, r: R, p: P, maxmem: 64 * 1024 * 1024 });
  return ["scrypt", N, R, P, salt.toString("base64"), dk.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return false;
  const [kind, n, r, p, saltB64, hashB64] = stored.split("$");
  if (kind !== "scrypt" || !n || !r || !p || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64");
  const dk = await scrypt(password, Buffer.from(saltB64, "base64"), expected.length, {
    N: Number(n), r: Number(r), p: Number(p), maxmem: 64 * 1024 * 1024,
  });
  return dk.length === expected.length && timingSafeEqual(dk, expected);
}

/** >= 8 ky tu, co chu va so */
export function passwordIssue(pw: string): string | null {
  if (pw.length < 8) return "Mật khẩu tối thiểu 8 ký tự";
  if (pw.length > 128) return "Mật khẩu quá dài";
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return "Mật khẩu cần có cả chữ và số";
  return null;
}
