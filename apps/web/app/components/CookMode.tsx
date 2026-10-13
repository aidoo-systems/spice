"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Step } from "@/lib/types";
import { fmtTime } from "@/lib/plan";

function playDing() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 800;
    gain.gain.value = 0.3;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.stop(ctx.currentTime + 0.15);
  } catch {
    // Audio not available — silently ignore
  }
}

interface CookModeProps {
  steps: Step[];
  active: boolean;
  onActiveChange: (active: boolean) => void;
  /** Called once when the timer runs to the end — counts as a real cook. */
  onFinish?: () => void;
}

export default function CookMode({ steps, active, onActiveChange, onFinish }: CookModeProps) {
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const [largeText, setLargeText] = useState(false);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevStepIdx = useRef(0);

  const totalTime = steps.length > 0 ? steps[steps.length - 1].t_seconds + 60 : 0;

  // Load large text preference
  useEffect(() => {
    setLargeText(localStorage.getItem("spice-large-text") === "true");
  }, []);

  const stop = useCallback(() => {
    if (interval.current) clearInterval(interval.current);
    interval.current = null;
  }, []);

  // Reset state when cook mode is activated
  useEffect(() => {
    if (active) {
      setElapsed(0);
      setPaused(false);
      prevStepIdx.current = 0;
    }
  }, [active]);

  useEffect(() => {
    if (active && !paused) {
      interval.current = setInterval(() => {
        setElapsed((e) => {
          if (e >= totalTime) {
            stop();
            return e;
          }
          return e + 1;
        });
      }, 1000);
    } else {
      stop();
    }
    return stop;
  }, [active, paused, totalTime, stop]);

  // Find current step index
  let currentIdx = 0;
  for (let i = steps.length - 1; i >= 0; i--) {
    if (elapsed >= steps[i].t_seconds) {
      currentIdx = i;
      break;
    }
  }

  // Play ding on step change
  useEffect(() => {
    if (active && !muted && currentIdx !== prevStepIdx.current) {
      playDing();
    }
    prevStepIdx.current = currentIdx;
  }, [currentIdx, active, muted]);

  const done = active && totalTime > 0 && elapsed >= totalTime;
  useEffect(() => {
    if (done) onFinish?.();
  }, [done, onFinish]);

  function skipToNextStep() {
    if (currentIdx < steps.length - 1) {
      setElapsed(steps[currentIdx + 1].t_seconds);
    }
  }

  function toggleLargeText() {
    const next = !largeText;
    setLargeText(next);
    localStorage.setItem("spice-large-text", String(next));
  }

  const textSize = largeText ? "text-base sm:text-lg" : "text-sm";

  if (!active) {
    return (
      <button
        onClick={() => onActiveChange(true)}
        className="w-full flex items-center justify-center gap-2 bg-stone-900 text-surface dark:bg-ink dark:text-surface-dark hover:bg-black dark:hover:bg-white py-3 rounded-lg text-base font-semibold transition-all duration-150"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Start cooking
      </button>
    );
  }

  return (
    <div className="border border-stone-200 dark:border-line rounded-xl p-4 bg-white dark:bg-surface-dark-card">
      {/* Timer header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <span role="timer" aria-label={`Elapsed time: ${fmtTime(elapsed)}`} className="text-2xl font-mono font-bold text-spice-600 dark:text-spice-400">
            {fmtTime(elapsed)}
          </span>
          <span className="text-sm text-stone-500 dark:text-muted">/ {fmtTime(totalTime)}</span>
          <span className="text-xs text-stone-500 dark:text-muted font-medium">
            Step {currentIdx + 1}/{steps.length}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Audio toggle */}
          <button
            onClick={() => setMuted(!muted)}
            aria-label={muted ? "Unmute step notifications" : "Mute step notifications"}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-line hover:bg-stone-100 dark:hover:bg-white/5 transition-colors duration-150 min-h-[36px]"
          >
            {muted ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            )}
          </button>
          {/* Large text toggle */}
          <button
            onClick={toggleLargeText}
            aria-label={largeText ? "Normal text size" : "Large text size"}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-line hover:bg-stone-100 dark:hover:bg-white/5 transition-colors duration-150 min-h-[36px] font-bold"
          >
            {largeText ? "A" : "A+"}
          </button>
          {/* Skip */}
          {!done && currentIdx < steps.length - 1 && (
            <button
              onClick={skipToNextStep}
              className="text-xs px-3 py-1.5 rounded-lg border border-stone-200 dark:border-line hover:bg-stone-100 dark:hover:bg-white/5 transition-colors duration-150 min-h-[36px]"
            >
              Skip
            </button>
          )}
          {!done && (
            <button
              onClick={() => setPaused(!paused)}
              className="text-xs px-3 py-1.5 rounded-lg border border-stone-200 dark:border-line hover:bg-stone-100 dark:hover:bg-white/5 transition-colors duration-150 min-h-[36px]"
            >
              {paused ? "Resume" : "Pause"}
            </button>
          )}
          <button
            onClick={() => {
              stop();
              onActiveChange(false);
              setElapsed(0);
              setPaused(false);
            }}
            className="text-xs px-3 py-1.5 rounded-lg border border-stone-200 dark:border-line hover:bg-stone-100 dark:hover:bg-white/5 transition-colors duration-150 min-h-[36px]"
          >
            Stop
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-stone-100 dark:bg-white/10 rounded-full mb-4 overflow-hidden">
        <div
          className="h-full bg-spice-500 rounded-full transition-all duration-1000"
          style={{ width: `${Math.min((elapsed / totalTime) * 100, 100)}%` }}
        />
      </div>

      {/* Steps timeline */}
      <ol className="space-y-3">
        {steps.map((step, i) => {
          const isCurrent = i === currentIdx && !done;
          const isPast = elapsed > step.t_seconds && !isCurrent;
          return (
            <li
              key={i}
              className={`flex gap-3 p-2 rounded-lg transition-colors ${
                isCurrent
                  ? "bg-spice-50 dark:bg-spice-950/30 border border-spice-200 dark:border-spice-800/60"
                  : isPast
                  ? "opacity-50"
                  : ""
              }`}
            >
              <span className={`font-mono min-w-[3.5rem] pt-0.5 ${textSize} ${isCurrent ? "text-spice-600 dark:text-spice-400" : "text-spice-600 dark:text-spice-400"}`}>
                {fmtTime(step.t_seconds)}
              </span>
              <div className="flex-1">
                <span className={`${isCurrent ? "font-medium" : ""} ${textSize}`}>
                  {step.instruction}
                </span>
                {step.tip && (
                  <p className={`text-stone-500 dark:text-muted mt-0.5 ${largeText ? "text-sm" : "text-xs"}`}>{step.tip}</p>
                )}
              </div>
              {isCurrent && (
                <span className="text-spice-500 dark:text-spice-400 text-xs font-bold self-center motion-safe:animate-pulse">
                  NOW
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {done && (
        <p className="text-center text-green-600 dark:text-green-400 font-medium mt-4">
          Done! Time to eat.
        </p>
      )}
    </div>
  );
}
