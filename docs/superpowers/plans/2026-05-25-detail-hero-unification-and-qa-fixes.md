# Detail Hero Unification + Device-QA Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship three device-QA findings in one PR — (1) unify the detail-screen hero cards to match the dashboard "Available to Spend" hero via a shared gradient shell, (2) fix the transactions tab reopening the detail screen after a tab switch, (3) fix the broken edit-transaction sheet (FAB vanishes, no form).

**Architecture:** Extract the dashboard hero's gradient frame (linear gradient + SVG grid texture + corner glow + bordered rounded card) into one shared presentational primitive `components/ui/hero_shell.tsx` (`HeroShell`). Refactor the dashboard hero to consume it (visual no-op), then wrap the transaction / commitment / budget / account detail heroes in it with a context-specific glow color. Two isolated bug fixes: add `popToTopOnBlur` to the transactions tab, and eager-mount the edit sheet (mirror the working Add sheet) so `@gorhom/bottom-sheet`'s imperative open fires after the sheet is laid out.

**Tech Stack:** React Native (Expo), TypeScript strict, Uniwind/Unistyles 3, Tailwind v4 CSS-first, `expo-linear-gradient`, `react-native-svg`, `react-native-reanimated`, `@gorhom/bottom-sheet`, expo-router v3.

**Testing note:** Every change here is presentational (`.tsx`) or config/wiring. Per the project's logic-only test policy (no `.tsx` render tests; only `.ts` logic/state/hook/query tests), there is **no new unit test** — there is no new logic to cover. Verification is `npm run typecheck` + the full existing suite for regressions + the device-QA matrix at the end.

---

## File Structure

- **Create** `components/ui/hero_shell.tsx` — shared `HeroShell` + `HeroGridTexture`. One responsibility: the unified hero frame (gradient + grid + glow + bordered rounded card, optional press + entering animation). Pure presentational, no domain knowledge.
- **Modify** `screens/dashboard/components/hero_card.tsx` — consume `HeroShell` (drop local gradient/grid/glow/Card). Visual no-op (it is the canonical reference).
- **Modify** `screens/transactions/detail/components/detail_hero.tsx` — wrap content in `HeroShell`, glow = transaction type color.
- **Modify** `screens/commitments/detail/components/detail_hero.tsx` — wrap content in `HeroShell` (entering animation + glow = category color), drop local gradient/grid/glow.
- **Modify** `screens/accounts/detail/components/balance_hero.tsx` — wrap content in `HeroShell`, glow = account color, drop the surface card + accent bar, bump muted labels for contrast on the gradient.
- **Modify** `screens/budget/category_detail/components/live_month_card.tsx` — add `color` prop, wrap content in `HeroShell` (no horizontal margin — parent already pads), bump muted labels for contrast.
- **Modify** `screens/budget/category_detail/index.tsx` — pass `color={state.color}` to `LiveMonthCard`.
- **Modify** `app/(app)/(tabs)/_layout.tsx` — add `popToTopOnBlur: true` to the `transactions` tab.
- **Modify** `screens/transactions/detail/index.tsx` — eager-mount the edit sheet: pass `tx={state.tx ?? null}` and drop the unused reactive store subscription.

---

### Task 1: Create the shared `HeroShell` primitive

**Files:**
- Create: `components/ui/hero_shell.tsx`

- [ ] **Step 1: Write `components/ui/hero_shell.tsx`**

