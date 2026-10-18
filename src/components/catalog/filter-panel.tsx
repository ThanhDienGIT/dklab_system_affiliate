"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { SlidersHorizontal } from "lucide-react";
import type { CategoryDTO, Facets, StyleDTO } from "@/server/domain/types";
import { COLORS, PRICE_BUCKETS, SORTS, type SortKey } from "@/lib/constants";
import { buildHref, type CatalogState } from "@/lib/catalog-params";
import { formatVnd } from "@/lib/format";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

interface Props {
  path: string; state: CatalogState; facets: Facets; defaultSort: SortKey; total: number;
  styles?: StyleDTO[]; categories?: CategoryDTO[]; lockStyle?: boolean; lockCategory?: boolean;
}

export function FilterPanel(props: Props) {
  const [open, setOpen] = useState(false);
  const active = props.state.colors.length + (props.state.type ? 1 : 0) + (props.state.min !== undefined || props.state.max !== undefined ? 1 : 0)
    + (!props.lockStyle && props.state.style ? 1 : 0) + (!props.lockCategory && props.state.category ? 1 : 0);
  return (
    <>
      <div className="flex items-center justify-between gap-3 lg:hidden">
        <button type="button" onClick={() => setOpen(true)} className="btn btn-ghost !min-h-11 !px-4">
          <SlidersHorizontal size={15} /> Bộ lọc{active ? ` (${active})` : ""}
        </button>
        <SortSelect {...props} />
      </div>
      <Modal open={open} onOpenChange={setOpen} title="Bộ lọc" side="left" className="pb-24">
        <div className="px-6 pt-4"><Fields {...props} /></div>
        <div className="fixed bottom-0 left-0 w-[88vw] max-w-sm border-t border-line bg-ivory p-4">
          <button type="button" className="btn btn-solid w-full" onClick={() => setOpen(false)}>Xem {props.total} sản phẩm</button>
        </div>
      </Modal>
      <aside aria-label="Bộ lọc sản phẩm" className="hidden lg:block"><Fields {...props} /></aside>
    </>
  );
}

export function SortSelect({ path, state, defaultSort }: Pick<Props, "path" | "state" | "defaultSort">) {
  const router = useRouter();
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="hidden text-muted sm:inline">Sắp xếp</span>
      <select value={state.sort} onChange={(e) => router.push(buildHref(path, state, { sort: e.target.value, page: 1 }, defaultSort), { scroll: false })}
        className="field !min-h-11 !w-auto !py-2 pr-8" aria-label="Sắp xếp sản phẩm">
        {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>
    </label>
  );
}

