import { SkeletonPageHeader } from "@/components/skeletons/skeleton-primitives";
export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <SkeletonPageHeader />
      <div className="vault-card p-4"><div className="skeleton h-4 w-48 mb-2" /><div className="skeleton h-3.5 w-72" /></div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="vault-card p-5 space-y-3">
          <div className="flex gap-3"><div className="skeleton h-5 w-14 rounded" /><div className="flex-1 space-y-2"><div className="skeleton h-4 w-3/4" /></div></div>
          <div className="skeleton h-16 w-full" />
          <div className="flex gap-2"><div className="skeleton flex-1 h-9 rounded-lg" /><div className="skeleton flex-1 h-9 rounded-lg" /></div>
        </div>
      ))}
    </div>
  );
}