```tsx
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import Svg, { Defs, Path, Pattern, Rect } from 'react-native-svg';

import { Colors } from '@/constants/theme';
import { ms } from '@/utils/responsive';

type EnteringAnimation = React.ComponentProps<typeof Animated.View>['entering'];

/**
 * HeroGridTexture — faint 26px grid overlay shared by every hero. The SVG
 * stroke colour/opacity is not className-able, so it is an inline literal
 * (the §5/§6 SVG exception). Single pattern id app-wide: only one hero
 * renders per screen, so there is no id collision.
 */
export function HeroGridTexture() {
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <Pattern id="hero-shell-grid" width="26" height="26" patternUnits="userSpaceOnUse">
          <Path d="M 26 0 L 0 0 0 26" fill="none" stroke="#FFFFFF" strokeWidth="1" opacity="0.03" />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#hero-shell-grid)" />
    </Svg>
  );
}

export interface HeroShellProps {
  children: React.ReactNode;
  /** Corner-glow tint. Default: brand gold (matches the dashboard hero). */
  glowColor?: string;
  /** Corner-glow opacity. Default 0.18 (dashboard). */
  glowOpacity?: number;
  /** When set, the shell is a button (Pressable). */
  onPress?: () => void;
  accessibilityLabel?: string;
  /**
   * Extend/override the frame style. The frame defaults to mx16/mt16/border/
   * rounded-16/overflow-hidden; pass e.g. `{ marginHorizontal: 0 }` when the
   * parent container already insets the hero.
   */
  style?: StyleProp<ViewStyle>;
  /** Reanimated entering animation (e.g. the commitment hero's `heroEntering`). */
  entering?: EnteringAnimation;
}

/**
 * Frame styled via `style` (not className): Uniwind does not reliably process
 * `className` on `Animated.View` (the commitment hero deliberately used inline
 * style for this reason). Literal 16s match the canonical dashboard hero's
 * `mx-4 mt-4 rounded-2xl` Tailwind values exactly.
 */
const frameStyle: ViewStyle = {
  marginHorizontal: 16,
  marginTop: 16,
  borderWidth: 1,
  borderColor: Colors.dark.border,
  borderRadius: 16,
  overflow: 'hidden',
  borderCurve: 'continuous',
};

export function HeroShell({
  children,
  glowColor = Colors.dark.gold,
  glowOpacity = 0.18,
  onPress,
  accessibilityLabel,
  style,
  entering,
}: HeroShellProps) {
  const card = (
    <Animated.View entering={entering} style={[frameStyle, style]}>
      <LinearGradient
        colors={[Colors.shared.heroGrad1, Colors.shared.heroGrad2, Colors.shared.heroGrad3]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <HeroGridTexture />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -ms(40),
          right: -ms(40),
          width: ms(160),
          height: ms(160),
          borderRadius: ms(80),
          backgroundColor: glowColor,
          opacity: glowOpacity,
        }}
      />
      {children}
    </Animated.View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        {card}
      </Pressable>
    );
  }
  return card;
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exit 0 (no errors). If `borderCurve` is flagged by the RN types, it is valid in RN 0.76+ `ViewStyle`; if the local types reject it, move it into the consumers' inline style is unnecessary — it is already used in `accordion.styleSheet`. Keep as-is.

- [ ] **Step 3: Commit**

```bash
git add components/ui/hero_shell.tsx
git commit -m "feat(ui): add shared HeroShell gradient frame primitive"
```

---

### Task 2: Refactor dashboard hero to consume `HeroShell` (visual no-op)

**Files:**
- Modify: `screens/dashboard/components/hero_card.tsx`

- [ ] **Step 1: Replace imports + container**

Remove the now-unused imports (`LinearGradient`, `Card`, `Svg`/`Defs`/`Pattern`/`Path`/`Rect`, `Pressable`, `StyleSheet`) and the local `GridTexture` function. Add `import { HeroShell } from '@/components/ui/hero_shell';`. Keep `MaterialCommunityIcons`, `View`, `Text`, `Strings`, `Colors`, `formatAmount`, `ms`.

Replace the `Pressable` → `Card` → gradient/grid/glow block (current lines 49–77) and its closing tags with `HeroShell`. The component body becomes:

```tsx
export function HeroCard({
  assetsEgp,
  assetsUsd,
  rate,
  isManualOverride,
  assetsCount,
  liabilitiesCount,
  onPress,
}: HeroCardProps) {
  const totalAccounts = assetsCount + liabilitiesCount;

  return (
    <HeroShell onPress={onPress} accessibilityLabel={Strings.dashAvailableToSpend}>
      <View
        className="flex-row items-center justify-between px-5 pt-5"
        style={{ flexDirection: 'row' }}
      >
        {/* ...UNCHANGED header-row content (icon chip + label + manual-override pill)... */}
      </View>

      <Text className="mt-3 mb-2 px-5 font-bold" style={{ color: Colors.dark.gold, fontSize: ms(32) }}>
        {formatAmount(assetsEgp)} <Text style={{ fontSize: ms(16), opacity: 0.8 }}>EGP</Text>
      </Text>

      <View className="flex-row flex-wrap px-5 pb-5" style={{ flexDirection: 'row', gap: ms(6) }}>
        {/* ...UNCHANGED pills row... */}
      </View>
    </HeroShell>
  );
}
```

Keep the three inner content blocks (header row, amount, pills) **byte-identical** — only the outer container changes. The `HeroShell` default glow (gold, 0.18) and default frame (mx16/mt16/border/rounded-16) reproduce the old `Card` exactly.

- [ ] **Step 2: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: exit 0. No unused-import warnings (verify all removed imports are gone).

- [ ] **Step 3: Commit**

```bash
git add screens/dashboard/components/hero_card.tsx
git commit -m "refactor(dashboard): hero_card consumes shared HeroShell"
```

---

### Task 3: Transaction detail hero → HeroShell

**Files:**
- Modify: `screens/transactions/detail/components/detail_hero.tsx`

- [ ] **Step 1: Wrap content in HeroShell with type-colored glow**

Add `import { HeroShell } from '@/components/ui/hero_shell';`. Change the outer container from the bare `<View className="items-center px-4 pt-6 pb-4">` to a `HeroShell` wrapping that same content view:

```tsx
  return (
    <HeroShell glowColor={typeColor(tx.type)}>
      <View className="items-center px-4 pt-6 pb-5">
        {/* ...existing content UNCHANGED: type badge row, amount, category chip, title, dateTime... */}
      </View>
    </HeroShell>
  );
