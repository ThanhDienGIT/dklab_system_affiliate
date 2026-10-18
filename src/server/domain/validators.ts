import { z } from "zod";
import { COLOR_SLUGS } from "@/lib/constants";

/** "" hoac thieu truong -> null (PUT = thay the toan bo ho so) */
const blankToNull = (v: unknown) => (v === undefined || (typeof v === "string" && v.trim() === "") ? null : v);

export const emailSchema = z.string().trim().toLowerCase().email("Email không hợp lệ").max(160);

/** SDT VN: 0xxxxxxxxx hoac +84xxxxxxxxx, dau so 03/05/07/08/09 */
export function normalizePhone(raw: string): string | null {
  const s = raw.replace(/[\s.\-()]/g, "");
  const m = /^(?:\+84|84|0)(3|5|7|8|9)(\d{8})$/.exec(s);
  return m ? `0${m[1]}${m[2]}` : null;
}
export const phoneSchema = z.preprocess(
  blankToNull,
  z.string().trim().nullable().refine((v) => v === null || normalizePhone(v) !== null, "Số điện thoại không hợp lệ")
    .transform((v) => (v === null ? null : normalizePhone(v))),
);

/** CCCD 12 so: 3 so ma tinh (001-096) + 1 so gioi tinh/the ky + 2 so nam sinh + 6 so ngau nhien */
export function isValidCccd(v: string): boolean {
  if (!/^\d{12}$/.test(v)) return false;
  const prov = Number(v.slice(0, 3));
  return prov >= 1 && prov <= 96;
}
export const cccdSchema = z.preprocess(
  (v) => (typeof v === "string" ? v.replace(/\s/g, "") : v),
  z.union([z.literal(""), z.string().refine(isValidCccd, "CCCD gồm 12 chữ số, 3 số đầu là mã tỉnh (001–096)")]).nullable(),
);

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, "Vui lòng nhập họ và tên").max(80),
  email: emailSchema,
  password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự").max(128),
  phone: phoneSchema.optional(),
  consent: z.literal(true, { message: "Cần đồng ý chính sách xử lý dữ liệu cá nhân" }),
});

export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1).max(128) });

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Vui lòng nhập họ và tên").max(80),
  phone: phoneSchema,
  cccd: cccdSchema.optional(),
  birthDate: z.preprocess(blankToNull, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày sinh không hợp lệ").nullable())
    .refine((v) => {
      if (!v) return true;
      const d = new Date(v);
      const age = (Date.now() - d.getTime()) / (365.25 * 864e5);
      return !Number.isNaN(d.getTime()) && age >= 13 && age <= 100;
    }, "Ngày sinh không hợp lệ (từ 13 tuổi)"),
  gender: z.preprocess(blankToNull, z.enum(["female", "male", "other"]).nullable()),
  province: z.preprocess(blankToNull, z.string().trim().max(80).nullable()),
  addressLine: z.preprocess(blankToNull, z.string().trim().max(200).nullable()),
  size: z.preprocess(blankToNull, z.string().trim().max(20).nullable()),
  heightCm: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int().min(120).max(220).nullable()),
  budgetMax: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int().min(0).max(100_000_000).nullable()),
  newsletter: z.boolean().default(false),
  consent: z.boolean().optional(),
  styleIds: z.array(z.number().int().positive()).max(12).default([]),
});
export type ProfileInput = z.infer<typeof profileSchema>;

export const passwordChangeSchema = z.object({
  current: z.string().min(1),
  next: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự").max(128),
});

const txt = (max = 300) => z.preprocess((v) => (v == null || v === "" ? null : String(v).trim()), z.string().max(max).nullable());
const intOrNull = z.preprocess((v) => (v == null || v === "" ? null : Number(String(v).replace(/[.,\s]/g, ""))), z.number().int().min(0).max(2_000_000_000).nullable());
const urlOrNull = z.preprocess((v) => (v == null || v === "" ? null : String(v).trim()), z.string().max(2000).regex(/^(https?:\/\/|\/)/, "Link phải bắt đầu bằng http(s):// hoặc /").nullable());

export const extraSchema = z.object({
  stock: intOrNull.optional(),
  likeCount: intOrNull.optional(),
  soldText: txt(60).optional(),
  video: z.object({ url: urlOrNull.refine((v) => v !== null, "Thiếu link video"), poster: urlOrNull.optional() }).nullable().optional(),
  variants: z.array(z.object({
    name: z.string().trim().min(1).max(60),
    options: z.array(z.object({ name: z.string().trim().min(1).max(80), image: urlOrNull.optional() })).max(80),
  })).max(5).optional(),
  attributes: z.array(z.object({ label: z.string().trim().min(1).max(80), value: z.string().trim().max(500) })).max(60).optional(),
  sourcePath: z.array(z.object({ name: z.string().trim().min(1).max(120), url: urlOrNull.optional() })).max(10).optional(),
  shipping: z.object({ text: txt(300).optional(), from: txt(120).optional(), eta: txt(120).optional(), fee: txt(120).optional(), voucher: txt(200).optional() }).nullable().optional(),
  guarantees: z.array(z.string().trim().min(1).max(120)).max(12).optional(),
  shop: z.object({
    name: z.string().trim().min(1).max(120), url: urlOrNull.optional(), avatar: urlOrNull.optional(), online: txt(60).optional(),
    ratingCount: txt(30).optional(), responseRate: txt(30).optional(), responseTime: txt(60).optional(), joined: txt(60).optional(),
    productCount: txt(30).optional(), followers: txt(30).optional(),
  }).nullable().optional(),
  ratingBreakdown: z.object({
    star1: intOrNull.optional(), star2: intOrNull.optional(), star3: intOrNull.optional(), star4: intOrNull.optional(), star5: intOrNull.optional(),
    withComment: intOrNull.optional(), withMedia: intOrNull.optional(),
  }).nullable().optional(),
});

