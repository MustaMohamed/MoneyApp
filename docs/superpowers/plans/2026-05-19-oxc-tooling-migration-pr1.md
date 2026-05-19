# Oxc Tooling Migration — PR1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace ESLint + Prettier with `oxlint` + `oxfmt` + `oxlint-tsgolint` (tooling swap + autoformat only; strict type-aware linting lands in PR2).

**Architecture:** Single Rust-based linter (`oxlint`) with native plugins for React / TypeScript / jsx-a11y / import + the JS Plugin Alpha bridge loading `eslint-plugin-expo` for 3 Expo-specific rules. Single Rust-based formatter (`oxfmt`) with built-in Tailwind class sort + import sort + package.json field sort. `oxlint-tsgolint` installed but **not** wired in this PR.

**Tech Stack:** `oxlint@^1.x` · `oxfmt@^0.x` (beta) · `oxlint-tsgolint@^0.x` (alpha) · `eslint-plugin-expo@^1.x` (kept as JS-plugin bridge target) · `husky` + `lint-staged` (unchanged orchestration).

**Spec:** [`docs/superpowers/specs/2026-05-19-oxc-tooling-migration-design.md`](../specs/2026-05-19-oxc-tooling-migration-design.md)

---

## File Map

**Create:**
- `.oxlintrc.json` — oxlint config
- `.oxfmtrc.json` — oxfmt config
- `.oxfmtignore` — oxfmt ignore patterns

**Delete:**
- `eslint.config.js`
- `.prettierrc`
- `.prettierignore`

**Modify:**
- `package.json` — dep changes, npm scripts, `lint-staged` block
- `package-lock.json` — auto-updated by npm
- `.husky/pre-commit` — chmod +x (already existed but lacked executable bit)
- `.husky/pre-push` — chmod +x (same)
- `CLAUDE.md` — add a brief note about oxc tooling under a new "Tooling" subsection of Tech Stack

**Reformat (mechanical, via `npx oxfmt`):** every `.ts`, `.tsx`, `.js`, `.cjs`, `.mjs`, `.json`, `.yml`, `.html`, `.css` file in the repo that isn't ignored.

---

## Task 1: Capture baseline timings

**Files:** none (read-only)

- [ ] **Step 1: Time current lint job**

```bash
time npm run lint
```

Expected: completes successfully; record real time (e.g. `12.4s`).

- [ ] **Step 2: Time current format check**

```bash
time npm run format:check
```

Expected: completes (likely fails since `prettier-plugin-tailwindcss` isn't installed so class order doesn't match — that's fine; we want the duration). Record real time.

- [ ] **Step 3: Save baselines into a scratch file for the PR body later**

Append both timings to a scratch note (keep alongside the worktree as `.timings.txt`, gitignored — do not commit). Format:

```
Baseline (ESLint + Prettier):
  lint:         <X>s
  format:check: <Y>s
```

---

## Task 2: Swap dependencies

**Files:** Modify `package.json`, `package-lock.json`

- [ ] **Step 1: Remove ESLint + Prettier deps**

```bash
npm uninstall eslint eslint-config-expo eslint-config-prettier prettier
```

Expected: `package.json` `devDependencies` no longer lists those four packages.

- [ ] **Step 2: Install Oxc trio + the Expo plugin (exact-pinned)**

```bash
npm install --save-dev --save-exact oxlint oxfmt oxlint-tsgolint eslint-plugin-expo
```

Expected: `package.json` `devDependencies` now includes exact versions (no `^` or `~`) for all four packages.

- [ ] **Step 3: Verify binaries available**

```bash
npx oxlint --version
npx oxfmt --version
ls node_modules/eslint-plugin-expo/build/index.js
ls node_modules/oxlint-tsgolint
```

Expected: each prints / lists successfully.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): swap eslint+prettier for oxlint+oxfmt+oxlint-tsgolint

