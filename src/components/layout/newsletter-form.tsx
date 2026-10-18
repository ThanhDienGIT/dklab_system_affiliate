"use client";
import { useState } from "react";
import { Mail } from "lucide-react";
import { apiFetch } from "@/lib/api-client";

export function NewsletterForm({ tone = "light", onDone }: { tone?: "light" | "dark"; onDone?: () => void }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "ok" | "err">("idle");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const hp = (new FormData(e.currentTarget).get("hp") as string) ?? "";
    setState("busy");
    try {
      await apiFetch("/api/newsletter", { body: { email, hp } });
      setState("ok"); setMsg("Cảm ơn bạn! Chúng tôi đã ghi nhận email.");
      try { localStorage.setItem("el_nl", "1"); } catch { /* */ }
      onDone?.();
    } catch (err) { setState("err"); setMsg(err instanceof Error ? err.message : "Có lỗi xảy ra"); }
  }
  const dark = tone === "dark";
  return (
    <form onSubmit={submit} noValidate className="w-full">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="nl-email">Email của bạn</label>
        <input id="nl-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email của bạn" autoComplete="email"
          className={`field flex-1 ${dark ? "border-ivory/30 bg-transparent text-ivory placeholder:text-ivory/50" : ""}`} aria-invalid={state === "err"} />
        <input name="hp" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-0 w-0 opacity-0" />
        <button type="submit" disabled={state === "busy"} className={`btn ${dark ? "border-gold-soft bg-gold-soft text-ink hover:bg-ivory" : "btn-solid"}`}>
          <Mail size={15} /> {state === "busy" ? "Đang gửi…" : "Đăng ký"}
        </button>
      </div>
      <p role="status" className={`mt-2 min-h-5 text-xs ${state === "err" ? "text-rose" : dark ? "text-gold-soft" : "text-ok"}`}>{state === "ok" || state === "err" ? msg : ""}</p>
    </form>
  );
}
