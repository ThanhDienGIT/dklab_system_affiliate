import { Bone, GridSkeleton } from "@/components/ui/skeletons";

/** Fallback chung khi chuyen trang: hien ngay khung trang trong luc server render */
export default function Loading() {
  return (
    <div className="container-x py-10 md:py-14" role="status" aria-label="Đang tải">
      <Bone className="mx-auto h-3 w-32" />
      <Bone className="mx-auto mt-4 h-10 w-80 max-w-full" />
      <div className="mt-10"><GridSkeleton count={8} /></div>
    </div>
  );
}
