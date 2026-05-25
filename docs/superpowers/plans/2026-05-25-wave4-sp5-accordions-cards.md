# Wave 4 · SP-5-NON-CONTESTED — Filter Accordions + Dashboard Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the outer shell of the two uncontested filter accordions to HeroUI `Accordion` (controlled expansion, static chevron, animation added) and adopt HeroUI `Card` as the surface substrate for all four dashboard heavy cards, with zero rendered-text regressions and zero behavior regressions.

**Architecture:** Two independent threads share one PR. Thread 1: replace the `Pressable` header + `{expanded ? … : null}` pattern in `account_accordion.tsx` and `category_accordion.tsx` with HeroUI `Accordion` compound components; parent-controlled via `value`/`onValueChange` delegating to the existing `onToggleSection` prop; the SP-1 `SelectablePill` body is left completely intact. Thread 2: wrap the `Pressable` root of each dashboard card in a `Card` component (from heroui-native), overriding Surface's default padding, radius, and shadow to match the existing design; all internal layout, gradients, dynamic inline styles, and business logic are untouched.

**Tech Stack:** React Native (Expo), TypeScript strict, HeroUI Native v1 (`Accordion`, `Card`, `cn`), Reanimated v4, Tailwind v4 / Uniwind, MaterialCommunityIcons, oxlint + oxfmt.

**Spec:** `docs/superpowers/specs/2026-05-25-wave4-sp5-accordions-cards-design.md` (signed off).

**Branch:** `feat/wave4-sp5-accordions-dashcards` (cut from `origin/main`).

---

## CRITICAL EXCLUSION — Read before touching any file

**`screens/transactions/filter/components/amount_accordion.tsx` is NOT in scope for this PR.**

This file is contested with SP-4 (it receives an EGP/USD Tabs migration in SP-4-adoption). Its accordion shell conversion is deferred to Batch 3 (`feat/wave4-sp5-amount-accordion-shell`) after SP-4-adoption merges. Do not open it. Do not diff it. Do not mention it in the PR diff.

**Temporary 2-of-3 inconsistency (for device QA notes):** After this PR merges, the filter sheet has two HeroUI `Accordion`-shelled sections (`account_accordion`, `category_accordion`) and one legacy `Pressable`-shelled section (`amount_accordion`). This is intentional and time-bounded. The amount section will not have the animated expand/collapse spring — that is not a bug. Document this in the PR description and QA notes so reviewers do not flag it.

---

## Testing approach (read first)

This SP is **presentational only** — shell swap + surface substrate swap. Per the project's logic-only test policy (no `.tsx` render tests — CLAUDE.md / MEMORY), **no new unit tests are written**. Per-task verification is **typecheck + lint** on the changed file; the final task runs full 6-job CI parity. The existing jest suite (filter hook/state tests, dashboard hook tests) must stay green — that proves controlled-expansion callbacks and card data logic are unaffected. Behavioral correctness is confirmed at the user's device-QA gate.

Each task follows: **edit → typecheck → lint → commit.**

---

## File structure

| File | Responsibility | Change |
|---|---|---|
| `screens/transactions/filter/components/account_accordion.tsx` | Account filter accordion | Modify — outer shell only |
| `screens/transactions/filter/components/category_accordion.tsx` | Category filter accordion | Modify — outer shell only |
| `screens/dashboard/components/hero_card.tsx` | Net-worth hero card | Modify — Card substrate |
| `screens/dashboard/components/commitments_card.tsx` | Commitments summary card | Modify — Card substrate |
| `screens/dashboard/components/account_card.tsx` | Per-account card | Modify — Card substrate |
| `screens/dashboard/components/add_card.tsx` | Add-account CTA card | Modify — Card substrate |

**No files created. No files deleted.**

---

## Task 0: Worktree verification setup

Worktrees are missing the gitignored `node_modules` and `expo-env.d.ts`, so `tsc`/oxlint/jest cannot run until they are linked. Device builds are NOT done here — a symlink is correct.

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

Expected: PASS — confirms the toolchain works before any edits. If it fails, stop and investigate; do not proceed.

- [ ] **Step 3: Confirm branch**

```bash
git branch --show-current
```

Expected: `feat/wave4-sp5-accordions-dashcards`. If not on this branch, do NOT proceed — create it first with `git checkout -b feat/wave4-sp5-accordions-dashcards origin/main`.

---

## Task 1: Migrate `account_accordion.tsx` outer shell to HeroUI `Accordion`

**Files:**
- Modify: `screens/transactions/filter/components/account_accordion.tsx`

### What changes

The outer `<Pressable onPress={onToggleSection}>` header and the `{expanded ? <View>…</View> : null}` content guard are replaced with `Accordion` compound components. The `SelectablePill` body (`accounts.map(...)`) inside the expanded view is **unchanged**. The outer `<View className="border-separator bg-surface mb-2 rounded-xl border p-3.5">` wrapper is kept as the surface card.

### Controlled-expansion mapping

The parent (`FilterSheet` via `useFilterSheet`) passes `expanded: boolean` and `onToggleSection: () => void`. Map onto `Accordion`:

- `value={expanded ? 'section' : undefined}` — string when open, `undefined` when collapsed
- `onValueChange={(_v) => onToggleSection()}` — delegate ALL value changes to the parent unconditionally; the parent state is always authoritative
- `selectionMode="single"` (default — no prop needed)
- `isCollapsible` defaults to `true` — matches existing behaviour (second tap closes)

### Chevron

Use `Accordion.Indicator` with `isAnimatedStyleActive={false}` and a custom `MaterialCommunityIcons` child. This bypasses the built-in animated rotation worklet and preserves the existing static `chevron-up`/`chevron-down` icon swap with `CoreTokens.text2` color.

### Class overrides

- `Accordion.Trigger`: `className="py-0 px-0 gap-0"` zeroes the default `py-4 px-3 gap-4`. If this className override does not win over the `tv` base (verify at typecheck/lint step), add `style={{ padding: 0, gap: 0 }}` to the trigger as the documented fallback.
- `Accordion.Content`: `className="px-0 pb-0"` zeroes the default `px-3 pb-4`.

- [ ] **Step 1: Replace the file**

