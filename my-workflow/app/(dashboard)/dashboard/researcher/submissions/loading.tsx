import { SkeletonPageHeader, SkeletonList } from "@/components/skeletons/skeleton-primitives";

export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <SkeletonPageHeader />
      <div className="flex gap-2">
        <div className="skeleton h-8 w-80 rounded-lg" />
      </div>
      <SkeletonList count={5} />
    </div>
  );
}
