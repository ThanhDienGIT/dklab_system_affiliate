"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { useToast } from "@/components/ui/providers";

const MODES = [
  { id: "db", label: "Chỉ dữ liệu trong database", hint: "Nhanh, không cào web." },
  { id: "web", label: "Chỉ cào web", hint: "Tìm 2–3 trang, đối chiếu chéo thông tin." },
  { id: "both", label: "Kết hợp database + web", hint: "Chính xác nhất, chậm hơn (~20–40 giây)." },
] as const;

export function BlogGenerateButton({ productId, name }: { productId: number; name: string }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"db" | "web" | "both">("both");
  const [urls, setUrls] = useState("");
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const extraUrls = urls.split(/\s+/).map((u) => u.trim()).filter(Boolean).slice(0, 3);
      const r = await apiFetch<{ id: number; warnings: string[] }>("/api/admin/blog/generate", { body: { productId, mode, extraUrls } });
      if (r.warnings.length) toast(r.warnings[0] ?? "", "err");
      toast("Đã tạo bản nháp, mời bạn duyệt");
      router.push(`/admin/blog/${r.id}`);
    } catch (e) { toast(e instanceof Error ? e.message : "Tạo blog thất bại", "err"); setBusy(false); }
  }
  return (
    <>
      <button type="button" aria-label={`Tạo blog AI cho ${name}`} title="Tạo blog bằng AI" onClick={() => setOpen(true)} className="grid h-10 w-10 place-items-center hover:text-gold-deep"><Sparkles size={16} /></button>
      {open && (
        <div role="dialog" aria-modal="true" aria-label="Tạo blog bằng AI" className="fixed inset-0 z-[80] grid place-items-center bg-ink/50 p-4" onClick={() => !busy && setOpen(false)}>
          <div className="w-full max-w-md bg-paper p-6 text-left" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl">Tạo blog bằng AI</h2>
            <p className="mt-1 truncate text-sm text-muted">{name}</p>
            <fieldset className="mt-4 space-y-2" disabled={busy}>
              {MODES.map((m) => (
                <label key={m.id} className="flex cursor-pointer items-start gap-2 text-sm">
                  <input type="radio" name="mode" className="mt-1 accent-[var(--color-ink)]" checked={mode === m.id} onChange={() => setMode(m.id)} />
                  <span><span className="font-medium">{m.label}</span><span className="block text-xs text-muted">{m.hint}</span></span>
                </label>
              ))}
            </fieldset>
            {mode !== "db" && (
              <div className="mt-4"><label className="label" htmlFor="gen-urls">Thêm link muốn AI tham khảo (tuỳ chọn, tối đa 3, cách nhau bằng dấu cách/xuống dòng)</label>
                <textarea id="gen-urls" rows={2} className="field" value={urls} onChange={(e) => setUrls(e.target.value)} disabled={busy} /></div>
            )}
            <p className="mt-3 text-xs text-muted">Bài được lưu ở dạng nháp. AI không xuất bản thay bạn.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setOpen(false)}>Huỷ</button>
              <button type="button" className="btn btn-solid" disabled={busy} onClick={run}>{busy ? "AI đang viết…" : "Tạo bản nháp"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
