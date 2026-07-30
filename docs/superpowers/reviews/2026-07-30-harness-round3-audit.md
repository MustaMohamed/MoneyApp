# Harness audit — round 3 — 2026-07-30

Scope: `CLAUDE.md`, `.claude/{agents,skills,rules,commands}`, `scripts/validate-agent-assets.js`. Method: read every harness file, then verify each of its claims against the codebase rather than against the previous round's notes.

Rounds 1–2 rightsized the harness (removed the 23k-line code harness, cut context 86%, added path-scoped rules and GREEN-tested skills). This round asked a different question: **is what the harness says actually true?** Nine of the findings below are the harness pointing at something that has moved, changed version, or never existed.

## Findings

### A. Broken references — the harness cites artifacts that don't exist

| # | Where | Finding |
|---|---|---|
| A1 | `.claude/rules/state.md:18` | The canonical async-ownership template was cited as `src/modules/dashboard/store/dashboard.store.ts`. Real path: `src/modules/dashboard/screens/dashboard/dashboard.store.ts`. The one "copy this shape" pointer in the state rule was a 404. |
| A2 | `.claude/agents/dev.md:41` | Directed the dev agent to "the *Legacy Zustand store/state shape* section in CLAUDE.md — the single source of truth". No such section exists in CLAUDE.md; the content lives in `.claude/rules/state.md`. Drift introduced when round 1 evicted it. |
| A3 | `.claude/rules/ui.md:16` | Told agents to import `Colors` from `constants/theme_tokens.ts`. That file exports `CoreTokens`/`GoldTokens`/`SemanticTokens`/`InfoTokens`/`AccentTokens`/`AccentCCTokens`/`AcctTokens` — no `Colors`. `Colors` lives in `constants/theme.ts`. Following the rule produced a type error. |
| A4 | `.claude/skills/heroui-native/SKILL.md` | Vendored skill declared `version: 2.0.1`; the project runs **heroui-native 1.0.3**. Its central instruction ("always fetch docs from heroui.com") pointed at a newer major's API surface, while 41 version-exact docs sit unused at `node_modules/heroui-native/src/components/<name>/<name>.md`. Its four documented script invocations (`node scripts/list_components.mjs`) also fail from the repo root. |
| A5 | rules + agents | 23 distinct audit finding IDs are cited (`H11`, `M33`, `L2`, …) and all 23 resolve in the audit doc — but **no harness file names the audit's path**, so every citation was a dead reference for a reader who didn't already know where it lived. |

### B. A verification gate that proves nothing

`dev.md` step 5 mandated `npm run test:coverage` and "ensure thresholds pass" as proof of done. It passes — reporting **100% across the board** — because `collectCoverageFrom` in `jest.config.js` still targets the pre-module tree: `src/screens/**` (now one dev-only file, no stores), `src/app/**/*.store.ts` (zero files), and only 7 entries reaching into `src/modules/`, which holds 313 of the repo's 475 source files. Green here is compatible with zero coverage of everything that matters.

Not fixed in this round: widening `collectCoverageFrom` against a `branches: 100` threshold turns CI red immediately. That is backlog Item 8's job. The harness fix is to stop presenting the gate as evidence.

### C. Path-coverage gaps — rules don't fire where the defects live

| Surface | Files | Was covered by |
|---|---|---|
| `__tests__/**` | 221 | nothing — and test quality is a proven defect class here (M33 vacuous atomicity tests, M35 source-text assertions) |
| `src/modules/**/domain/**`, `money.ts`, `format_amount.ts` | 4 + 11 importers | nothing — the money iron rule had no path trigger |
| `src/repositories/**` | 6 | nothing — omitted from `database.md`'s globs |

Skills load on model judgment; rules load deterministically on file match. The three most defect-dense surfaces relied on judgment alone.

### D. Waste in always-loaded context

