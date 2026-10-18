"use client";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { apiFetch, downloadFile } from "@/lib/api-client";
import { useToast } from "@/components/ui/providers";

interface Msg { line: number; message: string }
interface Report { total: number; created: number; updated: number; skipped: number; errors: Msg[]; notes?: Msg[] }
interface Opt { id: number; name: string }
type Shown = Report & { title: string; kind?: "import" | "template" };

const ACCEPT_AFF = ".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const ACCEPT_STD = ".xlsx,.csv,.json,application/json,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Logic dung chung: chon tep, kiem tra thu / nhap, tai template */
function useImporter(defaults?: { styleId: string; categoryId: string }) {
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<Shown | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const form = (extra?: Record<string, string>) => {
    const f = new FormData();
    if (file) f.set("file", file);
    if (defaults?.styleId) f.set("defaultStyleId", defaults.styleId);
    if (defaults?.categoryId) f.set("defaultCategoryId", defaults.categoryId);
    for (const [k, v] of Object.entries(extra ?? {})) f.set(k, v);
    return f;
  };

  async function run(dry: boolean) {
    if (!file) { toast("Chọn tệp trước", "err"); return; }
    setBusy(dry ? "dry" : "run");
    try {
      const r = await apiFetch<Report>(`/api/admin/import${dry ? "?dry=1" : ""}`, { form: form() });
      setReport({ ...r, kind: "import", title: dry ? `Kiểm tra thử — ${file.name}` : `Đã nhập — ${file.name}` });
      toast(dry ? "Đã kiểm tra (chưa ghi dữ liệu)" : `Đã nhập: ${r.created} mới, ${r.updated} cập nhật`);
    } catch (e) { toast(e instanceof Error ? e.message : "Nhập thất bại", "err"); }
    setBusy(null);
  }

  async function download(label: string, url: string, init?: { method?: string; form?: FormData }) {
    setBusy(label);
    try {
      const { name, report: sum } = await downloadFile(url, init);
      const s = sum as { total: number; ok: number; skipped: number; errors: Msg[] } | null;
      if (s) setReport({ kind: "template", title: `Template chuẩn — ${name}`, total: s.total, created: s.ok, updated: 0, skipped: s.skipped, errors: s.errors, notes: [] });
      toast(`Đã tải ${name}`);
    } catch (e) { toast(e instanceof Error ? e.message : "Tải thất bại", "err"); }
    setBusy(null);
  }

  return { file, setFile: (f: File | null) => { setFile(f); setReport(null); }, report, busy, run, download, form };
}

function ReportBox({ report }: { report: Shown }) {
  return (
    <div className="border border-line bg-paper p-5" role="status">
      <p className="font-semibold">{report.title}: {report.total} dòng · {report.created} {report.kind === "template" ? "dòng hợp lệ" : "mới"}{report.updated ? ` · ${report.updated} cập nhật` : ""} · {report.skipped} bỏ qua</p>
      {report.errors.length > 0 && (
        <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto text-sm text-rose">
          {report.errors.slice(0, 100).map((e, i) => <li key={i}>Dòng {e.line}: {e.message}</li>)}
        </ul>
      )}
      {!!report.notes?.length && (
        <details className="mt-3 text-sm text-ink-soft" open={report.notes.length <= 10}>
          <summary className="cursor-pointer">Ghi chú ({report.notes.length})</summary>
          <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto">
            {report.notes.slice(0, 200).map((e, i) => <li key={i}>Dòng {e.line}: {e.message}</li>)}
          </ul>
        </details>
      )}
    </div>
  );
}

const Card = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="border border-line bg-paper p-5"><h2 className="text-xl">{title}</h2>{children}</section>
);

