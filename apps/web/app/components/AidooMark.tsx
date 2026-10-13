/**
 * ai.doo's wordmark: "ai", the ball, "doo" (the ball sits where a full stop
 * would). Drawn inline from the three flat shapes of aidoo.biz's favicon.svg.
 */

export function Ball({ className = "w-[0.5em] h-[0.5em]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <circle cx="32" cy="32" r="30" fill="#f5b544" />
      <path d="M50.56 8.44A30 30 0 1 1 8.44 50.56 30 30 0 0 0 50.56 8.44z" fill="#e09a2e" />
      <ellipse cx="22.5" cy="19.5" rx="8" ry="5" transform="rotate(-38 22.5 19.5)" fill="#ffe9b8" />
    </svg>
  );
}

export function AidooWordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display font-bold tracking-tight inline-flex items-baseline ${className}`}>
      <span className="sr-only">ai.doo</span>
      <span aria-hidden="true">ai</span>
      <Ball className="w-[0.42em] h-[0.42em] mx-[0.1em] self-baseline" />
      <span aria-hidden="true">doo</span>
    </span>
  );
}
