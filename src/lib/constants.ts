export const COLORS = [
  { slug: "den", name: "Đen", hex: "#14110f" },
  { slug: "trang", name: "Trắng", hex: "#f7f4ee" },
  { slug: "kem", name: "Kem", hex: "#efe2cb" },
  { slug: "be", name: "Be", hex: "#d6c0a0" },
  { slug: "nau", name: "Nâu", hex: "#6b4a33" },
  { slug: "hong", name: "Hồng", hex: "#e6a4b4" },
  { slug: "do", name: "Đỏ", hex: "#a8222e" },
  { slug: "tim", name: "Tím", hex: "#7b5aa6" },
  { slug: "xanh", name: "Xanh", hex: "#3f6fae" },
  { slug: "vang", name: "Vàng gold", hex: "#c4a052" },
  { slug: "bac", name: "Bạc", hex: "#bfc3c9" },
  { slug: "nhieu-mau", name: "Nhiều màu", hex: "linear-gradient(135deg,#e6a4b4,#c4a052,#3f6fae)" },
] as const;

export type ColorSlug = (typeof COLORS)[number]["slug"];
export const COLOR_SLUGS = COLORS.map((c) => c.slug) as string[];
export const colorName = (slug: string) => COLORS.find((c) => c.slug === slug)?.name ?? slug;

export const SIZES = ["XS", "S", "M", "L", "XL", "Free size"] as const;

export const SORTS = [
  { value: "popular", label: "Nổi bật" },
  { value: "newest", label: "Mới nhất" },
  { value: "bestseller", label: "Bán chạy" },
  { value: "price_asc", label: "Giá thấp → cao" },
  { value: "price_desc", label: "Giá cao → thấp" },
  { value: "discount", label: "Giảm giá nhiều" },
] as const;
export type SortKey = (typeof SORTS)[number]["value"] | "relevance";

export const PRICE_BUCKETS = [
  { label: "Dưới 200k", min: undefined, max: 200_000 },
  { label: "200k – 500k", min: 200_000, max: 500_000 },
  { label: "500k – 1tr", min: 500_000, max: 1_000_000 },
  { label: "Trên 1tr", min: 1_000_000, max: undefined },
] as const;

export const MERCHANTS: Record<string, { name: string; cta: string }> = {
  shopee: { name: "Shopee", cta: "Xem sản phẩm trên Shopee" },
  tiktok: { name: "TikTok Shop", cta: "Xem sản phẩm trên TikTok Shop" },
  lazada: { name: "Lazada", cta: "Xem sản phẩm trên Lazada" },
  other: { name: "Nơi bán", cta: "Xem sản phẩm tại nơi bán" },
};

export const PROVINCES = [
  "Hà Nội", "TP. Hồ Chí Minh", "Đà Nẵng", "Hải Phòng", "Cần Thơ", "Huế", "Quảng Ninh", "Thanh Hóa", "Nghệ An",
  "Khánh Hòa", "Lâm Đồng", "Đồng Nai", "An Giang", "Cà Mau", "Đắk Lắk", "Gia Lai", "Tây Ninh", "Vĩnh Long", "Đồng Tháp",
] as const;

export const COOKIE_ACCESS = "el_at";
export const COOKIE_REFRESH = "el_rt";
export const PAGE_SIZE = 24;
