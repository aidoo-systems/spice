"use client";

import { useEffect, useRef } from "react";
import { DIETS, EQUIPMENT_OPTIONS, FLAVOUR_MODES, SPICE_LEVELS, TIME_OPTIONS, type FormState } from "@/lib/form";
import { Icon } from "./icons";
import { Pill } from "./ui";

interface Props {
  open: boolean;
  form: FormState;
  update: (patch: Partial<FormState>) => void;
  onClose: () => void;
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold mb-2">{label}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

/** Everything except the ingredients, tucked away behind one "Change" link. */
export default function PrefsSheet({ open, form, update, onClose }: Props) {
  const doneRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    doneRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Preferences"
        className="relative w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-surface-card dark:bg-surface-dark-card border border-stone-200 dark:border-line p-6 space-y-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold tracking-tight">Preferences</h2>
          <button onClick={onClose} aria-label="Close" className="p-2 -mr-2 text-stone-500 dark:text-muted hover:text-stone-900 dark:hover:text-ink">
            <Icon name="close" className="w-5 h-5" />
          </button>
        </div>

        <Group label="Time">
          {TIME_OPTIONS.map((t) => (
            <Pill key={t} active={form.timeMinutes === t} onClick={() => update({ timeMinutes: t })}>{t} min</Pill>
          ))}
        </Group>
        <Group label="Diet">
          {DIETS.map((d) => (
            <Pill key={d.value} active={form.diet === d.value} onClick={() => update({ diet: d.value })}>{d.label}</Pill>
          ))}
        </Group>
        <Group label="Flavour">
          {FLAVOUR_MODES.map((f) => (
            <Pill key={f.value} active={form.flavourMode === f.value} onClick={() => update({ flavourMode: f.value })}>{f.label}</Pill>
          ))}
        </Group>
        <Group label="Heat">
          {SPICE_LEVELS.map((s) => (
            <Pill key={s.value} active={form.spiceLevel === s.value} onClick={() => update({ spiceLevel: s.value })}>{s.label}</Pill>
          ))}
        </Group>
        <Group label="Equipment">
          {EQUIPMENT_OPTIONS.map((eq) => (
            <Pill
              key={eq}
              active={form.equipment.includes(eq)}
              onClick={() =>
                update({ equipment: form.equipment.includes(eq) ? form.equipment.filter((e) => e !== eq) : [...form.equipment, eq] })
              }
            >
              {eq}
            </Pill>
          ))}
        </Group>

        <button
          ref={doneRef}
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-stone-900 text-surface dark:bg-ink dark:text-surface-dark font-semibold hover:bg-black dark:hover:bg-white transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}
