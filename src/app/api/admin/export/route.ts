import { api, requirePermissionApi } from "@/server/http";
import { getContainer } from "@/server/container";

export const GET = api(async (req: Request) => {
  await requirePermissionApi("import.run");
  const sp = new URL(req.url).searchParams;
  const status = sp.get("status");
  const ids = (sp.get("ids") ?? "").split(",").map(Number).filter((n) => Number.isInteger(n) && n > 0);
  const ex = getContainer().exporter;
  const rows = await ex.rows({
    ids: ids.length ? ids : undefined,
    status: status === "draft" || status === "published" || status === "archived" ? status : undefined,
  });
  const csv = sp.get("format") === "csv";
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv ? "﻿" + ex.toCsv(rows) : ex.toJson(rows), {
    headers: {
      "Content-Type": csv ? "text/csv; charset=utf-8" : "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="eleonore-products-${stamp}.${csv ? "csv" : "json"}"`,
      "Cache-Control": "no-store",
    },
  });
});
