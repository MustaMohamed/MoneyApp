# Wave 4 · SP-3 — Button Consolidation + ListGroup Token Cleanup + Trivial Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the one non-canonical `heroui-native` Button direct import, route one stale `Colors.dark.text2` token to `CoreTokens.text2` in the settings screen, and migrate three `View`-based container cards in the transaction detail screen to HeroUI `Card` substrate — all with zero rendered-text changes and zero behavior changes.

**Architecture:** Purely presentational substitutions. No new wrappers. No new files. Each task is a targeted import swap or element swap with inner structure preserved byte-for-byte. All five files are in disjoint screen slices with no shared state; they can be committed independently and are safe to do in any order after Task 0.

**Tech Stack:** React Native (Expo), TypeScript strict, HeroUI Native v1 (`Button`, `Card`), Tailwind v4 / Uniwind, `@expo/vector-icons` MaterialCommunityIcons, oxlint + oxfmt.

**Spec:** `docs/superpowers/specs/2026-05-25-wave4-sp3-button-listgroup-cards-design.md` (signed off).

**Branch:** `feat/wave4-sp3-button-listgroup-cards` (cut from `origin/main`).

---

## STOP — SP-4 boundary guard (read before touching any file)

`screens/settings/categories/index.tsx` is **owned by SP-4** which runs concurrently on a separate branch. Do NOT open, read, or edit that file for any reason during this SP. The bottom `<Button>` CTA in that file already uses the canonical wrapper — there is nothing for SP-3 to do there. If you accidentally touch it you will produce a merge conflict with SP-4.

---

## Testing approach (read first)

This sub-project is **presentational only**. Per the project's logic-only test policy (no `.tsx` render tests — see CLAUDE.md), **no new unit tests are written**. Per-task verification is **typecheck + lint** on the changed file(s); the final task runs the full six-job CI parity chain to confirm the existing jest suite is green and nothing broke. Behavioral correctness is confirmed at the user's device-QA gate.

Because there are no failing-test-first steps, each task follows: **edit → typecheck → lint → commit.**

---

## File structure

| File | Responsibility | Change |
|---|---|---|
| `screens/transactions/transaction_form/components/no_accounts_empty.tsx` | "No accounts" empty state in the Add Transaction sheet | Modify — swap direct `heroui-native` Button import for canonical wrapper |
| `screens/settings/index.tsx` | Settings screen list | Modify — swap `Colors.dark.text2` → `CoreTokens.text2`; drop stale `Colors` import |
| `screens/transactions/detail/components/detail_rows_card.tsx` | Container card for detail rows | Modify — `View` → HeroUI `Card` |
| `screens/transactions/detail/components/note_card.tsx` | Container card for the transaction note | Modify — outer `View` → HeroUI `Card`; preserve `testID` |
| `screens/transactions/detail/components/transfer_flow_card.tsx` | Container card for transfer flow (from/to cells) | Modify — outer `View` → HeroUI `Card`; preserve `border-accent/18` override and inner `Cell`/`Pressable` structure |

---

## Task 0: Worktree verification setup

Worktrees are missing the gitignored `node_modules` and `expo-env.d.ts`. Symlink `node_modules` for tsc/oxlint/jest; generate `expo-env.d.ts` for the type reference. Device builds are NOT done here.

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

Run: `npm run typecheck`

Expected: PASS with no errors — confirms the toolchain is functional before any edits.

---

## Task 1: Button import swap in `no_accounts_empty.tsx`

**Files:**
- Modify: `screens/transactions/transaction_form/components/no_accounts_empty.tsx`

The file currently imports `Button` directly from `heroui-native` and uses the compound-children API (`<Button><Text>…</Text></Button>`). The canonical wrapper at `@/components/ui/button` uses a flat `label` prop and owns its own `HButton.Label` rendering. This task swaps the import and collapses the compound children to the `label` prop. The `testID` is preserved via `...props` passthrough in the wrapper.

- [ ] **Step 1: Replace the entire file**

Replace the full contents of `screens/transactions/transaction_form/components/no_accounts_empty.tsx` with:

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { CoreTokens } from '@/constants/theme_tokens';

interface Props {
  onAddAccount: () => void;
}

