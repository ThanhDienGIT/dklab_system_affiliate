import { lookup } from "node:dns/promises";
import net from "node:net";
import { AppError } from "../../domain/errors";

/** Chan SSRF: khong cho fetch toi mang noi bo / loopback / link-local / metadata cloud. */
export function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a = 0, b = 0] = ip.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19)) || a >= 224;
  }
  if (net.isIPv6(ip)) {
    const v = ip.toLowerCase();
    if (v === "::" || v === "::1") return true;
    const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped?.[1]) return isPrivateIp(mapped[1]);
    return /^(fc|fd|fe[89ab])/.test(v) || v.startsWith("ff");
  }
  return true;
}

export async function assertPublicUrl(raw: string): Promise<URL> {
  let u: URL;
  try { u = new URL(raw); } catch { throw new AppError("VALIDATION", "URL không hợp lệ"); }
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new AppError("VALIDATION", "Chỉ hỗ trợ http/https");
  if (u.username || u.password) throw new AppError("VALIDATION", "URL không được chứa tài khoản");
  if (u.port && u.port !== "80" && u.port !== "443") throw new AppError("VALIDATION", "Cổng không được phép");
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) throw new AppError("VALIDATION", "Địa chỉ nội bộ bị chặn");
  const addrs = net.isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => []);
  if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) throw new AppError("VALIDATION", "Không truy cập được địa chỉ này");
  return u;
}

export interface FetchedPage { url: string; html: string }

/** Fetch HTML an toan: kiem tra IP tung buoc redirect, gioi han thoi gian + dung luong, chi nhan text/html. */
export async function fetchHtml(raw: string, opts: { timeoutMs?: number; maxBytes?: number; fetcher?: typeof fetch } = {}): Promise<FetchedPage> {
  const { timeoutMs = 8000, maxBytes = 1_500_000, fetcher = fetch } = opts;
  let url = (await assertPublicUrl(raw)).toString();
  const signal = AbortSignal.timeout(timeoutMs);
  for (let hop = 0; hop <= 3; hop++) {
    const res = await fetcher(url, {
      redirect: "manual", signal, cache: "no-store",
      headers: { "user-agent": "Mozilla/5.0 (compatible; EleonoreBot/1.0)", accept: "text/html,application/xhtml+xml", "accept-language": "vi,en;q=0.8" },
    });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) throw new AppError("VALIDATION", "Redirect không hợp lệ");
      url = (await assertPublicUrl(new URL(loc, url).toString())).toString();
      continue;
    }
    if (!res.ok) throw new AppError("VALIDATION", `Trang trả về HTTP ${res.status}`);
    const type = res.headers.get("content-type") ?? "";
    if (!/text\/html|application\/xhtml/i.test(type)) throw new AppError("VALIDATION", "Không phải trang HTML");
    const reader = res.body?.getReader();
    if (!reader) throw new AppError("VALIDATION", "Trang rỗng");
    const chunks: Uint8Array[] = []; let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) { await reader.cancel(); break; } // du lieu dau trang da du de trich xuat
      chunks.push(value);
    }
    return { url, html: Buffer.concat(chunks).toString("utf8") };
  }
  throw new AppError("VALIDATION", "Quá nhiều lần chuyển hướng");
}
