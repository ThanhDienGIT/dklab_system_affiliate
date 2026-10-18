"use client";
/**
 * Lich su phia trinh duyet (khach chua dang nhap van co):
 * - el_q: 10 tu khoa gan nhat (khong trung, moi nhat dau)
 * - el_recent: 20 san pham da xem gan nhat
 * Moi thao tac boc try/catch: che do an danh / chan storage thi chi mat tinh nang, khong vo trang.
 */
const Q = "el_q", R = "el_recent";
const read = <T,>(k: string, ok: (x: unknown) => x is T): T[] => {
  try { const v = JSON.parse(localStorage.getItem(k) ?? "[]"); return Array.isArray(v) ? v.filter(ok) : []; } catch { return []; }
};
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage bi chan */ } };
const isStr = (x: unknown): x is string => typeof x === "string" && x.length > 0 && x.length <= 200;
const isId = (x: unknown): x is number => Number.isInteger(x) && (x as number) > 0;
const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

export const recentSearches = () => read(Q, isStr).slice(0, 10);
export function pushSearch(q: string) {
  const t = q.trim().replace(/\s+/g, " ").slice(0, 120);
  if (t.length < 2) return;
  write(Q, [t, ...recentSearches().filter((x) => norm(x) !== norm(t))].slice(0, 10));
}
export const removeSearch = (q: string) => write(Q, recentSearches().filter((x) => norm(x) !== norm(q)));
export const clearSearches = () => write(Q, []);
/** gop lich su server (tai khoan) + may nay, giu thu tu may nay truoc */
export function mergeSearches(server: string[]) {
  const seen = new Set<string>();
  return [...recentSearches(), ...server].filter((x) => (seen.has(norm(x)) ? false : (seen.add(norm(x)), true))).slice(0, 10);
}

export const recentViewed = () => read(R, isId).slice(0, 20);
export function pushViewed(id: number) { write(R, [id, ...recentViewed().filter((x) => x !== id)].slice(0, 20)); }
export const clearViewed = () => write(R, []);

/** chong dem trung: cung 1 san pham trong 30 phut / tab chi tinh 1 luot */
export function shouldCountView(id: number): boolean {
  try {
    const k = `el_v_${id}`, now = Date.now(), last = Number(sessionStorage.getItem(k) ?? 0);
    if (now - last < 30 * 60_000) return false;
    sessionStorage.setItem(k, String(now));
    return true;
  } catch { return true; }
}
