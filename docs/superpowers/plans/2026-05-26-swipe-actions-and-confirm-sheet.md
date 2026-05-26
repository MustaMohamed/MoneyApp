# Swipe Actions Standard + Destructive ConfirmSheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a shared `SwipeableRow` component and a `destructive` variant for `ConfirmSheet`, then adopt them in the transactions, commitments, and budget lists so every list row exposes consistent swipe-left edit/delete actions gated by proper confirmation sheets.

**Architecture:** A module-level singleton registry (`swipeable_row_registry.ts`) tracks the currently-open row id and closes the previous row when a new one opens — this is the only shared state, keeping `SwipeableRow` itself a pure presentational wrapper around `ReanimatedSwipeable`. Each adoption PR wraps the existing row component in `SwipeableRow`, passes `actions`, and co-locates a per-list confirm-sheet state file; no existing row body logic changes. The budget adoption PR is the only one that also removes the inline "Remove" link from `set_budget_sheet.tsx` — it ships alongside Spec 2 (budget visual redesign) in a single PR.

**Tech Stack:** `ReanimatedSwipeable` from `react-native-gesture-handler` (already installed, no new native dep), `expo-haptics` (already installed ~55.0.14), `react-native-reanimated` v4, Zustand v5, HeroUI Native `BottomSheet` (via existing `Sheet` wrapper), TypeScript strict.

---

## Implementation notes before you start

### SectionList, not FlashList

The spec (§5.4) warns about FlashList recycling. **The actual transactions and commitments screens both use `SectionList` from `react-native`, not FlashList.** The budget screen uses a plain `.map`. The recycling risk is lower with `SectionList` (it does not aggressively recycle cell instances the way FlashList does), but the one-open-at-a-time registry still needs to key off stable item ids — rows can be unmounted and remounted as the section scrolls. The discipline is the same: the open row id lives in the registry module, not in component-local state, so a remounted row that re-reads the registry will find itself closed.

### Commitment "delete" = `deactivateCommitment`

The commitment store exposes `deactivateCommitment(id: string)`, not a hard-delete. The swipe "Delete" action label maps to this mutation. Use `Strings.commitmentsDeactivateTitle` / `commitmentsDeactivateBody` / `commitmentsDeactivateConfirm` / `commitmentsDeactivateCancel` for the confirm copy (already in `constants/strings.ts`).

### Budget adoption is a coordination PR (Spec 2)

Wave 4 (budget swipe wiring) ships in the **same PR** as the budget visual redesign (Spec 2). This plan covers only the swipe/confirm wiring of the budget row. Do not implement the ring, colour bands, or row layout changes — those are planned separately under Spec 2. The coordination point: when you write `category_budget_row.tsx` changes in Wave 4, leave a `// TODO(spec2): wrap with SwipeableRow already done — ring/layout lands here` comment so Spec 2's implementer knows the SwipeableRow wrapping is already present.

### Token reference

```ts
// From constants/theme.ts — use these, never hardcode hex
Colors.dark.surfaceEl   // Edit tile bg
Colors.dark.text1       // Edit tile icon/label colour
Colors.shared.transferBlue  // Skip tile bg
Colors.dark.negative    // Delete tile bg (white icon/label on this)
Colors.dark.dangerBg    // ConfirmSheet destructive icon circle bg
Colors.dark.negative    // ConfirmSheet destructive icon colour
```

Action tile label colour for Delete: `'#FFFFFF'` (white) is correct per spec D7. Use `style={{ color: '#FFFFFF' }}` only for Delete tile — this is a semantic white-on-red, not a theme token. For Edit and Skip tiles, use token colours.

---

## File Map

### New files

| File | Responsibility |
|------|---------------|
| `components/ui/swipeable_row.tsx` | `SwipeableRow` component — wraps `ReanimatedSwipeable`, renders action tiles, wires registry |
| `utils/swipeable_row_registry.ts` | Module-level singleton: tracks open row id, exposes `open(id)` / `close(id)` / `closeAll()` / `subscribe(cb)` |
| `utils/use_confirm_action.hook.ts` | Shared hook: confirm/cancel gate with busy state — consumed by all three adoption screens |
| `__tests__/swipeable_row_registry.test.ts` | Registry logic unit tests |
| `__tests__/use_confirm_action.hook.test.ts` | Real unit tests for the confirm gate: fires on confirm, not on cancel, no double-invoke while busy, busy clears on rejection |
| `screens/transactions/components/tx_delete_confirm_sheet.tsx` | Thin wrapper: `ConfirmSheet` destructive for tx delete |
| `screens/commitments/components/commitment_delete_confirm_sheet.tsx` | Thin wrapper: `ConfirmSheet` destructive for commitment deactivate |
| `screens/budget/components/budget_delete_confirm_sheet.tsx` | Thin wrapper: `ConfirmSheet` destructive for budget remove |

### Modified files

| File | Change |
|------|--------|
| `components/ui/confirm_sheet.tsx` | Add `destructive?: boolean` prop — trash icon + danger button path |
| `screens/transactions/detail/components/delete_confirm_dialog.tsx` | Replace `ConfirmDialog` with `ConfirmSheet` destructive |
| `screens/transactions/components/transaction_row.tsx` | Wrap in `SwipeableRow` with Edit + Delete actions |
| `screens/transactions/index.tsx` | Consume `useConfirmAction` for list-delete; add `onScrollBeginDrag` |
| `screens/commitments/components/commitment_row.tsx` | Wrap in `SwipeableRow` with Skip + Edit + Delete actions |
| `screens/commitments/index.tsx` | Consume `useConfirmAction` for list-delete; add `onScrollBeginDrag` |
| `screens/budget/components/category_budget_row.tsx` | Wrap in `SwipeableRow` with Edit + Delete actions |
| `screens/budget/index.tsx` | Consume `useConfirmAction` for list-delete; add `useFocusEffect` blur close |
| `screens/budget/components/set_budget_sheet.tsx` | Remove the inline "Remove" `Pressable` (lines 191–201) |
| `constants/strings.ts` | Add swipe action labels + per-list confirm copy |
| `screens/transactions/transactions.hook.ts` | Add `goToEdit(id)` if missing (mirrors `goToDetail`) |
| `__tests__/budget.store.test.ts` | Add `removeBudget` signature smoke test |
| `__tests__/transaction.store.test.ts` | Add `deleteTransaction` signature smoke test |
| `__tests__/commitment.store.test.ts` | Add `deactivateCommitment` signature smoke test |

---

## Wave 1 — Foundation: Registry + `SwipeableRow` + `ConfirmSheet` destructive + Strings

No screen behaviour changes in this wave. All new files; one modified file (`confirm_sheet.tsx`); strings added.

---

### Task 1.1 — Add strings

**Files:**
- Modify: `constants/strings.ts`

- [ ] **Step 1: Add the new string keys**

Open `constants/strings.ts` and append the following keys inside the `Strings` object, after the last existing key (`addTxEgpPreview`):

```ts
  // Swipe actions — shared labels
  swipeEdit: 'Edit',
  swipeDelete: 'Delete',
  swipeSkip: 'Skip',

  // Budget — swipe delete confirm
  budgetDeleteConfirmTitle: 'Remove budget?',
  budgetDeleteConfirmBody: (name: string) =>
    `This stops tracking the limit for ${name}. Your transactions and spending history are kept.`,
  budgetDeleteConfirmConfirm: 'Remove',
  budgetDeleteConfirmCancel: 'Cancel',

  // Transactions — swipe/list delete confirm
  // Note: deleteConfirmTitle, deleteConfirmBody, deleteTransaction, deleteCancel already exist
  // for the detail screen. Reuse them for the list-delete ConfirmSheet (same copy, consistent).

  // Commitments — swipe delete confirm
  // Note: commitmentsDeactivateTitle, commitmentsDeactivateBody, commitmentsDeactivateConfirm,
  // commitmentsDeactivateCancel already exist. Reuse them — same action, same copy.
```

