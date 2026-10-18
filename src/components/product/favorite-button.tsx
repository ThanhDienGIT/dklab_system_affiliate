"use client";
import { Heart } from "lucide-react";
import { useFavorites, useToast } from "@/components/ui/providers";
import { cn } from "@/lib/utils";

export function FavoriteButton({ productId, name, className, size = 18 }: { productId: number; name: string; className?: string; size?: number }) {
  const { ids, toggle } = useFavorites();
  const toast = useToast();
  const on = ids.has(productId);
  return (
    <button
      type="button" aria-pressed={on} aria-label={on ? `Bỏ yêu thích ${name}` : `Yêu thích ${name}`}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(productId); toast(on ? "Đã bỏ khỏi yêu thích" : "Đã thêm vào yêu thích"); }}
      className={cn("grid h-11 w-11 place-items-center transition-transform active:scale-90", className)}
    >
      <Heart size={size} strokeWidth={1.6} className={cn("transition-colors", on ? "fill-rose text-rose" : "text-ink")} />
    </button>
  );
}
