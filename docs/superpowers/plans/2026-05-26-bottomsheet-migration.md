# BottomSheet Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate all 12+1 legacy `Sheet` consumers from the hand-rolled `@gorhom/bottom-sheet` wrapper to HeroUI Native's `BottomSheet` compound component, eliminating the four confirmed bug classes (keyboard gap, close reliability, scroll/gesture conflicts, snap/sizing drift). Each of the five waves ships as its own PR with a user-walked device-QA gate before the next wave begins.

**Architecture:** Two-file coexistence. The legacy `components/ui/sheet.tsx` (the `visible`/`onClose` API) is left byte-for-byte untouched through Waves 1–4. The new HeroUI-backed primitive is created at `components/ui/bottom_sheet.tsx` in Wave 1. Consumers migrate by switching their import path wave by wave. Wave 5 deletes the legacy file, renames `bottom_sheet.tsx` → `sheet.tsx` via `git mv`, and runs a mechanical import-path cleanup. No shim. No dual-API on a single file.

**Tech Stack:** heroui-native v1.0.3 · @gorhom/bottom-sheet (engine only, stays) · TypeScript strict · Expo Router v3 · expo-dev-client (bare workflow) · Unistyles 3 + Uniwind · oxlint v1 · oxfmt beta.

**Spec:** `docs/superpowers/specs/2026-05-26-bottomsheet-migration-design.md` (signed off, commits b8774d1 → 1e2ad31).

**Execution context:** Already operating inside git worktree on branch `condescending-gauss-9686e8`. Each wave cuts its own feature branch from `main`. Worktrees are missing the gitignored `node_modules` and `expo-env.d.ts` — symlink setup is the first task of every wave.

**Sequencing dependency:** Wave 2 (pickers) depends on `components/ui/bottom_sheet.tsx` existing from Wave 1. Waves 3 and 4 are independent of each other (different screen domains) but both depend on Wave 1. Wave 5 depends on all four preceding waves being merged.

---

## Testing approach (read first)

