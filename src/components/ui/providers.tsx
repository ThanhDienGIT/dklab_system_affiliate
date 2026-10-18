"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import type { SessionUser } from "@/server/domain/types";

/* ---------- Toast ---------- */
interface ToastItem { id: number; text: string; kind: "ok" | "err" }
const ToastCtx = createContext<(text: string, kind?: "ok" | "err") => void>(() => {});
export const useToast = () => useContext(ToastCtx);

/* ---------- Session ---------- */
const UserCtx = createContext<SessionUser | null>(null);
export const useSessionUser = () => useContext(UserCtx);

/* ---------- Yeu thich: khach luu localStorage, dang nhap thi dong bo DB ---------- */
interface FavApi { ids: Set<number>; toggle: (id: number) => void; ready: boolean }
const FavCtx = createContext<FavApi>({ ids: new Set(), toggle: () => {}, ready: false });
export const useFavorites = () => useContext(FavCtx);
const LS_KEY = "el_fav";

export function readLocalFavorites(): number[] {
  try {
    const v = JSON.parse(localStorage.getItem(LS_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((n) => Number.isInteger(n)).slice(0, 200) : [];
  } catch { return []; }
}
const writeLocal = (ids: Iterable<number>) => { try { localStorage.setItem(LS_KEY, JSON.stringify([...ids])); } catch { /* private mode */ } };

export function Providers({ user, children }: { user: SessionUser | null; children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const seq = useRef(0);
  const toast = useCallback((text: string, kind: "ok" | "err" = "ok") => {
    const id = ++seq.current;
    setToasts((t) => [...t.slice(-2), { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const [ids, setIds] = useState<Set<number>>(new Set());
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    (async () => {
      if (user) {
        try {
          const r = await fetch("/api/favorites", { cache: "no-store" });
          const j = (await r.json()) as { ids: number[] };
          // gop yeu thich cua khach luc chua dang nhap vao tai khoan
          const local = readLocalFavorites();
          const missing = local.filter((x) => !j.ids.includes(x));
          for (const id of missing) await fetch("/api/favorites", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ productId: id, on: true }) });
          if (missing.length) { try { localStorage.removeItem(LS_KEY); } catch { /* */ } }
          if (alive) setIds(new Set([...j.ids, ...missing]));
        } catch { /* offline: bo qua */ }
      } else if (alive) setIds(new Set(readLocalFavorites()));
      if (alive) setReady(true);
    })();
    return () => { alive = false; };
  }, [user]);

  const idsRef = useRef(ids);
  idsRef.current = ids;
  const toggle = useCallback((id: number) => {
    const on = !idsRef.current.has(id);
    const apply = (add: boolean) => setIds((prev) => { const n = new Set(prev); if (add) n.add(id); else n.delete(id); if (!user) writeLocal(n); return n; });
    apply(on);
    if (user) {
      fetch("/api/favorites", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ productId: id, on }) })
        .then((r) => { if (!r.ok) throw new Error(); })
        .catch(() => { apply(!on); toast("Không lưu được, thử lại nhé", "err"); });
    }
  }, [user, toast]);

  const fav = useMemo(() => ({ ids, toggle, ready }), [ids, toggle, ready]);
  return (
    <UserCtx.Provider value={user}>
      <ToastCtx.Provider value={toast}>
        <FavCtx.Provider value={fav}>
          {children}
          <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 flex flex-col items-center gap-2 px-4" style={{ zIndex: "var(--z-toast)" }}>
            {toasts.map((t) => (
              <div key={t.id} className="pointer-events-auto flex max-w-sm items-center gap-2 bg-ink px-4 py-3 text-sm text-ivory shadow-xl animate-fade-up">
                {t.kind === "ok" ? <CheckCircle2 size={16} className="text-gold-soft" /> : <AlertCircle size={16} className="text-rose" />}
                {t.text}
              </div>
            ))}
          </div>
        </FavCtx.Provider>
      </ToastCtx.Provider>
    </UserCtx.Provider>
  );
}
