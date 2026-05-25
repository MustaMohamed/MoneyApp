# Wave 4 SP-4-adoption — SegmentedTabs Adoption Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retire three bespoke `Pressable`-row segmented controls across four files by replacing them with the canonical `SegmentedTabs` wrapper from `components/ui/tabs.tsx`.

**Architecture:** Purely presentational primitive swap — no new files, no store changes, no hook changes, no schema changes, no new dependencies. `SegmentedTabs` is imported into each target and replaces the retiring JSX block. Selection state remains exactly where it already lives (Zustand store for T1, filter store for T2, RHF for T3).

**Tech Stack:** React Native, Expo Router v3, TypeScript strict, HeroUI Native (`SegmentedTabs` via `components/ui/tabs.tsx`), Zustand, RHF.

---

## IMPORTANT: Testing deviation from skill default

This SP is a **purely presentational primitive adoption** under the project's **logic-only test policy** (no `.tsx` render tests). There are **NO new test files** and **NO failing-test-first steps**. Each task's verification is:
1. Typecheck passes (`npm run typecheck`)
2. Lint passes (`npm run lint`)
3. The named existing regression test file passes unchanged
4. A focused `git diff` confirms the change is bounded to the expected lines

Do not write, modify, or delete any test files. Do not add render tests.

---

## File Map

| File | Action | Lines changed |
|---|---|---|
| `screens/settings/categories/index.tsx` | Modify | Lines 1–10 (imports), 56–95 (tab switcher block) |
| `screens/transactions/filter/components/amount_accordion.tsx` | Modify | Lines 1–3 (imports), 74–91 (currency toggle only) |
| `screens/accounts/add_account/index.tsx` | Modify | Lines 1 (import), 21–22 (CURRENCY_OPTIONS), 114–138 (currency block) |
| `screens/onboarding/add_account/index.tsx` | Modify | Lines 1 (import), 22–23 (CURRENCY_OPTIONS), 117–141 (currency block) |

No files created. No files deleted.

---

## Task 1 — T1: Categories Expense/Income switcher

**Files:**
- Modify: `screens/settings/categories/index.tsx` (imports block + lines 56–95)

### Background

`screens/settings/categories/index.tsx` currently renders a bespoke full-width tab switcher using two `Pressable` children inside a `View`. Lines 56–95 are the entire switcher. The `SegmentedTabs` wrapper replaces those 40 lines with ~9 lines. The outer spacing (`Spacing.sm` = `ms(12)`, a responsive scaled value not expressible as a Tailwind class) must be preserved via a wrapping `View` with `style` props per CLAUDE.md's layout-critical container rule. `listClassName="w-full"` is required to override `Tabs.List`'s `self-start` base class — without it the control collapses to content-width.

After the change:
- `Pressable` import → **remove** (no longer referenced anywhere in the file)
- `Colors` import → **remove** (only used in the retiring block at lines 62 and 79; not used elsewhere)
- `Radius` import → **remove** (only used in the retiring block at lines 63 and 76; not used elsewhere)
- `Spacing` import → **keep** (still used in the new wrapping `View` AND in the `FlashList` `contentContainerStyle` at lines 106–108)
- `View` import → **keep** (still used at lines 98, 133, 141 outside the retiring block)

- [ ] **Step 1: Update imports in `screens/settings/categories/index.tsx`**

Replace the current import block:

```tsx
import { FlashList } from '@shopify/flash-list';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty_state';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { CategoryType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors, Radius, Spacing } from '@/constants/theme';
import type { Category } from '@/store/category.store';

import { useCategories } from './categories.hook';
import { AddEditCategorySheet } from './components/add_edit_category_sheet';
import { CategoryRow } from './components/category_row';
import { DeleteConfirmationDialog } from './components/delete_confirmation_dialog';
import { ReassignCategorySheet } from './components/reassign_category_sheet';
```

With:

```tsx
import { FlashList } from '@shopify/flash-list';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty_state';
import { Screen } from '@/components/ui/screen';
import { SegmentedTabs } from '@/components/ui/tabs';
import { Text } from '@/components/ui/text';
import { CategoryType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Spacing } from '@/constants/theme';
import type { Category } from '@/store/category.store';

import { useCategories } from './categories.hook';
import { AddEditCategorySheet } from './components/add_edit_category_sheet';
import { CategoryRow } from './components/category_row';
import { DeleteConfirmationDialog } from './components/delete_confirmation_dialog';
import { ReassignCategorySheet } from './components/reassign_category_sheet';
```

