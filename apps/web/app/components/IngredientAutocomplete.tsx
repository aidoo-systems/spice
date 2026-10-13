"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { INGREDIENTS } from "@/lib/ingredients";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSelect: (ingredient: string) => void;
}

export default function IngredientAutocomplete({ value, onChange, onSelect }: Props) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Filter suggestions when input changes
  useEffect(() => {
    if (value.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    const lower = value.toLowerCase();
    const matches = INGREDIENTS.filter((item) => item.includes(lower)).slice(0, 8);
    setSuggestions(matches);
    setOpen(matches.length > 0);
    setHighlightIdx(-1);
  }, [value]);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selectItem = useCallback(
    (item: string) => {
      onSelect(item);
      onChange("");
      setOpen(false);
    },
    [onSelect, onChange]
  );

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || suggestions.length === 0) {
      if (e.key === "Enter") {
        e.preventDefault();
        if (value.trim()) {
          onSelect(value.trim().toLowerCase());
          onChange("");
        }
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightIdx((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightIdx((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightIdx >= 0) {
          selectItem(suggestions[highlightIdx]);
        } else if (value.trim()) {
          onSelect(value.trim().toLowerCase());
          onChange("");
          setOpen(false);
        }
        break;
      case "Escape":
        setOpen(false);
        break;
    }
  }

  return (
    <div ref={wrapperRef} className="relative flex-1">
      <input
        className="w-full border border-stone-300 dark:border-line bg-white dark:bg-surface-dark-input rounded-xl px-4 py-3 text-base placeholder:text-stone-400 dark:placeholder:text-dim focus:outline-none focus:border-stone-500 dark:focus:border-muted"
        placeholder="Add an ingredient, e.g. eggs"
        aria-label="Add an ingredient"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (suggestions.length > 0) setOpen(true);
        }}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-activedescendant={highlightIdx >= 0 ? `suggestion-${highlightIdx}` : undefined}
      />
      {open && suggestions.length > 0 && (
        <ul
          className="absolute z-10 top-full left-0 right-0 mt-1 bg-white dark:bg-surface-dark-input border border-stone-300 dark:border-line rounded-xl overflow-hidden"
          role="listbox"
        >
          {suggestions.map((item, i) => (
            <li
              key={item}
              id={`suggestion-${i}`}
              role="option"
              aria-selected={i === highlightIdx}
              className={`px-4 py-2.5 text-base cursor-pointer ${
                i === highlightIdx ? "bg-stone-100 dark:bg-white/10" : "text-stone-700 dark:text-muted"
              }`}
              onMouseDown={() => selectItem(item)}
              onMouseEnter={() => setHighlightIdx(i)}
            >
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
