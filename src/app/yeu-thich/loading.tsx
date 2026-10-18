import { Bone, GridSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return <div className="container-x py-10"><Bone className="mx-auto h-10 w-60" /><div className="mt-10"><GridSkeleton count={8} /></div></div>;
}