Changes: removed `Pressable` from `react-native`, added `SegmentedTabs` from `@/components/ui/tabs`, removed `Colors` and `Radius` from `@/constants/theme`.

- [ ] **Step 2: Replace the tab-switcher block (lines 56–95)**

Replace this block (the entire `{/* Tab switcher */}` section):

```tsx
      {/* Tab switcher */}
      <View
        style={{
          flexDirection: 'row',
          marginHorizontal: Spacing.sm,
          marginTop: Spacing.sm,
          marginBottom: Spacing.sm,
          backgroundColor: Colors.dark.surfaceEl,
          borderRadius: Radius.md,
          padding: 3,
          gap: 3,
        }}
      >
        {([CategoryType.Expense, CategoryType.Income] as const).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[
              {
                flex: 1,
                paddingVertical: Spacing.xs,
                borderRadius: Radius.sm,
                alignItems: 'center',
              },
              state.activeTab === tab && { backgroundColor: Colors.shared.cairoGold },
            ]}
          >
            <Text
              className={
                state.activeTab === tab
                  ? 'text-accent-foreground font-sora-semi text-base'
                  : 'text-muted font-inter-medium text-base'
              }
            >
              {tab === CategoryType.Expense
                ? Strings.categoriesTabExpense
                : Strings.categoriesTabIncome}
            </Text>
          </Pressable>
        ))}
      </View>
```

With:

```tsx
      {/* Tab switcher */}
      <View style={{ marginHorizontal: Spacing.sm, marginVertical: Spacing.sm }}>
        <SegmentedTabs<CategoryType>
          segments={[
            { value: CategoryType.Expense, label: Strings.categoriesTabExpense },
            { value: CategoryType.Income, label: Strings.categoriesTabIncome },
          ]}
          value={state.activeTab}
          onValueChange={setActiveTab}
          variant="solid-gold"
          listClassName="w-full"
          accessibilityLabel="Category type"
        />
      </View>
```

The wrapping `View` carries the outer margins (Spacing.sm = ms(12), not Tailwind-expressible). `listClassName="w-full"` overrides `Tabs.List`'s `self-start` base so the control spans the full wrapper width.

- [ ] **Step 3: Verify typecheck and lint pass**

Run from the worktree root (`/Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/wave4-sp4-adoption`):

```bash
npm run typecheck 2>&1 | tail -5
npm run lint 2>&1 | tail -10
```

Expected: no errors in either command output referencing `categories/index.tsx`.

- [ ] **Step 4: Run the regression test**

```bash
npm test -- --testPathPattern="categories.state" --ci 2>&1 | tail -15
```

Expected output includes:
```
PASS __tests__/categories.state.test.ts
Tests: X passed, X total
```

All tests in `categories.state.test.ts` must pass with zero changes to the test file.

- [ ] **Step 5: Confirm diff is bounded**

```bash
git -C /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/wave4-sp4-adoption diff HEAD -- screens/settings/categories/index.tsx
```

The diff must show:
- Import block changes (removed `Pressable`, `Colors`, `Radius`; added `SegmentedTabs`)
- Lines 56–95 replaced with the wrapping `View` + `SegmentedTabs` block (9 lines)
- No changes anywhere else in the file

- [ ] **Step 6: Commit**

```bash
git -C /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/wave4-sp4-adoption add screens/settings/categories/index.tsx
git -C /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/wave4-sp4-adoption commit -m "$(cat <<'EOF'
refactor(categories): adopt SegmentedTabs for Expense/Income switcher

Replaces bespoke Pressable-row tab switcher with SegmentedTabs (solid-gold,
w-full). Outer spacing preserved via wrapping View with Spacing.sm style
props. Removes now-unused Colors, Radius, Pressable imports.
EOF
)"
```

---

## Task 2 — T2: Filter currency toggle

**Files:**
- Modify: `screens/transactions/filter/components/amount_accordion.tsx` (imports block + lines 74–91 only)

### Background