- [ ] **Step 2: Verify TypeScript is happy**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm run typecheck 2>&1 | tail -5
```

Expected: no errors (or same pre-existing errors as before — zero new ones).

- [ ] **Step 3: Commit**

```bash
git add constants/strings.ts
git commit -m "feat(swipe): add swipe action + confirm copy to Strings"
```

---

### Task 1.2 — Registry module (TDD)

**Files:**
- Create: `utils/swipeable_row_registry.ts`
- Create: `__tests__/swipeable_row_registry.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/swipeable_row_registry.test.ts`:

```ts
import {
  closeRow,
  closeAllRows,
  openRow,
  subscribeToRegistry,
} from '@/utils/swipeable_row_registry';

// Reset module state between tests
beforeEach(() => {
  closeAllRows();
});

describe('swipeable_row_registry', () => {
  it('openRow sets the active id', () => {
    let captured: string | null = 'SENTINEL';
    const unsub = subscribeToRegistry((id) => { captured = id; });
    openRow('row-1');
    expect(captured).toBe('row-1');
    unsub();
  });

  it('opening a second row notifies subscribers with the new id', () => {
    const ids: (string | null)[] = [];
    const unsub = subscribeToRegistry((id) => ids.push(id));
    openRow('row-1');
    openRow('row-2');
    // subscriber receives each new open
    expect(ids).toEqual(['row-1', 'row-2']);
    unsub();
  });

  it('closeRow with the active id notifies subscribers with null', () => {
    let captured: string | null = 'SENTINEL';
    const unsub = subscribeToRegistry((id) => { captured = id; });
    openRow('row-1');
    captured = 'SENTINEL'; // reset after open
    closeRow('row-1');
    expect(captured).toBeNull();
    unsub();
  });

  it('closeRow with a non-active id is a no-op (no notification)', () => {
    openRow('row-1');
    let notified = false;
    const unsub = subscribeToRegistry(() => { notified = true; });
    closeRow('row-2'); // row-2 is not active
    expect(notified).toBe(false);
    unsub();
  });

  it('closeAllRows sets active id to null and notifies', () => {
    openRow('row-1');
    let captured: string | null = 'SENTINEL';
    const unsub = subscribeToRegistry((id) => { captured = id; });
    closeAllRows();
    expect(captured).toBeNull();
    unsub();
  });

  it('unsubscribe prevents further notifications', () => {
    const ids: (string | null)[] = [];
    const unsub = subscribeToRegistry((id) => ids.push(id));
    openRow('row-1');
    unsub();
    openRow('row-2');
    expect(ids).toEqual(['row-1']); // row-2 not received
  });

  it('multiple subscribers each receive notifications', () => {
    const a: (string | null)[] = [];
    const b: (string | null)[] = [];
    const unsubA = subscribeToRegistry((id) => a.push(id));
    const unsubB = subscribeToRegistry((id) => b.push(id));
    openRow('row-x');
    unsubA();
    unsubB();
    expect(a).toEqual(['row-x']);
    expect(b).toEqual(['row-x']);
  });
});
```

- [ ] **Step 2: Run tests and confirm they fail**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm test -- --testPathPattern="swipeable_row_registry" --no-coverage 2>&1 | tail -20
```

Expected: FAIL — `Cannot find module '@/utils/swipeable_row_registry'`

- [ ] **Step 3: Implement the registry**

Create `utils/swipeable_row_registry.ts`:

```ts
/**
 * Module-level singleton tracking the currently-open SwipeableRow.
 *
 * Design: plain pub/sub with no React dependency. Components subscribe on
 * mount and unsubscribe on unmount. Opening a row notifies all subscribers
 * with the new id; closing notifies with null. Components compare the
 * notified id with their own rowId to decide whether to close.
 *
 * Why not Zustand? The registry is called synchronously from gesture
 * callbacks and Reanimated worklets — Zustand's async setState would
 * introduce frame-level jank. A plain module variable is instantaneous.
 */

type Subscriber = (activeId: string | null) => void;

let activeRowId: string | null = null;
const subscribers = new Set<Subscriber>();

function notify(id: string | null): void {
  subscribers.forEach((cb) => cb(id));
}

/** Mark row `id` as open. Notifies all subscribers. */
export function openRow(id: string): void {
  activeRowId = id;
  notify(id);
}

/**
 * Mark row `id` as closed. No-op if `id` is not the currently-open row
 * (prevents a row from closing another row that opened after it).
 */
export function closeRow(id: string): void {
  if (activeRowId !== id) return;
  activeRowId = null;
  notify(null);
}

/** Close whichever row is open, if any. Used on scroll / screen blur. */
export function closeAllRows(): void {
  if (activeRowId === null) return;
  activeRowId = null;
  notify(null);
}

/**
 * Subscribe to registry changes. Callback receives the new active row id
 * (or null when closed). Returns an unsubscribe function.
 */
export function subscribeToRegistry(cb: Subscriber): () => void {
  subscribers.add(cb);
  return () => { subscribers.delete(cb); };
}

/** Read the current active row id (for non-reactive imperative checks). */
export function getActiveRowId(): string | null {
  return activeRowId;
}
```

- [ ] **Step 4: Run tests and confirm they pass**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm test -- --testPathPattern="swipeable_row_registry" --no-coverage 2>&1 | tail -10
```

Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add utils/swipeable_row_registry.ts __tests__/swipeable_row_registry.test.ts
git commit -m "feat(swipe): registry module for one-open-at-a-time row tracking"
```

---

### Task 1.3 — `ConfirmSheet` destructive variant

**Files:**
- Modify: `components/ui/confirm_sheet.tsx`

- [ ] **Step 1: Read the current file**

Read `components/ui/confirm_sheet.tsx` in full before editing. The current interface has no `destructive` prop. The icon is hardcoded to `alert-circle-outline` with `warningBg` circle and `warning` colour. The confirm button uses `variant="primary"`.

- [ ] **Step 2: Add the `destructive` prop and branch the icon + button**

Replace the entire file content with:

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { View } from 'react-native';

import { Sheet } from '@/components/ui/bottom_sheet';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Colors, FontFamily, Spacing, Type } from '@/constants/theme';
import { ms } from '@/utils/responsive';

