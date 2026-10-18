/**
 * Dựng lại database từ đầu, an toàn:  pnpm db:setup   (alias: pnpm db:reset)
 *   1) Preflight : kết nối được không? (phân loại lỗi: DNS/IPv6, sai mật khẩu, sai host pooler, SSL...)
 *   2) Inspect   : liệt kê bảng hiện có + số dòng dữ liệu quan trọng
 *   3) Confirm   : nếu đã có bảng -> hỏi xác nhận (gõ XOA) hoặc dùng --yes; production bị chặn trừ khi --allow-production
 *   4) Drop      : xoá bảng/enum trong schema public + schema drizzle (1 transaction, rollback nếu lỗi)
 *   5) Migrate   : chạy lại toàn bộ migration, kiểm tra đủ bảng bắt buộc
 *   6) Seed      : nạp dữ liệu mẫu + tài khoản admin, kiểm tra lại
 * Cờ:  --check (chỉ bước 1-2, không sửa gì) · --yes (bỏ hỏi) · --no-seed · --allow-production
 */
import { createInterface } from "node:readline/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { pgOptions } from "../src/server/db/client";

for (const f of [".env.local", ".env"]) { try { process.loadEnvFile(f); } catch { /* khong co file: dung bien moi truong that */ } }

const args = new Set(process.argv.slice(2));
const CHECK_ONLY = args.has("--check");
const YES = args.has("--yes") || process.env.DB_RESET_YES === "1";
/** Bảng bắt buộc phải có sau migrate (nếu thiếu = migration hỏng giữa chừng) */
const REQUIRED = ["users", "styles", "categories", "products", "product_reviews", "site_settings", "search_logs", "ai_settings", "ai_feature_models", "blog_posts", "blog_post_products"];
/** Bảng dữ liệu quan trọng: đếm để cảnh báo trước khi xoá */
const COUNT = ["users", "products", "product_reviews", "blog_posts", "search_logs"];

const log = (s: string) => console.log(`[db] ${s}`);
const fail = (s: string): never => { console.error(`[db] LỖI: ${s}`); process.exit(1); };

function mask(url: string) {
  try { const u = new URL(url); return `${u.protocol}//${decodeURIComponent(u.username)}:***@${u.host}${u.pathname}`; } catch { return "(URL sai định dạng)"; }
}

/** Dịch lỗi kết nối thành hướng xử lý cụ thể */
function explain(e: unknown): string {
  const err = e as { code?: string; message?: string };
  const m = `${err.code ?? ""} ${err.message ?? ""}`;
  if (/ENOTFOUND|getaddrinfo/.test(m)) return "Không phân giải được host. Nếu dùng db.<ref>.supabase.co (chỉ IPv6) hãy đổi sang Session pooler: aws-0-<region>.pooler.supabase.com:5432, user postgres.<ref>.";
  if (/Tenant or user not found/i.test(m)) return "Sai region/host pooler hoặc sai project ref trong user (postgres.<ref>). Copy lại chuỗi từ Supabase > Connect > Session pooler.";
  if (/28P01|password authentication failed/i.test(m)) return "Sai mật khẩu DB. Ký tự đặc biệt phải URL-encode: # -> %23, @ -> %40, ^ -> %5E, / -> %2F, % -> %25.";
  if (/ETIMEDOUT|ECONNREFUSED|CONNECT_TIMEOUT/.test(m)) return "Không kết nối được (timeout/từ chối). Kiểm tra mạng/firewall, port 5432, project Supabase có đang bị pause không.";
  if (/SSL|certificate/i.test(m)) return "Lỗi SSL. Thử thêm ?sslmode=require vào URL.";
  return err.message ?? String(e);
}

async function confirm(summary: string): Promise<boolean> {
  if (YES) return true;
  if (!process.stdin.isTTY) { console.error("[db] Không có terminal để hỏi xác nhận. Chạy lại với --yes nếu chắc chắn muốn xoá."); return false; }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const a = await rl.question(`${summary}\n=> Gõ XOA để xoá toàn bộ và tạo lại (Enter = huỷ): `);
  rl.close();
  return a.trim() === "XOA";
}