`amount_accordion.tsx` is a shared component used by the filter sheet. It has two logical regions:
- **Outer shell (lines 43–71):** the `border-separator bg-surface` accordion container and its `Pressable` header with chevron. This belongs to **Batch 3 (SP-5-accordions)**. DO NOT TOUCH IT.
- **Inner toggle (lines 74–91):** the `bg-background mb-3 flex-row` currency toggle with two `Pressable`s. This is the ONLY region this task modifies.
- **Input rows (lines 92–121):** DO NOT TOUCH.

After the change:
- `Pressable` import → **keep** (line 44, the outer shell's accordion header `Pressable`, is NOT being removed — it belongs to Batch 3)
- `View` import → **keep** (many `View` usages remain in the outer shell and input rows)

The `Pressable` import stays because the outer accordion header (`<Pressable onPress={onToggleSection} ...>` at line 44) still uses it. Only the inner `Pressable` (lines 78–88) is retired.

- [ ] **Step 1: Add `SegmentedTabs` import to `amount_accordion.tsx`**

The current import block:

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useState, useEffect } from 'react';
import { Pressable, View } from 'react-native';

import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { CoreTokens } from '@/constants/theme_tokens';

import { formatAmountSummary, parseAmountInput } from '../filter.helpers';
import type { AdvancedFilters } from '../filter.store';
```

Add `SegmentedTabs` — the block becomes:

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useState, useEffect } from 'react';
import { Pressable, View } from 'react-native';

import { Input } from '@/components/ui/input';
import { SegmentedTabs } from '@/components/ui/tabs';
import { Text } from '@/components/ui/text';
import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { CoreTokens } from '@/constants/theme_tokens';

import { formatAmountSummary, parseAmountInput } from '../filter.helpers';
import type { AdvancedFilters } from '../filter.store';
```

`Pressable` and `View` stay — the outer shell still uses them.

- [ ] **Step 2: Replace the inner currency toggle block (lines 74–91 only)**

Locate the `{expanded ? (` block. Replace ONLY the inner currency `View` and its `Pressable` children. The surrounding `{expanded ? (`, `<View className="mt-3">`, and all content after line 91 are untouched.

Replace:

```tsx
          <View className="bg-background mb-3 flex-row gap-1.5 rounded-lg p-1">
            {([Currency.EGP, Currency.USD] as const).map((c) => {
              const sel = draft.amountCurrency === c;
              return (
                <Pressable
                  key={c}
                  onPress={() => onChangeCurrency(c)}
                  className={`flex-1 items-center rounded-md py-1.5 ${sel ? 'bg-default/40' : ''}`}
                >
                  <Text
                    className={`font-inter text-[11px] font-semibold ${sel ? 'text-accent' : 'text-foreground/60'}`}
                  >
                    {c}
                  </Text>
                </Pressable>
              );
            })}
          </View>
```

With:

```tsx
          <SegmentedTabs<Currency>
            segments={[
              { value: Currency.EGP, label: Currency.EGP },
              { value: Currency.USD, label: Currency.USD },
            ]}
            value={draft.amountCurrency}
            onValueChange={onChangeCurrency}
            variant="solid-gold"
            listClassName="w-full mb-3"
            accessibilityLabel="Amount currency"
          />
```

The full `{expanded ? (` section after your edit must look like this (verify by reading the file):

```tsx
      {expanded ? (
        <View className="mt-3">
          <SegmentedTabs<Currency>
            segments={[
              { value: Currency.EGP, label: Currency.EGP },
              { value: Currency.USD, label: Currency.USD },
            ]}
            value={draft.amountCurrency}
            onValueChange={onChangeCurrency}
            variant="solid-gold"
            listClassName="w-full mb-3"
            accessibilityLabel="Amount currency"
          />
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Text className="font-inter text-foreground/55 mb-1 text-[10px] font-semibold uppercase">
                {Strings.filterAmountMinLabel}
              </Text>
              <Input
                value={minStr}
                onChangeText={(s) => {
                  setMinStr(s);
                  onChangeMin(parseAmountInput(s));
                }}
                keyboardType="decimal-pad"
                placeholder="0"
              />
            </View>
            <View className="flex-1">
              <Text className="font-inter text-foreground/55 mb-1 text-[10px] font-semibold uppercase">
                {Strings.filterAmountMaxLabel}
              </Text>
              <Input
                value={maxStr}
                onChangeText={(s) => {
                  setMaxStr(s);
                  onChangeMax(parseAmountInput(s));
                }}
                keyboardType="decimal-pad"
                placeholder="∞"
              />
            </View>
          </View>
        </View>
      ) : null}
```