const ICON_CONTAINER_SIZE = ms(56);
const ICON_SIZE = ms(28);

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
  /**
   * When true: trash-can icon in dangerBg circle + danger (red) confirm button.
   * Default false — retains the existing amber warning-circle + primary button.
   * Existing callers (commitments SkipConfirmSheet) are untouched because they
   * do not pass this prop.
   */
  destructive?: boolean;
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
  destructive = false,
}: ConfirmSheetProps) {
  const handleOpenChange = (open: boolean) => {
    if (busy) return;
    onOpenChange(open);
  };

  const iconContainerBg = destructive ? Colors.dark.dangerBg : Colors.dark.warningBg;
  const iconColor = destructive ? Colors.dark.negative : Colors.dark.warning;
  const iconName = destructive ? 'trash-can-outline' : 'alert-circle-outline';

  return (
    <Sheet isOpen={isOpen} onOpenChange={handleOpenChange} fitContent>
      <View
        className="items-center"
        style={{ paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, paddingBottom: Spacing.lg }}
      >
        {/* Icon in tinted circular container — warning (amber) or danger (red) */}
        <View
          style={{
            width: ICON_CONTAINER_SIZE,
            height: ICON_CONTAINER_SIZE,
            borderRadius: ICON_CONTAINER_SIZE / 2,
            backgroundColor: iconContainerBg,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: Spacing.md,
          }}
        >
          <MaterialCommunityIcons name={iconName} size={ICON_SIZE} color={iconColor} />
        </View>

        {/* Title — Sora semibold, centered */}
        <Text
          style={{
            fontFamily: FontFamily.soraSemi,
            fontSize: Type.subhead,
            textAlign: 'center',
            marginBottom: Spacing.xs,
          }}
          className="text-foreground"
        >
          {title}
        </Text>

        {/* Body — Inter, muted, centered */}
        <Text
          style={{
            fontFamily: FontFamily.interRegular,
            fontSize: Type.body,
            textAlign: 'center',
            lineHeight: Type.body * 1.5,
          }}
          className="text-muted"
        >
          {body}
        </Text>

        {/* Cancel / Confirm button row */}
        <View style={{ flexDirection: 'row', marginTop: Spacing.lg }} className="gap-3">
          <View style={{ flex: 1 }}>
            <Button variant="ghost" label={cancelLabel} onPress={onCancel} isDisabled={busy} />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              variant={destructive ? 'danger' : 'primary'}
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

- [ ] **Step 3: Type-check**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm run typecheck 2>&1 | tail -5
```

Expected: no new errors.

- [ ] **Step 4: Verify existing callers compile**

The only existing caller is `screens/commitments/detail/components/skip_confirm_sheet.tsx`. It does not pass `destructive`, so it defaults to `false` and is untouched. Typecheck above covers this.

- [ ] **Step 5: Commit**

```bash
git add components/ui/confirm_sheet.tsx
git commit -m "feat(swipe): add destructive variant to ConfirmSheet"
```

---

### Task 1.4 — `SwipeableRow` component

**Files:**
- Create: `components/ui/swipeable_row.tsx`

This component wraps `ReanimatedSwipeable` from `react-native-gesture-handler`. It is a presentational wrapper — all interaction state lives in the registry module from Task 1.2.

- [ ] **Step 1: Create the component**

```tsx
/**
 * SwipeableRow — shared swipe-actions primitive.
 *
 * Team Law 7 justification: HeroUI Native has no Swipeable/SwipeActions
 * primitive. This wraps an in-stack library (react-native-gesture-handler's
 * ReanimatedSwipeable) exactly as bottom_sheet.tsx wraps @gorhom/bottom-sheet.
 *
 * Usage:
 *   <SwipeableRow rowId={tx.id} actions={[editAction, deleteAction]}>
 *     <TransactionRow … />
 *   </SwipeableRow>
 *
 * - actions[0] renders closest to the row body (rightmost tile visually when
 *   the row is swiped left), actions[last] furthest away.
 * - Tile width = ACTION_TILE_WIDTH per action; total reveal = actions.length * tile width.
 * - disabled=true prevents the gesture (use while a mutation is in flight).
 * - accessibilityLabel describes the row for the a11y actions rotor.
 */

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useRef } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type ReanimatedSwipeableType from 'react-native-gesture-handler/ReanimatedSwipeable';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';

import { Colors, Spacing, Type, FontFamily } from '@/constants/theme';
import { ms } from '@/utils/responsive';
import {
  closeAllRows,
  closeRow,
  openRow,
  subscribeToRegistry,
} from '@/utils/swipeable_row_registry';

type MaterialIconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export interface SwipeAction {
  key: string;
  /** User-visible label from Strings. Shown under the icon. */
  label: string;
  icon: MaterialIconName;
  /** Visual intent drives tile background and text/icon colour. */
  variant: 'neutral' | 'info' | 'destructive';
  onPress: () => void;
}

export interface SwipeableRowProps {
  children: React.ReactNode;
  actions: SwipeAction[];
  /** Stable id for the one-open-at-a-time registry. Defaults to a random id. */
  rowId?: string;
  /** Disables the swipe gesture (e.g. while a mutation is in flight). */
  disabled?: boolean;
  /** Describes the row to screen readers for the accessibilityActions menu. */
  accessibilityLabel?: string;
}

const ACTION_TILE_WIDTH = ms(72);

function tileBg(variant: SwipeAction['variant']): string {
  switch (variant) {
    case 'neutral':
      return Colors.dark.surfaceEl;
    case 'info':
      return Colors.shared.transferBlue;
    case 'destructive':
      return Colors.dark.negative;
  }
}

function tileIconColor(variant: SwipeAction['variant']): string {
  if (variant === 'neutral') return Colors.dark.text1;
  return '#FFFFFF'; // info (blue) and destructive (red) both use white
}

function tileLabelColor(variant: SwipeAction['variant']): string {
  if (variant === 'neutral') return Colors.dark.text1;
  return '#FFFFFF';
}

let _idCounter = 0;
function genId(): string {
  _idCounter += 1;
  return `swipeable-row-${_idCounter}`;
}

export function SwipeableRow({
  children,
  actions,
  rowId: rowIdProp,
  disabled = false,
  accessibilityLabel,
}: SwipeableRowProps): React.ReactElement {
  const rowId = useRef(rowIdProp ?? genId()).current;
  const swipeableRef = useRef<ReanimatedSwipeableType>(null);
  const totalWidth = actions.length * ACTION_TILE_WIDTH;

  // Close this row programmatically when the registry says another row opened
  useEffect(() => {
    const unsub = subscribeToRegistry((activeId) => {
      if (activeId !== rowId && activeId !== null) {
        swipeableRef.current?.close();
      }
      // null means closeAll — also close this row
      if (activeId === null) {
        swipeableRef.current?.close();
      }
    });
    return unsub;
  }, [rowId]);

  const handleSwipeOpen = useCallback(() => {
    openRow(rowId);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [rowId]);

  const handleSwipeClose = useCallback(() => {
    closeRow(rowId);
  }, [rowId]);

  const handleActionPress = useCallback(
    (action: SwipeAction) => {
      swipeableRef.current?.close();
      closeRow(rowId);
      action.onPress();
    },
    [rowId],
  );

  const renderRightActions = useCallback(
    (_progress: unknown, _drag: unknown) => (
      <View style={{ width: totalWidth, flexDirection: 'row' }}>
        {actions.map((action) => (
          <Pressable
            key={action.key}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            onPress={() => handleActionPress(action)}
            style={{
              width: ACTION_TILE_WIDTH,
              backgroundColor: tileBg(action.variant),
              alignItems: 'center',
              justifyContent: 'center',
              gap: Spacing.xxs,
            }}
          >
            <MaterialCommunityIcons
              name={action.icon}
              size={ms(22)}
              color={tileIconColor(action.variant)}
            />
            <Animated.Text
              style={{
                fontFamily: FontFamily.interMedium,
                fontSize: Type.micro,
                color: tileLabelColor(action.variant),
              }}
            >
              {action.label}
            </Animated.Text>
          </Pressable>
        ))}
      </View>
    ),
    [actions, handleActionPress, totalWidth],
  );

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      enabled={!disabled}
      renderRightActions={renderRightActions}
      rightThreshold={ACTION_TILE_WIDTH * 0.4}
      onSwipeableOpen={handleSwipeOpen}
      onSwipeableClose={handleSwipeClose}
      overshootRight={false}
      friction={2}
      accessibilityLabel={accessibilityLabel}
      accessibilityActions={actions.map((a) => ({ name: a.key, label: a.label }))}
      onAccessibilityAction={(event) => {
        const action = actions.find((a) => a.key === event.nativeEvent.actionName);
        if (action) handleActionPress(action);
      }}
    >
      {children}
    </ReanimatedSwipeable>
  );
}

/** Convenience: close all open rows (call from list onScrollBeginDrag). */
export { closeAllRows };
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm run typecheck 2>&1 | tail -10
```

Expected: no new errors. If `ReanimatedSwipeable` import path gives a type error, use `import ReanimatedSwipeable from 'react-native-gesture-handler/src/components/ReanimatedSwipeable'` — check what works against the installed version.

- [ ] **Step 3: Lint**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm run lint -- --quiet 2>&1 | grep -E "swipeable_row|error" | head -20
```

Expected: no errors on the new file.

- [ ] **Step 4: Commit**

```bash
git add components/ui/swipeable_row.tsx
git commit -m "feat(swipe): SwipeableRow component — RNGH ReanimatedSwipeable wrapper"
```

---

### Task 1.5 — `useConfirmAction` hook (TDD)

**Files:**
- Create: `utils/use_confirm_action.hook.ts`
- Create: `__tests__/use_confirm_action.hook.test.ts`

This hook is the real gate between "user pressed Delete tile" and "store mutation runs". It owns the `pendingPayload` + `busy` state and the confirm/cancel logic. All three adoption screens consume it instead of duplicating the same boilerplate. Because it is a pure logic hook with no UI, it is fully testable without render tests.

- [ ] **Step 1: Write the failing tests**

Create `__tests__/use_confirm_action.hook.test.ts`:

```ts
import { act, renderHook } from '@testing-library/react-native';

import { useConfirmAction } from '@/utils/use_confirm_action.hook';

describe('useConfirmAction', () => {
  it('starts with no pending payload and not busy', () => {
    const { result } = renderHook(() => useConfirmAction<string>(jest.fn()));
    expect(result.current.pendingPayload).toBeNull();
    expect(result.current.busy).toBe(false);
  });

  it('request() sets pendingPayload', () => {
    const { result } = renderHook(() => useConfirmAction<string>(jest.fn()));
    act(() => { result.current.request('tx-42'); });
    expect(result.current.pendingPayload).toBe('tx-42');
  });

  it('cancel() clears pendingPayload without calling action', () => {
    const action = jest.fn();
    const { result } = renderHook(() => useConfirmAction<string>(action));
    act(() => { result.current.request('tx-42'); });
    act(() => { result.current.cancel(); });
    expect(result.current.pendingPayload).toBeNull();
    expect(action).not.toHaveBeenCalled();
  });

  it('confirm() calls action with pendingPayload exactly once, then clears pending', async () => {
    const action = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useConfirmAction<string>(action));
    act(() => { result.current.request('tx-42'); });
    await act(async () => { await result.current.confirm(); });
    expect(action).toHaveBeenCalledTimes(1);
    expect(action).toHaveBeenCalledWith('tx-42');
    expect(result.current.pendingPayload).toBeNull();
  });

  it('confirm() sets busy=true during action, busy=false after', async () => {
    let resolveFn!: () => void;
    const action = jest.fn(
      () => new Promise<void>((res) => { resolveFn = res; }),
    );
    const { result } = renderHook(() => useConfirmAction<string>(action));
    act(() => { result.current.request('tx-99'); });

    // Start confirm — do not await yet
    let confirmPromise: Promise<void>;
    act(() => { confirmPromise = result.current.confirm(); });
    expect(result.current.busy).toBe(true);

    // Resolve the async action
    await act(async () => {
      resolveFn();
      await confirmPromise;
    });
    expect(result.current.busy).toBe(false);
  });

  it('confirm() while already busy does NOT invoke action a second time', async () => {
    let resolveFn!: () => void;
    const action = jest.fn(
      () => new Promise<void>((res) => { resolveFn = res; }),
    );
    const { result } = renderHook(() => useConfirmAction<string>(action));
    act(() => { result.current.request('tx-1'); });

    let p1: Promise<void>;
    act(() => { p1 = result.current.confirm(); });

    // Second confirm while busy — must be a no-op
    act(() => { void result.current.confirm(); });

    await act(async () => {
      resolveFn();
      await p1;
    });

    expect(action).toHaveBeenCalledTimes(1);
  });

  it('confirm() when action rejects still clears busy and clears pending', async () => {
    const action = jest.fn().mockRejectedValue(new Error('db error'));
    const { result } = renderHook(() => useConfirmAction<string>(action));
    act(() => { result.current.request('tx-bad'); });

    await act(async () => {
      try { await result.current.confirm(); } catch { /* expected */ }
    });

    expect(result.current.busy).toBe(false);
    expect(result.current.pendingPayload).toBeNull();
  });

  it('confirm() is a no-op when pendingPayload is null', async () => {
    const action = jest.fn();
    const { result } = renderHook(() => useConfirmAction<string>(action));
    // No request() called — pendingPayload is null
    await act(async () => { await result.current.confirm(); });
    expect(action).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests and confirm they fail**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm test -- --testPathPattern="use_confirm_action" --no-coverage 2>&1 | tail -15
```

Expected: FAIL — `Cannot find module '@/utils/use_confirm_action.hook'`

- [ ] **Step 3: Implement the hook**

Create `utils/use_confirm_action.hook.ts`:

```ts
import { useCallback, useState } from 'react';

/**
 * useConfirmAction — shared confirm/cancel gate for destructive swipe actions.
 *
 * Owns three pieces of state:
 *   pendingPayload — the item id (or any typed payload) waiting for confirmation.
 *                    null means no action is pending (sheet should be closed).
 *   busy           — true while the async action is in flight; gates the sheet
 *                    from being dismissed and prevents double-invocation.
 *
 * Usage:
 *   const { pendingPayload, busy, request, confirm, cancel } =
 *     useConfirmAction<string>((id) => deleteTransaction(id));
 *
 *   // User taps Delete tile:
 *   onDelete={() => request(tx.id)}
 *
 *   // ConfirmSheet:
 *   <ConfirmSheet
 *     isOpen={pendingPayload !== null}
 *     busy={busy}
 *     onConfirm={confirm}
 *     onCancel={cancel}
 *   />
 *
 * @param action - async function that receives the pending payload and performs
 *                 the mutation. Called exactly once per confirm(); never called
 *                 on cancel() or when pendingPayload is null.
 */
export function useConfirmAction<T>(action: (payload: T) => Promise<void>) {
  const [pendingPayload, setPendingPayload] = useState<T | null>(null);
  const [busy, setBusy] = useState(false);

  const request = useCallback((payload: T) => {
    setPendingPayload(payload);
  }, []);

  const cancel = useCallback(() => {
    setPendingPayload(null);
  }, []);

  const confirm = useCallback(async () => {
    // Guard: no pending payload — nothing to confirm
    if (pendingPayload === null) return;
    // Guard: already in flight — prevent double-invoke
    if (busy) return;

    setBusy(true);
    try {
      await action(pendingPayload);
    } finally {
      // Always clear state, even on rejection — sheet must not stay stuck
      setBusy(false);
      setPendingPayload(null);
    }
  }, [action, pendingPayload, busy]);

  return { pendingPayload, busy, request, confirm, cancel };
}
```

- [ ] **Step 4: Run tests and confirm they pass**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm test -- --testPathPattern="use_confirm_action" --no-coverage 2>&1 | tail -10
```

Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add utils/use_confirm_action.hook.ts __tests__/use_confirm_action.hook.test.ts
git commit -m "feat(swipe): useConfirmAction hook — tested confirm/cancel gate for swipe delete"
```

---

### Task 1.6 — Run full CI parity check

Wave 1 is complete. Verify the full suite before pushing.

- [ ] **Step 1: Run CI parity**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && \
  npm run format:check \
  && npm run lint \
  && npm run typecheck \
  && npm test -- --ci \
  && npx --yes expo-doctor \
  && npx expo prebuild --no-install --platform android \
  && test -d android \
  && echo "CI parity green"
```

Expected: all six steps pass, final line prints `CI parity green`.

- [ ] **Step 2: Push Wave 1 PR**

```bash
git push origin feat/swipe-actions-standard
```

Open a PR titled "feat(swipe): Wave 1 — Foundation (SwipeableRow + ConfirmSheet destructive + registry + useConfirmAction)". This PR has no visible behaviour change — safe to merge independently.

---

## Wave 2 — Adoption: Transactions

Wraps `TransactionRow` in `SwipeableRow`. Migrates `delete_confirm_dialog.tsx` from `ConfirmDialog` to `ConfirmSheet`. Adds list-delete trigger from the swipe action.

---

### Task 2.1 — Smoke-test `deleteTransaction` signature

**Files:**
- Modify: `__tests__/transaction.store.test.ts`

The confirm/cancel gate logic is fully proven in `__tests__/use_confirm_action.hook.test.ts` (Task 1.5). What belongs here is a lightweight smoke test confirming the store mutation exists with the expected signature — so a future refactor that renames or removes `deleteTransaction` breaks a named test, not a silent type error.

- [ ] **Step 1: Read `__tests__/transaction.store.test.ts` to find the existing setup**

Note how the db mock and store reset are wired (e.g. `beforeEach` that calls `useTransactionStore.setState(initialState)` or similar).

- [ ] **Step 2: Add the smoke test**

Append inside the existing `describe` block (or add a new `describe('deleteTransaction mutation')`):

```ts
it('deleteTransaction exists and is a function on the store', () => {
  const { deleteTransaction } = useTransactionStore.getState();
  expect(typeof deleteTransaction).toBe('function');
});
```

This is intentionally minimal — it is a refactor-guard, not a behaviour test. The behaviour test lives in `use_confirm_action.hook.test.ts`.

- [ ] **Step 3: Run tests**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm test -- --testPathPattern="transaction.store" --no-coverage 2>&1 | tail -10
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add __tests__/transaction.store.test.ts
git commit -m "test(swipe): smoke-test deleteTransaction signature in transaction store"
```

---

### Task 2.2 — Migrate `delete_confirm_dialog.tsx` → `ConfirmSheet`

**Files:**
- Modify: `screens/transactions/detail/components/delete_confirm_dialog.tsx`

The existing component wraps `ConfirmDialog`. Replace it with `ConfirmSheet` (destructive) so list-delete and detail-delete share identical UI.

- [ ] **Step 1: Replace the implementation**

```tsx
import React from 'react';

import { ConfirmSheet } from '@/components/ui/confirm_sheet';
import { Strings } from '@/constants/strings';

interface Props {
  isOpen: boolean;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Destructive ConfirmSheet for transaction deletion — used by both the
 * transaction detail screen (existing) and the swipe-list action (new).
 * Migrated from ConfirmDialog to ConfirmSheet per the swipe-actions spec §6.1.
 */
export function DeleteConfirmDialog({
  isOpen,
  busy,
  onCancel,
  onConfirm,
}: Props): React.ReactElement {
  return (
    <ConfirmSheet
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
      busy={busy}
      destructive
      title={Strings.deleteConfirmTitle}
      body={Strings.deleteConfirmBody}
      confirmLabel={Strings.deleteTransaction}
      cancelLabel={Strings.deleteCancel}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
```

Note the prop rename: the existing caller passes `visible` but this new version accepts `isOpen`. Check the detail screen's usage of this component.

- [ ] **Step 2: Find and fix the prop name at the call site**

```bash
grep -rn "DeleteConfirmDialog" /Users/musta/Code/projects/practice/MoneyApp/screens/ --include="*.tsx" --include="*.ts"
```

For each call site found, rename `visible={…}` to `isOpen={…}`.

- [ ] **Step 3: Type-check**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm run typecheck 2>&1 | tail -5
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add screens/transactions/detail/components/delete_confirm_dialog.tsx
git commit -m "feat(swipe): migrate DeleteConfirmDialog from ConfirmDialog to ConfirmSheet"
```

---

### Task 2.3 — `tx_delete_confirm_sheet.tsx` (thin list-delete wrapper)

**Files:**
- Create: `screens/transactions/components/tx_delete_confirm_sheet.tsx`

This is a separate thin wrapper for the swipe-list delete path so the list and detail both use `DeleteConfirmDialog` — or this can re-export `DeleteConfirmDialog` from the detail components. The cleanest approach: import and re-export from detail, since the component is already generalised.

- [ ] **Step 1: Create the re-export shim**

```tsx
/**
 * Re-exports the transaction delete confirm sheet for use from the
 * transactions list swipe action. Both list and detail now use the same
 * underlying ConfirmSheet so the UI is identical on both surfaces.
 */
export { DeleteConfirmDialog as TxDeleteConfirmSheet } from '@/screens/transactions/detail/components/delete_confirm_dialog';
```

- [ ] **Step 2: Commit**

```bash
git add screens/transactions/components/tx_delete_confirm_sheet.tsx
git commit -m "feat(swipe): add TxDeleteConfirmSheet shim for list-swipe delete"
```

---

### Task 2.4 — Wrap `TransactionRow` in `SwipeableRow`

**Files:**
- Modify: `screens/transactions/components/transaction_row.tsx`
- Modify: `screens/transactions/index.tsx` (add `onScrollBeginDrag` + delete sheet state)

The row body (`Pressable + Animated.View`) is untouched. `SwipeableRow` wraps the entire return.

- [ ] **Step 1: Update `transaction_row.tsx`**

The `TransactionRow` component currently returns a `Pressable` directly. Wrap it:

```tsx
// Add to imports
import { SwipeableRow, type SwipeAction } from '@/components/ui/swipeable_row';
import { Strings } from '@/constants/strings';

// Update Props interface — add action callbacks
interface Props {
  tx: Transaction;
  account?: Account;
  toAccount?: Account;
  category?: Category;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

// Inside the component, define actions:
const actions: SwipeAction[] = [
  {
    key: 'edit',
    label: Strings.swipeEdit,
    icon: 'pencil-outline',
    variant: 'neutral',
    onPress: onEdit,
  },
  {
    key: 'delete',
    label: Strings.swipeDelete,
    icon: 'trash-can-outline',
    variant: 'destructive',
    onPress: onDelete,
  },
];

// Wrap the return:
return (
  <SwipeableRow
    rowId={tx.id}
    actions={actions}
    accessibilityLabel={`${title}, ${nativeText}`}
  >
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View style={[animStyle]} className="border-separator border-b px-4 py-3">
        {/* …existing body unchanged… */}
      </Animated.View>
    </Pressable>
  </SwipeableRow>
);
```

Keep the `Pressable` + `Animated.View` body **exactly as-is** (copy from the current file — do not restructure the interior).

- [ ] **Step 2: Update the call site in `screens/transactions/index.tsx`**

Use `useConfirmAction` — no hand-rolled pending/busy state. Add `onScrollBeginDrag`:

```tsx
// Add imports
import { closeAllRows } from '@/components/ui/swipeable_row';
import { TxDeleteConfirmSheet } from './components/tx_delete_confirm_sheet';
import { useTransactionStore } from '@/store/transaction.store';
import { useConfirmAction } from '@/utils/use_confirm_action.hook';

// Inside the component:
const { deleteTransaction } = useTransactionStore(
  useShallow((s) => ({ deleteTransaction: s.deleteTransaction })),
);
const {
  pendingPayload: pendingDeleteId,
  busy: deleteBusy,
  request: requestDelete,
  confirm: confirmDelete,
  cancel: cancelDelete,
} = useConfirmAction<string>((id) => deleteTransaction(id));

// Update the SectionList:
<SectionList
  {/* …existing props… */}
  onScrollBeginDrag={closeAllRows}
  renderItem={({ item }) => (
    <TransactionRow
      tx={item}
      account={t.state.accountsById.get(item.account_id)}
      toAccount={item.to_account_id ? t.state.accountsById.get(item.to_account_id) : undefined}
      category={item.category_id ? t.state.categoriesById.get(item.category_id) : undefined}
      onPress={() => t.goToDetail(item.id)}
      onEdit={() => t.goToEdit(item.id)}
      onDelete={() => requestDelete(item.id)}
    />
  )}
/>

// After the SectionList, add the confirm sheet:
<TxDeleteConfirmSheet
  isOpen={pendingDeleteId !== null}
  busy={deleteBusy}
  onCancel={cancelDelete}
  onConfirm={() => { void confirmDelete(); }}
/>
```

Note: if `t.goToEdit` does not exist on the hook return, add it (it should navigate to the edit transaction screen for the given id — mirror `t.goToDetail`). Check `transactions.hook.ts` before writing.

- [ ] **Step 3: Check and add `goToEdit` to `transactions.hook.ts` if missing**

```bash
grep -n "goToDetail\|goToEdit" /Users/musta/Code/projects/practice/MoneyApp/screens/transactions/transactions.hook.ts
```

If `goToEdit` is missing, add it alongside `goToDetail`. The edit route follows the same pattern as detail but targets the edit screen path. Verify the edit route exists:

```bash
find /Users/musta/Code/projects/practice/MoneyApp/app -name "*.tsx" | xargs grep -l "edit" | head -10
```

Add to `transactions.hook.ts` return:

```ts
goToEdit: (id: string) => router.push(`/transactions/${id}/edit`),
```

(Adjust path to match the actual edit route in `app/`.)

- [ ] **Step 4: Type-check**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm run typecheck 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 5: Run tests**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm test -- --ci 2>&1 | tail -15
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add screens/transactions/components/transaction_row.tsx \
        screens/transactions/index.tsx \
        screens/transactions/transactions.hook.ts
git commit -m "feat(swipe): wrap TransactionRow with SwipeableRow — edit + delete actions"
```

---

### Task 2.5 — Wave 2 CI parity and PR

- [ ] **Step 1: Run CI parity**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && \
  npm run format:check \
  && npm run lint \
  && npm run typecheck \
  && npm test -- --ci \
  && npx --yes expo-doctor \
  && npx expo prebuild --no-install --platform android \
  && test -d android \
  && echo "CI parity green"
```

- [ ] **Step 2: Push for review**

```bash
git push origin feat/swipe-actions-standard
```

Wave 2 is independently revertable. PR title: "feat(swipe): Wave 2 — Transactions adoption (swipe edit/delete + delete confirm sheet)".

---

## Wave 3 — Adoption: Commitments

Wraps `CommitmentRow` with Skip (info/blue), Edit (neutral), Delete (destructive). The Skip action routes through the existing `SkipConfirmSheet`. The Delete action routes through a new `CommitmentDeleteConfirmSheet` using `deactivateCommitment`.

---

### Task 3.1 — Smoke-test `deactivateCommitment` signature

**Files:**
- Modify: `__tests__/commitment.store.test.ts`

The confirm/cancel gate is proven in `use_confirm_action.hook.test.ts`. This test is a refactor-guard confirming the mutation exists on the store with the expected signature.

- [ ] **Step 1: Read `__tests__/commitment.store.test.ts` for setup patterns**

- [ ] **Step 2: Add the smoke test**

```ts
it('deactivateCommitment exists and is a function on the store', () => {
  const { deactivateCommitment } = useCommitmentStore.getState();
  expect(typeof deactivateCommitment).toBe('function');
});
```

- [ ] **Step 3: Run tests**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm test -- --testPathPattern="commitment.store" --no-coverage 2>&1 | tail -10
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add __tests__/commitment.store.test.ts
git commit -m "test(swipe): smoke-test deactivateCommitment signature in commitment store"
```

---

### Task 3.2 — `CommitmentDeleteConfirmSheet`

**Files:**
- Create: `screens/commitments/components/commitment_delete_confirm_sheet.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { ConfirmSheet } from '@/components/ui/confirm_sheet';
import { Strings } from '@/constants/strings';

interface Props {
  isOpen: boolean;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Destructive ConfirmSheet for commitment deactivation via the swipe-delete action.
 * Uses deactivateCommitment semantics (soft-delete; history preserved).
 * Copy reuses commitmentsDeactivate* strings — same action, same messaging.
 */
export function CommitmentDeleteConfirmSheet({ isOpen, busy, onCancel, onConfirm }: Props) {
  return (
    <ConfirmSheet
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
      busy={busy}
      destructive
      title={Strings.commitmentsDeactivateTitle}
      body={Strings.commitmentsDeactivateBody}
      confirmLabel={Strings.commitmentsDeactivateConfirm}
      cancelLabel={Strings.commitmentsDeactivateCancel}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add screens/commitments/components/commitment_delete_confirm_sheet.tsx
git commit -m "feat(swipe): CommitmentDeleteConfirmSheet — deactivate confirmation"
```

---

### Task 3.3 — Wrap `CommitmentRow` in `SwipeableRow`

**Files:**
- Modify: `screens/commitments/components/commitment_row.tsx`
- Modify: `screens/commitments/index.tsx`

- [ ] **Step 1: Update `commitment_row.tsx`**

```tsx
// Add to imports
import { SwipeableRow, type SwipeAction } from '@/components/ui/swipeable_row';
import { Strings } from '@/constants/strings';

// Extend Props
interface CommitmentRowProps {
  payment: CommitmentPayment;
  commitment: Commitment | undefined;
  category: Category | undefined;
  onPress: () => void;
  onSkip: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

// Inside component, define actions:
const actions: SwipeAction[] = [
  {
    key: 'skip',
    label: Strings.swipeSkip,
    icon: 'skip-next-outline',
    variant: 'info',
    onPress: onSkip,
  },
  {
    key: 'edit',
    label: Strings.swipeEdit,
    icon: 'pencil-outline',
    variant: 'neutral',
    onPress: onEdit,
  },
  {
    key: 'delete',
    label: Strings.swipeDelete,
    icon: 'trash-can-outline',
    variant: 'destructive',
    onPress: onDelete,
  },
];

// Wrap return:
return (
  <SwipeableRow
    rowId={payment.id}
    actions={actions}
    accessibilityLabel={`${commitment?.name ?? ''}, ${formattedAmount} ${payment.currency}, ${statusLabel}`}
  >
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${commitment?.name ?? ''}, ${showTilde ? '~' : ''}${formattedAmount} ${payment.currency}, ${statusLabel}`}
      style={{ flexDirection: 'row', alignItems: 'center' }}
      className="border-separator min-h-[48px] gap-2 border-b px-4 py-2"
    >
      {/* …existing body unchanged… */}
    </Pressable>
  </SwipeableRow>
);
```

Keep the existing `Pressable` body exactly as-is.

- [ ] **Step 2: Update `screens/commitments/index.tsx`**

Add `onScrollBeginDrag`, delete confirm sheet state, and wire the new props. Check the current commitments index for the SectionList:

```bash
grep -n "CommitmentRow\|SectionList\|onScrollBeginDrag" /Users/musta/Code/projects/practice/MoneyApp/screens/commitments/index.tsx | head -20
```

Add imports:

```tsx
import { closeAllRows } from '@/components/ui/swipeable_row';
import { CommitmentDeleteConfirmSheet } from './components/commitment_delete_confirm_sheet';
import { useCommitmentStore } from '@/store/commitment.store';
import { useConfirmAction } from '@/utils/use_confirm_action.hook';
```

Add state inside the component using `useConfirmAction` — no hand-rolled pending/busy:

```tsx
const { deactivateCommitment } = useCommitmentStore(
  useShallow((s) => ({ deactivateCommitment: s.deactivateCommitment })),
);
const {
  pendingPayload: pendingDeleteId,
  busy: deleteBusy,
  request: requestDelete,
  confirm: confirmDelete,
  cancel: cancelDelete,
} = useConfirmAction<string>((id) => deactivateCommitment(id));
```

Update the `SectionList` renderItem to pass the new props and add `onScrollBeginDrag`:

```tsx
<SectionList
  {/* …existing props… */}
  onScrollBeginDrag={closeAllRows}
  renderItem={({ item }) => (
    <CommitmentRow
      payment={item.payment}
      commitment={item.commitment}
      category={item.category}
      onPress={() => goToDetail(item.payment.id)}
      onSkip={() => openSkipSheet(item.payment.id)}
      onEdit={() => goToEdit(item.commitment?.id)}
      onDelete={() => {
        if (item.commitment?.id) requestDelete(item.commitment.id);
      }}
    />
  )}
