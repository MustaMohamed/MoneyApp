# Oxc Tooling Migration — Design Spec

**Date:** 2026-05-19
**Owner:** @tariq (technical) · @sarah (orchestration)
**Status:** Draft — awaiting spec sign-off

## 1. Goal & Non-Goals

### Goal

Replace the current ESLint + Prettier dev tooling with the **Oxc/VoidZero trio**:

- **`oxlint`** (v1.x stable, Aug 2025) — sole linter binary, configured with the **March 2026 JS Plugin Alpha** to bridge `eslint-config-expo` so Expo's React-Native-specific rules continue to enforce.
- **`oxfmt`** (beta, Feb 2026, 100% Prettier v3.8 JS/TS conformance) — sole formatter binary, with **Tailwind class sort**, **import sort**, and **package.json field sort** enabled.
- **`oxlint-tsgolint`** (alpha, Dec 2025) — type-aware backend running typescript-eslint's **`strict-type-checked`** preset via `oxlint --type-aware --type-check`.

Outcome: one linter, one formatter, both Rust-based, ~50–100× faster lint and ~30× faster format than the current stack, plus type-aware safety rules MoneyApp does not enforce today.

### Non-goals

- Not touching `jest`, `tsc`, `expo-doctor`, or the prebuild check in CI — those are independent.
- Not migrating off `husky` or `lint-staged` — they continue to orchestrate the new tools.
- Not adopting Biome — explicitly rejected in favor of the Oxc trio.
- Not preserving any ESLint plugin or rule that `eslint-config-expo` does not pull in. No orphan custom rules.
- Not changing `.prettierrc` semantics intentionally — `oxfmt` is configured to match Prettier v3.8 output as closely as possible. The three opt-ins (Tailwind, import, package.json sort) are deliberate diffs.

## 2. Architecture

### Tool roles

```
                ┌─────────────────────────────────────────────┐
                │  oxlint  (Rust CLI, sole linter binary)     │
                │  ┌─────────────────────────────────────┐    │
                │  │ Native rules (~795)                 │    │
                │  │   eslint core, react, react-hooks,  │    │
                │  │   typescript, jsx-a11y, import      │    │
                │  ├─────────────────────────────────────┤    │
                │  │ JS Plugin Alpha bridge              │    │
                │  │   → loads eslint-config-expo        │    │
                │  │     (covers RN-specific rules:      │    │
                │  │      no-raw-text, no-unused-styles, │    │
                │  │      no-color-literals, etc.)       │    │
                │  ├─────────────────────────────────────┤    │
                │  │ oxlint-tsgolint backend (Go)        │    │
                │  │   → strict-type-checked preset      │    │
                │  │   → --type-aware --type-check       │    │
                │  └─────────────────────────────────────┘    │
                └─────────────────────────────────────────────┘

                ┌─────────────────────────────────────────────┐
                │  oxfmt   (Rust CLI, sole formatter binary)  │
                │   Prettier v3.8 conformance                 │
                │   + Tailwind class sort (built-in)          │
                │   + import sort (built-in)                  │
                │   + package.json field sort (built-in)      │
                └─────────────────────────────────────────────┘
```

### New config files

- **`.oxlintrc.json`** — flat config; declares plugins (`react`, `react-hooks`, `typescript`, `jsx-a11y`, `import`), enables JS-plugin loading of `eslint-config-expo/flat`, lists the strict type-aware ruleset (enabled in PR2), declares ignores (`dist`, `android`, `ios`, `.expo`, `node_modules`).
- **`.oxfmtrc.json`** — declares formatting settings mirroring `.prettierrc`:
  - `printWidth: 100`
  - `singleQuote: true`
  - `semi: true`
  - `trailingComma: "all"`
  - `arrowParens: "always"`
  - `endOfLine: "lf"`
  - Plus the three opt-ins (Tailwind class sort with `cn` as the recognized function, import sort with external → alias (`@/`) → relative grouping, package.json field sort). Exact config keys per oxfmt's schema; the writing-plans step will pin the canonical key names.
- **`.oxfmtignore`** — copy of current `.prettierignore` 1:1 (`uniwind.d.ts`, `package-lock.json`, `assets/`, `.claude/`, etc.).

### Removed config files

- `eslint.config.js`
- `.prettierrc`
- `.prettierignore`

### Dependency changes

**Removed:**

- `eslint`
- `eslint-config-prettier`
- `prettier`

**Added:**

- `oxlint` (exact-pin latest stable v1.x)
- `oxfmt` (exact-pin latest beta)
- `oxlint-tsgolint` (exact-pin latest alpha)

**Kept:**

- `eslint-config-expo` — retained because the JS-plugin bridge `require()`s it. ESLint itself goes; the config file ships as a transitive consumer of oxlint.

