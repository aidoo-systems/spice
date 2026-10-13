"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { markCooked, streamFollowup, streamSuggestion } from "@/lib/api";
import { getPantry, savePantry } from "@/lib/pantry";
import { getFeedback, makeSignature } from "@/lib/feedback";
import { generateChallenge } from "@/lib/challenges";
import { pickRandomPresets } from "@/lib/presets";
import { LOADING_MESSAGES } from "@/lib/loading-messages";
import type { CommunityStats, SkillMode, SuggestRequest, SuggestResponse } from "@/lib/types";

import TopBar from "./components/TopBar";
import InputsPanel, { type FormState, type Preset } from "./components/InputsPanel";
import ResultView from "./components/ResultView";
import SettingsPanel from "./components/SettingsPanel";
import SavedRecipesPanel from "./components/SavedRecipesPanel";
import SkeletonLoader from "./components/SkeletonLoader";
import AboutDialog from "./components/AboutDialog";
import TutorialOverlay, { type TutorialStep } from "./components/TutorialOverlay";
import LogoIntroOverlay from "./components/LogoIntroOverlay";
import { Icon } from "./components/icons";
import { Card } from "./components/ui";

const INTRO_KEY = "spice-intro-seen";

function useDarkMode() {
  const [dark, setDark] = useState(true);
  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);
  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("spice-theme", next ? "dark" : "light");
  }
  return { dark, toggle };
}

const isAbort = (e: unknown) => e instanceof DOMException && e.name === "AbortError";

