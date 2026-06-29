import { SkeletonPageHeader, SkeletonCard } from "@/components/skeletons/skeleton-primitives";
export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <SkeletonPageHeader />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <SkeletonCard lines={3} />
          <SkeletonCard lines={5} />
        </div>
        <div><SkeletonCard lines={2} /></div>
      </div>
    </div>
  );
}
