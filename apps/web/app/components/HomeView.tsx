"use client";

import type { FormState } from "@/lib/form";
import { prefsSummary } from "@/lib/form";
import { SAMPLE_INGREDIENTS, SAMPLE_PLAN } from "@/lib/sample";
import IngredientAutocomplete from "./IngredientAutocomplete";
import Timeline from "./Timeline";
import { Icon } from "./icons";
import { Pill } from "./ui";

export interface Preset {
  label: string;
  ingredients: string[];
}

interface Props {
  form: FormState;
  update: (patch: Partial<FormState>) => void;
  presets: Preset[];
  busy: boolean;
  onGenerate: (ingredients?: string[]) => void;
  onSurprise: () => void;
  onOpenPrefs: () => void;
  onOpenSample: () => void;
}

export default function HomeView({ form, update, presets, busy, onGenerate, onSurprise, onOpenPrefs, onOpenSample }: Props) {
  function addIngredient(value?: string) {
    const trimmed = (value || form.input).trim().toLowerCase().slice(0, 60);
    const patch: Partial<FormState> = {};
    if (trimmed && !form.ingredients.includes(trimmed)) patch.ingredients = [...form.ingredients, trimmed];
    if (!value) patch.input = "";
    update(patch);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <section className="pt-6 sm:pt-14">
        <h2 className="font-display text-4xl sm:text-6xl font-bold tracking-tight leading-[1.02]">
          What&rsquo;s in your kitchen?
        </h2>
        <p className="mt-4 text-lg text-stone-600 dark:text-muted max-w-xl">
          Tell SPICE what you&rsquo;ve got. It plans a meal you can cook tonight, with timings and a cook mode that
          talks you through it.
        </p>

        <form
          className="mt-8 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            addIngredient();
          }}
        >
          <IngredientAutocomplete value={form.input} onChange={(input) => update({ input })} onSelect={addIngredient} />
          <button
            type="submit"
            aria-label="Add ingredient"
            className="px-4 rounded-xl border border-stone-300 dark:border-line hover:border-stone-500 dark:hover:border-muted transition-colors"
          >
            <Icon name="plus" className="w-5 h-5" />
          </button>
        </form>

        {form.ingredients.length > 0 && (
          <ul className="flex flex-wrap gap-2 mt-3" aria-label="Your ingredients">
            {form.ingredients.map((item) => (
              <li key={item} className="inline-flex items-center gap-1 pl-3 pr-1 py-1 rounded-lg bg-stone-200/70 dark:bg-white/10 text-base">
                {item}
                <button
                  onClick={() => update({ ingredients: form.ingredients.filter((i) => i !== item) })}
                  aria-label={`Remove ${item}`}
                  className="w-7 h-7 grid place-items-center rounded-md text-stone-500 dark:text-muted hover:text-stone-900 dark:hover:text-ink"
                >
                  <Icon name="close" className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-5 text-sm text-stone-600 dark:text-muted">
          {prefsSummary(form)}{" "}
          <button onClick={onOpenPrefs} className="ml-1 underline underline-offset-4 text-stone-900 dark:text-ink hover:opacity-80">
            Change
          </button>
        </p>

        <button
          onClick={() => onGenerate()}
          disabled={busy}
          className="mt-6 w-full py-4 rounded-2xl bg-spice-500 text-spice-950 text-lg font-semibold hover:bg-spice-400 disabled:opacity-60 transition-colors"
        >
          What can I make?
        </button>

        <div className="mt-6">
          <p className="text-sm text-stone-500 dark:text-dim mb-2">Or start from one of these</p>
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <Pill key={p.label} disabled={busy} onClick={() => { update({ ingredients: p.ingredients }); onGenerate(p.ingredients); }}>
                {p.label}
              </Pill>
            ))}
            <Pill accent disabled={busy} onClick={onSurprise}>Surprise me: £3, 15 min</Pill>
          </div>
        </div>
      </section>

      {/* Show the output before asking for work */}
      <section className="mt-16 pt-8 border-t border-stone-200 dark:border-line">
        <p className="text-sm text-stone-500 dark:text-dim">Here&rsquo;s one we made earlier</p>
        <div
          onClick={onOpenSample}
          className="mt-3 cursor-pointer rounded-3xl border border-stone-200 dark:border-line bg-surface-card dark:bg-surface-dark-card p-6 hover:border-stone-400 dark:hover:border-muted transition-colors"
        >
          <span className="block text-sm text-stone-500 dark:text-muted">From {SAMPLE_INGREDIENTS.join(", ")}</span>
          <span className="mt-1 block font-display text-2xl sm:text-3xl font-bold tracking-tight">{SAMPLE_PLAN.title}</span>
          <span className="mt-1 block text-sm text-stone-600 dark:text-muted">
            about {SAMPLE_PLAN.prep_time_minutes} min · {SAMPLE_PLAN.steps.length} steps · ~{SAMPLE_PLAN.calories_estimate} kcal
          </span>
          <div className="mt-6">
            <Timeline steps={SAMPLE_PLAN.steps} prepMinutes={SAMPLE_PLAN.prep_time_minutes} />
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenSample();
            }}
            className="mt-5 text-sm font-semibold underline underline-offset-4"
          >
            See the whole plan
          </button>
        </div>
      </section>
    </div>
  );
}
