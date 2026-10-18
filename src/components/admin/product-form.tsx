"use client";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Trash2, ArrowLeft, Star } from "lucide-react";
import type { ProductDetail, ReviewDTO, Taxonomy } from "@/server/domain/types";
import { COLORS, MERCHANTS, SIZES } from "@/lib/constants";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useToast } from "@/components/ui/providers";
import { SmartImage } from "@/components/ui/smart-image";
import { cn } from "@/lib/utils";

type FormState = {
  name: string; slug: string; description: string; styleId: number | ""; categoryId: number | ""; typeId: number | "";
  price: string; originalPrice: string; colors: string[]; sizes: string[]; material: string; tags: string;
  images: string[]; badge: string; rating: string; reviewCount: string; sold: string; merchant: string;
  affiliateUrl: string; productUrl: string; itemId: string; commissionRate: string; status: "draft" | "published" | "archived"; isFeatured: boolean;
  detailJson: string; reviewsJson: string; rawJson: string; videoUrl: string;
};
const MAX_IMAGES = 5; // moi san pham toi da 5 anh + 1 video
const MAX_VIDEO_MB = 40;

type Extra = { reviews: ReviewDTO[]; raw: Record<string, unknown> | null };
const pretty = (v: unknown, empty: string) => {
  if (v == null) return "";
  if (Array.isArray(v) ? !v.length : typeof v === "object" && !Object.keys(v as object).length) return empty === "" ? "" : "";
  return JSON.stringify(v, null, 2);
};
const init = (p?: ProductDetail, extra?: Extra): FormState => ({
  name: p?.name ?? "", slug: p?.slug ?? "", description: p?.description ?? "", styleId: p?.style.id ?? "", categoryId: p?.category.id ?? "", typeId: p?.type?.id ?? "",
  price: p ? String(p.price) : "", originalPrice: p?.originalPrice ? String(p.originalPrice) : "", colors: p?.colors ?? [], sizes: p?.sizes ?? [],
  material: p?.material ?? "", tags: (p?.tags ?? []).join(", "), images: p?.images ?? [], badge: p?.badge ?? "", rating: p ? String(p.rating) : "0",
  reviewCount: p ? String(p.reviewCount) : "0", sold: p ? String(p.sold) : "0", merchant: p?.merchant ?? "shopee", affiliateUrl: p?.affiliateUrl ?? "",
  productUrl: p?.productUrl ?? "", itemId: p?.itemId ?? "", commissionRate: p?.commissionRate != null ? String(p.commissionRate) : "",
  status: p?.status ?? "published", isFeatured: p?.isFeatured ?? false,
  detailJson: pretty(p?.detail, ""), reviewsJson: pretty(extra?.reviews, ""), rawJson: pretty(extra?.raw, ""),
  videoUrl: p?.detail?.video?.url ?? "",
});

