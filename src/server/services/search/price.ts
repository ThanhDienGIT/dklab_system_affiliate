import { foldVi } from "@/lib/text";

/**
 * Doc khoang gia tu cau tieng Viet (co dau hoac khong dau).
 * Hieu: "duoi 500k", "<500k", "toi da 1tr2", "tren 1 trieu", "tu 200k den 400k", "200-400k",
 *       "500.000d", "khoang 300k" (+-30%), "500k tro xuong / tro len".
 * Khong nham "y2k" thanh 2.000d (so phai dung rieng, khong dinh chu cai phia truoc).
 */
export interface PriceParse { min?: number; max?: number; cleaned: string }

const MIN_PRICE = 10_000; // duoi 10k khong coi la gia (loai "2k", "3d"...)

const UNIT: Record<string, number> = { k: 1e3, nghin: 1e3, ngan: 1e3, tr: 1e6, trieu: 1e6, m: 1e6, d: 1, vnd: 1, dong: 1 };

interface Money { value: number; start: number; end: number; unit: boolean }

function toNumber(raw: string): number {
  if (/^\d{1,3}([.,]\d{3})+$/.test(raw)) return Number(raw.replace(/[.,]/g, ""));
  return Number(raw.replace(",", "."));
}

export function findMoney(f: string): Money[] {
  const out: Money[] = [];
  const taken: [number, number][] = [];
  let m: RegExpExecArray | null;
  // "200-400k", "1 den 2tr": hai so dung chung don vi o so thu hai
  const reShared = /(?<![a-z0-9.,])(\d+(?:[.,]\d+)?)\s*(?:-|\u2013|den|toi|~)\s*(\d+(?:[.,]\d+)?)\s*(k|nghin|ngan|tr|trieu|m)(?![a-z0-9])/dg;
  while ((m = reShared.exec(f))) {
    const mult = UNIT[m[3]!] ?? 1;
    const [a, b] = [toNumber(m[1]!), toNumber(m[2]!)];
    // so thu nhat da la gia day du (vd 200.000-400k) thi giu nguyen, nguoc lai nhan don vi chung
    const va = a >= 10_000 ? a : a * mult;
    const [ia, ib] = [m.indices![1]!, m.indices![2]!];
    out.push({ value: Math.round(va), start: ia[0], end: ia[1], unit: true });
    out.push({ value: Math.round(b * mult), start: ib[0], end: m.index + m[0].length, unit: true });
    taken.push([m.index, m.index + m[0].length]);
  }
  // "1tr2", "1 trieu 2"  => 1,2 trieu
  const reTr = /(?<![a-z0-9.,])(\d+)\s*(tr|trieu|m)\s*(\d)(?![a-z0-9])/g;
  while ((m = reTr.exec(f))) {
    if (taken.some(([a, b]) => m!.index < b && m!.index + m![0].length > a)) continue;
    const v = (Number(m[1]) + Number(m[3]) / 10) * 1e6;
    out.push({ value: v, start: m.index, end: m.index + m[0].length, unit: true });
    taken.push([m.index, m.index + m[0].length]);
  }
  const re = /(?<![a-z0-9.,])(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)\s*(k|nghin|ngan|tr|trieu|m|d|vnd|dong)?(?![a-z0-9])/g;
  while ((m = re.exec(f))) {
    const s = m.index, e = m.index + m[0].length;
    if (taken.some(([a, b]) => s < b && e > a)) continue;
    const num = toNumber(m[1]!);
    const unit = m[2];
    let value: number;
    if (unit) value = num * (UNIT[unit] ?? 1);
    else if (/[.,]\d{3}/.test(m[1]!) || num >= 100_000) value = num;
    else continue; // so tran khong don vi (size 38, 2024...) khong phai gia
    if (value < MIN_PRICE) continue;
    out.push({ value: Math.round(value), start: s, end: e, unit: Boolean(unit) });
  }
  return out.sort((a, b) => a.start - b.start);
}

const MAX_WORDS = /(duoi|toi da|khong qua|khong vuot|re hon|thap hon|it hon|nho hon|under|below|max|<=|<|chua toi|nhieu nhat)\s*$/;
const MIN_WORDS = /(tren|toi thieu|cao hon|lon hon|nhieu hon|over|above|min|>=|>|hon)\s*$/;
const AROUND = /(khoang|tam|xap xi|around|gan|~)\s*$/;
const RANGE_FROM = /(tu|between|giua)\s*$/;

export function parsePrice(query: string): PriceParse {
  const f = foldVi(query);
  const money = findMoney(f);
  if (!money.length) return { cleaned: f };

  let min: number | undefined, max: number | undefined;
  const cut: [number, number][] = [];
  const m1 = money[0]!;
  const m2 = money[1];
  const before = (pos: number) => f.slice(Math.max(0, pos - 18), pos);

  // Khoang gia: "tu X den Y", "X - Y", "X toi Y", "giua X va Y"
  if (m2) {
    const mid = f.slice(m1.end, m2.start).trim();
    if (/^(den|toi|-|–|~|va|->|→|to)$/.test(mid)) {
      let a = m1.value, b = m2.value;
      // "200-400k": so dau khong don vi -> lay don vi cua so sau
      if (!m1.unit && m2.unit && a < MIN_PRICE) a = a * (b >= 1e6 ? 1e6 : 1e3);
      min = Math.min(a, b); max = Math.max(a, b);
      const fromMatch = RANGE_FROM.exec(before(m1.start));
      cut.push([m1.start - (fromMatch ? fromMatch[0].length : 0), m2.end]);
    }
  }
  if (min === undefined && max === undefined) {
    const pre = before(m1.start);
    const post = f.slice(m1.end, m1.end + 14);
    let w: RegExpExecArray | null;
    if ((w = MAX_WORDS.exec(pre)) || /^\s*tro (xuong|lai)/.test(post)) {
      max = m1.value;
      cut.push([m1.start - (w ? w[0].length : 0), m1.end + (/^\s*tro (xuong|lai)/.exec(post)?.[0].length ?? 0)]);
    } else if ((w = MIN_WORDS.exec(pre)) || /^\s*tro len/.test(post)) {
      min = m1.value;
      cut.push([m1.start - (w ? w[0].length : 0), m1.end + (/^\s*tro len/.exec(post)?.[0].length ?? 0)]);
    } else {
      const a = AROUND.exec(pre);
      min = Math.round(m1.value * 0.7); max = Math.round(m1.value * 1.3);
      cut.push([m1.start - (a ? a[0].length : 0), m1.end]);
    }
    // "tu 500k" (khong co "den") => min
    if (min === undefined && max === undefined) min = m1.value;
  }
  // Xoa cac doan da dung khoi chuoi de buoc tu khoa khong lap lai
  let cleaned = f;
  for (const [s, e] of cut.sort((a, b) => b[0] - a[0])) cleaned = cleaned.slice(0, Math.max(0, s)) + " " + cleaned.slice(e);
  return { min, max, cleaned: cleaned.replace(/\s+/g, " ").trim() };
}
