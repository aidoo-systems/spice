"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetRef: React.RefObject<HTMLElement | null>;
}

interface Props {
  open: boolean;
  steps: TutorialStep[];
  stepIndex: number;
  onStepChange: (index: number) => void;
  onClose: () => void;
  onComplete: () => void;
}

interface Position {
  top: number;
  left: number;
  maxWidth: number;
  placement: "top" | "bottom" | "center";
}

interface HighlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const CARD_WIDTH = 320;
const GAP = 12;

export default function TutorialOverlay({
  open,
  steps,
  stepIndex,
  onStepChange,
  onClose,
  onComplete,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const prevOpenRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [shouldRender, setShouldRender] = useState(open);
  const [visible, setVisible] = useState(open);
  const [position, setPosition] = useState<Position>({
    top: 0,
    left: 0,
    maxWidth: CARD_WIDTH,
    placement: "center",
  });
  const [highlight, setHighlight] = useState<HighlightRect | null>(null);

  const step = steps[stepIndex];
  const totalSteps = steps.length;

  const focusableSelector = useMemo(
    () =>
      "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
    []
  );

  useLayoutEffect(() => {
    if (!open) return;
    function update() {
      const target = step?.targetRef.current;
      if (!target) {
        setHighlight(null);
        setPosition({
          top: Math.max(24, window.innerHeight / 2 - 120),
          left: Math.max(16, window.innerWidth / 2 - CARD_WIDTH / 2),
          maxWidth: Math.min(CARD_WIDTH, window.innerWidth - 32),
          placement: "center",
        });
        return;
      }

      const rect = target.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      setHighlight({
        top: rect.top - 6,
        left: rect.left - 6,
        width: rect.width + 12,
        height: rect.height + 12,
      });

      const maxWidth = Math.min(CARD_WIDTH, viewportWidth - 32);
      let top = rect.bottom + GAP;
      let placement: Position["placement"] = "bottom";

      if (top + 200 > viewportHeight && rect.top - GAP > 200) {
        top = rect.top - GAP;
        placement = "top";
      }

      let left = rect.left + rect.width / 2 - maxWidth / 2;
      left = Math.max(16, Math.min(left, viewportWidth - maxWidth - 16));

      if (placement === "top") {
        top = Math.max(16, top - 220);
      }

      if (top < 16 || top > viewportHeight - 120) {
        top = Math.max(24, viewportHeight / 2 - 120);
        left = Math.max(16, viewportWidth / 2 - maxWidth / 2);
        placement = "center";
      }

      setPosition({ top, left, maxWidth, placement });
    }

    function scheduleUpdate() {
      if (rafRef.current) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        update();
      });
    }

    update();
    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("scroll", scheduleUpdate, true);
    return () => {
      window.removeEventListener("resize", scheduleUpdate);
      window.removeEventListener("scroll", scheduleUpdate, true);
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [open, stepIndex, step]);

  useEffect(() => {
    if (open) {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
      setShouldRender(true);
      requestAnimationFrame(() => setVisible(true));
      return;
    }
    setVisible(false);
    closeTimeoutRef.current = setTimeout(() => {
      setShouldRender(false);
    }, 180);
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      lastFocusedRef.current = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    }
  }, [open]);

  useEffect(() => {
    if (prevOpenRef.current && !open) {
      lastFocusedRef.current?.focus();
    }
    prevOpenRef.current = open;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const target = step?.targetRef.current;
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [open, stepIndex, step]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector)
        ).filter((el) => !el.hasAttribute("disabled"));
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, focusableSelector]);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const first = dialog.querySelector<HTMLElement>(focusableSelector);
    first?.focus();
  }, [open, stepIndex, focusableSelector]);

  if (!shouldRender || !step) return null;

  const isLast = stepIndex === totalSteps - 1;

  return (
    <div className={`fixed inset-0 z-50 ${visible ? "pointer-events-auto" : "pointer-events-none"}`}>
      <div
        className={`absolute inset-0 bg-black/30 dark:bg-black/50 transition-opacity duration-200 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        {highlight && (
          <div
            className={`absolute border-2 border-spice-400/70 dark:border-spice-500/60 rounded-xl transition-opacity duration-200 ${
              visible ? "opacity-100" : "opacity-0"
            }`}
            style={{
              top: highlight.top,
              left: highlight.left,
              width: highlight.width,
              height: highlight.height,
            }}
          />
        )}
      </div>

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`tutorial-title-${step.id}`}
        aria-describedby={`tutorial-desc-${step.id}`}
        className={`pointer-events-auto absolute bg-white dark:bg-surface-dark-card border border-stone-200 dark:border-line rounded-xl shadow-xl p-4 sm:p-5 transition-all duration-200 ${
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        }`}
        style={{ top: position.top, left: position.left, width: position.maxWidth }}
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-spice-600 dark:text-spice-400">
            Step {stepIndex + 1} of {totalSteps}
          </p>
          <button
            onClick={onClose}
            className="text-stone-500 dark:text-dim hover:text-stone-700 dark:hover:text-stone-300 min-w-[32px] min-h-[32px] flex items-center justify-center"
            aria-label="Close tutorial"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <h3 id={`tutorial-title-${step.id}`} className="text-base font-semibold mt-2">
          {step.title}
        </h3>
        <p id={`tutorial-desc-${step.id}`} className="text-sm text-stone-500 dark:text-stone-300 mt-1">
          {step.description}
        </p>

        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={() => onStepChange(Math.max(0, stepIndex - 1))}
            disabled={stepIndex === 0}
            className="text-xs px-3 py-1.5 rounded-lg border border-stone-200 dark:border-line text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-white/5 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Back
          </button>
          {!isLast ? (
            <button
              onClick={() => onStepChange(Math.min(totalSteps - 1, stepIndex + 1))}
              className="text-xs px-3 py-1.5 rounded-lg bg-spice-500 text-spice-950 hover:bg-spice-400 transition-colors duration-150"
            >
              Next
            </button>
          ) : (
            <button
              onClick={onComplete}
              className="text-xs px-3 py-1.5 rounded-lg bg-spice-500 text-spice-950 hover:bg-spice-400 transition-colors duration-150"
            >
              Finish
            </button>
          )}
          <button
            onClick={onComplete}
            className="ml-auto text-xs text-stone-500 dark:text-dim hover:text-stone-600 dark:hover:text-stone-300 underline"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
