# Wave 4 · SP-4-WRAPPER — `SegmentedTabs` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `components/ui/tabs.tsx` — a single canonical `SegmentedTabs` wrapper over HeroUI Native `Tabs`, covering both the `default` pill-indicator look and the `solid-gold` filled-indicator look, with fixed and scrollable layout modes. This SP creates the wrapper file only — zero adoption/screen edits.

**Architecture:** `SegmentedTabs` is a thin, purely-presentational wrapper over HeroUI `Tabs` compound API (`Tabs` / `Tabs.List` / `Tabs.ScrollView` / `Tabs.Trigger` / `Tabs.Label` / `Tabs.Indicator`). It owns the two visual variants and the fixed/scrollable layout split. Selection state lives entirely in the caller; the wrapper is controlled via `value` + `onValueChange`. No store, no hook, no effect. One new file; zero screen edits.

**Spec:** `docs/superpowers/specs/2026-05-25-wave4-sp4-tabs-wrapper-design.md` (signed off).

**Branch:** `feat/wave4-sp4-tabs-wrapper` (cut from `origin/main` — see parallelization plan).

**Tech Stack:** React Native (Expo), TypeScript strict, HeroUI Native v1 (`Tabs` compound + `cn`), Uniwind/Tailwind v4, `constants/theme.ts` (`Colors`), oxlint + oxfmt.

---

## Testing approach (read first)

This sub-project is **presentational only**. Per the project's logic-only test policy (no `.tsx` render tests — see CLAUDE.md), **no new unit tests are written**. Verification per step is **typecheck + lint** on the new file. The final task runs full **6-job CI parity**, which proves the existing test suite is untouched (no behavioral regressions, nothing broken by the new file). Behavioral correctness and visual fidelity are confirmed at the **device QA gate** in SP-4-adoption (Batch 2 — out of scope here).

Because there are no failing-test-first steps, each task follows: **write → typecheck → lint → format → commit.**

---

## File structure

| File | Responsibility | Change |
|---|---|---|
| `components/ui/tabs.tsx` | `SegmentedTabs` component, `TabSegment` type, `SegmentedTabsVariant` type | **Create** |

No other files are modified.

---

## Task 0: Worktree environment verification

Worktrees are missing the gitignored `node_modules` and `expo-env.d.ts`, so `tsc` / oxlint / jest cannot run until they are wired up.

**Files:** none (environment only).

- [ ] **Step 1: Symlink node_modules and ensure expo-env.d.ts**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/elastic-chebyshev-2ffc0a
test -e node_modules || ln -s ../../../node_modules node_modules
test -f expo-env.d.ts || printf '/// <reference types="expo/types" />\n' > expo-env.d.ts
ls -ld node_modules && echo "ok"
```

Expected: `node_modules` resolves (symlink or real directory) and `ok` prints.

- [ ] **Step 2: Baseline typecheck**

```bash
npm run typecheck
```

Expected: PASS — confirms the toolchain works before any edits. If it fails, investigate and fix the environment before proceeding; do not mask errors.

---

## Task 1: Create `SegmentedTabs`

**Files:**
- Create: `components/ui/tabs.tsx`

### Background: HeroUI Tabs internals that matter here

Before writing the file, confirm these facts from the substrate (already verified during spec authoring — listed here so the implementer does not need to re-read the library source):

- `Tabs` is the default export from `heroui-native`. It accepts `value`, `onValueChange`, `variant` (`'primary' | 'secondary'`), `animation`, and `className`.
- `Tabs.List` renders `role="tablist"`. With `variant="primary"` it gets `p-[3px] rounded-3xl bg-default self-start flex-row items-center gap-1`. The `self-start` means the list shrinks to its content unless triggers have `flex-1`.
- `Tabs.Trigger` accepts `value`, `isDisabled`, `className`. It renders `role="tab"` and wires `accessibilityState={{ selected, disabled }}` internally via the primitive — the wrapper does not need to set these manually.
- `Tabs.Label` reads `isSelected` from internal TriggerContext and applies `text-segment-foreground` (selected) or `text-muted` (unselected) via its own `tv()` variant.
- `Tabs.Indicator` is an `Animated.View`. The Reanimated animation drives `width`, `height`, `translateX`, and `opacity` only. **`backgroundColor` is not animated** — it is safe to override via `style={{ backgroundColor: ... }}` or via `className`. With `variant="primary"` the indicator gets `bg-segment` from HeroUI's `tv()`.
- `Tabs.ScrollView` wraps trigger children in a horizontal RN `ScrollView` and accepts a `scrollAlign` prop (`'start' | 'center' | 'end' | 'none'`, default `'center'`). `Tabs.List` detects it as a child and shifts the indicator's top offset automatically.
- `useTabsIndicatorAnimation` is **not exported** from `heroui-native` — it is internal. The fallback path (if the `style` override fails) uses `isAnimatedStyleActive={false}` on `Tabs.Indicator` together with a static `style` — see contingency note in Step 1 below.

- [ ] **Step 1: Write the component**

Create `components/ui/tabs.tsx` with exactly the following content:

```tsx
import { Tabs, cn } from 'heroui-native';
import React from 'react';

