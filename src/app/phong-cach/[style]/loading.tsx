import { Bone, GridSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <div role="status" aria-label="Đang tải phong cách">
      <Bone className="h-[46vh] min-h-72 w-full" />
      <div className="container-x py-12">
        <Bone className="mx-auto h-9 w-72 max-w-full" />
        <div className="mt-10"><GridSkeleton count={8} /></div>
      </div>
    </div>
  );
}