Replace the entire contents of `screens/transactions/filter/components/account_accordion.tsx` with:

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Accordion } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { SelectablePill } from '@/components/ui/chip';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { CoreTokens } from '@/constants/theme_tokens';
import type { Account } from '@/database/entities/account.entity';

import { formatSelectionSummary } from '../filter.helpers';

interface Props {
  accounts: Account[];
  selectedIds: string[];
  expanded: boolean;
  onToggleSection: () => void;
  onToggleId: (id: string) => void;
}

export function AccountAccordion({
  accounts,
  selectedIds,
  expanded,
  onToggleSection,
  onToggleId,
}: Props): React.ReactElement {
  const selectedNames = accounts.filter((a) => selectedIds.includes(a.id)).map((a) => a.name);
  const summary = formatSelectionSummary(selectedNames, Strings.filterSummaryAccountsEmpty);

  return (
    <View className="border-separator bg-surface mb-2 rounded-xl border p-3.5">
      <Accordion
        selectionMode="single"
        value={expanded ? 'section' : undefined}
        onValueChange={(_v) => onToggleSection()}
      >
        <Accordion.Item value="section">
          <Accordion.Trigger
            className="py-0 px-0 gap-0"
            style={{ padding: 0, gap: 0 }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Text className="font-inter text-[13px] font-semibold">
                  {Strings.filterSectionAccounts}
                </Text>
                {selectedIds.length > 0 ? (
                  <View className="bg-accent/15 min-w-[18px] items-center rounded-full px-1.5">
                    <Text className="font-inter text-accent text-[10px] font-bold">
                      {selectedIds.length}
                    </Text>
                  </View>
                ) : null}
              </View>
              <View className="flex-row items-center gap-1.5">
                <Text className="font-inter text-foreground/60 text-[11px]" numberOfLines={1}>
                  {expanded ? '' : summary}
                </Text>
                <Accordion.Indicator isAnimatedStyleActive={false}>
                  <MaterialCommunityIcons
                    name={expanded ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={CoreTokens.text2}
                  />
                </Accordion.Indicator>
              </View>
            </View>
          </Accordion.Trigger>
          <Accordion.Content className="px-0 pb-0" style={{ padding: 0 }}>
            <View className="mt-3 flex-row flex-wrap gap-1.5">
              {accounts.map((a) => (
                <SelectablePill
                  key={a.id}
                  label={a.name}
                  selected={selectedIds.includes(a.id)}
                  onPress={() => onToggleId(a.id)}
                  dotColor={a.color ?? CoreTokens.text2}
                  checkable
                  accessibilityLabel={`${a.name}, account filter`}
                />
              ))}
            </View>
          </Accordion.Content>
        </Accordion.Item>
      </Accordion>
    </View>
  );
}
```

Note: Both `className` and `style` fallbacks are included on `Accordion.Trigger` and `Accordion.Content` — the `style` prop is the documented fallback if `tv` class merge does not zero the defaults. Include both; one will win. Remove the redundant one only after confirming behaviour at device QA.

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: PASS. If `Accordion` or `isAnimatedStyleActive` are not found, confirm the export: `grep -r "isAnimatedStyleActive" node_modules/heroui-native/lib/typescript/src/components/accordion/accordion.types.d.ts` — it is declared there. A failure here means a version mismatch to investigate, not to work around.

- [ ] **Step 3: Lint**

```bash
npx oxlint --type-aware screens/transactions/filter/components/account_accordion.tsx
```

Expected: 0 warnings, 0 errors. The removed `Pressable` import will trigger no unused-import warning since the import line is gone. If oxlint flags `_v` in `onValueChange={(_v) => onToggleSection()}`, the underscore prefix marks it intentionally unused — that is the correct pattern and should not be flagged.

- [ ] **Step 4: Format**

```bash
npx oxfmt screens/transactions/filter/components/account_accordion.tsx
```

Expected: no diff or auto-fixed.

- [ ] **Step 5: Commit**

```bash
git add screens/transactions/filter/components/account_accordion.tsx
git commit -m "refactor(transactions): AccountAccordion shell → HeroUI Accordion (controlled)"
```

---

## Task 2: Migrate `category_accordion.tsx` outer shell to HeroUI `Accordion`

**Files:**
- Modify: `screens/transactions/filter/components/category_accordion.tsx`

This is a structural mirror of Task 1. The differences are: the entity type (`Category` vs `Account`), the section label (`Strings.filterSectionCategories`), the summary empty string (`Strings.filterSummaryCategoriesEmpty`), and the oxlint-disable comment on the dot fallback (category color can be null at the DB level despite the TypeScript type).

- [ ] **Step 1: Replace the file**

Replace the entire contents of `screens/transactions/filter/components/category_accordion.tsx` with:

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Accordion } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { SelectablePill } from '@/components/ui/chip';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { CoreTokens } from '@/constants/theme_tokens';
import type { Category } from '@/database/entities/category.entity';

import { formatSelectionSummary } from '../filter.helpers';

interface Props {
  categories: Category[];
  selectedIds: string[];
  expanded: boolean;
  onToggleSection: () => void;
  onToggleId: (id: string) => void;
}

export function CategoryAccordion({
  categories,
  selectedIds,
  expanded,
  onToggleSection,
  onToggleId,
}: Props): React.ReactElement {
  const selectedNames = categories.filter((c) => selectedIds.includes(c.id)).map((c) => c.name);
  const summary = formatSelectionSummary(selectedNames, Strings.filterSummaryCategoriesEmpty);

  return (
    <View className="border-separator bg-surface mb-2 rounded-xl border p-3.5">
      <Accordion
        selectionMode="single"
        value={expanded ? 'section' : undefined}
        onValueChange={(_v) => onToggleSection()}
      >
        <Accordion.Item value="section">
          <Accordion.Trigger
            className="py-0 px-0 gap-0"
            style={{ padding: 0, gap: 0 }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Text className="font-inter text-[13px] font-semibold">
                  {Strings.filterSectionCategories}
                </Text>
                {selectedIds.length > 0 ? (
                  <View className="bg-accent/15 min-w-[18px] items-center rounded-full px-1.5">
                    <Text className="font-inter text-accent text-[10px] font-bold">
                      {selectedIds.length}
                    </Text>
                  </View>
                ) : null}
              </View>
              <View className="flex-row items-center gap-1.5">
                <Text className="font-inter text-foreground/60 text-[11px]" numberOfLines={1}>
                  {expanded ? '' : summary}
                </Text>
                <Accordion.Indicator isAnimatedStyleActive={false}>
                  <MaterialCommunityIcons
                    name={expanded ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={CoreTokens.text2}
                  />
                </Accordion.Indicator>
              </View>
            </View>
          </Accordion.Trigger>
          <Accordion.Content className="px-0 pb-0" style={{ padding: 0 }}>
            <View className="mt-3 flex-row flex-wrap gap-1.5">
              {categories.map((c) => (
                <SelectablePill
                  key={c.id}
                  label={c.name}
                  selected={selectedIds.includes(c.id)}
                  onPress={() => onToggleId(c.id)}
                  // oxlint-disable-next-line typescript/no-unnecessary-condition -- DB color can be null despite type
                  dotColor={c.color ?? CoreTokens.text2}
                  checkable
                  accessibilityLabel={`${c.name}, category filter`}
                />
              ))}
            </View>
          </Accordion.Content>
        </Accordion.Item>
      </Accordion>
    </View>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Lint**

```bash
npx oxlint --type-aware screens/transactions/filter/components/category_accordion.tsx
```

Expected: 0 warnings, 0 errors. The `// oxlint-disable-next-line typescript/no-unnecessary-condition` comment on the `dotColor` line must be present and directly above the `dotColor={c.color ?? CoreTokens.text2}` prop — the comment suppresses the strict-null check warning on the nullish coalescing operator where TypeScript's type says the value can't be null but the DB can produce null at runtime.

- [ ] **Step 4: Format**

```bash
npx oxfmt screens/transactions/filter/components/category_accordion.tsx
```

Expected: no diff or auto-fixed.

- [ ] **Step 5: Commit**

```bash
git add screens/transactions/filter/components/category_accordion.tsx
git commit -m "refactor(transactions): CategoryAccordion shell → HeroUI Accordion (controlled)"
```

---

## Task 3: Migrate `hero_card.tsx` to HeroUI `Card` substrate

**Files:**
- Modify: `screens/dashboard/components/hero_card.tsx`

### What changes

The outer `<Pressable>` stays as the pressable region (accessibility + onPress). A `<Card>` wraps its children, replacing the shape/surface role that was previously baked into the `Pressable` className. All internal content — `LinearGradient`, `GridTexture`, the halo `View`, and all text/icon rows — is untouched.

### Class override strategy

`Card` via `Surface` applies these defaults by default: `p-4 rounded-3xl shadow-surface overflow-hidden bg-surface`. All must be overridden:
- `p-0` — existing content has its own `px-5 pt-5` / `pb-5`
- `rounded-2xl` — replaces `rounded-3xl`
- `border border-border` — the card uses border-based depth, not shadow
- `overflow-hidden` — must be preserved (clips gradient and halo)
- `bg-transparent` — `HeroCard` has a gradient background; `bg-surface` must be neutralised

If `shadow-surface` from the `tv` base class is not removed by the above overrides, add `style={{ elevation: 0, shadowOpacity: 0 }}` on the `Card` (the documented fallback — include it proactively since the Surface default adds shadow and these cards never had one).

The `Pressable` moves its shape classes down to the `Card`: the `Pressable` retains only `onPress`, `accessibilityRole`, and `accessibilityLabel`.

- [ ] **Step 1: Replace the file**

Replace the entire contents of `screens/dashboard/components/hero_card.tsx` with:

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { Card } from 'heroui-native';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Defs, Pattern, Path, Rect } from 'react-native-svg';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import { formatAmount } from '@/utils/format_amount';
import { ms } from '@/utils/responsive';

interface HeroCardProps {
  assetsEgp: number;
  assetsUsd: number;
  rate: number;
  isManualOverride: boolean;
  assetsCount: number;
  liabilitiesCount: number;
  onPress: () => void;
}

function GridTexture() {
  return (
    <Svg style={StyleSheet.absoluteFill}>
      <Defs>
        <Pattern id="dash-hero-grid-v2" width="26" height="26" patternUnits="userSpaceOnUse">
          <Path d="M 26 0 L 0 0 0 26" fill="none" stroke="#FFFFFF" strokeWidth="1" opacity="0.03" />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#dash-hero-grid-v2)" />
    </Svg>
  );
}

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
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={Strings.dashAvailableToSpend}
    >
      <Card
        className="mx-4 mt-4 overflow-hidden rounded-2xl border border-border bg-transparent p-0"
        style={{ elevation: 0, shadowOpacity: 0 }}
      >
        <LinearGradient
          colors={[Colors.shared.heroGrad1, Colors.shared.heroGrad2, Colors.shared.heroGrad3]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <GridTexture />
        <View
          pointerEvents="none"
          className="absolute"
          style={{
            top: -ms(40),
            right: -ms(40),
            width: ms(160),
            height: ms(160),
            borderRadius: ms(80),
            backgroundColor: Colors.dark.gold,
            opacity: 0.18,
          }}
        />

        <View
          className="flex-row items-center justify-between px-5 pt-5"
          style={{ flexDirection: 'row' }}
        >
          <View className="flex-row items-center" style={{ flexDirection: 'row', gap: ms(8) }}>
            <View
              className="items-center justify-center rounded-full"
              style={{
                width: ms(24),
                height: ms(24),
                backgroundColor: Colors.shared.cairoGold + '22',
              }}
            >
              <MaterialCommunityIcons name="wallet" size={ms(14)} color={Colors.shared.cairoGold} />
            </View>
            <Text variant="caption" className="text-foreground tracking-wide">
              {Strings.dashAvailableToSpend}
            </Text>
          </View>
          {isManualOverride && (
            <View
              className="flex-row items-center rounded-full"
              style={{
                flexDirection: 'row',
                gap: ms(4),
                paddingHorizontal: ms(8),
                paddingVertical: ms(3),
                backgroundColor: Colors.shared.cairoGold + '22',
                borderWidth: 1,
                borderColor: Colors.shared.cairoGold,
              }}
            >
              <View
                style={{
                  width: ms(5),
                  height: ms(5),
                  borderRadius: ms(3),
                  backgroundColor: Colors.shared.cairoGold,
                }}
              />
              <Text className="text-xs uppercase" style={{ color: Colors.shared.cairoGold }}>
                {Strings.currencyManualShort}
              </Text>
            </View>
          )}
        </View>

        <Text
          className="mt-3 mb-2 px-5 font-bold"
          style={{ color: Colors.dark.gold, fontSize: ms(32) }}
        >
          {formatAmount(assetsEgp)} <Text style={{ fontSize: ms(16), opacity: 0.8 }}>EGP</Text>
        </Text>

        <View className="flex-row flex-wrap px-5 pb-5" style={{ flexDirection: 'row', gap: ms(6) }}>
          <View
            className="flex-row items-center rounded-full px-2 py-1"
            style={{ flexDirection: 'row', gap: ms(4), backgroundColor: Colors.dark.overlayWhite7 }}
          >
            <MaterialCommunityIcons
              name="approximately-equal"
              size={ms(11)}
              color={Colors.dark.text1}
            />
            <Text className="text-foreground text-xs">
              {rate > 0 ? `${formatAmount(assetsUsd, 0)} USD` : '— USD'}
            </Text>
          </View>
          <View
            className="flex-row items-center rounded-full px-2 py-1"
            style={{ flexDirection: 'row', gap: ms(4), backgroundColor: Colors.dark.overlayWhite7 }}
          >
            <MaterialCommunityIcons name="swap-horizontal" size={ms(11)} color={Colors.dark.text1} />
            <Text className="text-foreground text-xs">1 USD = {rate.toFixed(2)} EGP</Text>
          </View>
          <View
            className="flex-row items-center rounded-full px-2 py-1"
            style={{ flexDirection: 'row', gap: ms(4), backgroundColor: Colors.dark.overlayWhite7 }}
          >
            <MaterialCommunityIcons name="bank-outline" size={ms(11)} color={Colors.dark.text1} />
            <Text className="text-foreground text-xs">
              {totalAccounts} {Strings.o6AccountsUnit}
            </Text>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: PASS. `Card` accepts `className`, `style`, and standard `ViewProps` children — no special prop needed.

- [ ] **Step 3: Lint**

```bash
npx oxlint --type-aware screens/dashboard/components/hero_card.tsx
```

Expected: 0 warnings, 0 errors.

- [ ] **Step 4: Format**

```bash
npx oxfmt screens/dashboard/components/hero_card.tsx
```

Expected: no diff or auto-fixed.

- [ ] **Step 5: Commit**

```bash
git add screens/dashboard/components/hero_card.tsx
git commit -m "refactor(dashboard): HeroCard shell → HeroUI Card substrate"
```

---

## Task 4: Migrate `commitments_card.tsx` to HeroUI `Card` substrate

**Files:**
- Modify: `screens/dashboard/components/commitments_card.tsx`

### What changes

The `<Pressable>` root becomes a `Pressable` wrapping a `<Card>`. The existing `className="bg-surface border-border mx-4 mt-4 rounded-2xl border px-4 py-3"` and `style={{ gap: ms(8) }}` shift from `Pressable` to `Card`. The `Stat` helper function, the `LinearGradient` progress bar, and all internal `View`/`Text`/`MaterialCommunityIcons` children are untouched.

The `Pressable` retains only `onPress`, `accessibilityRole="button"`, and `accessibilityLabel` (the card is fully tappable — it navigates to the commitments screen).

- [ ] **Step 1: Replace the file**

Replace the entire contents of `screens/dashboard/components/commitments_card.tsx` with:

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { Card } from 'heroui-native';
import React from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import { formatMonthYear } from '@/utils/format_date';
import { ms } from '@/utils/responsive';

interface Props {
  counts: {
    paid: number;
    overdue: number;
    due: number;
    upcoming: number;
    skipped: number;
    total: number;
  };
  totalsByCurrency: Map<string, number>;
  yearMonth: string;
  onPress: () => void;
}

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const numberFmt = new Intl.NumberFormat('en-US', { style: 'decimal' });

export function CommitmentsCard({ counts, totalsByCurrency, yearMonth, onPress }: Props) {
  const monthLabel = formatMonthYear(yearMonth);
  const progress = counts.total === 0 ? 0 : counts.paid / counts.total;
  const progressPct = Math.round(progress * 100);
  const totalEntries = Array.from(totalsByCurrency.entries());
  const totalsLine =
    totalEntries.length === 0
      ? '—'
      : totalEntries.map(([cur, amt]) => `${numberFmt.format(amt)} ${cur}`).join('  ·  ');

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={Strings.dashboardCommitmentsTitle}
    >
      <Card
        className="mx-4 mt-4 rounded-2xl border border-border px-4 py-3 p-0"
        style={{ gap: ms(8), elevation: 0, shadowOpacity: 0 }}
      >
        <View className="flex-row items-center justify-between" style={{ flexDirection: 'row' }}>
          <View className="flex-row items-center" style={{ flexDirection: 'row', gap: ms(8) }}>
            <View
              className="items-center justify-center rounded-full"
              style={{
                width: ms(22),
                height: ms(22),
                backgroundColor: Colors.shared.cairoGold + '22',
              }}
            >
              <MaterialCommunityIcons
                name="calendar-check"
                size={ms(13)}
                color={Colors.shared.cairoGold}
              />
            </View>
            <Text variant="caption" className="text-foreground font-semibold">
              {Strings.dashboardCommitmentsTitle}
            </Text>
          </View>
          <Text variant="caption" className="text-muted">
            {monthLabel}
          </Text>
        </View>

        <View
          className="flex-row items-center justify-between"
          style={{ flexDirection: 'row', gap: ms(8) }}
        >
          <View className="flex-1" style={{ flex: 1 }}>
            <Text variant="hint" className="text-muted text-xs uppercase">
              {Strings.commitmentsTotalCommitted}
            </Text>
            <Text className="text-foreground text-lg font-bold" numberOfLines={1}>
              {totalsLine}
            </Text>
          </View>
          <View
            className="rounded-full"
            style={{
              paddingHorizontal: ms(12),
              paddingVertical: ms(3),
              backgroundColor: Colors.shared.cairoGold + '22',
            }}
          >
            <Text className="text-base font-bold" style={{ color: Colors.shared.cairoGold }}>
              {progressPct}%
            </Text>
          </View>
        </View>

        <View
          className="overflow-hidden rounded"
          style={{ height: ms(3), backgroundColor: Colors.dark.surfaceEl }}
        >
          <LinearGradient
            colors={[Colors.shared.cairoGold, Colors.dark.gold]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ height: ms(3), width: `${progressPct}%`, borderRadius: ms(2) }}
          />
        </View>

        <View className="flex-row items-center justify-between" style={{ flexDirection: 'row' }}>
          <Stat icon="check-circle" color={Colors.dark.positive} value={counts.paid} />
          <Stat icon="alert-circle" color={Colors.dark.negative} value={counts.overdue} />
          <Stat icon="clock-outline" color={Colors.dark.gold} value={counts.due} />
          <Stat icon="calendar-clock" color={Colors.dark.text2} value={counts.upcoming} />
          <Stat icon="minus-circle" color={Colors.dark.text3} value={counts.skipped} />
        </View>
      </Card>
    </Pressable>
  );
}

