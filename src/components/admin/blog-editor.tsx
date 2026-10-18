"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Trash2 } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useToast } from "@/components/ui/providers";
import { Markdown } from "@/components/blog/markdown";

interface Post {
  id: number; slug: string; title: string; excerpt: string; content: string; coverUrl: string | null; status: "draft" | "published";
  sourceMode: string; sources: { url: string; title: string; host: string }[]; imageCandidates: string[]; aiModel: string | null;
}

export function BlogEditor({ post, products }: { post: Post; products: { id: number; name: string; slug: string }[] }) {
  const router = useRouter();
  const toast = useToast();
  const [p, setP] = useState(post);
  const [prods, setProds] = useState(products);
  const [preview, setPreview] = useState(false);
  const [imgDraft, setImgDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Post>(k: K, v: Post[K]) => setP((x) => ({ ...x, [k]: v }));

  async function save(status?: "draft" | "published") {
    setBusy(true);
    try {
      await apiFetch(`/api/admin/blog/${p.id}`, {
        method: "PATCH",
        body: { title: p.title, slug: p.slug, excerpt: p.excerpt, content: p.content, coverUrl: p.coverUrl ?? "", productIds: prods.map((x) => x.id), ...(status ? { status } : {}) },
      });
      if (status) set("status", status);
      toast(status === "published" ? "Đã xuất bản" : status === "draft" ? "Đã chuyển về nháp" : "Đã lưu");
      router.refresh();
    } catch (e) { toast(e instanceof ApiError ? e.message : "Lưu thất bại", "err"); }
    setBusy(false);
  }
  async function remove() {
    if (!confirm("Xoá bài viết này? Không thể hoàn tác.")) return;
    try { await apiFetch(`/api/admin/blog/${p.id}`, { method: "DELETE" }); toast("Đã xoá"); router.push("/admin/blog"); router.refresh(); }
    catch (e) { toast(e instanceof Error ? e.message : "Xoá thất bại", "err"); }
  }
  const copy = async (text: string) => { try { await navigator.clipboard.writeText(text); toast("Đã copy"); } catch { toast("Không copy được", "err"); } };
  const addImg = () => {
    const u = imgDraft.trim();
    if (!/^https?:\/\//.test(u)) { toast("Link ảnh phải bắt đầu bằng http(s)://", "err"); return; }
    if (!p.imageCandidates.includes(u)) set("imageCandidates", [...p.imageCandidates, u]);
    setImgDraft("");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-4xl">Sửa bài blog</h1>
        <span className={`text-xs uppercase tracking-wider ${p.status === "published" ? "text-green-700" : "text-muted"}`}>{p.status === "published" ? "Đã xuất bản" : "Bản nháp"}{p.aiModel ? ` · AI: ${p.aiModel}` : ""}</span>
      </div>
      {p.status === "draft" && <p className="border border-gold-deep/40 bg-sand/50 p-3 text-sm">Bài do AI viết — hãy đọc lại, kiểm tra thông tin trước khi xuất bản.</p>}

      <section className="space-y-4 border border-line bg-paper p-5 md:p-7">
        <div><label className="label" htmlFor="b-title">Tiêu đề</label><input id="b-title" className="field" value={p.title} onChange={(e) => set("title", e.target.value)} /></div>
        <div className="grid gap-4 md:grid-cols-2">
          <div><label className="label" htmlFor="b-slug">Slug (đường dẫn)</label><input id="b-slug" className="field" value={p.slug} onChange={(e) => set("slug", e.target.value)} /></div>
          <div><label className="label" htmlFor="b-cover">Ảnh bìa (URL)</label><input id="b-cover" className="field" value={p.coverUrl ?? ""} onChange={(e) => set("coverUrl", e.target.value || null)} placeholder="https://…" /></div>
        </div>
        <div><label className="label" htmlFor="b-ex">Mô tả ngắn</label><textarea id="b-ex" rows={2} className="field" value={p.excerpt} onChange={(e) => set("excerpt", e.target.value)} /></div>
      </section>

      <section className="border border-line bg-paper p-5 md:p-7">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-2xl">Nội dung (Markdown)</h2>
          <button type="button" className="btn btn-ghost" onClick={() => setPreview((v) => !v)}>{preview ? "Soạn thảo" : "Xem trước"}</button>
        </div>
        {preview ? <div className="max-h-[70vh] overflow-auto border border-line p-4"><Markdown>{p.content}</Markdown></div>
          : <textarea aria-label="Nội dung" rows={24} className="field font-mono text-sm" value={p.content} onChange={(e) => set("content", e.target.value)} />}
        <p className="mt-2 text-xs text-muted">Chèn ảnh: <code>![mô tả](https://…)</code>. Link sản phẩm: <code>[Tên](/san-pham/slug)</code>.</p>
      </section>

      <section className="border border-line bg-paper p-5 md:p-7">
        <h2 className="text-2xl">Ảnh</h2>
        <p className="mt-1 text-xs text-muted">Ảnh dùng link từ web nguồn (không tải về để nhẹ site). Nếu nguồn xoá/chặn ảnh thì ảnh sẽ mất — ưu tiên ảnh của bạn khi có thể.</p>
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {p.imageCandidates.map((src) => (
            <li key={src} className="space-y-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" className="aspect-square w-full bg-sand object-cover" />
              <div className="flex gap-1 text-[11px]">
                <button type="button" className="underline" onClick={() => set("coverUrl", src)}>Làm bìa</button>
                <button type="button" aria-label="Copy markdown ảnh" className="ml-auto" onClick={() => copy(`![](${src})`)}><Copy size={13} /></button>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex gap-2">
          <input aria-label="Thêm link ảnh" className="field" placeholder="Dán thêm link ảnh https://…" value={imgDraft} onChange={(e) => setImgDraft(e.target.value)} />
          <button type="button" className="btn btn-ghost" onClick={addImg}>Thêm</button>
        </div>
      </section>

      <section className="border border-line bg-paper p-5 md:p-7">
        <h2 className="text-2xl">Sản phẩm được nhắc tới</h2>
        <p className="mt-1 text-xs text-muted">Bài sẽ hiện ở trang các sản phẩm này. Bỏ sản phẩm không muốn gắn.</p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {prods.map((x) => (
            <li key={x.id} className="flex items-center gap-1 border border-line px-3 py-1.5 text-sm">{x.name}
              <button type="button" aria-label={`Bỏ ${x.name}`} onClick={() => setProds((a) => a.filter((y) => y.id !== x.id))}><Trash2 size={14} /></button></li>
          ))}
        </ul>
        {p.sources.length > 0 && (<>
          <h3 className="mt-6 text-lg">Nguồn AI đã tham khảo</h3>
          <ul className="mt-2 list-disc pl-5 text-sm">{p.sources.map((s) => <li key={s.url}><a className="underline" href={s.url} target="_blank" rel="noopener noreferrer nofollow">{s.title || s.host}</a> <span className="text-muted">({s.host})</span></li>)}</ul>
        </>)}
      </section>

      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn btn-solid" disabled={busy} onClick={() => save()}>Lưu</button>
        {p.status === "draft"
          ? <button type="button" className="btn btn-solid" disabled={busy} onClick={() => save("published")}>Lưu & xuất bản</button>
          : <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => save("draft")}>Gỡ về nháp</button>}
        {p.status === "published" && <a className="btn btn-ghost" href={`/blog/${p.slug}`} target="_blank" rel="noopener noreferrer">Xem trên web</a>}
        <button type="button" className="btn btn-ghost ml-auto text-rose" onClick={remove}>Xoá bài</button>
      </div>
    </div>
  );
}