import { Colors } from '@/constants/theme';

/**
 * Descriptor for a single segment in a `SegmentedTabs` control.
 *
 * Generic `T extends string` lets call-sites bind to a concrete enum/union
 * (e.g. `TabSegment<Currency>`, `TabSegment<CategoryType>`) so that
 * `onValueChange` is fully type-safe.
 */
export interface TabSegment<T extends string = string> {
  /** Value key passed to HeroUI Tabs — must be unique within the segment list. */
  value: T;
  /** Visible label text — rendered byte-identical; no transformation applied. */
  label: string;
  /** Accessibility label for this trigger; defaults to `label`. */
  accessibilityLabel?: string;
}

/**
 * Visual appearance of the selected indicator.
 *
 * - `'default'`    — HeroUI primary look: `bg-default` pill container,
 *                    `bg-segment` animated indicator (theme-driven).
 * - `'solid-gold'` — Cairo Nights gold indicator fill (`Colors.shared.cairoGold`)
 *                    with midnight-blue selected label. Used by the Expense/Income
 *                    category switcher and EGP/USD currency pickers.
 */
export type SegmentedTabsVariant = 'default' | 'solid-gold';

export interface SegmentedTabsProps<T extends string = string> {
  /**
   * Ordered list of segments. Label strings are passed through unchanged.
   */
  segments: TabSegment<T>[];
  /** Currently selected segment value — caller owns state. */
  value: T;
  /** Called when a trigger is pressed with the new value. */
  onValueChange: (value: T) => void;
  /**
   * Visual variant.
   * @default 'default'
   */
  variant?: SegmentedTabsVariant;
  /**
   * Layout mode.
   * - `'fixed'`      — triggers share full width equally (`flex-1` per trigger).
   *                    Use for 2–4 segments in a bounded container.
   * - `'scrollable'` — triggers use intrinsic width inside a horizontal
   *                    ScrollView. Selected trigger is auto-scrolled to center.
   *                    Use for variable-count or many-segment strips (e.g. month
   *                    navigator).
   * @default 'fixed'
   */
  layout?: 'fixed' | 'scrollable';
  /**
   * Scroll-alignment for `'scrollable'` layout — forwarded to `Tabs.ScrollView`.
   * @default 'center'
   */
  scrollAlign?: 'start' | 'center' | 'end' | 'none';
  /**
   * Extra className forwarded to `Tabs.List` (e.g. margin, width overrides).
   * Appended after the default list classes — Tailwind specificity rules apply.
   */
  listClassName?: string;
  /**
   * Forward to HeroUI `Tabs` `animation` prop.
   * Pass `'disable-all'` to suppress the spring indicator animation, matching
   * the prior plain-Pressable surfaces that had no press feedback.
   * @default undefined — HeroUI default spring animation
   */
  animation?: 'disable-all';
  /**
   * `aria-label` / `accessibilityLabel` on the `Tabs.List` (tablist element).
   * Provide when the surrounding UI does not make the control's purpose obvious.
   */
  accessibilityLabel?: string;
}

/**
 * Canonical segmented control wrapper over HeroUI Native `Tabs`.
 *
 * Purely presentational — props in, `onValueChange` out. Selection state lives
 * in the caller. Replaces bespoke `Pressable`-row segmented controls across the
 * app (SP-4, Wave 4).
 *
 * ## Solid-gold variant
 * `Tabs.Indicator` background-color is NOT in the Reanimated-animated property
 * set (only width/height/translateX/opacity are animated). Overriding it via
 * `style={{ backgroundColor: Colors.shared.cairoGold }}` is therefore safe.
 * Selected label text uses a per-trigger `style` override to midnight-blue
 * (`Colors.shared.midnightBlue`), determined by comparing `value === seg.value`
 * in the render map.
 *
 * ## Fallback (contingency — only if bg-color override fails at runtime)
 * If Unistyles className resolution causes `bg-segment` to win over the style
 * prop (unexpected, but possible in edge cases), set
 * `isAnimatedStyleActive={false}` on `Tabs.Indicator` and provide the full
 * position + background via a static `style` prop. This removes the spring
 * slide animation but keeps HeroUI Tabs as the substrate. Document the decision
 * in the PR description if the fallback is invoked.
 * NOTE: `useTabsIndicatorAnimation` is NOT exported from heroui-native and
 * cannot be used externally — the fallback is a static style only.
 */
