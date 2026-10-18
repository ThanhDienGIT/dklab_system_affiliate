"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";

const GOOGLE_ERRORS: Record<string, string> = {
  google_off: "Đăng nhập Google chưa được cấu hình trên hệ thống này.",
  google_cancel: "Bạn đã huỷ đăng nhập Google.",
  google_state: "Phiên đăng nhập Google đã hết hạn, vui lòng thử lại.",
  google_fail: "Đăng nhập Google không thành công, vui lòng thử lại.",
};

export function AuthForm({ mode, next, googleOn, initialError }: { mode: "login" | "register"; next: string; googleOn: boolean; initialError?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError ? GOOGLE_ERRORS[initialError] ?? "" : "");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [show, setShow] = useState(false);
  const [notice, setNotice] = useState("");
  const openedAt = useRef(Date.now()); // do thoi gian dien form: bot gui sieu nhanh se bi chan o server
  const reg = mode === "register";

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true); setError(""); setFields({});
    try {
      const res = await apiFetch<{ needsVerification?: boolean; mailSent?: boolean }>(reg ? "/api/auth/register" : "/api/auth/login", {
        body: reg
          ? { fullName: f.get("fullName"), email: f.get("email"), phone: f.get("phone"), password: f.get("password"), consent: f.get("consent") === "on",
              website: f.get("website"), elapsedMs: Date.now() - openedAt.current }
          : { email: f.get("email"), password: f.get("password") },
      });
      if (res?.needsVerification) {
        setNotice(res.mailSent ? "Đã gửi email xác thực. Hãy mở hộp thư (cả mục Spam) và bấm vào liên kết để kích hoạt tài khoản." : "Tạo tài khoản thành công nhưng chưa gửi được email xác thực. Vào trang đăng nhập và thử đăng nhập để nhận lại email.");
        setBusy(false); return;
      }
      router.replace(reg && next === "/" ? "/tai-khoan#phong-cach" : next);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) { setError(err.message); setFields(err.fields ?? {}); } else setError("Có lỗi xảy ra, vui lòng thử lại");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md bg-paper p-6 shadow-sm md:p-10">
      {googleOn && (
        <>
          <a href={`/api/auth/google?next=${encodeURIComponent(next)}`} className="btn btn-ghost w-full gap-3 !normal-case !tracking-normal">
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>
            Tiếp tục với Google
          </a>
          <p className="my-5 flex items-center gap-3 text-xs uppercase tracking-widest text-muted"><span className="h-px flex-1 bg-line" />hoặc<span className="h-px flex-1 bg-line" /></p>
        </>
      )}
      <form onSubmit={submit} noValidate className="space-y-4">
        {reg && <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden"><label htmlFor="website">Website</label><input id="website" name="website" tabIndex={-1} autoComplete="off" /></div>}
        {reg && <Field name="fullName" label="Họ và tên" autoComplete="name" error={fields.fullName} required />}
        <Field name="email" type="email" label="Email" autoComplete="email" error={fields.email} required />
        {reg && <Field name="phone" type="tel" label="Số điện thoại (không bắt buộc)" autoComplete="tel" inputMode="tel" error={fields.phone} />}
        <div>
          <label htmlFor="password" className="label">Mật khẩu</label>
          <div className="relative">
            <input id="password" name="password" type={show ? "text" : "password"} required minLength={reg ? 8 : 1} autoComplete={reg ? "new-password" : "current-password"}
              className="field pr-12" aria-invalid={Boolean(fields.password)} />
            <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"} className="absolute right-0 top-0 grid h-11 w-11 place-items-center text-muted">{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
          </div>
          {fields.password && <p className="mt-1 text-xs text-rose">{fields.password}</p>}
          {reg && <p className="mt-1 text-xs text-muted">Tối thiểu 8 ký tự.</p>}
        </div>
        {reg && (
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" name="consent" required className="mt-1 h-5 w-5 accent-[var(--color-ink)]" />
            <span>Tôi đồng ý cho Éleonore xử lý dữ liệu cá nhân theo <Link href="/chinh-sach/bao-mat" className="underline underline-offset-2" target="_blank">chính sách bảo mật</Link>.</span>
          </label>
        )}
        {fields.consent && <p className="text-xs text-rose">{fields.consent}</p>}
        {notice && <p role="status" className="border-l-2 border-ok bg-ok/5 px-3 py-2 text-sm text-ok">{notice}</p>}
        {error && <p role="alert" className="border-l-2 border-rose bg-rose/5 px-3 py-2 text-sm text-rose">{error}</p>}
        <button type="submit" disabled={busy} className="btn btn-solid w-full">{busy ? "Đang xử lý…" : reg ? "Tạo tài khoản" : "Đăng nhập"}</button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        {reg ? <>Đã có tài khoản? <Link href={`/dang-nhap?next=${encodeURIComponent(next)}`} className="text-ink underline underline-offset-4">Đăng nhập</Link></>
          : <>Chưa có tài khoản? <Link href={`/dang-ky?next=${encodeURIComponent(next)}`} className="text-ink underline underline-offset-4">Đăng ký</Link></>}
      </p>
    </div>
  );
}

function Field({ name, label, error, ...rest }: { name: string; label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={name} className="label">{label}</label>
      <input id={name} name={name} className="field" aria-invalid={Boolean(error)} aria-describedby={error ? `${name}-err` : undefined} {...rest} />
      {error && <p id={`${name}-err`} className="mt-1 text-xs text-rose">{error}</p>}
    </div>
  );
}