export function NoAccountsEmpty({ onAddAccount }: Props): React.ReactElement {
  return (
    <View className="flex-1 items-center justify-center gap-4 px-6 py-8">
      <MaterialCommunityIcons name="bank-off" size={56} color={CoreTokens.text2} />
      <Text className="font-sora text-foreground text-center text-[17px] font-semibold">
        {Strings.addTxNoAccountsTitle}
      </Text>
      <Text className="font-inter text-muted text-center text-[13px]">
        {Strings.addTxNoAccountsBody}
      </Text>
      <Button
        testID="no-accounts-cta"
        onPress={onAddAccount}
        variant="primary"
        label={Strings.addTxNoAccountsCta}
      />
    </View>
  );
}
```

Key changes vs. before:
- Line 2: `import { Button } from 'heroui-native'` → `import { Button } from '@/components/ui/button'`
- Line 24-26: `<Button …><Text …>{Strings.addTxNoAccountsCta}</Text></Button>` → `<Button … label={Strings.addTxNoAccountsCta} />`

Everything else is byte-identical to the original.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`

Expected: PASS. If the wrapper's `ButtonProps` does not accept `testID`, check `components/ui/button.tsx` — it extends `PressableProps` which includes `testID`. No workaround should be needed.

- [ ] **Step 3: Lint**

Run: `npx oxlint --type-aware screens/transactions/transaction_form/components/no_accounts_empty.tsx`

Expected: 0 warnings, 0 errors. In particular: no unused `Text` (still used), no unused `View` (still used).

- [ ] **Step 4: Format**

Run: `npx oxfmt screens/transactions/transaction_form/components/no_accounts_empty.tsx`

Expected: no diff (or auto-fixed in place).

- [ ] **Step 5: Commit**

```bash
git add screens/transactions/transaction_form/components/no_accounts_empty.tsx
git commit -m "refactor(transactions): NoAccountsEmpty uses canonical Button wrapper"
```

---

## Task 2: Token swap in `screens/settings/index.tsx`

**Files:**
- Modify: `screens/settings/index.tsx`

The file uses `Colors.dark.text2` (`#6B7F99`) for all icon colors and the currency value text. `CoreTokens.text2` resolves to the identical hex `#6B7F99` — this is a zero-visual-delta token alignment. After the swap, `Colors` is only used for `Spacing.md` (via destructured import). Check whether `Spacing` also lives in `CoreTokens`/`theme_tokens.ts` — it does not (`Spacing` is `theme.ts`-only), so the `Colors` import line narrows from `{ Colors, Spacing }` to `{ Spacing }` only.

**Do NOT touch** anything else in this file — the `ListGroup` usage is already canonical (HeroUI native direct import is correct here since there is no `components/ui/list_group.tsx` wrapper).

- [ ] **Step 1: Replace the entire file**

Replace the full contents of `screens/settings/index.tsx` with:

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ListGroup } from 'heroui-native';
import { View } from 'react-native';

import { Screen, ScreenScroll } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Spacing } from '@/constants/theme';
import { CoreTokens } from '@/constants/theme_tokens';
import { ms } from '@/utils/responsive';

import { useSettings } from './settings.hook';

