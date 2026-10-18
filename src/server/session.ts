import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_ACCESS, COOKIE_REFRESH } from "@/lib/constants";
import { env, isHttps } from "./config/env";
import { verifyAccessToken, ACCESS_TTL_S, type AccessClaims } from "./security/jwt";
import { can, type Permission } from "./security/rbac";
import { getContainer } from "./container";
import type { UserRow } from "./domain/types";
import { AppError } from "./domain/errors";

const base = () => ({ httpOnly: true, sameSite: "lax" as const, secure: isHttps(), path: "/" });

export async function setAuthCookies(access: string, refresh: string, refreshExpiresAt: Date) {
  const c = await cookies();
  // access cookie song lau hon JWT mot chut de proxy con doc duoc "het han" va chuyen sang refresh
  c.set(COOKIE_ACCESS, access, { ...base(), maxAge: ACCESS_TTL_S + 60 });
  c.set(COOKIE_REFRESH, refresh, { ...base(), expires: refreshExpiresAt });
}

export async function clearAuthCookies() {
  const c = await cookies();
  c.delete(COOKIE_ACCESS);
  c.delete(COOKIE_REFRESH);
}

export async function readRefreshToken() {
  return (await cookies()).get(COOKIE_REFRESH)?.value;
}

export const getClaims = cache(async (): Promise<AccessClaims | null> => {
  const r = await verifyAccessToken((await cookies()).get(COOKIE_ACCESS)?.value);
  return r.ok ? r.claims : null;
});

/** Tai nguoi dung tu DB va doi chieu token_version/status (huy quyen co hieu luc ngay) */
export const currentUser = cache(async (): Promise<UserRow | null> => {
  const claims = await getClaims();
  if (!claims) return null;
  const u = await getContainer().users.findById(claims.sub);
  if (!u || u.status !== "active" || u.tokenVersion !== claims.tv) return null;
  return u;
});

export async function requireUser(next = "/tai-khoan"): Promise<UserRow> {
  const u = await currentUser();
  if (!u) redirect(`/dang-nhap?next=${encodeURIComponent(next)}`);
  return u;
}

export async function requirePermission(perm: Permission, next = "/admin"): Promise<UserRow> {
  const u = await requireUser(next);
  if (!can(u.role, perm)) redirect("/?forbidden=1");
  return u;
}

/** Chi cho phep duong dan noi bo (chong open-redirect) */
export function safeNext(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}

export const appUrl = () => env().APP_URL.replace(/\/$/, "");

/** Dung trong API route: nem AppError (JSON 401/403) thay vi redirect */
export async function requirePermissionApi(perm: Permission): Promise<UserRow> {
  const u = await currentUser();
  if (!u) throw new AppError("UNAUTHORIZED", "Bạn cần đăng nhập");
  if (!can(u.role, perm)) throw new AppError("FORBIDDEN", "Bạn không có quyền thực hiện thao tác này");
  return u;
}
