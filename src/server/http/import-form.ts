import { AppError } from "../domain/errors";
import { readUpload } from "../services/spreadsheet";

/** Lay tep + tuy chon mac dinh tu form (dung chung cho nhap va xuat template). Vercel gioi han body ~4.5MB. */
export async function readImportForm(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) throw new AppError("VALIDATION", "Chưa chọn tệp CSV / Excel / JSON");
  if (file.size > 4 * 1024 * 1024) throw new AppError("VALIDATION", "Tệp tối đa 4MB (tách nhỏ nếu lớn hơn)");
  const id = (k: string) => { const n = Number(form.get(k)); return Number.isInteger(n) && n > 0 ? n : null; };
  return { file, text: await readUpload(file), format: form.get("format") === "csv" ? "csv" as const : "xlsx" as const, defaultStyleId: id("defaultStyleId"), defaultCategoryId: id("defaultCategoryId") };
}