export default function SettingsScreen() {
  const { goToCurrency, goToCategories, goToAbout } = useSettings();

  return (
    <Screen edges={['bottom']}>
      <ScreenScroll
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 32, paddingHorizontal: Spacing.md }}
      >
        <ListGroup>
          <ListGroup.Item onPress={goToCurrency} accessibilityRole="button">
            <ListGroup.ItemPrefix>
              <MaterialCommunityIcons name="currency-usd" size={ms(20)} color={CoreTokens.text2} />
            </ListGroup.ItemPrefix>
            <ListGroup.ItemContent>
              <ListGroup.ItemTitle>{Strings.settingsCurrencyRow}</ListGroup.ItemTitle>
              <ListGroup.ItemDescription>
                {Strings.settingsCurrencyDescription}
              </ListGroup.ItemDescription>
            </ListGroup.ItemContent>
            <ListGroup.ItemSuffix>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
                <Text style={{ color: CoreTokens.text2 }}>
                  {Strings.settingsCurrencyValue('EGP')}
                </Text>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={ms(20)}
                  color={CoreTokens.text2}
                />
              </View>
            </ListGroup.ItemSuffix>
          </ListGroup.Item>

          <ListGroup.Item onPress={goToCategories} accessibilityRole="button">
            <ListGroup.ItemPrefix>
              <MaterialCommunityIcons
                name="tag-multiple"
                size={ms(20)}
                color={CoreTokens.text2}
              />
            </ListGroup.ItemPrefix>
            <ListGroup.ItemContent>
              <ListGroup.ItemTitle>{Strings.settingsCategoriesRow}</ListGroup.ItemTitle>
              <ListGroup.ItemDescription>
                {Strings.settingsCategoriesDescription}
              </ListGroup.ItemDescription>
            </ListGroup.ItemContent>
            <ListGroup.ItemSuffix>
              <MaterialCommunityIcons
                name="chevron-right"
                size={ms(20)}
                color={CoreTokens.text2}
              />
            </ListGroup.ItemSuffix>
          </ListGroup.Item>

          <ListGroup.Item onPress={goToAbout} accessibilityRole="button">
            <ListGroup.ItemPrefix>
              <MaterialCommunityIcons
                name="information-outline"
                size={ms(20)}
                color={CoreTokens.text2}
              />
            </ListGroup.ItemPrefix>
            <ListGroup.ItemContent>
              <ListGroup.ItemTitle>{Strings.aboutTitle}</ListGroup.ItemTitle>
              <ListGroup.ItemDescription>
                {Strings.settingsAboutDescription}
              </ListGroup.ItemDescription>
            </ListGroup.ItemContent>
            <ListGroup.ItemSuffix>
              <MaterialCommunityIcons
                name="chevron-right"
                size={ms(20)}
                color={CoreTokens.text2}
              />
            </ListGroup.ItemSuffix>
          </ListGroup.Item>
        </ListGroup>
      </ScreenScroll>
    </Screen>
  );
}
```

Key changes vs. before:
- Import line 8: `{ Colors, Spacing }` → `{ Spacing }` (Colors no longer used)
- Import line 9 (new): `import { CoreTokens } from '@/constants/theme_tokens';`
- Every `Colors.dark.text2` occurrence (5 instances) → `CoreTokens.text2`

Everything else is byte-identical.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 3: Lint**

Run: `npx oxlint --type-aware screens/settings/index.tsx`

Expected: 0 warnings, 0 errors. In particular: no unused `Colors` (removed from import).

- [ ] **Step 4: Format**

Run: `npx oxfmt screens/settings/index.tsx`

Expected: no diff.

- [ ] **Step 5: Commit**

```bash
git add screens/settings/index.tsx
git commit -m "refactor(settings): route Colors.dark.text2 to CoreTokens.text2"
```

---

## Task 3: `DetailRowsCard` — `View` → HeroUI `Card`

**Files:**
- Modify: `screens/transactions/detail/components/detail_rows_card.tsx`

This is the simplest card: a pure slot wrapper with no internal content of its own. The `View` carries `bg-surface border-separator mx-4 mt-4 overflow-hidden rounded-2xl border`. **CORRECTION (post-review):** HeroUI `Card` (via Surface) base is `p-4 rounded-3xl shadow-surface overflow-hidden bg-surface` — it does NOT supply a border, `border-separator`, or `rounded-2xl`. All three must be passed explicitly. `p-0` is also required here so inner `DetailRow` dividers remain edge-to-edge. `className` overrides win via `tv()`/twMerge.

- [ ] **Step 1: Replace the entire file**

Replace the full contents of `screens/transactions/detail/components/detail_rows_card.tsx` with:

```tsx
import { Card } from 'heroui-native';
import React from 'react';

interface Props {
  children: React.ReactNode;
}

export function DetailRowsCard({ children }: Props): React.ReactElement {
  return (
    <Card className="mx-4 mt-4 overflow-hidden">
      {children}
    </Card>
  );
}
```

Key changes vs. before:
- `import { View } from 'react-native'` removed; `import { Card } from 'heroui-native'` added.
- `<View className="bg-surface border-separator mx-4 mt-4 overflow-hidden rounded-2xl border">` → `<Card className="mx-4 mt-4 overflow-hidden">` (HeroUI `Card` supplies `bg-surface`, `border`, `border-separator`, `rounded-2xl` as defaults).

Inner `{children}` is unchanged.

If at device-QA the Card's default border token is visually different from `border-separator`, add `className="mx-4 mt-4 overflow-hidden border-separator"` to force-override. That is an implementation-time decision; do not pre-empt it here.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`

Expected: PASS. (`Card` is a confirmed export of `heroui-native`.)

- [ ] **Step 3: Lint**

Run: `npx oxlint --type-aware screens/transactions/detail/components/detail_rows_card.tsx`

