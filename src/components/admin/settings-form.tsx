"use client";
import { createContext, useContext, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus } from "lucide-react";
import type { SiteSettings } from "@/server/domain/settings";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useToast } from "@/components/ui/providers";
import { SmartImage } from "@/components/ui/smart-image";

type Sec = keyof SiteSettings;

export function SettingsForm({ settings }: { settings: SiteSettings }) {
  const [s, setS] = useState(settings);
  const [busy, setBusy] = useState<Sec | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const toast = useToast();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const patch = <K extends Exclude<Sec, "disclosure">>(sec: K, k: keyof SiteSettings[K], v: unknown) =>
    setS((x) => ({ ...x, [sec]: { ...(x[sec] as object), [k]: v } }));

  async function save(sec: Sec) {
    setBusy(sec); setErrors({});
    try { await apiFetch("/api/admin/settings", { method: "PUT", body: { key: sec, value: s[sec] } }); toast("Đã lưu cài đặt"); router.refresh(); }
    catch (e) { if (e instanceof ApiError) { setErrors(e.fields ?? {}); toast(e.message, "err"); } else toast("Lưu thất bại", "err"); }
    setBusy(null);
  }
  async function uploadBanner(file?: File) {
    if (!file) return;
    try {
      const form = new FormData(); form.set("file", file); form.set("kind", "banner");
      const { url } = await apiFetch<{ url: string }>("/api/upload", { form });
      patch("hero", "image", url); toast("Đã tải banner, nhớ bấm Lưu");
    } catch (e) { toast(e instanceof Error ? e.message : "Tải ảnh thất bại", "err"); }
  }
  return (
    <Ctx.Provider value={{ s, patch: patch as Ctx["patch"], errors, busy, save }}>
    <div className="space-y-8">
      <Card sec="hero" title="Banner trang chủ" hint="Ảnh banner chính cũng là ảnh bìa trang quản trị. Khuyến nghị 2056×765.">
        <div className="md:col-span-2">
          <div className="relative aspect-[2056/765] max-h-52 w-full overflow-hidden bg-sand"><SmartImage src={s.hero.image} alt="Banner" sizes="600px" /></div>
          <div className="mt-3 flex gap-2">
            <input aria-label="Đường dẫn banner" className="field" value={s.hero.image} onChange={(e) => patch("hero", "image", e.target.value)} />
            <button type="button" className="btn btn-ghost shrink-0" onClick={() => fileRef.current?.click()}><ImagePlus size={16} /> Tải lên</button>
            <input ref={fileRef} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => uploadBanner(e.target.files?.[0])} />
          </div>
        </div>
        <T sec="hero" k="eyebrow" label="Dòng nhỏ phía trên" /><T sec="hero" k="title" label="Tiêu đề" />
        <div className="md:col-span-2"><T sec="hero" k="subtitle" label="Mô tả" /></div>
        <T sec="hero" k="ctaLabel" label="Chữ trên nút" /><T sec="hero" k="ctaHref" label="Liên kết nút" />
      </Card>
      <Card sec="brand" title="Thương hiệu"><T sec="brand" k="name" label="Tên" /><T sec="brand" k="tagline" label="Khẩu hiệu" /></Card>
      <Card sec="announcement" title="Thanh thông báo"><T sec="announcement" k="text" label="Nội dung" /><T sec="announcement" k="href" label="Liên kết" /></Card>
      <Card sec="contact" title="Liên hệ (nút chat nổi)" hint="Để trống kênh nào thì kênh đó không hiển thị.">
        <T sec="contact" k="hotline" label="Hotline" /><T sec="contact" k="email" label="Email" /><T sec="contact" k="zalo" label="Link Zalo" placeholder="https://zalo.me/…" />
        <T sec="contact" k="messenger" label="Link Messenger" placeholder="https://m.me/…" /><div className="md:col-span-2"><T sec="contact" k="address" label="Địa chỉ" /></div>
      </Card>
      <Card sec="social" title="Mạng xã hội"><T sec="social" k="instagram" label="Instagram" /><T sec="social" k="tiktok" label="TikTok" /><T sec="social" k="facebook" label="Facebook" /></Card>
      <Card sec="popup" title="Popup đăng ký email">
        <label className="flex min-h-11 items-center gap-2 text-sm md:col-span-2"><input type="checkbox" className="h-5 w-5 accent-[var(--color-ink)]" checked={s.popup.enabled} onChange={(e) => patch("popup", "enabled", e.target.checked)} /> Bật popup</label>
        <T sec="popup" k="title" label="Tiêu đề" /><div><label className="label" htmlFor="popup-delay">Hiện sau (giây)</label>
          <input id="popup-delay" inputMode="numeric" className="field" value={s.popup.delaySec} onChange={(e) => patch("popup", "delaySec", Number(e.target.value.replace(/\D/g, "")) || 0)} /></div>
        <div className="md:col-span-2"><T sec="popup" k="body" label="Nội dung" /></div>
      </Card>
      <Card sec="disclosure" title="Tiết lộ affiliate (chân trang)">
        <div className="md:col-span-2"><label className="label" htmlFor="disc">Nội dung</label>
          <textarea id="disc" rows={3} className="field" value={s.disclosure} onChange={(e) => setS((x) => ({ ...x, disclosure: e.target.value }))} /></div>
      </Card>
    </div>
    </Ctx.Provider>
  );
}

type Ctx = { s: SiteSettings; patch: (sec: Exclude<Sec, "disclosure">, k: string, v: unknown) => void; errors: Record<string, string>; busy: Sec | null; save: (sec: Sec) => void };
const Ctx = createContext<Ctx>(null as never);

function T({ sec, k, label, ...rest }: { sec: Exclude<Sec, "disclosure">; k: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const { s, patch, errors } = useContext(Ctx);
  const id = `${sec}-${k}`;
  return (
    <div><label className="label" htmlFor={id}>{label}</label>
      <input id={id} className="field" value={String((s[sec] as unknown as Record<string, unknown>)[k] ?? "")} onChange={(e) => patch(sec, k, e.target.value)} {...rest} />
      {errors[k] && <p className="mt-1 text-xs text-rose">{errors[k]}</p>}</div>
  );
}

function Card({ sec, title, children, hint }: { sec: Sec; title: string; children: React.ReactNode; hint?: string }) {
  const { busy, save } = useContext(Ctx);
  return (
    <section className="border border-line bg-paper p-5 md:p-7">
      <h2 className="text-2xl">{title}</h2>{hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      <div className="mt-5 grid gap-4 md:grid-cols-2">{children}</div>
      <div className="mt-5"><button type="button" className="btn btn-solid" disabled={busy === sec} onClick={() => save(sec)}>{busy === sec ? "Đang lưu…" : "Lưu mục này"}</button></div>
    </section>
  );
}
