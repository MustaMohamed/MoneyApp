# Wave 4 · SP-2 — `ConfirmDialog` (HeroUI Dialog) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite `components/ui/confirm_dialog.tsx` internals to use HeroUI `Dialog` compound API, preserving the public `ConfirmDialogProps` interface byte-for-byte so all three call-site wrappers receive the new internals with zero changes.

**Architecture:** Single-file in-place rewrite. `ConfirmDialog` stays a purely presentational, controlled-open component — `visible` maps to `Dialog isOpen`, `onOpenChange(false)` routes through a `handleOpenChange` adapter to `onCancel`. HeroUI `Dialog.Overlay` gets `className="bg-overlay"` to override the too-light default `bg-backdrop` scrim. `Dialog.Content` gets `isSwipeable={false}` (confirm dialogs are blocking) and explicit `className` overrides to restore `bg-surface rounded-2xl border border-border p-5`. No call-site changes, no new files.

**Tech Stack:** React Native (Expo), TypeScript strict, HeroUI Native v1 (`Dialog`, `cn`), Uniwind/Tailwind v4, `@/components/ui/button` (existing project wrapper), oxlint v1, oxfmt beta.

**Spec:** `docs/superpowers/specs/2026-05-25-wave4-sp2-confirm-dialog-design.md` (signed off).

**Branch:** `feat/wave4-sp2-confirm-dialog` — cut from `origin/main`.

---

## Testing approach (read first)

This sub-project is **presentational only** (no store, no effects, no async). Per the project's logic-only test policy (no `.tsx` render tests — CLAUDE.md / MEMORY), **no new unit tests are written**. The three adopting screens' existing hook/state tests are unchanged and continue to prove `onConfirm`/`onCancel` wiring is correct at the behavioral level.

Per-task verification: **typecheck + lint** on the changed file. The final task runs the full 6-job CI-parity chain. Behavioral correctness is confirmed at the user's **device-QA gate** (user-only — CLAUDE.md critical trigger §8).

Each task follows: **edit → typecheck → lint → commit.**

---

## File structure

| File | Responsibility | Change |
|---|---|---|
| `components/ui/confirm_dialog.tsx` | The `ConfirmDialog` component | **Rewrite internals only** — public API unchanged |

Zero new files. Zero call-site changes.

---

## Task 0: Worktree verification setup

Worktrees are missing the gitignored `node_modules` and `expo-env.d.ts`. Symlink for tsc/oxlint/jest. Device builds are NOT done here.

**Files:** none (environment only).

- [ ] **Step 1: Symlink node_modules + ensure expo-env.d.ts**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/elastic-chebyshev-2ffc0a
test -e node_modules || ln -s ../../../node_modules node_modules
test -f expo-env.d.ts || printf '/// <reference types="expo/types" />\n' > expo-env.d.ts
ls -ld node_modules && echo "ok"
```

Expected: `node_modules` resolves (symlink or real dir) and `ok` prints.

- [ ] **Step 2: Baseline typecheck (sanity)**

```bash
npm run typecheck
```

Expected: PASS — confirms the toolchain works before any edits. If it fails, stop and diagnose before proceeding.

---

## Task 1: Branch setup

**Files:** none (git only).

- [ ] **Step 1: Create and switch to the feature branch**

```bash
git checkout -b feat/wave4-sp2-confirm-dialog
```

Expected: `Switched to a new branch 'feat/wave4-sp2-confirm-dialog'`.

---

## Task 2: Rewrite `confirm_dialog.tsx`

This is the only file change in the entire SP. The public `ConfirmDialogProps` interface is preserved verbatim — every prop name, type, and JSDoc comment stays. Only the import block and the function body change.

**Files:**
- Modify: `components/ui/confirm_dialog.tsx`

- [ ] **Step 1: Replace the full file content**

Replace the entire file with:

```tsx
import { Dialog, cn } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
  busy?: boolean;
  /** Optional content rendered between the body and the button row (e.g. a warning line). */
  children?: React.ReactNode;
}