function Fields({ path, state, facets, defaultSort, styles, categories, lockStyle, lockCategory }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [min, setMin] = useState(state.min?.toString() ?? "");
  const [max, setMax] = useState(state.max?.toString() ?? "");
  const go = (patch: Partial<Record<keyof CatalogState, unknown>>) =>
    start(() => router.push(buildHref(path, state, { ...patch, page: 1 }, defaultSort), { scroll: false }));
  const bucketOn = (b: (typeof PRICE_BUCKETS)[number]) => state.min === b.min && state.max === b.max;
  const hasFilter = state.colors.length || state.type || state.min !== undefined || state.max !== undefined || (!lockStyle && state.style) || (!lockCategory && state.category);

  return (
    <div className={cn("space-y-7 transition-opacity", pending && "opacity-60")}>
      <div className="flex items-center justify-between">
        <p className="eyebrow">Bộ lọc</p>
        {hasFilter ? (
          <button type="button" className="text-xs underline underline-offset-4 hover:text-gold-deep"
            onClick={() => start(() => router.push(buildHref(path, { ...state, type: undefined, colors: [], min: undefined, max: undefined, style: lockStyle ? state.style : undefined, category: lockCategory ? state.category : undefined, page: 1 }, {}, defaultSort), { scroll: false }))}>
            Xoá bộ lọc
          </button>
        ) : null}
      </div>

      {!lockStyle && styles && (
        <Group title="Phong cách">
          {styles.map((s) => (
            <Radio key={s.slug} checked={state.style === s.slug} onClick={() => go({ style: state.style === s.slug ? undefined : s.slug, type: undefined })} label={s.name} />
          ))}
        </Group>
      )}
      {!lockCategory && categories && (
        <Group title="Thể loại">
          {categories.map((c) => (
            <Radio key={c.slug} checked={state.category === c.slug} onClick={() => go({ category: state.category === c.slug ? undefined : c.slug, type: undefined })} label={c.name} />
          ))}
        </Group>
      )}
      {facets.types.length > 0 && (
        <Group title="Loại cụ thể">
          {facets.types.map((t) => (
            <Radio key={t.slug} checked={state.type === t.slug} onClick={() => go({ type: state.type === t.slug ? undefined : t.slug })} label={t.name} count={t.count} />
          ))}
        </Group>
      )}
      <Group title="Màu sắc">
        <div className="flex flex-wrap gap-2.5">
          {facets.colors.map((f) => {
            const c = COLORS.find((x) => x.slug === f.slug);
            if (!c) return null;
            const on = state.colors.includes(c.slug);
            return (
              <button key={c.slug} type="button" aria-pressed={on} aria-label={`${c.name} (${f.count})`} title={`${c.name} (${f.count})`}
                onClick={() => go({ colors: on ? state.colors.filter((x) => x !== c.slug) : [...state.colors, c.slug] })}
                className={cn("h-8 w-8 rounded-full border transition", on ? "border-ink ring-2 ring-gold ring-offset-2 ring-offset-ivory" : "border-ink/20 hover:border-ink")}
                style={{ background: c.hex }} />
            );
          })}
        </div>
      </Group>
      <Group title="Khoảng giá">
        {PRICE_BUCKETS.map((b) => (
          <Radio key={b.label} checked={bucketOn(b)} onClick={() => go(bucketOn(b) ? { min: undefined, max: undefined } : { min: b.min, max: b.max })} label={b.label} />
        ))}
        <form className="mt-3 flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); go({ min: min ? Number(min) : undefined, max: max ? Number(max) : undefined }); }}>
          <input inputMode="numeric" aria-label="Giá từ" placeholder="Từ" value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ""))} className="field !min-h-10 !px-2.5 !py-1.5 text-sm" />
          <span aria-hidden>–</span>
          <input inputMode="numeric" aria-label="Giá đến" placeholder="Đến" value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))} className="field !min-h-10 !px-2.5 !py-1.5 text-sm" />
          <button type="submit" className="btn btn-ghost !min-h-10 !px-3">OK</button>
        </form>
        <p className="mt-2 text-[11px] text-muted">Giá trong kho: {formatVnd(facets.priceMin)} – {formatVnd(facets.priceMax)}</p>
      </Group>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-3 text-xs font-semibold uppercase tracking-[0.16em]">{title}</legend>
      <div className="space-y-0.5">{children}</div>
    </fieldset>
  );
}
function Radio({ checked, onClick, label, count }: { checked: boolean; onClick: () => void; label: string; count?: number }) {
  return (
    <button type="button" role="radio" aria-checked={checked} onClick={onClick}
      className={cn("flex min-h-9 w-full items-center gap-2.5 py-1 text-left text-sm transition-colors hover:text-gold-deep", checked && "font-semibold text-ink")}>
      <span className={cn("grid h-4 w-4 shrink-0 place-items-center rounded-full border", checked ? "border-ink" : "border-ink/30")}>
        {checked && <span className="h-2 w-2 rounded-full bg-ink" />}
      </span>
      <span className="flex-1">{label}</span>
      {count !== undefined && <span className="text-xs text-muted">{count}</span>}
    </button>
  );
}
