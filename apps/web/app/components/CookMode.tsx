"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { Step } from "@/lib/types";
import { fmtClock, totalSeconds } from "@/lib/timeline";
import Timeline from "./Timeline";
import { Icon } from "./icons";

function playDing() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.value = 0.25;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.stop(ctx.currentTime + 0.25);
  } catch {
    // no audio available
  }
}

/** Keep the screen on while cooking; re-acquired when the tab comes back. */
function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquire = async () => {
      try {
        lock = await navigator.wakeLock.request("screen");
        if (cancelled) lock.release();
      } catch {
        // denied (battery saver, unsupported) — cooking still works
      }
    };
    const onVisible = () => document.visibilityState === "visible" && acquire();
    acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      lock?.release().catch(() => {});
    };
  }, [active]);
}

interface Props {
  open: boolean;
  title: string;
  steps: Step[];
  prepMinutes?: number;
  onClose: () => void;
  /** Called once when the last step is finished — counts as a real cook. */
  onFinish?: () => void;
  /** Shown on the done screen (rating buttons). */
  doneSlot?: ReactNode;
}

export default function CookMode({ open, title, steps, prepMinutes = 0, onClose, onFinish, doneSlot }: Props) {
  const [idx, setIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [done, setDone] = useState(false);
  const [sound, setSound] = useState(true);
  const closeRef = useRef<HTMLButtonElement>(null);
  const touchX = useRef<number | null>(null);
  const total = totalSeconds(steps, prepMinutes);

  useWakeLock(open && !done);

  // Fresh start every time cook mode opens.
  useEffect(() => {
    if (!open) return;
    setIdx(0);
    setElapsed(0);
    setPaused(false);
    setDone(false);
    closeRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // The clock. Steps advance on their own when their start time arrives.
  useEffect(() => {
    if (!open || paused || done) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [open, paused, done]);

  useEffect(() => {
    if (!open || done) return;
    const next = steps[idx + 1];
    if (next && elapsed >= next.t_seconds) setIdx(idx + 1);
    else if (!next && elapsed >= total) setDone(true);
  }, [elapsed, idx, steps, total, open, done]);

  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (open && sound) playDing();
  }, [idx]);

  useEffect(() => {
    if (done) onFinish?.();
  }, [done, onFinish]);

  const next = useCallback(() => {
    if (done) return;
    if (idx + 1 < steps.length) {
      setIdx(idx + 1);
      setElapsed((e) => Math.max(e, steps[idx + 1].t_seconds));
    } else {
      setDone(true);
    }
  }, [done, idx, steps]);

  const prev = useCallback(() => {
    if (done) return setDone(false);
    if (idx > 0) {
      setIdx(idx - 1);
      setElapsed(steps[idx - 1].t_seconds);
    }
  }, [done, idx, steps]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === " " && (e.target as HTMLElement)?.tagName !== "BUTTON") {
        e.preventDefault();
        setPaused((p) => !p);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, next, prev, onClose]);

  if (!open || steps.length === 0) return null;

  const step = steps[idx];
  const upcoming = steps[idx + 1];
  const untilNext = upcoming ? upcoming.t_seconds - elapsed : total - elapsed;
  const btn = "min-h-[52px] px-5 rounded-xl border border-line text-ink text-base font-semibold hover:border-muted disabled:opacity-30 transition-colors";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Cooking ${title}`}
      className="fixed inset-0 z-[60] bg-surface-dark text-ink flex flex-col"
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (dx < -60) next();
        else if (dx > 60) prev();
      }}
    >
      {/* Top: clock and close */}
      <div className="flex items-center justify-between gap-4 px-5 pt-5 sm:px-10">
        <div className="min-w-0">
          <p className="font-display font-semibold truncate">{title}</p>
          <p className="text-sm text-muted tabular-nums">
            <span role="timer" aria-label={`Elapsed ${fmtClock(elapsed)}`}>{fmtClock(elapsed)}</span> / {fmtClock(total)}
            {paused && <span className="ml-2 text-spice-300">Paused</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSound((s) => !s)}
            className="p-3 rounded-xl text-muted hover:text-ink"
            aria-label={sound ? "Turn step sound off" : "Turn step sound on"}
            aria-pressed={sound}
          >
            <Icon name={sound ? "volume" : "mute"} className="w-6 h-6" />
          </button>
          <button ref={closeRef} onClick={onClose} className="p-3 rounded-xl text-muted hover:text-ink" aria-label="Close cook mode">
            <Icon name="close" className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="px-5 pt-4 sm:px-10">
        <Timeline steps={steps} prepMinutes={prepMinutes} current={done ? steps.length : idx} showLanes={false} onSelect={(i) => {
          setDone(false);
          setIdx(i);
          setElapsed(steps[i].t_seconds);
        }} />
      </div>

      {/* The step — tap anywhere here for the next one */}
      {done ? (
        <div className="flex-1 flex flex-col justify-center px-6 sm:px-16 max-w-4xl w-full mx-auto" aria-live="polite">
          <p className="font-display text-5xl sm:text-7xl font-bold tracking-tight">Done. Time to eat.</p>
          <p className="mt-4 text-lg text-muted">How did it turn out? It helps the next plan.</p>
          <div className="mt-6">{doneSlot}</div>
        </div>
      ) : (
        <button
          type="button"
          onClick={next}
          className="flex-1 text-left flex flex-col justify-center px-6 sm:px-16 max-w-4xl w-full mx-auto focus:outline-none"
          aria-label="Next step"
        >
          <span className="text-base text-muted tabular-nums">
            Step {idx + 1} of {steps.length}
          </span>
          <span aria-live="polite" className="mt-3 font-display text-3xl sm:text-5xl lg:text-6xl font-semibold leading-tight tracking-tight">
            {step.instruction}
          </span>
          {step.tip && <span className="mt-5 text-lg sm:text-xl text-muted">{step.tip}</span>}
          <span className="mt-8 text-lg tabular-nums text-spice-300">
            {upcoming ? `Next step in ${fmtClock(untilNext)}` : `Last step · about ${fmtClock(untilNext)} to go`}
          </span>
          {upcoming && <span className="mt-1 text-base text-dim line-clamp-1">Then: {upcoming.instruction}</span>}
        </button>
      )}

      {/* Controls */}
      <div className="grid grid-cols-3 gap-3 px-5 pb-6 sm:px-10 sm:pb-8 max-w-4xl w-full mx-auto">
        <button onClick={prev} disabled={idx === 0 && !done} className={btn}>
          Back
        </button>
        {done ? (
          <button onClick={onClose} className={`${btn} col-span-2 bg-ink text-surface-dark border-transparent hover:bg-white`}>
            Back to the plan
          </button>
        ) : (
          <>
            <button onClick={() => setPaused((p) => !p)} className={btn}>
              {paused ? "Resume" : "Pause"}
            </button>
            <button onClick={next} className={`${btn} bg-spice-500 text-spice-950 border-transparent hover:bg-spice-400`}>
              {upcoming ? "Next" : "Finish"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