/** "2025-11-02 13:16" | ISO | dd/mm/yyyy -> ISO string; sai dinh dang -> null */
export function parseReviewDate(v: unknown): string | null {
  if (v == null || v === "") return null;
  const s = String(v).trim();
  const vn = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/.exec(s);
  const d = vn ? new Date(Date.UTC(+vn[3]!, +vn[2]! - 1, +vn[1]!, +(vn[4] ?? 0) - 7, +(vn[5] ?? 0))) : new Date(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(s) ? s.replace(" ", "T") + "+07:00" : s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export const reviewInputSchema = z.object({
  author: z.string().trim().max(80).default(""),
  rating: z.preprocess((v) => Number(v), z.number().int().min(1).max(5)),
  content: z.string().trim().max(4000).default(""),
  variant: txt(120).default(null),
  reviewedAt: z.preprocess(parseReviewDate, z.string().nullable()).default(null),
  media: z.array(z.object({ type: z.enum(["image", "video"]).default("image"), url: urlOrNull.refine((v) => v !== null, "Thiếu link"), duration: txt(20).optional() })).max(12).default([]),
  sellerReply: txt(2000).default(null),
  likes: z.preprocess((v) => (v == null || v === "" ? 0 : Number(v)), z.number().int().min(0)).default(0),
  source: z.enum(["own", "similar"]).default("own"),
});
export type ReviewInput = z.infer<typeof reviewInputSchema>;

const slugField = z.string().trim().min(1).max(96).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug chỉ gồm a–z, 0–9 và dấu gạch ngang");
const strList = z.array(z.string().trim().min(1).max(60)).max(30);

export const productInputSchema = z.object({
  name: z.string().trim().min(2).max(200),
  slug: slugField.optional(),
  description: z.string().trim().max(8000).default(""),
  styleId: z.number().int().positive("Chọn phong cách"),
  categoryId: z.number().int().positive("Chọn thể loại"),
  typeId: z.number().int().positive().nullable().default(null),
  price: z.number().int().min(0).max(1_000_000_000),
  originalPrice: z.number().int().min(0).max(1_000_000_000).nullable().default(null),
  colors: z.array(z.string()).transform((a) => a.filter((c) => COLOR_SLUGS.includes(c))).default([]),
  sizes: strList.default([]),
  material: z.string().trim().max(120).default(""),
  tags: strList.default([]),
  images: z.array(z.string().trim().min(1).max(2000)).max(5, "Tối đa 5 ảnh mỗi sản phẩm").default([]),
  badge: z.preprocess(blankToNull, z.string().trim().max(24).nullable()).default(null),
  rating: z.number().min(0).max(5).default(0),
  reviewCount: z.number().int().min(0).default(0),
  sold: z.number().int().min(0).default(0),
  merchant: z.enum(["shopee", "tiktok", "lazada", "other"]).default("shopee"),
  affiliateUrl: z.string().trim().max(2000).default(""),
  productUrl: z.string().trim().max(2000).default(""),
  itemId: z.preprocess(blankToNull, z.string().trim().max(60).nullable()).default(null),
  commissionRate: z.number().min(0).max(100).nullable().default(null),
  status: z.enum(["draft", "published", "archived"]).default("published"),
  isFeatured: z.boolean().default(false),
  /** chi tiet kieu Shopee (bien the, thuoc tinh, shop...) */
  detail: extraSchema.default({}),
  /** toan bo JSON goc de doi chieu; undefined = giu nguyen khi cap nhat */
  rawData: z.record(z.string(), z.unknown()).nullable().optional(),
  /** danh gia: undefined = giu nguyen; mang (ke ca rong) = thay the toan bo */
  reviews: z.array(reviewInputSchema).max(500).optional(),
});
export type ProductInput = z.infer<typeof productInputSchema>;

export const styleInputSchema = z.object({
  name: z.string().trim().min(1).max(60),
  slug: slugField,
  tagline: z.string().trim().max(160).default(""),
  intro: z.string().trim().max(2000).default(""),
  palette: z.array(z.object({ name: z.string().trim().max(30), hex: z.string().regex(/^#[0-9a-fA-F]{6}$/) })).max(8).default([]),
  signatureItems: strList.default([]),
  keywords: strList.default([]),
  heroImage: z.preprocess(blankToNull, z.string().trim().max(2000).nullable()).default(null),
  moodImages: z.array(z.string().trim().max(2000)).max(6).default([]),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});
export type StyleInput = z.infer<typeof styleInputSchema>;

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1).max(60),
  slug: slugField,
  aliases: strList.default([]),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const typeInputSchema = z.object({
  categoryId: z.number().int().positive(),
  name: z.string().trim().min(1).max(60),
  slug: slugField,
  aliases: strList.default([]),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const newsletterSchema = z.object({ email: emailSchema, hp: z.string().max(0).optional() });