function Stat({ icon, color, value }: { icon: IconName; color: string; value: number }) {
  return (
    <View className="flex-row items-center" style={{ flexDirection: 'row', gap: ms(4) }}>
      <MaterialCommunityIcons name={icon} size={ms(13)} color={color} />
      <Text variant="caption" style={{ color }} className="font-semibold">
        {value}
      </Text>
    </View>
  );
}
```

Note on `accessibilityLabel`: the original `Pressable` had no explicit `accessibilityLabel`. `Strings.dashboardCommitmentsTitle` ("Commitments") is added here — it is an accessibility improvement that does not change any visible text.

Note on `className="mx-4 mt-4 rounded-2xl border border-border px-4 py-3 p-0"`: `p-0` is listed after `px-4 py-3` — Tailwind v4 processes these left-to-right in the generated output; however, the intent is to zero Surface's default `p-4` and then apply our explicit `px-4 py-3`. If ordering causes Surface's `p-4` to win, move `p-0` before `px-4 py-3` in the className string, or replace with just `className="mx-4 mt-4 rounded-2xl border border-border px-4 py-3"` (the Surface default `p-4` will be overridden by the explicit axis values either way in Tailwind v4). Verify at device QA.

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Lint**

```bash
npx oxlint --type-aware screens/dashboard/components/commitments_card.tsx
```

Expected: 0 warnings, 0 errors.

- [ ] **Step 4: Format**

```bash
npx oxfmt screens/dashboard/components/commitments_card.tsx
```

Expected: no diff or auto-fixed.

- [ ] **Step 5: Commit**

```bash
git add screens/dashboard/components/commitments_card.tsx
git commit -m "refactor(dashboard): CommitmentsCard shell → HeroUI Card substrate"
```

---

## Task 5: Migrate `account_card.tsx` to HeroUI `Card` substrate

**Files:**
- Modify: `screens/dashboard/components/account_card.tsx`

### What changes

The `<Pressable>` outer element retains `onPress`, `accessibilityRole`, `accessibilityLabel`, and the runtime `style={{ width, marginLeft: ms(4) }}` (these cannot move to a `className` — they are runtime values). The shape/surface classes move from the `Pressable` className to a `<Card>` that wraps all children. The accent bar `<View>`, the inner layout `<View>`, and the entire `buildInfoRows` / `availableCreditColor` / `nextDueDate` logic are completely untouched.

- [ ] **Step 1: Replace only the `AccountCard` function's return statement**

In `screens/dashboard/components/account_card.tsx`, locate the `AccountCard` function (line 171 onwards). Replace only the `return (...)` block. Leave everything above — the imports, `TYPE_ICONS`, `availableCreditColor`, `nextDueDate`, `InfoRow` interface, `buildInfoRows`, and `AccountCardProps` interface — completely unchanged.

Replace:

```tsx
  return (
    <Pressable
      onPress={onPress}
      className="bg-surface border-border overflow-hidden rounded-2xl border"
      style={{ width, marginLeft: ms(4) }}
      accessibilityRole="button"
      accessibilityLabel={account.name}
    >
      {/* Accent bar — dynamic color stays inline */}
      <View style={{ height: ms(3), width: '100%', backgroundColor: color }} />

      <View style={{ paddingHorizontal: ms(12), paddingVertical: ms(9), gap: ms(6) }}>
```

with:

```tsx
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={account.name}
      style={{ width, marginLeft: ms(4) }}
    >
      <Card
        className="overflow-hidden rounded-2xl border border-border p-0"
        style={{ elevation: 0, shadowOpacity: 0 }}
      >
        {/* Accent bar — dynamic color stays inline */}
        <View style={{ height: ms(3), width: '100%', backgroundColor: color }} />

        <View style={{ paddingHorizontal: ms(12), paddingVertical: ms(9), gap: ms(6) }}>
```

Then at the end of the return, the two closing tags change from:

```tsx
      </View>
    </Pressable>
  );
