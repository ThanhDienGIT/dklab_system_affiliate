"use client";
import { useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { useToast } from "@/components/ui/providers";

interface Report { total: number; created: number; updated: number; skipped: number; errors: { line: number; message: string }[] }

export function ImportForm() {
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<(Report & { dry: boolean }) | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(dry: boolean) {
    if (!file) { toast("Chọn tệp JSON/CSV trước", "err"); return; }
    setBusy(true);
    try {
      const form = new FormData(); form.set("file", file);
      const r = await apiFetch<Report>(`/api/admin/import${dry ? "?dry=1" : ""}`, { form });
      setReport({ ...r, dry });
      toast(dry ? "Đã kiểm tra thử (chưa ghi dữ liệu)" : `Đã nhập: ${r.created} mới, ${r.updated} cập nhật`);
    } catch (e) { toast(e instanceof Error ? e.message : "Nhập thất bại", "err"); }
    setBusy(false);
  }
  return (
    <div className="space-y-6">
      <div className="border border-line bg-paper p-5">
        <label className="label" htmlFor="csv">Tệp JSON hoặc CSV (UTF-8, tối đa 4MB)</label>
        <input id="csv" type="file" accept=".json,.csv,application/json,text/csv" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setReport(null); }} className="field !py-2.5" />
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" className="btn btn-ghost" disabled={busy || !file} onClick={() => run(true)}>Kiểm tra thử</button>
          <button type="button" className="btn btn-solid" disabled={busy || !file} onClick={() => run(false)}>Nhập dữ liệu</button>
          <a href="/admin/mau-nhap.json" download className="btn btn-ghost">JSON mẫu</a>
          <a href="/admin/mau-nhap.csv" download className="btn btn-ghost">CSV mẫu</a>
          <a href="/api/admin/export?format=json" className="btn btn-ghost">Xuất JSON</a>
          <a href="/api/admin/export?format=csv" className="btn btn-ghost">Xuất CSV</a>
        </div>
      </div>
      {report && (
        <div className="border border-line bg-paper p-5" role="status">
          <p className="font-semibold">{report.dry ? "Kết quả kiểm tra thử" : "Kết quả nhập"}: {report.total} dòng · {report.created} mới · {report.updated} cập nhật · {report.skipped} bỏ qua</p>
          {report.errors.length > 0 && (
            <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto text-sm text-rose">
              {report.errors.slice(0, 100).map((e, i) => <li key={i}>Dòng {e.line}: {e.message}</li>)}
            </ul>
          )}
        </div>
      )}
      <div className="text-sm text-ink-soft">
        <p className="font-semibold">Cột nhận diện được (không phân biệt hoa/thường, có/không dấu):</p>
        <p className="mt-1">Tên sản phẩm*, Phong cách*, Thể loại*, Loại, Giá*, Giá gốc, Màu, Size, Chất liệu, Ảnh (nhiều link cách nhau dấu |), Link affiliate, Mã sản phẩm (chống trùng), Sàn…</p>
        <p className="mt-2 text-muted">JSON chuẩn <code>eleonore.products.v1</code> ({"{ format, products: [...] }"}) hỗ trợ đủ detail, đánh giá, dữ liệu gốc; CSV có thêm các cột “Chi tiết JSON”, “Đánh giá JSON”, “Dữ liệu gốc JSON”. Dòng có Mã sản phẩm đã tồn tại sẽ được cập nhật thay vì tạo mới. Phong cách/thể loại/loại phải khớp tên hoặc bí danh đã khai báo.</p>
      </div>
    </div>
  );
}