/* ========================= 1) NHAP TU SHOPEE AFFILIATE ========================= */
export function ShopeeImportForm({ styles, categories }: { styles: Opt[]; categories: Opt[] }) {
  const [styleId, setStyleId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const im = useImporter({ styleId, categoryId });
  const dis = im.busy !== null;

  return (
    <div className="space-y-6">
      <Card title="File Shopee Affiliate">
        <p className="mt-1 text-sm text-muted">File “Lấy link sản phẩm hàng loạt” tải từ Shopee Affiliate (.csv hoặc .xlsx): Mã sản phẩm, Tên, Giá, Doanh thu, Tên cửa hàng, Tỉ lệ hoa hồng, Link sản phẩm, Link ưu đãi.</p>
        <input aria-label="File Shopee Affiliate" type="file" accept={ACCEPT_AFF} onChange={(e) => im.setFile(e.target.files?.[0] ?? null)} className="field mt-3 !py-2.5" />
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="label">Phong cách mặc định</span>
            <select className="field" value={styleId} onChange={(e) => setStyleId(e.target.value)}>
              <option value="">Tự đoán theo tên (không khớp → phong cách đầu tiên)</option>
              {styles.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label className="text-sm">
            <span className="label">Thể loại mặc định</span>
            <select className="field" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Tự đoán theo tên (không khớp → “Khác”)</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
        </div>
        <p className="mt-2 text-xs text-muted">Danh sách này lấy từ <Link href="/admin/phan-loai" className="underline">Phân loại</Link> — thêm/sửa phong cách, thể loại, loại ở đó.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" className="btn btn-ghost" disabled={dis || !im.file} onClick={() => im.run(true)}>{im.busy === "dry" ? "Đang kiểm tra…" : "Kiểm tra thử"}</button>
          <button type="button" className="btn btn-solid" disabled={dis || !im.file} onClick={() => im.run(false)}>{im.busy === "run" ? "Đang nhập…" : "Nhập ngay"}</button>
        </div>
      </Card>

      <Card title="Xuất template chuẩn để cào dữ liệu">
        <p className="mt-1 text-sm text-muted">Chuyển file Shopee Affiliate ở trên thành <b>template chuẩn đầy đủ 33 cột</b> (đã điền sẵn phong cách, thể loại, mã SP, giá, hoa hồng…; ảnh/mô tả/đánh giá để trống cho tool cào điền). Bản Excel có dropdown phong cách / thể loại / loại.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" className="btn btn-solid" disabled={dis || !im.file} onClick={() => im.download("tpl-xlsx", "/api/admin/import/template", { method: "POST", form: im.form({ format: "xlsx" }) })}>{im.busy === "tpl-xlsx" ? "Đang xuất…" : "Xuất template Excel (.xlsx)"}</button>
          <button type="button" className="btn btn-ghost" disabled={dis || !im.file} onClick={() => im.download("tpl-csv", "/api/admin/import/template", { method: "POST", form: im.form({ format: "csv" }) })}>{im.busy === "tpl-csv" ? "Đang xuất…" : "Xuất template CSV"}</button>
        </div>
        <p className="mt-3 text-xs text-muted">Quy trình: Xuất template → chạy <code>pnpm scrape:shopee template.xlsx</code> trên máy → nhập lại file kết quả ở trang <Link href="/admin/nhap-du-lieu" className="underline">Nhập dữ liệu tool</Link> (trùng Mã sản phẩm sẽ cập nhật, không tạo trùng). Sản phẩm chưa có ảnh được lưu <b>Nháp</b>.</p>
      </Card>

      {im.report && <ReportBox report={im.report} />}
    </div>
  );
}

/* ========================= 2) NHAP DU LIEU TOOL / TEMPLATE CHUAN ========================= */
export function DataImportForm({ counts }: { counts: { styles: number; categories: number; types: number } }) {
  const im = useImporter();
  const dis = im.busy !== null;
  const dl = (label: string, url: string) => () => im.download(label, url);

  return (
    <div className="space-y-6">
      <Card title="Bước 1 — Tải template chuẩn của hệ thống">
        <p className="mt-1 text-sm text-muted">Template đủ 33 cột. Bản Excel có <b>dropdown</b> lấy từ hệ thống hiện có ({counts.styles} phong cách · {counts.categories} thể loại · {counts.types} loại; “Loại” lọc theo thể loại đã chọn). Thêm/sửa danh mục ở <Link href="/admin/phan-loai" className="underline">Phân loại</Link> rồi tải lại để dropdown cập nhật.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" className="btn btn-solid" disabled={dis} onClick={dl("tpl-x", "/api/admin/import/template?format=xlsx")}>{im.busy === "tpl-x" ? "Đang tạo…" : "Template Excel (.xlsx, có dropdown)"}</button>
          <button type="button" className="btn btn-ghost" disabled={dis} onClick={dl("tpl-c", "/api/admin/import/template?format=csv")}>Template CSV</button>
          <button type="button" className="btn btn-ghost" disabled={dis} onClick={dl("ex-x", "/api/admin/export?format=xlsx")}>Xuất sản phẩm hiện có (Excel)</button>
          <button type="button" className="btn btn-ghost" disabled={dis} onClick={dl("ex-c", "/api/admin/export?format=csv")}>Xuất CSV</button>
          <button type="button" className="btn btn-ghost" disabled={dis} onClick={dl("ex-j", "/api/admin/export?format=json")}>Xuất JSON</button>
        </div>
        <p className="mt-3 text-xs text-muted">Nên dùng <b>.xlsx</b>: lưu CSV bằng Excel dễ làm hỏng dấu tiếng Việt và đổi dấu phân cách. Hệ thống vẫn đọc được CSV (UTF-8, hoặc ANSI) và JSON <code>eleonore.products.v1</code>.</p>
      </Card>

      <Card title="Bước 2 — Nhập file đã điền / đã cào">
        <p className="mt-1 text-sm text-muted">Chọn file template đã điền (Excel/CSV) hoặc JSON do tool cào xuất ra. Trùng (Sàn bán + Mã sản phẩm) hoặc Slug → cập nhật, không tạo trùng.</p>
        <input aria-label="File dữ liệu" type="file" accept={ACCEPT_STD} onChange={(e) => im.setFile(e.target.files?.[0] ?? null)} className="field mt-3 !py-2.5" />
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" className="btn btn-ghost" disabled={dis || !im.file} onClick={() => im.run(true)}>{im.busy === "dry" ? "Đang kiểm tra…" : "Kiểm tra thử"}</button>
          <button type="button" className="btn btn-solid" disabled={dis || !im.file} onClick={() => im.run(false)}>{im.busy === "run" ? "Đang nhập…" : "Nhập dữ liệu"}</button>
        </div>
      </Card>

      {im.report && <ReportBox report={im.report} />}
    </div>
  );
}