```

(Only the wrapper changes + `pb-4`→`pb-5` for symmetric breathing room inside the framed card. All text/labels stay byte-identical.)

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add screens/transactions/detail/components/detail_hero.tsx
git commit -m "refactor(transactions): detail hero adopts HeroShell"
```

---

### Task 4: Commitment detail hero → HeroShell

**Files:**
- Modify: `screens/commitments/detail/components/detail_hero.tsx`

- [ ] **Step 1: Replace the inline frame with HeroShell**

Remove the local `GridTexture` function and the `LinearGradient`, `StyleSheet`, `Svg`/`Defs`/`Pattern`/`Path`/`Rect`, and `Animated` imports that are now only used for the frame. Add `import { HeroShell } from '@/components/ui/hero_shell';`. Keep `heroEntering` import (passed to the shell). The render becomes:

```tsx
  return (
    <HeroShell entering={heroEntering} glowColor={iconColor} glowOpacity={0.25}>
      <View style={{ paddingHorizontal: 16, paddingVertical: 20, alignItems: 'center' }}>
        {/* ...existing content UNCHANGED: icon tile, name, amountText, category·recurrence... */}
      </View>
    </HeroShell>
  );
```

`iconColor` (existing local: `category?.color ?? Colors.dark.gold`) drives the glow at 0.25 (matches the prior tint). `heroEntering` moves to the shell. `Colors` import stays (used by `iconColor`/`tintBg`).

- [ ] **Step 2: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: exit 0; verify no unused imports remain (`Animated`, `StyleSheet`, `Svg` family, `LinearGradient` should all be gone).

- [ ] **Step 3: Commit**

```bash
git add screens/commitments/detail/components/detail_hero.tsx
git commit -m "refactor(commitments): detail hero adopts HeroShell"
```

---

### Task 5: Account detail hero → HeroShell

**Files:**
- Modify: `screens/accounts/detail/components/balance_hero.tsx`

- [ ] **Step 1: Replace the surface card + accent bar with HeroShell**

