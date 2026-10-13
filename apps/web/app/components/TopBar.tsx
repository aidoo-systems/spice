"use client";

import type { RefObject } from "react";
import { Icon } from "./icons";
import { iconButton } from "./ui";

interface Props {
  dark: boolean;
  onToggleDark: () => void;
  onOpenRecipes: () => void;
  onOpenSettings: () => void;
  onOpenAbout: () => void;
  settingsButtonRef: RefObject<HTMLButtonElement | null>;
  headerIRef: RefObject<HTMLSpanElement | null>;
}

export default function TopBar({ dark, onToggleDark, onOpenRecipes, onOpenSettings, onOpenAbout, settingsButtonRef, headerIRef }: Props) {
  return (
    <div className="sticky top-0 z-40 -mx-4 px-4 py-3 mb-2 backdrop-blur-md bg-surface/80 dark:bg-surface-dark/80 border-b border-stone-200/50 dark:border-white/5">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
            SP
            <span ref={headerIRef} className="text-amber-500 dark:text-amber-400" style={{ fontSize: "110%", lineHeight: 1 }}>
              I
            </span>
            CE
          </h1>
          <button
            onClick={onOpenAbout}
            className="hidden sm:inline text-[11px] text-stone-400 dark:text-[rgba(245,245,245,0.45)] hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
          >
            an ai.doo demo
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={onOpenAbout} className={iconButton} aria-label="About SPICE">
            <Icon name="info" />
          </button>
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
