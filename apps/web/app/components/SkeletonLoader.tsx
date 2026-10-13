function Pulse({ className }: { className?: string }) {
  return (
    <div
      className={`motion-safe:animate-pulse rounded bg-stone-200 dark:bg-white/10 ${className ?? ""}`}
    />
  );
}

export default function SkeletonLoader() {
  return (
    <div role="status" className="space-y-6 py-2">
      {/* Title */}
      <div>
        <Pulse className="h-7 w-2/3 mb-3" />
        <div className="flex gap-2">
          <Pulse className="h-5 w-16 rounded-full" />
          <Pulse className="h-5 w-20 rounded-full" />
          <Pulse className="h-5 w-24 rounded-full" />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        <Pulse className="h-5 w-16 mb-2" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-3">
            <Pulse className="h-4 w-12" />
            <Pulse className="h-4 flex-1" />
          </div>
        ))}
      </div>

      {/* Upgrade ladder */}
      <div className="space-y-3">
        <Pulse className="h-5 w-32 mb-2" />
        <Pulse className="h-16 w-full rounded-lg" />
        <Pulse className="h-16 w-full rounded-lg" />
      </div>

      {/* Why this works */}
      <Pulse className="h-12 w-full rounded-lg" />

      <span className="sr-only">Loading meal suggestion...</span>
    </div>
  );
}
