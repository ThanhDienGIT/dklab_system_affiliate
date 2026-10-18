"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Pencil, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { useToast } from "@/components/ui/providers";
import { BlogGenerateButton } from "./blog-generate-button";

export function ProductRowActions({ id, slug, status, name = "" }: { id: number; slug: string; status: string; name?: string }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try { await fn(); toast(ok); router.refresh(); } catch (e) { toast(e instanceof Error ? e.message : "Thất bại", "err"); }
    setBusy(false);
  };
  return (
    <div className="flex items-center justify-end gap-1">
      <Link href={`/admin/san-pham/${id}`} aria-label="Sửa" className="grid h-10 w-10 place-items-center hover:text-gold-deep"><Pencil size={16} /></Link>
      <BlogGenerateButton productId={id} name={name || slug} />
      <Link href={`/san-pham/${slug}`} target="_blank" aria-label="Xem trên website" className="grid h-10 w-10 place-items-center hover:text-gold-deep"><ExternalLink size={16} /></Link>
      <button type="button" disabled={busy} className="h-10 px-2 text-xs underline underline-offset-4 hover:text-gold-deep"
        onClick={() => run(() => apiFetch(`/api/admin/products/${id}`, { method: "PATCH", body: { status: status === "published" ? "draft" : "published" } }), status === "published" ? "Đã ẩn" : "Đã đăng")}>
        {status === "published" ? "Ẩn" : "Đăng"}
      </button>
      <button type="button" disabled={busy} aria-label="Xoá" className="grid h-10 w-10 place-items-center text-rose"
        onClick={() => { if (confirm("Xoá sản phẩm này? Không thể hoàn tác.")) run(() => apiFetch(`/api/admin/products/${id}`, { method: "DELETE" }), "Đã xoá"); }}>
        <Trash2 size={16} />
      </button>
    </div>
  );
}
