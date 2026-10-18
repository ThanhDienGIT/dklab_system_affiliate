import Image from "next/image";
import { cn } from "@/lib/utils";

interface Props {
  src: string | null | undefined; alt: string; sizes?: string; className?: string; priority?: boolean;
  /** true: lap day khung cha (cha phai co position + aspect) */
  fill?: boolean; width?: number; height?: number;
}

/** next/image cho duong dan hop le; <img> cho data-URL (inline upload tren Vercel) hoac khi khong co anh. */
export function SmartImage({ src, alt, sizes = "(min-width:1024px) 25vw, 50vw", className, priority, fill = true, width, height }: Props) {
  if (!src) {
    return <div role="img" aria-label={alt} className={cn("absolute inset-0 bg-sand", className)} />;
  }
  if (src.startsWith("data:")) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={cn(fill && "absolute inset-0 h-full w-full object-cover", className)} loading={priority ? "eager" : "lazy"} decoding="async" />;
  }
  return fill
    ? <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={cn("object-cover", className)} />
    : <Image src={src} alt={alt} width={width ?? 800} height={height ?? 1000} sizes={sizes} priority={priority} className={className} />;
}
