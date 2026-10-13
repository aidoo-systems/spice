/** A plan shown on the home screen so visitors see what SPICE makes before typing. */

import type { SuggestResponse } from "./types";

export const SAMPLE_INGREDIENTS = ["rice", "eggs", "spring onions", "soy sauce", "garlic"];

export const SAMPLE_PLAN: SuggestResponse = {
  title: "Crispy garlic egg fried rice",
  prep_time_minutes: 15,
  calories_estimate: 480,
  flavour_mode: "umami",
  steps: [
    { t_seconds: 0, instruction: "Slice the spring onions, keeping whites and greens apart. Mince 2 garlic cloves.", tip: "Prep everything first: this moves fast.", uses: ["spring onions", "garlic"] },
    { t_seconds: 120, instruction: "Heat 1 tbsp oil in a pan on high until it shimmers.", tip: null, uses: ["oil"] },
    { t_seconds: 180, instruction: "Scramble 2 eggs until just set, then tip them out onto a plate.", tip: "Slightly underdone is right; they finish later.", uses: ["eggs"] },
    { t_seconds: 300, instruction: "Fry the garlic and spring onion whites for 30 seconds.", tip: null, uses: ["garlic", "spring onions"] },
    { t_seconds: 360, instruction: "Add the rice, press it flat and leave it for 2 minutes to crisp, then toss.", tip: "Day-old rice crisps best.", uses: ["rice"] },
    { t_seconds: 600, instruction: "Splash in 1½ tbsp soy sauce around the edge of the pan and toss.", tip: null, uses: ["soy sauce", "rice"] },
    { t_seconds: 720, instruction: "Fold the eggs back in, top with the greens and serve.", tip: null, uses: ["eggs", "spring onions"] },
  ],
  why_this_works: [
    "Leaving the rice alone in a hot pan gives you crispy bits, which is most of the flavour.",
    "Soy sauce hits the hot metal first, so it caramelises instead of steaming.",
    "Eggs go back in at the end, so they stay soft.",
  ],
  upgrade_ladder: {
    pantry_upgrade: [],
    if_you_have: [{ requires: "sesame oil", why: "Nutty and toasty", how: "A few drops right at the end." }],
    one_pound_shop: { requires: "frozen peas", why: "Sweetness and colour", how: "Straight from frozen with the rice." },
  },
  minimal_rescue: null,
  pantry_used: [],
  notes: [],
  safety: { assumptions: [], missing_ingredients: [], disclaimer: "" },
  adjustments: [],
  community: null,
  meta: null,
};