- Remove eslint, eslint-config-expo, eslint-config-prettier, prettier
- Add oxlint (stable v1), oxfmt (beta), oxlint-tsgolint (alpha), eslint-plugin-expo
- eslint-plugin-expo promoted to direct dep for JS Plugin Alpha bridge"
```

---

## Task 3: Create oxc config files

**Files:** Create `.oxlintrc.json`, `.oxfmtrc.json`, `.oxfmtignore`. Delete `eslint.config.js`, `.prettierrc`, `.prettierignore`.

- [ ] **Step 1: Write `.oxlintrc.json`**

Create `.oxlintrc.json` with this exact content:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "jsx-a11y", "import"],
  "jsPlugins": [
    {
      "name": "expo",
      "specifier": "eslint-plugin-expo"
    }
  ],
  "env": {
    "browser": true,
    "es2024": true,
    "node": true,
    "jest": true
  },
  "globals": {
    "__DEV__": "readonly",
    "ErrorUtils": "readonly",
    "FormData": "readonly",
    "XMLHttpRequest": "readonly",
    "fetch": "readonly",
    "navigator": "readonly",
    "process": "readonly",
    "requestAnimationFrame": "readonly",
    "cancelAnimationFrame": "readonly",
    "setImmediate": "readonly",
    "clearImmediate": "readonly"
  },
  "settings": {
    "react": {
      "version": "detect"
    }
  },
  "rules": {
    "react/react-in-jsx-scope": "off",
    "react/display-name": "off",
    "expo/use-dom-exports": "error",
    "expo/no-env-var-destructuring": "error",
    "expo/no-dynamic-env-var": "error"
  },
  "ignorePatterns": [
    "node_modules/",
    ".expo/",
    "dist/",
    "android/",
    "ios/",
    "coverage/",
    "uniwind.d.ts"
  ],
  "overrides": [
    {
      "files": ["jest.setup.js", "__tests__/**/*.{ts,tsx,js}"],
      "rules": {
        "react/display-name": "off"
      }
    }
  ]
}
```

- [ ] **Step 2: Write `.oxfmtrc.json`**

Create `.oxfmtrc.json` with this exact content:

```json
{
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "semi": true,
  "singleQuote": true,
  "quoteProps": "as-needed",
  "trailingComma": "all",
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf",
  "insertFinalNewline": true,
  "sortImports": {
    "order": "asc",
    "groups": [
      "builtin",
      "external",
      ["internal", "subpath"],
      ["parent", "sibling", "index"],
      "style",
      "unknown"
    ],
    "newlinesBetween": true,
    "internalPattern": ["@/"]
  },
  "sortTailwindcss": {
    "functions": ["cn"]
  },
  "sortPackageJson": {
    "sortScripts": false
  }
}
```

- [ ] **Step 3: Write `.oxfmtignore`**

Create `.oxfmtignore` with this exact content (1:1 copy of current `.prettierignore`):

```
node_modules/
.expo/
dist/
android/
ios/
package-lock.json
yarn.lock
*.md
assets/
.claude/
coverage/

# Auto-generated by uniwind on postinstall; formatting differs from project prettier config.
uniwind.d.ts
```

- [ ] **Step 4: Delete the old configs**

```bash
git rm eslint.config.js .prettierrc .prettierignore
```

Expected: three files removed from git index.

- [ ] **Step 5: Sanity-check oxlint reads the new config**

```bash
npx oxlint --print-config app/_layout.tsx 2>&1 | head -40
```

Expected: prints resolved config; no error about `jsPlugins`, plugins, or unknown keys. If oxlint complains about a key, capture the exact message and stop — do not invent a fix. Most likely cause: the alpha JS plugin schema accepts a different shape (e.g. flat string `"eslint-plugin-expo"` instead of object). If so, try the flat-string form:

```json
"jsPlugins": ["eslint-plugin-expo"]
```

…then re-run the print-config command. Pick the form that works.

- [ ] **Step 6: Sanity-check oxfmt reads its config**

```bash
npx oxfmt --check app/_layout.tsx 2>&1 | head -10
```

Expected: either "needs formatting" or "ok" — but no config-parse error. If oxfmt rejects an unknown key (e.g. `sortTailwindcss.functions`), capture the message and look up the canonical key in oxfmt's config-file reference. Adjust the JSON, re-run.

