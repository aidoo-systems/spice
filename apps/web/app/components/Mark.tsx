/**
 * SPICE's mark: three staggered bars, a cooking timeline in miniature (the
 * same shape as the plan timeline). Vermilion tile, dark bars.
 */

export function Mark({ className = "w-7 h-7", inverse = false }: { className?: string; inverse?: boolean }) {
  // inverse: dark tile, vermilion bars — for use on a vermilion background.
  const [tile, bars] = inverse ? ["#2a0f05", "#e8562a"] : ["#e8562a", "#2a0f05"];
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill={tile} />
      <rect x="6" y="8.5" width="12" height="4" rx="2" fill={bars} />
      <rect x="11" y="14" width="15" height="4" rx="2" fill={bars} />
      <rect x="8" y="19.5" width="9" height="4" rx="2" fill={bars} />
    </svg>
  );
}

export function Wordmark({ className = "", inverse = false }: { className?: string; inverse?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Mark className="w-[1.1em] h-[1.1em]" inverse={inverse} />
      <span className="font-display font-bold tracking-tight">SPICE</span>
    </span>
  );
}
