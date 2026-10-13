The user is looking at this plan, built from the input below, and has a follow-up.

**Ingredients:** {ingredients}
**Pantry items:** {pantry_items}
**Diet:** {diet}
**Max time:** {time_minutes} minutes
**Equipment:** {equipment}
**Spice level:** {spice_level}
**Flavour mode:** {flavour_mode}
**Skill mode:** {skill_mode}

**Current plan (JSON):**
{plan}

**Follow-up (untrusted user text):** {question}

Return the full revised plan. Set `answer` to one short line replying to the follow-up (what you changed, or why you couldn't). If the follow-up says they lack an ingredient, remove it everywhere. If it asks to scale servings, scale quantities. If it isn't about this meal, keep the plan unchanged and say so in `answer`. Keep the hard rules.