async function main() {
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!url) return fail("Thiếu DATABASE_URL (hoặc DIRECT_URL) trong .env.local");
  if (process.env.NODE_ENV === "production" && !args.has("--allow-production") && !CHECK_ONLY) {
    return fail("NODE_ENV=production: từ chối xoá database. Thêm --allow-production nếu thật sự muốn.");
  }
  log(`Kết nối: ${mask(url)}`);
  const sql = postgres(url, { ...pgOptions(url), max: 1, prepare: false, connect_timeout: 12, onnotice: () => {} });

  try {
    // ---- 1) Preflight ----
    try {
      const [v] = await sql<{ v: string }[]>`select current_setting('server_version') as v`;
      log(`Kết nối OK (PostgreSQL ${v?.v}).`);
    } catch (e) { return fail(`Không kết nối được. ${explain(e)}`); }

    // Khoá cố vấn: tránh 2 lần chạy cùng lúc phá nhau
    const [lock] = await sql<{ ok: boolean }[]>`select pg_try_advisory_lock(727001) as ok`;
    if (!lock?.ok) return fail("Có tiến trình db:setup khác đang chạy trên database này.");

    // ---- 2) Inspect ----
    const tables = (await sql<{ t: string }[]>`select tablename as t from pg_tables where schemaname = 'public' order by 1`).map((r) => r.t);
    const hasDrizzle = ((await sql`select 1 from information_schema.schemata where schema_name = 'drizzle'`).length) > 0;
    const counts: string[] = [];
    for (const t of COUNT.filter((x) => tables.includes(x))) {
      const [r] = await sql.unsafe(`select count(*)::int as n from "public"."${t}"`) as unknown as { n: number }[];
      counts.push(`${t}=${r?.n ?? 0}`);
    }
    const missing = REQUIRED.filter((t) => !tables.includes(t));
    log(tables.length ? `Đang có ${tables.length} bảng trong public: ${tables.join(", ")}` : "Database trống (chưa có bảng nào trong public).");
    if (counts.length) log(`Số dòng: ${counts.join(", ")}`);
    if (tables.length && missing.length) log(`Thiếu so với bản mới: ${missing.join(", ")}`);
    if (CHECK_ONLY) { log("Chế độ --check: không thay đổi gì."); return; }

    // ---- 3) Confirm ----
    if (tables.length || hasDrizzle) {
      const ok = await confirm(`\nCẢNH BÁO: sẽ XOÁ ${tables.length} bảng${counts.length ? ` (${counts.join(", ")})` : ""} và lịch sử migration.\nDatabase: ${mask(url)}`);
      if (!ok) { log("Đã huỷ, không có gì bị thay đổi."); process.exitCode = 2; return; }

      // ---- 4) Drop (1 transaction: lỗi thì rollback, không để DB nửa vời) ----
      await sql.begin(async (tx) => {
        for (const t of tables) await tx.unsafe(`drop table if exists "public"."${t}" cascade`);
        const enums = await tx<{ n: string }[]>`
          select t.typname as n from pg_type t join pg_namespace s on s.oid = t.typnamespace
          where s.nspname = 'public' and t.typtype = 'e'`;
        for (const e of enums) await tx.unsafe(`drop type if exists "public"."${e.n}" cascade`);
        await tx.unsafe(`drop schema if exists "drizzle" cascade`);
      });
      const left = await sql`select 1 from pg_tables where schemaname = 'public'`;
      if (left.length) return fail(`Xoá chưa sạch (${left.length} bảng còn lại).`);
      log("Đã xoá bảng cũ.");
    }

    // ---- 5) Migrate + verify ----
    await migrate(drizzle(sql), { migrationsFolder: path.resolve("drizzle") });
    const after = (await sql<{ t: string }[]>`select tablename as t from pg_tables where schemaname = 'public'`).map((r) => r.t);
    const lack = REQUIRED.filter((t) => !after.includes(t));
    if (lack.length) return fail(`Migration xong nhưng thiếu bảng: ${lack.join(", ")}`);
    const noRls = await sql<{ t: string }[]>`select relname as t from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`;
    if (noRls.length) log(`Lưu ý: bảng chưa bật RLS: ${noRls.map((r) => r.t).join(", ")}`);
    log(`Đã tạo ${after.length} bảng.`);
  } finally {
    await sql`select pg_advisory_unlock(727001)`.catch(() => undefined);
    await sql.end({ timeout: 3 });
  }

  // ---- 6) Seed + verify ----
  if (args.has("--no-seed")) { log("Bỏ qua seed (--no-seed)."); return; }
  const r = spawnSync("npx", ["tsx", "scripts/seed.ts"], { stdio: "inherit", shell: process.platform === "win32" });
  if (r.status !== 0) return fail("Seed thất bại (bảng đã tạo xong; chạy lại: pnpm db:seed).");
  const v = postgres(url, { ...pgOptions(url), max: 1, prepare: false, onnotice: () => {} });
  try {
    const [c] = await v<{ s: number; p: number; u: number }[]>`select (select count(*) from styles)::int s, (select count(*) from products)::int p, (select count(*) from users)::int u`;
    if (!c || c.s === 0 || c.u === 0) return fail("Seed xong nhưng thiếu dữ liệu (styles/users).");
    log(`HOÀN TẤT: ${c.s} phong cách, ${c.p} sản phẩm, ${c.u} người dùng. Chạy: pnpm dev`);
  } finally { await v.end({ timeout: 3 }); }
}
main().catch((e) => fail(explain(e)));
