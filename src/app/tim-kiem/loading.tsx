import { Bone, GridSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <div className="container-x py-10" role="status" aria-label="Đang tìm kiếm">
      <Bone className="mx-auto h-3 w-40" /><Bone className="mx-auto mt-4 h-10 w-72 max-w-full" />
      <Bone className="mx-auto mt-8 h-11 w-full max-w-2xl" />
      <div className="mt-10 flex gap-2"><Bone className="h-7 w-24" /><Bone className="h-7 w-28" /><Bone className="h-7 w-20" /></div>
      <div className="mt-6"><GridSkeleton count={12} /></div>
    </div>
  );
}
