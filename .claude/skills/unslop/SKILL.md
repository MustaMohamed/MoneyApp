---
name: unslop
description: The MoneyApp output contract. Mandatory for all composed output — chat replies, agent returns, reviews, plans, specs, records, PR and issue text. Budgets, document rules, and the AI-tell catalog. Load at session start. Must always apply.
---

# Unslop — the output contract

Owned by MoneyApp since 2026-08-25; no longer synced from cursor/plugins. The word-level catalog came from there. The budgets and document rules are ours, measured on MA-001 → MA-020: 213k words of records at a 2,685-word mean per reported defect, against the corpus best of 391 words (MA-005.md:440-474, a reproduced defect with file:line, failing scenario, probe output and fix). The good writing already exists in this repo. Match it.

**Scope.** Everything composed for a reader: chat replies, subagent returns, review records, plans, specs, PR bodies, issue text, commit messages. Code and config files match their surroundings instead.

## Budgets

Words. Ceilings, not targets.

| Artifact | Budget | Past it |
|---|---|---|
| Chat reply | 150 | Only when the reader asked for the reasoning |
| Subagent return | 300 | Write a file, return the path |
| One review finding | 400 | It is two findings |
| One review round | 800 | The task is too big. Split it |
| Plan | 2,000 | It is a spec. Split the task |
| Spec | 3,000 | Split the scope |

## Document rules

1. **Lead with the answer.** A direct question gets its answer in the first sentence and may end there.
2. **Evidence, not defence of evidence.** Write `resolveAccountRowAmount — 14 sites`. Never "measured rather than assumed", "not inferred", "confirmed rather than asserted", "measured, not read". If a number needs defending, the defence is the command, in backticks, on the same line. Self-check: `grep -roE "rather than assumed|rather than inferred|not inferred|not assumed" docs/scopes/ | wc -l` — baseline 36; it must not grow.
3. **Negative results are one line.** `class 3 money drift — absent: grep -rn formatAmount src/modules/onboarding returns nothing`. No preamble about why the absence is worth reporting.
4. **Never narrate the search.** Not "I expected X and went looking for it", not "Recording that because", not "What I checked and found clean" as a heading over a page of prose.
5. **Say a fact once per artifact, and once per head.** A known-gotcha CI failure is derived once per SHA, not once per round. A round on an unchanged head repeats nothing: `head unchanged at <sha> — see round N`.
6. **No-finding sections get one line, not a heading.** `drift · membership · escapes — clean`. Headings are for categories that found something.
7. **Cut:** restating the request, narrating tool calls, re-explaining what was already said, process commentary, and any sentence whose job is to show that work was done.

## Process

1. Scan for the patterns below.
2. Rewrite. Preserve meaning, match intended tone.
3. Self-audit: "What makes this obviously AI generated?" Fix remaining tells.
4. For human-facing prose only (docs, announcements, articles): add soul — have opinions, vary rhythm, use "I" when it fits, be specific. Engineering records get density, not personality.

## Patterns to detect and fix

### Content

1. **Puffery.** "pivotal moment", "testament to", "evolving landscape", "setting the stage for", "indelible mark", "deeply rooted". Cut puffery, state what happened.
2. **Name-dropping.** Listing media outlets without context. Pick one, say what was said.
3. **Superficial -ing phrases.** "highlighting...", "ensuring...", "reflecting...", "showcasing...", "fostering...". Delete or expand with real sources.
4. **Promotional language.** "nestled", "vibrant", "breathtaking", "groundbreaking", "renowned", "stunning", "must-visit". Use neutral descriptions.
5. **Vague attributions.** "Experts believe", "Industry reports suggest", "Some critics argue". Name the source or delete.
6. **Formulaic challenges.** "Despite challenges... continues to thrive." Replace with specific facts.

### Language

7. **AI vocabulary.** Additionally, crucial, delve, enduring, enhance, fostering, garner, interplay, intricate, landscape (abstract), pivotal, showcase, tapestry (abstract), testament, underscore, vibrant. Replace with plain words.
8. **Fancy ways to say "is".** "serves as", "stands as", "boasts", "features". Just say "is" or "has".
9. **"Not just X, but Y."** State the point directly instead. The inverted form is the same tell: "not merely X", "not simply X".
10. **Rule of three.** Forcing ideas into groups of three. Use the natural number.
11. **Synonym cycling.** Protagonist, main character, central figure, hero all in one paragraph. Pick one, repeat it. This includes headings: the same section is not "What I checked" in one round and "What I verified" in the next.
12. **False ranges.** "from X to Y" where X and Y aren't on a meaningful scale. List topics directly.

### Style

13. **Em dash overuse.** Avoid em dashes entirely. Use periods or commas only (no parentheses, no en dashes, no hyphen-as-dash substitutes). If a thought needs separation, end the sentence or use a comma.
14. **Colon overuse.** Colons are fine before a list or example. Not as mid-sentence connectors. Rewrite to let the point stand on its own.
15. **Boldface overuse.** Don't bold every proper noun or acronym.
16. **Inline-header lists.** The tell is a bold label and colon that restates the line: "**Performance:** Performance improved...". Convert those to prose. A bold lead-in that ends in a period, names the item, and is followed by genuinely new detail ("**Schema in TypeScript.** Tables live in one file.") is fine, not a tell.
17. **Title case headings.** Use sentence case.
18. **Decorative emojis.** Remove from headings and bullets.
19. **Curly quotes.** Replace with straight quotes.

### Communication artifacts

20. **Chatbot phrases.** "I hope this helps!", "Let me know if...", "Of course!", "Certainly!", "Found the smoking gun!" Remove.
21. **Cutoff disclaimers.** "While specific details are limited..." Find sources or remove.
22. **Sycophantic tone.** "Great question! You're absolutely right!" Respond directly.

### Filler

23. **Filler phrases.** "In order to" becomes "To". "Due to the fact that" becomes "Because". "It is important to note that" gets deleted.
24. **Excessive hedging.** "could potentially possibly be argued that it might" becomes "may".
25. **Generic conclusions.** "The future looks bright." State specific plans or facts.

### Jargon

26. **Abstract metaphor nouns.** Substrate, wedge, vector, locus, vantage, nexus, bedrock, scaffolding (as metaphor), modality, paradigm, gold-plating, ratchet (as metaphor), evacuate (for moving code), endgame, north star, flywheel. Pick the concrete word. Exempt where they name the actual MoneyApp thing: `primitive` (a HeroUI primitive), `surface` (a compatibility surface), `harness` (the `.claude/` machinery).

### Plain speech

27. **Say what it does, not how it feels.** "the database stays close at hand", "SQL you can read" name a feeling. The fix names the mechanism or a number: "`.toSQL()` returns the exact string sent to the database". If you can't restate it as a concrete instruction, fact, or number, cut it. If the sentence could appear unchanged in another project's docs, it says nothing about this one. Cut it.
28. **Shorten or split dense sentences.** If the reader has to backtrack to parse a sentence, break it in two or drop clauses. One idea per sentence.
29. **Active voice.** Prefer it. Catch "is/are/was/were + past participle" and name the actor: "queries are validated" becomes "the compiler validates queries". Passive is fine only when the actor is unknown or genuinely doesn't matter.
30. **Cut adverbs, or use a stronger verb.** "runs quickly" becomes "is fast" or the number. "significantly improves" becomes the measured delta.
31. **Prefer the plain word.** "utilize" becomes "use", "leverage" becomes "use", "facilitate" becomes "help", "numerous" becomes "many", "in the event that" becomes "if".
