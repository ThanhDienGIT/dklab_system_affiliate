import { headers } from "next/headers";
import { env } from "../config/env";
import { hashIp } from "./pii";
import { AppError } from "../domain/errors";

/**
 * Gioi han toc do theo cua so truot, luu trong bo nho tien trinh.
 * Dung khi chay MOT instance (1 VPS / 1 container). Nhieu instance hoac serverless -> doi sang Redis/Upstash.
 */
const buckets = new Map<string, number[]>();
let lastSweep = Date.now();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterS: number } {
  const now = Date.now();
  if (now - lastSweep > 60_000) {
    lastSweep = now;
    for (const [k, v] of buckets) if (!v.length || now - (v[v.length - 1] ?? 0) > 15 * 60_000) buckets.delete(k);
  }
  const arr = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= limit) {
    buckets.set(key, arr);
    return { ok: false, retryAfterS: Math.ceil((windowMs - (now - (arr[0] ?? now))) / 1000) };
  }
  arr.push(now);
  buckets.set(key, arr);
  return { ok: true, retryAfterS: 0 };
}

/* ---------- Gioi han toc do dung chung (Upstash Redis REST) ----------
 * Fixed window: INCR + PEXPIRE NX. Loi/timeout Redis -> tu dong fail-open sang bo nho (khong lam sap site vi Redis). */
let redisDownUntil = 0;
async function redisHit(key: string, limit: number, windowMs: number): Promise<{ ok: boolean; retryAfterS: number } | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL, token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token || Date.now() < redisDownUntil) return null;
  try {
    const k = `rl:${key}`;
    const res = await fetch(`${url.replace(/\/$/, "")}/pipeline`, {
      method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify([["INCR", k], ["PEXPIRE", k, String(windowMs), "NX"], ["PTTL", k]]),
      signal: AbortSignal.timeout(800), cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const r = (await res.json()) as { result?: number }[];
    const n = Number(r[0]?.result ?? 0), ttl = Number(r[2]?.result ?? windowMs);
    return n > limit ? { ok: false, retryAfterS: Math.max(1, Math.ceil(ttl / 1000)) } : { ok: true, retryAfterS: 0 };
  } catch (e) {
    redisDownUntil = Date.now() + 30_000;
    console.error("[rate-limit] Redis loi, dung bo nho 30s:", e instanceof Error ? e.message : e);
    return null;
  }
}

/** Gioi han toc do (async). Co Upstash -> chung moi instance; khong -> theo bo nho tien trinh. */
export async function limit(key: string, max: number, windowMs: number): Promise<{ ok: boolean; retryAfterS: number }> {
  return (await redisHit(key, max, windowMs)) ?? rateLimit(key, max, windowMs);
}

/* ---------- Chan IP lap lai vi pham ---------- */
const bans = new Map<string, number>();
export function isBanned(ip: string): number {
  const t = bans.get(ip);
  if (!t) return 0;
  if (t <= Date.now()) { bans.delete(ip); return 0; }
  return Math.ceil((t - Date.now()) / 1000);
}
export function ban(ip: string, ms: number) {
  if (bans.size > 5000) bans.clear();
  bans.set(ip, Date.now() + ms);
}

export function clientIp(h: Headers): string {
  if (env().TRUST_PROXY === "true") {
    const xff = h.get("x-forwarded-for");
    if (xff) return xff.split(",")[0]!.trim();
    const real = h.get("x-real-ip");
    if (real) return real.trim();
  }
  return "unknown";
}

export async function requestMeta() {
  const h = await headers();
  const ip = clientIp(h);
  return { ip, ipHash: hashIp(ip), userAgent: (h.get("user-agent") ?? "").slice(0, 200) };
}

export async function enforceRate(scope: string, max: number, windowMs: number) {
  const { ip } = await requestMeta();
  const r = await limit(`${scope}:${ip}`, max, windowMs);
  if (!r.ok) throw new AppError("RATE_LIMITED", `Thao tác quá nhanh, thử lại sau ${r.retryAfterS}s`);
}
