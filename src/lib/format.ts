const nf = new Intl.NumberFormat("vi-VN");

export function formatVnd(n: number): string {
  return `${nf.format(Math.round(n))}₫`;
}

/** 1.250.000 -> "1,25tr"; 450.000 -> "450k" (dung cho chip loc gia) */
export function shortVnd(n: number): string {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(2)}tr`.replace(".", ",");
  return `${Math.round(n / 1000)}k`;
}

export function discountPct(price: number, original: number | null | undefined): number {
  if (!original || original <= price) return 0;
  return Math.round(((original - price) / original) * 100);
}

export function compactNumber(n: number): string {
  if (n >= 1000) return `${+(n / 1000).toFixed(1)}k`.replace(".", ",");
  return String(n);
}
