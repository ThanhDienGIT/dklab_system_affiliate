"use client";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { useToast } from "@/components/ui/providers";
import { Modal } from "@/components/ui/modal";

interface Filter { q?: string; status?: string; pc?: string; tl?: string }
interface Ctx {
  selected: Set<number>; allMatching: boolean; pageIds: number[];
  toggle: (id: number) => void; togglePage: () => void; selectAllMatching: () => void; clear: () => void;
}
const BulkCtx = createContext<Ctx | null>(null);
const useBulk = () => { const c = useContext(BulkCtx); if (!c) throw new Error("Thiếu BulkProvider"); return c; };

/** Bao quanh thanh cong cu + bang: giu trang thai chon, ke ca "chon tat ca N san pham khop bo loc" (qua nhieu trang). */
export function BulkProvider({ pageIds, total, filter, children }: { pageIds: number[]; total: number; filter: Filter; children: ReactNode }) {
  const router = useRouter();
  const toast = useToast();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [allMatching, setAllMatching] = useState(false);
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  const clear = useCallback(() => { setSelected(new Set()); setAllMatching(false); }, []);
  const toggle = useCallback((id: number) => { setAllMatching(false); setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; }); }, []);
  const pageAll = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const togglePage = useCallback(() => { setAllMatching(false); setSelected(pageAll ? new Set() : new Set(pageIds)); }, [pageAll, pageIds]);
  const ctx = useMemo<Ctx>(() => ({ selected, allMatching, pageIds, toggle, togglePage, selectAllMatching: () => setAllMatching(true), clear }), [selected, allMatching, pageIds, toggle, togglePage, clear]);

  const count = allMatching ? total : selected.size;
  const isFiltered = Boolean(filter.q || filter.status || filter.pc || filter.tl);
  const needType = allMatching;

  async function doDelete() {
    setBusy(true);
    try {
      const body = allMatching ? { all: true, confirm: "XOA", password: pw, filter } : { ids: [...selected] };
      const r = await apiFetch<{ deleted: number }>("/api/admin/products/bulk-delete", { body });
      toast(`Đã xoá ${r.deleted} sản phẩm`);
      setOpen(false); setTyped(""); setPw(""); clear(); router.refresh();
    } catch (e) { toast(e instanceof Error ? e.message : "Xoá thất bại", "err"); setPw(""); }
    setBusy(false);
  }

  return (
    <BulkCtx.Provider value={ctx}>
      <div className="mb-4 flex flex-wrap items-center gap-3 border border-line bg-paper px-4 py-3 text-sm" role="region" aria-label="Thao tác hàng loạt" aria-live="polite">
        {count === 0 ? (
          <>
            <span className="text-muted">Tick ô vuông để chọn sản phẩm cần xoá.</span>
            {total > 0 && <button type="button" className="ml-auto text-xs text-rose underline underline-offset-4" onClick={() => { ctx.selectAllMatching(); }}>Chọn tất cả {total} sản phẩm{isFiltered ? " đang lọc" : ""}</button>}
          </>
        ) : (
          <>
            <strong>{allMatching ? `Đã chọn tất cả ${total} sản phẩm${isFiltered ? " đang lọc" : ""}` : `Đã chọn ${selected.size} sản phẩm`}</strong>
            {!allMatching && pageAll && total > pageIds.length && (
              <button type="button" className="text-xs underline underline-offset-4 hover:text-gold-deep" onClick={ctx.selectAllMatching}>Chọn cả {total} sản phẩm{isFiltered ? " đang lọc" : ""} (mọi trang)</button>
            )}
            <button type="button" className="text-xs text-muted underline underline-offset-4 hover:text-ink" onClick={clear}>Bỏ chọn</button>
            <button type="button" className="btn ml-auto !bg-rose !text-white" onClick={() => { setTyped(""); setPw(""); setOpen(true); }}><Trash2 size={15} /> Xoá {count}</button>
          </>
        )}
      </div>
      {children}

      <Modal open={open} onOpenChange={(v) => { if (!busy) setOpen(v); }} title={`Xoá ${count} sản phẩm?`}
        description="Xoá vĩnh viễn kèm đánh giá, lượt click và yêu thích của các sản phẩm này. Không thể hoàn tác. Nên Xuất JSON để sao lưu trước.">
        <div className="space-y-4 p-6 pt-4">
          {allMatching && (
            <>
              <p className="text-sm font-semibold text-rose">{isFiltered ? "Xoá MỌI sản phẩm khớp bộ lọc hiện tại, ở tất cả các trang." : "Bạn sắp xoá TOÀN BỘ sản phẩm của website."}</p>
              <label className="block text-sm">Gõ <code className="bg-sand px-1.5 py-0.5 font-semibold">XOA</code> để xác nhận
                <input className="field mt-1" autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="XOA" /></label>
              <label className="block text-sm">Nhập <strong>mật khẩu admin</strong> của bạn
                <input className="field mt-1" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !(busy || typed.trim().toUpperCase() !== "XOA" || !pw)) void doDelete(); }} /></label>
            </>
          )}
          <div className="flex flex-wrap justify-end gap-3">
            <a href="/api/admin/export?format=json" className="btn btn-ghost mr-auto text-xs">Sao lưu JSON trước</a>
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setOpen(false)}>Huỷ</button>
            <button type="button" className="btn !bg-rose !text-white" disabled={busy || (needType && (typed.trim().toUpperCase() !== "XOA" || !pw))} onClick={doDelete}>
              {busy ? "Đang xoá…" : `Xoá ${count} sản phẩm`}</button>
          </div>
        </div>
      </Modal>
    </BulkCtx.Provider>
  );
}

export function HeadCheck() {
  const { selected, pageIds, togglePage, allMatching } = useBulk();
  const all = allMatching || (pageIds.length > 0 && pageIds.every((id) => selected.has(id)));
  const some = !all && pageIds.some((id) => selected.has(id));
  return <input type="checkbox" aria-label="Chọn tất cả sản phẩm trên trang này" className="h-5 w-5 accent-[var(--color-ink)]" checked={all}
    ref={(el) => { if (el) el.indeterminate = some; }} onChange={togglePage} />;
}

export function RowCheck({ id, name }: { id: number; name: string }) {
  const { selected, toggle, allMatching } = useBulk();
  return <input type="checkbox" aria-label={`Chọn ${name}`} className="h-5 w-5 accent-[var(--color-ink)]" checked={allMatching || selected.has(id)} onChange={() => toggle(id)} />;
}
