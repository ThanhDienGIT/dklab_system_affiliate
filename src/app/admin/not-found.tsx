import Link from "next/link";

export default function AdminNotFound() {
  return (
    <div className="grid place-items-center gap-4 py-20 text-center">
      <p className="eyebrow">404</p>
      <h2 className="text-3xl">Không tìm thấy mục này</h2>
      <p className="max-w-md text-sm text-muted">Mục đã bị xoá hoặc đường dẫn sai. Nếu vừa thêm/sửa mà gặp màn hình này, bấm “Tải lại trang” — phiên đăng nhập sẽ tự gia hạn.</p>
      <div className="flex gap-3">
        <Link href="/admin/san-pham" className="btn btn-solid">Danh sách sản phẩm</Link>
        <Link href="/admin" className="btn btn-ghost">Tổng quan</Link>
      </div>
    </div>
  );
}
