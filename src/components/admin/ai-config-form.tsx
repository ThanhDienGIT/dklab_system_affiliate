"use client";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, RefreshCw, XCircle } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useToast } from "@/components/ui/providers";

interface Model { id: string; displayName: string; description: string; inputTokenLimit: number | null }
interface Check { source: "db" | "env" | "none"; masked: string | null; valid: boolean; error: string | null; models: Model[] }
interface Current { defaultModel: string | null; envModel: string; features: Record<string, { model: string; enabled: boolean }> }
interface Payload { check: Check; current: Current; features: readonly { id: string; label: string; hint: string }[] }

const SRC = { db: "Đang dùng key lưu trong hệ thống (mã hoá)", env: "Đang dùng key từ biến môi trường GEMINI_API_KEY", none: "Chưa có API key" } as const;

export function AiConfigForm() {
  const toast = useToast();
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [def, setDef] = useState("");
  const [feat, setFeat] = useState<Record<string, { model: string; enabled: boolean }>>({});
  const [tests, setTests] = useState<Record<string, string>>({});

  const apply = (p: Payload) => {
    setData(p); setDef(p.current.defaultModel ?? ""); setFeat(p.current.features);
  };
  // Luon kiem tra key + lay danh sach model moi khi vao trang
  const load = useCallback(async () => {
    setLoading(true);
    try { apply(await apiFetch<Payload>("/api/admin/ai")); }
    catch (e) { toast(e instanceof Error ? e.message : "Không tải được cấu hình", "err"); }
    setLoading(false);
  }, [toast]);
  useEffect(() => { void load(); }, [load]);

  async function save(removeKey = false) {
    setBusy(true);
    try {
      const r = await apiFetch<{ check: Check; current: Current }>("/api/admin/ai", {
        method: "PUT",
        body: { apiKey: removeKey ? null : apiKey, defaultModel: def || null, features: feat },
      });
      setApiKey("");
      setData((d) => (d ? { ...d, check: r.check, current: r.current } : d));
      toast("Đã lưu cấu hình AI");
    } catch (e) { toast(e instanceof ApiError ? e.message : "Lưu thất bại", "err"); }
    setBusy(false);
  }
  async function test(model: string, key: string) {
    if (!model) return;
    setTests((t) => ({ ...t, [key]: "…" }));
    try {
      const r = await apiFetch<{ ok: boolean; ms: number; error?: string }>("/api/admin/ai/test", { body: { model } });
      setTests((t) => ({ ...t, [key]: r.ok ? `✓ Hoạt động (${r.ms} ms)` : `✗ ${r.error ?? "Lỗi"}` }));
    } catch (e) { setTests((t) => ({ ...t, [key]: `✗ ${e instanceof Error ? e.message : "Lỗi"}` })); }
  }

  if (loading && !data) return <div className="flex items-center gap-2 text-sm text-muted"><Loader2 className="animate-spin" size={16} /> Đang kiểm tra API key và lấy danh sách model từ Gemini…</div>;
  if (!data) return <button type="button" className="btn btn-solid" onClick={load}>Thử lại</button>;
  const { check, current } = data;
  const options = (selected: string) => {
    const ids = new Set(check.models.map((m) => m.id));
    return (<>
      {selected && !ids.has(selected) && <option value={selected}>{selected} (không còn trong danh sách)</option>}
      {check.models.map((m) => <option key={m.id} value={m.id}>{m.id}{m.displayName && m.displayName !== m.id ? ` — ${m.displayName}` : ""}</option>)}
    </>);
  };

  return (
    <div className="space-y-8">
      <section className="border border-line bg-paper p-5 md:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl">API key</h2>
          <button type="button" className="btn btn-ghost" onClick={load} disabled={loading}><RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Kiểm tra lại</button>
        </div>
        <p className={`mt-3 flex items-start gap-2 text-sm ${check.valid ? "text-green-700" : "text-red-700"}`} role="status">
          {check.valid ? <CheckCircle2 size={18} className="mt-0.5 shrink-0" /> : <XCircle size={18} className="mt-0.5 shrink-0" />}
          <span>{check.valid ? `Key hợp lệ — ${check.models.length} model dùng được` : check.error}
            <span className="block text-xs text-muted">{SRC[check.source]}{check.masked ? ` · ${check.masked}` : ""}</span></span>
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <div><label htmlFor="ai-key" className="mb-1 block text-sm">Đổi API key (để trống = giữ nguyên)</label>
            <input id="ai-key" type="password" autoComplete="off" className="field" placeholder="AIza…" value={apiKey} onChange={(e) => setApiKey(e.target.value)} /></div>
          {check.source === "db" && <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => confirm("Xoá key đã lưu? Hệ thống sẽ quay về GEMINI_API_KEY trong biến môi trường (nếu có).") && save(true)}>Xoá key đã lưu</button>}
        </div>
        <p className="mt-2 text-xs text-muted">Key được kiểm tra với Gemini trước khi lưu, mã hoá AES-256-GCM trong DB và không bao giờ gửi ngược về trình duyệt.</p>
      </section>

      <section className="border border-line bg-paper p-5 md:p-7">
        <h2 className="text-2xl">Model mặc định (toàn hệ thống)</h2>
        <p className="mt-1 text-xs text-muted">Mọi tính năng AI dùng model này, trừ chức năng được đặt model riêng bên dưới. Để trống = dùng GEMINI_MODEL ({current.envModel}).</p>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
          <select aria-label="Model mặc định" className="field" value={def} disabled={!check.valid} onChange={(e) => setDef(e.target.value)}>
            <option value="">— Theo biến môi trường ({current.envModel}) —</option>{options(def)}
          </select>
          <button type="button" className="btn btn-ghost" disabled={!check.valid || !(def || current.envModel)} onClick={() => test(def || current.envModel, "def")}>Thử model</button>
        </div>
        {tests.def && <p className="mt-2 text-xs">{tests.def}</p>}
        {def && check.models.find((m) => m.id === def)?.description && <p className="mt-2 text-xs text-muted">{check.models.find((m) => m.id === def)?.description}</p>}
      </section>

      <section className="border border-line bg-paper p-5 md:p-7">
        <h2 className="text-2xl">Model riêng theo chức năng</h2>
        <p className="mt-1 text-xs text-muted">Tác vụ đơn giản (như tìm kiếm) có thể dùng model nhẹ hơn để nhanh và rẻ hơn. Tắt = dùng model mặc định.</p>
        <div className="mt-4 space-y-5">
          {data.features.map((f) => {
            const v = feat[f.id] ?? { model: "", enabled: false };
            return (
              <div key={f.id} className="border-t border-line pt-4 first:border-0 first:pt-0">
                <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
                  <input type="checkbox" className="h-5 w-5 accent-[var(--color-ink)]" checked={v.enabled} disabled={!check.valid}
                    onChange={(e) => setFeat((x) => ({ ...x, [f.id]: { model: v.model, enabled: e.target.checked } }))} /> {f.label}
                </label>
                <p className="text-xs text-muted">{f.hint}</p>
                <div className="mt-2 grid gap-3 md:grid-cols-[1fr_auto]">
                  <select aria-label={`Model cho ${f.label}`} className="field" value={v.model} disabled={!check.valid || !v.enabled}
                    onChange={(e) => setFeat((x) => ({ ...x, [f.id]: { model: e.target.value, enabled: v.enabled } }))}>
                    <option value="">— Chọn model —</option>{options(v.model)}
                  </select>
                  <button type="button" className="btn btn-ghost" disabled={!check.valid || !v.model} onClick={() => test(v.model, f.id)}>Thử model</button>
                </div>
                {tests[f.id] && <p className="mt-2 text-xs">{tests[f.id]}</p>}
              </div>
            );
          })}
        </div>
      </section>

      <button type="button" className="btn btn-solid" disabled={busy} onClick={() => save()}>{busy ? "Đang lưu…" : "Lưu cấu hình AI"}</button>
    </div>
  );
}