/>
```

Note: verify the actual renderItem shape in the current index — the item data shape may differ from the above sketch. Read the file and adapt.

Add the confirm sheet after the SectionList:

```tsx
<CommitmentDeleteConfirmSheet
  isOpen={pendingDeleteId !== null}
  busy={deleteBusy}
  onCancel={cancelDelete}
  onConfirm={() => { void confirmDelete(); }}
/>
```

- [ ] **Step 3: Read current commitments index to verify renderItem shape**

```bash
grep -n "renderItem\|CommitmentRow" /Users/musta/Code/projects/practice/MoneyApp/screens/commitments/index.tsx | head -20
```

Adapt the renderItem props above to match the actual call signature before committing.

- [ ] **Step 4: Type-check and test**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm run typecheck 2>&1 | tail -5
cd /Users/musta/Code/projects/practice/MoneyApp && npm test -- --ci 2>&1 | tail -10
```

Expected: no errors, all tests pass.

- [ ] **Step 5: Commit**

```bash
git add screens/commitments/components/commitment_row.tsx \
        screens/commitments/components/commitment_delete_confirm_sheet.tsx \
        screens/commitments/index.tsx
git commit -m "feat(swipe): wrap CommitmentRow with SwipeableRow — skip + edit + delete actions"
```

---