```

to:

```tsx
        </View>
      </Card>
    </Pressable>
  );
```

Also add the `Card` import at the top of the file. The current imports are:

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, View } from 'react-native';
```

Replace with:

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Card } from 'heroui-native';
import { Pressable, View } from 'react-native';
```

The full resulting file after all three edits applied:

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Card } from 'heroui-native';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { AccountType, Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { AccountColors, Colors, Size } from '@/constants/theme';
import type { AccountStats } from '@/database/account_stats';
import type { Account } from '@/store/account.store';
import { formatAmount } from '@/utils/format_amount';
import { ms, msFont } from '@/utils/responsive';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const TYPE_ICONS: Record<AccountType, IconName> = {
  [AccountType.Bank]: 'bank',
  [AccountType.SmartWallet]: 'cellphone-nfc',
  [AccountType.PhysicalWallet]: 'wallet',
  [AccountType.PhysicalSavings]: 'piggy-bank',
  [AccountType.CreditCard]: 'credit-card',
};

function availableCreditColor(available: number, limit: number): string {
  if (limit <= 0) return Colors.dark.text2;
  const pct = available / limit;
  if (pct > 0.5) return Colors.dark.positive;
  if (pct >= 0.2) return Colors.dark.warning;
  return Colors.dark.negative;
}

function nextDueDate(dueDay: number): string {
  const today = new Date();
  const thisMonthDue = new Date(today.getFullYear(), today.getMonth(), dueDay);
  const target =
    thisMonthDue.getDate() < today.getDate() || thisMonthDue.getMonth() < today.getMonth()
      ? new Date(today.getFullYear(), today.getMonth() + 1, dueDay)
      : thisMonthDue;
  return target.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface InfoRow {
  label: string;
  value: string;
  valueColor?: string;
  icon?: 'up' | 'down';
}

function buildInfoRows(account: Account, rate: number, stats: AccountStats | undefined): InfoRow[] {
  const s = stats ?? { month_in: 0, month_out: 0, week_in: 0, week_out: 0 };
  const cur = account.currency;
  const isUSD = cur === Currency.USD;

  // ─── Credit Card ────────────────────────────────────────────────────────────
  if (account.type === AccountType.CreditCard) {
    const limit = account.credit_limit ?? 0;
    const balance = account.current_balance;
    const available = Math.max(0, limit - balance);
    const isOverLimit = balance > limit && limit > 0;
    const availColor = availableCreditColor(available, limit);
    const dueDay = account.statement_due_day;

    return [
      {
        label: Strings.cardLimitLabel,
        value: `${formatAmount(limit)} EGP`,
      },
      {
        label: Strings.cardAvailableLabel,
        value: isOverLimit ? Strings.cardOverLimit : `${formatAmount(available)} EGP`,
        valueColor: availColor,
      },
      {
        label: Strings.cardDueDateLabel,
        value: dueDay != null && dueDay > 0 ? nextDueDate(dueDay) : '—',
      },
    ];
  }

  // ─── Physical Wallet (spending) ──────────────────────────────────────────────
  if (account.type === AccountType.PhysicalWallet) {
    const daysElapsed = Math.max(1, new Date().getDate());
    const avgDay = s.month_out / daysElapsed;
    return [
      {
        label: Strings.cardMonthSpendLabel,
        value: `${formatAmount(s.month_out)} ${cur}`,
        valueColor: s.month_out > 0 ? Colors.dark.negative : Colors.dark.text1,
      },
      {
        label: Strings.cardAvgDayLabel,
        value: `${formatAmount(avgDay, 1)} ${cur}`,
      },
      {
        label: Strings.cardWeekSpendLabel,
        value: `${formatAmount(s.week_out)} ${cur}`,
        valueColor: s.week_out > 0 ? Colors.dark.negative : Colors.dark.text1,
      },
    ];
  }

  // ─── Physical Savings ────────────────────────────────────────────────────────
  if (account.type === AccountType.PhysicalSavings) {
    const change = s.month_in - s.month_out;
    const monthStart = account.current_balance - change;
    const changeColor = change >= 0 ? Colors.dark.positive : Colors.dark.negative;
    return [
      {
        label: Strings.cardMonthStartLabel,
        value: `${formatAmount(Math.max(0, monthStart))} ${cur}`,
      },
      {
        label: Strings.cardChangeLabel,
        value: `${change >= 0 ? '+' : ''}${formatAmount(change)} ${cur}`,
        valueColor: changeColor,
        icon: change >= 0 ? 'up' : 'down',
      },
    ];
  }

  // ─── Bank / SmartWallet ──────────────────────────────────────────────────────
  const weekNet = s.week_in - s.week_out;
  const weekNetColor = weekNet >= 0 ? Colors.dark.positive : Colors.dark.negative;

  if (isUSD) {
    return [
      {
        label: Strings.cardMonthInLabel,
        value: `${formatAmount(s.month_in)} ${cur}`,
        valueColor: s.month_in > 0 ? Colors.dark.positive : Colors.dark.text1,
      },
      {
        label: Strings.cardMonthOutLabel,
        value: `${formatAmount(s.month_out)} ${cur}`,
        valueColor: s.month_out > 0 ? Colors.dark.negative : Colors.dark.text1,
      },
      {
        label: Strings.cardInEgpLabel,
        value: `${formatAmount(account.current_balance * rate)} EGP`,
        valueColor: Colors.dark.gold,
      },
    ];
  }

  return [
    {
      label: Strings.cardMonthInLabel,
      value: `${formatAmount(s.month_in)} ${cur}`,
      valueColor: s.month_in > 0 ? Colors.dark.positive : Colors.dark.text1,
    },
    {
      label: Strings.cardMonthOutLabel,
      value: `${formatAmount(s.month_out)} ${cur}`,
      valueColor: s.month_out > 0 ? Colors.dark.negative : Colors.dark.text1,
    },
    {
      label: Strings.cardThisWeekLabel,
      value: `${weekNet >= 0 ? '+' : ''}${formatAmount(weekNet)} ${cur}`,
      valueColor: weekNetColor,
    },
  ];
}

interface AccountCardProps {
  account: Account;
  rate: number;
  stats: AccountStats | undefined;
  width: number;
  onPress: () => void;
}

export function AccountCard({ account, rate, stats, width, onPress }: AccountCardProps) {
  const color = account.color ?? AccountColors[0];
  const isCreditCard = account.type === AccountType.CreditCard;
  const balanceColor = isCreditCard ? Colors.dark.negative : Colors.dark.gold;
  const icon = TYPE_ICONS[account.type];
  const infoRows = buildInfoRows(account, rate, stats);

  const showProgress = isCreditCard && (account.credit_limit ?? 0) > 0;
  const limit = account.credit_limit ?? 0;
  const available = Math.max(0, limit - account.current_balance);
  const progressPct = showProgress ? Math.min(1, account.current_balance / limit) : 0;
  const progressColor = availableCreditColor(available, limit);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={account.name}
      style={{ width, marginLeft: ms(4) }}
    >
      <Card
        className="overflow-hidden rounded-2xl border border-border p-0"
        style={{ elevation: 0, shadowOpacity: 0 }}
      >
        {/* Accent bar — dynamic color stays inline */}
        <View style={{ height: ms(3), width: '100%', backgroundColor: color }} />

        <View style={{ paddingHorizontal: ms(12), paddingVertical: ms(9), gap: ms(6) }}>
          {/* Card top */}
          <View style={{ gap: ms(5) }}>
            {/* Name row */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: ms(5),
              }}
            >
              <Text
                variant="title"
                className="text-foreground font-bold"
                numberOfLines={1}
                style={{ flex: 1, fontSize: msFont(17) }}
              >
                {account.name}
              </Text>
              {/* Currency pill — border color is dynamic */}
              <View
                className="rounded"
                style={{
                  borderWidth: 1,
                  borderColor: color + '55',
                  paddingHorizontal: ms(6),
                  paddingVertical: ms(2),
                }}
              >
                <Text variant="caption" className="text-muted font-semibold">
                  {account.currency}
                </Text>
              </View>
            </View>

            {/* Balance row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: ms(6) }}>
              {/* Icon box — dynamic background color stays inline */}
              <View
                className="rounded"
                style={{
                  width: ms(30),
                  height: ms(30),
                  borderRadius: ms(7),
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  backgroundColor: color + '22',
                }}
              >
                <MaterialCommunityIcons name={icon} size={ms(15)} color={color} />
              </View>
              <Text
                variant="numMd"
                numberOfLines={1}
                style={{ flex: 1, color: balanceColor, fontSize: msFont(17) }}
              >
                {formatAmount(account.current_balance)} {account.currency}
              </Text>
            </View>
          </View>

          {/* Divider */}
          <View className="border-border border-t" style={{ height: Size.hairline }} />

          {/* Info rows */}
          <View style={{ gap: ms(4) }}>
            {infoRows.map((row, i) => (
              <View
                key={i}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: ms(5),
                }}
              >
                <Text variant="caption" className="text-muted" style={{ flexShrink: 0 }}>
                  {row.label}
                </Text>
                <View
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: ms(3),
                  }}
                >
                  {row.icon && (
                    <MaterialCommunityIcons
                      name={row.icon === 'up' ? 'trending-up' : 'trending-down'}
                      size={ms(12)}
                      color={row.valueColor ?? Colors.dark.text1}
                    />
                  )}
                  <Text
                    variant="caption"
                    numberOfLines={1}
                    style={[
                      { textAlign: 'right' },
                      row.valueColor ? { color: row.valueColor } : undefined,
                    ]}
                  >
                    {row.value}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Credit progress bar */}
          {showProgress && (
            <View
              className="border-border overflow-hidden"
              style={{ height: ms(3), borderRadius: ms(2), backgroundColor: Colors.dark.border }}
            >
              <View
                style={{
                  height: '100%',
                  borderRadius: ms(2),
                  width: `${progressPct * 100}%`,
                  backgroundColor: progressColor,
                }}
              />
            </View>
          )}
        </View>
      </Card>
    </Pressable>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Lint**

```bash
npx oxlint --type-aware screens/dashboard/components/account_card.tsx
```

Expected: 0 warnings, 0 errors.

- [ ] **Step 4: Format**

```bash
npx oxfmt screens/dashboard/components/account_card.tsx
```

Expected: no diff or auto-fixed.

- [ ] **Step 5: Commit**

```bash
git add screens/dashboard/components/account_card.tsx
git commit -m "refactor(dashboard): AccountCard shell → HeroUI Card substrate"
```

---

## Task 6: Migrate `add_card.tsx` to HeroUI `Card` substrate

**Files:**
- Modify: `screens/dashboard/components/add_card.tsx`

### What changes

Simplest card. The `<Pressable>` retains `onPress`, `accessibilityRole`, `accessibilityLabel`, and the runtime `style={{ width, marginLeft: ms(4), alignSelf: 'stretch' }}`. The shape and surface classes move to a `<Card>` that wraps the accent bar and centered content.

- [ ] **Step 1: Replace the file**

Replace the entire contents of `screens/dashboard/components/add_card.tsx` with:

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Card } from 'heroui-native';
import React from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import { ms } from '@/utils/responsive';

interface AddCardProps {
  width: number;
  onPress: () => void;
}

const ACCENT = Colors.shared.cairoGold;

export function AddCard({ width, onPress }: AddCardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={Strings.emptyAccountsCta}
      style={{ width, marginLeft: ms(4), alignSelf: 'stretch' }}
    >
      <Card
        className="overflow-hidden rounded-2xl border border-border p-0"
        style={{ flex: 1, elevation: 0, shadowOpacity: 0 }}
      >
        {/* Accent bar — mirrors AccountCard's account-color accent */}
        <View style={{ height: ms(3), width: '100%', backgroundColor: ACCENT }} />

        <View className="flex-1 items-center justify-center" style={{ gap: ms(8), padding: ms(12) }}>
          <View
            style={{
              width: ms(44),
              height: ms(44),
              borderRadius: ms(22),
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: ACCENT + '22',
            }}
          >
            <MaterialCommunityIcons name="plus" size={ms(25)} color={ACCENT} />
          </View>
          <Text variant="caption" className="font-semibold" style={{ color: ACCENT }}>
            {Strings.emptyAccountsCta}
          </Text>
        </View>
      </Card>
    </Pressable>
  );
}
```