Expected: 0 warnings, 0 errors. No unused `View`.

- [ ] **Step 4: Format**

Run: `npx oxfmt screens/transactions/detail/components/detail_rows_card.tsx`

Expected: no diff.

- [ ] **Step 5: Commit**

```bash
git add screens/transactions/detail/components/detail_rows_card.tsx
git commit -m "refactor(transactions): DetailRowsCard uses HeroUI Card substrate"
```

---

## Task 4: `NoteCard` — outer `View` → HeroUI `Card`

**Files:**
- Modify: `screens/transactions/detail/components/note_card.tsx`

The outer `View` carries `bg-surface border-separator mx-4 mt-4 rounded-2xl border p-4` plus `testID="detail-note-card"`. HeroUI `Card` accepts `testID` as a standard RN prop (it renders a `View` internally). Padding `p-4` must be passed explicitly since `Card` does not assume internal padding. The file-level JSDoc comment block is preserved verbatim. All inner content (`View` header row + two `Text` nodes) is unchanged byte-for-byte.

- [ ] **Step 1: Replace the entire file**

Replace the full contents of `screens/transactions/detail/components/note_card.tsx` with:

```tsx
/**
 * NoteCard — dedicated full-width section for the transaction note on the
 * detail screen.
 *
 * Lifted out of the DetailRowsCard so a long note isn't constrained to the
 * narrow two-line DetailRow layout used by Category / Account / Date /
 * Exchange-Rate. The note now gets the entire card width and as many lines
 * as it needs to render in full — matching the §7 list-row treatment where
 * the note was similarly moved out of the cramped middle column to a
 * full-width row below.
 *
 * When the transaction has no note, the card is omitted entirely (returns
 * null). No "Add a note" placeholder — the Edit sheet is the right place
 * to add one; a placeholder card here would just be visual noise.
 */
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Card } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';

interface Props {
  note: string | null;
}

export function NoteCard({ note }: Props): React.ReactElement | null {
  const trimmed = note?.trim();
  if (!trimmed) return null;

  return (
    <Card
      testID="detail-note-card"
      className="mx-4 mt-4 p-4"
    >
      <View className="mb-2 flex-row items-center gap-2">
        <View className="bg-foreground/5 h-7 w-7 items-center justify-center rounded-md">
          <MaterialCommunityIcons name="text" size={14} color="#F0EEE6" />
        </View>
        <Text className="font-inter text-foreground/55 text-[10.5px] font-semibold tracking-wide uppercase">
          {Strings.detailNote}
        </Text>
      </View>
      <Text className="font-inter text-foreground text-[13px] font-medium">{trimmed}</Text>
    </Card>
  );
}
```

Key changes vs. before:
- `import { View } from 'react-native'` still present (inner `View` nodes remain).
- `import { Card } from 'heroui-native'` added.
- Outer `<View testID="detail-note-card" className="bg-surface border-separator mx-4 mt-4 rounded-2xl border p-4">` → `<Card testID="detail-note-card" className="mx-4 mt-4 p-4">`.

