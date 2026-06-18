import { SkeletonList } from "@/components/skeletons/skeleton-primitives";

export default function Loading() {
  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="skeleton h-6 w-36" />
          <div className="skeleton h-3.5 w-44" />
        </div>
      </div>
      <SkeletonList count={6} />
    </div>
  );
}