Note: `style={{ flex: 1 }}` is added to `Card` to preserve the `alignSelf: 'stretch'` height inheritance from the `Pressable`. Without it the Card would not stretch to match sibling account cards in the horizontal scroll. `flex-1` className is not used here (layout-critical container — per CLAUDE.md, use `style` for flex on layout-critical containers).

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Lint**

```bash
npx oxlint --type-aware screens/dashboard/components/add_card.tsx
```

Expected: 0 warnings, 0 errors.

- [ ] **Step 4: Format**

```bash
npx oxfmt screens/dashboard/components/add_card.tsx
```

Expected: no diff or auto-fixed.

- [ ] **Step 5: Commit**

```bash
git add screens/dashboard/components/add_card.tsx
git commit -m "refactor(dashboard): AddCard shell → HeroUI Card substrate"
```

---

## Task 7: Full CI parity + PR

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
  && echo "✓ CI parity green — safe to push"
```

Expected: ends with `✓ CI parity green — safe to push`. If any step fails: fix it, re-run the chain from the top, repeat until green. Never push a failing chain.

Common failure modes:
- `format:check` fails → run `npx oxfmt <file>` on the changed files, re-stage, re-run chain.
- `lint` fails → check oxlint output for unused imports or type-aware findings; fix inline; re-run chain.
- `typecheck` fails → usually a missing `React` import or a wrong prop name; fix and re-run.
- `test -- --ci` fails → the accordion hook/state tests or dashboard hook tests failed. If so, the refactor accidentally broke a callback wire — check that `onToggleSection` is still called, and that `onPress` on card components is still wired correctly.
- `expo prebuild` fails → usually an unresolved native dep; unlikely for a pure JS change.

- [ ] **Step 2: Push the branch**

```bash
git push -u origin feat/wave4-sp5-accordions-dashcards
```

- [ ] **Step 3: Open the PR**

```bash
gh pr create \
  --title "refactor(ui): Wave 4 SP-5-NON-CONTESTED — filter accordions + dashboard cards → HeroUI" \
  --body "$(cat <<'EOF'
