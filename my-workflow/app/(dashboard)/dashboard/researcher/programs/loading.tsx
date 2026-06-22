import { SkeletonPageHeader, SkeletonList } from "@/components/skeletons/skeleton-primitives";

export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <SkeletonPageHeader />
      <div className="flex gap-2">
        <div className="skeleton h-9 w-64 rounded-lg" />
        <div className="skeleton h-9 w-40 rounded-lg" />
      </div>
      <SkeletonList count={5} />
    </div>
  );
}