Add `import { HeroShell } from '@/components/ui/hero_shell';`. Remove the `Box` import if it becomes unused after the change (it does — replace both `Box`es with `View`). Replace the `BalanceHero` return:

```tsx
  return (
    <HeroShell glowColor={color} style={{ marginTop: 8 }}>
      <View className="px-4 py-4">
        {/* Label + type chip row */}
        <View style={{ flexDirection: 'row' }} className="items-center justify-between">
          <Text variant="caption" className="text-foreground/70 tracking-wider uppercase">
            {Strings.accountDetailBalance}
          </Text>
          <View
            style={{ flexDirection: 'row', backgroundColor: color + '22' }}
            className="border-border items-center gap-1 rounded-full border px-2 py-0.5"
          >
            <MaterialCommunityIcons name={TYPE_ICON[account.type]} size={12} color={color} />
            <Text variant="caption" className="text-foreground/70 font-semibold">
              {TYPE_LABEL[account.type]}
            </Text>
          </View>
        </View>

        {/* Balance */}
        <Text variant="numMd" numberOfLines={1} className={isCC ? 'text-danger mt-1' : 'text-accent mt-1'}>
          {formatAmount(account.current_balance)} {account.currency}
        </Text>

        {/* Context caption */}
        <Text variant="caption" className="text-foreground/55 mt-1" style={caption.color ? { color: caption.color } : undefined}>
          {caption.text}
          {caption.adjusted ? ` · ${Strings.accountHeroAdjusted}` : ''}
        </Text>
      </View>
    </HeroShell>
  );
```

Changes vs. before: drop the 4px accent bar (`color` now drives the corner glow instead — user-accepted), drop `bg-surface`, swap `text-muted`→`text-foreground/70` on the label + type-chip text for contrast on the dark gradient (the `style`-driven `caption.color` override path is preserved). `style={{ marginTop: 8 }}` preserves the prior tighter `mt-2`.

- [ ] **Step 2: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: exit 0; `Box` import removed if unused.

- [ ] **Step 3: Commit**

```bash
git add screens/accounts/detail/components/balance_hero.tsx
git commit -m "refactor(accounts): balance hero adopts HeroShell"
```

---

### Task 6: Budget detail hero (LiveMonthCard) → HeroShell

**Files:**
- Modify: `screens/budget/category_detail/components/live_month_card.tsx`
- Modify: `screens/budget/category_detail/index.tsx`

- [ ] **Step 1: Add `color` prop + wrap in HeroShell**

In `live_month_card.tsx`: add `import { HeroShell } from '@/components/ui/hero_shell';`. Add `color: string` to the props. Replace the `<View style={styles.card}>` wrapper (which has the surface bg/border/radius/padding) with `HeroShell` (no horizontal margin — the parent scroll content already pads `Spacing.md`). Keep the inner content; bump the two muted texts for contrast:

```tsx
export function LiveMonthCard({
  result,
  daysLeft,
  color,
}: {
  result: MonthResultVM;
  daysLeft: number;
  color: string;
}) {
  const pct = result.limit > 0 ? result.spent / result.limit : 0;
  return (
    <HeroShell glowColor={color} style={{ marginHorizontal: 0 }}>
      <View style={styles.inner}>
        <View style={styles.top}>
          <Text style={styles.muted}>{`${daysLeft} ${Strings.budgetDaysLeftSuffix}`}</Text>
          <Text style={styles.left}>{`${formatAmount(result.limit - result.spent)} ${Strings.budgetSummaryLeft.toLowerCase()}`}</Text>
        </View>
        <Text style={styles.big}>
          {formatAmount(result.spent)}
          <Text style={styles.of}>{`  ${Strings.budgetSummarySpent.toLowerCase()} of ${formatAmount(result.limit)}`}</Text>
        </Text>
        <BudgetBar pct={pct} status={result.status} height={ms(8)} />
      </View>
    </HeroShell>
  );
}
```

