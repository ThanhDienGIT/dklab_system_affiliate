import { supabasePublic } from "@/server/supabase";

export const dynamic = "force-dynamic";

/** Kiem tra tich hop Supabase + RLS: danh muc doc duoc bang publishable key, bang rieng tu (users...) phai bi khoa. Chi tra boolean. */
export async function GET() {
  const sb = supabasePublic();
  if (!sb) return Response.json({ configured: false }, { headers: { "cache-control": "no-store" } });
  const [pub, priv] = await Promise.all([
    sb.from("styles").select("slug", { count: "exact", head: true }),
    sb.from("users").select("id").limit(1),
  ]);
  const publicCatalogReadable = !pub.error;
  const privateTablesLocked = Boolean(priv.error) || (priv.data?.length ?? 0) === 0;
  const ok = publicCatalogReadable && privateTablesLocked;
  return Response.json(
    { configured: true, ok, publicCatalogReadable, privateTablesLocked },
    { status: ok ? 200 : 503, headers: { "cache-control": "no-store" } },
  );
}
