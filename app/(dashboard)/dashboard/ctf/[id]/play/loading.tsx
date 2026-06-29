import { SkeletonPageHeader } from "@/components/skeletons/skeleton-primitives";
export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <SkeletonPageHeader />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="vault-card p-4 flex items-center gap-3">
              <div className="skeleton w-8 h-8 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2"><div className="skeleton h-3.5 w-1/2" /><div className="skeleton h-3 w-1/3" /></div>
              <div className="skeleton h-8 w-12" />
            </div>
          ))}
        </div>
        <div className="vault-card p-4">
          <div className="skeleton h-4 w-28 mb-4" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2.5 p-2 mb-2">
              <div className="skeleton w-5 h-4" /><div className="skeleton w-6 h-6 rounded-full" />
              <div className="flex-1 space-y-1"><div className="skeleton h-3 w-24" /></div>
              <div className="skeleton h-3.5 w-8" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