Update the StyleSheet: remove the old `card` (frame now from HeroShell), add `inner: { padding: Spacing.md }`, and lighten the muted text for the gradient. Replace the `card` entry and adjust `muted`/`of`:

```tsx
const styles = StyleSheet.create({
  inner: { padding: Spacing.md },
  top: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
  muted: { fontFamily: FontFamily.interRegular, fontSize: Type.micro, color: Colors.dark.text1, opacity: 0.7 },
  left: { fontFamily: FontFamily.soraSemi, fontSize: Type.body, color: Colors.dark.positive },
  big: { fontFamily: FontFamily.soraBold, fontSize: Type.headline, color: Colors.dark.text1, marginBottom: Spacing.sm },
  of: { fontFamily: FontFamily.interRegular, fontSize: Type.caption, color: Colors.dark.text1, opacity: 0.7 },
});
```

(`Radius` import may become unused after dropping `card.borderRadius` — remove it from the theme import if so.)

- [ ] **Step 2: Pass `color` from the parent**

In `screens/budget/category_detail/index.tsx`, line 36, change:

```tsx
{state.liveMonth && <LiveMonthCard result={state.liveMonth} daysLeft={state.daysLeft} />}
```
to:
```tsx
{state.liveMonth && (
  <LiveMonthCard result={state.liveMonth} daysLeft={state.daysLeft} color={state.color} />
)}
```

- [ ] **Step 3: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: exit 0; `Radius` removed from the live_month_card theme import if it is now unused.

- [ ] **Step 4: Commit**

```bash
git add screens/budget/category_detail/components/live_month_card.tsx screens/budget/category_detail/index.tsx
git commit -m "refactor(budget): live-month detail hero adopts HeroShell"
```

---

### Task 7: Fix transactions tab reopening the detail screen

**Files:**
- Modify: `app/(app)/(tabs)/_layout.tsx`

- [ ] **Step 1: Add `popToTopOnBlur` to the transactions tab**

In the `transactions` `Tabs.Screen` options (currently lines 90–96), add `popToTopOnBlur: true` (mirrors the `commitments` tab at line 102):

```tsx
        <Tabs.Screen
          name="transactions"
          options={{
            title: 'Transactions',
            tabBarIcon: ({ color }) => tabIcon('swap-horizontal', color),
            popToTopOnBlur: true,
          }}
        />
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/(tabs)/_layout.tsx"
git commit -m "fix(transactions): reset tab stack to list on blur (popToTopOnBlur)"
```

---

### Task 8: Fix the broken edit-transaction sheet

**Root cause:** `EditTransactionSheet` returns `null` while `tx` is null, so it mounts **already `visible=true`** the moment Edit is tapped. The shared `Sheet` opens via `sheetRef.current?.snapToIndex(0)` in a mount effect — on a born-visible `@gorhom/bottom-sheet` that snap is dropped (sheet not laid out yet), so it stays closed while `increment()` still hides the FAB. The Add sheet works because it is mounted permanently and `visible` flips false→true later. Fix = eager-mount the edit sheet too.

**Files:**
- Modify: `screens/transactions/detail/index.tsx`

- [ ] **Step 1: Drop the unused reactive store subscription**

Remove the `editTxStoreState` subscription (current lines 32–34):

```tsx
  const { state: editTxStoreState } = useEditTransactionStore(
    useShallow((s) => ({ state: s.state })),
  );
```

