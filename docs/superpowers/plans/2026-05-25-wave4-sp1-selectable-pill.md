# Wave 4 · SP-1 — `SelectablePill` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce a canonical `SelectablePill` component (built on HeroUI `Chip`) and adopt it at every gold-tint pill ternary, with zero rendered-text regressions.

**Architecture:** `SelectablePill` is a thin, purely-presentational wrapper over HeroUI `Chip` + `Chip.Label`. It owns the selected/unselected gold styling and optional leading color-dot / trailing check. Selection state stays in the existing parent hooks/stores/RHF; each call-site's `Pressable`+ternary+`Text` collapses to one `<SelectablePill … />`.

**Tech Stack:** React Native (Expo), TypeScript strict, HeroUI Native v1 (`Chip`, `cn`), Uniwind/Tailwind v4, `@expo/vector-icons` MaterialCommunityIcons, oxlint + oxfmt.

**Spec:** `docs/superpowers/specs/2026-05-25-wave4-sp1-selectable-pill-design.md` (signed off).

**Branch:** `feat/wave4-sp1-selectable-pill` (already created from `origin/main`).

---

## Testing approach (read first)

This sub-project is **presentational only**. Per the project's logic-only test policy (no `.tsx` render tests — see CLAUDE.md / MEMORY), **no new unit tests are written**. Per-task verification is **typecheck + lint** on the changed files; the final task runs full CI parity (incl. the existing jest suite, which must stay green, proving the parents' selection/filter logic is untouched). Behavioral correctness is confirmed at the user's **device-QA gate**.

Because there are no failing-test-first steps, each task follows: **edit → typecheck → lint → commit.**

## File structure

| File | Responsibility | Change |
|---|---|---|
| `components/ui/chip.tsx` | The `SelectablePill` component | **Create** |
| `screens/transactions/components/type_chips.tsx` | Transaction type filter chips | Modify |
| `screens/commitments/components/status_filter_chips.tsx` | Commitment status filter chips | Modify |
| `screens/commitments/components/recurrence_picker.tsx` | Recurrence preset + duration pills | Modify |
| `screens/commitments/components/commitment_form_body.tsx` | Amount-type + currency pills | Modify (2 regions) |
| `screens/transactions/filter/components/category_accordion.tsx` | Category filter pills (dot+check) | Modify |
| `screens/transactions/filter/components/account_accordion.tsx` | Account filter pills (dot+check) | Modify |

---

## Task 0: Worktree verification setup

Worktrees are missing the gitignored `node_modules` and `expo-env.d.ts`, so `tsc`/oxlint/jest can't run until they're linked. (Device builds are NOT done here — that's the user's machine — so a symlink is correct.)

**Files:** none (environment only).

