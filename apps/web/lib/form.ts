/** The plan request form: state shape, options and their labels. */

import type { FlavourMode, SpiceLevel } from "./types";

export interface FormState {
  ingredients: string[];
  input: string;
  diet: string;
  timeMinutes: number;
  equipment: string[];
  spiceLevel: SpiceLevel;
  flavourMode: FlavourMode;
}

export const DEFAULT_FORM: FormState = {
  ingredients: [],
  input: "",
  diet: "any",
  timeMinutes: 30,
  equipment: ["hob", "pan"],
  spiceLevel: "medium",
  flavourMode: "umami",
};

export const DIETS: { value: string; label: string }[] = [
  { value: "any", label: "Any diet" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "pescatarian", label: "Pescatarian" },
];

export const SPICE_LEVELS: { value: SpiceLevel; label: string }[] = [
  { value: "mild", label: "Mild" },
  { value: "medium", label: "Medium" },
  { value: "hot", label: "Hot" },
];

export const EQUIPMENT_OPTIONS = ["hob", "oven", "microwave", "air fryer", "pan", "wok", "pot"];
export const TIME_OPTIONS = [15, 30, 45, 60];

export const FLAVOUR_MODES: { value: FlavourMode; label: string }[] = [
  { value: "bold_spicy", label: "Bold & spicy" },
  { value: "umami", label: "Savoury & umami" },
  { value: "comfort_rich", label: "Comfort & rich" },
  { value: "bright_fresh", label: "Bright & fresh" },
  { value: "clean_light", label: "Clean & light" },
];

export function flavourLabel(mode?: FlavourMode | null): string | null {
  return mode ? FLAVOUR_MODES.find((f) => f.value === mode)?.label ?? mode : null;
}

/** One line for the home screen: "30 min · Any diet · Savoury & umami · Medium · hob, pan". */
export function prefsSummary(f: FormState): string {
  const diet = DIETS.find((d) => d.value === f.diet)?.label ?? f.diet;
  const spice = SPICE_LEVELS.find((s) => s.value === f.spiceLevel)?.label ?? f.spiceLevel;
  const kit = f.equipment.length ? f.equipment.join(", ") : "any equipment";
  return [`${f.timeMinutes} min`, diet, flavourLabel(f.flavourMode), `${spice} heat`, kit].join(" · ");
}