export function ConfirmDialog({
  visible,
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  destructive = false,
  busy = false,
  children,
}: ConfirmDialogProps) {
  const handleOpenChange = (open: boolean) => {
    if (!open && !busy) onCancel();
  };

  return (
    <Dialog isOpen={visible} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        {/*
         * bg-overlay overrides HeroUI's default bg-backdrop (oklch(0%0 0/20%) ≈ 20% black).
         * Our --overlay token in global.css is rgba(0,0,0,0.6) — matches the legacy Modal scrim.
         * Without this override the backdrop is visibly too light.
         */}
        <Dialog.Overlay className="bg-overlay" isCloseOnPress={!busy} />
        {/*
         * HeroUI Dialog.Content defaults: bg-overlay p-5 rounded-3xl shadow-overlay.
         * We override:
         *   bg-surface   — dark-surface card (#1A2535); not the scrim colour
         *   rounded-2xl  — 16px matches the legacy rounded-2xl card
         *   border border-border — preserves the legacy card border
         *   p-5          — identical padding; keep as-is (no change needed)
         *
         * tv() className-override fallback: if bg-surface or rounded-2xl are silently
         * ignored by HeroUI's tailwind-variants base (same risk noted for Chip in SP-1),
         * replace the className bg-surface and rounded-2xl with a style prop instead:
         *   style={{ backgroundColor: Colors.dark.surface, borderRadius: Radius.lg }}
         * and import { Colors, Radius } from '@/constants/theme'.
         * Verify visually at device QA before considering the fallback necessary.
         *
         * isSwipeable={false}: Dialog.Content defaults to isSwipeable={true}.
         * A confirm dialog is a blocking modal — swipe-to-dismiss would silently
         * bypass the busy guard and fire no callback. Must be explicit.
         */}
        <Dialog.Content
          isSwipeable={false}
          className="bg-surface border-border w-full rounded-2xl border p-5"
        >
          <Dialog.Title className="text-foreground mb-2 text-xl font-soraBold">
            {title}
          </Dialog.Title>
          <Dialog.Description className="text-muted mb-2 text-[15px] leading-6">
            {body}
          </Dialog.Description>
          {children}
          <View style={{ flexDirection: 'row' }} className="mt-1 gap-2">
            <View style={{ flex: 1 }}>
              <Button
                variant="secondary"
                label={cancelLabel}
                onPress={onCancel}
                isDisabled={busy}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                variant={destructive ? 'danger' : 'primary'}
                label={confirmLabel}
                onPress={onConfirm}
                isLoading={busy}
                isDisabled={busy}
              />
            </View>
          </View>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}
```

Key decisions locked in above (do not alter without re-reading the spec):

1. **`Dialog.Overlay className="bg-overlay"`** — overrides the too-light default `bg-backdrop`. The `--overlay` CSS variable in `global.css` is `rgba(0,0,0,0.6)`, matching the legacy scrim exactly.
2. **`isCloseOnPress={!busy}`** — backdrop press is a no-op when `busy=true`, matching the legacy `onRequestClose={busy ? () => {} : onCancel}`.
3. **`isSwipeable={false}`** — swipe-to-dismiss disabled; confirm dialogs are blocking.
4. **`handleOpenChange` adapter** — maps HeroUI's `onOpenChange(false)` (overlay press, Android hardware-back, any future dismiss path) to `onCancel`, respecting `busy`.
5. **`Dialog.Trigger` omitted** — fully controlled open/close via `isOpen` prop; no trigger needed.
6. **`Dialog.Close` omitted** — confirm dialogs have no standalone close button.
7. **`Box` import removed** — replaced with `View` (no className needed for layout containers; `style` prop used directly per CLAUDE.md screen-layout rules for flex-critical containers).
8. **`Text` import removed** — `Dialog.Title` and `Dialog.Description` replace the custom `Text` wrapper; their className receives the same visual styles.
9. **`cn` import retained** — available from `heroui-native`, used to confirm className composition works; if not used directly in this simplified form, oxlint will flag the unused import and it should be removed.

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: PASS. If `Dialog` is not found as a named export from `heroui-native`, check: `grep "Dialog" node_modules/heroui-native/src/index.tsx` — it is confirmed exported as `export * from './components/dialog'`. A failure here means a version mismatch, not a code error.

- [ ] **Step 3: Lint**

```bash
npx oxlint --type-aware components/ui/confirm_dialog.tsx
```

Expected: 0 warnings, 0 errors.

Anticipated lint findings and resolutions:

- **`cn` imported but unused**: if the final render has no `cn()` call (none in the template above), remove the `cn` from the import: change `import { Dialog, cn } from 'heroui-native';` to `import { Dialog } from 'heroui-native';`. Then re-run lint.
- **`React` imported but unused** (if oxlint strict): change `import React from 'react';` to `import type React from 'react';` or remove and use `import { type ReactNode } from 'react'` for the `children` type. Match whichever pattern the surrounding `components/ui/` files use.

- [ ] **Step 4: Format**

```bash
npx oxfmt components/ui/confirm_dialog.tsx
```

Expected: file formatted (Tailwind class sort + import sort applied, no diff or auto-fixed in place).

- [ ] **Step 5: Commit**

```bash
git add components/ui/confirm_dialog.tsx
git commit -m "refactor(ui): ConfirmDialog internals → HeroUI Dialog"
```

---

## Task 3: Verify call-site wrappers are unchanged and type-clean

The three call-site wrapper files must not have been accidentally edited. We confirm they typecheck cleanly against the unchanged public API.

**Files:** read-only verification pass on:
- `screens/accounts/detail/components/archive_confirmation_dialog.tsx`
- `screens/settings/categories/components/delete_confirmation_dialog.tsx`
- `screens/transactions/detail/components/delete_confirm_dialog.tsx`

- [ ] **Step 1: Typecheck the three call-site files explicitly**

```bash
npm run typecheck
```

Expected: PASS. The typecheck covers the entire project including all three wrapper files. If any of them emit a type error, it means `ConfirmDialogProps` was accidentally changed — compare the interface in `confirm_dialog.tsx` to the original (all nine props: `visible`, `title`, `body`, `confirmLabel`, `cancelLabel`, `onConfirm`, `onCancel`, `destructive?`, `busy?`, `children?`).

- [ ] **Step 2: Confirm zero diff on the three wrappers**

```bash
git diff -- \
  screens/accounts/detail/components/archive_confirmation_dialog.tsx \
  screens/settings/categories/components/delete_confirmation_dialog.tsx \
  screens/transactions/detail/components/delete_confirm_dialog.tsx
```

Expected: empty output (no diff). These files must be untouched.

---

## Task 4: Full CI parity + PR

**Files:** none (verification + PR).

- [ ] **Step 1: Run the full CI-parity chain**

Run this exactly as written — it mirrors the 6 jobs in `.github/workflows/pr-checks.yml` and stops on the first failure:

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

Expected: ends with `✓ CI parity green — safe to push`.

If any step fails, fix it, re-run the entire chain from the top, and repeat until green. Never push with a failing step. Common failure modes:

- **`format:check`**: run `npx oxfmt .` then re-check.
- **`lint`**: fix the flagged file, re-lint that file, then re-run the full chain.
- **`typecheck`**: a type error means something in `ConfirmDialogProps` or the Dialog import path changed — diagnose against the spec.
- **`npm test -- --ci`**: the jest suite covers hook/state/store logic only. If it fails, confirm no `.ts` logic file was accidentally changed. The `confirm_dialog.tsx` rewrite should not affect any test file.
- **`expo-doctor`**: if it warns about a dependency mismatch introduced by the rewrite — none expected since `Dialog` is already in `heroui-native`.
- **`expo prebuild --no-install --platform android`**: dry-run only, no device required.

- [ ] **Step 2: Push the branch**

```bash
git push -u origin feat/wave4-sp2-confirm-dialog
```

- [ ] **Step 3: Open the PR**

```bash
gh pr create \
  --title "refactor(ui): ConfirmDialog internals → HeroUI Dialog — Wave 4 SP-2" \
  --body "$(cat <<'EOF'
## Summary
- Rewrites `components/ui/confirm_dialog.tsx` internals from `Modal + Box/Text/Button` to the HeroUI `Dialog` compound API (`Dialog.Root + Portal + Overlay + Content + Title + Description`).
- Public `ConfirmDialogProps` interface is preserved verbatim — zero changes to any of the 3 call-site wrappers (`ArchiveConfirmationDialog`, `DeleteConfirmationDialog`, `DeleteConfirmDialog`).
- Key overrides vs. HeroUI defaults: `Dialog.Overlay className="bg-overlay"` (restores 60% scrim from default 20%); `Dialog.Content isSwipeable={false}` (blocking modal — no swipe-dismiss); `Dialog.Content className="bg-surface border-border rounded-2xl border p-5"` (card surface + border + 2xl radius).
- `handleOpenChange` adapter maps HeroUI's `onOpenChange(false)` → `onCancel`, respecting the `busy` guard on all dismiss paths (overlay press, Android hardware-back).
- Net a11y improvement: `Dialog.Title` / `Dialog.Description` wire `aria-labelledby` / `aria-describedby` automatically; the legacy `Modal` had no aria linking.

Spec: `docs/superpowers/specs/2026-05-25-wave4-sp2-confirm-dialog-design.md`
Plan: `docs/superpowers/plans/2026-05-25-wave4-sp2-confirm-dialog.md`

## Test plan
- [ ] CI parity green (format, lint, typecheck, jest --ci, expo-doctor, android prebuild dry-run)
- [ ] Device QA: archive account dialog — destructive style, busy spinner, CC warning child renders, backdrop blocked during loading, hardware-back blocked during loading
- [ ] Device QA: delete category dialog — destructive style, backdrop dismiss works, no children slot
- [ ] Device QA: delete transaction dialog — destructive style, busy spinner, backdrop blocked during loading
- [ ] Device QA: title text, body text, button labels byte-identical on all 3 dialogs
- [ ] Device QA: backdrop opacity matches pre-migration 60% scrim (not lighter)
- [ ] Device QA: card corners are 2xl (not 3xl); no drop shadow on card
- [ ] Device QA: scale-in/fade animation on open feels smooth, no flash
EOF
)"
```

Expected: PR URL returned.

- [ ] **Step 4: Request code review**

Invoke `anthropic-skills:requesting-code-review` with @tariq's lens. Fix ALL findings (including Minor). Re-run CI parity after any fixes. Tariq approves and merges on the user's behalf per the autonomous-team workflow — but **hold the merge for the user's device-QA gate** (three dialog surfaces with visual changes).

---

## Self-review notes (author)

**Spec coverage check:**

- Hard invariant — zero rendered-text changes: ✓ title/body/confirmLabel/cancelLabel/children all pass through unchanged props.
- Hard invariant — behavior unchanged: ✓ `handleOpenChange` preserves `onCancel`; `isCloseOnPress={!busy}` preserves busy block; `isSwipeable={false}` prevents swipe bypass; `BackHandler` in HeroUI primitive handles hardware-back.
- Hard invariant — destructive variant: ✓ `variant={destructive ? 'danger' : 'primary'}` on confirm Button.
- Backdrop mismatch gotcha: ✓ `className="bg-overlay"` on `Dialog.Overlay` with explanation comment.
- `isSwipeable=false` gotcha: ✓ explicit prop with explanation comment.
- `tv()` fallback: ✓ documented inline in the Step 1 comment block (use `style={{ backgroundColor: Colors.dark.surface, borderRadius: Radius.lg }}` if className overrides are silently dropped by HeroUI's base).
- Adoption set — 3 wrappers, 0 changes: ✓ Task 3 confirms this with `git diff`.
- No new unit tests: ✓ logic-only test policy stated in Testing approach section.
- CI parity command: ✓ exact 6-job chain from CLAUDE.md in Task 4 Step 1.
- Call-site wrapper files excluded: ✓ `confirm_sheet.tsx` and its consumers not touched.

**Placeholder scan:** none found — every step has complete code or exact commands.

**Type consistency:** `ConfirmDialogProps` defined once in Task 2 with all nine props; no later task references a different prop name.

**`cn` import note:** the `cn` import in Task 2 Step 1 may become unused if the rendered JSX uses only plain string classNames. The Step 3 lint note calls this out explicitly with the fix. Do not leave an unused import — oxlint will fail the CI lint job.