All inner JSX is byte-identical.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`

Expected: PASS. If `testID` is not accepted directly on `Card`, wrap: `<Card className="mx-4 mt-4 p-4"><View testID="detail-note-card">{/* inner content */}</View></Card>` — but this should not be needed since `Card` forwards standard `ViewProps`.

- [ ] **Step 3: Lint**

Run: `npx oxlint --type-aware screens/transactions/detail/components/note_card.tsx`

Expected: 0 warnings, 0 errors.

- [ ] **Step 4: Format**

Run: `npx oxfmt screens/transactions/detail/components/note_card.tsx`

Expected: no diff.

- [ ] **Step 5: Commit**

```bash
git add screens/transactions/detail/components/note_card.tsx
git commit -m "refactor(transactions): NoteCard uses HeroUI Card substrate"
```

---

## Task 5: `TransferFlowCard` — outer `View` → HeroUI `Card`

**Files:**
- Modify: `screens/transactions/detail/components/transfer_flow_card.tsx`

The outer `View` carries `bg-surface border-accent/18 mx-4 mt-4 flex-row items-center gap-2 rounded-2xl border p-3.5`. The non-default `border-accent/18` border color **must be passed explicitly** via `className` — it overrides HeroUI `Card`'s default `border-separator`. The layout classes `flex-row items-center gap-2` must also be passed explicitly since `Card` defaults to column layout. The inner `Cell` function, the `Pressable` within it, and all prop types are completely unchanged.

- [ ] **Step 1: Replace only the `TransferFlowCard` function's return statement**

The only change is in the `TransferFlowCard` function's `return (…)`. Everything above it — the imports, `numberFmt`, `Cell` function, `Props` interface — is untouched. Replace the file with:

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Card } from 'heroui-native';
import React from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { GoldTokens } from '@/constants/theme_tokens';
import type { Account } from '@/database/entities/account.entity';

import { getAccountTypeIcon } from '../detail.helpers';

interface Props {
  fromAccount: Account;
  toAccount: Account;
  fromAmount: number;
  fromCurrency: Currency;
  toAmount: number;
  toCurrency: Currency;
  onPressFrom?: () => void;
  onPressTo?: () => void;
}

const numberFmt = new Intl.NumberFormat('en-US', { style: 'decimal' });

function Cell({
  label,
  account,
  amount,
  currency,
  signPrefix,
  onPress,
}: {
  label: string;
  account: Account;
  amount: number;
  currency: Currency;
  signPrefix: '+' | '−';
  onPress?: () => void;
}): React.ReactElement {
  const inner = (
    <View className="flex-1 items-center">
      <Text className="font-inter text-foreground/55 text-[9.5px] font-semibold tracking-wide uppercase">
        {label}
      </Text>
      <View className="bg-accent/15 mt-1.5 h-9 w-9 items-center justify-center rounded-lg">
        <MaterialCommunityIcons
          name={getAccountTypeIcon(account.type)}
          size={16}
          color={GoldTokens[500]}
        />
      </View>
      <Text className="font-inter text-foreground mt-1 text-[11.5px] font-semibold">
        {account.name}
      </Text>
      <Text className="font-sora text-foreground/85 mt-0.5 text-[11px] font-semibold">
        {signPrefix}
        {numberFmt.format(amount)} {currency}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${account.name}, open account detail`}
        className="flex-1"
      >
        {inner}
      </Pressable>
    );
  }
  return inner;
}

export function TransferFlowCard({
  fromAccount,
  toAccount,
  fromAmount,
  fromCurrency,
  toAmount,
  toCurrency,
  onPressFrom,
  onPressTo,
}: Props): React.ReactElement {
  return (
    <Card className="border-accent/18 mx-4 mt-4 flex-row items-center gap-2 p-3.5">
      <Cell
        label={Strings.detailFlowFromLabel}
        account={fromAccount}
        amount={fromAmount}
        currency={fromCurrency}
        signPrefix="−"
        onPress={onPressFrom}
      />
      <MaterialCommunityIcons name="arrow-right" size={20} color={GoldTokens[500]} />
      <Cell
        label={Strings.detailFlowToLabel}
        account={toAccount}
        amount={toAmount}
        currency={toCurrency}
        signPrefix="+"
        onPress={onPressTo}
      />
    </Card>
  );
}
```

Key changes vs. before:
- `import { Card } from 'heroui-native'` added after the MCI import.
- `TransferFlowCard` return: `<View className="bg-surface border-accent/18 mx-4 mt-4 flex-row items-center gap-2 rounded-2xl border p-3.5">` → `<Card className="border-accent/18 mx-4 mt-4 flex-row items-center gap-2 p-3.5">` (Card supplies `bg-surface`, `rounded-2xl`, `border`; `border-accent/18` overrides the default border color; `flex-row items-center gap-2 p-3.5` are passed explicitly).
- Closing `</View>` → `</Card>`.

Everything else — `Cell`, `Pressable`, all inner JSX, `numberFmt`, imports other than `View` removal — is byte-identical. `View` stays in the import because `Cell` still uses it.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 3: Lint**

Run: `npx oxlint --type-aware screens/transactions/detail/components/transfer_flow_card.tsx`

Expected: 0 warnings, 0 errors. `View` is still used inside `Cell` so no unused-import warning.

- [ ] **Step 4: Format**

Run: `npx oxfmt screens/transactions/detail/components/transfer_flow_card.tsx`

Expected: no diff.

- [ ] **Step 5: Commit**

```bash
git add screens/transactions/detail/components/transfer_flow_card.tsx
git commit -m "refactor(transactions): TransferFlowCard uses HeroUI Card substrate"
```

---

## Task 6: Full CI parity + PR

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

Expected: ends with `✓ CI parity green — safe to push`. If any step fails: fix the issue, re-run the chain from the top, repeat until green. Do not push until green.

- [ ] **Step 2: Push the branch**

```bash
git push -u origin feat/wave4-sp3-button-listgroup-cards
```

- [ ] **Step 3: Open the PR**

```bash
gh pr create \
  --title "refactor(ui): Wave 4 SP-3 — Button canonical + ListGroup token + trivial Cards" \
  --body "$(cat <<'EOF'
