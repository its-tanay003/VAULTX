import { SkeletonPageHeader, SkeletonList } from "@/components/skeletons/skeleton-primitives";
export default function Loading() {
  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <SkeletonPageHeader />
      <div className="vault-card p-4">
        <div className="skeleton h-3.5 w-full mb-2" /><div className="skeleton h-3.5 w-3/4" />
      </div>
      <SkeletonList count={3} />
    </div>
  );
}
