"use client";

import type { RefObject } from "react";
import type { FlavourMode, SpiceLevel } from "@/lib/types";
import IngredientAutocomplete from "./IngredientAutocomplete";
import { Card, Pill, SectionHeader } from "./ui";

export const DIETS = ["any", "vegetarian", "vegan", "pescatarian"];
export const SPICE_LEVELS: SpiceLevel[] = ["mild", "medium", "hot"];
export const EQUIPMENT_OPTIONS = ["hob", "oven", "microwave", "air fryer", "pan", "wok", "pot"];
export const TIME_OPTIONS = [15, 30, 45, 60];

export const FLAVOUR_MODES: { value: FlavourMode; label: string }[] = [
  { value: "bold_spicy", label: "Bold & Spicy" },
  { value: "umami", label: "Savoury & Umami" },
  { value: "comfort_rich", label: "Comfort & Rich" },
  { value: "bright_fresh", label: "Bright & Fresh" },
  { value: "clean_light", label: "Clean & Light" },
];

export interface Preset {
  label: string;
  ingredients: string[];
}

export interface FormState {
  ingredients: string[];
  input: string;
  diet: string;
  timeMinutes: number;
  equipment: string[];
  spiceLevel: SpiceLevel;
  flavourMode: FlavourMode;
}

interface Props {
  form: FormState;
  update: (patch: Partial<FormState>) => void;
  presets: Preset[];
  busy: boolean;
  busyLabel: string;
  collapsed: boolean;
  /** Ingredients of the plan currently on screen (collapsed summary). */
  planIngredients: string[];
  onGenerate: (ingredients?: string[]) => void;
  onRegenerate: () => void;
  onChallenge: () => void;
  onClear: () => void;
  onExpand: () => void;
  refs: {
    ingredients: RefObject<HTMLDivElement | null>;
    presets: RefObject<HTMLDivElement | null>;
    preferences: RefObject<HTMLDivElement | null>;
    generate: RefObject<HTMLButtonElement | null>;
  };
}

const label = "block text-[11px] font-medium uppercase tracking-wide text-stone-500 dark:text-[rgba(245,245,245,0.6)] mb-1.5";
const select = "w-full border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-surface-dark-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50";

export default function InputsPanel({
  form, update, presets, busy, busyLabel, collapsed, planIngredients,
  onGenerate, onRegenerate, onChallenge, onClear, onExpand, refs,
}: Props) {
  function addIngredient(value?: string) {
    const trimmed = (value || form.input).trim().toLowerCase().slice(0, 60);
    const patch: Partial<FormState> = {};
    if (trimmed && !form.ingredients.includes(trimmed)) patch.ingredients = [...form.ingredients, trimmed];
    if (!value) patch.input = "";
    update(patch);
  }

  function toggleEquipment(item: string) {
    update({
      equipment: form.equipment.includes(item) ? form.equipment.filter((e) => e !== item) : [...form.equipment, item],
    });
  }

  if (collapsed) {
    return (
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-stone-500 dark:text-[rgba(245,245,245,0.65)] mb-2">Cooking with</h3>
            <div className="flex flex-wrap gap-1.5">
              {planIngredients.map((item) => (
                <span key={item} className="bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 px-2.5 py-0.5 rounded-full text-xs">
                  {item}
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={onExpand}
            className="shrink-0 text-xs px-3 py-1.5 rounded-lg border border-stone-300/70 dark:border-white/10 text-stone-600 dark:text-[rgba(245,245,245,0.7)] hover:border-amber-400/60 hover:text-amber-700 dark:hover:text-amber-300 transition-colors min-h-[36px]"
          >
            Edit
          </button>
        </div>
        <button
          onClick={onRegenerate}
          disabled={busy}
          className="w-full mt-3 py-2.5 rounded-lg text-sm font-semibold border border-stone-300/70 dark:border-white/10 text-stone-700 dark:text-[#F5F5F5] hover:border-amber-400/60 hover:text-amber-700 dark:hover:text-amber-300 disabled:opacity-60 transition-colors"
        >
          {busy ? busyLabel : "↻ Try a different dish"}
        </button>
      </Card>
    );
  }

  return (
    <>
      <div ref={refs.ingredients}>
        <Card>
          <SectionHeader>Ingredients you have</SectionHeader>
          <div className="flex gap-2">
            <IngredientAutocomplete value={form.input} onChange={(input) => update({ input })} onSelect={addIngredient} />
            <button
              onClick={() => addIngredient()}
              className="bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-amber-600 active:scale-[0.98] transition-all duration-150 shadow-sm shadow-amber-500/25"
            >
              Add
            </button>
          </div>

          {form.ingredients.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {form.ingredients.map((item) => (
                <span key={item} className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 px-2.5 py-0.5 rounded-full text-xs flex items-center gap-1">
                  {item}
                  <button
                    onClick={() => update({ ingredients: form.ingredients.filter((i) => i !== item) })}
                    aria-label={`Remove ${item}`}
                    className="text-amber-600 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-100 ml-0.5"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* One tap: presets fill the list and cook straight away. */}
          <div ref={refs.presets} className="mt-3 pt-3 border-t border-stone-100 dark:border-white/5">
            <p className="text-[11px] text-stone-400 dark:text-[rgba(245,245,245,0.45)] mb-1.5">Or try one in a tap:</p>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((p) => (
                <Pill key={p.label} disabled={busy} onClick={() => { update({ ingredients: p.ingredients }); onGenerate(p.ingredients); }}>
                  {p.label}
                </Pill>
              ))}
              <Pill accent disabled={busy} onClick={onChallenge}>Budget Challenge</Pill>
              {form.ingredients.length > 0 && <Pill onClick={onClear}>Clear</Pill>}
            </div>
          </div>
        </Card>
      </div>

      <div ref={refs.preferences}>
        <Card>
          <SectionHeader>Flavour &amp; Preferences</SectionHeader>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {FLAVOUR_MODES.map((fm) => (
              <Pill key={fm.value} active={form.flavourMode === fm.value} onClick={() => update({ flavourMode: fm.value })}>
                {fm.label}
              </Pill>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="diet" className={label}>Diet</label>
              <select id="diet" value={form.diet} onChange={(e) => update({ diet: e.target.value })} className={select}>
                {DIETS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <span className={label}>Time</span>
              <div className="flex flex-wrap gap-1.5">
                {TIME_OPTIONS.map((t) => (
                  <Pill key={t} active={form.timeMinutes === t} onClick={() => update({ timeMinutes: t })}>{t} min</Pill>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="spice" className={label}>Spice level</label>
              <select id="spice" value={form.spiceLevel} onChange={(e) => update({ spiceLevel: e.target.value as SpiceLevel })} className={select}>
                {SPICE_LEVELS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <span className={label}>Equipment</span>
              <div className="flex flex-wrap gap-1.5">
                {EQUIPMENT_OPTIONS.map((eq) => (
                  <Pill key={eq} active={form.equipment.includes(eq)} onClick={() => toggleEquipment(eq)}>{eq}</Pill>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Submit (desktop; mobile uses the sticky bar) */}
      <button
        onClick={() => onGenerate()}
        disabled={busy}
        ref={refs.generate}
        className="hidden lg:block w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white py-3.5 rounded-xl text-sm font-bold tracking-wide hover:from-amber-400 hover:to-orange-500 active:scale-[0.99] disabled:opacity-60 disabled:active:scale-100 transition-all duration-150 shadow-lg shadow-orange-600/25"
      >
        {busy ? busyLabel : "What can I make?"}
      </button>
    </>
  );
}