### Task 3.4 — Wave 3 CI parity and PR

- [ ] **Step 1: Run CI parity**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && \
  npm run format:check \
  && npm run lint \
  && npm run typecheck \
  && npm test -- --ci \
  && npx --yes expo-doctor \
  && npx expo prebuild --no-install --platform android \
  && test -d android \
  && echo "CI parity green"
```

- [ ] **Step 2: Push for review**

```bash
git push origin feat/swipe-actions-standard
```

PR title: "feat(swipe): Wave 3 — Commitments adoption (skip/edit/delete swipe actions)".

---

## Wave 4 — Adoption: Budget (swipe wiring only)

**Coordination note:** This wave ships in the **same PR** as Spec 2 (budget visual redesign — rings, colour bands, row layout). This plan covers only the swipe wiring. Do not implement ring/layout changes here. The Spec 2 plan will include `category_budget_row.tsx` layout changes and will layer on top of the `SwipeableRow` wrapping done in this wave.

When you finish Wave 4, open a branch or draft PR named `feat/budget-visual-redesign` from the same base as this branch. The Spec 2 implementer merges this wave's changes first, then adds the visual changes on top.

---

### Task 4.1 — Smoke-test `removeBudget` signature

**Files:**
- Modify: `__tests__/budget.store.test.ts`

The confirm/cancel gate is proven in `use_confirm_action.hook.test.ts`. This test is a refactor-guard confirming the mutation exists on the store with the expected signature.

- [ ] **Step 1: Read `__tests__/budget.store.test.ts` for setup patterns**

- [ ] **Step 2: Add the smoke test**

```ts
it('removeBudget exists and is a function on the store', () => {
  const { removeBudget } = useBudgetStore.getState();
  expect(typeof removeBudget).toBe('function');
});
```

- [ ] **Step 3: Run tests**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm test -- --testPathPattern="budget.store" --no-coverage 2>&1 | tail -10
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add __tests__/budget.store.test.ts
git commit -m "test(swipe): smoke-test removeBudget signature in budget store"
```

