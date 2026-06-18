export default function Loading() {
  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="space-y-2">
        <div className="skeleton h-6 w-28" />
        <div className="skeleton h-3.5 w-52" />
      </div>
      <div className="vault-card divide-y divide-vault-border">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3.5 p-4">
            <div className="skeleton w-9 h-9 rounded-lg shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="skeleton h-3.5 w-24" />
              <div className="skeleton h-3 w-48" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
