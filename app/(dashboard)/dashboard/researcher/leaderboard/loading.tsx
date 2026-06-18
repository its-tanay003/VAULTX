export default function Loading() {
  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="space-y-2">
        <div className="skeleton h-6 w-44" />
        <div className="skeleton h-3.5 w-72" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[1, 0, 2].map((i) => (
          <div key={i} className="vault-card p-4 text-center">
            <div className="skeleton w-12 h-12 rounded-full mx-auto mb-2" />
            <div className="skeleton h-3.5 w-16 mx-auto mb-1.5" />
            <div className="skeleton h-3 w-10 mx-auto" />
          </div>
        ))}
      </div>
      <div className="vault-card divide-y divide-vault-border">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4">
            <div className="skeleton w-7 h-4" />
            <div className="skeleton w-8 h-8 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <div className="skeleton h-3.5 w-32" />
              <div className="skeleton h-3 w-20" />
            </div>
            <div className="skeleton h-4 w-10" />
          </div>
        ))}
      </div>
    </div>
  );
}