Keep the `useEditTransactionState` subscription (line 31, drives `visible`) and the `useEditTransactionStore` **import** (its `.getState()` calls at the cleanup effect, `beforeRemove`, `handleEdit`, and the sheet's `onClose`/`onSaved` remain).

- [ ] **Step 2: Eager-mount the edit sheet with the loaded transaction**

Change the `tx` prop (current line 188) from `tx={editTxStoreState.editingTx}` to `tx={state.tx ?? null}`:

```tsx
          <EditTransactionSheet
            visible={editTxState.visible}
            onClose={() => {
              useEditTransactionStore.getState().reset();
              useEditTransactionState.getState().close();
            }}
            onSaved={() => {
              useEditTransactionStore.getState().reset();
              useEditTransactionState.getState().close();
              reload();
            }}
            tx={state.tx ?? null}
          />
```

Because this `<EditTransactionSheet>` only renders inside the `state.viewState === 'ready' && state.tx && state.derived` branch, `state.tx` is non-null here, so `EditSheetInner` (and its `<Sheet>`) mounts as soon as the detail screen is ready — closed (`visible=false`) and laid out. Tapping Edit then only flips `visible`→true, and `snapToIndex(0)` runs against a ready sheet. `handleEdit`'s `loadFromTx(state.tx)` still syncs the editable amount before `open()`.

- [ ] **Step 3: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: exit 0 (no unused `editTxStoreState`/`useShallow` issues — `useShallow` is still used by the `editTxState` subscription).

- [ ] **Step 4: Commit**

```bash
git add screens/transactions/detail/index.tsx
git commit -m "fix(transactions): eager-mount edit sheet so it opens (FAB no longer vanishes alone)"
```

---

### Task 9: Full CI parity + PR

- [ ] **Step 1: Run the full local CI-parity chain**

Run (from the worktree root):
```bash
npm run format:check \
  && npm run lint \
  && npm run typecheck \
  && npm test -- --ci \
  && npx --yes expo-doctor \
  && npx expo prebuild --no-install --platform android \
  && test -d android \
  && echo "✓ CI parity green"
```
Expected: all green. If `format:check` fails, run `npm run format` and re-stage. Fix any failure, re-run from the top.

- [ ] **Step 2: Push + open PR**

```bash
git push -u origin fix/detail-heroes-nav-edit-qa
```
Open a PR titled `fix: unify detail hero cards + tab-reset + edit-sheet QA fixes` with a body covering: the three findings, root causes, the shared `HeroShell`, the deliberately-deferred shared-`Sheet` hardening (known latent born-visible fragility — out of scope, targeted fix used instead), and the device-QA matrix below.

- [ ] **Step 3: Code review** — request review via superpowers:requesting-code-review (Tariq's lens), act on Critical/Important findings.

---

## Device-QA matrix (user-gated — after merge-ready)

1. **Tab reset:** Transactions → open a detail → switch tab → back to Transactions → lands on the **list** (not the detail). Repeat for the FAB Add-Transaction flow (still opens on the list).
2. **Edit transaction:** Open a transaction detail → tap **Edit** → the edit sheet **opens** (prefilled), FAB hidden behind it → change a field → **Save** persists and the detail refreshes → close returns to the detail with the FAB back.
3. **Hero parity (light + dark):** Dashboard "Available to Spend" looks unchanged. Transaction / commitment / budget-category / account detail heroes each show the gradient frame + grid + context-colored corner glow, with all text legible on the gradient (watch the muted labels on account + budget — bump opacity if dim). Account hero no longer shows the 4px accent bar; account color still reads via the glow + type chip.
4. **Long values / edge content:** long account/commitment names, zero/negative balances, CC (red) amounts, variable commitment amounts — no clipping or contrast failures in the framed cards.

---

## Self-Review

- **Spec coverage:** (1) hero unification → Tasks 1–6 (shell + dashboard + transaction + commitment + budget + account). (2) tab reset → Task 7. (3) edit sheet → Task 8. All three findings covered.
- **Placeholder scan:** none — every code step shows full code or an exact, located edit.
- **Type consistency:** `HeroShell` prop names (`glowColor`, `glowOpacity`, `onPress`, `accessibilityLabel`, `style`, `entering`) are used identically at all six call sites. `LiveMonthCard` gains `color: string`; the parent passes `color={state.color}`. Edit fix uses `tx={state.tx ?? null}` matching `EditProps.tx: Transaction | null`.
- **Scope:** one PR, as the user chose. Budget detail is included (it is on `main` via #115). Shared-`Sheet` hardening intentionally deferred to keep blast radius contained.
