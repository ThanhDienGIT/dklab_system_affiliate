/**
 * Du lieu chi tiet kieu Shopee (luu o cot `products.detail` jsonb) + dinh dang danh gia.
 * Moi truong deu tuy chon: san pham cu / san pham mau khong co van hien thi binh thuong.
 */
export interface VariantGroup { name: string; options: { name: string; image?: string | null }[] }
export interface ProductExtra {
  stock?: number | null;
  likeCount?: number | null;
  /** Chuoi goc tren san, vd "Đã bán 253" / "1k+ đã bán" */
  soldText?: string | null;
  video?: { url: string; poster?: string | null } | null;
  /** Nhom phan loai: Mau sac / Size ... */
  variants?: VariantGroup[];
  /** Bang "CHI TIET SAN PHAM": Chat lieu, Xuat xu, Gui tu... */
  attributes?: { label: string; value: string }[];
  /** Duong dan danh muc tren san: Giay Dep Nu > Bot > Bot Thoi Trang */
  sourcePath?: { name: string; url?: string | null }[];
  shipping?: { text?: string | null; from?: string | null; eta?: string | null; fee?: string | null; voucher?: string | null } | null;
  guarantees?: string[];
  shop?: {
    name: string; url?: string | null; avatar?: string | null; online?: string | null; ratingCount?: string | null;
    responseRate?: string | null; responseTime?: string | null; joined?: string | null; productCount?: string | null; followers?: string | null;
  } | null;
  /** So danh gia theo sao tren san (neu cao duoc); khong co thi tinh tu bang danh gia da luu */
  ratingBreakdown?: { star1?: number | null; star2?: number | null; star3?: number | null; star4?: number | null; star5?: number | null; withComment?: number | null; withMedia?: number | null } | null;
}

export interface ReviewMedia { type: "image" | "video"; url: string; duration?: string | null }
export interface ReviewDTO {
  id: number; author: string; rating: number; content: string; variant: string | null;
  reviewedAt: string | null; media: ReviewMedia[]; sellerReply: string | null; likes: number; source: "own" | "similar";
}