---

### Task 4.2 — `BudgetDeleteConfirmSheet`

**Files:**
- Create: `screens/budget/components/budget_delete_confirm_sheet.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { ConfirmSheet } from '@/components/ui/confirm_sheet';
import { Strings } from '@/constants/strings';

interface Props {
  isOpen: boolean;
  categoryName: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Destructive ConfirmSheet for budget removal via the swipe-delete action.
 * Replaces the inline "Remove" link in set_budget_sheet.tsx (which had no confirmation).
 */
export function BudgetDeleteConfirmSheet({
  isOpen,
  categoryName,
  busy,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <ConfirmSheet
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
      busy={busy}
      destructive
      title={Strings.budgetDeleteConfirmTitle}
      body={Strings.budgetDeleteConfirmBody(categoryName)}
      confirmLabel={Strings.budgetDeleteConfirmConfirm}
      cancelLabel={Strings.budgetDeleteConfirmCancel}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add screens/budget/components/budget_delete_confirm_sheet.tsx
git commit -m "feat(swipe): BudgetDeleteConfirmSheet — removeBudget confirmation"
```

---

### Task 4.3 — Remove "Remove" link from `set_budget_sheet.tsx`

The inline `Pressable` "Remove budget" link (lines ~191–201 in the current file) has no confirmation and is replaced by the swipe Delete action.

