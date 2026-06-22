import { SkeletonList } from "@/components/skeletons/skeleton-primitives";

export default function Loading() {
  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="space-y-2">
        <div className="skeleton h-6 w-40" />
        <div className="skeleton h-3.5 w-72" />
      </div>
      <div className="skeleton h-20 rounded-xl border-2 border-dashed border-vault-border" />
      <SkeletonList count={3} />
    </div>
  );
}
