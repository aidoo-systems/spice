"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { markCooked, streamFollowup, streamSuggestion } from "@/lib/api";
import { getPantry, savePantry } from "@/lib/pantry";
import { getFeedback, makeSignature } from "@/lib/feedback";
import { generateChallenge } from "@/lib/challenges";
import { pickRandomPresets } from "@/lib/presets";
import { DEFAULT_FORM, type FormState } from "@/lib/form";
import { normalizePlan } from "@/lib/plan";
import { SAMPLE_INGREDIENTS, SAMPLE_PLAN } from "@/lib/sample";
import type { CommunityStats, SkillMode, SuggestRequest, SuggestResponse } from "@/lib/types";

import TopBar from "./components/TopBar";
import HomeView, { type Preset } from "./components/HomeView";
import PlanView from "./components/PlanView";
import PrefsSheet from "./components/PrefsSheet";
import SettingsPanel, { type ThemeChoice } from "./components/SettingsPanel";
import SavedRecipesPanel from "./components/SavedRecipesPanel";
import AboutDialog from "./components/AboutDialog";
import { AidooWordmark } from "./components/AidooMark";

const THEME_KEY = "spice-theme";
const EMPTY_PLAN = normalizePlan({});

/** Light/dark follows the device unless the person picks one in Settings. */
function useTheme() {
  const [choice, setChoice] = useState<ThemeChoice>("system");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(THEME_KEY);
      if (stored === "light" || stored === "dark") setChoice(stored);
    } catch {
      // storage blocked: follow the device
    }
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = choice === "dark" || (choice === "system" && mq.matches);
      document.documentElement.classList.toggle("dark", dark);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [choice]);

  function set(next: ThemeChoice) {
    setChoice(next);
    try {
      if (next === "system") localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, next);
    } catch {
      // not persisted; still applies for this visit
    }
  }

  return { theme: choice, setTheme: set };
}

const isAbort = (e: unknown) => e instanceof DOMException && e.name === "AbortError";

type View = "home" | "plan";
type Source = "live" | "saved" | "sample";