- [ ] **Step 1: Read `set_budget_sheet.tsx` to locate the Remove block**

Read `screens/budget/components/set_budget_sheet.tsx`. Find the block:

```tsx
{isEdit && (
  <Pressable
    onPress={() => { void onRemove(); }}
    style={styles.remove}
    accessibilityRole="button"
  >
    <Text style={styles.removeText}>{Strings.budgetRemoveCta}</Text>
  </Pressable>
)}
```

- [ ] **Step 2: Delete the Remove block**

Remove the `{isEdit && (…)}` block above and the `onRemove` function body (lines ~104–107). Also remove the `removeBudget` import from the `useBudgetStore` destructure — it is no longer called from this sheet. Remove `styles.remove` and `styles.removeText` from the `StyleSheet.create` block.

Keep `setLimit` and the rest of the sheet logic untouched.

- [ ] **Step 3: Type-check**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm run typecheck 2>&1 | tail -5
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add screens/budget/components/set_budget_sheet.tsx
git commit -m "feat(swipe): remove inline Remove link from set_budget_sheet (replaced by swipe delete)"
```

---

### Task 4.4 — Wrap `CategoryBudgetRow` in `SwipeableRow`

**Files:**
- Modify: `screens/budget/components/category_budget_row.tsx`
- Modify: `screens/budget/index.tsx`

- [ ] **Step 1: Update `category_budget_row.tsx`**

```tsx
// Add to imports
import { SwipeableRow, type SwipeAction } from '@/components/ui/swipeable_row';
import { Strings } from '@/constants/strings';

