import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import path from "node:path";
import { pgOptions } from "../src/server/db/client";

for (const f of [".env.local", ".env"]) { try { process.loadEnvFile(f); } catch { /* khong co file: dung bien moi truong that */ } }

async function main() {
  // DIRECT_URL (ket noi truc tiep / Session pooler :5432) uu tien cho migration; khong co thi dung DATABASE_URL
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!url) throw new Error("Thiếu DATABASE_URL (hoặc DIRECT_URL)");
  const sql = postgres(url, { ...pgOptions(url), max: 1, onnotice: () => {} });
  try {
    await migrate(drizzle(sql), { migrationsFolder: path.resolve("drizzle") });
    const ext = await sql`select extname from pg_extension where extname in ('unaccent','pg_trgm') order by 1`;
    console.log(`[migrate] OK. extension: ${ext.map((e) => e.extname).join(", ")}`);
  } finally {
    await sql.end();
  }
}
main().catch((e) => { console.error("[migrate] LỖI:", e.message); process.exit(1); });
