export interface SiteSettings {
  brand: { name: string; tagline: string };
  announcement: { text: string; href: string };
  hero: { image: string; eyebrow: string; title: string; subtitle: string; ctaLabel: string; ctaHref: string };
  contact: { hotline: string; email: string; zalo: string; messenger: string; address: string };
  social: { instagram: string; tiktok: string; facebook: string };
  popup: { enabled: boolean; delaySec: number; title: string; body: string };
  disclosure: string;
}

export const DEFAULT_SETTINGS: SiteSettings = {
  brand: { name: "Éleonore", tagline: "Timeless elegance in every detail" },
  announcement: { text: "Gợi ý phong cách mỗi tuần · Link mua hàng dẫn tới Shopee", href: "/ban-chay" },
  hero: {
    image: "/brand/banner.webp", eyebrow: "Bộ sưu tập mùa mới", title: "Éleonore",
    subtitle: "Sáu phong cách thời trang, một nơi để bạn tìm thấy chính mình.", ctaLabel: "Khám phá ngay", ctaHref: "/moi-ve",
  },
  contact: { hotline: "", email: "", zalo: "", messenger: "", address: "" },
  social: { instagram: "", tiktok: "", facebook: "" },
  popup: { enabled: true, delaySec: 12, title: "Gia nhập Éleonore Circle", body: "Nhận gợi ý phong cách và ưu đãi mới nhất qua email. Không spam, huỷ bất cứ lúc nào." },
  disclosure: "Éleonore là website giới thiệu sản phẩm theo mô hình tiếp thị liên kết. Khi bạn mua qua liên kết, chúng tôi có thể nhận hoa hồng mà giá bạn trả không đổi.",
};

export function mergeSettings(raw: Record<string, unknown>): SiteSettings {
  const out = structuredClone(DEFAULT_SETTINGS) as unknown as Record<string, unknown>;
  for (const [k, v] of Object.entries(raw)) {
    const base = out[k];
    if (base && typeof base === "object" && v && typeof v === "object") out[k] = { ...(base as object), ...(v as object) };
    else if (k in out && typeof base === typeof v) out[k] = v;
  }
  return out as unknown as SiteSettings;
}