- [ ] **Step 3: Verify typecheck and lint pass**

```bash
npm run typecheck 2>&1 | tail -5
npm run lint 2>&1 | tail -10
```

Expected: no errors referencing `amount_accordion.tsx`.

- [ ] **Step 4: Run the regression test**

```bash
npm test -- --testPathPattern="database_get_transactions_filter" --ci 2>&1 | tail -15
```

Expected output includes:
```
PASS __tests__/database_get_transactions_filter.test.ts
Tests: X passed, X total
```

All tests must pass with zero changes to the test file.

- [ ] **Step 5: Confirm diff is bounded to the inner toggle only**

```bash
git -C /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/wave4-sp4-adoption diff HEAD -- screens/transactions/filter/components/amount_accordion.tsx
```

The diff must show:
- One added import line (`SegmentedTabs`)
- Lines 74–91 replaced with the `SegmentedTabs` block
- **Zero changes** to the outer shell (lines 43–71), the Input rows (lines 92–121), or any props/state logic

If the diff shows any change to the outer shell or Input rows, revert and redo Step 2.

- [ ] **Step 6: Commit**

```bash
git -C /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/wave4-sp4-adoption add screens/transactions/filter/components/amount_accordion.tsx
git -C /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/wave4-sp4-adoption commit -m "$(cat <<'EOF'
refactor(filter): adopt SegmentedTabs for currency toggle in AmountAccordion

Replaces inner Pressable-row currency toggle (lines 74-91) with SegmentedTabs
(solid-gold, w-full mb-3). Outer accordion shell untouched — belongs to
Batch 3 (SP-5). Visual change: grey-pill to gold-fill, approved 2026-05-25.
EOF
)"
```

---

## Task 3 — T3: Add-account currency picker (both screens atomically)

**Files:**
- Modify: `screens/accounts/add_account/index.tsx`
- Modify: `screens/onboarding/add_account/index.tsx`

### Background

Both files have an identical `CURRENCY_OPTIONS` const and an identical currency `Box`+`Pressable` block. Both must be changed in the same commit — shipping one without the other creates an inconsistent experience between the onboarding flow and the in-app add-account flow. This is an approved intentional visual redesign: tall bordered-card pair → compact gold-pill strip.

After the change:
- `cn` import (`heroui-native`) → **keep** (still used for color swatches and TypePill area lower in both files)
- `Pressable` import (`@/components/ui/pressable`) → **keep** (color-swatch `Pressable`s remain in both files at lines ~179/180)
- `CURRENCY_OPTIONS` const → **remove** (only referenced in the retired map)
- `SegmentedTabs` → **add** (new import)

**Apply the same change identically to both files.** The steps below describe the change once; perform it in both files before committing.

- [ ] **Step 1: Update imports in `screens/accounts/add_account/index.tsx`**

Current import block:

```tsx
import { cn } from 'heroui-native';
import React from 'react';
import { Controller, useWatch } from 'react-hook-form';
import { Switch } from 'react-native';
import Animated from 'react-native-reanimated';

import { TYPE_OPTIONS, TypePill } from '@/components/account_type_pill';
import { BackButton } from '@/components/ui/back_button';
import { Box } from '@/components/ui/box';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pressable } from '@/components/ui/pressable';
import { Screen, ScreenScroll } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { AccountType, Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { CoreTokens, GoldTokens } from '@/constants/theme_tokens';

import { useAddAccountAnim } from './add_account.anim';
import { ACCOUNT_COLORS, useAddAccountApp } from './add_account.hook';
```

Replace with:

```tsx
import { cn } from 'heroui-native';
import React from 'react';
import { Controller, useWatch } from 'react-hook-form';
import { Switch } from 'react-native';
import Animated from 'react-native-reanimated';

import { TYPE_OPTIONS, TypePill } from '@/components/account_type_pill';
import { BackButton } from '@/components/ui/back_button';
import { Box } from '@/components/ui/box';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pressable } from '@/components/ui/pressable';
import { Screen, ScreenScroll } from '@/components/ui/screen';
import { SegmentedTabs } from '@/components/ui/tabs';
import { Text } from '@/components/ui/text';
import { AccountType, Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { CoreTokens, GoldTokens } from '@/constants/theme_tokens';

import { useAddAccountAnim } from './add_account.anim';
import { ACCOUNT_COLORS, useAddAccountApp } from './add_account.hook';
```

