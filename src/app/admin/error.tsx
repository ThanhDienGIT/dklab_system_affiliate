"use client";
import Link from "next/link";

/** Loi bat ngo trong khu quan tri: cho thu lai / ve tong quan thay vi man hinh trang */
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="grid place-items-center gap-4 py-20 text-center" role="alert">
      <p className="eyebrow">Có lỗi xảy ra</p>
      <h2 className="text-3xl">Không tải được trang quản trị</h2>
      <p className="max-w-md text-sm text-muted">{error.message?.slice(0, 200) || "Vui lòng thử lại."}{error.digest ? ` (mã ${error.digest})` : ""}</p>
      <div className="flex gap-3">
        <button type="button" className="btn btn-solid" onClick={() => reset()}>Thử lại</button>
        <button type="button" className="btn btn-ghost" onClick={() => window.location.reload()}>Tải lại trang</button>
        <Link href="/admin" className="btn btn-ghost">Về tổng quan</Link>
      </div>
    </div>
  );
}
