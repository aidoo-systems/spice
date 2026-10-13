/** Inline stroke icons (Heroicons outline paths). */

const PATHS = {
  bookmark: ["M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"],
  settings: [
    "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
    "M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  ],
  sun: ["M12 3v1m0 16v1m8.66-13.66l-.71.71M4.05 19.95l-.71.71M21 12h-1M4 12H3m16.66 7.66l-.71-.71M4.05 4.05l-.71-.71M16 12a4 4 0 11-8 0 4 4 0 018 0z"],
  moon: ["M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"],
  info: ["M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"],
  flame: ["M12 3c2.5 2 3 4 3 6a3 3 0 11-6 0c0-.8.2-1.5.5-2.2C8 8 7 10 7 12.5a5 5 0 1010 0c0-4-2.5-7-5-9.5z"],
  close: ["M6 18L18 6M6 6l12 12"],
  check: ["M5 13l4 4L19 7"],
  undo: ["M3 10h10a5 5 0 010 10H9M3 10l4-4M3 10l4 4"],
  send: ["M5 12h14M13 6l6 6-6 6"],
  back: ["M19 12H5M11 18l-6-6 6-6"],
  volume: ["M11 5L6 9H3v6h3l5 4V5z", "M15.5 8.5a5 5 0 010 7M18.5 5.5a9 9 0 010 13"],
  mute: ["M11 5L6 9H3v6h3l5 4V5z", "M22 9l-6 6M16 9l6 6"],
  sliders: ["M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0", "M16 4v4M10 10v4M18 16v4"],
  play: ["M7 4.5v15l13-7.5-13-7.5z"],
  plus: ["M12 5v14M5 12h14"],
  refresh: ["M4 4v6h6", "M20 20v-6h-6", "M20 10a8 8 0 00-14.9-3M4 14a8 8 0 0014.9 3"],
  share: ["M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7", "M16 6l-4-4-4 4M12 2v13"],
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className = "w-[18px] h-[18px]", strokeWidth = 2 }: {
  name: IconName;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={strokeWidth} aria-hidden="true">
      {PATHS[name].map((d) => (
        <path key={d} strokeLinecap="round" strokeLinejoin="round" d={d} />
      ))}
    </svg>
  );
}