Change: added `import { SegmentedTabs } from '@/components/ui/tabs';` after `ScreenScroll`. All other imports stay.

- [ ] **Step 2: Update imports in `screens/onboarding/add_account/index.tsx`**

Current import block:

```tsx
import { cn } from 'heroui-native';
import React from 'react';
import { Controller, useWatch } from 'react-hook-form';
import { Switch } from 'react-native';
import Animated from 'react-native-reanimated';

import { TYPE_OPTIONS, TypePill } from '@/components/account_type_pill';
import { ProgressDots } from '@/components/progress_dots';
import { BackButton } from '@/components/ui/back_button';
import { Box } from '@/components/ui/box';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pressable } from '@/components/ui/pressable';
import { Screen, ScreenScroll } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { AccountType, Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { CoreTokens, GoldTokens } from '@/constants/theme_tokens';

import { useAddAccountAnim } from './add_account.anim';
import { useAddAccount, ACCOUNT_COLORS } from './add_account.hook';
```

Replace with:

```tsx
import { cn } from 'heroui-native';
import React from 'react';
import { Controller, useWatch } from 'react-hook-form';
import { Switch } from 'react-native';
import Animated from 'react-native-reanimated';

import { TYPE_OPTIONS, TypePill } from '@/components/account_type_pill';
import { ProgressDots } from '@/components/progress_dots';
import { BackButton } from '@/components/ui/back_button';
import { Box } from '@/components/ui/box';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pressable } from '@/components/ui/pressable';
import { Screen, ScreenScroll } from '@/components/ui/screen';
import { SegmentedTabs } from '@/components/ui/tabs';
import { Text } from '@/components/ui/text';
import { AccountType, Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { CoreTokens, GoldTokens } from '@/constants/theme_tokens';

import { useAddAccountAnim } from './add_account.anim';
import { useAddAccount, ACCOUNT_COLORS } from './add_account.hook';
```

Change: added `import { SegmentedTabs } from '@/components/ui/tabs';` after `ScreenScroll`.

- [ ] **Step 3: Remove `CURRENCY_OPTIONS` and replace the currency block in `screens/accounts/add_account/index.tsx`**

Remove the `CURRENCY_OPTIONS` const (currently at line 21):

```tsx
const CURRENCY_OPTIONS: Currency[] = [Currency.EGP, Currency.USD];
```

Then find the `{/* Currency */}` section (currently lines 109–139). Replace the `<Box style={{ flexDirection: 'row' }}>` and its two `Pressable` children with `SegmentedTabs`.

Replace:

```tsx
        {/* Currency */}
        <Box className="pt-1">
          <Text variant="hint" className="font-soraBold text-gold-500 pt-2 pb-2 tracking-widest">
            {Strings.o4SectionCurrency}
          </Text>
          <Box style={{ flexDirection: 'row' }} className="gap-2">
            {CURRENCY_OPTIONS.map((code) => (
              <Pressable
                key={code}
                onPress={() => form.setValue('currency', code)}
                style={{ flex: 1 }}
                className={cn(
                  'items-center justify-center rounded-[10px] border-[1.5px] px-3 py-3',
                  selectedCurrency === code
                    ? 'border-gold-600 bg-[rgba(201,151,58,0.08)]'
                    : 'border-border bg-default',
                )}
              >
                <Text
                  variant="body"
                  className={cn(
                    'font-soraBold',
                    selectedCurrency === code ? 'text-gold-600' : 'text-muted',
                  )}
                >
                  {code}
                </Text>
              </Pressable>
            ))}
          </Box>
        </Box>
```

With:

```tsx
        {/* Currency */}
        <Box className="pt-1">
          <Text variant="hint" className="font-soraBold text-gold-500 pt-2 pb-2 tracking-widest">
            {Strings.o4SectionCurrency}
          </Text>
          <SegmentedTabs<Currency>
            segments={[
              { value: Currency.EGP, label: Currency.EGP },
              { value: Currency.USD, label: Currency.USD },
            ]}
            value={selectedCurrency}
            onValueChange={(c) => form.setValue('currency', c)}
            variant="solid-gold"
            listClassName="w-full"
            accessibilityLabel="Account currency"
          />
        </Box>
```