export default function Home() {
  const { dark, toggle: toggleDark } = useDarkMode();

  const refs = {
    ingredients: useRef<HTMLDivElement>(null),
    presets: useRef<HTMLDivElement>(null),
    preferences: useRef<HTMLDivElement>(null),
    generate: useRef<HTMLButtonElement>(null),
  };
  const resultsRef = useRef<HTMLDivElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const headerIRef = useRef<HTMLSpanElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ── Inputs ──────────────────────────────────────────────────
  const [form, setForm] = useState<FormState>({
    ingredients: [],
    input: "",
    diet: "any",
    timeMinutes: 30,
    equipment: ["hob", "pan"],
    spiceLevel: "medium",
    flavourMode: "umami",
  });
  const update = useCallback((patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch })), []);
  const [skillMode, setSkillMode] = useState<SkillMode>("beginner");
  const [pantry, setPantry] = useState<string[]>([]);
  const [pantryInput, setPantryInput] = useState("");
  const [presets, setPresets] = useState<Preset[]>([]);

  // ── Panels ──────────────────────────────────────────────────
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [recipesOpen, setRecipesOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [tutorialStepIndex, setTutorialStepIndex] = useState(0);
  const [introOpen, setIntroOpen] = useState(false);

  // ── Result ──────────────────────────────────────────────────
  const [plan, setPlan] = useState<SuggestResponse | null>(null);
  const [community, setCommunity] = useState<CommunityStats | null>(null);
  /** The request behind the plan on screen; null for saved recipes. */
  const [lastRequest, setLastRequest] = useState<SuggestRequest | null>(null);
  const [seenTitles, setSeenTitles] = useState<string[]>([]);
  const [history, setHistory] = useState<SuggestResponse[]>([]);
  const [busy, setBusy] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [cooked, setCooked] = useState(false);
  const [cookModeActive, setCookModeActive] = useState(false);
  const [editingInputs, setEditingInputs] = useState(false);

  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  useEffect(() => {
    if (!busy) return;
    setLoadingMsgIdx(Math.floor(Math.random() * LOADING_MESSAGES.length));
    const t = setInterval(() => setLoadingMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length), 2000);
    return () => clearInterval(t);
  }, [busy]);

  useEffect(() => {
    setPantry(getPantry());
    setPresets(pickRandomPresets(4));
    // The splash plays once per browser; the tour is opt-in (empty state / settings).
    try {
      if (!localStorage.getItem(INTRO_KEY)) setIntroOpen(true);
      else document.documentElement.classList.remove("intro-pending");
    } catch {
      document.documentElement.classList.remove("intro-pending");
    }
    return () => abortRef.current?.abort();
  }, []);

  const tutorialSteps: TutorialStep[] = useMemo(
    () => [
      { id: "ingredients", title: "Add ingredients you have", description: "Type what is in your kitchen and tap Add to build your list.", targetRef: refs.ingredients },
      { id: "presets", title: "Or tap a preset", description: "Presets and the Budget Challenge cook straight away.", targetRef: refs.presets },
      { id: "preferences", title: "Set flavour and preferences", description: "Tune diet, time, spice, and equipment to match your mood.", targetRef: refs.preferences },
      { id: "generate", title: "Generate your plan", description: "Watch SPICE write a step-by-step plan, then ask it to change anything.", targetRef: refs.generate },
      { id: "results", title: "Your plan appears here", description: "Cook Mode, steps, upgrades, and how the plan was checked.", targetRef: resultsRef },
      { id: "pantry", title: "Save pantry staples", description: "Open Settings to save staples so SPICE uses them automatically.", targetRef: settingsButtonRef },
    ],
    [],
  );

  function openTutorial() {
    setTutorialStepIndex(0);
    setTutorialOpen(true);
  }

  function buildRequest(ingredients: string[], timeMinutes = form.timeMinutes): SuggestRequest {
    return {
      ingredients,
      constraints: {
        diet: form.diet === "any" ? undefined : form.diet,
        time_minutes: timeMinutes,
        equipment: form.equipment,
        spice_level: form.spiceLevel,
        flavour_mode: form.flavourMode,
        skill_mode: skillMode,
      },
      pantry_items: pantry,
      feedback_history: getFeedback(makeSignature(ingredients, form.flavourMode)),
    };
  }

  /** Stream a plan in. On failure, put back whatever was on screen before. */
  async function run(
    start: (handlers: { onPartial: (p: SuggestResponse) => void; signal: AbortSignal }) => Promise<SuggestResponse>,
    onDone: (final: SuggestResponse, previous: SuggestResponse | null) => void,
    keepCommunity = false,
  ) {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    const previous = plan;
    const previousCommunity = community;

    setBusy(true);
    setCookModeActive(false);
    setEditingInputs(false);
    if (!keepCommunity) setCommunity(null);

    try {
      const final = await start({
        signal: ac.signal,
        onPartial: (p) => {
          setStreaming(true);
          setPlan(p);
        },
      });
      setPlan(final);
      setCommunity(final.community ?? (keepCommunity ? previousCommunity : null));
      setCooked(false);
      onDone(final, previous);
      setTimeout(() => headingRef.current?.focus(), 50);
    } catch (e) {
      if (isAbort(e)) return;
      setPlan(previous);
      setCommunity(previousCommunity);
      toast.error(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      if (abortRef.current === ac) {
        setBusy(false);
        setStreaming(false);
      }
    }
  }

  function generate(ingredients = form.ingredients, timeMinutes = form.timeMinutes) {
    if (ingredients.length === 0) {
      toast.error("Add at least one ingredient.");
      return;
    }
    const req = buildRequest(ingredients, timeMinutes);
    setPlan(null);
    setHistory([]);
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    run(
      (h) => streamSuggestion(req, h),
      (final) => {
        setLastRequest(req);
        setSeenTitles(final.title ? [final.title] : []);
      },
    );
  }

  function regenerate() {
    if (!lastRequest) return generate();
    const variation = (lastRequest.variation ?? 0) + 1;
    const req: SuggestRequest = {
      ...lastRequest,
      feedback_history: getFeedback(makeSignature(lastRequest.ingredients, lastRequest.constraints?.flavour_mode)),
      variation,
      avoid_titles: seenTitles.slice(-5),
    };
    setHistory([]);
    run(
      (h) => streamSuggestion(req, h),
      (final) => {
        setLastRequest(req);
        setSeenTitles((t) => (final.title ? [...t, final.title] : t));
      },
    );
  }

  function ask(question: string) {
    if (!plan || !lastRequest) return;
    const current = plan;
    run(
      (h) => streamFollowup({ request: lastRequest, plan: { ...current, meta: null, community: null }, question }, h),
      () => setHistory((hist) => [...hist, current].slice(-10)),
      true,
    );
  }

  function undo() {
    const prev = history[history.length - 1];
    if (!prev) return;
    setHistory((h) => h.slice(0, -1));
    setPlan(prev);
  }

  const signature = lastRequest
    ? makeSignature(lastRequest.ingredients, lastRequest.constraints?.flavour_mode)
    : makeSignature(form.ingredients, form.flavourMode);

  const onCooked = useCallback(() => {
    if (cooked || !lastRequest) {
      setCooked(true);
      return;
    }
    setCooked(true);
    toast.success("Nice! Logged as cooked.");
    markCooked(signature).then((r) => {
      if (r) setCommunity((c) => ({ feedback_breakdown: {}, total_feedback: 0, ...c, cooked_count: r.cooked_count }));
    });
  }, [cooked, lastRequest, signature]);

  function addPantryItem() {
    const trimmed = pantryInput.trim().toLowerCase().slice(0, 60);
    if (trimmed && !pantry.includes(trimmed)) {
      const next = [...pantry, trimmed];
      setPantry(next);
      savePantry(next);
    }
    setPantryInput("");
  }

  function removePantryItem(item: string) {
    const next = pantry.filter((i) => i !== item);
    setPantry(next);
    savePantry(next);
  }

  const inputsCollapsed = !!plan && !!lastRequest && !editingInputs;
  const busyLabel = streaming ? "Writing your plan…" : LOADING_MESSAGES[loadingMsgIdx];

  return (
    <>
      <div className="app-shell">
        <main className="max-w-5xl mx-auto px-4 py-6 sm:py-10">
          <a href="#results" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 bg-amber-500 text-white px-3 py-2 rounded-lg">
            Skip to results
          </a>

          <TopBar
            dark={dark}
            onToggleDark={toggleDark}
            onOpenRecipes={() => setRecipesOpen(true)}
            onOpenSettings={() => setSettingsOpen(true)}
            onOpenAbout={() => setAboutOpen(true)}
            settingsButtonRef={settingsButtonRef}
            headerIRef={headerIRef}
          />

          {/* Two columns while composing; a single full-width stack once a plan exists. */}
          <div className={inputsCollapsed ? "space-y-3" : "lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-4 lg:items-start"}>
            <div className={inputsCollapsed ? "" : "space-y-3 lg:sticky lg:top-16"}>
              <InputsPanel
                form={form}
                update={update}
                presets={presets}
                busy={busy}
                busyLabel={busyLabel}
                collapsed={inputsCollapsed}
                planIngredients={lastRequest?.ingredients ?? form.ingredients}
                onGenerate={(ings) => generate(ings)}
                onRegenerate={regenerate}
                onChallenge={() => {
                  const c = generateChallenge();
                  update({ ingredients: c.ingredients, timeMinutes: c.time_minutes });
                  generate(c.ingredients, c.time_minutes);
                }}
                onClear={() => {
                  update({ ingredients: [] });
                  setPlan(null);
                  setLastRequest(null);
                  setCommunity(null);
                }}
                onExpand={() => setEditingInputs(true)}
                refs={refs}
              />
            </div>

            <div className="space-y-3 mt-3 lg:mt-0 scroll-mt-20" id="results" aria-live="polite" ref={resultsRef}>
              {busy && !plan && (
                <Card>
                  <SkeletonLoader />
                </Card>
              )}

              {!busy && !plan && (
                <Card className="animate-fade-in-up">
                  <div className="flex flex-col items-center text-center py-10 px-4">
                    <div className="mb-4 grid place-items-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 shadow-lg shadow-orange-600/25">
                      <Icon name="flame" className="w-7 h-7 text-white" strokeWidth={1.8} />
                    </div>
                    <h3 className="font-display text-lg font-bold text-stone-800 dark:text-[#F5F5F5]">What&rsquo;s in your kitchen?</h3>
                    <p className="text-sm text-stone-500 dark:text-[rgba(245,245,245,0.6)] mt-1.5 max-w-xs">
                      Add a few ingredients or tap a preset. SPICE writes a timed plan using only what you have, then you
                      can ask it to change anything.
                    </p>
                    <button onClick={openTutorial} className="mt-4 text-xs text-amber-700 dark:text-amber-400 underline underline-offset-2 hover:text-amber-800">
                      New here? Take the 30-second tour
                    </button>
                  </div>
                </Card>
              )}

              {plan && (
                <ResultView
                  plan={plan}
                  streaming={streaming}
                  busy={busy}
                  ingredientCount={(lastRequest?.ingredients ?? form.ingredients).length}
                  community={community}
                  onCommunityUpdate={setCommunity}
                  signature={signature}
                  cooked={cooked}
                  onCooked={onCooked}
                  cookModeActive={cookModeActive}
                  onCookModeChange={setCookModeActive}
                  headingRef={headingRef}
                  canFollowup={!!lastRequest}
                  onAsk={ask}
                  canUndo={history.length > 0}
                  onUndo={undo}
                />
              )}
            </div>
          </div>

          <SavedRecipesPanel
            open={recipesOpen}
            onClose={() => setRecipesOpen(false)}
            onLoad={(r) => {
              abortRef.current?.abort();
              setPlan(r);
              setCommunity(r.community ?? null);
              setLastRequest(null);
              setHistory([]);
              setCooked(false);
            }}
          />

          <SettingsPanel
            open={settingsOpen}
            onClose={() => setSettingsOpen(false)}
            onOpenTutorial={() => {
              setSettingsOpen(false);
              openTutorial();
            }}
            pantry={pantry}
            pantryInput={pantryInput}
            onPantryInputChange={setPantryInput}
            onAddPantryItem={addPantryItem}
            onRemovePantryItem={removePantryItem}
            skillMode={skillMode}
            onSkillModeChange={setSkillMode}
          />

          <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />

          <footer className="mt-8 py-4 text-center text-xs text-stone-500 dark:text-[rgba(245,245,245,0.5)] space-x-1">
            <span>
              Built by{" "}
              <a href="https://aidoo.biz" target="_blank" rel="noopener noreferrer" className="underline hover:text-stone-600 dark:hover:text-[rgba(245,245,245,0.6)]">
                ai.doo
              </a>
            </span>
            <span>&middot;</span>
            <button onClick={() => setAboutOpen(true)} className="underline hover:text-stone-600 dark:hover:text-[rgba(245,245,245,0.6)]">
              About this demo
            </button>
            <span>&middot;</span>
            <a href="mailto:hello@aidoo.biz" className="underline hover:text-stone-600 dark:hover:text-[rgba(245,245,245,0.6)]">
              Feedback
            </a>
          </footer>

          {!inputsCollapsed && <div className="h-20 lg:hidden" aria-hidden="true" />}
        </main>

        {/* Sticky mobile CTA */}
        {!inputsCollapsed && (
          <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 px-4 py-3 bg-surface/90 dark:bg-surface-dark/90 backdrop-blur-md border-t border-stone-200/60 dark:border-white/10">
            <button
              onClick={() => generate()}
              disabled={busy}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white py-3 rounded-xl text-sm font-bold tracking-wide disabled:opacity-60 shadow-lg shadow-orange-600/25"
            >
              {busy ? busyLabel : "What can I make?"}
            </button>
          </div>
        )}
      </div>

      <TutorialOverlay
        open={tutorialOpen}
        steps={tutorialSteps}
        stepIndex={tutorialStepIndex}
        onStepChange={setTutorialStepIndex}
        onClose={() => setTutorialOpen(false)}
        onComplete={() => setTutorialOpen(false)}
      />

      <LogoIntroOverlay
        open={introOpen}
        targetRef={headerIRef}
        onComplete={() => {
          try {
            localStorage.setItem(INTRO_KEY, "true");
          } catch {
            // storage blocked — the splash will simply play again
          }
          setIntroOpen(false);
          document.documentElement.classList.remove("intro-pending");
        }}
      />
    </>
  );
}
