import type { Role } from "@/server/security/rbac";
import type { SortKey } from "@/lib/constants";
import type { ProductExtra, ReviewDTO } from "./product-extra";
export type { ProductExtra, ReviewDTO, ReviewMedia, VariantGroup } from "./product-extra";

export interface StyleDTO {
  id: number; slug: string; name: string; tagline: string; intro: string;
  palette: { name: string; hex: string }[]; signatureItems: string[]; keywords: string[];
  heroImage: string | null; moodImages: string[]; sortOrder: number; isActive: boolean;
}
export interface CategoryDTO { id: number; slug: string; name: string; aliases: string[]; sortOrder: number; isActive: boolean }
export interface TypeDTO { id: number; categoryId: number; slug: string; name: string; aliases: string[]; sortOrder: number; isActive: boolean }
export interface Taxonomy { styles: StyleDTO[]; categories: CategoryDTO[]; types: TypeDTO[] }

export interface ProductCard {
  id: number; slug: string; name: string; price: number; originalPrice: number | null; discountPct: number;
  image: string | null; image2: string | null;
  style: { id: number; slug: string; name: string };
  category: { id: number; slug: string; name: string };
  type: { id: number; slug: string; name: string } | null;
  colors: string[]; badge: string | null; rating: number; reviewCount: number; sold: number;
  isNew: boolean; merchant: string; isDemo: boolean; status?: "draft" | "published" | "archived";
}
export interface ProductDetail extends ProductCard {
  description: string; sizes: string[]; material: string; tags: string[]; images: string[];
  affiliateUrl: string; productUrl: string; itemId: string | null; commissionRate: number | null;
  status: "draft" | "published" | "archived"; isFeatured: boolean; publishedAt: string; clicks: number;
  /** chi tiet kieu Shopee (bien the, thuoc tinh, shop, van chuyen...) */
  detail: ProductExtra;
}
export interface ReviewStats { total: number; star: Record<1 | 2 | 3 | 4 | 5, number>; withComment: number; withMedia: number; average: number }
export interface ReviewBundle { stats: ReviewStats; own: ReviewDTO[]; similar: ReviewDTO[] }

export interface ProductFilter {
  styleSlug?: string; categorySlug?: string; typeSlug?: string;
  styleId?: number; categoryId?: number; typeId?: number; styleIds?: number[];
  colors?: string[]; priceMin?: number; priceMax?: number;
  /** token da chuan hoa (bo dau) - AND giua cac token */
  keywords?: string[]; rawQuery?: string;
  onSale?: boolean; isNew?: boolean; featured?: boolean;
  ids?: number[]; excludeIds?: number[];
  sort?: SortKey; page?: number; pageSize?: number;
  /** admin: gom ca nhap / luu tru */
  includeAll?: boolean; status?: "draft" | "published" | "archived";
}
export interface Paged<T> { items: T[]; total: number; page: number; pageSize: number; pageCount: number }
export interface Facets {
  priceMin: number; priceMax: number;
  colors: { slug: string; count: number }[];
  types: { slug: string; name: string; count: number }[];
}

export interface SessionUser { id: string; role: Role; email: string; fullName: string; avatarUrl: string | null }

export interface UserRow {
  id: string; email: string; emailVerified: boolean; passwordHash: string | null; googleSub: string | null;
  role: Role; status: "active" | "blocked"; fullName: string; phone: string | null; birthDate: string | null;
  gender: "female" | "male" | "other" | null; province: string | null; addressLine: string | null; size: string | null;
  heightCm: number | null; budgetMax: number | null; avatarUrl: string | null; cccdEnc: string | null; cccdLast4: string | null;
  newsletter: boolean; consentAt: Date | null; failedLogins: number; lockedUntil: Date | null; tokenVersion: number;
  lastLoginAt: Date | null; createdAt: Date;
}

export interface ProfileDTO {
  id: string; email: string; role: Role; fullName: string; phone: string | null; birthDate: string | null;
  gender: "female" | "male" | "other" | null; province: string | null; addressLine: string | null; size: string | null;
  heightCm: number | null; budgetMax: number | null; avatarUrl: string | null; cccdMasked: string; hasCccd: boolean;
  newsletter: boolean; styleIds: number[]; emailVerified: boolean; hasPassword: boolean; hasGoogle: boolean; createdAt: string;
}

export interface SearchPlan {
  styleSlug?: string; categorySlug?: string; typeSlug?: string; colors: string[];
  priceMin?: number; priceMax?: number; keywords: string[]; sort?: SortKey; onSale?: boolean;
}
