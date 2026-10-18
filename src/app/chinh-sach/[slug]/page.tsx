import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getContainer } from "@/server/container";
import { PageTitle } from "@/components/ui/page-title";
import { Breadcrumb } from "@/components/ui/section";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };

interface Doc { title: string; body: (s: { brand: string; disclosure: string }) => string[] }
const DOCS: Record<string, Doc> = {
  "gioi-thieu": { title: "Về Éleonore", body: ({ brand }) => [
    `${brand} là website gợi ý thời trang theo phong cách: Y2K, Gloomy Coquette, Rococo, Baroque, Maximalism và Morute.`,
    "Chúng tôi tuyển chọn sản phẩm từ các sàn thương mại điện tử và dẫn bạn tới nơi bán để xem giá, chọn size và đặt hàng.",
    "Mọi sản phẩm cần được kiểm tra thực tế (còn hàng, đúng mô tả, đúng giá) trước khi được đưa lên danh mục chính thức."] },
  "mua-hang": { title: "Cách mua hàng", body: () => [
    "1. Chọn phong cách và thể loại bạn thích, hoặc gõ tìm kiếm tự nhiên như “quần áo y2k dưới 500k”.",
    "2. Mở trang sản phẩm và nhấn “Xem sản phẩm trên Shopee”.",
    "3. Hoàn tất đặt hàng, thanh toán và vận chuyển trên Shopee. Chính sách đổi trả áp dụng theo nơi bán."] },
  "doi-tra": { title: "Đổi trả & bảo hành", body: () => [
    "Éleonore không trực tiếp bán hàng, nên đơn hàng do nơi bán (Shopee, TikTok Shop...) xử lý.",
    "Vui lòng liên hệ nhà bán hoặc dùng chức năng trả hàng/hoàn tiền của sàn trong thời hạn quy định của sàn."] },
  "lien-he": { title: "Liên hệ", body: () => ["Bạn có thể nhắn qua các kênh ở nút chat góc phải màn hình hoặc gửi email trong phần cài đặt của cửa hàng."] },
  affiliate: { title: "Tiết lộ affiliate", body: ({ disclosure }) => [
    disclosure,
    "Liên kết sản phẩm có gắn thẻ rel=\"sponsored\". Việc chúng tôi nhận hoa hồng không làm tăng giá bạn trả và không quyết định thứ tự hiển thị sản phẩm."] },
  "bao-mat": { title: "Bảo mật dữ liệu cá nhân", body: () => [
    "Chúng tôi chỉ thu thập thông tin bạn cung cấp: họ tên, email, số điện thoại, ngày sinh, địa chỉ, kích cỡ, phong cách yêu thích và (nếu bạn chọn) số CCCD.",
    "Số CCCD được mã hoá AES-256-GCM trước khi lưu; chỉ quản trị viên có quyền mới xem được và mọi lần xem đều được ghi nhật ký.",
    "Mật khẩu được băm bằng scrypt, không lưu dạng gốc. Bạn có thể xem, sửa hoặc xoá thông tin trong mục Tài khoản bất cứ lúc nào.",
    "Dữ liệu chỉ dùng để cá nhân hoá gợi ý và hỗ trợ tài khoản, không bán cho bên thứ ba. Việc xử lý tuân theo Luật Bảo vệ dữ liệu cá nhân hiện hành."] },
  "dieu-khoan": { title: "Điều khoản sử dụng", body: () => [
    "Giá, tồn kho và khuyến mãi do nơi bán quyết định và có thể thay đổi bất cứ lúc nào.",
    "Hình ảnh minh hoạ có thể khác thực tế. Bằng việc sử dụng website, bạn đồng ý với các điều khoản này."] },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const d = DOCS[(await params).slug];
  return d ? { title: d.title } : {};
}

export default async function PolicyPage({ params }: Props) {
  const d = DOCS[(await params).slug];
  if (!d) notFound();
  const s = await getContainer().catalog.settings();
  return (
    <>
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: d.title }]} />
      <PageTitle title={d.title} />
      <article className="container-x mx-auto max-w-2xl space-y-4 pt-10 text-[15px] leading-relaxed text-ink-soft">
        {d.body({ brand: s.brand.name, disclosure: s.disclosure }).map((t, i) => <p key={i}>{t}</p>)}
      </article>
    </>
  );
}
