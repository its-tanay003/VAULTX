import { SkeletonPageHeader, SkeletonCard, SkeletonList } from "@/components/skeletons/skeleton-primitives";
export default function Loading() {
  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <SkeletonPageHeader />
      <SkeletonCard lines={5} />
      <SkeletonList count={3} />
    </div>
  );
}
