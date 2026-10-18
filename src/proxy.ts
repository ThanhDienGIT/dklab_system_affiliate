import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_ACCESS, COOKIE_REFRESH } from "@/lib/constants";
import { verifyAccessToken } from "@/server/security/jwt";
import { ban, isBanned, limit } from "@/server/security/rate-limit";

/* ---- Gioi han toc do toan cuc (lop 1: chan tool spam / DoS muc ung dung) ----
 * Moi IP: trang HTML 180 req/phut, API doc 240 req/phut, API ghi (POST/PUT/PATCH/DELETE) 60 req/phut.
 * Vuot 5 lan trong 10 phut -> chan IP 15 phut (tra 429 ngay, khong cham toi DB). Bo dem dung chung qua Upstash neu co. */
const PAGE_LIMIT = 180, API_READ_LIMIT = 240, API_WRITE_LIMIT = 60;
const ipOf = (req: NextRequest) => {
  if (process.env.TRUST_PROXY === "false") return "unknown";
  return (req.headers.get("x-forwarded-for")?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "unknown").trim();
};
const tooMany = (retry: number, api: boolean) => api
  ? NextResponse.json({ error: { code: "RATE_LIMITED", message: "Bạn gửi yêu cầu quá nhanh, vui lòng thử lại sau" } }, { status: 429, headers: { "retry-after": String(retry) } })
  : new NextResponse("Bạn gửi yêu cầu quá nhanh, vui lòng thử lại sau ít phút.", { status: 429, headers: { "retry-after": String(retry), "content-type": "text/plain; charset=utf-8" } });

async function guard(req: NextRequest): Promise<NextResponse | null> {
  const { pathname } = req.nextUrl;
  if (pathname === "/api/health" || pathname.startsWith("/api/health/")) return null;
  const isApi = pathname.startsWith("/api/");
  const purpose = req.headers.get("next-router-prefetch") || req.headers.get("purpose") === "prefetch";
  if (!isApi && (purpose || !(req.headers.get("accept") ?? "").includes("text/html"))) return null; // chi dem request tai trang that
  const ip = ipOf(req);
  if (ip === "unknown") return null;
  const banned = isBanned(ip);
  if (banned) return tooMany(banned, isApi);
  const write = isApi && req.method !== "GET" && req.method !== "HEAD";
  const [scope, max] = !isApi ? ["pg", PAGE_LIMIT] as const : write ? ["aw", API_WRITE_LIMIT] as const : ["ar", API_READ_LIMIT] as const;
  const r = await limit(`g:${scope}:${ip}`, max, 60_000);
  if (r.ok) return null;
  if (!(await limit(`strike:${ip}`, 5, 10 * 60_000)).ok) ban(ip, 15 * 60_000);
  return tooMany(r.retryAfterS, isApi);
}

/**
 * Proxy (Next 16, thay middleware):
 * - Trang can dang nhap (/tai-khoan, /admin): khong co phien hop le -> /dang-nhap
 * - Access token het han nhung con refresh token -> /api/auth/refresh roi quay lai (gia han im lang)
 * Phan quyen chi tiet (role) van duoc kiem tra lai o server (requirePermission), proxy chi la lop dau.
 */
export async function proxy(req: NextRequest) {
  const blocked = await guard(req);
  if (blocked) return blocked;
  if (req.nextUrl.pathname.startsWith("/api/")) return NextResponse.next(); // phan quyen API xu ly o tung route
  if (req.method !== "GET") return NextResponse.next();
  const { pathname, search } = req.nextUrl;
  // Trang that (F5) VA dieu huong mem cua Next (RSC; Next xoa header "rsc" khi vao proxy nen khong phan biet duoc,
  // accept chi la */*): ca hai deu phai duoc gia han phien im lang, neu khong access token het han (15 phut)
  // se day nguoi dung ve /dang-nhap khi bam chuyen trang. Tai nguyen tinh da bi matcher loai tru (co dau cham).
  const isDocument = (req.headers.get("accept") ?? "").includes("text/html") || req.headers.get("sec-fetch-dest") === "document";
  const purpose = req.headers.get("next-router-prefetch") || req.headers.get("purpose") === "prefetch";
  if (purpose) return NextResponse.next();

  const needAuth = pathname.startsWith("/tai-khoan") || pathname.startsWith("/admin");
  // dieu huong mem (RSC) toi trang cong khai: khong can gia han (tranh xoay token hang loat khi prefetch)
  if (!isDocument && !needAuth) return NextResponse.next();
  const hasRefresh = req.cookies.has(COOKIE_REFRESH);
  const access = await verifyAccessToken(req.cookies.get(COOKIE_ACCESS)?.value);
  if (access.ok) return NextResponse.next();

  const back = pathname + search;
  if (hasRefresh) {
    const u = req.nextUrl.clone();
    u.pathname = "/api/auth/refresh";
    u.search = `?next=${encodeURIComponent(back)}`;
    return NextResponse.redirect(u);
  }
  if (needAuth) {
    const u = req.nextUrl.clone();
    u.pathname = "/dang-nhap";
    u.search = `?next=${encodeURIComponent(back)}`;
    return NextResponse.redirect(u);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|media|brand|uploads|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)"],
};
