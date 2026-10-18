import { sql } from "drizzle-orm";
import { getContainer } from "@/server/container";

export const dynamic = "force-dynamic";

/** Healthcheck cho Docker/uptime monitor: kiem tra ca ket noi DB */
export async function GET() {
  try {
    await getContainer().db.execute(sql`select 1`);
    return Response.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ ok: false }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