- [ ] **Step 7: Commit**

```bash
git add .oxlintrc.json .oxfmtrc.json .oxfmtignore eslint.config.js .prettierrc .prettierignore
git commit -m "chore(tooling): add oxlint/oxfmt configs, remove eslint/prettier configs

- .oxlintrc.json: react/typescript/jsx-a11y/import native + eslint-plugin-expo via jsPlugins
- .oxfmtrc.json: Prettier-equivalent + Tailwind sort (cn fn) + import sort + package.json sort
- .oxfmtignore: 1:1 from .prettierignore"
```

---

## Task 4: Verify JS Plugin Alpha loads the Expo rules

**Files:** none committed (scratch verification only)

This is the highest-risk piece of the migration — the JS Plugin Alpha is alpha-stage. Verify it works before going further.

- [ ] **Step 1: Create a scratch file that violates one of the 3 Expo rules**

Write `scratch-expo-rule-check.ts` at the repo root (do not commit; will be deleted in step 3):

```ts
// This file deliberately violates expo/no-env-var-destructuring
const { NODE_ENV } = process.env;
console.log(NODE_ENV);
```

- [ ] **Step 2: Run oxlint and confirm the rule fires**

```bash
npx oxlint scratch-expo-rule-check.ts
```

Expected: oxlint reports a violation of `expo/no-env-var-destructuring` (exit code non-zero).

If the rule does NOT fire:
1. Re-check `.oxlintrc.json` — is `jsPlugins` declared? Is the rule listed under `rules`?
2. Run `npx oxlint --print-config scratch-expo-rule-check.ts` — is `expo/no-env-var-destructuring` in the resolved rules?
3. If still failing, the JS Plugin Alpha may not yet support `eslint-plugin-expo`'s rule API shape. **Escalate per CLAUDE.md critical trigger #4** (new dependency / alpha tooling outside established stack) — Tariq decides whether to fall back to hand-porting the 3 rules as oxlint native rules (out of scope for this PR), drop the rules entirely with a note in the PR body, or pause the migration.

- [ ] **Step 3: Delete the scratch file**

```bash
rm scratch-expo-rule-check.ts
```

Expected: file gone. Do not commit.

---

## Task 5: Update npm scripts and lint-staged

**Files:** Modify `package.json`

- [ ] **Step 1: Update the `scripts` block**

Edit `package.json` — replace the `lint`, `lint:fix`, `format`, `format:check` script values. After:

```jsonc
"scripts": {
  "start": "expo start",
  "android": "expo run:android",
  "ios": "expo run:ios",
  "web": "expo start --web",
  "typecheck": "node scripts/generate-typed-routes.js && tsc --noEmit",
  "lint": "oxlint",
  "lint:fix": "oxlint --fix",
  "format": "oxfmt",
  "format:check": "oxfmt --check",
  "test": "jest",
  "test:coverage": "jest --coverage",
  "prepare": "husky",
  "postinstall": "patch-package"
}
```

(Note: `lint` deliberately does NOT include `--type-aware` here. That flag is added in PR2.)

- [ ] **Step 2: Update the `lint-staged` block**

In the same `package.json`, replace the `lint-staged` block with:

```jsonc
"lint-staged": {
  "*.{ts,tsx,js,cjs,mjs}": [
    "oxlint --fix",
    "oxfmt"
  ],
  "*.json": [
    "oxfmt"
  ]
}
```

- [ ] **Step 3: Verify scripts run**

```bash
npm run lint -- --help | head -5
npm run format -- --help | head -5
```