export function SegmentedTabs<T extends string>({
  segments,
  value,
  onValueChange,
  variant = 'default',
  layout = 'fixed',
  scrollAlign = 'center',
  listClassName,
  animation,
  accessibilityLabel,
}: SegmentedTabsProps<T>): React.ReactElement {
  const isSolidGold = variant === 'solid-gold';
  const isScrollable = layout === 'scrollable';

  const triggers = segments.map((seg) => (
    <Tabs.Trigger
      key={seg.value}
      value={seg.value}
      // 'fixed' layout: each trigger takes an equal share of the list width.
      // 'scrollable' layout: triggers use intrinsic width — no flex-1.
      className={isScrollable ? undefined : 'flex-1'}
      accessibilityLabel={seg.accessibilityLabel ?? seg.label}
    >
      <Tabs.Label
        // solid-gold: override selected label to midnight-blue.
        // HeroUI's tv() applies text-segment-foreground/text-muted via
        // TriggerContext.isSelected — the style prop wins over className in RN.
        style={
          isSolidGold && value === seg.value
            ? { color: Colors.shared.midnightBlue }
            : undefined
        }
      >
        {seg.label}
      </Tabs.Label>
    </Tabs.Trigger>
  ));

  return (
    <Tabs
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- HeroUI onValueChange is (string)=>void; T extends string so the cast is sound
      onValueChange={onValueChange as (v: string) => void}
      value={value}
      variant="primary"
      animation={animation}
    >
      <Tabs.List
        className={cn(listClassName)}
        accessibilityLabel={accessibilityLabel}
      >
        <Tabs.Indicator
          // solid-gold: override bg-segment → cairoGold.
          // backgroundColor is NOT in the Reanimated-animated property set —
          // this style override is safe (see JSDoc above).
          style={
            isSolidGold
              ? { backgroundColor: Colors.shared.cairoGold }
              : undefined
          }
        />
        {isScrollable ? (
          <Tabs.ScrollView scrollAlign={scrollAlign}>
            {triggers}
          </Tabs.ScrollView>
        ) : (
          triggers
        )}
      </Tabs.List>
    </Tabs>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: PASS. If TypeScript complains about the `onValueChange as (v: string) => void` cast, confirm the cast site has the `oxlint-disable-next-line` comment above it (already included) and that `T extends string` is in the generic constraint (it is). If HeroUI types have changed, investigate — do not widen the cast blindly.

- [ ] **Step 3: Lint**

```bash
npx oxlint --type-aware components/ui/tabs.tsx
```

Expected: 0 warnings, 0 errors. Common flags to handle:

- If `React` import is flagged as unused-by-name: replace `import React from 'react';` with `import type { ReactElement } from 'react';` and change the return type to `: ReactElement`. Keep the rest identical.
- If `cn` from `heroui-native` is flagged as unused (because `listClassName` is passed directly): the `cn(listClassName)` call handles the `undefined` case cleanly and will not be flagged. If it is flagged anyway, replace `cn(listClassName)` with `listClassName` directly — the prop is already `string | undefined`, which `Tabs.List` accepts.
- The `oxlint-disable-next-line` comment on the `onValueChange` cast must be on the line immediately preceding the cast line — confirm this in the written file.

- [ ] **Step 4: Format**

```bash
npx oxfmt components/ui/tabs.tsx
```

Expected: file formatted with no diff (or auto-fixed in place). Run `npm run typecheck` again if oxfmt rearranges imports significantly — unlikely but confirm.

- [ ] **Step 5: Commit**

```bash
git add components/ui/tabs.tsx
git commit -m "feat(ui): add SegmentedTabs wrapper over HeroUI Tabs (Wave 4 SP-4-wrapper)"
```

---

## Task 2: Full CI parity + PR + code review

**Files:** none (verification and PR only).

- [ ] **Step 1: Run the full CI-parity chain**

Run this exactly as written — it mirrors `.github/workflows/pr-checks.yml` step-for-step and stops on the first failure:

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

Expected: ends with `✓ CI parity green — safe to push`. Every step must pass.

If any step fails:
- `format:check` → run `npx oxfmt .` and re-check.
- `lint` → fix the flagged line(s); re-run from the top.
- `typecheck` → fix the type error; re-run from the top.
- `npm test -- --ci` → a test failure here means a pre-existing test broke, which should not happen since this SP creates one new file with no adoption. Investigate before proceeding.
- `expo-doctor` → resolve any dependency advisory; do not suppress it.
- `expo prebuild` → a native config error unrelated to this SP; do not proceed if this fails.

Do not push until this chain completes green end-to-end.

- [ ] **Step 2: Push the branch**

```bash
git push -u origin feat/wave4-sp4-tabs-wrapper
```

Expected: branch pushed, remote tracking set.

- [ ] **Step 3: Open the PR**

```bash
gh pr create \
  --title "feat(ui): SegmentedTabs — Wave 4 SP-4 wrapper (Tabs dedup)" \
  --body "$(cat <<'EOF'
## Summary
- Add `components/ui/tabs.tsx` — `SegmentedTabs<T>`, a purely presentational wrapper over HeroUI Native `Tabs` compound API.
- Two visual variants: `'default'` (HeroUI `bg-segment` pill indicator) and `'solid-gold'` (cairoGold indicator fill, midnight-blue selected label via `style` override — `backgroundColor` is not in the Reanimated-animated property set).
- Two layout modes: `'fixed'` (equal-width `flex-1` triggers) and `'scrollable'` (`Tabs.ScrollView` with `scrollAlign` for the month-navigator strip use case in SP-4-adoption).
- **Zero screen edits in this PR.** Adoption (categories switcher, currency pickers, month navigator) is Batch 2 — `feat/wave4-sp4-tabs-adoption`.

Spec: `docs/superpowers/specs/2026-05-25-wave4-sp4-tabs-wrapper-design.md`
Plan: `docs/superpowers/plans/2026-05-25-wave4-sp4-tabs-wrapper.md`
Parallelization: `docs/superpowers/plans/2026-05-25-wave4-parallelization.md` (Batch 1, stream SP-4-wrapper)

## Test plan
- [ ] CI parity green (format, lint, typecheck, jest, expo-doctor, android prebuild)
- [ ] No device QA required — this PR has no visual change (wrapper file only, no adoption)
- [ ] Adoption device QA is gated on SP-4-adoption PR (Batch 2)
EOF
)"
```

Expected: PR URL returned. Record it.

- [ ] **Step 4: Request code review**

Invoke `anthropic-skills:requesting-code-review` with @tariq's lens. Fix ALL findings (Critical and Suggestions; Nits at discretion). Re-run the full CI-parity chain after any fixes. Tariq approves and merges on the user's behalf per the autonomous-team workflow (CLAUDE.md). No device QA gate is required for this PR — it is a wrapper-only file with no visual change.

---

## Self-review notes (author)

**Spec coverage check:**

| Spec requirement | Task that covers it |
|---|---|
| `TabSegment<T>` generic type with `value`, `label`, `accessibilityLabel` | Task 1 Step 1 |
| `SegmentedTabsVariant` (`'default'` \| `'solid-gold'`) | Task 1 Step 1 |
| `SegmentedTabsProps`: `segments`, `value`, `onValueChange`, `variant`, `layout`, `scrollAlign`, `listClassName`, `animation`, `accessibilityLabel` | Task 1 Step 1 |
| `'fixed'` layout: `flex-1` per trigger | Task 1 Step 1 |
| `'scrollable'` layout: `Tabs.ScrollView` + `scrollAlign` pass-through | Task 1 Step 1 |
| Solid-gold: `style={{ backgroundColor: Colors.shared.cairoGold }}` on `Tabs.Indicator` | Task 1 Step 1 |
| Solid-gold: midnight-blue selected label via `style` on `Tabs.Label` | Task 1 Step 1 |
| Fallback contingency documented (static style, `isAnimatedStyleActive={false}`, NOT `useTabsIndicatorAnimation` which is not exported) | Task 1 Step 1 JSDoc |
| No `.tsx` test (logic-only policy) | Testing approach section |
| Zero screen edits | Goal + file structure + PR body |
| 6-job CI parity command | Task 2 Step 1 |
| CI → commit → push → PR → code review | Tasks 1–2 |
| `onValueChange` cast site has `oxlint-disable-next-line` | Task 1 Step 1 (comment in code) |

**Placeholder scan:** none — every step has complete code or an exact command.

**Type consistency:** `TabSegment<T>` defined once, referenced in `SegmentedTabsProps<T>.segments`. `SegmentedTabsVariant` defined once, referenced in `SegmentedTabsProps.variant`. `onValueChange: (value: T) => void` in the prop interface; cast to `(v: string) => void` at the single HeroUI call site. No drift between definition and usage.
