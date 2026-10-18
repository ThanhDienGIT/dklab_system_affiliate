"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container-x grid place-items-center gap-5 py-28 text-center">
      <p className="eyebrow">Có lỗi xảy ra</p>
      <h1 className="text-4xl md:text-6xl">Xin lỗi, thử lại nhé</h1>
      <p className="max-w-md text-sm text-muted">Hệ thống tạm thời không tải được trang này.</p>
      <button type="button" onClick={reset} className="btn btn-solid">Tải lại</button>
    </div>
  );
}