Expected: each prints help text from the respective tool (not from npm).

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "chore(scripts): point lint/format scripts + lint-staged at oxlint/oxfmt"
```

---

## Task 6: Make husky hooks executable

**Files:** Modify `.husky/pre-commit`, `.husky/pre-push`

Both hooks currently lack the executable bit and have been silently skipped on every commit (git emits a "hook was ignored" hint). Fold the fix into this PR since Task 8 needs the hook to fire.

- [ ] **Step 1: Add executable bit**

```bash
chmod +x .husky/pre-commit .husky/pre-push
```

Expected: no output.

- [ ] **Step 2: Verify**

```bash
ls -l .husky/pre-commit .husky/pre-push
```

Expected: both files show `-rwxr-xr-x` (or equivalent — the `x` bit is present for owner).

- [ ] **Step 3: Commit (git tracks the mode change)**

```bash
git add .husky/pre-commit .husky/pre-push
git commit -m "fix(husky): set executable bit on pre-commit and pre-push hooks

Both hooks were silently ignored by git because the executable bit was missing.
Unblocks the lint-staged + oxlint pre-commit verification in this PR."
```

---

## Task 7: Apply oxfmt to the entire codebase

**Files:** virtually every source file in the repo (mechanical reformat).

- [ ] **Step 1: Run oxfmt across the project**

```bash
npx oxfmt
```

Expected: oxfmt prints a list of reformatted files and exits 0. Expected to touch most `.ts`/`.tsx` files (import sort + Tailwind class sort), `package.json` (field sort), and any `.yml` / `.json` not in `.oxfmtignore`.

If oxfmt errors out on a specific file:
- Capture the file path and error.
- If the error is a parse error in valid TS, the file may use syntax oxfmt doesn't yet support — add it to `.oxfmtignore` with a comment explaining why, and proceed.
- If the error is something else, stop and investigate before continuing.

- [ ] **Step 2: Spot-check the diff on 10 random files**

```bash
git diff --stat | head -40
git diff app/_layout.tsx screens/dashboard/index.tsx components/ui/screen.tsx 2>/dev/null | head -200
```

Expected: visually sane diffs — imports grouped/sorted, Tailwind classes in canonical order, no obvious mangling of JSX or string literals. If you see anything destructive (lost characters, broken syntax), STOP — investigate before committing.

- [ ] **Step 3: Verify TypeScript still compiles**

```bash
npm run typecheck
```

Expected: PASS. If it fails, oxfmt did something destructive (likely import sort removed a side-effect import). Inspect the failing import, restore it, and add the file's directory to a more conservative `sortImports.sortSideEffects: false` setting (already the default — but verify).

- [ ] **Step 4: Verify tests still pass**

```bash
npm test -- --ci
```

Expected: PASS. Same diagnostic logic as step 3.

- [ ] **Step 5: Commit as ONE big style commit**

```bash
git add -A
git commit -m "style: apply oxfmt to entire codebase

- Tailwind classes sorted in className and cn()
- Imports grouped + sorted (builtin -> external -> @/ -> relative)
- package.json fields sorted

Review with ?w=1. No semantic changes."
```

The single-commit boundary is deliberate — reviewers can skip this commit with `?w=1` and focus on the surrounding tasks.

---

## Task 8: Run oxlint and fix violations

**Files:** any file flagged by oxlint.

- [ ] **Step 1: Run oxlint --fix to auto-correct**

```bash
npx oxlint --fix
```

Expected: prints the list of auto-fixes applied. Exit code may still be non-zero if non-fixable violations remain.

- [ ] **Step 2: List remaining violations**

```bash
npx oxlint
```

Expected: either "no violations" (great, skip to step 5) or a list of remaining violations.

- [ ] **Step 3: Fix remaining violations file-by-file**

For each violation reported:
- Open the file at the reported line.
- Fix the violation manually (do not blanket-disable rules). The rules in play are: react, react-hooks, typescript, jsx-a11y, import, plus the 3 expo rules.
- If a rule produces what is genuinely a false positive (e.g. a `react-hooks/exhaustive-deps` warning where the missing dep is intentional and stable), prefer a per-line disable comment over disabling the rule globally:

```ts
// oxlint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => { /* ... */ }, [stable]);
```

- [ ] **Step 4: Re-run oxlint until clean**

```bash
npx oxlint
```

Expected: zero violations, exit code 0.

- [ ] **Step 5: Verify the codebase still builds + tests**

```bash
npm run typecheck && npm test -- --ci
```

Expected: both PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "fix: address oxlint violations (non-type-aware)

Fixes the violations surfaced by the new oxlint native + JS plugin rules,
plus any auto-fixes oxlint applied. No type-aware rules in scope here
(those land in PR2)."
```

