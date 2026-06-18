export default function Loading() {
  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <div className="skeleton w-4 h-4 rounded" />
        <div className="space-y-2">
          <div className="skeleton h-5 w-48" />
          <div className="skeleton h-3 w-32" />
        </div>
      </div>
      <div className="vault-card p-6">
        <div className="flex items-center gap-6">
          <div className="skeleton w-24 h-24 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3.5 w-32" />
            <div className="skeleton h-3 w-full" />
            <div className="skeleton h-3 w-4/5" />
          </div>
        </div>
      </div>
      <div className="vault-card divide-y divide-vault-border">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4 flex items-start gap-3">
            <div className="skeleton w-7 h-7 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-3 w-24" />
              <div className="skeleton h-3.5 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
