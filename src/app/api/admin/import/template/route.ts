import { api, assertSameOrigin, requirePermissionApi } from "@/server/http";
import { getContainer } from "@/server/container";
import { readImportForm } from "@/server/http/import-form";
import { CSV_HEAD } from "@/server/services/import.service";
import { buildProductWorkbook, XLSX_MIME } from "@/server/services/xlsx-template";
import { toCsv } from "@/server/services/csv";

export const maxDuration = 60;
const stamp = () => new Date().toISOString().slice(0, 10);

/**
 * GET  ?format=xlsx|csv : template TRONG (du 33 cot, dropdown tu Phan loai hien co) de dien tay / dua cho tool cao.
 * POST (form-data: file, format): chuyen file Shopee Affiliate (CSV/Excel) -> template chuan da dien san. Khong ghi DB.
 *       Bao cao tom tat trong header X-Import-Report.
 */
export const GET = api(async (req: Request) => {
  await requirePermissionApi("import.run");
  const csv = new URL(req.url).searchParams.get("format") === "csv";
  if (csv) {
    return new Response(toCsv([[...CSV_HEAD]]), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="template-chuan-${stamp()}.csv"`, "cache-control": "no-store" } });
  }
  const taxonomy = await getContainer().taxonomy.getAll(false);
  const buf = await buildProductWorkbook({ head: CSV_HEAD, rows: [], taxonomy, title: "Template nhập sản phẩm Éleonore" });
  return new Response(new Uint8Array(buf), { headers: { "content-type": XLSX_MIME, "content-disposition": `attachment; filename="template-chuan-${stamp()}.xlsx"`, "cache-control": "no-store" } });
});

export const POST = api(async (req: Request) => {
  assertSameOrigin(req);
  await requirePermissionApi("import.run");
  const f = await readImportForm(req);
  const csvOut = f.format === "csv";
  const c = getContainer();
  const { csv, rows, report } = await c.importer.template(f.text, { defaultStyleId: f.defaultStyleId, defaultCategoryId: f.defaultCategoryId });
  const base = f.file.name.replace(/\.[^.]+$/, "").replace(/[^\w.-]+/g, "_").slice(0, 60) || "san-pham";
  const summary = { total: report.total, ok: report.created, skipped: report.skipped, errors: report.errors.slice(0, 20) };
  const headers = {
    "content-disposition": `attachment; filename="template-${base}.${csvOut ? "csv" : "xlsx"}"`,
    "x-import-report": encodeURIComponent(JSON.stringify(summary)),
    "cache-control": "no-store",
  };
  if (csvOut) return new Response(csv, { headers: { ...headers, "content-type": "text/csv; charset=utf-8" } });
  const taxonomy = await c.taxonomy.getAll(false);
  const buf = await buildProductWorkbook({ head: CSV_HEAD, rows, taxonomy, title: `Template chuẩn từ ${f.file.name}` });
  return new Response(new Uint8Array(buf), { headers: { ...headers, "content-type": XLSX_MIME } });
});
