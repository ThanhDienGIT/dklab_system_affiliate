"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { CategoryDTO, StyleDTO, Taxonomy, TypeDTO } from "@/server/domain/types";
import { apiFetch, ApiError } from "@/lib/api-client";
import { slugify } from "@/lib/text";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/providers";
import { SmartImage } from "@/components/ui/smart-image";
import { cn } from "@/lib/utils";

type Kind = "style" | "category" | "type";
type Editing = { kind: Kind; id: number | null; data: Record<string, unknown> } | null;
const list = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

export function TaxonomyManager({ taxonomy }: { taxonomy: Taxonomy }) {
  const router = useRouter();
  const toast = useToast();
  const [edit, setEdit] = useState<Editing>(null);
  const [tab, setTab] = useState<Kind>("style");

  const blank = (kind: Kind, catId?: number): Editing => ({
    kind, id: null,
    data: kind === "style" ? { name: "", slug: "", tagline: "", intro: "", palette: [], signatureItems: [], keywords: [], heroImage: null, moodImages: [], sortOrder: taxonomy.styles.length, isActive: true }
      : kind === "category" ? { name: "", slug: "", aliases: [], sortOrder: taxonomy.categories.length, isActive: true }
      : { categoryId: catId ?? taxonomy.categories[0]?.id, name: "", slug: "", aliases: [], sortOrder: 0, isActive: true },
  });
  const remove = async (kind: Kind, id: number, name: string) => {
    if (!confirm(`Xoá “${name}”? Chỉ xoá được khi không còn sản phẩm thuộc mục này.`)) return;
    try { await apiFetch(`/api/admin/taxonomy?kind=${kind}&id=${id}`, { method: "DELETE" }); toast("Đã xoá"); router.refresh(); }
    catch (e) { toast(e instanceof Error ? e.message : "Xoá thất bại", "err"); }
  };

  const tabs: { k: Kind; label: string }[] = [{ k: "style", label: `Phong cách (${taxonomy.styles.length})` }, { k: "category", label: `Thể loại / submenu (${taxonomy.categories.length})` }, { k: "type", label: `Loại cụ thể (${taxonomy.types.length})` }];
  return (
    <div>
      <p className="mb-6 max-w-3xl text-sm text-ink-soft">Cấu trúc menu: <strong>Phong cách</strong> (cấp 1) → <strong>Thể loại</strong> (submenu, dùng chung cho mọi phong cách) → <strong>Loại cụ thể</strong> (vd: Đầm babydoll thuộc thể loại Quần áo). Thêm thể loại mới sẽ xuất hiện ở submenu của tất cả phong cách.</p>
      <div role="tablist" className="mb-6 flex gap-1 overflow-x-auto border-b border-line">
        {tabs.map((t) => <button key={t.k} role="tab" aria-selected={tab === t.k} onClick={() => setTab(t.k)} className={cn("shrink-0 border-b-2 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em]", tab === t.k ? "border-ink" : "border-transparent text-muted")}>{t.label}</button>)}
      </div>

      {tab === "style" && (
        <>
          <Toolbar onAdd={() => setEdit(blank("style"))} label="Thêm phong cách" />
          <ul className="grid gap-3 md:grid-cols-2">
            {taxonomy.styles.map((s) => (
              <li key={s.id} className="flex gap-4 border border-line bg-paper p-3">
                <div className="relative h-24 w-20 shrink-0 overflow-hidden bg-sand"><SmartImage src={s.heroImage} alt="" sizes="80px" /></div>
                <div className="min-w-0 flex-1"><p className="font-display text-2xl leading-tight">{s.name}{!s.isActive && <span className="ml-2 text-xs text-muted">(ẩn)</span>}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted">{s.tagline}</p><p className="mt-1 text-[11px] text-ink-soft">/{s.slug}</p></div>
                <RowBtns onEdit={() => setEdit({ kind: "style", id: s.id, data: { ...s } })} onDelete={() => remove("style", s.id, s.name)} />
              </li>
            ))}
          </ul>
        </>
      )}
      {tab === "category" && (
        <>
          <Toolbar onAdd={() => setEdit(blank("category"))} label="Thêm thể loại" />
          <ul className="grid gap-2">
            {taxonomy.categories.map((c) => (
              <li key={c.id} className="flex items-center gap-3 border border-line bg-paper px-4 py-3">
                <div className="min-w-0 flex-1"><p className="font-medium">{c.name}{!c.isActive && <span className="ml-2 text-xs text-muted">(ẩn)</span>}</p>
                  <p className="truncate text-xs text-muted">/{c.slug} · bí danh tìm kiếm: {c.aliases.join(", ") || "—"}</p></div>
                <RowBtns onEdit={() => setEdit({ kind: "category", id: c.id, data: { ...c } })} onDelete={() => remove("category", c.id, c.name)} />
              </li>
            ))}
          </ul>
        </>
      )}
      {tab === "type" && (
        <div className="space-y-8">
          {taxonomy.categories.map((c) => (
            <section key={c.id}>
              <div className="mb-2 flex items-center justify-between"><h3 className="font-sans text-sm font-semibold uppercase tracking-[0.16em]">{c.name}</h3>
                <button type="button" className="text-sm underline underline-offset-4" onClick={() => setEdit(blank("type", c.id))}>+ Thêm loại</button></div>
              <ul className="grid gap-2 md:grid-cols-2">
                {taxonomy.types.filter((t) => t.categoryId === c.id).map((t) => (
                  <li key={t.id} className="flex items-center gap-3 border border-line bg-paper px-4 py-2.5">
                    <div className="min-w-0 flex-1"><p className="text-sm font-medium">{t.name}</p><p className="truncate text-xs text-muted">/{t.slug}{t.aliases.length ? ` · ${t.aliases.join(", ")}` : ""}</p></div>
                    <RowBtns onEdit={() => setEdit({ kind: "type", id: t.id, data: { ...t } })} onDelete={() => remove("type", t.id, t.name)} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {edit && <EditDialog key={`${edit.kind}-${edit.id ?? "new"}`} edit={edit} categories={taxonomy.categories} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); router.refresh(); }} />}
    </div>
  );
}

function Toolbar({ onAdd, label }: { onAdd: () => void; label: string }) {
  return <div className="mb-4 flex justify-end"><button type="button" onClick={onAdd} className="btn btn-solid"><Plus size={16} /> {label}</button></div>;
}
function RowBtns({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex shrink-0 items-center">
      <button type="button" aria-label="Sửa" onClick={onEdit} className="grid h-10 w-10 place-items-center hover:text-gold-deep"><Pencil size={16} /></button>
      <button type="button" aria-label="Xoá" onClick={onDelete} className="grid h-10 w-10 place-items-center text-rose"><Trash2 size={16} /></button>
    </div>
  );
}

function EditDialog({ edit, categories, onClose, onSaved }: { edit: NonNullable<Editing>; categories: CategoryDTO[]; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [d, setD] = useState<Record<string, unknown>>(edit.data);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [slugTouched, setSlugTouched] = useState(edit.id !== null);
  const set = (k: string, v: unknown) => setD((s) => ({ ...s, [k]: v }));
  const str = (k: string) => String(d[k] ?? "");
  const arr = (k: string) => ((d[k] as string[] | undefined) ?? []).join(", ");
  const palette = (d.palette as { name: string; hex: string }[] | undefined) ?? [];
  const title = { style: "phong cách", category: "thể loại", type: "loại cụ thể" }[edit.kind];

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErrors({});
    const base = { ...d, sortOrder: Number(d.sortOrder) || 0, isActive: Boolean(d.isActive) };
    const data = edit.kind === "type" ? { ...base, categoryId: Number(d.categoryId) } : base;
    try { await apiFetch("/api/admin/taxonomy", { body: { kind: edit.kind, id: edit.id, data } }); toast("Đã lưu"); onSaved(); }
    catch (err) { if (err instanceof ApiError) { setErrors(err.fields ?? {}); toast(err.message, "err"); } else toast("Lưu thất bại", "err"); setBusy(false); }
  }
  const e1 = (k: string) => errors[k] && <p className="mt-1 text-xs text-rose">{errors[k]}</p>;

  return (
    <Modal open onOpenChange={(v) => !v && onClose()} title={`${edit.id ? "Sửa" : "Thêm"} ${title}`} className="!max-w-2xl">
      <form onSubmit={save} className="grid gap-4 p-6 pt-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label" htmlFor="t-name">Tên</label>
            <input id="t-name" className="field" value={str("name")} onChange={(e) => { set("name", e.target.value); if (!slugTouched) set("slug", slugify(e.target.value)); }} />{e1("name")}</div>
          <div><label className="label" htmlFor="t-slug">Slug</label>
            <input id="t-slug" className="field" value={str("slug")} onChange={(e) => { setSlugTouched(true); set("slug", e.target.value); }} />{e1("slug")}</div>
        </div>
        {edit.kind === "type" && (
          <div><label className="label" htmlFor="t-cat">Thuộc thể loại</label>
            <select id="t-cat" className="field" value={str("categoryId")} onChange={(e) => set("categoryId", Number(e.target.value))}>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        )}
        {edit.kind !== "style" && (
          <div><label className="label" htmlFor="t-alias">Bí danh tìm kiếm (cách nhau dấu phẩy)</label>
            <input id="t-alias" className="field" value={arr("aliases")} onChange={(e) => set("aliases", list(e.target.value))} placeholder="vd: dam baby doll, váy babydoll" />
            <p className="mt-1 text-xs text-muted">Giúp tìm kiếm hiểu “đầm baby doll” = Đầm babydoll.</p></div>
        )}
        {edit.kind === "style" && (
          <>
            <div><label className="label" htmlFor="t-tag">Câu giới thiệu ngắn</label><input id="t-tag" className="field" value={str("tagline")} onChange={(e) => set("tagline", e.target.value)} /></div>
            <div><label className="label" htmlFor="t-intro">Giới thiệu</label><textarea id="t-intro" rows={4} className="field" value={str("intro")} onChange={(e) => set("intro", e.target.value)} /></div>
            <div><label className="label" htmlFor="t-sig">Món đồ đặc trưng (dấu phẩy)</label><input id="t-sig" className="field" value={arr("signatureItems")} onChange={(e) => set("signatureItems", list(e.target.value))} /></div>
            <div><label className="label" htmlFor="t-kw">Từ khoá nhận diện (dấu phẩy)</label><input id="t-kw" className="field" value={arr("keywords")} onChange={(e) => set("keywords", list(e.target.value))} /></div>
            <div>
              <p className="label">Bảng màu</p>
              <ul className="space-y-2">
                {palette.map((p, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <input type="color" aria-label="Màu" value={p.hex} onChange={(e) => set("palette", palette.map((x, j) => (j === i ? { ...x, hex: e.target.value } : x)))} className="h-11 w-12 shrink-0 border border-line bg-paper" />
                    <input aria-label="Tên màu" className="field" value={p.name} onChange={(e) => set("palette", palette.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                    <button type="button" aria-label="Xoá màu" className="grid h-11 w-11 shrink-0 place-items-center text-rose" onClick={() => set("palette", palette.filter((_, j) => j !== i))}><Trash2 size={15} /></button>
                  </li>
                ))}
              </ul>
              {palette.length < 8 && <button type="button" className="mt-2 text-sm underline underline-offset-4" onClick={() => set("palette", [...palette, { name: "Màu mới", hex: "#c4a052" }])}>+ Thêm màu</button>}
            </div>
            <div><label className="label" htmlFor="t-hero">Ảnh đại diện (đường dẫn)</label><input id="t-hero" className="field" value={str("heroImage")} onChange={(e) => set("heroImage", e.target.value || null)} placeholder="/media/styles/y2k-hero.webp hoặc https://…" /></div>
            <div><label className="label" htmlFor="t-mood">Ảnh mood (mỗi dòng 1 đường dẫn, tối đa 6)</label>
              <textarea id="t-mood" rows={3} className="field" value={((d.moodImages as string[]) ?? []).join("\n")} onChange={(e) => set("moodImages", e.target.value.split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 6))} /></div>
          </>
        )}
        <div className="grid items-end gap-4 sm:grid-cols-2">
          <div><label className="label" htmlFor="t-order">Thứ tự hiển thị</label><input id="t-order" inputMode="numeric" className="field" value={str("sortOrder")} onChange={(e) => set("sortOrder", e.target.value.replace(/[^\d-]/g, ""))} /></div>
          <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" className="h-5 w-5 accent-[var(--color-ink)]" checked={Boolean(d.isActive)} onChange={(e) => set("isActive", e.target.checked)} /> Hiển thị trên website</label>
        </div>
        <div className="flex justify-end gap-3 pt-2"><button type="button" className="btn btn-ghost" onClick={onClose}>Huỷ</button><button className="btn btn-solid" disabled={busy}>{busy ? "Đang lưu…" : "Lưu"}</button></div>
      </form>
    </Modal>
  );
}
export type { StyleDTO, TypeDTO };