- [ ] **Step 4: Remove `CURRENCY_OPTIONS` and replace the currency block in `screens/onboarding/add_account/index.tsx`**

Apply the identical change. Remove the `CURRENCY_OPTIONS` const (currently at line 22):

```tsx
const CURRENCY_OPTIONS: Currency[] = [Currency.EGP, Currency.USD];
```

Then find the `{/* Currency */}` section (currently lines 112–142). Replace:

```tsx
        {/* Currency */}
        <Box className="pt-1">
          <Text variant="hint" className="font-soraBold text-gold-500 pt-2 pb-2 tracking-widest">
            {Strings.o4SectionCurrency}
          </Text>
          <Box style={{ flexDirection: 'row' }} className="gap-2">
            {CURRENCY_OPTIONS.map((code) => (
              <Pressable
                key={code}
                onPress={() => form.setValue('currency', code)}
                style={{ flex: 1 }}
                className={cn(
                  'items-center justify-center rounded-[10px] border-[1.5px] px-3 py-3',
                  selectedCurrency === code
                    ? 'border-gold-600 bg-[rgba(201,151,58,0.08)]'
                    : 'border-border bg-default',
                )}
              >
                <Text
                  variant="body"
                  className={cn(
                    'font-soraBold',
                    selectedCurrency === code ? 'text-gold-600' : 'text-muted',
                  )}
                >
                  {code}
                </Text>
              </Pressable>
            ))}
          </Box>
        </Box>
```

With (identical to Step 3):

```tsx
        {/* Currency */}
        <Box className="pt-1">
          <Text variant="hint" className="font-soraBold text-gold-500 pt-2 pb-2 tracking-widest">
            {Strings.o4SectionCurrency}
          </Text>
          <SegmentedTabs<Currency>
            segments={[
              { value: Currency.EGP, label: Currency.EGP },
              { value: Currency.USD, label: Currency.USD },
            ]}
            value={selectedCurrency}
            onValueChange={(c) => form.setValue('currency', c)}
            variant="solid-gold"
            listClassName="w-full"
            accessibilityLabel="Account currency"
          />
        </Box>
```

- [ ] **Step 5: Verify typecheck and lint pass**

```bash
npm run typecheck 2>&1 | tail -5
npm run lint 2>&1 | tail -10
```

Expected: no errors referencing either `add_account/index.tsx` file.

- [ ] **Step 6: Run the regression test**

```bash
npm test -- --testPathPattern="add_account.schema" --ci 2>&1 | tail -15
```

Expected output includes:
```
PASS __tests__/add_account.schema.test.ts
Tests: X passed, X total
```

All tests must pass with zero changes to the test file.

- [ ] **Step 7: Confirm diffs are bounded and both files changed**

```bash
git -C /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/wave4-sp4-adoption diff HEAD -- screens/accounts/add_account/index.tsx screens/onboarding/add_account/index.tsx
```

The diff must show:
- `CURRENCY_OPTIONS` const removed from both files
- Currency `Box`+`Pressable` block replaced with `SegmentedTabs` in both files
- Import addition (`SegmentedTabs`) in both files
- **Both files are present in the diff** — if only one file appears, the other was missed

- [ ] **Step 8: Commit both files atomically**

```bash
git -C /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/wave4-sp4-adoption add screens/accounts/add_account/index.tsx screens/onboarding/add_account/index.tsx
git -C /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/wave4-sp4-adoption commit -m "$(cat <<'EOF'
refactor(accounts): adopt SegmentedTabs for currency picker (app + onboarding)

Replaces tall bordered-card Pressable pair with SegmentedTabs (solid-gold,
w-full) in both screens. Removes CURRENCY_OPTIONS const. Approved intentional
visual redesign (2026-05-25): bordered-card pair -> gold-pill strip.
EOF
)"
```

---

## Task 4 — CI parity check and PR

**Files:** none modified

### Background

