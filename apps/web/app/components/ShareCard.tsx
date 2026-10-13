"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import type { SuggestResponse } from "@/lib/types";
import { saveRecipe } from "@/lib/recipes";
import { Wordmark } from "./Mark";
import Timeline from "./Timeline";
import { Icon } from "./icons";

interface Props {
  result: SuggestResponse;
  ingredientCount: number;
  className?: string;
}

export default function ShareCard({ result, ingredientCount, className }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardDataUrl, setCardDataUrl] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Generate PNG in background on mount
  useEffect(() => {
    let cancelled = false;
    async function generate() {
      if (!cardRef.current) return;
      try {
        const { toPng } = await import("html-to-image");
        const url = await toPng(cardRef.current, { pixelRatio: 2 });
        if (!cancelled) setCardDataUrl(url);
      } catch {
        // Silently fail — share button will show fallback
      }
    }
    // Small delay to ensure the card is rendered
    const timer = setTimeout(generate, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [result]);

  const handleShare = useCallback(async () => {
    if (!cardDataUrl) return;
    try {
      // Convert data URL to blob
      const res = await fetch(cardDataUrl);
      const blob = await res.blob();
      const file = new File(
        [blob],
        `spice-${result.title.toLowerCase().replace(/\s+/g, "-")}.png`,
        { type: "image/png" }
      );

      // 1. Try native share with image (best experience)
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: result.title,
          text: `Check out this recipe: ${result.title}`,
          files: [file],
        });
        toast.success("Shared");
        return;
      }

      // 2. Try native share without image (triggers share sheet on mobile)
      if (navigator.share) {
        await navigator.share({
          title: result.title,
          text: `Check out this recipe: ${result.title}`,
        });
        toast.success("Shared");
        return;
      }

      // 3. Last resort: download image
      const link = document.createElement("a");
      link.download = file.name;
      link.href = cardDataUrl;
      link.click();
      toast.success("Image downloaded");
    } catch (err) {
      // User cancelled share dialog — not an error
      if (err instanceof Error && err.name === "AbortError") return;
      console.error("Share failed:", err);
      toast.error("Failed to share");
    }
  }, [cardDataUrl, result.title]);

  const handleSave = useCallback(() => {
    saveRecipe(result, ingredientCount);
    setSaved(true);
    toast.success("Saved to this browser");
  }, [result, ingredientCount]);

  const meta = [
    result.prep_time_minutes > 0 ? `about ${result.prep_time_minutes} min` : null,
    `${ingredientCount} ingredients`,
    result.calories_estimate ? `~${result.calories_estimate} kcal` : null,
  ].filter(Boolean).join(" · ");

  return (
    <div className={`relative ${className ?? ""}`}>
      {/* The poster (1080×1350 at 2×), off-screen so it doesn't affect layout */}
      <div className="absolute overflow-hidden h-0 w-0 pointer-events-none" aria-hidden="true">
        <div ref={cardRef} className="w-[540px] h-[675px] bg-spice-500 text-spice-950 p-10 flex flex-col">
          <div className="flex items-center gap-2 text-xl">
            <Wordmark inverse />
          </div>
          <h3 className="mt-10 font-display text-[44px] font-bold leading-[1.05] tracking-tight line-clamp-4">{result.title}</h3>
          <p className="mt-4 text-lg font-medium">{meta}</p>
          <div className="mt-auto">
            <Timeline steps={result.steps.slice(0, 12)} prepMinutes={result.prep_time_minutes} tone="poster" />
          </div>
          {result.why_this_works[0] && (
            <p className="mt-6 text-base leading-snug line-clamp-2">&ldquo;{result.why_this_works[0]}&rdquo;</p>
          )}
          <p className="mt-6 pt-4 border-t border-spice-950/25 text-sm font-semibold">Make yours at spice.aidoo.biz</p>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={handleShare} disabled={!cardDataUrl} className={action}>
          <Icon name="share" className="w-4 h-4" /> Share
        </button>
        <button onClick={handleSave} disabled={saved} className={action} aria-label={saved ? "Recipe saved" : "Save recipe"}>
          <Icon name="bookmark" className="w-4 h-4" /> {saved ? "Saved" : "Save"}
        </button>
      </div>
    </div>
  );
}

const action =
  "inline-flex items-center gap-1.5 text-sm px-3 py-1.5 min-h-[36px] rounded-lg border border-stone-300 dark:border-line text-stone-700 dark:text-ink hover:border-stone-500 dark:hover:border-muted disabled:opacity-40 transition-colors";
