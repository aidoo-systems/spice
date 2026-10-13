"use client";

import type { Upgrade, UpgradeLadder } from "@/lib/types";

function Item({ u }: { u: Upgrade }) {
  return (
    <li className="leading-snug">
      <span className="font-semibold">Add {u.requires}</span>
      {u.why && <span className="text-stone-600 dark:text-muted"> for {u.why.charAt(0).toLowerCase() + u.why.slice(1)}</span>}
      {u.how && <span className="block text-sm text-stone-500 dark:text-dim mt-0.5">{u.how}</span>}
    </li>
  );
}

/** Ways to make the dish better, from "you already have it" to "pick it up for £1". */
export default function UpgradeLadderUI({ ladder }: { ladder: UpgradeLadder }) {
  const tiers: { label: string; items: Upgrade[] }[] = [
    { label: "From your pantry", items: ladder.pantry_upgrade },
    { label: "If you have it", items: ladder.if_you_have },
    { label: "Worth buying (about £1)", items: ladder.one_pound_shop ? [ladder.one_pound_shop] : [] },
  ].filter((t) => t.items.length > 0);

  if (tiers.length === 0) return null;

  return (
    <div className="grid sm:grid-cols-3 gap-6">
      {tiers.map((t) => (
        <div key={t.label}>
          <p className="text-sm text-stone-500 dark:text-dim mb-2">{t.label}</p>
          <ul className="space-y-3">
            {t.items.map((u, i) => <Item key={i} u={u} />)}
          </ul>
        </div>
      ))}
    </div>
  );
}