Before pushing, run the four JS/TS CI jobs locally to confirm all tasks produce a green branch. GitHub CI runs all seven jobs authoritatively (including expo-doctor and Android prebuild dry-run), but local parity catches the most common failures fast.

The visual deltas below MUST be called out prominently in the PR body — they are device-QA-gated and CI will not catch them.

- [ ] **Step 1: Run the four local CI parity jobs**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/wave4-sp4-adoption && \
  npm run format:check && \
  npm run lint && \
  npm run typecheck && \
  npm test -- --ci --maxWorkers=2
```

All four must exit 0. If any fails, fix the issue and re-run from the top before proceeding.

Expected final line: something like `Tests: NN passed, NN total` with no failures.

- [ ] **Step 2: Push the branch**

```bash
git -C /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/wave4-sp4-adoption push -u origin feat/wave4-sp4-adoption
```

Always use the explicit branch name. Never use a bare `git push`.

- [ ] **Step 3: Open the PR**

```bash
gh pr create \
  --base main \
  --head feat/wave4-sp4-adoption \
  --title "refactor(wave4-sp4): adopt SegmentedTabs at 3 surfaces (categories, filter, add-account)" \
  --body "$(cat <<'EOF'
## Summary

Retires three bespoke `Pressable`-row segmented controls by replacing them with the canonical `SegmentedTabs` wrapper (`components/ui/tabs.tsx`, merged in SP-4-WRAPPER). Four files changed, no new files, no new dependencies.

- **T1 — Categories Expense/Income switcher** (`screens/settings/categories/index.tsx`): solid-gold pill, full-width via wrapping View with Spacing.sm margins + `listClassName="w-full"`.
- **T2 — Filter currency toggle** (`screens/transactions/filter/components/amount_accordion.tsx`): inner toggle only (lines 74–91); outer accordion shell untouched (Batch 3). `listClassName="w-full mb-3"`.
- **T3 — Add-account currency picker** (`screens/accounts/add_account/index.tsx` + `screens/onboarding/add_account/index.tsx`): both screens changed atomically. `listClassName="w-full"`.

## Device QA required — visual deltas

These changes are CI-green but contain visual deltas that only device QA can validate:

1. **ALL THREE TARGETS — full-width layout.** `Tabs.List` base carries `self-start`; `w-full` in `listClassName` must override it. Confirm each control fills its container width — not a left-aligned content-width pill.

2. **T2 — label size jump.** Currency toggle labels were `text-[11px]`; HeroUI `Tabs.Label` default is `text-base`. This is a significant size increase in the compact filter-sheet context. Check for overflow or layout pressure.

3. **T3 — intentional visual redesign (approved 2026-05-25).** Tall `rounded-[10px] border-[1.5px] px-3 py-3` bordered-card pair → compact `rounded-3xl` gold-pill strip. The currency picker is now visually distinct from the TypePill grid above it. This is an approved change; confirm it looks intentional.

4. **ALL THREE TARGETS — solid-gold indicator.** The `Tabs.Indicator` must render `Colors.shared.cairoGold` fill. If the gold fill does not appear (Unistyles className ordering edge case), apply the static-style fallback documented in the wrapper JSDoc (`isAnimatedStyleActive={false}` on `Tabs.Indicator`) and document in this PR.

5. **ALL THREE TARGETS — indicator shadow.** `Tabs.Indicator` inherits `shadow-sm shadow-surface/25` (HeroUI primary base). Bespoke pills had no shadow. Accepted as a delta; if device QA finds it wrong for any context, suppress via `style={{ shadowOpacity: 0, elevation: 0 }}` on `Tabs.Indicator` in the wrapper.

6. **T2 — accordion boundary.** Confirm the outer accordion shell (`border-separator bg-surface` container, the chevron header, the Input rows) is 100% untouched.

## Testing

Logic-only test policy: no new test files. Existing regression guards verified:
- `__tests__/categories.state.test.ts` (T1)
- `__tests__/database_get_transactions_filter.test.ts` (T2)
- `__tests__/add_account.schema.test.ts` (T3)
EOF
)"
```

- [ ] **Step 4: Confirm PR is open and GitHub CI is running**

```bash
gh pr view --web
```

Verify the PR page shows all seven CI jobs queued or running. GitHub CI is authoritative — it runs expo-doctor and Android prebuild dry-run in addition to the four local jobs.