### npm scripts (final, post-PR2)

```jsonc
"lint":         "oxlint --type-aware",
"lint:fix":     "oxlint --type-aware --fix",
"format":       "oxfmt",
"format:check": "oxfmt --check",
```

PR1 ships the scripts WITHOUT `--type-aware`. PR2 adds the flag.

### Husky / lint-staged

- **`pre-commit`**: lint-staged calls `oxlint --fix` (no `--type-aware`; staged-file speed matters) + `oxfmt` on changed files.
- **`pre-push`**: unchanged (`npm test && npm run typecheck`).

### CI workflow (`.github/workflows/pr-checks.yml`)

- `lint` job → `npm run lint` (PR2 adds `--type-aware --type-check`).
- `format` job → `npm run format:check`.
- The other five jobs (install, typecheck, test, doctor, prebuild-check) untouched.

### Risk surface

Two alpha/beta surfaces sit in CI:

1. **Oxlint JS Plugin Alpha** (Mar 2026) — bridges `eslint-config-expo`.
2. **Oxfmt beta** (Feb 2026, 100% JS/TS Prettier conformance).

Mitigated by exact-pinning versions and running the full pre-push parity chain before each push during the migration. Rollback strategy per Section 4.

## 3. Two-PR Shape

### PR1 — Tooling swap + formatting (mechanical)

**Branch:** `chore/oxc-tooling-pr1-swap-and-format`

**Diff makeup:** large but mechanical. The whole codebase autoformats; lint violations get fixed.

1. **Add deps** — `oxlint`, `oxfmt`, `oxlint-tsgolint` (exact-pinned).
2. **Remove deps** — `eslint`, `eslint-config-prettier`, `prettier`.
3. **Create configs** — `.oxlintrc.json`, `.oxfmtrc.json`, `.oxfmtignore` per Section 2.
4. **Delete configs** — `eslint.config.js`, `.prettierrc`, `.prettierignore`.
5. **Update npm scripts** — `lint`, `lint:fix`, `format`, `format:check` per Section 2. **`lint` runs WITHOUT `--type-aware` in PR1** (added in PR2 to keep PR1 scope mechanical).
6. **Update lint-staged** — call `oxlint --fix` and `oxfmt` instead of eslint/prettier.
7. **Update CI workflow** — `lint` and `format` jobs call new scripts.
8. **Update CLAUDE.md** — replace the pre-push CI parity one-liner with the oxc equivalent.
9. **Run `npx oxfmt`** — one large autoformat commit (Tailwind classes sorted, imports sorted, package.json sorted, every `.ts`/`.tsx`/`.json`/`.yml` rewritten).
10. **Run `npx oxlint --fix`** — fix everything auto-fixable from native + JS-plugin rules.
11. **Fix remaining lint violations manually.**
12. **Verify** — full pre-push parity chain green.

**Suggested commit sequence inside PR1:**

1. `chore: install oxc tooling (oxlint, oxfmt, oxlint-tsgolint) + remove eslint/prettier`
2. `chore: oxc config files + npm scripts + husky/lint-staged + CI`
3. `style: apply oxfmt to entire codebase (Tailwind sort, import sort, package.json sort)` ← review with `?w=1`
4. `fix: address oxlint violations (non-type-aware)`
5. `docs(claude.md): update pre-push CI parity for oxc`

**Reviewer note in PR body:** explicitly call out the style commit and recommend `?w=1` on review.

### PR2 — Enable strict type-aware linting (semantic)

**Branch:** `chore/oxc-tooling-pr2-strict-type-aware`

Lands only after PR1 merges.

1. **Update `.oxlintrc.json`** — add `typescript-eslint/strict-type-checked` rules (the full preset, including `no-unsafe-*`, `no-floating-promises`, `no-misused-promises`, `await-thenable`, `no-deprecated`, etc.).
2. **Update `lint` script** — add `--type-aware --type-check` flags.
3. **Update CI** — `lint` job now type-checks while linting. Keep separate `typecheck` job for PR2; evaluate consolidation in a follow-up.
4. **Run `npx oxlint --type-aware --fix`** — fix everything auto-fixable.
5. **Fix the remainder manually.**
6. **Verify** — full pre-push parity chain green; lint job in CI takes acceptable time (target: under 30s on CI runners).

**Escape valve (lead-decided, per CLAUDE.md "Leads approve, not the user"):** if the strict preset produces an unreasonable violation count or violations concentrated in code that is genuinely safe (e.g. typed 3p libs whose types are loose), Tariq may drop 1–3 rules from the preset rather than over-engineer fixes. Each drop must be documented in the PR body with the violation count and the rationale.