---

## Task 9: Update CI workflow + CLAUDE.md

**Files:** Modify `.github/workflows/pr-checks.yml`, `CLAUDE.md`.

### CI workflow

The `lint` and `format` jobs call `npm run lint` and `npm run format:check`, which now point at oxlint/oxfmt — no YAML change is functionally required. Add a small logging step so PR reviewers can see which tool versions ran.

- [ ] **Step 1: Add version logging to the `lint` job**

In `.github/workflows/pr-checks.yml`, find the `lint` job and add a step between `npm ci` and `npm run lint`:

```yaml
      - run: npm ci
      - name: Log oxlint version
        run: npx oxlint --version
      - run: npm run lint
```

- [ ] **Step 2: Add version logging to the `format` job**

Same workflow file, `format` job:

```yaml
      - run: npm ci
      - name: Log oxfmt version
        run: npx oxfmt --version
      - run: npm run format:check
```

### CLAUDE.md

The Tech Stack section doesn't currently name a linter or formatter. Add them so the team's mental model reflects reality.

- [ ] **Step 3: Update the Tech Stack line**

In `CLAUDE.md`, under the `## Tech Stack` heading, find the existing single-paragraph Tech Stack line that currently ends with `· patch-package`. Append (as a trailing `·`-separated item, no newline before):

```
 · oxlint v1 (sole linter, eslint-plugin-expo bridged via JS Plugin Alpha) · oxfmt beta (sole formatter, Tailwind class sort + import sort built-in) · oxlint-tsgolint (installed; type-aware enabled in a follow-up PR)
```

The result should be one continuous Tech Stack paragraph that now ends with `... · patch-package · oxlint v1 ... · oxlint-tsgolint (installed; ...)`.

- [ ] **Step 4: Commit both**

```bash
git add .github/workflows/pr-checks.yml CLAUDE.md
git commit -m "chore(ci,docs): log oxlint/oxfmt versions in CI, note tooling in CLAUDE.md"
```

---

## Task 10: Verify pre-commit hook actually fires

**Files:** none committed (verification only)

- [ ] **Step 1: Create a deliberately-misformatted scratch file**

Write `scratch-hook-check.ts` at the repo root:

```ts
import {something    } from   "@/constants/strings"  ;
   const   x=1;export default x
```

- [ ] **Step 2: Stage and commit**

```bash
git add scratch-hook-check.ts
git commit -m "test: scratch hook check"
```

Expected: lint-staged runs `oxlint --fix` then `oxfmt` on the staged file. The commit either succeeds with the file reformatted (good) or fails with a clear oxlint error (also good — it means the hook ran).

- [ ] **Step 3: Confirm the file got reformatted**

```bash
cat scratch-hook-check.ts
```

Expected: clean formatting (proper quotes, single space, trailing newline, semicolons consistent).

- [ ] **Step 4: Undo the test commit and delete the scratch file**

```bash
git reset --soft HEAD~1
git rm --cached scratch-hook-check.ts
rm scratch-hook-check.ts
```

Expected: scratch file gone, the test commit removed from history, working tree clean of the scratch file. Verify with `git status`.

---

## Task 11: Full pre-push CI parity chain

**Files:** none committed.

- [ ] **Step 1: Run the full parity chain**

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

Expected: every step passes; final line printed. Total time should be **dramatically lower** than the baseline captured in Task 1 for the `format:check` and `lint` steps (other steps unchanged).

- [ ] **Step 2: Capture post-migration timings**

```bash
time npm run lint
time npm run format:check
```

Append to `.timings.txt`:

```
Post-migration (oxlint + oxfmt, no --type-aware yet):
  lint:         <X>s
  format:check: <Y>s
```

This file stays local — used to populate the PR body in Task 12.