export default function Home() {
  const { theme, setTheme } = useTheme();
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ── Inputs ──────────────────────────────────────────────────
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const update = useCallback((patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch })), []);
  const [skillMode, setSkillMode] = useState<SkillMode>("beginner");
  const [pantry, setPantry] = useState<string[]>([]);
  const [pantryInput, setPantryInput] = useState("");
  const [presets, setPresets] = useState<Preset[]>([]);

  // ── Panels ──────────────────────────────────────────────────
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [recipesOpen, setRecipesOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);

  // ── Plan ────────────────────────────────────────────────────
  const [view, setView] = useState<View>("home");
  const [source, setSource] = useState<Source>("live");
  const [plan, setPlan] = useState<SuggestResponse | null>(null);
  const [community, setCommunity] = useState<CommunityStats | null>(null);
  /** The request behind the plan on screen; null for saved recipes and the sample. */
  const [lastRequest, setLastRequest] = useState<SuggestRequest | null>(null);
  const [seenTitles, setSeenTitles] = useState<string[]>([]);
  const [history, setHistory] = useState<SuggestResponse[]>([]);
  const [busy, setBusy] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [cooked, setCooked] = useState(false);

  useEffect(() => {
    setPantry(getPantry());
    setPresets(pickRandomPresets(4));
    return () => abortRef.current?.abort();
  }, []);

  // The plan is its own screen, so the phone's back button returns home.
  useEffect(() => {
    const onPop = (e: PopStateEvent) => setView(e.state?.spice === "plan" ? "plan" : "home");
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  function showPlan() {
    if (view !== "plan") window.history.pushState({ spice: "plan" }, "");
    setView("plan");
    window.scrollTo({ top: 0 });
  }

  function goHome() {
    abortRef.current?.abort();
    setBusy(false);
    setStreaming(false);
    if (window.history.state?.spice === "plan") window.history.back();
    else setView("home");
    window.scrollTo({ top: 0 });
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
    onDone: (final: SuggestResponse) => void,
    { keepCommunity = false, previous = plan, onError }: { keepCommunity?: boolean; previous?: SuggestResponse | null; onError?: () => void } = {},
  ) {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    const previousCommunity = community;

    setBusy(true);
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
      onDone(final);
      setTimeout(() => headingRef.current?.focus({ preventScroll: true }), 50);
    } catch (e) {
      if (isAbort(e)) return;
      setPlan(previous);
      setCommunity(previousCommunity);
      onError?.();
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
      toast.error("Add at least one ingredient first.");
      return;
    }
    const req = buildRequest(ingredients, timeMinutes);
    const from = view;
    const previous = from === "plan" ? plan : null;
    setPlan(null);
    setHistory([]);
    setSource("live");
    showPlan();
    run(
      (h) => streamSuggestion(req, h),
      (final) => {
        setLastRequest(req);
        setSeenTitles(final.title ? [final.title] : []);
      },
      { previous, onError: () => from === "home" && goHome() },
    );
  }

  function regenerate() {
    if (!lastRequest) return;
    const req: SuggestRequest = {
      ...lastRequest,
      feedback_history: getFeedback(makeSignature(lastRequest.ingredients, lastRequest.constraints?.flavour_mode)),
      variation: (lastRequest.variation ?? 0) + 1,
      avoid_titles: seenTitles.slice(-5),
    };
    setHistory([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
    window.scrollTo({ top: 0, behavior: "smooth" });
    run(
      (h) => streamFollowup({ request: lastRequest, plan: { ...current, meta: null, community: null }, question }, h),
      () => setHistory((hist) => [...hist, current].slice(-10)),
      { keepCommunity: true },
    );
  }

  function undo() {
    const prev = history[history.length - 1];
    if (!prev) return;
    setHistory((h) => h.slice(0, -1));
    setPlan(prev);
  }

  function openStatic(p: SuggestResponse, from: Source) {
    abortRef.current?.abort();
    setPlan(p);
    setCommunity(p.community ?? null);
    setLastRequest(null);
    setHistory([]);
    setCooked(false);
    setSource(from);
    showPlan();
  }

  const signature = lastRequest
    ? makeSignature(lastRequest.ingredients, lastRequest.constraints?.flavour_mode)
    : makeSignature(form.ingredients, form.flavourMode);

  const onCooked = useCallback(() => {
    if (cooked) return;
    setCooked(true);
    if (!lastRequest) return;
    toast.success("Nice. Logged as cooked.");
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

  const fromIngredients = source === "sample" ? SAMPLE_INGREDIENTS : lastRequest?.ingredients ?? (busy ? form.ingredients : []);

  return (
    <>
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 bg-spice-500 text-spice-950 px-3 py-2 rounded-lg">
          Skip to content
        </a>

        <TopBar
          onHome={goHome}
          onOpenRecipes={() => setRecipesOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
          settingsButtonRef={settingsButtonRef}
        />

        <main id="main" className="pb-8">
          {view === "home" ? (
            <HomeView
              form={form}
              update={update}
              presets={presets}
              busy={busy}
              onGenerate={(ings) => generate(ings)}
              onSurprise={() => {
                const c = generateChallenge();
                update({ ingredients: c.ingredients, timeMinutes: c.time_minutes });
                generate(c.ingredients, c.time_minutes);
              }}
              onOpenPrefs={() => setPrefsOpen(true)}
              onOpenSample={() => openStatic(SAMPLE_PLAN, "sample")}
            />
          ) : (
            <PlanView
              plan={plan ?? EMPTY_PLAN}
              streaming={streaming || (busy && !plan)}
              busy={busy}
              fromIngredients={fromIngredients}
              community={community}
              onCommunityUpdate={setCommunity}
              signature={signature}
              cooked={cooked}
              onCooked={onCooked}
              headingRef={headingRef}
              canFollowup={!!lastRequest}
              onAsk={ask}
              onRegenerate={regenerate}
              canUndo={history.length > 0}
              onUndo={undo}
              onBack={goHome}
              kicker={source === "sample" ? "A plan we made earlier" : source === "saved" ? "Saved plan" : undefined}
            />
          )}
        </main>

        <footer className="mt-12 py-6 border-t border-stone-200 dark:border-line flex flex-wrap items-center justify-between gap-3 text-sm text-stone-600 dark:text-muted">
          <span>
            Made by{" "}
            <a href="https://aidoo.biz" target="_blank" rel="noopener noreferrer" className="text-stone-900 dark:text-ink hover:opacity-80">
              <AidooWordmark />
            </a>
          </span>
          <nav className="flex flex-wrap gap-x-4 gap-y-1">
            <button onClick={() => setAboutOpen(true)} className="underline underline-offset-4 hover:text-stone-900 dark:hover:text-ink">
              About SPICE
            </button>
            <a href="https://aidoo.biz/privacy-spice/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-stone-900 dark:hover:text-ink">
              Privacy
            </a>
            <a href="mailto:hello@aidoo.biz?subject=SPICE%20feedback" className="underline underline-offset-4 hover:text-stone-900 dark:hover:text-ink">
              Feedback
            </a>
          </nav>
        </footer>
      </div>

      <PrefsSheet open={prefsOpen} form={form} update={update} onClose={() => setPrefsOpen(false)} />

      <SavedRecipesPanel open={recipesOpen} onClose={() => setRecipesOpen(false)} onLoad={(r) => openStatic(r, "saved")} />

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        theme={theme}
        onThemeChange={setTheme}
        pantry={pantry}
        pantryInput={pantryInput}
        onPantryInputChange={setPantryInput}
        onAddPantryItem={addPantryItem}
        onRemovePantryItem={removePantryItem}
        skillMode={skillMode}
        onSkillModeChange={setSkillMode}
      />

      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </>
  );
}