// Extend props
export interface CategoryBudgetRowProps {
  row: CategoryBudgetRowVM;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

// Inside component:
const actions: SwipeAction[] = [
  {
    key: 'edit',
    label: Strings.swipeEdit,
    icon: 'pencil-outline',
    variant: 'neutral',
    onPress: onEdit,
  },
  {
    key: 'delete',
    label: Strings.swipeDelete,
    icon: 'trash-can-outline',
    variant: 'destructive',
    onPress: onDelete,
  },
];

// Wrap return:
return (
  <SwipeableRow
    rowId={row.categoryId}
    actions={actions}
    accessibilityLabel={`${row.name} budget`}
  >
    <Pressable
      onPress={onPress}
      style={styles.row}
      accessibilityRole="button"
      accessibilityLabel={`${row.name} budget`}
    >
      {/* …existing body unchanged — icon, name, pill, bar… */}
    </Pressable>
  </SwipeableRow>
);
```

Note: verify `row.categoryId` exists on `CategoryBudgetRowVM`. If the VM uses a different field name for the category id, check `screens/budget/budget.hook.ts` and use the correct field.

```bash
grep -n "categoryId\|id" /Users/musta/Code/projects/practice/MoneyApp/screens/budget/budget.hook.ts | head -20
```

Use whichever field is the stable category id.

Leave a comment above the `SwipeableRow` line:

```tsx
{/* TODO(spec2): ring + layout changes to the Pressable body land here (budget visual redesign) */}
```

- [ ] **Step 2: Update `screens/budget/index.tsx`**

Read the current index to find the `.map` call:

```bash
grep -n "CategoryBudgetRow\|removeBudget\|openEdit" /Users/musta/Code/projects/practice/MoneyApp/screens/budget/index.tsx | head -20
```

Add state and wire props using `useConfirmAction` — no hand-rolled pending/busy:

```tsx
import { closeAllRows } from '@/components/ui/swipeable_row';
import { BudgetDeleteConfirmSheet } from './components/budget_delete_confirm_sheet';
import { useBudgetStore } from '@/store/budget.store';
import { useConfirmAction } from '@/utils/use_confirm_action.hook';

// Inside component — useConfirmAction carries { id, name } as the payload:
const { removeBudget } = useBudgetStore(
  useShallow((s) => ({ removeBudget: s.removeBudget })),
);
const {
  pendingPayload: pendingDelete,
  busy: deleteBusy,
  request: requestDelete,
  confirm: confirmDelete,
  cancel: cancelDelete,
} = useConfirmAction<{ id: string; name: string }>(({ id }) => removeBudget(id));

// In the .map:
{state.rows.map((row) => (
  <CategoryBudgetRow
    key={row.categoryId}
    row={row}
    onPress={() => openDetail(row.categoryId)}
    onEdit={() => openEdit(row)}
    onDelete={() => requestDelete({ id: row.categoryId, name: row.name })}
  />
))}

// After the map (or at the end of the screen return):
<BudgetDeleteConfirmSheet
  isOpen={pendingDelete !== null}
  categoryName={pendingDelete?.name ?? ''}
  busy={deleteBusy}
  onCancel={cancelDelete}
  onConfirm={() => { void confirmDelete(); }}
/>
```

Since budget uses `.map` (not a scroll list), there is no `onScrollBeginDrag`. Instead, call `closeAllRows()` on the budget screen's `onBlur` (using `useFocusEffect`):

```tsx
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

useFocusEffect(
  useCallback(() => {
    return () => closeAllRows(); // close open row when leaving the screen
  }, []),
);
```

- [ ] **Step 3: Verify field names**

```bash
grep -n "categoryId\|name\b" /Users/musta/Code/projects/practice/MoneyApp/screens/budget/budget.hook.ts | head -20
```

Adjust `row.categoryId` and `row.name` above to match the actual VM field names.

- [ ] **Step 4: Type-check and test**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm run typecheck 2>&1 | tail -5
cd /Users/musta/Code/projects/practice/MoneyApp && npm test -- --ci 2>&1 | tail -10
```

Expected: no errors, all pass.

- [ ] **Step 5: Commit**

```bash
git add screens/budget/components/category_budget_row.tsx \
        screens/budget/index.tsx
git commit -m "feat(swipe): wrap CategoryBudgetRow with SwipeableRow — edit + delete actions"
```

---

### Task 4.5 — Wave 4 CI parity and PR

- [ ] **Step 1: Run CI parity**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && \
  npm run format:check \
  && npm run lint \
  && npm run typecheck \
  && npm test -- --ci \
  && npx --yes expo-doctor \
  && npx expo prebuild --no-install --platform android \
  && test -d android \
  && echo "CI parity green"
```

- [ ] **Step 2: Push for review**

```bash
git push origin feat/swipe-actions-standard
```

PR title: "feat(swipe): Wave 4 — Budget swipe wiring (edit + delete, remove inline Remove link) [ships with budget visual redesign]".

**Coordination checkpoint:** Do not merge Wave 4 until the Spec 2 (budget visual redesign) implementer has confirmed the `TODO(spec2)` comment in `category_budget_row.tsx` is visible and their plan accounts for it. The two PRs should merge in the same release window.

---

## Device QA flags (no code change — verify on device)

These are not CI-catchable. Flag them during manual device QA before marking any wave as shipped.

**QA-1: Commitments "Delete" tile vs "Deactivate" confirm sheet copy mismatch.**
The swipe tile label reads "Delete" (`Strings.swipeDelete`). The confirm sheet says "Deactivate this commitment?" / confirm button "Deactivate" (`commitmentsDeactivate*` strings). This is intentional — "deactivate" is the technically accurate soft-delete, and using the existing strings avoids copy duplication. However, it can read as inconsistent to a user who swipes "Delete" and then sees "Deactivate". Verify on device that the intent is clear. If it isn't, a dedicated `Strings.commitmentsSwipeDeleteTitle/Body/Confirm` can be added — but that is a copy decision deferred to device QA, not a pre-merge blocker.

**QA-2: SectionList recycle vs registry ghost-open.**
Transactions and commitments both use `SectionList` (not FlashList), so the aggressive cell-recycling risk is lower than the spec's §5.4 warning implies. However, rows can still be unmounted and remounted when section boundaries scroll off screen. Verify on device with a long transaction list that fast scrolling does not leave a row in a visually open (swiped) state after the row remounts. The registry design (open id lives in the module, not component state) makes this safe in theory — confirm it empirically on a mid-range Android device.

---

## Self-Review Checklist

Run this before handing off to @tariq for code review.

### Spec coverage

| Spec requirement | Task that covers it |
|-----------------|-------------------|
| `SwipeableRow` at `components/ui/swipeable_row.tsx` | Task 1.4 |
| One row open at a time registry | Task 1.2 |
| `ConfirmSheet` `destructive` prop | Task 1.3 |
| Confirm/cancel gate: fires on confirm, not on cancel, no double-invoke, busy clears on rejection | Task 1.5 (`useConfirmAction` hook — 7 real tests) |
| Swipe-left trailing tiles (Edit, Delete, Skip) | Task 1.4 |
| Tile colours from tokens (surfaceEl, transferBlue, negative) | Task 1.4 |
| `accessibilityActions` + `onAccessibilityAction` mapping | Task 1.4 |
| Haptics on reveal-snap | Task 1.4 |
| `disabled` prop | Task 1.4 |
| Transactions adoption + delete confirm sheet | Tasks 2.2–2.4 |
| `delete_confirm_dialog.tsx` migrated to ConfirmSheet | Task 2.2 |
| `deleteTransaction` mutation exists (refactor guard) | Task 2.1 |
| Scroll closes open row (SectionList `onScrollBeginDrag`) | Task 2.4 / 3.3 |
| Commitments adoption (skip/edit/delete) | Tasks 3.2–3.3 |
| `deactivateCommitment` mutation exists (refactor guard) | Task 3.1 |
| Budget adoption (edit/delete) | Tasks 4.2–4.4 |
| `removeBudget` mutation exists (refactor guard) | Task 4.1 |
| "Remove" link removed from `set_budget_sheet.tsx` | Task 4.3 |
| Screen blur closes open row (budget, no scrollbar) | Task 4.4 |
| All three adoption screens use shared `useConfirmAction` (no duplicated boilerplate) | Tasks 2.4, 3.3, 4.4 |
| All strings in `constants/strings.ts` | Task 1.1 |
| Logic-only tests; no `.tsx` render tests | Tasks 1.2, 1.5, 2.1, 3.1, 4.1 — all `.ts` |
| No new dependencies | (Only `expo-haptics` used, already installed) |
| Spec 2 coordination point documented | Task 4.4 `TODO(spec2)` comment |
| Device QA flags documented | QA-1 (commit label mismatch), QA-2 (SectionList recycle) |

### Placeholder scan

Verify no `TBD`, `TODO (implement)`, or stub functions remain in shipped code. The `TODO(spec2)` comment in `category_budget_row.tsx` is intentional — it is coordination documentation, not deferred implementation.

### Type consistency

- `SwipeAction.key` is a `string` in the interface (Task 1.4), used as `event.nativeEvent.actionName` comparison in `onAccessibilityAction` — consistent.
- `rowId` defaults to `genId()` (string) — consistent with registry `openRow(id: string)`.
- `closeAllRows` is re-exported from `swipeable_row.tsx` for list consumers — consistent with the registry's `closeAllRows`.
- `useConfirmAction<string>` in transactions and commitments — `pendingPayload` is `string | null`, passed to the confirm callback as `string` — consistent with store signatures `deleteTransaction(id: string)` and `deactivateCommitment(id: string)`.
- `useConfirmAction<{ id: string; name: string }>` in budget — destructures `{ id }` in the action callback, passes `id` to `removeBudget(id: string)` — consistent.
- `budgetDeleteConfirmBody` is `(name: string) => string` in Task 1.1 — called as `Strings.budgetDeleteConfirmBody(categoryName)` in Task 4.2 — consistent.
- `useConfirmAction` `confirm()` returns `Promise<void>` — call sites use `void confirmDelete()` (fire-and-forget from an event handler) — consistent with React event handler conventions.
