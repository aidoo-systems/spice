"use client";

import type { UpgradeLadder, Upgrade } from "@/lib/types";

function UpgradeCard({ upgrade, tint }: { upgrade: Upgrade; tint: string }) {
  return (
    <div className={`border rounded-lg p-3 ${tint}`}>
      <span className="font-medium text-sm">+{upgrade.requires}</span>
      <span className="text-stone-600 dark:text-muted text-sm"> &mdash; {upgrade.why}</span>
      <p className="text-xs text-stone-500 dark:text-muted mt-1">{upgrade.how}</p>
    </div>
  );
}

function LevelLabel({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-1.5">
      <span className="grid place-items-center w-5 h-5 rounded-full bg-spice-500 text-spice-950 text-xs font-bold leading-none">
        {n}
      </span>
      <span className="text-xs font-semibold text-stone-500 dark:text-muted ">
        {children}
      </span>
    </div>
  );
}

// Neutral cards; the numbered dot carries the colour.
const TINT = "bg-stone-50 dark:bg-white/[0.03] border-stone-200 dark:border-line";

export default function UpgradeLadderUI({ ladder }: { ladder: UpgradeLadder }) {
  const hasPantry = ladder.pantry_upgrade.length > 0;
  const hasIfYouHave = ladder.if_you_have.length > 0;
  const hasShop = !!ladder.one_pound_shop;

  if (!hasPantry && !hasIfYouHave && !hasShop) return null;

  // Number only the tiers that are present, so the ladder never starts at 2.
  const tiers = [hasPantry && "pantry", hasIfYouHave && "have", hasShop && "shop"].filter(Boolean);
  const n = (tier: string) => tiers.indexOf(tier) + 1;

  return (
    <div className="space-y-3">
      {hasPantry && (
        <div>
          <LevelLabel n={n("pantry")}>From your pantry</LevelLabel>
          <div className="space-y-2">
            {ladder.pantry_upgrade.map((u, i) => (
              <UpgradeCard key={i} upgrade={u} tint={TINT} />
            ))}
          </div>
        </div>
      )}

      {hasIfYouHave && (
        <div>
          <LevelLabel n={n("have")}>If you have&hellip;</LevelLabel>
          <div className="space-y-2">
            {ladder.if_you_have.map((u, i) => (
              <UpgradeCard key={i} upgrade={u} tint={TINT} />
            ))}
          </div>
        </div>
      )}

      {hasShop && (
        <div>
          <LevelLabel n={n("shop")}>A &pound;1 shop add-on</LevelLabel>
          <UpgradeCard upgrade={ladder.one_pound_shop!} tint={TINT} />
        </div>
      )}
    </div>
  );
}
