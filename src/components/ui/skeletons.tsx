import { cn } from "@/lib/utils";

/** Khoi xam co shimmer. Dung dung kich thuoc that de khong nhay layout (CLS = 0). */
export function Bone({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton", className)} />;
}

export function CardSkeleton() {
  return (
    <div>
      <Bone className="aspect-[4/5] w-full" />
      <Bone className="mt-3 h-2.5 w-16" />
      <Bone className="mt-2 h-3.5 w-11/12" />
      <Bone className="mt-1.5 h-3.5 w-2/3" />
      <Bone className="mt-2.5 h-4 w-24" />
    </div>
  );
}

export function GridSkeleton({ count = 12, cols = 4 }: { count?: number; cols?: 3 | 4 | 5 }) {
  return (
    <div role="status" aria-label="Đang tải sản phẩm"
      className={cn("grid grid-cols-2 gap-x-3 gap-y-8 md:gap-x-5 md:gap-y-10",
        cols === 3 && "md:grid-cols-3", cols === 4 && "md:grid-cols-3 xl:grid-cols-4", cols === 5 && "md:grid-cols-3 xl:grid-cols-5")}>
      {Array.from({ length: count }, (_, i) => <CardSkeleton key={i} />)}
      <span className="sr-only">Đang tải…</span>
    </div>
  );
}

/** Khung trang danh muc: tieu de + cot loc + luoi */
export function CatalogSkeleton({ title = true }: { title?: boolean }) {
  return (
    <>
      {title && (
        <div className="container-x pt-8 md:pt-12">
          <Bone className="h-3 w-40" />
          <Bone className="mt-4 h-10 w-72 max-w-full md:h-12" />
          <Bone className="mt-3 h-4 w-96 max-w-full" />
        </div>
      )}
      <div className="container-x grid gap-10 pb-4 pt-8 lg:grid-cols-[250px_1fr] xl:grid-cols-[270px_1fr]">
        <div className="hidden space-y-5 lg:block">
          {Array.from({ length: 6 }, (_, i) => <Bone key={i} className="h-5 w-full" />)}
        </div>
        <div>
          <div className="mb-6 flex justify-between"><Bone className="h-4 w-28" /><Bone className="h-9 w-44" /></div>
          <GridSkeleton count={12} />
        </div>
      </div>
    </>
  );
}

/** Trang chi tiet kieu Shopee */
export function DetailSkeleton() {
  return (
    <div className="bg-[#f5f5f5] pb-12" role="status" aria-label="Đang tải sản phẩm">
      <div className="container-x">
        <Bone className="my-4 h-4 w-80 max-w-full" />
        <div className="grid gap-6 rounded-[3px] bg-white p-4 md:grid-cols-[450px_1fr] md:p-6">
          <div>
            <Bone className="aspect-square w-full" />
            <div className="mt-3 grid grid-cols-5 gap-2">{Array.from({ length: 5 }, (_, i) => <Bone key={i} className="aspect-square" />)}</div>
          </div>
          <div className="space-y-4">
            <Bone className="h-6 w-full" /><Bone className="h-6 w-3/4" />
            <Bone className="h-4 w-60" />
            <Bone className="h-16 w-full" />
            <Bone className="h-4 w-1/2" /><Bone className="h-10 w-full" /><Bone className="h-10 w-full" />
            <Bone className="h-12 w-64" />
          </div>
        </div>
        <SectionSkeleton className="mt-4" />
      </div>
      <span className="sr-only">Đang tải…</span>
    </div>
  );
}

export function SectionSkeleton({ className, rows = 4 }: { className?: string; rows?: number }) {
  return (
    <div className={cn("space-y-3 rounded-[3px] bg-white p-4 md:p-6", className)} aria-hidden>
      <Bone className="h-5 w-48" />
      {Array.from({ length: rows }, (_, i) => <Bone key={i} className={cn("h-4", i % 2 ? "w-4/5" : "w-full")} />)}
    </div>
  );
}

/** Luoi san pham lien quan (6 cot kieu Shopee) */
export function RelatedSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6" aria-hidden>
      {Array.from({ length: count }, (_, i) => <div key={i} className="bg-white"><Bone className="aspect-square w-full" /><div className="space-y-2 p-2"><Bone className="h-3 w-full" /><Bone className="h-3 w-2/3" /><Bone className="h-4 w-1/2" /></div></div>)}
    </div>
  );
}