- `heroui-native` SKILL.md was 281 lines, ~200 of them upstream instructions for installing HeroUI into a *fresh* Expo app (`npx create-expo-app MyApp`, authoring `global.css`, wrapping providers) — unreachable states for an app that shipped months ago — plus `useThemeColor`/`useUniwind` theming APIs this project never uses.
- `moneyapp-expert-panel`'s description was 938 characters (3.4× the next largest) in the always-resident skill listing, re-listing a roster CLAUDE.md already carries.

### E. Accuracy gaps

- CLAUDE.md: "Every route `index.tsx` is a one-line re-export" — `src/app/index.tsx` is a legitimate 17-line root redirect. Undocumented exception.
- CLAUDE.md structure block omitted `src/screens/` (one surviving legacy file), so an agent had no way to know it exists or that it's frozen.
- `src/constants/theme_tokens.ts`'s own header said "Consumed by tailwind.config.js. Do NOT import from this file in component code" — there is no `tailwind.config.js` (Tailwind v4 is CSS-first) and 51 files import it. The file contradicted both reality and `ui.md`.

### F. Verified sound — no action taken

- **Mechanical rules are being followed without enforcement.** Zero raw `SafeAreaView`, zero `_layout.<x>.ts` siblings (the silent APK-crash trap), zero wrong-source `cn` imports, zero stray files in `src/app/`. A lint hook or PostToolUse guard for these would fire on nothing — the documentation is already working, so none was built.
- All 23 cited audit IDs resolve; the CI parity chain matches `.github/workflows/pr-checks.yml` step for step; the existing validator checks were correct.

## Changes

**Fixed:** A1, A2, A3, A4 (skill rewritten to 1.0.3, local docs made authoritative, wrapper inventory added), A5 (one resolvable pointer in CLAUDE.md), B (step 5 now demands a test that fails without the change and names the coverage gate as non-evidence), C (new `tests.md` + `money.md` rules, `src/repositories/**` added to `database.md`), D (skill 281→~105 lines; description 938→268 chars), E (all three).

**Added:** `/ci` command — runs the CLAUDE.md parity chain, re-runs from the top after each fix, no duplicated step list.

**Automated:** `scripts/validate-agent-assets.js` gained two checks that make this whole finding class non-recurring, plus `.claude/commands` and `CLAUDE.md` now in scope:

1. **Broken path references** — every concrete `src/`, `__tests__/`, `scripts/`, `docs/`, `node_modules/`, `.claude/`, `.github/` path cited in a harness doc must exist. Placeholders (`<name>`, `{feature}`, `YYYY`, globs) and fenced code blocks are skipped.
2. **Dead globs** — a rule's `paths:` glob that matches no tracked file is a rule that silently never loads.

Both were verified to fire by reintroducing the exact A1 defect and by planting a dead glob, then confirming green after restore. The validator runs inside `npm run lint`, so CI enforces it.

## GREEN verification

Two subagents, realistic tasks, rules never named:

- **Test rule** — asked to write an atomicity test for the transaction repository. Bridged real `BEGIN`/`COMMIT`/`ROLLBACK` rather than pass-through-mocking `withTransactionAsync`, and explained unprompted that a pass-through "would still pass even if the rollback behavior were deleted". PASS.
- **Money rule** — asked to investigate a wrong pay-sheet confirmation amount. Cleared the resolver (correct in all four currency pairs), located the real defect in the preview, and specified four-pair test coverage. PASS.

Both agents independently reported that `.claude/rules/*.md` **auto-load inside subagents**, attached as system-reminders when a matching file is opened — previously an open assumption. The rules therefore serve dispatched `@dev`/`@tariq` work, not just the main thread.

## Finding produced by the GREEN run

The money-rule test surfaced a sharper version of audit **H6**: `pay_sheet.tsx:60-63` computes `amountWatch * exchangeRateValue` unconditionally. For an EGP commitment paid from a USD account the direction should divide — 500 EGP at rate 50 shows **25,000 USD against a real debit of 10 USD (2500×, not 50×)**. Recorded against backlog Item 3.
