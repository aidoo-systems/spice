"use client";

import type { RefObject } from "react";
import { Wordmark } from "./Mark";
import { Icon } from "./icons";
import { iconButton } from "./ui";

interface Props {
  onHome: () => void;
  onOpenRecipes: () => void;
  onOpenSettings: () => void;
  settingsButtonRef: RefObject<HTMLButtonElement | null>;
}

export default function TopBar({ onHome, onOpenRecipes, onOpenSettings, settingsButtonRef }: Props) {
  return (
    <header className="flex items-center justify-between py-4">
      <h1>
        <button onClick={onHome} className="text-2xl" aria-label="SPICE, home">
          <Wordmark />
        </button>
      </h1>
      <nav className="flex items-center gap-1">
        <button onClick={onOpenRecipes} className={iconButton} aria-label="Saved recipes">
          <Icon name="bookmark" />
        </button>
        <button onClick={onOpenSettings} ref={settingsButtonRef} className={iconButton} aria-label="Settings">
          <Icon name="settings" />
        </button>
      </nav>
    </header>
  );
}
