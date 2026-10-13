/** One-tap starter combos shown under the ingredient input. */

import type { Preset } from "@/app/components/HomeView";

export const PRESET_POOL: Preset[] = [
  { label: "Maggi and onion", ingredients: ["maggi noodles", "onion"] },
  { label: "Rice and frozen veg", ingredients: ["rice", "frozen peas", "soy sauce"] },
  { label: "Pasta and tinned tomatoes", ingredients: ["pasta", "tinned tomatoes", "garlic"] },
  { label: "Eggs on toast", ingredients: ["egg", "bread"] },
  { label: "Beans on toast", ingredients: ["baked beans", "bread", "butter"] },
  { label: "Ramen and egg", ingredients: ["instant ramen", "egg", "spring onions"] },
  { label: "Chickpea stir-fry", ingredients: ["tinned chickpeas", "onion", "garlic"] },
  { label: "Omelette", ingredients: ["egg", "cheese", "butter"] },
  { label: "Tuna pasta", ingredients: ["pasta", "tinned tuna", "sweetcorn"] },
  { label: "Lentil soup", ingredients: ["red lentils", "onion", "tinned tomatoes"] },
  { label: "Couscous salad", ingredients: ["couscous", "cucumber", "lemon"] },
  { label: "Cheesy nachos", ingredients: ["tortilla chips", "cheese", "salsa"] },
  { label: "Fried rice", ingredients: ["rice", "egg", "soy sauce"] },
  { label: "Banana pancakes", ingredients: ["banana", "egg", "flour"] },
  { label: "Garlic bread", ingredients: ["bread", "butter", "garlic"] },
  { label: "Quesadilla", ingredients: ["tortilla", "cheese", "peppers"] },
  { label: "Pesto pasta", ingredients: ["pasta", "pesto", "parmesan"] },
  { label: "Stir-fry noodles", ingredients: ["noodles", "soy sauce", "frozen veg"] },
  { label: "Tomato soup", ingredients: ["tinned tomatoes", "onion", "stock cube"] },
  { label: "Jacket potato", ingredients: ["potato", "cheese", "baked beans"] },
  { label: "Sardines on toast", ingredients: ["tinned sardines", "bread", "lemon"] },
  { label: "Dal", ingredients: ["red lentils", "onion", "garlic", "tinned tomatoes"] },
  { label: "Mushroom toast", ingredients: ["mushrooms", "bread", "garlic", "butter"] },
  { label: "Veggie wrap", ingredients: ["tortilla", "lettuce", "cucumber", "hummus"] },
  { label: "Spam and rice", ingredients: ["spam", "rice", "egg"] },
];

export function pickRandomPresets(count: number): Preset[] {
  const shuffled = [...PRESET_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
