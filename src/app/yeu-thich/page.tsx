import type { Metadata } from "next";
import { PageTitle } from "@/components/ui/page-title";
import { FavoritesView } from "@/components/product/favorites-view";

export const metadata: Metadata = { title: "Yêu thích", robots: { index: false } };

export default function Page() {
  return (
    <>
      <PageTitle eyebrow="Wishlist" title="Sản phẩm yêu thích" sub="Khách chưa đăng nhập: danh sách lưu trên thiết bị này. Đăng nhập để đồng bộ mọi nơi." />
      <div className="container-x pt-10"><FavoritesView /></div>
    </>
  );
}
