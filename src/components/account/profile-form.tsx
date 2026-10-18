"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import type { ProfileDTO, StyleDTO } from "@/server/domain/types";
import { PROVINCES, SIZES } from "@/lib/constants";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useToast } from "@/components/ui/providers";
import { SmartImage } from "@/components/ui/smart-image";
import { cn } from "@/lib/utils";

export function ProfileForm({ profile, styles }: { profile: ProfileDTO; styles: StyleDTO[] }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [picked, setPicked] = useState<number[]>(profile.styleIds);
  const [editCccd, setEditCccd] = useState(!profile.hasCccd);
  const [clearCccd, setClearCccd] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const g = (k: string) => (f.get(k) as string | null) ?? "";
    setBusy(true); setErrors({});
    try {
      await apiFetch("/api/me", {
        method: "PUT",
        body: {
          fullName: g("fullName"), phone: g("phone"), birthDate: g("birthDate"), gender: g("gender"), province: g("province"),
          addressLine: g("addressLine"), size: g("size"), heightCm: g("heightCm"), budgetMax: g("budgetMax"),
          newsletter: f.get("newsletter") === "on", consent: f.get("consent") === "on",
          cccd: editCccd ? g("cccd") : "", clearCccd, styleIds: picked,
        },
      });
      toast("Đã lưu thông tin");
      setClearCccd(false);
      if (editCccd && g("cccd")) setEditCccd(false);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) { setErrors(err.fields ?? {}); toast(err.message, "err"); } else toast("Lưu thất bại, thử lại nhé", "err");
    }
    setBusy(false);
  }

  const toggle = (id: number) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const err = (k: string) => (errors[k] ? <p className="mt-1 text-xs text-rose">{errors[k]}</p> : null);

  return (
    <form onSubmit={submit} noValidate className="space-y-12">
      <section aria-labelledby="sec-info">
        <h2 id="sec-info" className="mb-6 text-3xl">Thông tin cá nhân</h2>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2"><label className="label" htmlFor="fullName">Họ và tên</label>
            <input id="fullName" name="fullName" defaultValue={profile.fullName} required className="field" autoComplete="name" aria-invalid={Boolean(errors.fullName)} />{err("fullName")}</div>
          <div><label className="label" htmlFor="email">Gmail / Email</label>
            <input id="email" value={profile.email} readOnly className="field bg-sand text-muted" />
            <p className="mt-1 text-xs text-muted">{profile.hasGoogle ? "Đã liên kết Google. " : ""}Email dùng để đăng nhập, không đổi tại đây.</p></div>
          <div><label className="label" htmlFor="phone">Số điện thoại</label>
            <input id="phone" name="phone" type="tel" inputMode="tel" defaultValue={profile.phone ?? ""} className="field" autoComplete="tel" placeholder="09xx xxx xxx" aria-invalid={Boolean(errors.phone)} />{err("phone")}</div>
          <div><label className="label" htmlFor="birthDate">Ngày sinh</label>
            <input id="birthDate" name="birthDate" type="date" defaultValue={profile.birthDate ?? ""} className="field" autoComplete="bday" />{err("birthDate")}</div>
          <div><label className="label" htmlFor="gender">Giới tính</label>
            <select id="gender" name="gender" defaultValue={profile.gender ?? ""} className="field">
              <option value="">Không chọn</option><option value="female">Nữ</option><option value="male">Nam</option><option value="other">Khác</option>
            </select></div>
          <div><label className="label" htmlFor="province">Tỉnh / Thành phố</label>
            <select id="province" name="province" defaultValue={profile.province ?? ""} className="field">
              <option value="">Chọn</option>{PROVINCES.map((p) => <option key={p}>{p}</option>)}
            </select></div>
          <div><label className="label" htmlFor="addressLine">Địa chỉ</label>
            <input id="addressLine" name="addressLine" defaultValue={profile.addressLine ?? ""} className="field" autoComplete="street-address" /></div>
        </div>

        <div className="mt-6 border border-line bg-paper p-5">
          <label className="label" htmlFor="cccd">Số CCCD</label>
          {profile.hasCccd && !editCccd ? (
            <div className="flex flex-wrap items-center gap-3">
              <code className="bg-sand px-3 py-2 text-sm tracking-widest">{profile.cccdMasked}</code>
              <button type="button" className="text-sm underline underline-offset-4" onClick={() => setEditCccd(true)}>Cập nhật</button>
              <button type="button" className={cn("text-sm underline underline-offset-4", clearCccd ? "text-rose" : "")} onClick={() => setClearCccd(!clearCccd)}>
                {clearCccd ? "Sẽ xoá khi lưu (bấm để huỷ)" : "Xoá CCCD"}
              </button>
            </div>
          ) : (
            <>
              <input id="cccd" name="cccd" inputMode="numeric" maxLength={14} className="field max-w-xs tracking-widest" placeholder="12 chữ số" autoComplete="off" aria-invalid={Boolean(errors.cccd)} />
              {err("cccd")}
              {profile.hasCccd && <button type="button" className="mt-2 text-xs underline" onClick={() => setEditCccd(false)}>Giữ số hiện tại</button>}
            </>
          )}
          <p className="mt-3 text-xs leading-relaxed text-muted">Không bắt buộc. CCCD được mã hoá AES-256 trước khi lưu, chỉ hiển thị 4 số cuối; quản trị viên xem đầy đủ đều bị ghi nhật ký.</p>
          <label className="mt-3 flex items-start gap-3 text-sm">
            <input type="checkbox" name="consent" defaultChecked={false} className="mt-0.5 h-5 w-5 accent-[var(--color-ink)]" />
            <span>Tôi đồng ý cho Éleonore xử lý dữ liệu cá nhân (cần khi lưu CCCD lần đầu).</span>
          </label>
        </div>
      </section>

      <section id="phong-cach" aria-labelledby="sec-style" className="scroll-mt-36">
        <h2 id="sec-style" className="text-3xl">Phong cách yêu thích</h2>
        <p className="mb-6 mt-2 text-sm text-muted">Chọn một hoặc nhiều phong cách. Trang chủ sẽ gợi ý sản phẩm phù hợp.</p>
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {styles.map((s) => {
            const on = picked.includes(s.id);
            return (
              <li key={s.id}>
                <button type="button" aria-pressed={on} onClick={() => toggle(s.id)}
                  className={cn("group relative block aspect-[4/5] w-full overflow-hidden bg-sand text-left outline-offset-2", on && "ring-2 ring-ink ring-offset-2 ring-offset-ivory")}>
                  <SmartImage src={s.heroImage} alt="" sizes="(min-width:768px) 20vw, 45vw" className="transition-transform duration-500 group-hover:scale-105" />
                  <span className="absolute inset-0 bg-gradient-to-t from-ink/75 to-transparent" />
                  <span className="absolute inset-x-0 bottom-0 p-3 text-ivory"><span className="font-display block text-xl">{s.name}</span><span className="line-clamp-2 text-[11px] text-ivory/80">{s.tagline}</span></span>
                  {on && <span className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-ivory text-ink"><Check size={16} /></span>}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          <div><label className="label" htmlFor="budgetMax">Ngân sách tối đa / món (₫)</label>
            <input id="budgetMax" name="budgetMax" inputMode="numeric" defaultValue={profile.budgetMax ?? ""} className="field" placeholder="vd: 500000" />{err("budgetMax")}</div>
          <div><label className="label" htmlFor="size">Size thường mặc</label>
            <select id="size" name="size" defaultValue={profile.size ?? ""} className="field"><option value="">Chưa chọn</option>{SIZES.map((s) => <option key={s}>{s}</option>)}</select></div>
          <div><label className="label" htmlFor="heightCm">Chiều cao (cm)</label>
            <input id="heightCm" name="heightCm" inputMode="numeric" defaultValue={profile.heightCm ?? ""} className="field" />{err("heightCm")}</div>
        </div>
        <label className="mt-6 flex items-start gap-3 text-sm">
          <input type="checkbox" name="newsletter" defaultChecked={profile.newsletter} className="mt-0.5 h-5 w-5 accent-[var(--color-ink)]" />
          <span>Nhận email gợi ý phong cách và ưu đãi mới.</span>
        </label>
      </section>

      <div className="sticky bottom-0 -mx-4 border-t border-line bg-ivory/95 px-4 py-4 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:p-0" style={{ zIndex: "var(--z-sticky)" }}>
        <button type="submit" disabled={busy} className="btn btn-solid w-full md:w-auto">{busy ? "Đang lưu…" : "Lưu thay đổi"}</button>
      </div>
    </form>
  );
}
