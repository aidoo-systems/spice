"use client";

import type { RefObject } from "react";
import { AidooWordmark } from "./AidooMark";
import { Icon } from "./icons";
import { iconButton } from "./ui";

interface Props {
  dark: boolean;
  onToggleDark: () => void;
  onOpenRecipes: () => void;
  onOpenSettings: () => void;
  onOpenAbout: () => void;
  settingsButtonRef: RefObject<HTMLButtonElement | null>;
}

export default function TopBar({ dark, onToggleDark, onOpenRecipes, onOpenSettings, onOpenAbout, settingsButtonRef }: Props) {
  return (
    <div className="sticky top-0 z-40 -mx-4 px-4 py-3 mb-4 bg-surface dark:bg-surface-dark border-b border-stone-200 dark:border-line">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-3">
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
            SP<span className="text-spice-600 dark:text-spice-400">I</span>CE
          </h1>
          <button
            onClick={onOpenAbout}
            className="text-sm text-stone-500 dark:text-muted hover:text-stone-900 dark:hover:text-ink underline-offset-4 hover:underline"
          >
            by <AidooWordmark />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onOpenRecipes} className={iconButton} aria-label="Saved recipes">
            <Icon name="bookmark" />
          </button>
          <button onClick={onOpenSettings} ref={settingsButtonRef} className={iconButton} aria-label="Settings">
            <Icon name="settings" />
          </button>
          <button onClick={onToggleDark} className={iconButton} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}>
            <Icon name={dark ? "sun" : "moon"} />
          </button>
        </div>
      </div>
    </div>
  );
}
