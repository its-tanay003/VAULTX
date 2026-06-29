import { SkeletonPageHeader, SkeletonStatGrid, SkeletonCard } from "@/components/skeletons/skeleton-primitives";
export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <SkeletonPageHeader /><SkeletonStatGrid count={5} /><SkeletonCard lines={6} />
    </div>
  );
}
