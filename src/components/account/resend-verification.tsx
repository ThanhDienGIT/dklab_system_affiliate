"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { useToast } from "@/components/ui/providers";

const COOLDOWN_S = 300; // khop voi server: 1 mail / 5 phut
const KEY = "ele:verify-next";

function remaining() {
  try { return Math.max(0, Math.ceil((Number(localStorage.getItem(KEY) || 0) - Date.now()) / 1000)); } catch { return 0; }
}
function arm(s = COOLDOWN_S) { try { localStorage.setItem(KEY, String(Date.now() + s * 1000)); } catch { /* ignore */ } }
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** loggedIn: gui cho tai khoan hien tai; khong thi hien o nhap email. Bam duoc 1 lan / 5 phut. */
export function ResendVerification({ loggedIn = false, compact = false }: { loggedIn?: boolean; compact?: boolean }) {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);

  useEffect(() => { setWait(remaining()); }, []);
  useEffect(() => {
    if (wait <= 0) return;
    const t = setInterval(() => setWait(remaining()), 1000);
    return () => clearInterval(t);
  }, [wait > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  async function send() {
    setBusy(true);
    try {
      await apiFetch("/api/auth/resend-verification", { body: loggedIn ? {} : { email } });
      arm(); setWait(COOLDOWN_S);
      toast("Đã gửi email xác thực, hãy kiểm tra hộp thư (cả mục Spam)");
    } catch (e) {
      const m = e instanceof Error ? e.message : "Gửi thất bại";
      if (/5 phút/.test(m)) { arm(); setWait(remaining()); }
      toast(m, "err");
    }
    setBusy(false);
  }
  const locked = wait > 0;
  return (
    <div className={compact ? "" : "mx-auto max-w-sm space-y-3"}>
      {!loggedIn && <input aria-label="Email" type="email" className="field" placeholder="Email đã đăng ký" value={email} onChange={(e) => setEmail(e.target.value)} />}
      <button type="button" className={compact ? "link-u text-sm disabled:opacity-60" : "btn btn-solid w-full"} disabled={busy || locked || (!loggedIn && !email.includes("@"))} onClick={send}>
        {busy ? "Đang gửi…" : locked ? `Đã gửi — gửi lại sau ${fmt(wait)}` : "Gửi email xác thực"}
      </button>
    </div>
  );
}
