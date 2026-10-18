import { cn } from "@/lib/utils";

/** 5 sao kieu Shopee (cam). rating 0..5, lam tron 0.1 */
export function Stars({ rating, size = 14, className }: { rating: number; size?: number; className?: string }) {
  const pct = Math.max(0, Math.min(5, rating)) / 5 * 100;
  const star = (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z" /></svg>
  );
  const row = <span className="inline-flex gap-px">{[0, 1, 2, 3, 4].map((i) => <span key={i}>{star}</span>)}</span>;
  return (
    <span role="img" aria-label={`${rating.toFixed(1)} trên 5 sao`} className={cn("relative inline-block align-middle leading-none", className)}>
      <span className="text-[#e0e0e0] [&_path]:fill-current">{row}</span>
      <span className="absolute inset-y-0 left-0 overflow-hidden text-[#ee4d2d] [&_path]:fill-current" style={{ width: `${pct}%` }}><span className="block w-max">{row}</span></span>
    </span>
  );
}
