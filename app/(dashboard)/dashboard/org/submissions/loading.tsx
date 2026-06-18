import { SkeletonPageHeader, SkeletonList } from "@/components/skeletons/skeleton-primitives";

export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <SkeletonPageHeader />
      <div className="flex gap-1">
        <div className="skeleton h-8 w-72 rounded-lg" />
      </div>
      <SkeletonList count={6} />
    </div>
  );
}