## Summary
- **Button:** `no_accounts_empty.tsx` — swap direct `heroui-native` Button import for canonical `@/components/ui/button` wrapper; collapse compound `<Text>` child to `label` prop.
- **ListGroup token:** `settings/index.tsx` — route 5× `Colors.dark.text2` to `CoreTokens.text2` (identical hex `#6B7F99`); drop stale `Colors` import fragment.
- **Cards:** `detail_rows_card.tsx`, `note_card.tsx`, `transfer_flow_card.tsx` — replace `View`-based container shells with HeroUI `Card` substrate. Inner structure, `testID`, `border-accent/18` override, and `Cell`/`Pressable` navigation all preserved byte-for-byte.

Zero rendered-text changes. Zero behavior changes. No new files. No new wrappers.

**SP-4 boundary respected:** `screens/settings/categories/index.tsx` not touched.

Spec: `docs/superpowers/specs/2026-05-25-wave4-sp3-button-listgroup-cards-design.md`
Plan: `docs/superpowers/plans/2026-05-25-wave4-sp3-button-listgroup-cards.md`

## Test plan
- [ ] CI parity green (format, lint, typecheck, jest, expo-doctor, android prebuild)
- [ ] Device QA: Add Transaction sheet with no accounts — CTA renders, press navigates to add account
- [ ] Device QA: Settings screen — Currency / Categories / About rows render with correct icon and text colors
- [ ] Device QA: Transaction detail — `DetailRowsCard` renders (category, account, date, exchange-rate rows)
- [ ] Device QA: Transaction detail — `NoteCard` renders when note present; absent when note is null
- [ ] Device QA: Transaction detail (transfer) — `TransferFlowCard` renders with gold accent border; tapping account cells navigates correctly
EOF
)"
```

Expected: PR URL returned.

- [ ] **Step 4: Request code review**

Invoke `anthropic-skills:requesting-code-review` with @tariq's lens. Fix ALL findings before merge. Tariq approves and merges on the user's behalf per the autonomous-team workflow — hold for the user's device-QA gate (critical trigger §8).

---

## Self-review

**Spec coverage check:**

| Spec requirement | Task covering it |
|---|---|
| Button: swap `no_accounts_empty.tsx` direct import | Task 1 ✓ |
| Button: all bespoke CTA patterns reviewed and deferred | Covered in STOP guard + spec; no task needed (no-ops) ✓ |
| ListGroup: confirm `settings/index.tsx` already canonical | Task 2 (confirmed, no structural change) ✓ |
| ListGroup: `Colors.dark.text2` → `CoreTokens.text2` opportunistic | Task 2 ✓ |
| Card: `detail_rows_card.tsx` View → Card | Task 3 ✓ |
| Card: `note_card.tsx` View → Card, preserve `testID` | Task 4 ✓ |
| Card: `transfer_flow_card.tsx` View → Card, preserve `border-accent/18` and inner `Pressable` | Task 5 ✓ |
| SP-4 boundary guard | STOP section + design guard note ✓ |
| No `.tsx` render tests | Testing approach section ✓ |
| CI parity 6-job chain | Task 6 Step 1 ✓ |
| PR + code review | Task 6 Steps 3–4 ✓ |

**Placeholder scan:** No TBDs, no "similar to Task N" shortcuts, no steps without code. Each task has a complete replacement file or exact change. The one conditional note in Task 3 (`if at device-QA the Card's default border token differs…`) is an implementation-time resolution path, not a deferred placeholder — the decision rule is explicit.

**Type consistency:** `Card` is used identically across Tasks 3, 4, 5 — imported from `heroui-native`, used as a drop-in `View` replacement accepting `className` and standard RN props (`testID`). `Button` in Task 1 uses `label`, `variant`, `onPress`, `testID` — all confirmed fields in `components/ui/button.tsx`'s `ButtonProps` interface (`label: string`, `variant?: ButtonVariant`, extends `PressableProps` which includes `testID` and `onPress`).