- [ ] **Step 3: If any step failed**, do NOT push. Fix the underlying issue, re-run the full chain, repeat until green. Never push hoping CI will catch it (CLAUDE.md rule).

---

## Task 12: Open PR

**Files:** none.

- [ ] **Step 1: Push the branch**

```bash
git push -u origin chore/oxc-tooling-migration
```

Expected: branch published. Husky `pre-push` runs `npm test && npm run typecheck` — both pass (verified in Task 11).

- [ ] **Step 2: Open the PR with detailed body**

Before running the `gh` command below, **manually substitute the four `<BEFORE>` / `<AFTER>` / two `<X>` placeholders** in the heredoc with the actual numbers from `.timings.txt` (captured in Task 1 step 3 and Task 11 step 2). Do not push the PR with `<BEFORE>` / `<AFTER>` strings still in the body.

Then run:

```bash
gh pr create --title "chore(tooling): swap eslint+prettier for oxlint+oxfmt (PR1 of 2)" --body "$(cat <<'EOF'
## Summary

PR1 of the two-PR Oxc tooling migration.

- Replaces `eslint` + `eslint-config-expo` + `eslint-config-prettier` + `prettier` with `oxlint` + `oxfmt` + `oxlint-tsgolint` (the last is installed but **not** wired in this PR — it lands in PR2 with the strict type-aware preset).
- Bridges Expo's 3 custom rules (`expo/use-dom-exports`, `expo/no-env-var-destructuring`, `expo/no-dynamic-env-var`) via the Mar-2026 JS Plugin Alpha loading `eslint-plugin-expo` directly.
- Reformats the entire codebase with oxfmt (Tailwind class sort + import sort + package.json field sort enabled).
- Fixes a pre-existing bug: husky pre-commit and pre-push hooks lacked the executable bit and had been silently ignored.

## Performance

| Step          | Before (eslint/prettier) | After (oxlint/oxfmt) | Speedup |
| ------------- | ------------------------ | -------------------- | ------- |
| `lint`        | <BEFORE>s                | <AFTER>s             | <X>×    |
| `format:check`| <BEFORE>s                | <AFTER>s             | <X>×    |

## Reviewer notes

- The `style: apply oxfmt to entire codebase` commit reformats virtually every `.tsx` file. **Please review it with `?w=1`** (ignore whitespace) to focus on semantic changes. There should be none.
- The `lint` script does NOT include `--type-aware` in this PR — that flag (and the strict-preset cleanup it surfaces) is the entire scope of PR2.
- Two alpha/beta tools sit in CI: oxlint JS Plugin Alpha (Mar 2026) and oxfmt beta (Feb 2026, 100% Prettier JS/TS conformance). Exact-pinned versions; rollback plan documented in the spec.

## Spec

[docs/superpowers/specs/2026-05-19-oxc-tooling-migration-design.md](../blob/main/docs/superpowers/specs/2026-05-19-oxc-tooling-migration-design.md)

## Test plan

- [ ] `npm run format:check` green
- [ ] `npm run lint` green
- [ ] `npm run typecheck` green
- [ ] `npm test -- --ci` green
- [ ] `npx expo-doctor` green
- [ ] `npx expo prebuild --no-install --platform android` green
- [ ] After merge: `npx expo run:android` boots; tap through onboarding → dashboard with no regressions
- [ ] Manual smoke: trivial commit triggers lint-staged via pre-commit hook and reformats staged file
EOF
)"
```

Expected: PR URL printed. Done.

- [ ] **Step 3: Hand off to @tariq for code review**

Per CLAUDE.md autonomous team mode: Tariq approves and merges on the user's behalf — no user check-in unless a critical trigger fires. Note in the PR body if any non-obvious decision was made during implementation (e.g. switched to flat-string `jsPlugins` form because the object form errored).

---

## Done

PR1 is merged when CI is green and Tariq has reviewed/approved. PR2 (strict type-aware preset enablement + violation cleanup) then gets its own brainstorm → spec → plan cycle, since the violation set is not knowable until PR1's tooling sits in main.
