"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { useToast } from "@/components/ui/providers";

export function AvatarUploader({ url, name, kind = "avatar" }: { url: string | null; name: string; kind?: "avatar" }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useToast();

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast("Ảnh tối đa 5MB", "err"); return; }
    setBusy(true);
    try {
      const form = new FormData();
      form.set("file", file); form.set("kind", kind);
      await apiFetch("/api/upload", { form });
      toast("Đã cập nhật ảnh đại diện");
      router.refresh();
    } catch (err) { toast(err instanceof Error ? err.message : "Tải ảnh thất bại", "err"); }
    setBusy(false);
  }

  return (
    <div className="relative mx-auto h-40 w-40">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={`Ảnh đại diện của ${name}`} className="h-40 w-40 rounded-full object-cover ring-2 ring-gold-soft ring-offset-4 ring-offset-ivory" />
      ) : <div className="font-display grid h-40 w-40 place-items-center rounded-full bg-ink text-6xl text-ivory">{name.slice(0, 1).toUpperCase()}</div>}
      <button type="button" onClick={() => ref.current?.click()} disabled={busy} aria-label="Đổi ảnh đại diện"
        className="absolute bottom-1 right-1 grid h-11 w-11 place-items-center rounded-full bg-ink text-ivory shadow-lg transition hover:bg-gold-deep disabled:opacity-60">
        <Camera size={18} />
      </button>
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" className="sr-only" onChange={onFile} aria-hidden tabIndex={-1} />
    </div>
  );
}