Per project policy: logic-only `.ts` tests only — **no `.tsx` render tests** (CLAUDE.md, MEMORY). The only UI verification surface is the per-wave device-QA gate, which the user always walks (critical trigger #8).

Logic tests that change in this migration:
- `__tests__/components/ui/sheet_snap_points.test.ts` — rewritten in Wave 1 to import `resolveSnapPoints` from `bottom_sheet.tsx` as a pure function call (not file-read string-matching). Updated in Wave 5 to import from `sheet.tsx` after the rename.
- `__tests__/store/sheet_visibility.store.test.ts` — unchanged; store contract is identical.
- State/hook tests for affected screens — import path updates only if the test's subject changed location; logic unchanged.

Each task follows: **edit → typecheck → lint → commit.** The full 6-job CI-parity chain runs once per wave before the push.

---

## Wave → PR Breakdown

| Wave | PR title | Scope | Hard gate before next wave |
|---|---|---|---|
| 1 | `refactor(sheets): Wave 1 — new bottom_sheet primitive + ConfirmSheet` | New `bottom_sheet.tsx`, ConfirmSheet + 2 callers, mocks, snap test | Device QA: ConfirmSheet (skip + deactivate flows) |
| 2 | `refactor(sheets): Wave 2 — shared picker kit` | `components/sheets/` account + category pickers, 3+3 import paths | Device QA: account picker (3 surfaces), category picker (3 surfaces) |
| 3 | `refactor(sheets): Wave 3 — transactions sheets` | date_range, filter, transaction_form, amount_hero, transaction_form_body | Device QA: full add/edit transaction flow + all pickers |
| 4 | `refactor(sheets): Wave 4 — accounts / budget / commitments / dashboard sheets` | 6 single-consumer sheets | Device QA: all 6 sheets |
| 5 | `refactor(sheets): Wave 5 — delete legacy sheet.tsx + CLAUDE.md update` | Delete + git mv + import cleanup + CLAUDE.md | Full-app device QA (all sheets) |

---

## Wave 1 — Foundation

**What ships:** `components/ui/bottom_sheet.tsx` (new HeroUI-backed primitive), `components/ui/confirm_sheet.tsx` (rebuilt on new primitive), two ConfirmSheet callers, mocks, and snap test.

**Sequencing note:** `components/ui/sheet.tsx` is NOT touched. The legacy wrapper continues to serve the remaining 11 sheets unchanged.

**Open question Q1 baked here:** The `sheet_snap_points.test.ts` is rewritten in this wave (not deferred) to import `resolveSnapPoints` from `bottom_sheet.tsx`. This is the wave where `resolveSnapPoints` is created, so the test and the export land together.

**Open question Q2 baked here:** The `busy`-state no-op guard from the legacy `ConfirmSheet` is explicitly carried forward onto `onOpenChange`.

---

### Task 0: Worktree setup (Wave 1)

**Files:** none (environment only).

- [ ] **Step 1: Symlink node_modules + ensure expo-env.d.ts**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/condescending-gauss-9686e8
test -e node_modules || ln -s ../../../node_modules node_modules
test -f expo-env.d.ts || printf '/// <reference types="expo/types" />\n' > expo-env.d.ts
ls -ld node_modules && echo "worktree ok"
```

Expected: `node_modules` resolves and `worktree ok` prints.

- [ ] **Step 2: Baseline typecheck**

```bash
npm run typecheck
```

Expected: PASS. If it fails, diagnose before any edits — the worktree may need a full `npm install` for device builds (see CLAUDE.md Expo Dev Client note), but for tsc/lint the symlink suffices.

---

### Task 1: Branch setup (Wave 1)

**Files:** none (git only).

- [ ] **Step 1: Cut feature branch from main**

```bash
git fetch origin main
git checkout -b refactor/bottomsheet-wave1 origin/main
```

Expected: `Switched to a new branch 'refactor/bottomsheet-wave1'`.

---

### Task 2: Create `components/ui/bottom_sheet.tsx`

This is the new HeroUI-backed primitive. `components/ui/sheet.tsx` is NOT modified.

**Files:**
- Create: `components/ui/bottom_sheet.tsx`

- [ ] **Step 1: Verify `heroui-native` exports `BottomSheet` and `useBottomSheetAwareHandlers`**

```bash
grep -n "BottomSheet\|useBottomSheetAwareHandlers" node_modules/heroui-native/src/index.ts | head -10
```

Expected: both are listed as exports. If `useBottomSheetAwareHandlers` is not at `heroui-native` root, check `node_modules/heroui-native/src/components/bottom-sheet/index.ts` for the correct export path and update the re-export accordingly.

- [ ] **Step 2: Write `components/ui/bottom_sheet.tsx`**

Write `/Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/condescending-gauss-9686e8/components/ui/bottom_sheet.tsx`:

```tsx
/**
 * bottom_sheet.tsx — HeroUI-backed Sheet primitive.
 *
 * This file is the NEW declarative sheet primitive composing heroui-native's
 * BottomSheet compound component. It replaces the legacy sheet.tsx which
 * drove @gorhom/bottom-sheet imperatively via a ref.
 *
 * CONSUMERS: import from '@/components/ui/bottom_sheet' (Waves 1–4).
 * After Wave 5 (git mv), the canonical path becomes '@/components/ui/sheet'.
 *
 * SCROLLABLE CONTENT RULE:
 * Any scrollable content inside a Sheet must use BottomSheetScrollView or
 * BottomSheetFlatList imported from '@gorhom/bottom-sheet'.
 * Standard RN ScrollView / FlatList will NOT scroll inside a Sheet.
 * Pass scrollable={true} to Sheet to bake the required gorhom props.
 *
 * KEYBOARD INPUTS:
 * Wire useBottomSheetAwareHandlers() onto Input's onFocus/onBlur inside a sheet.
 * Re-exported from this file so callers don't need a direct heroui-native dep.
 *
 * FOOTER:
 * Pass footer={<ReactNode>} for a sticky BottomSheetFooter. Consumers must add
 * SHEET_FOOTER_CLEARANCE as paddingBottom to their scrollable contentContainerStyle.
 *
 * FAB HIDING:
 * This primitive is the SOLE publisher to sheet_visibility.store. The counter
 * increments on open and decrements on close/unmount.
 */
import { BottomSheet } from 'heroui-native';
import { BottomSheetFooter } from '@gorhom/bottom-sheet';
import React, { useCallback, useEffect } from 'react';

import { useSheetVisibilityStore } from '@/store/sheet_visibility.store';
import { Size, Spacing } from '@/constants/theme';
import { ms } from '@/utils/responsive';

export { useBottomSheetAwareHandlers } from 'heroui-native';

/**
 * SHEET_FOOTER_CLEARANCE — paddingBottom consumers must add to scrollable
 * contentContainerStyle when passing a footer prop.
 *
 * Value: Size.ctaHeight (ms(52)) + ms(48) — same as the legacy sheet.tsx.
 * See the legacy file's comment for the full breakdown.
 */
export const SHEET_FOOTER_CLEARANCE = Size.ctaHeight + ms(48);

const SNAP_POINTS: Record<'sm' | 'md' | 'lg', string[]> = {
  sm: ['50%'],
  md: ['75%'],
  // 92% rather than 85%: sheets sit inside <Screen> which loses ~80px to
  // safe area + Stack header; 85% felt cramped on tall-status-bar devices.
  lg: ['92%'],
};

/** Pure resolver — exported for unit testing in sheet_snap_points.test.ts */
export function resolveSnapPoints(
  size: SheetProps['size'],
  snapPoints: SheetProps['snapPoints'],
): string[] {
  return snapPoints ?? SNAP_POINTS[size ?? 'lg'];
}

export interface SheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  /**
   * Preset size. Resolves to snapPoints via SNAP_POINTS map.
   * Overridden by explicit snapPoints prop.
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Explicit snap points. Overrides size when provided.
   * Pass gorhom-style string values: ['50%'], ['45%', '92%'], etc.
   */
  snapPoints?: string[];
  /**
   * Opt-in scrollable mode. When true, bakes:
   *   enableOverDrag={false}
   *   enableDynamicSizing={false}
   *   contentContainerClassName="h-full"
   * Children must use BottomSheetScrollView / BottomSheetFlatList
   * from @gorhom/bottom-sheet — not react-native ScrollView.
   */
  scrollable?: boolean;
  /**
   * Sticky footer rendered via gorhom footerComponent.
   * Consumers must add SHEET_FOOTER_CLEARANCE as paddingBottom to
   * their scrollable contentContainerStyle.
   */
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export function Sheet({
  isOpen,
  onOpenChange,
  title,
  size,
  snapPoints,
  scrollable = false,
  footer,
  children,
}: SheetProps) {
  const resolvedSnapPoints = resolveSnapPoints(size, snapPoints);
  const increment = useSheetVisibilityStore((s) => s.increment);
  const decrement = useSheetVisibilityStore((s) => s.decrement);

  // FAB-hide: increment on open, decrement on close or unmount-while-open.
  useEffect(() => {
    if (isOpen) {
      increment();
      return () => {
        decrement();
      };
    }
    return undefined;
  }, [isOpen, increment, decrement]);

  const renderFooter = useCallback(
    (props: any) =>
      footer !== undefined ? (
        <BottomSheetFooter {...props}>
          <React.Fragment>{footer}</React.Fragment>
        </BottomSheetFooter>
      ) : null,
    [footer],
  );

  return (
    <BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
      <BottomSheet.Portal>
        <BottomSheet.Overlay />
        <BottomSheet.Content
          snapPoints={resolvedSnapPoints}
          enableDynamicSizing={false}
          keyboardBehavior="interactive"
          keyboardBlurBehavior="restore"
          android_keyboardInputMode="adjustResize"
          enablePanDownToClose
          backgroundClassName="bg-surface"
          handleIndicatorClassName="bg-border"
          {...(scrollable
            ? {
                enableOverDrag: false,
                contentContainerClassName: 'h-full',
              }
            : {})}
          {...(footer !== undefined ? { footerComponent: renderFooter } : {})}
        >
          {title !== undefined && (
            <>
              <BottomSheet.Close />
              <BottomSheet.Title>{title}</BottomSheet.Title>
            </>
          )}
          {children}
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}
```

- [ ] **Step 3: Typecheck `bottom_sheet.tsx`**

```bash
npm run typecheck 2>&1 | grep "bottom_sheet" | head -20
```

Expected: no errors for `components/ui/bottom_sheet.tsx`. A `Cannot find module` for the CSS import is expected and ignorable; TS type errors are not.

Common issues and resolutions:
- `BottomSheetFooter` not in `@gorhom/bottom-sheet`: check `__mocks__/@gorhom/bottom-sheet.tsx` — it may need extending in Task 4 first. For now, confirm the real package exports it: `grep "BottomSheetFooter" node_modules/@gorhom/bottom-sheet/src/index.ts`.
- `useBottomSheetAwareHandlers` not found at `heroui-native` root: check the actual export path in `node_modules/heroui-native/src/index.ts` and update the re-export.
- `android_keyboardInputMode` not in `BottomSheetContentProps`: check `node_modules/heroui-native/src/components/bottom-sheet/bottom-sheet.types.ts` — it is passed through via `...GorhomBottomSheetProps`, so it is valid.

- [ ] **Step 4: Lint**

```bash
npx oxlint --type-aware components/ui/bottom_sheet.tsx
```

Expected: 0 errors. Common finding: `Spacing` or `ms` imported but unused if the footer padding is expressed differently — remove unused imports.

- [ ] **Step 5: Format**

```bash
npx oxfmt components/ui/bottom_sheet.tsx
```

- [ ] **Step 6: Confirm `sheet.tsx` is untouched**

```bash
git diff -- components/ui/sheet.tsx
```

Expected: empty output. If any diff appears, `sheet.tsx` was accidentally modified — restore it: `git checkout -- components/ui/sheet.tsx`.

- [ ] **Step 7: Commit**

```bash
git add components/ui/bottom_sheet.tsx
git commit -m "feat(sheets): create bottom_sheet.tsx — HeroUI-backed Sheet primitive (Wave 1)"
```

---

### Task 3: Rewrite `sheet_snap_points.test.ts` (Q1 resolution)

The current test reads `sheet.tsx` from disk as a string and asserts on inline literals. Now that `resolveSnapPoints` is an exported pure function on `bottom_sheet.tsx`, the test becomes a direct function call — far cleaner and immune to unrelated file content changes.

**Files:**
- Rewrite: `__tests__/components/ui/sheet_snap_points.test.ts`

- [ ] **Step 1: Rewrite the test**

Write `/Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/condescending-gauss-9686e8/__tests__/components/ui/sheet_snap_points.test.ts`:

```ts
/**
 * Sheet snap-point resolver — pure-function tests.
 *
 * resolveSnapPoints is exported from components/ui/bottom_sheet.tsx
 * (the new HeroUI-backed primitive). After Wave 5 (git mv bottom_sheet → sheet),
 * update this import to '@/components/ui/sheet'.
 */
import { resolveSnapPoints } from '@/components/ui/bottom_sheet';

describe('resolveSnapPoints', () => {
  it('sm preset resolves to 50%', () => {
    expect(resolveSnapPoints('sm', undefined)).toEqual(['50%']);
  });

  it('md preset resolves to 75%', () => {
    expect(resolveSnapPoints('md', undefined)).toEqual(['75%']);
  });

  it('lg preset resolves to 92%', () => {
    expect(resolveSnapPoints('lg', undefined)).toEqual(['92%']);
  });

  it('lg snap point is NOT 85% (old value removed)', () => {
    expect(resolveSnapPoints('lg', undefined)).not.toContain('85%');
  });

  it('defaults to lg when size is undefined', () => {
    expect(resolveSnapPoints(undefined, undefined)).toEqual(['92%']);
  });

  it('explicit snapPoints override size', () => {
    expect(resolveSnapPoints('sm', ['40%'])).toEqual(['40%']);
  });

  it('explicit multi-stop snapPoints are preserved', () => {
    expect(resolveSnapPoints('lg', ['45%', '92%'])).toEqual(['45%', '92%']);
  });

  it('explicit snapPoints override when size is undefined', () => {
    expect(resolveSnapPoints(undefined, ['60%'])).toEqual(['60%']);
  });
});
```

- [ ] **Step 2: Run the test**

```bash
npm test -- --testPathPattern="sheet_snap_points" --no-coverage 2>&1 | tail -20
```

Expected: all 8 tests pass.

If `Cannot find module '@/components/ui/bottom_sheet'`: the jest module alias `@/` may not be configured. Check `jest.config.js` / `tsconfig.json` for the `moduleNameMapper`. If the alias is `paths: { "@/*": ["src/*"] }` but the file is at root, adjust the import to the relative path for this test only and flag the issue.

- [ ] **Step 3: Commit**

```bash
git add __tests__/components/ui/sheet_snap_points.test.ts
git commit -m "test(sheets): rewrite snap_points test — import resolveSnapPoints directly (Wave 1)"
```

---

### Task 4: Extend `__mocks__/@gorhom/bottom-sheet.tsx` and add heroui-native mock

The existing gorhom mock covers `BottomSheet`, `BottomSheetScrollView`, `BottomSheetFlatList`, `BottomSheetView`, `BottomSheetBackdrop`, `BottomSheetFooter`. Confirm all are present and add `BottomSheetTextInput` if missing (used by `amount_hero.tsx` in Wave 3). Add a heroui-native `BottomSheet` mock for tests that exercise components importing from `heroui-native`.

**Files:**
- Modify: `__mocks__/@gorhom/bottom-sheet.tsx`
- Create or extend: `__mocks__/heroui-native.tsx`

- [ ] **Step 1: Check existing gorhom mock exports**

```bash
grep "^export" __mocks__/@gorhom/bottom-sheet.tsx
```

Expected list: `BottomSheet`, `BottomSheetBackdrop`, `BottomSheetFlatList`, `BottomSheetFooter`, `BottomSheetScrollView`, `BottomSheetView`. If `BottomSheetTextInput` is missing, add the stub below.

- [ ] **Step 2: Add `BottomSheetTextInput` stub to gorhom mock (if missing)**

If the grep above showed `BottomSheetTextInput` is absent, add this to `__mocks__/@gorhom/bottom-sheet.tsx` before the final `export {}` or alongside the other function stubs:

```tsx
function BottomSheetTextInput(props: any) {
  const { TextInput } = require('react-native');
  return <TextInput {...props} />;
}
```

And add it to the named exports at the bottom:

```tsx
export { ..., BottomSheetTextInput };
```

- [ ] **Step 3: Check whether a heroui-native mock already exists**

```bash
ls __mocks__/ 2>/dev/null
```

If `heroui-native.tsx` or `heroui-native.ts` is not present, create it. If it is present, check whether it already exports `BottomSheet` and `useBottomSheetAwareHandlers`.

- [ ] **Step 4: Create or extend `__mocks__/heroui-native.tsx`**

The mock must satisfy all tests that import from `heroui-native`. It needs at minimum: `BottomSheet` compound component (renders children), `useBottomSheetAwareHandlers` (no-op hook), and `cn` (class joiner). If the mock already exists, add only what is missing — do not clobber existing exports.

For a new file, write `/Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/condescending-gauss-9686e8/__mocks__/heroui-native.tsx`:

```tsx
import React from 'react';
import { View, Pressable, Text } from 'react-native';

/** Minimal mock for heroui-native — satisfies Sheet tests. */

export const cn = (...args: (string | undefined | null | false)[]) =>
  args.filter(Boolean).join(' ');

export function useBottomSheetAwareHandlers() {
  return { onFocus: jest.fn(), onBlur: jest.fn() };
}

function BottomSheetRoot({
  children,
  isOpen,
  onOpenChange: _onOpenChange,
}: {
  children?: React.ReactNode;
  isOpen?: boolean;
  onOpenChange?: (v: boolean) => void;
}) {
  if (!isOpen) return null;
  return <View testID="heroui-bottom-sheet">{children}</View>;
}

function Portal({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

function Overlay({ isCloseOnPress, onPress }: { isCloseOnPress?: boolean; onPress?: () => void }) {
  return (
    <Pressable
      testID="heroui-bottom-sheet-overlay"
      onPress={isCloseOnPress !== false ? onPress : undefined}
    />
  );
}

function Content({ children }: { children?: React.ReactNode }) {
  return <View testID="heroui-bottom-sheet-content">{children}</View>;
}

function Close({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable testID="heroui-bottom-sheet-close" onPress={onPress} accessibilityLabel="Close" />
  );
}

function Title({ children }: { children?: React.ReactNode }) {
  return <Text testID="heroui-bottom-sheet-title">{children}</Text>;
}

function Description({ children }: { children?: React.ReactNode }) {
  return <Text testID="heroui-bottom-sheet-description">{children}</Text>;
}

function Trigger({ children, asChild }: { children?: React.ReactNode; asChild?: boolean }) {
  if (asChild) return <>{children}</>;
  return <View>{children}</View>;
}

export const BottomSheet = Object.assign(BottomSheetRoot, {
  Portal,
  Overlay,
  Content,
  Close,
  Title,
  Description,
  Trigger,
});
```

- [ ] **Step 5: Run the full test suite to confirm no regressions**

```bash
npm test -- --ci 2>&1 | tail -30
```

Expected: all existing tests pass. Any new failures here are mock-related regressions — diagnose before proceeding.

- [ ] **Step 6: Commit**

```bash
git add __mocks__/@gorhom/bottom-sheet.tsx __mocks__/heroui-native.tsx
git commit -m "test(mocks): extend gorhom mock + add heroui-native BottomSheet mock (Wave 1)"
```

---

### Task 5: Rebuild `components/ui/confirm_sheet.tsx` on new primitive (Q2 resolution)

**Files:**
- Modify: `components/ui/confirm_sheet.tsx`

Q2 from the spec: the `busy`-state no-op guard is explicitly carried forward. When `busy=true`, `onOpenChange` must be a no-op so the sheet cannot be closed (same semantics as the legacy `onClose={() => {}}` guard).

- [ ] **Step 1: Read the current `confirm_sheet.tsx`**

Read `/Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/condescending-gauss-9686e8/components/ui/confirm_sheet.tsx` to understand the current props and layout before rewriting.

- [ ] **Step 2: Rewrite `confirm_sheet.tsx`**

Replace the entire file with the HeroUI-backed version:

```tsx
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/bottom_sheet';
import { Text } from '@/components/ui/text';

interface ConfirmSheetProps {
  isOpen: boolean;
  /**
   * Called on ALL close paths (swipe, overlay, close button, programmatic).
   * When busy=true this is a no-op — the sheet cannot be closed.
   */
  onOpenChange: (open: boolean) => void;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}

export function ConfirmSheet({
  isOpen,
  onOpenChange,
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  busy = false,
}: ConfirmSheetProps) {
  // Q2 guard: when busy, suppress all close paths so the sheet stays open
  // while an async operation is in flight. Same semantics as the legacy
  // onClose={() => {}} guard — now applied to all-path onOpenChange.
  const handleOpenChange = (open: boolean) => {
    if (busy) return;
    onOpenChange(open);
    if (!open) onCancel();
  };

  return (
    <Sheet isOpen={isOpen} onOpenChange={handleOpenChange} title={title} size="sm">
      <View className="gap-4 px-4 pb-6">
        <Text className="font-inter text-muted text-[15px] leading-6">{body}</Text>
        <View style={{ flexDirection: 'row' }} className="gap-3">
          <View style={{ flex: 1 }}>
            <Button variant="ghost" label={cancelLabel} onPress={onCancel} isDisabled={busy} />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              variant="primary"
              label={confirmLabel}
              isLoading={busy}
              isDisabled={busy}
              onPress={onConfirm}
            />
          </View>
        </View>
      </View>
    </Sheet>
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck 2>&1 | grep "confirm_sheet" | head -20
```

Expected: no errors.

- [ ] **Step 4: Lint + format**

```bash
npx oxlint --type-aware components/ui/confirm_sheet.tsx
npx oxfmt components/ui/confirm_sheet.tsx
```

Expected: 0 errors, file formatted.

- [ ] **Step 5: Commit**

```bash
git add components/ui/confirm_sheet.tsx
git commit -m "refactor(sheets): rebuild ConfirmSheet on bottom_sheet primitive (Wave 1)"
```

---

### Task 6: Update `ConfirmSheet` callers (`skip_confirm_sheet.tsx` + `deactivate_sheet.tsx`)

Both callers used the legacy `visible`/`onClose`/`onCancel` API. They must be updated to the new `isOpen`/`onOpenChange`/`onCancel` API.

**Files:**
- Modify: `screens/commitments/detail/components/skip_confirm_sheet.tsx`
- Modify: `screens/commitments/edit_commitment/components/deactivate_sheet.tsx`

- [ ] **Step 1: Read both files before editing**

Read `screens/commitments/detail/components/skip_confirm_sheet.tsx` and `screens/commitments/edit_commitment/components/deactivate_sheet.tsx` to understand their current prop drilling before making changes.

- [ ] **Step 2: Update `skip_confirm_sheet.tsx`**

Pattern: rename `visible` → `isOpen`, `onClose`/`onCancel` → pass through `onOpenChange` and `onCancel` separately to the new `ConfirmSheet` API. The parent already passes a setter function — map it cleanly.

Change pattern (adapt to actual file content read in Step 1):

```tsx
// Before
<ConfirmSheet visible={visible} onClose={onCancel} onCancel={onCancel} ... />

// After
<ConfirmSheet
  isOpen={isOpen}
  onOpenChange={(open) => { if (!open) onCancel(); }}
  onCancel={onCancel}
  ...
/>
```

Note: `ConfirmSheet.handleOpenChange` already calls `onCancel()` internally when `!open && !busy`. Verify whether the caller's `onOpenChange` wrapper duplicates this — if so, simplify to `onOpenChange={setIsOpen}` and let `ConfirmSheet` own the `onCancel` call. Read the parent's state management to decide.

- [ ] **Step 3: Update `deactivate_sheet.tsx`**

Same rename pattern as Step 2.

- [ ] **Step 4: Typecheck both files**

```bash
npm run typecheck 2>&1 | grep -E "skip_confirm|deactivate_sheet" | head -20
```

Expected: no errors.

- [ ] **Step 5: Lint + format both files**

```bash
npx oxlint --type-aware \
  screens/commitments/detail/components/skip_confirm_sheet.tsx \
  screens/commitments/edit_commitment/components/deactivate_sheet.tsx
npx oxfmt \
  screens/commitments/detail/components/skip_confirm_sheet.tsx \
  screens/commitments/edit_commitment/components/deactivate_sheet.tsx
```

- [ ] **Step 6: Confirm `sheet.tsx` is still untouched**

```bash
git diff -- components/ui/sheet.tsx
```

Expected: empty. The legacy wrapper must remain byte-identical throughout Wave 1.

- [ ] **Step 7: Commit**

```bash
git add \
  screens/commitments/detail/components/skip_confirm_sheet.tsx \
  screens/commitments/edit_commitment/components/deactivate_sheet.tsx
git commit -m "refactor(sheets): update ConfirmSheet callers to isOpen/onOpenChange API (Wave 1)"
```

---

### Task 7: Wave 1 — CI parity + PR

**Files:** none (verification + PR).

- [ ] **Step 1: Run the full CI-parity chain**

```bash
npm run format:check \
  && npm run lint \
  && npm run typecheck \
  && npm test -- --ci \
  && npx --yes expo-doctor \
  && npx expo prebuild --no-install --platform android \
  && test -d android \
  && echo "✓ Wave 1 CI parity green — safe to push"
```

Expected: ends with `✓ Wave 1 CI parity green — safe to push`. Fix any failure, re-run from the top, repeat until green. Never push with a failing step.

- [ ] **Step 2: Push the branch**

```bash
git push -u origin refactor/bottomsheet-wave1
```

- [ ] **Step 3: Open the PR**

```bash
gh pr create \
  --title "refactor(sheets): Wave 1 — new bottom_sheet primitive + ConfirmSheet" \
  --body "$(cat <<'EOF'
## Summary
- Creates `components/ui/bottom_sheet.tsx` — new HeroUI-backed Sheet primitive with `isOpen`/`onOpenChange` API. `components/ui/sheet.tsx` is NOT touched.
- Exports: `Sheet`, `SheetProps`, `SHEET_FOOTER_CLEARANCE`, `resolveSnapPoints` (pure function, testable), `useBottomSheetAwareHandlers` (re-export from heroui-native).
- Rebuilds `components/ui/confirm_sheet.tsx` on the new primitive with explicit Q2 `busy`-guard on `onOpenChange`.
- Updates two ConfirmSheet callers: `skip_confirm_sheet.tsx`, `deactivate_sheet.tsx`.
- Rewrites `sheet_snap_points.test.ts` as pure function call test against `resolveSnapPoints`.
- Extends `__mocks__/@gorhom/bottom-sheet.tsx` with `BottomSheetTextInput` stub.
- Adds `__mocks__/heroui-native.tsx` with `BottomSheet` compound mock + `useBottomSheetAwareHandlers` no-op.

Spec: `docs/superpowers/specs/2026-05-26-bottomsheet-migration-design.md`
Plan: `docs/superpowers/plans/2026-05-26-bottomsheet-migration.md`

## Test plan
- [ ] CI parity green (format, lint, typecheck, jest --ci, expo-doctor, android prebuild dry-run)
- [ ] 🛑 Device QA (user-walked): ConfirmSheet via skip commitment flow — overlay press closes, swipe closes, close button works, busy state blocks all dismiss paths
- [ ] 🛑 Device QA (user-walked): ConfirmSheet via deactivate commitment flow — same matrix
- [ ] 🛑 Device QA (user-walked): all 11 un-migrated sheets still work correctly (legacy sheet.tsx untouched)
EOF
)"
```

- [ ] **Step 4: Request code review**

Invoke `superpowers:requesting-code-review` with @tariq's lens. Tariq approves and merges on the user's behalf per autonomous-team workflow.

🛑 **HARD GATE:** Do not begin Wave 2 until the user has walked the Wave 1 device-QA matrix and confirmed it passes.

---

## Wave 2 — Shared Pickers

**What ships:** `components/sheets/account_picker_sheet.tsx` and `components/sheets/category_picker_sheet.tsx` moved from `screens/transactions/transaction_form/components/`, generalized for all 3 consumers each. Six import-path changes across callers.

**Sequencing dependency:** Requires `components/ui/bottom_sheet.tsx` from Wave 1 (merged). Do not start until Wave 1 PR is merged.

---

### Task 0: Worktree setup (Wave 2)

Same as Wave 1 Task 0. If the symlink already exists from Wave 1, this is a no-op.

- [ ] **Step 1: Ensure node_modules symlink and expo-env.d.ts**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/condescending-gauss-9686e8
test -e node_modules || ln -s ../../../node_modules node_modules
test -f expo-env.d.ts || printf '/// <reference types="expo/types" />\n' > expo-env.d.ts
echo "worktree ok"
```

---

### Task 1: Branch setup (Wave 2)

- [ ] **Step 1: Cut feature branch from main (post Wave 1 merge)**

```bash
git fetch origin main
git checkout -b refactor/bottomsheet-wave2 origin/main
```

---

### Task 2: Create `components/sheets/` directory and move pickers

**Files:**
- Create (directory): `components/sheets/`
- Create: `components/sheets/account_picker_sheet.tsx` (moved + updated from `screens/transactions/transaction_form/components/account_picker_sheet.tsx`)
- Create: `components/sheets/category_picker_sheet.tsx` (moved + updated from `screens/transactions/transaction_form/components/category_picker_sheet.tsx`)
- Delete: `screens/transactions/transaction_form/components/account_picker_sheet.tsx`
- Delete: `screens/transactions/transaction_form/components/category_picker_sheet.tsx`

- [ ] **Step 1: Read both source picker files**

Read `screens/transactions/transaction_form/components/account_picker_sheet.tsx` and `screens/transactions/transaction_form/components/category_picker_sheet.tsx` in full before editing.

- [ ] **Step 2: Move and update `account_picker_sheet.tsx`**

Create `components/sheets/account_picker_sheet.tsx`. The content is the source file with:
- Import path for `Sheet` changed: `from '@/components/ui/sheet'` → `from '@/components/ui/bottom_sheet'`
- Props renamed: `visible` → `isOpen`, `onClose` → `onOpenChange`

No other logic changes.

- [ ] **Step 3: Move and update `category_picker_sheet.tsx`**

Same treatment: create `components/sheets/category_picker_sheet.tsx` with the import path and prop name updates.

- [ ] **Step 4: Delete the source files**

```bash
git rm screens/transactions/transaction_form/components/account_picker_sheet.tsx
git rm screens/transactions/transaction_form/components/category_picker_sheet.tsx
```

- [ ] **Step 5: Typecheck both new files**

```bash
npm run typecheck 2>&1 | grep -E "account_picker|category_picker" | head -20
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add components/sheets/
git commit -m "refactor(sheets): move+generalize account/category pickers to components/sheets/ (Wave 2)"
```

---

### Task 3: Update 6 import paths in picker callers

**Files (account picker — 3 callers):**
- Modify: `screens/transactions/transaction_form/index.tsx` (2 call sites)
- Modify: `screens/commitments/components/commitment_form_body.tsx`
- Modify: `screens/commitments/detail/components/pay_sheet.tsx`

**Files (category picker — 3 callers):**
- Modify: `screens/transactions/transaction_form/index.tsx` (already touched above)
- Modify: `screens/commitments/components/commitment_form_body.tsx` (already touched above)
- Modify: `screens/budget/components/set_budget_sheet.tsx`

- [ ] **Step 1: Update import paths in all callers**

For each file listed: change `from '@/screens/transactions/transaction_form/components/account_picker_sheet'` → `from '@/components/sheets/account_picker_sheet'` and same for `category_picker_sheet`.

Also rename any prop `visible` → `isOpen` and `onClose` → `onOpenChange` at the call sites where the picker is used — the pickers' new API uses the new names.

- [ ] **Step 2: Typecheck all modified callers**

```bash
npm run typecheck 2>&1 | grep -E "transaction_form|commitment_form_body|pay_sheet|set_budget" | head -30
```

Expected: no errors.

- [ ] **Step 3: Lint + format all modified files**

```bash
npx oxlint --type-aware \
  screens/transactions/transaction_form/index.tsx \
  screens/commitments/components/commitment_form_body.tsx \
  screens/commitments/detail/components/pay_sheet.tsx \
  screens/budget/components/set_budget_sheet.tsx
npx oxfmt \
  screens/transactions/transaction_form/index.tsx \
  screens/commitments/components/commitment_form_body.tsx \
  screens/commitments/detail/components/pay_sheet.tsx \
  screens/budget/components/set_budget_sheet.tsx
```

- [ ] **Step 4: Verify no remaining imports from the deleted source paths**

```bash
grep -rn "transaction_form/components/account_picker_sheet\|transaction_form/components/category_picker_sheet" \
  screens/ components/ app/ 2>/dev/null
```

Expected: no output. Any hit means a caller was missed.

- [ ] **Step 5: Commit**

```bash
git add \
  screens/transactions/transaction_form/index.tsx \
  screens/commitments/components/commitment_form_body.tsx \
  screens/commitments/detail/components/pay_sheet.tsx \
  screens/budget/components/set_budget_sheet.tsx
git commit -m "refactor(sheets): update 6 picker import paths to components/sheets/ (Wave 2)"
```

---

### Task 4: Wave 2 — CI parity + PR

- [ ] **Step 1: Run the full CI-parity chain**

```bash
npm run format:check \
  && npm run lint \
  && npm run typecheck \
  && npm test -- --ci \
  && npx --yes expo-doctor \
  && npx expo prebuild --no-install --platform android \
  && test -d android \
  && echo "✓ Wave 2 CI parity green — safe to push"
```

- [ ] **Step 2: Push the branch**

```bash
git push -u origin refactor/bottomsheet-wave2
```

- [ ] **Step 3: Open the PR**

```bash
gh pr create \
  --title "refactor(sheets): Wave 2 — shared picker kit" \
  --body "$(cat <<'EOF'
## Summary
- Moves `AccountPickerSheet` and `CategoryPickerSheet` from `screens/transactions/transaction_form/components/` to `components/sheets/` (shared home for 3+ consumer components).
- Both pickers updated to import `Sheet` from `@/components/ui/bottom_sheet` and use `isOpen`/`onOpenChange` API.
- Updates 6 import paths across: `transaction_form/index.tsx`, `commitment_form_body.tsx`, `pay_sheet.tsx`, `set_budget_sheet.tsx`.
- `components/ui/sheet.tsx` remains untouched — 9 sheets still on legacy.

Spec: `docs/superpowers/specs/2026-05-26-bottomsheet-migration-design.md`
Plan: `docs/superpowers/plans/2026-05-26-bottomsheet-migration.md`

## Test plan
- [ ] CI parity green
- [ ] 🛑 Device QA: AccountPickerSheet — transaction form (from/to), commitment form, pay sheet; overlay closes, swipe closes
- [ ] 🛑 Device QA: CategoryPickerSheet — transaction form (expense/income), commitment form, set budget sheet
- [ ] 🛑 Device QA: all remaining un-migrated sheets still work (legacy sheet.tsx untouched)
EOF
)"
```

- [ ] **Step 4: Request code review + merge**

🛑 **HARD GATE:** Do not begin Wave 3 until the user has walked the Wave 2 device-QA matrix.

---

## Wave 3 — Transactions Sheets

**What ships:** `date_range_sheet.tsx`, `filter/index.tsx`, `transaction_form/index.tsx`, `amount_hero.tsx`, `transaction_form_body.tsx` migrated to `bottom_sheet.tsx`. Wire `useBottomSheetAwareHandlers` on any input inside a sheet.

**Open question Q4 baked here:** Stacked-sheet validation (transaction form → account picker, transaction form → category picker) is explicitly in the device-QA matrix for this wave.

**Sequencing dependency:** Requires Wave 1 merged (for `bottom_sheet.tsx`). Wave 2 must also be merged so the picker imports from `components/sheets/` are the correct source-of-truth.

---

### Task 0: Worktree setup (Wave 3)

- [ ] **Step 1: Ensure node_modules symlink and expo-env.d.ts**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/condescending-gauss-9686e8
test -e node_modules || ln -s ../../../node_modules node_modules
test -f expo-env.d.ts || printf '/// <reference types="expo/types" />\n' > expo-env.d.ts
echo "worktree ok"
```

---

### Task 1: Branch setup (Wave 3)

- [ ] **Step 1: Cut feature branch from main (post Wave 2 merge)**

```bash
git fetch origin main
git checkout -b refactor/bottomsheet-wave3 origin/main
```

---

### Task 2: Migrate transactions sheets

**Files:**
- Modify: `screens/transactions/components/date_range_sheet.tsx`
- Modify: `screens/transactions/filter/index.tsx`
- Modify: `screens/transactions/transaction_form/index.tsx`
- Modify: `screens/transactions/transaction_form/components/amount_hero.tsx`
- Modify: `screens/transactions/transaction_form/components/transaction_form_body.tsx`

- [ ] **Step 1: Read all five files before editing**

Read each file in full to understand their current `Sheet` usage, snap size/points, scrollable/footer usage, and any direct `BottomSheetTextInput`/`BottomSheetScrollView` usage.

- [ ] **Step 2: Migrate `date_range_sheet.tsx`**

Change pattern:
- Import: `from '@/components/ui/sheet'` → `from '@/components/ui/bottom_sheet'`
- Props: `visible` → `isOpen`, `onClose` → `onOpenChange`
- Preserve `size`/`snapPoints` values exactly.

- [ ] **Step 3: Migrate `filter/index.tsx`**

Same import and prop rename. This sheet uses `SHEET_FOOTER_CLEARANCE` and `BottomSheetScrollView` — preserve the clearance import from `bottom_sheet` and the `BottomSheetScrollView` import from `@gorhom/bottom-sheet` (unchanged). Add `scrollable={true}` to the Sheet if it uses `BottomSheetScrollView` inside.

- [ ] **Step 4: Migrate `transaction_form/index.tsx`**

Same pattern. This sheet opens nested pickers (AccountPickerSheet, CategoryPickerSheet) — those are now imported from `@/components/sheets/` (already updated in Wave 2). Verify the import paths are correct post-Wave 2.

- [ ] **Step 5: Migrate `amount_hero.tsx`**

This component uses `BottomSheetTextInput` from `@gorhom/bottom-sheet` directly. Keep that import unchanged. Additionally wire `useBottomSheetAwareHandlers`:

```tsx
import { useBottomSheetAwareHandlers } from '@/components/ui/bottom_sheet';

// Inside the component:
const { onFocus, onBlur } = useBottomSheetAwareHandlers();

// On the input:
<BottomSheetTextInput ... onFocus={onFocus} onBlur={onBlur} />
```

- [ ] **Step 6: Migrate `transaction_form_body.tsx`**

This component uses `BottomSheetScrollView` from `@gorhom/bottom-sheet` directly — keep that import unchanged. No `Sheet` import to change here unless the component itself renders a `Sheet`. Read the file (Step 1) to confirm.

- [ ] **Step 7: Typecheck all 5 files**

```bash
npm run typecheck 2>&1 | grep -E "date_range|filter/index|transaction_form|amount_hero|form_body" | head -30
```

Expected: no errors.

- [ ] **Step 8: Lint + format all 5 files**

```bash
npx oxlint --type-aware \
  screens/transactions/components/date_range_sheet.tsx \
  screens/transactions/filter/index.tsx \
  screens/transactions/transaction_form/index.tsx \
  screens/transactions/transaction_form/components/amount_hero.tsx \
  screens/transactions/transaction_form/components/transaction_form_body.tsx
npx oxfmt \
  screens/transactions/components/date_range_sheet.tsx \
  screens/transactions/filter/index.tsx \
  screens/transactions/transaction_form/index.tsx \
  screens/transactions/transaction_form/components/amount_hero.tsx \
  screens/transactions/transaction_form/components/transaction_form_body.tsx
```

- [ ] **Step 9: Verify no remaining legacy sheet imports in transactions screens**

```bash
grep -rn "from '@/components/ui/sheet'" screens/transactions/ 2>/dev/null
```

Expected: no output. Any hit is a missed file.

- [ ] **Step 10: Update any affected test import paths**

```bash
grep -rn "transactions" __tests__/ 2>/dev/null | grep -v ".test.ts" | head -10
```

Check if any test file imports a path that moved. Update import paths only — logic unchanged.

- [ ] **Step 11: Commit**

```bash
git add \
  screens/transactions/components/date_range_sheet.tsx \
  screens/transactions/filter/index.tsx \
  screens/transactions/transaction_form/index.tsx \
  screens/transactions/transaction_form/components/amount_hero.tsx \
  screens/transactions/transaction_form/components/transaction_form_body.tsx
git commit -m "refactor(sheets): migrate transactions sheets to bottom_sheet primitive (Wave 3)"
```

---

### Task 3: Wave 3 — CI parity + PR

- [ ] **Step 1: Run the full CI-parity chain**

```bash
npm run format:check \
  && npm run lint \
  && npm run typecheck \
  && npm test -- --ci \
  && npx --yes expo-doctor \
  && npx expo prebuild --no-install --platform android \
  && test -d android \
  && echo "✓ Wave 3 CI parity green — safe to push"
```

- [ ] **Step 2: Push and open PR**

```bash
git push -u origin refactor/bottomsheet-wave3
gh pr create \
  --title "refactor(sheets): Wave 3 — transactions sheets" \
  --body "$(cat <<'EOF'
## Summary
- Migrates `date_range_sheet.tsx`, `filter/index.tsx`, `transaction_form/index.tsx`, `amount_hero.tsx`, `transaction_form_body.tsx` to `@/components/ui/bottom_sheet`.
- `visible`/`onClose` → `isOpen`/`onOpenChange` at all call sites.
- `amount_hero.tsx`: wires `useBottomSheetAwareHandlers()` onto the amount input (`onFocus`/`onBlur`) to fix keyboard gap.
- Legacy `sheet.tsx` still serves 6 un-migrated sheets (accounts, budget, commitments, dashboard, settings).

Spec: `docs/superpowers/specs/2026-05-26-bottomsheet-migration-design.md`
Plan: `docs/superpowers/plans/2026-05-26-bottomsheet-migration.md`

## Test plan
- [ ] CI parity green
- [ ] 🛑 Device QA: date range picker — opens, date selection, overlay close, swipe close
- [ ] 🛑 Device QA: filter sheet — multi-accordion, scroll inside, footer CTA, overlay close
- [ ] 🛑 Device QA: transaction form sheet — keyboard on amount field, footer CTA flush to keyboard
- [ ] 🛑 Device QA (Q4 stacked sheets): transaction form → account picker → back to form; form → category picker → back; no gesture conflict
- [ ] 🛑 Device QA: add transaction full flow end-to-end
- [ ] 🛑 Device QA: edit transaction full flow end-to-end
EOF
)"
```

- [ ] **Step 3: Request code review + merge**

🛑 **HARD GATE:** Do not begin Wave 4 until the user has walked the Wave 3 device-QA matrix, specifically including the stacked-sheet (Q4) flows.

---

## Wave 4 — Accounts / Budget / Commitments / Dashboard / Settings Sheets

**What ships:** The remaining 6 single-consumer sheets migrated to `bottom_sheet.tsx`.

**Sequencing dependency:** Requires Waves 1 and 2 merged. Independent of Wave 3 — but for cleanliness, wait for Wave 3 to merge so `main` stays linear.

---

### Task 0: Worktree setup (Wave 4)

- [ ] **Step 1: Ensure node_modules symlink and expo-env.d.ts**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/condescending-gauss-9686e8
test -e node_modules || ln -s ../../../node_modules node_modules
test -f expo-env.d.ts || printf '/// <reference types="expo/types" />\n' > expo-env.d.ts
echo "worktree ok"
```

---

### Task 1: Branch setup (Wave 4)

- [ ] **Step 1: Cut feature branch from main (post Wave 3 merge)**

```bash
git fetch origin main
git checkout -b refactor/bottomsheet-wave4 origin/main
```

---

### Task 2: Migrate the 6 remaining single-consumer sheets

**Files:**
- Modify: `screens/accounts/detail/components/adjust_balance_sheet.tsx`
- Modify: `screens/budget/components/set_budget_sheet.tsx`
- Modify: `screens/commitments/detail/components/pay_sheet.tsx`
- Modify: `screens/dashboard/components/net_worth_breakdown_sheet.tsx`
- Modify: `screens/settings/categories/components/add_edit_category_sheet.tsx`
- Modify: `screens/settings/categories/components/reassign_category_sheet.tsx`

- [ ] **Step 1: Read all 6 files before editing**

Read each file to understand current `Sheet` usage, `SHEET_FOOTER_CLEARANCE`, snap sizes, `scrollable` or `BottomSheetScrollView`/`BottomSheetFlatList` usage.

- [ ] **Step 2: Migrate `adjust_balance_sheet.tsx`**

Import path + prop rename. No `SHEET_FOOTER_CLEARANCE` — check the file. Preserve `size`/`snapPoints`.

- [ ] **Step 3: Migrate `set_budget_sheet.tsx`**

Import path + prop rename. CategoryPickerSheet is now imported from `@/components/sheets/category_picker_sheet` (Wave 2 moved it). If the import here still points to the old path, update it.

- [ ] **Step 4: Migrate `pay_sheet.tsx`**

Import path + prop rename. Uses `SHEET_FOOTER_CLEARANCE` — import that from `@/components/ui/bottom_sheet`. AccountPickerSheet is imported from `@/components/sheets/account_picker_sheet` (Wave 2). Confirm.

- [ ] **Step 5: Migrate `net_worth_breakdown_sheet.tsx`**

Import path + prop rename. Uses `BottomSheetScrollView` — add `scrollable={true}` to the Sheet if needed.

- [ ] **Step 6: Migrate `add_edit_category_sheet.tsx`**

Import path + prop rename. Uses `SHEET_FOOTER_CLEARANCE` and `BottomSheetScrollView` — import clearance from `bottom_sheet`, add `scrollable={true}`.

- [ ] **Step 7: Migrate `reassign_category_sheet.tsx`**

Import path + prop rename. Uses `SHEET_FOOTER_CLEARANCE` and `BottomSheetFlatList` — import clearance from `bottom_sheet`, add `scrollable={true}`.

- [ ] **Step 8: Typecheck all 6 files**

```bash
npm run typecheck 2>&1 | grep -E "adjust_balance|set_budget|pay_sheet|net_worth|add_edit_category|reassign_category" | head -30
```

Expected: no errors.

- [ ] **Step 9: Lint + format all 6 files**

```bash
npx oxlint --type-aware \
  screens/accounts/detail/components/adjust_balance_sheet.tsx \
  screens/budget/components/set_budget_sheet.tsx \
  screens/commitments/detail/components/pay_sheet.tsx \
  screens/dashboard/components/net_worth_breakdown_sheet.tsx \
  screens/settings/categories/components/add_edit_category_sheet.tsx \
  screens/settings/categories/components/reassign_category_sheet.tsx
npx oxfmt \
  screens/accounts/detail/components/adjust_balance_sheet.tsx \
  screens/budget/components/set_budget_sheet.tsx \
  screens/commitments/detail/components/pay_sheet.tsx \
  screens/dashboard/components/net_worth_breakdown_sheet.tsx \
  screens/settings/categories/components/add_edit_category_sheet.tsx \
  screens/settings/categories/components/reassign_category_sheet.tsx
```

- [ ] **Step 10: Verify zero remaining consumers of legacy `sheet.tsx`**

```bash
grep -rn "from '@/components/ui/sheet'" screens/ components/ app/ 2>/dev/null
```

Expected: no output. This is the confirmation that Wave 4 completes the migration of all consumers.

- [ ] **Step 11: Update affected test import paths**

Check and update import paths (not logic) in:
- `__tests__/add_edit_category_sheet.state.test.ts`
- `__tests__/adjust_balance_sheet.state.test.ts`
- `__tests__/reassign_category_sheet.state.test.ts`
- `__tests__/screens/commitments_pay_sheet.hook.test.ts`
- `__tests__/screens/accounts/adjust_balance_validation.test.ts`

```bash
grep -n "from.*sheet" \
  __tests__/add_edit_category_sheet.state.test.ts \
  __tests__/adjust_balance_sheet.state.test.ts \
  __tests__/reassign_category_sheet.state.test.ts \
  __tests__/screens/commitments_pay_sheet.hook.test.ts \
  __tests__/screens/accounts/adjust_balance_validation.test.ts 2>/dev/null
```

Update any path that points to a file that moved. Logic of every test is unchanged.

- [ ] **Step 12: Commit**

```bash
git add \
  screens/accounts/detail/components/adjust_balance_sheet.tsx \
  screens/budget/components/set_budget_sheet.tsx \
  screens/commitments/detail/components/pay_sheet.tsx \
  screens/dashboard/components/net_worth_breakdown_sheet.tsx \
  screens/settings/categories/components/add_edit_category_sheet.tsx \
  screens/settings/categories/components/reassign_category_sheet.tsx
git commit -m "refactor(sheets): migrate accounts/budget/commitments/dashboard/settings sheets (Wave 4)"
```

If any test import paths changed, stage those too before committing:

```bash
git add __tests__/
git commit -m "test(sheets): update import paths for Wave 4 migrated sheets"
```

---

### Task 3: Wave 4 — CI parity + PR

- [ ] **Step 1: Run the full CI-parity chain**

```bash
npm run format:check \
  && npm run lint \
  && npm run typecheck \
  && npm test -- --ci \
  && npx --yes expo-doctor \
  && npx expo prebuild --no-install --platform android \
  && test -d android \
  && echo "✓ Wave 4 CI parity green — safe to push"
```

- [ ] **Step 2: Push and open PR**

```bash
git push -u origin refactor/bottomsheet-wave4
gh pr create \
  --title "refactor(sheets): Wave 4 — accounts / budget / commitments / dashboard / settings sheets" \
  --body "$(cat <<'EOF'
## Summary
- Migrates remaining 6 single-consumer sheets to `@/components/ui/bottom_sheet`.
- `visible`/`onClose` → `isOpen`/`onOpenChange` at all call sites.
- `SHEET_FOOTER_CLEARANCE` re-imported from `bottom_sheet` where needed.
- After this PR, `components/ui/sheet.tsx` has zero consumers and is ready for deletion in Wave 5.

Spec: `docs/superpowers/specs/2026-05-26-bottomsheet-migration-design.md`
Plan: `docs/superpowers/plans/2026-05-26-bottomsheet-migration.md`

## Test plan
- [ ] CI parity green
- [ ] 🛑 Device QA: adjust balance sheet — keyboard avoidance, overlay close
- [ ] 🛑 Device QA: set budget sheet — category picker nested inside, footer CTA
- [ ] 🛑 Device QA: pay commitment sheet — account picker nested inside, scroll, footer CTA
- [ ] 🛑 Device QA: net worth breakdown sheet — scroll inside, swipe close
- [ ] 🛑 Device QA: add/edit category sheet — scroll, footer CTA, keyboard on name field
- [ ] 🛑 Device QA: reassign category sheet — FlatList scroll, footer CTA
EOF
)"
```

- [ ] **Step 3: Request code review + merge**

🛑 **HARD GATE:** Do not begin Wave 5 until the user has walked the Wave 4 device-QA matrix.

---

## Wave 5 — Cleanup

**What ships:** Delete `components/ui/sheet.tsx` (zero consumers), `git mv components/ui/bottom_sheet.tsx → components/ui/sheet.tsx`, mechanical import-path cleanup across all migrated files, snap test import update, CLAUDE.md "Bottom Sheets" section update.

**Sequencing dependency:** All four preceding waves must be merged before Wave 5 begins.

---

### Task 0: Worktree setup (Wave 5)

- [ ] **Step 1: Ensure node_modules symlink and expo-env.d.ts**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/condescending-gauss-9686e8
test -e node_modules || ln -s ../../../node_modules node_modules
test -f expo-env.d.ts || printf '/// <reference types="expo/types" />\n' > expo-env.d.ts
echo "worktree ok"
```

---

### Task 1: Branch setup (Wave 5)

- [ ] **Step 1: Cut feature branch from main (all prior waves merged)**

```bash
git fetch origin main
git checkout -b refactor/bottomsheet-wave5 origin/main
```

---

### Task 2: Confirm zero consumers of legacy `sheet.tsx`

- [ ] **Step 1: Verify zero consumers**

```bash
grep -rn "from '@/components/ui/sheet'" screens/ components/ app/ __tests__/ 2>/dev/null
```

Expected: no output. If any hits appear, a wave was incomplete — do not proceed until they are resolved.

- [ ] **Step 2: Confirm `bottom_sheet.tsx` exists**

```bash
ls components/ui/bottom_sheet.tsx && echo "exists"
```

Expected: `exists`. This is the file being promoted.

---

### Task 3: Delete legacy `sheet.tsx` and promote `bottom_sheet.tsx`

**Files:**
- Delete: `components/ui/sheet.tsx`
- Rename: `components/ui/bottom_sheet.tsx` → `components/ui/sheet.tsx`

- [ ] **Step 1: Delete the legacy file**

```bash
git rm components/ui/sheet.tsx
```

- [ ] **Step 2: Rename via `git mv`**

```bash
git mv components/ui/bottom_sheet.tsx components/ui/sheet.tsx
```

- [ ] **Step 3: Commit the delete + rename**

```bash
git commit -m "refactor(sheets): delete legacy sheet.tsx + promote bottom_sheet.tsx → sheet.tsx (Wave 5)"
```

---

### Task 4: Mechanical import-path cleanup

Replace every `@/components/ui/bottom_sheet` import with `@/components/ui/sheet` across the codebase. This is a pure search-and-replace — no logic changes.

**Files affected (expected):**
- `components/ui/confirm_sheet.tsx`
- `components/sheets/account_picker_sheet.tsx`
- `components/sheets/category_picker_sheet.tsx`
- All 12 migrated screen sheets

- [ ] **Step 1: Find all `bottom_sheet` imports**

```bash
grep -rn "from '@/components/ui/bottom_sheet'" \
  components/ screens/ app/ __tests__/ 2>/dev/null
```

Record every file returned. This is the full update set.

- [ ] **Step 2: Replace in all files**

For each file from Step 1: change `from '@/components/ui/bottom_sheet'` → `from '@/components/ui/sheet'`. No other changes.

- [ ] **Step 3: Verify zero remaining `bottom_sheet` imports**

```bash
grep -rn "bottom_sheet" components/ screens/ app/ __tests__/ 2>/dev/null
```

Expected: no output (the file `components/ui/bottom_sheet.tsx` no longer exists; no imports remain).

- [ ] **Step 4: Update `sheet_snap_points.test.ts` import**

In `__tests__/components/ui/sheet_snap_points.test.ts`, change:

```ts
import { resolveSnapPoints } from '@/components/ui/bottom_sheet';
```

to:

```ts
import { resolveSnapPoints } from '@/components/ui/sheet';
```

- [ ] **Step 5: Typecheck the entire project**

```bash
npm run typecheck
```

Expected: PASS. Any error here is a missed import path — diagnose and fix.

- [ ] **Step 6: Commit**

```bash
git add -u
git commit -m "refactor(sheets): update all bottom_sheet imports → sheet after Wave 5 rename (Wave 5)"
```

---

### Task 5: Update CLAUDE.md "Bottom Sheets" section

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Read the current "Bottom Sheets" section in CLAUDE.md**

Read `CLAUDE.md` and locate the "Bottom Sheets" section, specifically the "Migration note" paragraph that reads: `Migration note: components/ui/sheet.tsx (the legacy hand-rolled @gorhom wrapper with declarative visible/onClose) is non-conforming and slated to migrate...`

- [ ] **Step 2: Update the section**

Remove the migration note paragraph entirely. Replace it with a note that the migration is complete and all sheets now use HeroUI `BottomSheet` via the `Sheet` wrapper at `components/ui/sheet.tsx`. Preserve all other content in the section (the usage example, the scrollable rule, the keyboard-aware input rule, the `SHEET_FOOTER_CLEARANCE` note).

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md Bottom Sheets — migration complete, remove legacy note (Wave 5)"
```

---

### Task 6: Wave 5 — CI parity + PR

- [ ] **Step 1: Run the full CI-parity chain**

```bash
npm run format:check \
  && npm run lint \
  && npm run typecheck \
  && npm test -- --ci \
  && npx --yes expo-doctor \
  && npx expo prebuild --no-install --platform android \
  && test -d android \
  && echo "✓ Wave 5 CI parity green — safe to push"
```

- [ ] **Step 2: Push and open PR**

```bash
git push -u origin refactor/bottomsheet-wave5
gh pr create \
  --title "refactor(sheets): Wave 5 — delete legacy sheet.tsx + promote to canonical path" \
  --body "$(cat <<'EOF'
## Summary
- Deletes `components/ui/sheet.tsx` (legacy hand-rolled `@gorhom/bottom-sheet` wrapper — zero consumers after Wave 4).
- Promotes `components/ui/bottom_sheet.tsx` → `components/ui/sheet.tsx` via `git mv`.
- Mechanically updates all `@/components/ui/bottom_sheet` imports to `@/components/ui/sheet` (no logic changes).
- Updates `sheet_snap_points.test.ts` import path.
- Updates CLAUDE.md "Bottom Sheets" section: removes migration note, confirms the `Sheet` wrapper at `components/ui/sheet.tsx` is the canonical path going forward.

Post-Wave-5 state: `Sheet` at `components/ui/sheet.tsx` is a thin HeroUI-backed primitive. The legacy gorhom-direct wrapper no longer exists anywhere in the codebase.

Spec: `docs/superpowers/specs/2026-05-26-bottomsheet-migration-design.md`
Plan: `docs/superpowers/plans/2026-05-26-bottomsheet-migration.md`

## Test plan
- [ ] CI parity green
- [ ] 🛑 Full-app device QA (user-walked): walk ALL sheets in the app
  - [ ] ConfirmSheet: skip commitment, deactivate commitment
  - [ ] AccountPickerSheet: transaction form, commitment form, pay sheet
  - [ ] CategoryPickerSheet: transaction form, commitment form, set budget
  - [ ] Date range picker
  - [ ] Filter sheet
  - [ ] Transaction form sheet (keyboard, footer, stacked pickers)
  - [ ] Adjust balance sheet
  - [ ] Set budget sheet
  - [ ] Pay commitment sheet
  - [ ] Net worth breakdown sheet
  - [ ] Add/edit category sheet
  - [ ] Reassign category sheet
EOF
)"
```

- [ ] **Step 3: Request code review + merge**

🛑 **HARD GATE:** This wave's device-QA gate is a full-app sheet walk. Every sheet must be exercised. Do not merge until the user confirms the full matrix.

---

## Self-review checklist

- [x] Two-file coexistence model: `sheet.tsx` untouched through Waves 1–4; `bottom_sheet.tsx` created in Wave 1; Wave 5 deletes + renames.
- [x] No shim anywhere in the plan.
- [x] Q1 resolved: `sheet_snap_points.test.ts` rewritten in Wave 1 Task 3, importing from `bottom_sheet.tsx`.
- [x] Q2 resolved: `busy`-guard explicitly carried forward in Wave 1 Task 5 `ConfirmSheet` rewrite.
- [x] Q4 resolved: stacked-sheet (transaction form → picker) QA explicitly in Wave 3 device-QA matrix.
- [x] CI parity chain runs once per wave before push, using the exact 6-job command from CLAUDE.md.
- [x] No `.tsx` render tests written anywhere.
- [x] All 12 legacy Sheet consumers and the ConfirmSheet caller are accounted for across waves.
- [x] Wave 5 import-path cleanup verified by grep step before commit.
- [x] Each wave has a hard gate before the next wave starts.
- [x] Worktree symlink setup is the first task of every wave.