- [ ] **Step 1: Symlink node_modules + ensure expo-env.d.ts**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/elastic-chebyshev-2ffc0a
test -e node_modules || ln -s ../../../node_modules node_modules
test -f expo-env.d.ts || printf '/// <reference types="expo/types" />\n' > expo-env.d.ts
ls -ld node_modules && echo "ok"
```

Expected: `node_modules` resolves (symlink or dir) and `ok` prints.

- [ ] **Step 2: Baseline typecheck (sanity)**

Run: `npm run typecheck`
Expected: PASS (no errors) — confirms the toolchain works before any edits.

---

## Task 1: Create `SelectablePill`

**Files:**
- Create: `components/ui/chip.tsx`

- [ ] **Step 1: Write the component**

Create `components/ui/chip.tsx` with exactly:

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Chip, cn } from 'heroui-native';
import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { GoldTokens } from '@/constants/theme_tokens';

export interface SelectablePillProps {
  /** Visible label text. */
  label: string;
  /** Selected (active) state — drives the gold-tint styling. */
  selected: boolean;
  onPress: () => void;
  /** Optional leading color dot (filter pills with a category/account color). */
  dotColor?: string;
  /** Show a trailing gold check when `selected` (multi-select filter pills). */
  checkable?: boolean;
  /** Block presses without changing appearance (e.g. locked commitment form). */
  disabled?: boolean;
  /** Accessibility label; defaults to `label`. */
  accessibilityLabel?: string;
  /** Layout passthrough (e.g. `{ flex: 1 }` for equal-width currency pills). */
  style?: StyleProp<ViewStyle>;
}

/**
 * Canonical selectable pill. Wraps HeroUI `Chip`; HeroUI has no `selected`
 * boolean, so this owns the gold-tint selected/unselected styling. Purely
 * presentational — selection state lives in the parent.
 *
 * `animation="disable-all"` matches the prior plain-`Pressable` pills, which
 * had no press feedback.
 */
export function SelectablePill({
  label,
  selected,
  onPress,
  dotColor,
  checkable = false,
  disabled = false,
  accessibilityLabel,
  style,
}: SelectablePillProps): React.ReactElement {
  const hasAdornment = dotColor !== undefined || checkable;
  return (
    <Chip
      size="sm"
      variant="secondary"
      color="default"
      animation="disable-all"
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={accessibilityLabel ?? label}
      style={style}
      className={cn(
        'rounded-full border',
        hasAdornment ? 'gap-1.5 px-2.5 py-1.5' : 'px-3 py-1',
        selected ? 'border-accent/50 bg-accent/15' : 'border-border bg-default/40',
      )}
    >
      {dotColor !== undefined ? (
        <View style={{ backgroundColor: dotColor }} className="h-2 w-2 rounded-full" />
      ) : null}
      <Chip.Label
        className={cn(
          'font-inter text-[11px]',
          selected ? 'text-accent font-semibold' : 'text-foreground/70 font-medium',
        )}
      >
        {label}
      </Chip.Label>
      {checkable && selected ? (
        <MaterialCommunityIcons name="check" size={12} color={GoldTokens[500]} />
      ) : null}
    </Chip>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS. (If `Chip`/`cn` are not exported from `heroui-native`, stop — they are confirmed exports, but a failure here means a version mismatch to investigate, not to work around.)

- [ ] **Step 3: Lint the new file**

Run: `npx oxlint --type-aware components/ui/chip.tsx`
Expected: 0 warnings, 0 errors. (`React` import is unused-by-name but matches the codebase convention in `components/ui/button.tsx`; if oxlint flags it, remove the `import React` line and change the return annotation to `import { type ReactElement } from 'react'` / `: ReactElement`.)

- [ ] **Step 4: Format**

Run: `npx oxfmt components/ui/chip.tsx`
Expected: file formatted (no diff or auto-fixed).

- [ ] **Step 5: Commit**

```bash
git add components/ui/chip.tsx
git commit -m "feat(ui): add SelectablePill wrapper over HeroUI Chip"
```

---

## Task 2: Adopt in `type_chips.tsx`

**Files:**
- Modify: `screens/transactions/components/type_chips.tsx`

- [ ] **Step 1: Replace imports + render**

Replace the top imports:

```tsx
import React from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
```

with:

```tsx
import React from 'react';
import { View } from 'react-native';

