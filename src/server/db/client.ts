import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Db = ReturnType<typeof createDb>["db"];

/** Supabase/Neon bat buoc TLS: tu bat khi URL tro toi *.supabase.* hoac *.pooler.* ma chua tu khai bao sslmode. */
export function pgOptions(url: string): { ssl?: "require" } {
  if (/[?&]sslmode=/.test(url)) return {};
  try {
    const host = new URL(url).hostname;
    if (/(^|\.)supabase\.(co|com)$/.test(host) || host.includes("pooler.supabase")) return { ssl: "require" };
  } catch { /* URL sai: de postgres.js bao loi */ }
  return {};
}

export function createDb(url: string, max = 5) {
  // prepare:false -> tuong thich PgBouncer (transaction mode) / Neon pooler
  const sql = postgres(url, { ...pgOptions(url), max, prepare: false, idle_timeout: 20, connect_timeout: 10, onnotice: () => {} });
  return { sql, db: drizzle(sql, { schema }) };
}

const g = globalThis as unknown as { __eleonoreDb?: ReturnType<typeof createDb> };

/** 1 pool cho ca tien trinh (giu qua HMR khi dev) */
export function getDb(url: string, max: number): Db {
  g.__eleonoreDb ??= createDb(url, max);
  return g.__eleonoreDb.db;
}
