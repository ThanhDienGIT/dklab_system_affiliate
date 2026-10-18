import { api, requirePermissionApi } from "@/server/http";
import { getContainer } from "@/server/container";
import { CSV_HEAD } from "@/server/services/import.service";
import { buildProductWorkbook, XLSX_MIME } from "@/server/services/xlsx-template";

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
  const stamp = new Date().toISOString().slice(0, 10);
  if (sp.get("format") === "xlsx") {
    const taxonomy = await getContainer().taxonomy.getAll(false);
    const buf = await buildProductWorkbook({ head: CSV_HEAD, rows: ex.toRows(rows), taxonomy, title: "Danh sách sản phẩm Éleonore" });
    return new Response(new Uint8Array(buf), {
      headers: { "Content-Type": XLSX_MIME, "Content-Disposition": `attachment; filename="eleonore-products-${stamp}.xlsx"`, "Cache-Control": "no-store" },
    });
  }
  const csv = sp.get("format") === "csv";
  return new Response(csv ? "﻿" + ex.toCsv(rows) : ex.toJson(rows), {
    headers: {
      "Content-Type": csv ? "text/csv; charset=utf-8" : "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="eleonore-products-${stamp}.${csv ? "csv" : "json"}"`,
      "Cache-Control": "no-store",
    },
  });
});