## Summary
- Migrate outer expand/collapse shell of `account_accordion.tsx` and `category_accordion.tsx` to HeroUI `Accordion` compound component. Expansion is fully controlled via existing `expanded`/`onToggleSection` props (mapped to `value`/`onValueChange`). SP-1's `SelectablePill` body is untouched.
- Adopt HeroUI `Card` as the surface substrate for all four dashboard heavy cards (`hero_card.tsx`, `commitments_card.tsx`, `account_card.tsx`, `add_card.tsx`). Surface defaults overridden: `p-0 rounded-2xl border border-border shadow-none`. All internal layout, gradients, dynamic inline styles, and business logic unchanged.
- Zero rendered-text changes. Accepted visual normalization: accordion expand/collapse gains a Reanimated spring layout animation (positive improvement).

**EXCLUSION:** `amount_accordion.tsx` is NOT in this PR (contested with SP-4; deferred to Batch 3 `feat/wave4-sp5-amount-accordion-shell`). The filter sheet will have 2-of-3 accordions migrated until Batch 3 merges — this is intentional and not a bug.

Spec: `docs/superpowers/specs/2026-05-25-wave4-sp5-accordions-cards-design.md`
Plan: `docs/superpowers/plans/2026-05-25-wave4-sp5-accordions-cards.md`

