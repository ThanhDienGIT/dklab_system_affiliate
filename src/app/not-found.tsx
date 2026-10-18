import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-x grid place-items-center gap-5 py-28 text-center">
      <p className="eyebrow">404</p>
      <h1 className="text-5xl md:text-7xl">Không tìm thấy trang</h1>
      <p className="max-w-md text-sm text-muted">Trang bạn tìm không tồn tại hoặc đã được di chuyển.</p>
      <Link href="/" className="btn btn-solid">Về trang chủ</Link>
    </div>
  );
}