import { SelectablePill } from '@/components/ui/chip';
import { TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
```

Replace the entire `TypeChips` function body (the `return (...)`) with:

```tsx
export function TypeChips({ value, onChange }: Props): React.ReactElement {
  return (
    <View className="mt-3 flex-row flex-wrap gap-1.5 px-4">
      {OPTIONS.map((opt) => (
        <SelectablePill
          key={String(opt.value)}
          label={opt.label}
          selected={opt.value === value}
          onPress={() => onChange(opt.value)}
          accessibilityLabel={`${opt.label}, type filter`}
        />
      ))}
    </View>
  );
}
```

(Leave the `OPTIONS` array and `Props` interface unchanged.)

- [ ] **Step 2: Typecheck + lint**

Run: `npm run typecheck && npx oxlint --type-aware screens/transactions/components/type_chips.tsx`
Expected: PASS, 0 lint findings (notably no "unused import" for `Pressable`/`Text`).

- [ ] **Step 3: Commit**

```bash
git add screens/transactions/components/type_chips.tsx
git commit -m "refactor(transactions): TypeChips uses SelectablePill"
```

---

## Task 3: Adopt in `status_filter_chips.tsx`

**Files:**
- Modify: `screens/commitments/components/status_filter_chips.tsx`

- [ ] **Step 1: Replace imports + render**

Replace the top imports:

```tsx
import { Pressable, ScrollView, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { CommitmentPaymentStatus } from '@/constants/enums';
import { Strings } from '@/constants/strings';
```

with:

```tsx
import { ScrollView, View } from 'react-native';

import { SelectablePill } from '@/components/ui/chip';
import { CommitmentPaymentStatus } from '@/constants/enums';
import { Strings } from '@/constants/strings';
```

Replace the `StatusFilterChips` function body with:

```tsx
export function StatusFilterChips({ active, onChange }: Props) {
  return (
    <View className="py-2">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2 px-4"
      >
        {CHIPS.map((c) => {
          // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- labelKey values are hardcoded Strings keys; always defined
          const label = Strings[c.labelKey] as string;
          return (
            <SelectablePill
              key={c.key}
              label={label}
              selected={active === c.key}
              onPress={() => onChange(c.key)}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}
```

(Leave `CHIPS` and `Props` unchanged. The prior `accessibilityLabel={label}` is preserved implicitly — `SelectablePill` defaults `accessibilityLabel` to `label`.)

- [ ] **Step 2: Typecheck + lint**

Run: `npm run typecheck && npx oxlint --type-aware screens/commitments/components/status_filter_chips.tsx`
Expected: PASS, 0 findings.

- [ ] **Step 3: Commit**

```bash
git add screens/commitments/components/status_filter_chips.tsx
git commit -m "refactor(commitments): StatusFilterChips uses SelectablePill"
```

---

## Task 4: Adopt in `recurrence_picker.tsx`

**Files:**
- Modify: `screens/commitments/components/recurrence_picker.tsx`

- [ ] **Step 1: Update imports**

Replace:

```tsx
import { Pressable, View } from 'react-native';
```

with:

```tsx
import { View } from 'react-native';

import { SelectablePill } from '@/components/ui/chip';
```

Place the new import in the correct group (third-party `react-native` stays with the other RN/library imports at the top; `@/components/ui/chip` goes with the `@/` import group — oxfmt's import sort will normalize ordering, so exact placement is not critical, but keep `@/` imports together). The existing `import { Text } from '@/components/ui/text';` stays (Text is still used for the "Every" label and error text).

- [ ] **Step 2: Replace the PRESETS pill map**

Replace this block (the recurrence presets `.map`):

```tsx
        {PRESETS.map(({ key, label }) => {
          const isActive = recurrencePreset === key;
          return (
            <Pressable
              key={key}
              onPress={() => onPresetChange(key)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={label}
              className={
                isActive
                  ? 'border-accent/50 bg-accent/15 rounded-full border px-3 py-1'
                  : 'bg-default/40 border-border rounded-full border px-3 py-1'
              }
            >
              <Text
                className={
                  isActive
                    ? 'font-inter text-accent text-[11px] font-semibold'
                    : 'font-inter text-foreground/65 text-[11px] font-medium'
                }
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
```

with:

```tsx
        {PRESETS.map(({ key, label }) => (
          <SelectablePill
            key={key}
            label={label}
            selected={recurrencePreset === key}
            onPress={() => onPresetChange(key)}
          />
        ))}
```

- [ ] **Step 3: Replace the PERIODS pill map**

Replace this block (the duration periods `.map`, inside the `Custom` branch):

```tsx
            {PERIODS.map(({ key, label }) => {
              const isActive = recurrencePeriod === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => form.setValue('recurrencePeriod', key, SET_OPTS)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={label}
                  className={
                    isActive
                      ? 'border-accent/50 bg-accent/15 rounded-full border px-3 py-1'
                      : 'bg-default/40 border-border rounded-full border px-3 py-1'
                  }
                >
                  <Text
                    className={
                      isActive
                        ? 'font-inter text-accent text-[11px] font-semibold'
                        : 'font-inter text-foreground/65 text-[11px] font-medium'
                    }
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
```

with:

```tsx
            {PERIODS.map(({ key, label }) => (
              <SelectablePill
                key={key}
                label={label}
                selected={recurrencePeriod === key}
                onPress={() => form.setValue('recurrencePeriod', key, SET_OPTS)}
              />
            ))}
```

- [ ] **Step 4: Typecheck + lint**

Run: `npm run typecheck && npx oxlint --type-aware screens/commitments/components/recurrence_picker.tsx`
Expected: PASS, 0 findings (no unused `Pressable`).

- [ ] **Step 5: Commit**

```bash
git add screens/commitments/components/recurrence_picker.tsx
git commit -m "refactor(commitments): RecurrencePicker uses SelectablePill"
```

---

## Task 5: Adopt in `commitment_form_body.tsx`

**Files:**
- Modify: `screens/commitments/components/commitment_form_body.tsx` (2 regions; `Pressable` stays — it's used elsewhere, e.g. the category-picker row)

- [ ] **Step 1: Add the import**

Add to the `@/` import group near the top:

```tsx
import { SelectablePill } from '@/components/ui/chip';
```

(Do NOT remove `Pressable` from the `react-native` import — it is still used by the category-picker row and other rows.)

- [ ] **Step 2: Replace the Amount-Type pill map**

Replace this block:

```tsx
            {AMOUNT_TYPES.map(({ key, label }) => {
              const isActive = amountType === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => handleAmountTypeChange(key)}
                  disabled={locked}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={label}
                  className={
                    isActive
                      ? 'border-accent/50 bg-accent/15 rounded-full border px-3 py-1'
                      : 'bg-default/40 border-border rounded-full border px-3 py-1'
                  }
                >
                  <Text
                    className={
                      isActive
                        ? 'font-inter text-accent text-[11px] font-semibold'
                        : 'font-inter text-foreground/65 text-[11px] font-medium'
                    }
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
```

with:

```tsx
            {AMOUNT_TYPES.map(({ key, label }) => (
              <SelectablePill
                key={key}
                label={label}
                selected={amountType === key}
                onPress={() => handleAmountTypeChange(key)}
                disabled={locked}
              />
            ))}
```

- [ ] **Step 3: Replace the Currency pill map**

Replace this block:

```tsx
              {CURRENCIES.map((c) => {
                const isActive = currency === c;
                return (
                  <Pressable
                    key={c}
                    onPress={() => form.setValue('currency', c, SET_OPTS)}
                    disabled={locked}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                    accessibilityLabel={c}
                    style={{ flex: 1, alignItems: 'center' }}
                    className={
                      isActive
                        ? 'border-accent/50 bg-accent/15 rounded-full border px-3 py-1'
                        : 'bg-default/40 border-border rounded-full border px-3 py-1'
                    }
                  >
                    <Text
                      className={
                        isActive
                          ? 'font-inter text-accent text-[11px] font-semibold'
                          : 'font-inter text-foreground/65 text-[11px] font-medium'
                      }
                    >
                      {c}
                    </Text>
                  </Pressable>
                );
              })}
```

with:

```tsx
              {CURRENCIES.map((c) => (
                <SelectablePill
                  key={c}
                  label={c}
                  selected={currency === c}
                  onPress={() => form.setValue('currency', c, SET_OPTS)}
                  disabled={locked}
                  style={{ flex: 1 }}
                />
              ))}
```

(The Chip base centers content; `flex: 1` preserves the equal-width stretch.)

- [ ] **Step 4: Typecheck + lint**

Run: `npm run typecheck && npx oxlint --type-aware screens/commitments/components/commitment_form_body.tsx`
Expected: PASS, 0 findings (`Pressable`/`Text` still used → no unused-import error).

- [ ] **Step 5: Commit**

```bash
git add screens/commitments/components/commitment_form_body.tsx
git commit -m "refactor(commitments): amount-type + currency pills use SelectablePill"
```

---

## Task 6: Adopt in `category_accordion.tsx` (dot + check)

**Files:**
- Modify: `screens/transactions/filter/components/category_accordion.tsx` (`Pressable` stays — used by the section header; `GoldTokens` is removed — only the now-internal check used it)

- [ ] **Step 1: Update imports**

Replace:

```tsx
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { GoldTokens } from '@/constants/theme_tokens';
import type { Category } from '@/database/entities/category.entity';
```

with:

```tsx
import { SelectablePill } from '@/components/ui/chip';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import type { Category } from '@/database/entities/category.entity';
```

(`MaterialCommunityIcons` stays — used by the header chevron. `Pressable`/`View` stay.)

- [ ] **Step 2: Replace the pills map**

Replace this block (the expanded-section `categories.map`):

```tsx
          {categories.map((c) => {
            const selected = selectedIds.includes(c.id);
            return (
              <Pressable
                key={c.id}
                onPress={() => onToggleId(c.id)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`${c.name}, category filter`}
                className={
                  selected
                    ? 'bg-accent/15 border-accent/50 flex-row items-center gap-1.5 rounded-full border px-2.5 py-1.5'
                    : 'bg-default/40 border-border flex-row items-center gap-1.5 rounded-full border px-2.5 py-1.5'
                }
              >
                <View
                  // oxlint-disable-next-line typescript/no-unnecessary-condition -- DB color can be null despite type
                  style={{ backgroundColor: c.color ?? '#888' }}
                  className="h-2 w-2 rounded-full"
                />
                <Text
                  className={
                    selected
                      ? 'font-inter text-accent text-[11.5px] font-semibold'
                      : 'font-inter text-foreground/70 text-[11.5px] font-medium'
                  }
                >
                  {c.name}
                </Text>
                {selected ? (
                  <MaterialCommunityIcons name="check" size={12} color={GoldTokens[500]} />
                ) : null}
              </Pressable>
            );
          })}
```

with:

```tsx
          {categories.map((c) => (
            <SelectablePill
              key={c.id}
              label={c.name}
              selected={selectedIds.includes(c.id)}
              onPress={() => onToggleId(c.id)}
              // oxlint-disable-next-line typescript/no-unnecessary-condition -- DB color can be null despite type
              dotColor={c.color ?? '#888'}
              checkable
              accessibilityLabel={`${c.name}, category filter`}
            />
          ))}
```

(The `#888` dot fallback is preserved verbatim — no token swap, so zero color change. The header chevron `color="#888"` at line ~57 is left untouched.)

- [ ] **Step 3: Typecheck + lint**

Run: `npm run typecheck && npx oxlint --type-aware screens/transactions/filter/components/category_accordion.tsx`
Expected: PASS, 0 findings (no unused `GoldTokens`).

- [ ] **Step 4: Commit**

```bash
git add screens/transactions/filter/components/category_accordion.tsx
git commit -m "refactor(transactions): CategoryAccordion pills use SelectablePill"
```

---

## Task 7: Adopt in `account_accordion.tsx` (dot + check)

**Files:**
- Modify: `screens/transactions/filter/components/account_accordion.tsx` (mirror of Task 6; `account.color` is nullable in the entity, so no oxlint-disable is needed on the fallback — matching the current file)

- [ ] **Step 1: Update imports**

Replace:

```tsx
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { GoldTokens } from '@/constants/theme_tokens';
import type { Account } from '@/database/entities/account.entity';
```

with:

```tsx
import { SelectablePill } from '@/components/ui/chip';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import type { Account } from '@/database/entities/account.entity';
```

(`MaterialCommunityIcons`, `Pressable`, `View` stay.)

- [ ] **Step 2: Replace the pills map**

Replace this block (the expanded-section `accounts.map`):

```tsx
          {accounts.map((a) => {
            const selected = selectedIds.includes(a.id);
            return (
              <Pressable
                key={a.id}
                onPress={() => onToggleId(a.id)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`${a.name}, account filter`}
                className={
                  selected
                    ? 'bg-accent/15 border-accent/50 flex-row items-center gap-1.5 rounded-full border px-2.5 py-1.5'
                    : 'bg-default/40 border-border flex-row items-center gap-1.5 rounded-full border px-2.5 py-1.5'
                }
              >
                <View
                  style={{ backgroundColor: a.color ?? '#888' }}
                  className="h-2 w-2 rounded-full"
                />
                <Text
                  className={
                    selected
                      ? 'font-inter text-accent text-[11.5px] font-semibold'
                      : 'font-inter text-foreground/70 text-[11.5px] font-medium'
                  }
                >
                  {a.name}
                </Text>
                {selected ? (
                  <MaterialCommunityIcons name="check" size={12} color={GoldTokens[500]} />
                ) : null}
              </Pressable>
            );
          })}
```

with:

```tsx
          {accounts.map((a) => (
            <SelectablePill
              key={a.id}
              label={a.name}
              selected={selectedIds.includes(a.id)}
              onPress={() => onToggleId(a.id)}
              dotColor={a.color ?? '#888'}
              checkable
              accessibilityLabel={`${a.name}, account filter`}
            />
          ))}
```

- [ ] **Step 3: Typecheck + lint**

Run: `npm run typecheck && npx oxlint --type-aware screens/transactions/filter/components/account_accordion.tsx`
Expected: PASS, 0 findings. (If oxlint flags `a.color ?? '#888'` with `no-unnecessary-condition`, add `// oxlint-disable-next-line typescript/no-unnecessary-condition -- DB color can be null despite type` on the line directly above `dotColor={a.color ?? '#888'}`, matching Task 6.)

- [ ] **Step 4: Commit**

```bash
git add screens/transactions/filter/components/account_accordion.tsx
git commit -m "refactor(transactions): AccountAccordion pills use SelectablePill"
```

---

## Task 8: Full CI parity + PR

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
  && echo "✓ CI parity green"
```

Expected: ends with `✓ CI parity green`. If any step fails: fix, re-run from the top, repeat until green. (Note: `oxfmt`/`oxlint --fix` run on staged files via the pre-commit hook, so committed files should already be clean; `format:check`/`lint` here are the parity confirmation.)

- [ ] **Step 2: Push the branch**

```bash
git push -u origin feat/wave4-sp1-selectable-pill
```

- [ ] **Step 3: Open the PR**

```bash
gh pr create --title "refactor(ui): SelectablePill — Wave 4 SP-1 (Chip dedup)" --body "$(cat <<'EOF'
## Summary
- Add `components/ui/chip.tsx` `SelectablePill` — a thin wrapper over HeroUI `Chip` owning the gold-tint selected/unselected styling + optional leading color-dot / trailing check.
- Adopt it at all 6 gold-tint pill ternaries: transaction type chips, commitment status-filter chips, recurrence/duration pills, commitment-form amount-type + currency pills, and the account/category filter accordions.
- Zero rendered-text changes. Accepted normalization only: unselected label opacity `/65`→`/70`, accordion label `11.5px`→`11px`.

Spec: `docs/superpowers/specs/2026-05-25-wave4-sp1-selectable-pill-design.md`
Plan: `docs/superpowers/plans/2026-05-25-wave4-sp1-selectable-pill.md`

## Test plan
- [ ] CI parity green (format, lint, typecheck, jest, expo-doctor, android prebuild)
- [ ] Device QA: transaction type chips toggle + filter correctly
- [ ] Device QA: commitment status-filter chips (horizontal scroll) toggle
- [ ] Device QA: commitment form recurrence presets + custom duration periods select
- [ ] Device QA: commitment form amount-type + currency pills select; disabled when locked
- [ ] Device QA: filter sheet account/category pills — dot colors render, multi-select check appears, selection summary correct
EOF
)"
```

Expected: PR URL returned.

- [ ] **Step 4: Code review**

Invoke `anthropic-skills:requesting-code-review` with @tariq's lens. Fix ALL findings (including Minor). Re-run CI parity after fixes. Tariq approves/merges on the user's behalf per the autonomous-team workflow — but **hold the merge for the user's device-QA gate** (onboarding-style UI change touching 3 slices).

---

## Self-review notes (author)

- **Spec coverage:** API (label/selected/onPress/dotColor/checkable/accessibilityLabel) ✓ + the two real-code additions `disabled` and `style` (amount-type/currency pills) — documented here as a faithful extension of the signed-off API. Adoption set: all 6 files have a task (Tasks 2–7) ✓. Exclusions honored (no `account_type_pill`, no segmented toggles) ✓. Invariant (zero text change) ✓. Logic-only test policy ✓.
- **Deviation from spec:** the spec's "opportunistic `#888`→token" cleanup is **dropped** — `#888` has no exact palette equivalent, so any swap would shift the chevron/dot shade. Preserving `#888` keeps SP-1 a pure structural dedup with zero color change. (Strictly more conservative than the spec; flagged at hand-off.)
- **Type consistency:** `SelectablePillProps` field names are used identically across Tasks 2–7. `checkable` (boolean, default false), `dotColor` (string | undefined), `disabled` (default false), `style` (`StyleProp<ViewStyle>`).
- **Placeholder scan:** none — every code step has complete before/after.
