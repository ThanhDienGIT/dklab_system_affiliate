"use client";
import { useFavorites } from "@/components/ui/providers";

export function FavCount() {
  const { ids } = useFavorites();
  if (!ids.size) return null;
  return (
    <span className="absolute right-1 top-1.5 grid min-w-[16px] place-items-center rounded-full bg-ink px-1 text-[10px] font-semibold leading-4 text-ivory" aria-label={`${ids.size} sản phẩm yêu thích`}>
      {ids.size > 99 ? "99+" : ids.size}
    </span>
  );
}
