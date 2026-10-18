import { Bone } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <div className="space-y-6" role="status" aria-label="Đang tải">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">{Array.from({ length: 5 }, (_, i) => <Bone key={i} className="h-24" />)}</div>
      <Bone className="h-48 w-full" />
      <div className="grid gap-6 lg:grid-cols-2"><Bone className="h-64" /><Bone className="h-64" /></div>
    </div>
  );
}
