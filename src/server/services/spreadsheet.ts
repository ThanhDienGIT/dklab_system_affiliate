import { AppError } from "../domain/errors";
import { toCsv } from "./csv";

/** Gia tri o Excel (so, chu, link, rich text, cong thuc, ngay) -> chuoi */
function cellText(v: unknown): string {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString();
  if (typeof v !== "object") return String(v);
  const o = v as Record<string, unknown>;
  if (Array.isArray(o.richText)) return (o.richText as { text?: string }[]).map((r) => r.text ?? "").join("");
  if ("result" in o) return cellText(o.result); // cong thuc
  if (typeof o.text === "string") return o.text; // hyperlink { text, hyperlink }
  if (typeof o.hyperlink === "string") return o.hyperlink;
  return "";
}

/** UTF-8 (co/khong BOM); neu khong hop le (CSV luu "ANSI" tu Excel) thi thu windows-1258 / windows-1252 */
function decodeText(buf: ArrayBuffer): string {
  try { return new TextDecoder("utf-8", { fatal: true }).decode(buf); } catch { /* khong phai UTF-8 */ }
  for (const enc of ["windows-1258", "windows-1252"]) {
    try { return new TextDecoder(enc).decode(buf); } catch { /* runtime khong ho tro */ }
  }
  return new TextDecoder("utf-8").decode(buf);
}

/**
 * Doc tep tai len thanh van ban CSV/JSON cho ImportService.
 *  - .xlsx: lay sheet dau tien co du lieu (file "Lay link san pham hang loat" cua Shopee Affiliate xuat dang Excel/CSV)
 *  - .csv/.json/.txt: doc UTF-8
 */
export async function readUpload(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const buf = await file.arrayBuffer();
  const head = new Uint8Array(buf.slice(0, 4));
  const isZip = head[0] === 0x50 && head[1] === 0x4b; // "PK" = xlsx
  if (name.endsWith(".xls") && !isZip) throw new AppError("VALIDATION", "Định dạng .xls (Excel 97-2003) chưa hỗ trợ — mở bằng Excel và lưu lại dạng .xlsx hoặc .csv");
  if (!isZip) return decodeText(buf);

  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  try { await wb.xlsx.load(buf); } catch { throw new AppError("VALIDATION", "Không đọc được tệp Excel (.xlsx) — tệp hỏng hoặc có mật khẩu"); }
  // template cua he thong: sheet "SanPham" (kem sheet DanhMuc/HuongDan) — uu tien no, ke ca khi moi co dong tieu de
  const ws = wb.worksheets.find((w) => w.name === "SanPham") ?? wb.worksheets.find((w) => w.actualRowCount > 1) ?? wb.worksheets[0];
  if (!ws) throw new AppError("VALIDATION", "Tệp Excel không có sheet nào");
  const rows: string[][] = [];
  ws.eachRow({ includeEmpty: false }, (row) => {
    const vals = row.values as unknown[]; // index 1-based
    const out: string[] = [];
    for (let i = 1; i < vals.length; i++) out.push(cellText(vals[i]).trim());
    if (out.some(Boolean)) rows.push(out);
  });
  if (rows.length > 20_000) throw new AppError("VALIDATION", "Tối đa 20.000 dòng mỗi lần — tách nhỏ tệp");
  return toCsv(rows);
}