## 4. Verification & Rollback

### Pre-push CI parity chain (updated)

The CLAUDE.md one-liner becomes:

```bash
npm run format:check \
  && npm run lint \
  && npm run typecheck \
  && npm test -- --ci \
  && npx --yes expo-doctor \
  && npx expo prebuild --no-install --platform android \
  && test -d android \
  && echo "✓ CI parity green — safe to push"
```

Same six steps, same order — only the binaries behind `lint` and `format:check` change. After PR2 lands, `lint` runs `oxlint --type-aware --type-check`, which means a regression in type-aware rules will fail the chain locally before push.

### Verification matrix

| Surface | PR1 verification | PR2 verification |
| --- | --- | --- |
| Linter coverage | Run `oxlint`; manually verify it catches a known violation in each of: `react-hooks/exhaustive-deps`, `react-native/no-raw-text` (from expo bridge), `import/no-unresolved`, `typescript/no-unused-vars`. Drop a deliberate violation into a scratch file, confirm flagged, delete. | Add `--type-aware`; same drill for `no-floating-promises`, `no-misused-promises`, `await-thenable`, `no-unsafe-assignment`. |
| Formatter parity | After `oxfmt` runs, spot-check 10 random `.tsx` files for sane output. Verify `// prettier-ignore` comments still suppress formatting. | n/a |
| Tailwind sort | Confirm `cn(...)` calls sort classes; confirm `style={{ backgroundColor: hex }}` runtime-color escape hatch is untouched. | n/a |
| Lint-staged | `git commit` a small change; confirm hook runs oxlint + oxfmt, not eslint + prettier. | Confirm hook still runs (no `--type-aware` in pre-commit). |
| CI workflow | All 7 jobs green on PR1. | All 7 jobs green; record `lint` job duration before/after for the PR body. |
| Performance | Record `time npm run lint` + `time npm run format:check` before & after, paste into PR1 body. | Record `time npm run lint` with `--type-aware` for PR2 body. |

### Rollback strategy

Per PR, not per-tool. Each PR is one revertable unit.

- **PR1 regresses something** → `git revert <merge-sha>` restores ESLint + Prettier. Configs come back, deps reinstall on `npm i`. Cost: one autoformat round-trip when the next PR re-adds oxc.
- **PR2 regresses something** → `git revert <merge-sha>` keeps oxlint + oxfmt but drops `--type-aware` and the strict preset. Safe partial rollback.
- **Alpha tooling produces broken output mid-migration** (oxfmt corrupts a file, oxlint crashes on a specific syntax) → file an upstream issue, **pin to the last known-good version**, do NOT roll back the migration. Pinning is the first response, not reverting.

### Manual smoke (after each PR merges to main)

1. Pull `main`; `rm -rf node_modules && npm ci`.
2. Run the full pre-push chain locally.
3. `git commit --allow-empty -m "test"` → confirm pre-commit hook runs cleanly.
4. `npx expo run:android` boots the app; tap through onboarding → dashboard. Catches the rare case where a lint/format pass corrupted runtime code (e.g. an `// @ts-ignore` line dropped by overaggressive import sort).

## 5. Decisions Captured

| Decision | Choice | Rationale |
| --- | --- | --- |
| ESLint fate | Bridge via JS Plugin Alpha | Single tool, full Expo rule coverage. Alpha risk accepted; mitigated by pinning + rollback plan. |
| Oxfmt opt-ins | Tailwind sort + import sort + package.json sort | Replace missing `prettier-plugin-tailwindcss`; standardize import grouping; deterministic package.json. |
| Type-aware scope | `strict-type-checked` preset | Maximum safety net; willing to absorb initial cleanup cost. Lead-level escape valve in Section 3. |
| PR sequencing | Two PRs (mechanical → semantic) | Separates autoformat noise from semantic fixes. Easier review, easier revert. |

## 6. References

- [Announcing Oxlint 1.0 (VoidZero)](https://voidzero.dev/posts/announcing-oxlint-1-stable)
- [Oxlint JS Plugins Alpha (Mar 2026)](https://oxc.rs/blog/2026-03-11-oxlint-js-plugins-alpha)
- [Oxfmt Beta (Feb 2026)](https://oxc.rs/blog/2026-02-24-oxfmt-beta)
- [Migrate from Prettier — Oxfmt docs](https://oxc.rs/docs/guide/usage/formatter/migrate-from-prettier.html)
- [Type-Aware Linting — Oxlint docs](https://oxc.rs/docs/guide/usage/linter/type-aware.html)
- [oxlint-tsgolint on npm](https://www.npmjs.com/package/oxlint-tsgolint)
- [OXC benchmarks](https://oxc.rs/docs/guide/benchmarks)