## Test plan
- [ ] CI parity green (format, lint, typecheck, jest, expo-doctor, android prebuild)
- [ ] Device QA: filter sheet — accounts accordion expands/collapses with spring animation, count badge appears/disappears, collapsed summary text renders, dot+check pills select correctly
- [ ] Device QA: filter sheet — categories accordion same as above
- [ ] Device QA: filter sheet — amount accordion still works (legacy shell — no animation; intentional)
- [ ] Device QA: dashboard hero card renders correctly, gradient visible, is pressable, navigates to accounts
- [ ] Device QA: dashboard commitments card renders progress bar and stats row, is pressable, navigates to commitments
- [ ] Device QA: dashboard account cards render accent bar, balance, info rows; credit card shows progress bar; is pressable, navigates to account detail
- [ ] Device QA: dashboard add-account card renders gold accent bar and plus icon, stretches to match account card height, is pressable, opens add-account sheet
EOF
)"
```

Expected: PR URL returned.

- [ ] **Step 4: Request code review**

Invoke `anthropic-skills:requesting-code-review` with @tariq's lens.

Fix ALL findings (Critical + Suggestions + Nits). Re-run CI parity after fixes. Tariq approves and merges on the user's behalf per autonomous-team workflow — hold the merge until the user's device-QA gate passes (CLAUDE.md critical trigger §8).

---

## Self-review notes (author)

### Spec coverage

- Filter accordions (`account_accordion.tsx`, `category_accordion.tsx`) shell → HeroUI `Accordion`: Tasks 1 + 2. ✓
- Controlled expansion (`value`/`onValueChange` delegating to `onToggleSection`): Tasks 1 + 2, Step 1. ✓
- Static chevron via `isAnimatedStyleActive={false}` + custom children: Tasks 1 + 2, Step 1. ✓
- Count badge preserved: both accordion tasks, count badge `View` is byte-identical. ✓
- Summary text preserved: both accordion tasks, `summary` computed value unchanged. ✓
- `SelectablePill` body intact: both accordion tasks, `accounts.map` / `categories.map` inside `Accordion.Content` unchanged from post-SP-1 state. ✓
- Dashboard cards → HeroUI `Card` substrate: Tasks 3–6. ✓
- `p-0 rounded-2xl border border-border shadow-none` override pattern: each card task. ✓
- Dynamic `style` props (`width`, `marginLeft`, `gap`, `color`) remain on `Pressable`/inner `View`/`Card style`: each card task. ✓
- `amount_accordion.tsx` exclusion: documented at top of plan + in PR body. ✓
- 2-of-3 temporary inconsistency: documented in CRITICAL EXCLUSION section + device QA matrix. ✓
- Trigger padding fallback `style={{ padding: 0, gap: 0 }}`: Tasks 1 + 2. ✓
- Card shadow suppression fallback `style={{ elevation: 0, shadowOpacity: 0 }}`: Tasks 3–6. ✓
- Logic-only test policy: stated in testing approach; no test files in any task. ✓
- CI parity command from CLAUDE.md: Task 7, Step 1, exact command. ✓

### Placeholder scan

No TBDs, no TODOs, no "similar to Task N" shortcuts, no "add validation" vague steps. Every code step shows the complete file or the exact before/after block.

### Type consistency

- `Accordion` import: `import { Accordion } from 'heroui-native'` (confirmed named export from `src/components/accordion/index.ts`). Consistent across Tasks 1 and 2.
- `Card` import: `import { Card } from 'heroui-native'` (confirmed named export from `src/components/card/index.ts`). Consistent across Tasks 3–6.
- `Accordion.Indicator` prop `isAnimatedStyleActive`: declared in `AccordionIndicatorProps` in source. Used in Tasks 1 + 2. ✓
- `onValueChange` signature for `selectionMode="single"`: `(value: string | undefined) => void`. The `_v` parameter matches. ✓
- `Card` props: `className`, `style`, and `ViewProps` children — all standard. ✓
- `SelectablePill` props (`label`, `selected`, `onPress`, `dotColor`, `checkable`, `accessibilityLabel`): unchanged from SP-1 definition; used identically in Tasks 1 + 2. ✓
