/**
 * Reusable skeleton building blocks. Each matches the exact spacing/sizing
 * of its real counterpart so there's zero layout shift when data arrives.
 */

export function SkeletonStatGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="vault-card p-5">
          <div className="skeleton h-3 w-24 mb-3" />
          <div className="skeleton h-8 w-16 mb-2" />
          <div className="skeleton h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonListItem() {
  return (
    <div className="flex items-center gap-3 p-4">
      <div className="skeleton w-9 h-9 rounded-lg shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-3.5 w-3/5" />
        <div className="skeleton h-3 w-2/5" />
      </div>
      <div className="skeleton h-5 w-14 rounded-full shrink-0" />
    </div>
  );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="vault-card divide-y divide-vault-border">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonListItem key={i} />
      ))}
    </div>
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="vault-card p-5">
      <div className="skeleton h-3 w-28 mb-4" />
      <div className="space-y-2.5">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="skeleton h-3" style={{ width: `${85 - i * 12}%` }} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonPageHeader() {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <div className="skeleton h-6 w-40" />
        <div className="skeleton h-3.5 w-56" />
      </div>
      <div className="skeleton h-9 w-32 rounded-lg" />
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <SkeletonPageHeader />
      <SkeletonStatGrid />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <SkeletonList count={4} />
        </div>
        <div className="lg:col-span-2">
          <SkeletonList count={3} />
        </div>
      </div>
    </div>
  );
}

export function SkeletonDetail() {
  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <SkeletonPageHeader />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <SkeletonCard lines={4} />
          <SkeletonCard lines={3} />
        </div>
        <div className="space-y-4">
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
        </div>
      </div>
    </div>
  );
}
