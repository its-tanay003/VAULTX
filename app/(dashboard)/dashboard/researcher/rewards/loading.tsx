import { SkeletonPageHeader, SkeletonStatGrid, SkeletonList } from "@/components/skeletons/skeleton-primitives";

export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <SkeletonPageHeader />
      <SkeletonStatGrid />
      <SkeletonList count={4} />
    </div>
  );
}
