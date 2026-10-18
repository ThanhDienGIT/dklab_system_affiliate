import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { AppError, isAppError } from "../domain/errors";
import { currentUser, requirePermissionApi } from "../session";
import type { Permission } from "../security/rbac";
import type { UserRow } from "../domain/types";

export const json = (data: unknown, init?: number | ResponseInit) =>
  NextResponse.json(data, typeof init === "number" ? { status: init } : init);

export function errorResponse(e: unknown) {
  if (isAppError(e)) {
    return NextResponse.json(
      { error: { code: e.code, message: e.message, fields: e.fields } },
      { status: e.status, headers: e.code === "RATE_LIMITED" ? { "retry-after": "30" } : undefined },
    );
  }
  if (e instanceof z.ZodError) {
    return NextResponse.json({ error: { code: "VALIDATION", message: e.issues[0]?.message ?? "Dữ liệu không hợp lệ" } }, { status: 400 });
  }
  console.error("[api]", e);
  return NextResponse.json({ error: { code: "INTERNAL", message: "Có lỗi xảy ra, vui lòng thử lại" } }, { status: 500 });
}

/** Boc handler: bat loi -> JSON thong nhat, khong lo stack trace ra ngoai */
export function api<A extends unknown[]>(fn: (...a: A) => Promise<Response>) {
  return async (...a: A): Promise<Response> => {
    try { return await fn(...a); } catch (e) { return errorResponse(e); }
  };
}

const MAX_JSON_BYTES = 1_000_000; // 1MB: du cho import JSON vua; chan body khong lo gay dau bo nho
export async function readJson(req: Request, maxBytes = MAX_JSON_BYTES): Promise<unknown> {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > maxBytes) throw new AppError("VALIDATION", "Dữ liệu gửi lên quá lớn");
  try {
    const text = await req.text();
    if (text.length > maxBytes) throw new Error("big");
    return JSON.parse(text);
  } catch { throw new AppError("VALIDATION", "Dữ liệu gửi lên không hợp lệ"); }
}

/** Chong CSRF cho request doi du lieu: yeu cau cung origin (cookie da la SameSite=Lax) */
export function assertSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  let ok = false;
  try { ok = new URL(origin).host === host; } catch { /* ignore */ }
  if (!ok) throw new AppError("FORBIDDEN", "Nguồn yêu cầu không hợp lệ");
}

export async function requireApiUser(): Promise<UserRow> {
  const u = await currentUser();
  if (!u) throw new AppError("UNAUTHORIZED", "Bạn cần đăng nhập");
  return u;
}
export { requirePermissionApi };

/** Admin sua du lieu -> xoa cache doc ngay lap tuc */
export const bustCatalog = () => revalidateTag("catalog", { expire: 0 });