export function ProductForm({ product, taxonomy, extra }: { product?: ProductDetail; taxonomy: Taxonomy; extra?: Extra }) {
  const router = useRouter();
  const toast = useToast();
  const [f, setF] = useState<FormState>(() => init(product, extra));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const [urlDraft, setUrlDraft] = useState("");
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((s) => ({ ...s, [k]: v }));

  const types = useMemo(() => taxonomy.types.filter((t) => t.categoryId === f.categoryId), [taxonomy.types, f.categoryId]);
  const style = taxonomy.styles.find((s) => s.id === f.styleId);
  const cat = taxonomy.categories.find((c) => c.id === f.categoryId);
  const type = taxonomy.types.find((t) => t.id === f.typeId);
  const err = (k: string) => (errors[k] ? <p className="mt-1 text-xs text-rose">{errors[k]}</p> : null);
  const num = (v: string) => (v.trim() === "" ? null : Number(v));

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files).slice(0, MAX_IMAGES - f.images.length)) {
        const form = new FormData();
        form.set("file", file); form.set("kind", "product");
        urls.push((await apiFetch<{ url: string }>("/api/upload", { form })).url);
      }
      set("images", [...f.images, ...urls]);
    } catch (e) { toast(e instanceof Error ? e.message : "Tải ảnh thất bại", "err"); }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  /** Video day thang tu trinh duyet len Cloudinary (server chi ky tham so) - tranh gioi han body cua Vercel */
  async function uploadVideo(file?: File) {
    if (!file) return;
    if (!/^video\/(mp4|webm)$/.test(file.type)) { toast("Chỉ nhận video mp4 hoặc webm", "err"); return; }
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) { toast(`Video tối đa ${MAX_VIDEO_MB}MB`, "err"); return; }
    setUploading(true);
    try {
      const s = await apiFetch<{ uploadUrl: string; apiKey: string; signature: string; folder: string; public_id: string; timestamp: string }>("/api/admin/upload-sign", { body: {} });
      const form = new FormData();
      form.set("file", file); form.set("api_key", s.apiKey); form.set("signature", s.signature);
      form.set("folder", s.folder); form.set("public_id", s.public_id); form.set("timestamp", s.timestamp);
      const res = await fetch(s.uploadUrl, { method: "POST", body: form });
      const data = (await res.json().catch(() => null)) as { secure_url?: string; error?: { message?: string } } | null;
      if (!res.ok || !data?.secure_url) throw new Error(data?.error?.message ?? "Tải video thất bại");
      set("videoUrl", data.secure_url); toast("Đã tải video, nhớ bấm Lưu");
    } catch (e) { toast(e instanceof Error ? e.message : "Tải video thất bại", "err"); }
    setUploading(false);
    if (videoRef.current) videoRef.current.value = "";
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErrors({});
    const parse = (key: string, text: string, label: string): { ok: boolean; v?: unknown } => {
      if (!text.trim()) return { ok: true };
      try { return { ok: true, v: JSON.parse(text) }; } catch { setErrors((x) => ({ ...x, [key]: `${label}: JSON không hợp lệ` })); return { ok: false }; }
    };
    const dj = parse("detail", f.detailJson, "Chi tiết"), rj = parse("reviews", f.reviewsJson, "Đánh giá"), wj = parse("rawData", f.rawJson, "Dữ liệu gốc");
    if (f.videoUrl && !/^https?:\/\//.test(f.videoUrl)) { setErrors({ video: "Link video phải bắt đầu bằng http(s)://" }); setBusy(false); return; }
    if (!dj.ok || !rj.ok || !wj.ok) { toast("Kiểm tra lại các ô JSON", "err"); setBusy(false); return; }
    const body = {
      name: f.name, slug: f.slug || undefined, description: f.description, styleId: f.styleId === "" ? 0 : f.styleId, categoryId: f.categoryId === "" ? 0 : f.categoryId,
      typeId: f.typeId === "" ? null : f.typeId, price: num(f.price) ?? 0, originalPrice: num(f.originalPrice), colors: f.colors, sizes: f.sizes, material: f.material,
      tags: f.tags.split(",").map((t) => t.trim()).filter(Boolean), images: f.images, badge: f.badge || null, rating: num(f.rating) ?? 0,
      reviewCount: num(f.reviewCount) ?? 0, sold: num(f.sold) ?? 0, merchant: f.merchant, affiliateUrl: f.affiliateUrl, productUrl: f.productUrl,
      itemId: f.itemId || null, commissionRate: num(f.commissionRate), status: f.status, isFeatured: f.isFeatured,
      detail: { ...((dj.v as object | undefined) ?? {}), video: f.videoUrl ? { url: f.videoUrl, poster: f.images[0] ?? null } : null },
      ...(f.reviewsJson.trim() || extra?.reviews.length ? { reviews: (rj.v as unknown[] | undefined) ?? [] } : {}),
      rawData: (wj.v as Record<string, unknown> | undefined) ?? null,
    };
    try {
      if (product) await apiFetch(`/api/admin/products/${product.id}`, { method: "PUT", body });
      else await apiFetch("/api/admin/products", { body });
      toast(product ? "Đã lưu sản phẩm" : "Đã thêm sản phẩm");
      router.push("/admin/san-pham");
      router.refresh();
    } catch (e2) {
      if (e2 instanceof ApiError) { setErrors(e2.fields ?? {}); toast(e2.message, "err"); } else toast("Lưu thất bại", "err");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-10">
      <button type="button" onClick={() => router.push("/admin/san-pham")} className="flex items-center gap-1 text-sm text-muted hover:text-ink"><ArrowLeft size={15} /> Danh sách sản phẩm</button>

      <fieldset className="border border-line bg-paper p-5 md:p-7">
        <legend className="px-2 font-display text-2xl">1 · Phân loại</legend>
        <div className="grid gap-5 md:grid-cols-3">
          <div><label className="label" htmlFor="styleId">Phong cách</label>
            <select id="styleId" className="field" value={f.styleId} onChange={(e) => set("styleId", e.target.value ? Number(e.target.value) : "")} aria-invalid={Boolean(errors.styleId)}>
              <option value="">Chọn phong cách</option>{taxonomy.styles.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>{err("styleId")}</div>
          <div><label className="label" htmlFor="categoryId">Thể loại</label>
            <select id="categoryId" className="field" value={f.categoryId} onChange={(e) => { set("categoryId", e.target.value ? Number(e.target.value) : ""); set("typeId", ""); }} aria-invalid={Boolean(errors.categoryId)}>
              <option value="">Chọn thể loại</option>{taxonomy.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>{err("categoryId")}</div>
          <div><label className="label" htmlFor="typeId">Loại cụ thể</label>
            <select id="typeId" className="field" value={f.typeId} disabled={!f.categoryId} onChange={(e) => set("typeId", e.target.value ? Number(e.target.value) : "")} aria-invalid={Boolean(errors.typeId)}>
              <option value="">{f.categoryId ? "Chọn loại (vd: Đầm babydoll)" : "Chọn thể loại trước"}</option>{types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>{err("typeId")}</div>
        </div>
        <p className="mt-4 text-sm" aria-live="polite">
          Sẽ hiển thị tại: <strong>{[style?.name, cat?.name, type?.name].filter(Boolean).join("  ›  ") || "—"}</strong>
        </p>
      </fieldset>

      <fieldset className="border border-line bg-paper p-5 md:p-7">
        <legend className="px-2 font-display text-2xl">2 · Thông tin</legend>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2"><label className="label" htmlFor="name">Tên sản phẩm</label>
            <input id="name" className="field" value={f.name} onChange={(e) => set("name", e.target.value)} aria-invalid={Boolean(errors.name)} placeholder="Đầm babydoll nơ ngực Y2K" />{err("name")}</div>
          <div><label className="label" htmlFor="slug">Slug (để trống = tự tạo)</label>
            <input id="slug" className="field" value={f.slug} onChange={(e) => set("slug", e.target.value)} />{err("slug")}</div>
          <div><label className="label" htmlFor="badge">Nhãn (vd: Mới, Hot)</label>
            <input id="badge" className="field" value={f.badge} maxLength={24} onChange={(e) => set("badge", e.target.value)} /></div>
          <div><label className="label" htmlFor="price">Giá bán (₫)</label>
            <input id="price" inputMode="numeric" className="field" value={f.price} onChange={(e) => set("price", e.target.value.replace(/\D/g, ""))} aria-invalid={Boolean(errors.price)} />{err("price")}</div>
          <div><label className="label" htmlFor="originalPrice">Giá gốc (₫, nếu đang giảm)</label>
            <input id="originalPrice" inputMode="numeric" className="field" value={f.originalPrice} onChange={(e) => set("originalPrice", e.target.value.replace(/\D/g, ""))} /></div>
          <div className="md:col-span-2"><label className="label" htmlFor="description">Mô tả</label>
            <textarea id="description" rows={5} className="field" value={f.description} onChange={(e) => set("description", e.target.value)} /></div>
          <div><label className="label" htmlFor="material">Chất liệu</label><input id="material" className="field" value={f.material} onChange={(e) => set("material", e.target.value)} /></div>
          <div><label className="label" htmlFor="tags">Từ khoá / tag (cách nhau dấu phẩy)</label><input id="tags" className="field" value={f.tags} onChange={(e) => set("tags", e.target.value)} placeholder="babydoll, nơ, croptop" /></div>
        </div>
        <div className="mt-6">
          <p className="label">Màu sắc</p>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => {
              const on = f.colors.includes(c.slug);
              return (
                <button key={c.slug} type="button" aria-pressed={on} onClick={() => set("colors", on ? f.colors.filter((x) => x !== c.slug) : [...f.colors, c.slug])}
                  className={cn("flex items-center gap-2 border px-3 py-2 text-sm", on ? "border-ink bg-ink text-ivory" : "border-line bg-paper hover:border-ink")}>
                  <span className="h-3.5 w-3.5 rounded-full border border-ink/20" style={{ background: c.hex }} />{c.name}</button>
              );
            })}
          </div>
        </div>
        <div className="mt-6">
          <p className="label">Kích cỡ</p>
          <div className="flex flex-wrap gap-2">
            {SIZES.map((s) => {
              const on = f.sizes.includes(s);
              return <button key={s} type="button" aria-pressed={on} onClick={() => set("sizes", on ? f.sizes.filter((x) => x !== s) : [...f.sizes, s])}
                className={cn("min-w-12 border px-3 py-2 text-sm", on ? "border-ink bg-ink text-ivory" : "border-line bg-paper hover:border-ink")}>{s}</button>;
            })}
          </div>
        </div>
      </fieldset>

      <fieldset className="border border-line bg-paper p-5 md:p-7">
        <legend className="px-2 font-display text-2xl">3 · Hình ảnh & video <span className="text-sm text-muted">(tối đa {MAX_IMAGES} ảnh · 1 video)</span></legend>
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {f.images.map((src, i) => (
            <li key={src + i} className="group relative aspect-[4/5] overflow-hidden bg-sand">
              <SmartImage src={src} alt={`Ảnh ${i + 1}`} sizes="150px" />
              {i === 0 && <span className="absolute left-1 top-1 bg-ink px-1.5 py-0.5 text-[10px] uppercase text-ivory">Ảnh chính</span>}
              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-ink/70 p-1 opacity-100 md:opacity-0 md:transition md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                {i > 0 ? <button type="button" aria-label="Đặt làm ảnh chính" onClick={() => set("images", [src, ...f.images.filter((_, j) => j !== i)])} className="grid h-8 w-8 place-items-center text-ivory"><Star size={15} /></button> : <span />}
                <button type="button" aria-label="Xoá ảnh" onClick={() => set("images", f.images.filter((_, j) => j !== i))} className="grid h-8 w-8 place-items-center text-ivory"><Trash2 size={15} /></button>
              </div>
            </li>
          ))}
          {f.images.length < MAX_IMAGES && (
            <li><button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
              className="grid aspect-[4/5] w-full place-items-center border border-dashed border-ink/30 text-sm text-muted transition hover:border-ink hover:text-ink">
              <span className="grid place-items-center gap-1"><ImagePlus size={22} />{uploading ? "Đang tải…" : "Tải ảnh"}</span></button></li>
          )}
        </ul>
        <input ref={fileRef} type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => upload(e.target.files)} />
        <div className="mt-4 flex gap-2">
          <input aria-label="Dán link ảnh" className="field" placeholder="hoặc dán link ảnh https://…" value={urlDraft} onChange={(e) => setUrlDraft(e.target.value)} />
          <button type="button" className="btn btn-ghost" onClick={() => { if (f.images.length >= MAX_IMAGES) toast(`Tối đa ${MAX_IMAGES} ảnh`, "err"); else if (/^(https?:\/\/|\/)/.test(urlDraft.trim())) { set("images", [...f.images, urlDraft.trim()]); setUrlDraft(""); } else toast("Link ảnh không hợp lệ", "err"); }}>Thêm</button>
        </div>
        {err("images")}
        <div className="mt-6 border-t border-line pt-5">
          <p className="label">Video (1 video, mp4/webm tối đa {MAX_VIDEO_MB}MB)</p>
          {f.videoUrl && <video src={f.videoUrl} controls preload="metadata" className="mb-3 max-h-64 bg-ink" />}
          <div className="flex flex-wrap gap-2">
            <input aria-label="Link video" className="field min-w-0 flex-1" placeholder="dán link video https://… hoặc tải lên Cloudinary" value={f.videoUrl} onChange={(e) => set("videoUrl", e.target.value.trim())} />
            <button type="button" className="btn btn-ghost" disabled={uploading} onClick={() => videoRef.current?.click()}>{uploading ? "Đang tải…" : "Tải video"}</button>
            {f.videoUrl && <button type="button" className="btn btn-ghost" onClick={() => set("videoUrl", "")}>Xoá video</button>}
          </div>
          <input ref={videoRef} type="file" accept="video/mp4,video/webm" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => uploadVideo(e.target.files?.[0])} />
          {err("video")}
        </div>
      </fieldset>

      <fieldset className="border border-line bg-paper p-5 md:p-7">
        <legend className="px-2 font-display text-2xl">4 · Affiliate</legend>
        <div className="grid gap-5 md:grid-cols-2">
          <div><label className="label" htmlFor="merchant">Nơi bán</label>
            <select id="merchant" className="field" value={f.merchant} onChange={(e) => set("merchant", e.target.value)}>{Object.entries(MERCHANTS).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}</select></div>
          <div><label className="label" htmlFor="itemId">Mã sản phẩm trên sàn (chống trùng)</label><input id="itemId" className="field" value={f.itemId} onChange={(e) => set("itemId", e.target.value)} />{err("itemId")}</div>
          <div className="md:col-span-2"><label className="label" htmlFor="affiliateUrl">Link affiliate (nút “Xem sản phẩm trên Shopee”)</label>
            <input id="affiliateUrl" type="url" className="field" value={f.affiliateUrl} onChange={(e) => set("affiliateUrl", e.target.value)} placeholder="https://s.shopee.vn/..." />{err("affiliateUrl")}</div>
          <div className="md:col-span-2"><label className="label" htmlFor="productUrl">Link sản phẩm gốc (dự phòng)</label>
            <input id="productUrl" type="url" className="field" value={f.productUrl} onChange={(e) => set("productUrl", e.target.value)} /></div>
          <div><label className="label" htmlFor="commissionRate">Hoa hồng (%)</label><input id="commissionRate" inputMode="decimal" className="field" value={f.commissionRate} onChange={(e) => set("commissionRate", e.target.value)} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="label" htmlFor="rating">Sao</label><input id="rating" inputMode="decimal" className="field" value={f.rating} onChange={(e) => set("rating", e.target.value)} /></div>
            <div><label className="label" htmlFor="reviewCount">Đánh giá</label><input id="reviewCount" inputMode="numeric" className="field" value={f.reviewCount} onChange={(e) => set("reviewCount", e.target.value.replace(/\D/g, ""))} /></div>
            <div><label className="label" htmlFor="sold">Đã bán</label><input id="sold" inputMode="numeric" className="field" value={f.sold} onChange={(e) => set("sold", e.target.value.replace(/\D/g, ""))} /></div>
          </div>
        </div>
        <p className="mt-4 text-xs text-muted">Chỉ nhận link http(s). Mọi lượt bấm đi qua /go/… để ghi nhận click trước khi chuyển sang sàn.</p>
      </fieldset>

      <fieldset className="border border-line bg-paper p-5 md:p-7">
        <legend className="px-2 font-display text-2xl">5 · Chi tiết kiểu Shopee (JSON)</legend>
        <p className="mb-4 text-sm text-muted">Dữ liệu cào về: phân loại, thuộc tính, shop, vận chuyển, đánh giá… Để trống nếu không dùng. Cùng định dạng với file nhập/xuất <code>eleonore.products.v1</code>.</p>
        <div className="grid gap-5">
          {([["detailJson", "detail", "Chi tiết (stock, variants, attributes, shop, shipping, video…)"], ["reviewsJson", "reviews", "Đánh giá khách hàng (mảng; có dữ liệu sẽ thay toàn bộ đánh giá cũ)"], ["rawJson", "rawData", "Dữ liệu gốc (cột CLOB lưu toàn bộ JSON để so sánh)"]] as const).map(([k, ek, label]) => (
            <div key={k}><label className="label" htmlFor={k}>{label}</label>
              <textarea id={k} rows={8} spellCheck={false} className="field font-mono text-xs" value={f[k]} onChange={(e) => set(k, e.target.value)} aria-invalid={Boolean(errors[ek])} />{err(ek)}</div>
          ))}
        </div>
      </fieldset>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-4 border-t border-line bg-ivory/95 px-4 py-4 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:px-0" style={{ zIndex: "var(--z-sticky)" }}>
        <label className="flex items-center gap-2 text-sm"><span className="font-semibold">Trạng thái</span>
          <select className="field !w-auto" value={f.status} onChange={(e) => set("status", e.target.value as FormState["status"])}>
            <option value="published">Đang bán</option><option value="draft">Nháp</option><option value="archived">Lưu trữ</option></select></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-5 w-5 accent-[var(--color-ink)]" checked={f.isFeatured} onChange={(e) => set("isFeatured", e.target.checked)} /> Nổi bật</label>
        <button type="submit" disabled={busy} className="btn btn-solid ml-auto">{busy ? "Đang lưu…" : product ? "Lưu thay đổi" : "Thêm sản phẩm"}</button>
      </div>
    </form>
  );
}
