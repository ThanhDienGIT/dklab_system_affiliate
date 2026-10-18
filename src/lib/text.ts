/** Bo dau tieng Viet, giu nguyen dau cau/ky tu khac */
export function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
}

/** Bo dau + thuong hoa + gon khoang trang (giu dau cau de parse gia: "<", "-", ".") */
export function foldVi(s: string): string {
  return stripDiacritics(s).toLowerCase().replace(/\s+/g, " ").trim();
}

/** Chi giu chu va so, cach nhau 1 dau cach - dung cho search_text va so khop tu khoa */
export function normalizeVi(s: string): string {
  return foldVi(s).replace(/[^a-z0-9]+/g, " ").trim();
}

export function slugify(s: string): string {
  return normalizeVi(s).replace(/\s+/g, "-").slice(0, 96);
}

export function tokenize(s: string): string[] {
  const n = normalizeVi(s);
  return n ? n.split(" ") : [];
}

export function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (m) => `\\${m}`);
}
