# Section 8 · Commitments — HeroUI Rebrand Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the entire Commitments domain (`screens/commitments/**`) from the legacy `StyleSheet.create` + `Colors.dark.*` pattern to HeroUI Native v1.0 + Unistyles 3 + Cairo Nights tokens, behind the `newCommitments` flag, with zero financial-behaviour change. Headline structural changes: `pay_sheet.tsx` migrates from imperative `react-native-actions-sheet` to the declarative `Sheet` (`components/ui/sheet.tsx`), the PaySheet date field upgrades to a proper date picker (the one intentional behaviour change, OQ-2 approved), and the Add/Edit form stays a full-screen route (OQ-1 approved) lifted to HeroUI primitives.

**Architecture:** In-place rebuild behind a flag, mirroring §6/§7 (NOT the `_v2` directory split). The V1 tree is copied verbatim to a sibling holding directory `screens/commitments_legacy/` and the route file `app/(app)/(tabs)/commitments/index.tsx` becomes a flag-branch component reading `FeatureFlags.newCommitments`: OFF → legacy copy, ON → the rebuilt `screens/commitments/`. The HeroUI rebuild lands in place at `screens/commitments/**`. After device QA, a promotion PR flips the flag; a cleanup PR deletes the holding directory, restores the route one-liner, and removes the flag. The store, repository, DB query files, entities, and `utils/compute_due_dates.ts` are **untouched** — all financial logic and its existing logic-layer tests are preserved.

**Tech Stack:** React Native · Expo (dev-client) · TypeScript strict · Expo Router v3 · expo-sqlite · Zustand v5 · RHF v7 + Zod v4 · HeroUI Native v1.0 (`Card`, `Chip`, `Button`, `Input`) · Unistyles 3 (via Uniwind) · `Sheet` (`@/components/ui/sheet`, wraps @gorhom/bottom-sheet v5) · `@react-native-community/datetimepicker` v8 · react-native-reanimated v4 · expo-linear-gradient · react-native-svg · MaterialCommunityIcons · Jest

**Spec:** [`docs/superpowers/specs/2026-05-23-section-8-commitments-design.md`](../specs/2026-05-23-section-8-commitments-design.md)

---

## High-Blast-Radius PRs (CRITICAL TRIGGERS — escalate to user at execution time)

Per CLAUDE.md `Critical triggers` items 3 and 8, the following waves are NOT team-decided. Sarah/Tariq surface these to the user:

- **Wave 2 — Device QA gate (Task 23):** Manual QA on a physical Android device. Always escalated; only the user can walk the matrix. The cross-currency pay balance check (USD commitment from EGP account) is the load-bearing verification.
- **Wave 3 — Promotion PR (Task 24):** Feature-flag flip `newCommitments: false → true`. High blast radius — promotes the new tree to production. Escalate.
- **Wave 4 — Cleanup PR (Task 25):** Deletes the V1 legacy holding directory. High blast radius (V1 deletion). Escalate.

Everything in Wave 1 (Tasks 1–22) is routine team-decided rebrand work — Tariq approves/merges code reviews on the user's behalf. No new dependency, no native code change, no schema migration: the `react-native-actions-sheet` import is removed from one file but the dep + patch remain (owned by §9), `@react-native-community/datetimepicker` is already in the stack, and there is no DDL. None of Wave 1 fires a critical trigger.

---

## Parallel Execution Map

```
Group A (Setup + shared)             ─── no deps ──► start immediately
  Task 1:  Legacy holding-directory copy + route flag-branch (ISOLATED commit)
  Task 2:  Strings — add §8 keys (pay-date picker label only)
  Task 3:  commitments.anim.ts prune (drop chip/row press-scale)

Group B (List components)            ─── parallel after Task 1
  Task 4:  CommitmentRow rewrite (Box/Text/Chip)
  Task 5:  StatusFilterChips rewrite (HeroUI Chip)
  Task 6:  SummaryHeader rewrite (Card + gradient via tokens)
  Task 7:  MonthNavigator rewrite
  Task 8:  empty_state.tsx rewire to @/components/ui/empty_state
  Task 9:  CommitmentsScreen index.tsx — <Screen>, drop in-screen FAB

Group C (Detail components)          ─── parallel after Task 1
  Task 10: DetailHero rewrite (gradient/grid/glow preserved; tokens)
  Task 11: CurrentCycleCard rewrite (Card + Button)
  Task 12: DetailsCard rebuilt on §7 DetailRow / DetailRowsCard
  Task 13: PaymentRow + PaymentHistory rewrite (Card)
  Task 14: SkipConfirmSheet — migrate RN Modal → Sheet (size="sm")
  Task 15: PaySheet migration → declarative Sheet + date-picker upgrade (HEADLINE)
  Task 16: CommitmentDetailScreen index.tsx — <Screen>+<ScreenScroll>

Group D (Form + add/edit)            ─── parallel after Task 1
  Task 17: RecurrencePicker rewrite (Chip + Input)
  Task 18: DurationPicker rewrite (Chip + Input; keep DateTimePicker)
  Task 19: CommitmentFormBody rewrite (Input/Chip/Button + <Screen>)
  Task 20: AddCommitmentScreen wrapper (<Screen>)
  Task 21: DeactivateSheet (migrate RN Modal → Sheet) + EditCommitmentScreen wrapper

Group E (Wire route + QA)            ─── depends on B + C + D
  Task 22: CLAUDE.md update (legacy-sheet list + Tech Stack tag) + full CI parity
  Task 23: 🛑 Manual device QA matrix (user-facing GATE)

Group F (Promotion + cleanup)        ─── depends on E passing
  Task 24: 🛑 Promotion PR — flip newCommitments flag
  Task 25: 🛑 Cleanup PR — delete legacy dir, restore one-liner, drop flag
```

**Parallel-safe inside Group B:** Tasks 4–9 all parallel after Task 1. Task 9 (index) consumes 4–8, sequence it last in the group.
**Parallel-safe inside Group C:** Tasks 10–15 parallel after Task 1; Task 16 (index) consumes them, sequence it last.
**Parallel-safe inside Group D:** Tasks 17, 18 parallel; Task 19 depends on 17 + 18; Tasks 20, 21 depend on 19.
**Sequential gates:** Task 1 must land first (everything imports through it). Task 22 after all of B+C+D. Tasks 23 → 24 → 25 strictly sequential and each escalated.

---

## File Map

### Rebuilt in place (HeroUI) — under `screens/commitments/`

```
index.tsx                              REWRITE — <Screen edges={['top']}>, drop in-screen FAB
commitments.hook.ts                    PRESERVED (data wiring; verify no StyleSheet/Colors leak)
commitments.state.ts                   PRESERVED (refreshing + statusFilter)
commitments.anim.ts                    PRUNE (drop useRowPressScale + useChipPressScale)
commitment_form.shared.ts              PRESERVED (Zod schema, defaults, presets)
components/commitment_row.tsx          REWRITE (Box/Text + HeroUI Chip)
components/summary_header.tsx          REWRITE (HeroUI Card; gradient via theme_tokens)
components/month_navigator.tsx         REWRITE (Box/Text/Pressable)
components/status_filter_chips.tsx     REWRITE (HeroUI Chip)
components/empty_state.tsx             REWIRE → @/components/ui/empty_state
components/commitment_form_body.tsx    REWRITE (Input/Chip/Button + <Screen>)
components/commitment_form_body.state.ts PRESERVED (picker visibility UI state)
components/recurrence_picker.tsx       REWRITE (Chip + Input)
components/duration_picker.tsx         REWRITE (Chip + Input; keep DateTimePicker)
components/decimal_amount_input.tsx    PRESERVED (numeric mask)
components/decimal_amount_input.state.ts PRESERVED

detail/index.tsx                       REWRITE — <Screen>+<ScreenScroll>, HeroUI header
detail/detail.hook.ts                  PRESERVED (verify imports)
detail/detail.state.ts                 PRESERVED (skip-confirm + screen-data stores)
detail/detail.anim.ts                  PRESERVED (entrance animations)
detail/components/detail_hero.tsx      REWRITE (gradient/grid/glow preserved; tokens)
detail/components/current_cycle_card.tsx REWRITE (HeroUI Card + Button)
detail/components/details_card.tsx     REWRITE on §7 DetailRow / DetailRowsCard
detail/components/payment_history.tsx  REWRITE (Card)
detail/components/payment_row.tsx      REWRITE (Box/Text)
detail/components/pay_sheet.tsx        MIGRATE → Sheet + date-picker upgrade  ← HEADLINE
detail/components/pay_sheet.hook.ts    MODIFY (delete .show()/.hide() useEffect already gone via declarative Sheet; add override state + paid_date as ISO)
detail/components/pay_sheet.state.ts   MODIFY (+ rateOverride flag)
detail/components/skip_confirm_dialog.tsx → RENAME to skip_confirm_sheet.tsx, MIGRATE → Sheet

edit_commitment/components/deactivate_dialog.tsx → RENAME to deactivate_sheet.tsx, MIGRATE → Sheet
edit_commitment/edit_commitment.hook.ts   PRESERVED
edit_commitment/edit_commitment.state.ts  PRESERVED
edit_commitment/index.tsx                 REWRITE wrapper (<Screen>) + deactivate Sheet
add_commitment/index.tsx                  REWRITE wrapper (<Screen>)
add_commitment/add_commitment.hook.ts     PRESERVED
add_commitment/add_commitment.state.ts    PRESERVED
```

### New files

```
screens/commitments_legacy/**          Task 1 — verbatim copy of the V1 tree (deleted in Task 25)
__tests__/screens/commitments_pay_sheet.hook.test.ts   Task 15 — pay-sheet prefill + requiresRate logic
```

### Modified (outside screens/commitments)

```
app/(app)/(tabs)/commitments/index.tsx   Task 1: flag-branch; Task 25: back to one-liner
constants/strings.ts                      Task 2: + pay-date picker label key
constants/feature_flags.ts                Task 24: newCommitments false → true; Task 25: removed
__tests__/feature_flags.test.ts           Task 24: assert true; Task 25: remove key
CLAUDE.md                                  Task 22: legacy-sheet list + Tech Stack actions-sheet tag
```

### Untouched (MUST NOT change)

```
store/commitment.store.ts
repositories/commitment.repository.ts
database/commitments.ts
database/commitment_payments.ts
database/entities/commitment.entity.ts
database/entities/commitment_payment.entity.ts
utils/compute_due_dates.ts
```

### Preserved logic tests (must stay green; do not edit unless an import path moved)

`__tests__/compute_due_dates.test.ts` · `__tests__/commitment.store.test.ts` · `__tests__/commitment.repository.test.ts` · `__tests__/commitment.query.test.ts` · `__tests__/commitment_payments.query.test.ts` · `__tests__/commitment_form_shared.test.ts` · `__tests__/screens/commitments.hook.test.ts` · `__tests__/screens/commitments.state.test.ts` · `__tests__/screens/commitments_add.hook.test.ts` · `__tests__/screens/commitments_edit.hook.test.ts` · `__tests__/screens/commitments_detail.hook.test.ts` · `__tests__/screens/commitments_detail.state.test.ts` · `__tests__/screens/commitments_detail_screen_data.state.test.ts` · `__tests__/screens/commitments_add_edit.state.test.ts` · `__tests__/screens/commitments_form_body_state.test.ts`

These cover §5.7 cases C-01..C-11 (due dates, status, cross-currency pay, skip, auto-deactivate, totals, progress). The rebrand keeps every one green. No new logic tests are needed except the small pay-sheet hook test in Task 15 (the pay-date type changes from free-text to ISO).

---

## Task 1: Legacy holding-directory copy + route flag-branch (ISOLATED commit)

This single isolated commit creates the V1 holding copy and points the route's OFF path at it. After this lands, the in-place rebuild (Tasks 4–21) overwrites `screens/commitments/**` while production still renders the legacy copy via the flag.

**Files:**
- Create: `screens/commitments_legacy/**` (verbatim copy of `screens/commitments/**`)
- Modify: `app/(app)/(tabs)/commitments/index.tsx`

- [ ] **Step 1: Copy the V1 tree to the holding directory**

Run:

```bash
cp -R screens/commitments screens/commitments_legacy
```

- [ ] **Step 2: Rewrite the legacy copy's internal absolute self-references**

The copied tree imports siblings via relative paths (e.g. `./commitments.hook`, `../detail.anim`) — those resolve correctly inside `commitments_legacy/` with no change. But three call sites navigate by route string and one imports the route nothing-special. Verify no absolute `@/screens/commitments/...` self-imports exist inside the copy:

Run:

```bash
grep -rn "@/screens/commitments/" screens/commitments_legacy/ || echo "no absolute self-imports — clean"
```

Expected: `no absolute self-imports — clean`. (The V1 tree uses relative sibling imports and `@/screens/transactions/...` for the §7-era pickers, which stay valid.) If any `@/screens/commitments/` line prints, rewrite it to `@/screens/commitments_legacy/` so the legacy copy is self-contained.

- [ ] **Step 3: Flag-branch the route file**

Overwrite `app/(app)/(tabs)/commitments/index.tsx`:

```tsx
import { FeatureFlags } from '@/constants/feature_flags';
import CommitmentsScreenLegacy from '@/screens/commitments_legacy';
import CommitmentsScreenV2 from '@/screens/commitments';

export default function CommitmentsRoute() {
  return FeatureFlags.newCommitments ? <CommitmentsScreenV2 /> : <CommitmentsScreenLegacy />;
}
```

> This file is a route. It exports a default React component and imports nothing with side effects — it satisfies the app/ rule (route files are `index.tsx` with a default export).

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS. Both `screens/commitments` and `screens/commitments_legacy` are identical at this point, so both imports resolve.

- [ ] **Step 5: Run the full suite (sanity — legacy tests still target screens/commitments)**

Run: `npm test -- --ci`
Expected: PASS. All preserved logic tests still import from `@/screens/commitments/*` (unchanged at this step).

- [ ] **Step 6: Commit**

```bash
git add screens/commitments_legacy "app/(app)/(tabs)/commitments/index.tsx"
git commit -m "$(cat <<'EOF'
chore(§8): copy V1 commitments to commitments_legacy + flag-branch route

In-place rebuild mechanic (mirrors §6/§7). The route renders the legacy
copy while newCommitments is false; the HeroUI rebuild lands in place at
screens/commitments/. Holding dir is deleted at cleanup (Task 25).
EOF
)"
```

---

## Task 2: Strings — add §8 pay-date picker label

The existing commitment strings (lines ~372–493 of `constants/strings.ts`) are comprehensive and reused as-is. The only new copy is the picker trigger label for the upgraded pay date field (OQ-2). All other labels (`commitmentsPayDate`, `commitmentDateInputFormat`, confirm/skip/deactivate keys) already exist and are reused.

**Files:**
- Modify: `constants/strings.ts`

- [ ] **Step 1: Add the key**

Open `constants/strings.ts`, find the `commitmentsPay*` cluster, and append:

```typescript
// §8: pay sheet date field upgraded from free-text to a date picker (OQ-2).
// commitmentsPayDate (the field label) already exists and is reused. This is
// the placeholder shown on the picker trigger when no date is chosen yet —
// reuses the existing long-date format produced by formatLongDate at runtime,
// so this key is only the fallback empty-state hint.
commitmentsPayDatePlaceholder: 'Select date',
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS — no duplicate-key error.

- [ ] **Step 3: Commit**

```bash
git add constants/strings.ts
git commit -m "feat(§8): add commitmentsPayDatePlaceholder for the upgraded pay-date picker"
```

---

## Task 3: Prune `commitments.anim.ts`

The list row press-scale and chip pop are dropped — HeroUI `Pressable`/`Chip` provide their own press feedback (spec §4.11). The detail entrance animations in `detail.anim.ts` are PRESERVED and untouched. After this task no consumer imports from `commitments.anim.ts`.

**Files:**
- Modify (or delete): `screens/commitments/commitments.anim.ts`

- [ ] **Step 1: Confirm the only consumers are the two components being rewritten**

Run:

```bash
grep -rln "commitments.anim\|useRowPressScale\|useChipPressScale" screens/commitments/
```

Expected: `commitment_row.tsx` and `status_filter_chips.tsx` (both rewritten in Tasks 4/5 to drop these) plus the file itself. No other consumer.

- [ ] **Step 2: Delete the file**

The §1 anatomy says `*.anim.ts` is Reanimated-only and omitted when unused. Since both press-scale hooks are dropped and `detail.anim.ts` holds the surviving animations, delete the list-level anim file:

```bash
rm screens/commitments/commitments.anim.ts
```

> Tasks 4 and 5 remove the imports; sequence this delete to land in the same Group-B PR after 4 + 5, OR keep the file until 4+5 are written and delete here — executor's choice. The end state is: no `commitments.anim.ts`, no `useRowPressScale`/`useChipPressScale` references.

- [ ] **Step 3: Typecheck (will fail until Tasks 4 + 5 drop the imports — that is expected if run standalone)**

Run: `npx tsc --noEmit`
Expected: errors ONLY in `commitment_row.tsx` / `status_filter_chips.tsx` for the missing import, resolved by Tasks 4/5. If those are already done, expect PASS.

- [ ] **Step 4: Commit (bundle with Tasks 4 + 5 if sequencing standalone fails typecheck)**

```bash
git add screens/commitments/commitments.anim.ts
git commit -m "refactor(§8): drop list press-scale anims (HeroUI Chip/Pressable provide feedback)"
```

---

## Task 4: CommitmentRow rewrite (Box/Text + HeroUI Chip)

Preserve the exact layout (icon · title · due-date · signed-amount · status-badge), the status color/label/icon maps, and the amount logic. Drop the Reanimated press-scale. Status colors move from `Colors.dark.*` literals to `theme_tokens` (module-level, for the `MaterialCommunityIcons` color prop and runtime hex).

**Files:**
- Rewrite: `screens/commitments/components/commitment_row.tsx`

- [ ] **Step 1: Inspect the token source**

Run: `grep -n "negative\|positive\|gold\|text2\|text3\|surfaceEl\|border" constants/theme_tokens.ts | head -30`
Expected: confirms the token names (`CoreTokens`, `Colors.dark.*` mirror) available at module level. Use `CoreTokens` / `Colors.dark.*` from `@/constants/theme_tokens` for the icon color prop and runtime hex, exactly as §5/§6 row components do.

- [ ] **Step 2: Rewrite the component**

Replace the full file with a HeroUI version. Keep the `STATUS_COLORS` / `STATUS_LABELS` / `STATUS_ICONS` maps and the amount/tilde logic verbatim; only the rendering and styling change:

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, View } from 'react-native';

import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { AmountType, CommitmentPaymentStatus } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors, CoreTokens } from '@/constants/theme_tokens';
import type { Category } from '@/database/entities/category.entity';
import type { Commitment } from '@/database/entities/commitment.entity';
import type { CommitmentPayment } from '@/database/entities/commitment_payment.entity';
import { formatShortDate } from '@/utils/format_date';
import { toIconName } from '@/utils/icon_name_guard';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const STATUS_COLORS: Record<CommitmentPaymentStatus, string> = {
  [CommitmentPaymentStatus.Overdue]: Colors.dark.negative,
  [CommitmentPaymentStatus.Due]: Colors.dark.gold,
  [CommitmentPaymentStatus.Upcoming]: Colors.dark.text2,
  [CommitmentPaymentStatus.Paid]: Colors.dark.positive,
  [CommitmentPaymentStatus.Skipped]: Colors.dark.text3,
};

const STATUS_LABELS: Record<CommitmentPaymentStatus, string> = {
  [CommitmentPaymentStatus.Overdue]: Strings.commitmentsStatusOverdue,
  [CommitmentPaymentStatus.Due]: Strings.commitmentsStatusDue,
  [CommitmentPaymentStatus.Upcoming]: Strings.commitmentsStatusUpcoming,
  [CommitmentPaymentStatus.Paid]: Strings.commitmentsStatusPaid,
  [CommitmentPaymentStatus.Skipped]: Strings.commitmentsStatusSkipped,
};

const STATUS_ICONS: Record<CommitmentPaymentStatus, IconName> = {
  [CommitmentPaymentStatus.Overdue]: 'alert-circle',
  [CommitmentPaymentStatus.Due]: 'clock-outline',
  [CommitmentPaymentStatus.Upcoming]: 'calendar-clock',
  [CommitmentPaymentStatus.Paid]: 'check-circle',
  [CommitmentPaymentStatus.Skipped]: 'minus-circle',
};

interface CommitmentRowProps {
  payment: CommitmentPayment;
  commitment: Commitment | undefined;
  category: Category | undefined;
  onPress: () => void;
}

const numberFmt = new Intl.NumberFormat('en-US', { style: 'decimal' });

export function CommitmentRow({ payment, commitment, category, onPress }: CommitmentRowProps) {
  const statusColor = STATUS_COLORS[payment.status];
  const statusLabel = STATUS_LABELS[payment.status];
  const isVariable = commitment?.amount_type === AmountType.Variable;
  const isPaid = payment.status === CommitmentPaymentStatus.Paid;
  const amount = isPaid
    ? (payment.amount_paid ?? payment.amount_due ?? commitment?.amount)
    : (payment.amount_due ?? commitment?.amount);
  const formattedAmount = amount != null ? numberFmt.format(amount) : '—';
  const showTilde = isVariable && !isPaid;
  const iconBg = category?.color ? `${category.color}2E` : CoreTokens.surfaceEl;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${commitment?.name ?? ''}, ${showTilde ? '~' : ''}${formattedAmount} ${payment.currency}, ${statusLabel}`}
      style={{ flexDirection: 'row', alignItems: 'center' }}
      className="border-separator min-h-[48px] gap-2 border-b px-4 py-2"
    >
      <View
        style={{ backgroundColor: iconBg, width: 36, height: 36 }}
        className="items-center justify-center rounded-md"
      >
        <MaterialCommunityIcons
          name={toIconName(category?.icon, 'tag-outline')}
          size={18}
          color={category?.color ?? CoreTokens.text2}
        />
      </View>
      <Box style={{ flex: 1 }}>
        <Text className="font-inter text-foreground text-[15px] font-medium" numberOfLines={1}>
          {commitment?.name ?? '—'}
        </Text>
        <Text className="font-inter text-muted mt-0.5 text-[11px]" numberOfLines={1}>
          {formatShortDate(payment.due_date)}
        </Text>
      </Box>
      <View style={{ alignItems: 'flex-end' }} className="gap-1">
        <Text className="font-sora text-foreground text-[15px] font-bold">
          {showTilde ? '~' : ''}
          {formattedAmount} {payment.currency}
        </Text>
        <View
          style={{ backgroundColor: `${statusColor}22`, flexDirection: 'row', alignItems: 'center' }}
          className="gap-0.5 rounded-full px-1.5 py-0.5"
        >
          <MaterialCommunityIcons name={STATUS_ICONS[payment.status]} size={11} color={statusColor} />
          <Text className="font-inter text-[10px]" style={{ color: statusColor }}>
            {statusLabel}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
```

> Status badge stays a tinted pill via runtime hex (`${statusColor}22`) on `style` per the CLAUDE.md runtime-hex rule — HeroUI `Chip` does not expose per-instance arbitrary tint colors cleanly, and the five status colors are runtime-mapped, so a composed `Box`/`Text` pill is the correct call here (not a parallel implementation — it is the idiomatic runtime-hex pattern §5/§6 row badges use).

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (assuming Task 3's anim deletion is bundled or pending).

- [ ] **Step 4: Run the preserved hook test that exercises this row's data**

Run: `npm test -- __tests__/screens/commitments.hook.test.ts`
Expected: PASS — the hook (sections/counts/totals) is unchanged; this confirms no data wiring broke.

- [ ] **Step 5: Commit**

```bash
git add screens/commitments/components/commitment_row.tsx
git commit -m "feat(§8): rebrand CommitmentRow to HeroUI Box/Text + tinted status pill"
```

---

## Task 5: StatusFilterChips rewrite (HeroUI Chip)

Retire the custom Reanimated `interpolateColor`/`useChipPressScale` chip (spec §4.2, the §5 SegmentSwitcher lesson). Single-select horizontal row using HeroUI `Chip`. The chip set and `CommitmentStatusFilter` mapping are unchanged.

**Files:**
- Rewrite: `screens/commitments/components/status_filter_chips.tsx`

- [ ] **Step 1: Confirm the HeroUI Chip API**

Run: `grep -rn "from 'heroui-native'" screens/ | grep -i chip | head; grep -rn "Chip" screens/transactions/ | grep -i 'isSelected\|onPress\|Chip ' | head`
Expected: shows how §6's TypeChips consumes HeroUI `Chip` (the proven single-select row shape, spec §6.8 risk row). Mirror that consumption.

- [ ] **Step 2: Rewrite the component**

```tsx
import { ScrollView, View } from 'react-native';
import { Chip } from 'heroui-native';

import { CommitmentPaymentStatus } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { CommitmentStatusFilter } from '../commitments.state';

interface Props {
  active: CommitmentStatusFilter;
  onChange: (f: CommitmentStatusFilter) => void;
}

const CHIPS: { key: CommitmentStatusFilter; labelKey: keyof typeof Strings }[] = [
  { key: 'all', labelKey: 'filterAll' },
  { key: CommitmentPaymentStatus.Overdue, labelKey: 'commitmentsStatusOverdue' },
  { key: CommitmentPaymentStatus.Due, labelKey: 'commitmentsStatusDue' },
  { key: CommitmentPaymentStatus.Upcoming, labelKey: 'commitmentsStatusUpcoming' },
  { key: CommitmentPaymentStatus.Paid, labelKey: 'commitmentsStatusPaid' },
  { key: CommitmentPaymentStatus.Skipped, labelKey: 'commitmentsStatusSkipped' },
];

export function StatusFilterChips({ active, onChange }: Props) {
  return (
    <View className="py-2">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-4">
        {CHIPS.map((c) => {
          const isActive = active === c.key;
          // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- labelKey values are hardcoded Strings keys; always defined
          const label = Strings[c.labelKey] as string;
          return (
            <Chip
              key={c.key}
              isSelected={isActive}
              onPress={() => onChange(c.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={label}
            >
              <Chip.Label>{label}</Chip.Label>
            </Chip>
          );
        })}
      </ScrollView>
    </View>
  );
}
```

> If the §6 TypeChips used a different HeroUI `Chip` sub-API (e.g. `<Chip>{label}</Chip>` without `Chip.Label`, or a `color`/`variant` prop for the gold-active fill), match that exact consumption rather than this sketch — compose the proven shape. The active state must read gold-fill-on-midnight-blue per spec §4.2; achieve it the same way §6 did.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add screens/commitments/components/status_filter_chips.tsx
git commit -m "feat(§8): replace custom Reanimated status chips with HeroUI Chip (single-select)"
```

---

## Task 6: SummaryHeader rewrite (HeroUI Card + gradient)

Preserve the totals-by-currency line, paid-% badge, gradient progress bar (width = `progressPct%`), and the 5-stat row. Re-skin to HeroUI `Card` + tokens. The gradient stays via `expo-linear-gradient` reading `GoldTokens` from `theme_tokens`. The `progress`/`progressPct` math is unchanged (`paid/total`, total excludes skipped).

**Files:**
- Rewrite: `screens/commitments/components/summary_header.tsx`

- [ ] **Step 1: Confirm the HeroUI Card API and token names**

Run: `grep -rn "from 'heroui-native'" screens/ | grep -i card | head; grep -n "GoldTokens\|CoreTokens" constants/theme_tokens.ts | head`
Expected: shows how §5 dashboard cards consume `Card` and confirms `GoldTokens[400]/[500]/[600]` exist for the gradient. Mirror §5's `Card` usage.

- [ ] **Step 2: Rewrite the component**

Keep `progress`, `progressPct`, `totalsLine`, and the `Stat` sub-component logic; change rendering to HeroUI `Card` + className styling. The gradient progress fill uses `GoldTokens`:

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';
import { Card } from 'heroui-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors, GoldTokens } from '@/constants/theme_tokens';

interface SummaryHeaderProps {
  counts: { paid: number; overdue: number; due: number; upcoming: number; skipped: number; total: number };
  totalsByCurrency: Map<string, number>;
}

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];
const numberFmt = new Intl.NumberFormat('en-US', { style: 'decimal' });

export function SummaryHeader({ counts, totalsByCurrency }: SummaryHeaderProps) {
  const progress = counts.total > 0 ? counts.paid / counts.total : 0;
  const progressPct = Math.round(progress * 100);
  const totalEntries = Array.from(totalsByCurrency.entries());
  const totalsLine =
    totalEntries.length === 0
      ? '—'
      : totalEntries.map(([cur, amt]) => `${numberFmt.format(amt)} ${cur}`).join('  ·  ');

  return (
    <Card className="bg-surface border-border mx-4 mb-2 gap-1 rounded-2xl border px-4 py-2">
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }} className="gap-2">
        <View style={{ flex: 1 }}>
          <Text className="font-inter text-muted text-[10px] uppercase tracking-wide">
            {Strings.commitmentsTotalCommitted}
          </Text>
          <Text className="font-sora text-foreground text-[16px] font-bold" numberOfLines={1}>
            {totalsLine}
          </Text>
        </View>
        <View style={{ backgroundColor: `${GoldTokens[500]}22` }} className="rounded-full px-2 py-0.5">
          <Text className="font-sora text-[13px] font-bold" style={{ color: GoldTokens[500] }}>
            {progressPct}%
          </Text>
        </View>
      </View>

      <View className="bg-default h-[3px] overflow-hidden rounded-[2px]">
        <LinearGradient
          colors={[GoldTokens[500], Colors.dark.gold]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ height: 3, borderRadius: 2, width: `${progressPct}%` }}
        />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Stat icon="check-circle" color={Colors.dark.positive} value={counts.paid} />
        <Stat icon="alert-circle" color={Colors.dark.negative} value={counts.overdue} />
        <Stat icon="clock-outline" color={Colors.dark.gold} value={counts.due} />
        <Stat icon="calendar-clock" color={Colors.dark.text2} value={counts.upcoming} />
        <Stat icon="minus-circle" color={Colors.dark.text3} value={counts.skipped} />
      </View>
    </Card>
  );
}

function Stat({ icon, color, value }: { icon: IconName; color: string; value: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }} className="gap-1">
      <MaterialCommunityIcons name={icon} size={13} color={color} />
      <Text className="font-sora text-[11px] font-semibold" style={{ color }}>
        {value}
      </Text>
    </View>
  );
}
```

> If §5's `Card` consumption requires a `Card.Body` sub-component or differs from a bare `<Card className=...>`, match it. The `bg-default` class is the §3 token for the progress track (the dark elevated surface); confirm against `global.css` and swap to the closest existing slot if `bg-default` is not the track color used elsewhere.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add screens/commitments/components/summary_header.tsx
git commit -m "feat(§8): rebrand SummaryHeader to HeroUI Card; gradient bar via GoldTokens"
```

---

## Task 7: MonthNavigator rewrite

Chevron-prev / month-label / chevron-next. Lift to `Box`/`Text`/`Pressable` + tokens. `formatMonthYear` unchanged.

**Files:**
- Rewrite: `screens/commitments/components/month_navigator.tsx`

- [ ] **Step 1: Rewrite the component**

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { CoreTokens } from '@/constants/theme_tokens';
import { formatMonthYear } from '@/utils/format_date';

interface MonthNavigatorProps {
  yearMonth: string; // 'YYYY-MM'
  onPrev: () => void;
  onNext: () => void;
}

export function MonthNavigator({ yearMonth, onPrev, onNext }: MonthNavigatorProps) {
  const label = formatMonthYear(yearMonth);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }} className="py-2">
      <Pressable onPress={onPrev} hitSlop={8} accessibilityRole="button" accessibilityLabel="Previous month" className="p-1">
        <MaterialCommunityIcons name="chevron-left" size={24} color={CoreTokens.text1} />
      </Pressable>
      <Text className="font-sora text-foreground min-w-[120px] text-center text-[17px] font-semibold">
        {label}
      </Text>
      <Pressable onPress={onNext} hitSlop={8} accessibilityRole="button" accessibilityLabel="Next month" className="p-1">
        <MaterialCommunityIcons name="chevron-right" size={24} color={CoreTokens.text1} />
      </Pressable>
    </View>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add screens/commitments/components/month_navigator.tsx
git commit -m "feat(§8): rebrand MonthNavigator to HeroUI primitives + tokens"
```

---

## Task 8: empty_state.tsx rewire to `@/components/ui/empty_state`

Switch from the legacy `@/components/empty_states` import to the §3 HeroUI wrapper `@/components/ui/empty_state` (spec §3.4, matching §6). The wrapper's `commitments` variant already supplies headline/description/CTA; the `actionLabel` prop is dropped (the wrapper sources copy from its variant config).

**Files:**
- Rewrite: `screens/commitments/components/empty_state.tsx`

- [ ] **Step 1: Rewrite the wrapper**

```tsx
import { EmptyState } from '@/components/ui/empty_state';

interface CommitmentsEmptyStateProps {
  onAdd: () => void;
}

export function CommitmentsEmptyState({ onAdd }: CommitmentsEmptyStateProps) {
  return <EmptyState variant="commitments" onAction={onAdd} />;
}
```

> The §3 `EmptyState` (`@/components/ui/empty_state`) takes only `variant` + `onAction` — it has no `actionLabel` prop (confirmed: its `commitments` variant pulls `Strings.emptyCommitmentsCta`). The legacy wrapper passed `actionLabel={Strings.commitmentsEmptyCta}`; that arg is dropped.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add screens/commitments/components/empty_state.tsx
git commit -m "feat(§8): rewire commitments empty state to the §3 HeroUI EmptyState wrapper"
```

---

## Task 9: CommitmentsScreen index.tsx — `<Screen>`, drop in-screen FAB

Lift to `<Screen edges={['top']}>`. Remove the in-screen `Pressable` FAB (spec §3.1, §5/§6 decision — the global tab FAB owns Add Commitment). Keep the `SectionList` with sticky headers, `ListHeaderComponent` (MonthNavigator + SummaryHeader + StatusFilterChips), `RefreshControl`, and the empty branch. `DateHeader` import stays from `@/screens/transactions/components/date_header` (already HeroUI per §6).

**Files:**
- Rewrite: `screens/commitments/index.tsx`

- [ ] **Step 1: Rewrite the screen**

```tsx
import { RefreshControl, SectionList, View } from 'react-native';

import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { GoldTokens } from '@/constants/theme_tokens';
import { DateHeader } from '@/screens/transactions/components/date_header';

import { useCommitments } from './commitments.hook';
import { CommitmentRow } from './components/commitment_row';
import { CommitmentsEmptyState } from './components/empty_state';
import { MonthNavigator } from './components/month_navigator';
import { StatusFilterChips } from './components/status_filter_chips';
import { SummaryHeader } from './components/summary_header';

export default function CommitmentsScreen() {
  const t = useCommitments();

  return (
    <Screen edges={['top']}>
      <View className="border-separator h-14 justify-center border-b px-4">
        <Text className="font-sora text-foreground text-[20px] font-semibold">
          {Strings.commitmentsTitle}
        </Text>
      </View>

      {t.state.isEmpty ? (
        <CommitmentsEmptyState onAdd={t.goToAdd} />
      ) : (
        <SectionList
          sections={t.state.sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled
          renderSectionHeader={({ section }) => <DateHeader label={section.title} />}
          renderItem={({ item }) => {
            const commitment = t.state.commitmentsById.get(item.commitment_id);
            const category = commitment ? t.state.categoriesById.get(commitment.category_id) : undefined;
            return (
              <CommitmentRow
                payment={item}
                commitment={commitment}
                category={category}
                onPress={() => t.goToDetail(item.id)}
              />
            );
          }}
          ListHeaderComponent={
            <>
              <MonthNavigator
                yearMonth={t.state.selectedMonth}
                onPrev={() => t.navigateMonth('prev')}
                onNext={() => t.navigateMonth('next')}
              />
              <SummaryHeader counts={t.state.counts} totalsByCurrency={t.state.totalsByCurrency} />
              <StatusFilterChips active={t.state.statusFilter} onChange={t.setStatusFilter} />
            </>
          }
          refreshControl={
            <RefreshControl
              refreshing={t.state.refreshing}
              onRefresh={() => void t.onRefresh()}
              tintColor={GoldTokens[500]}
            />
          }
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
        />
      )}
    </Screen>
  );
}
```

> The header height `h-14` (56) maps to the legacy `Size.headerHeight`; confirm against `constants/theme.ts` and adjust the class if the token differs. The in-screen FAB is GONE — do not re-add it. `goToAdd` stays in the hook (the global tab FAB long-press menu routes to `/commitments/add`, same target).

- [ ] **Step 2: Verify the hook has no StyleSheet/Colors leak (spec §6.1)**

Run: `grep -n "StyleSheet\|Colors.dark\|react-native-safe-area" screens/commitments/commitments.hook.ts || echo "hook clean"`
Expected: `hook clean` — the hook is data-only and stays untouched.

- [ ] **Step 3: Typecheck + run the list hook/state tests**

Run:

```bash
npx tsc --noEmit
npm test -- __tests__/screens/commitments.hook.test.ts __tests__/screens/commitments.state.test.ts
```

Expected: both PASS.

- [ ] **Step 4: Commit**

```bash
git add screens/commitments/index.tsx
git commit -m "feat(§8): lift CommitmentsScreen to <Screen>, drop in-screen FAB (tab FAB owns Add)"
```

---

## Task 10: DetailHero rewrite (gradient/grid/glow preserved; tokens)

Preserve the hero gradient (`heroGrad1/2/3`), SVG grid texture, gold glow, category-tinted icon box, name, amount, and meta line VERBATIM (spec §4.4). Only swap `Colors.dark.*`/`StyleSheet` for `theme_tokens` + className where possible. The SVG `stroke="#FFFFFF"` opacity-0.02 grid stays an inline literal (SVG props are not className-able — documented §5/§6 exception). The amount display logic is preserved exactly.

**Files:**
- Rewrite: `screens/commitments/detail/components/detail_hero.tsx`

- [ ] **Step 1: Rewrite, keeping the gradient/grid/glow + amount logic intact**

Keep `GridTexture`, the `LinearGradient` colors (now from `Colors.shared.*` in `theme_tokens`), the `amountText` derivation, and `heroEntering`. Convert the `StyleSheet` block to inline `style` + className. The icon color and tint-bg stay runtime hex:

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import Svg, { Defs, Pattern, Path, Rect } from 'react-native-svg';

import { Text } from '@/components/ui/text';
import { AmountType, CommitmentPaymentStatus } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme_tokens';
import type { Category } from '@/database/entities/category.entity';
import type { Commitment } from '@/database/entities/commitment.entity';
import type { CommitmentPayment } from '@/database/entities/commitment_payment.entity';
import { toIconName } from '@/utils/icon_name_guard';

import { heroEntering } from '../detail.anim';

const numberFmt = new Intl.NumberFormat('en-US', { style: 'decimal' });

interface Props {
  commitment: Commitment;
  category: Category | undefined;
  payment: CommitmentPayment | undefined;
  recurrenceLabel: string;
}

function GridTexture() {
  return (
    <Svg style={StyleSheet.absoluteFill}>
      <Defs>
        <Pattern id="cmt-grid" width="26" height="26" patternUnits="userSpaceOnUse">
          {/* SVG stroke is not className-able — inline literal per §5/§6 exception */}
          <Path d="M 26 0 L 0 0 0 26" fill="none" stroke="#FFFFFF" strokeWidth="1" opacity="0.02" />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#cmt-grid)" />
    </Svg>
  );
}

export function DetailHero({ commitment, category, payment, recurrenceLabel }: Props) {
  const iconColor = category?.color ?? Colors.dark.gold;
  const tintBg = iconColor.length === 7 ? `${iconColor}2E` : iconColor;
  const isVariable = commitment.amount_type === AmountType.Variable;
  const isPaid = payment?.status === CommitmentPaymentStatus.Paid;
  const amount = isPaid
    ? // oxlint-disable-next-line typescript/no-unnecessary-condition -- payment may be undefined at render
      (payment?.amount_paid ?? payment?.amount_due ?? commitment.amount)
    : (payment?.amount_due ?? commitment.amount);
  const showTilde = isVariable && !isPaid;
  const currency = payment?.currency ?? commitment.currency;
  const amountText =
    amount != null
      ? `${showTilde ? '~' : ''}${currency} ${numberFmt.format(amount)}`
      : isVariable
        ? Strings.commitmentsAmountVariable
        : currency;

  return (
    <Animated.View entering={heroEntering} style={{ paddingHorizontal: 16, paddingVertical: 20, alignItems: 'center', overflow: 'hidden' }}>
      <LinearGradient
        colors={[Colors.shared.heroGrad1, Colors.shared.heroGrad2, Colors.shared.heroGrad3]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <GridTexture />
      <View pointerEvents="none" style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: iconColor, opacity: 0.25 }} />
      <View style={{ backgroundColor: tintBg, width: 56, height: 56, marginBottom: 16 }} className="items-center justify-center rounded-xl">
        <MaterialCommunityIcons name={toIconName(category?.icon, 'tag-outline')} size={28} color={iconColor} />
      </View>
      <Text className="font-sora text-foreground mb-1 text-center text-[28px] font-extrabold" numberOfLines={1}>
        {commitment.name}
      </Text>
      <Text className="font-inter text-[16px] font-semibold" style={{ color: iconColor, opacity: 0.85 }} numberOfLines={1}>
        {amountText}
      </Text>
      <Text className="font-inter text-foreground mt-1 text-[12px]" style={{ opacity: 0.35 }} numberOfLines={1}>
        {category?.name ?? ''}
        {category?.name && recurrenceLabel ? ' · ' : ''}
        {recurrenceLabel}
      </Text>
    </Animated.View>
  );
}
```

> Confirm `Colors.shared.heroGrad1/2/3` exist in `theme_tokens` (they back the §5 HeroCard). If `theme_tokens` exposes them under a different name, use that. The `font-extrabold` maps to the legacy `FontFamily.soraExtra` — verify the `Text` wrapper / Tailwind weight produces Sora ExtraBold; if not, pass the fontFamily via style.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add screens/commitments/detail/components/detail_hero.tsx
git commit -m "feat(§8): rebrand DetailHero to tokens/className; gradient/grid/glow preserved"
```

---

## Task 11: CurrentCycleCard rewrite (HeroUI Card + Button)

HeroUI `Card` with a status-colored left border (preserved). Header row: amount text (with `~` for variable-unpaid) + due-date sublabel + status badge. When actionable (status ∉ {paid, skipped}): Mark as Paid → HeroUI `Button` primary (gold gradient); Skip → ghost/tertiary `Button`. Retire the custom `Pressable` + `LinearGradient` CTA (spec §4.5, the §5 lesson). Status maps + amount logic preserved.

**Files:**
- Rewrite: `screens/commitments/detail/components/current_cycle_card.tsx`

- [ ] **Step 1: Rewrite, keeping status maps + amount logic, swapping CTAs for `Button`**

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Card } from 'heroui-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { AmountType, CommitmentPaymentStatus } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme_tokens';
import type { Commitment } from '@/database/entities/commitment.entity';
import type { CommitmentPayment } from '@/database/entities/commitment_payment.entity';
import { formatShortDate } from '@/utils/format_date';

import { cardEntering } from '../detail.anim';

const numberFmt = new Intl.NumberFormat('en-US', { style: 'decimal' });
type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const STATUS_COLORS: Record<CommitmentPaymentStatus, string> = {
  [CommitmentPaymentStatus.Overdue]: Colors.dark.negative,
  [CommitmentPaymentStatus.Due]: Colors.dark.gold,
  [CommitmentPaymentStatus.Upcoming]: Colors.dark.text2,
  [CommitmentPaymentStatus.Paid]: Colors.dark.positive,
  [CommitmentPaymentStatus.Skipped]: Colors.dark.text3,
};
const STATUS_LABELS: Record<CommitmentPaymentStatus, string> = {
  [CommitmentPaymentStatus.Overdue]: Strings.commitmentsStatusOverdue,
  [CommitmentPaymentStatus.Due]: Strings.commitmentsStatusDue,
  [CommitmentPaymentStatus.Upcoming]: Strings.commitmentsStatusUpcoming,
  [CommitmentPaymentStatus.Paid]: Strings.commitmentsStatusPaid,
  [CommitmentPaymentStatus.Skipped]: Strings.commitmentsStatusSkipped,
};
const STATUS_ICONS: Record<CommitmentPaymentStatus, IconName> = {
  [CommitmentPaymentStatus.Overdue]: 'alert-circle',
  [CommitmentPaymentStatus.Due]: 'clock-outline',
  [CommitmentPaymentStatus.Upcoming]: 'calendar-clock',
  [CommitmentPaymentStatus.Paid]: 'check-circle',
  [CommitmentPaymentStatus.Skipped]: 'minus-circle',
};

interface Props {
  payment: CommitmentPayment;
  commitment: Commitment;
  onMarkAsPaid: () => void;
  onSkip: () => void;
}

export function CurrentCycleCard({ payment, commitment, onMarkAsPaid, onSkip }: Props) {
  const statusColor = STATUS_COLORS[payment.status];
  const statusLabel = STATUS_LABELS[payment.status];
  const isVariable = commitment.amount_type === AmountType.Variable;
  const isPaid = payment.status === CommitmentPaymentStatus.Paid;
  const amount = isPaid
    ? (payment.amount_paid ?? payment.amount_due ?? commitment.amount)
    : (payment.amount_due ?? commitment.amount);
  const showTilde = isVariable && !isPaid;
  const amountText =
    amount != null
      ? `${showTilde ? '~' : ''}${numberFmt.format(amount)} ${payment.currency}`
      : isVariable
        ? Strings.commitmentsAmountVariable
        : '—';
  const isActionable =
    payment.status !== CommitmentPaymentStatus.Paid && payment.status !== CommitmentPaymentStatus.Skipped;

  return (
    <Animated.View entering={cardEntering} className="mx-4 mt-4">
      <Text className="font-inter text-muted mb-1 text-[11px] uppercase tracking-wide">
        {Strings.commitmentsDetailCurrentCycle}
      </Text>
      <Card
        className="bg-surface gap-2 rounded-2xl px-3 py-3"
        style={{ borderLeftWidth: 3, borderLeftColor: statusColor }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }} className="gap-2">
          <View style={{ flex: 1 }}>
            <Text className="font-sora text-foreground text-[15px] font-semibold">{amountText}</Text>
            <Text className="font-inter text-muted text-[11px]">{formatShortDate(payment.due_date)}</Text>
          </View>
          <View style={{ backgroundColor: `${statusColor}22`, flexDirection: 'row', alignItems: 'center' }} className="gap-1 rounded-full px-2 py-0.5">
            <MaterialCommunityIcons name={STATUS_ICONS[payment.status]} size={12} color={statusColor} />
            <Text className="font-inter text-[11px]" style={{ color: statusColor }}>{statusLabel}</Text>
          </View>
        </View>

        {isActionable ? (
          <View style={{ flexDirection: 'row', alignItems: 'center' }} className="mt-0.5 gap-2">
            <View style={{ flex: 1 }}>
              <Button variant="primary" label={Strings.commitmentsMarkAsPaid} onPress={onMarkAsPaid} />
            </View>
            <Button variant="ghost" label={Strings.commitmentsSkip} onPress={onSkip} />
          </View>
        ) : null}
      </Card>
    </Animated.View>
  );
}
```

> The `Button` wrapper's `primary` variant already renders the gold gradient on midnight-blue text (confirmed in `components/ui/button.tsx`). For the Skip secondary, `variant="ghost"` — confirm `ghost` is a valid `ButtonVariant` in HeroUI; if not, use the closest tertiary/plain variant the §7 forms used. If `Card` requires `Card.Body`, wrap accordingly.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add screens/commitments/detail/components/current_cycle_card.tsx
git commit -m "feat(§8): rebrand CurrentCycleCard to HeroUI Card + Button (gold primary / ghost skip)"
```

---

## Task 12: DetailsCard rebuilt on §7 DetailRow / DetailRowsCard

Rebuild on the existing §7 primitives (`@/screens/transactions/detail/components/detail_row` + `detail_rows_card`) — do NOT rebuild a parallel row component (spec §4.6). Same rows, same order, `showDivider=false` on the last visible row. Conditional Notes row only when `notes != null`.

**Files:**
- Rewrite: `screens/commitments/detail/components/details_card.tsx`

- [ ] **Step 1: Rewrite using the §7 primitives**

```tsx
import Animated from 'react-native-reanimated';

import { Strings } from '@/constants/strings';
import type { Account } from '@/database/entities/account.entity';
import type { Commitment } from '@/database/entities/commitment.entity';
import { DetailRow } from '@/screens/transactions/detail/components/detail_row';
import { DetailRowsCard } from '@/screens/transactions/detail/components/detail_rows_card';
import { formatLongDate } from '@/utils/format_date';

import { cardEntering } from '../detail.anim';

interface Props {
  commitment: Commitment;
  account: Account | undefined;
  recurrenceLabel: string;
  durationLabel: string;
}

export function DetailsCard({ commitment, account, recurrenceLabel, durationLabel }: Props) {
  const hasNotes = commitment.notes != null;

  return (
    <Animated.View entering={cardEntering}>
      <DetailRowsCard>
        <DetailRow icon="repeat" label={Strings.commitmentsDetailRecurrence} value={recurrenceLabel} />
        <DetailRow
          icon="calendar-start"
          label={Strings.commitmentsDetailStartDate}
          value={formatLongDate(commitment.start_date)}
        />
        <DetailRow
          icon="bank-outline"
          label={Strings.commitmentsDetailDefaultAccount}
          value={account?.name ?? Strings.commitmentsDetailNone}
        />
        <DetailRow icon="timer-sand" label={Strings.commitmentsDetailDuration} value={durationLabel} />
        <DetailRow
          icon="currency-usd"
          label={Strings.commitmentsDetailCurrency}
          value={commitment.currency}
          showDivider={hasNotes}
        />
        {hasNotes ? (
          <DetailRow
            icon="text"
            label={Strings.commitmentsDetailNotes}
            value={commitment.notes!}
            showDivider={false}
          />
        ) : null}
      </DetailRowsCard>
    </Animated.View>
  );
}
```

> `DetailRowsCard` already supplies `mx-4 mt-4` outer spacing (confirmed in its source) — that replaces the legacy `wrap` margin. The `DetailRow` API (`icon`/`label`/`value`/`showDivider`) covers every commitments field; no fork needed. The currency row's divider shows only when a Notes row follows (last-visible-row rule).

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add screens/commitments/detail/components/details_card.tsx
git commit -m "feat(§8): rebuild DetailsCard on §7 DetailRow / DetailRowsCard primitives"
```

---

## Task 13: PaymentRow + PaymentHistory rewrite (Card)

`PaymentHistory`: HeroUI `Card` wrapper, keep the V1 `FlatList scrollEnabled={false}` inside the scroll body (it is NOT in a sheet — standard `FlatList` is correct here, spec §4.7). Renders nothing when zero payments. `PaymentRow`: status dot (runtime hex) · month-year · status label · amount. Behaviour preserved.

**Files:**
- Rewrite: `screens/commitments/detail/components/payment_row.tsx`
- Rewrite: `screens/commitments/detail/components/payment_history.tsx`

- [ ] **Step 1: Rewrite `payment_row.tsx`**

```tsx
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { CommitmentPaymentStatus } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme_tokens';
import type { Commitment } from '@/database/entities/commitment.entity';
import type { CommitmentPayment } from '@/database/entities/commitment_payment.entity';
import { formatMonthYear } from '@/utils/format_date';

const STATUS_COLORS: Record<CommitmentPaymentStatus, string> = {
  [CommitmentPaymentStatus.Overdue]: Colors.dark.negative,
  [CommitmentPaymentStatus.Due]: Colors.dark.gold,
  [CommitmentPaymentStatus.Upcoming]: Colors.dark.text2,
  [CommitmentPaymentStatus.Paid]: Colors.dark.positive,
  [CommitmentPaymentStatus.Skipped]: Colors.dark.text3,
};
const STATUS_LABELS: Record<CommitmentPaymentStatus, string> = {
  [CommitmentPaymentStatus.Overdue]: Strings.commitmentsStatusOverdue,
  [CommitmentPaymentStatus.Due]: Strings.commitmentsStatusDue,
  [CommitmentPaymentStatus.Upcoming]: Strings.commitmentsStatusUpcoming,
  [CommitmentPaymentStatus.Paid]: Strings.commitmentsStatusPaid,
  [CommitmentPaymentStatus.Skipped]: Strings.commitmentsStatusSkipped,
};
const numberFmt = new Intl.NumberFormat('en-US', { style: 'decimal' });

interface Props {
  payment: CommitmentPayment;
  commitment: Commitment;
  showDivider?: boolean;
}

export function PaymentRow({ payment, commitment, showDivider = true }: Props) {
  const statusColor = STATUS_COLORS[payment.status];
  const statusLabel = STATUS_LABELS[payment.status];
  const displayAmount = payment.amount_paid ?? payment.amount_due ?? commitment.amount;
  const amountText = displayAmount != null ? `${numberFmt.format(displayAmount)} ${payment.currency}` : '—';

  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center' }}
      className={`gap-2 py-2 ${showDivider ? 'border-separator border-b' : ''}`}
    >
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: statusColor }} />
      <View style={{ flex: 1 }}>
        <Text className="font-inter text-foreground text-[15px] font-medium">{formatMonthYear(payment.due_date)}</Text>
        <Text className="font-inter mt-0.5 text-[12px]" style={{ color: statusColor }}>{statusLabel}</Text>
      </View>
      <Text className="font-sora text-foreground text-[15px] font-semibold">{amountText}</Text>
    </View>
  );
}
```

- [ ] **Step 2: Rewrite `payment_history.tsx`**

```tsx
import { FlatList, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Card } from 'heroui-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import type { Commitment } from '@/database/entities/commitment.entity';
import type { CommitmentPayment } from '@/database/entities/commitment_payment.entity';

import { historyEntering } from '../detail.anim';
import { PaymentRow } from './payment_row';

interface Props {
  payments: CommitmentPayment[];
  commitment: Commitment;
}

export function PaymentHistory({ payments, commitment }: Props) {
  if (payments.length === 0) return null;

  return (
    <Animated.View entering={historyEntering} className="mx-4 mt-4">
      <Text className="font-inter text-muted mb-1 text-[11px] uppercase tracking-wide">
        {Strings.commitmentsDetailPaymentHistory}
      </Text>
      <Card className="bg-surface rounded-2xl px-3">
        <FlatList
          data={payments}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item, index }) => (
            <PaymentRow payment={item} commitment={commitment} showDivider={index < payments.length - 1} />
          )}
        />
      </Card>
    </Animated.View>
  );
}
```

> Standard RN `FlatList` is correct here (NOT `BottomSheetFlatList`) — this list lives inside `ScreenScroll`, not inside a Sheet. `scrollEnabled={false}` lets the parent scroll own the gesture. If `Card` needs `Card.Body`, wrap the FlatList.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add screens/commitments/detail/components/payment_row.tsx screens/commitments/detail/components/payment_history.tsx
git commit -m "feat(§8): rebrand PaymentRow + PaymentHistory to HeroUI Card + tokens"
```

---

## Task 14: SkipConfirmSheet — migrate RN Modal → Sheet (size="sm")

Replace the raw RN `Modal` (`skip_confirm_dialog.tsx`) with a declarative `Sheet` (`size="sm"`) confirm (spec §4.9, OQ-3 approved). Rename the file to `skip_confirm_sheet.tsx`. Title + body copy preserved (`commitmentsSkipConfirm*`). Two buttons: Cancel (ghost) + Skip Payment. Same `visible`/`onCancel`/`onConfirm` props — the `detail.hook.ts` wiring is unchanged.

**Files:**
- Create: `screens/commitments/detail/components/skip_confirm_sheet.tsx`
- Delete: `screens/commitments/detail/components/skip_confirm_dialog.tsx`
- Modify: `screens/commitments/detail/index.tsx` import (handled in Task 16)

- [ ] **Step 1: Create the Sheet version**

```tsx
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';

interface Props {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function SkipConfirmSheet({ visible, onCancel, onConfirm }: Props) {
  return (
    <Sheet visible={visible} onClose={onCancel} title={Strings.commitmentsSkipConfirmTitle} size="sm">
      <Sheet.Body>
        <View className="gap-4 px-4 pb-6">
          <Text className="font-inter text-muted text-[15px] leading-6">
            {Strings.commitmentsSkipConfirmBody}
          </Text>
          <View style={{ flexDirection: 'row' }} className="gap-3">
            <View style={{ flex: 1 }}>
              <Button variant="ghost" label={Strings.commitmentsSkipConfirmCancel} onPress={onCancel} />
            </View>
            <View style={{ flex: 1 }}>
              <Button variant="primary" label={Strings.commitmentsSkipConfirmConfirm} onPress={onConfirm} />
            </View>
          </View>
        </View>
      </Sheet.Body>
    </Sheet>
  );
}
```

> Skip is non-destructive to balances (it only sets status='skipped', no transaction, no balance change — spec §5.5), so `primary` gold is acceptable for the confirm. If the team prefers a danger tone, use the closest destructive `ButtonVariant`. The content is short and fixed-height, so no `BottomSheetScrollView` is needed.

- [ ] **Step 2: Delete the legacy Modal file**

```bash
rm screens/commitments/detail/components/skip_confirm_dialog.tsx
```

- [ ] **Step 3: Typecheck (the detail index still imports the old path until Task 16 — expect a single import error, resolved there)**

Run: `npx tsc --noEmit`
Expected: error only in `detail/index.tsx` for the old `skip_confirm_dialog` import (resolved in Task 16). If Task 16 is bundled, expect PASS.

- [ ] **Step 4: Commit (bundle with Task 16 if standalone typecheck fails)**

```bash
git add screens/commitments/detail/components/skip_confirm_sheet.tsx screens/commitments/detail/components/skip_confirm_dialog.tsx
git commit -m "feat(§8): migrate skip confirm from RN Modal to declarative Sheet (size=sm)"
```

---

## Task 15: PaySheet migration → declarative Sheet + date-picker upgrade (HEADLINE)

The section's headline change. Migrate `pay_sheet.tsx` from imperative `react-native-actions-sheet` to the declarative `Sheet` (spec §4.8), copying the §7 form-in-sheet pattern: `Sheet.Body` + `BottomSheetScrollView` + sticky-footer `SaveCta`. Upgrade the payment-date field from free-text to a date picker (OQ-2 approved — the one intentional behaviour change). Wire the `ExchangeRateRow` override state properly (V1 stubbed it). The `markAsPaid` call, the cross-currency math, and the prefill logic are PRESERVED — only the wrapper, the date field, and the override wiring change. This task removes the commitments-domain `react-native-actions-sheet` import (the dep + patch remain — §9 owns removal).

**Files:**
- Rewrite: `screens/commitments/detail/components/pay_sheet.tsx`
- Modify: `screens/commitments/detail/components/pay_sheet.hook.ts`
- Modify: `screens/commitments/detail/components/pay_sheet.state.ts`
- Create: `__tests__/screens/commitments_pay_sheet.hook.test.ts`

- [ ] **Step 1: Add `rateOverride` to `pay_sheet.state.ts`**

The V1 `ExchangeRateRow` was stubbed (`overrideEnabled={true}`, `onToggleOverride={() => {}}`). The V2 `ExchangeRateRow` (§7) drives override via `overrideEnabled`/`onToggleOverride`. Add a `rateOverride` UI flag (CLAUDE.md store/state shape):

```typescript
import { create } from 'zustand';

interface PaySheetStateShape {
  visible: boolean;
  saving: boolean;
  accountPickerVisible: boolean;
  rateOverride: boolean;
}

interface PaySheetState {
  state: PaySheetStateShape;
  setVisible: (v: boolean) => void;
  setSaving: (v: boolean) => void;
  setAccountPickerVisible: (v: boolean) => void;
  setRateOverride: (v: boolean) => void;
  reset: () => void;
}

const INITIAL_STATE: PaySheetStateShape = {
  visible: false,
  saving: false,
  accountPickerVisible: false,
  rateOverride: false,
};

export const usePaySheetState = create<PaySheetState>((set) => ({
  state: INITIAL_STATE,
  setVisible: (v) => set((s) => ({ state: { ...s.state, visible: v } })),
  setSaving: (v) => set((s) => ({ state: { ...s.state, saving: v } })),
  setAccountPickerVisible: (v) => set((s) => ({ state: { ...s.state, accountPickerVisible: v } })),
  setRateOverride: (v) => set((s) => ({ state: { ...s.state, rateOverride: v } })),
  reset: () => set({ state: INITIAL_STATE }),
}));
```

- [ ] **Step 2: Update `pay_sheet.hook.ts` — expose override toggle + keep paid_date ISO**

The schema's `paid_date` is already `z.string().min(1)` and prefilled with `toLocalDateString(new Date())` (an ISO `YYYY-MM-DD`). The date-picker upgrade keeps that exact value type — the picker just writes the same ISO string instead of free text. No schema change. Add the override wiring to the hook's destructure + return:

In the `usePaySheetState` destructure, add `setRateOverride`:

```typescript
  const {
    state: paySheetState,
    setVisible,
    setSaving,
    setAccountPickerVisible,
    setRateOverride,
    reset,
  } = usePaySheetState(
    useShallow((s) => ({
      state: s.state,
      setVisible: s.setVisible,
      setSaving: s.setSaving,
      setAccountPickerVisible: s.setAccountPickerVisible,
      setRateOverride: s.setRateOverride,
      reset: s.reset,
    })),
  );
```

In the `prefill` effect, when the sheet opens reset the override to false (so each open starts on the stored rate):

```typescript
      if (!cancelled) {
        form.reset({
          amount: prefillAmount,
          account_id: prefillAccountId,
          paid_date: toLocalDateString(new Date()),
          exchange_rate: undefined,
          notes: undefined,
        });
        setRateOverride(false);
      }
```

Add to the returned `state` and actions:

```typescript
  return {
    form,
    state: {
      saving: paySheetState.saving,
      requiresRate,
      selectedAccount,
      accounts: accountState.accounts,
      visible: paySheetState.visible,
      accountPickerVisible: paySheetState.accountPickerVisible,
      rateOverride: paySheetState.rateOverride,
      exchangeRateValue,
      rateUpdatedAt: currencyState.rate_updated_at,
    },
    onSubmit: form.handleSubmit(onValid),
    openAccountPicker: () => setAccountPickerVisible(true),
    closeAccountPicker: () => setAccountPickerVisible(false),
    selectAccount,
    setVisible,
    toggleRateOverride: () => setRateOverride(!paySheetState.rateOverride),
    setPaidDate: (iso: string) => form.setValue('paid_date', iso, { shouldValidate: true }),
  };
```

> `markAsPaid`, `requiresRate`, the prefill account fallback chain, and `onValid` (the `markAsPaid` payload incl. `exchange_rate_snapshot`) are UNCHANGED. The cross-currency math (C-06: egp_amount = amount_paid × rate; account deducts egp_amount) lives in the repository, untouched. The hook only gains override + date-setter helpers.

- [ ] **Step 3: Write the failing pay-sheet hook logic test**

The pay date now flows through a setter; assert the prefill defaults and `requiresRate` derivation are intact (these are the load-bearing logic paths the rebrand could break). Create `__tests__/screens/commitments_pay_sheet.hook.test.ts`. Mirror the existing `commitments_detail.hook.test.ts` mocking style (read it first):

Run first: `npm test -- __tests__/screens/commitments_detail.hook.test.ts` and read that file to copy its store-mock setup, then write:

```typescript
import { renderHook, act } from '@testing-library/react-native';

import { AmountType, CommitmentPaymentStatus, Currency } from '@/constants/enums';
import type { Commitment } from '@/database/entities/commitment.entity';
import type { CommitmentPayment } from '@/database/entities/commitment_payment.entity';

import { usePaySheet } from '@/screens/commitments/detail/components/pay_sheet.hook';
import { usePaySheetState } from '@/screens/commitments/detail/components/pay_sheet.state';

// Mock the stores the hook reads (account/commitment/currency) + the repository,
// copying the exact mock shape from commitments_detail.hook.test.ts. Keep
// markAsPaid a jest.fn so we assert the payload is built unchanged.

const fixedCommitment: Commitment = {
  id: 'c1',
  name: 'Netflix',
  amount_type: AmountType.Fixed,
  amount: 15,
  currency: Currency.USD,
  category_id: 'cat1',
  recurrence_every: 1,
  recurrence_period: 'months' as never,
  start_date: '2026-01-01',
  account_id: null,
  notes: null,
  duration_type: 'forever' as never,
  end_date: null,
  end_after_count: null,
  is_active: 1,
  created_at: 'X',
  updated_at: 'X',
} as Commitment;

const payment: CommitmentPayment = {
  id: 'p1',
  commitment_id: 'c1',
  due_date: '2026-05-01',
  amount_due: 15,
  amount_paid: null,
  currency: Currency.USD,
  status: CommitmentPaymentStatus.Due,
  paid_date: null,
  skipped_date: null,
  account_id: null,
  exchange_rate_snapshot: null,
  transaction_id: null,
  created_at: 'X',
  updated_at: 'X',
} as CommitmentPayment;

describe('usePaySheet', () => {
  beforeEach(() => {
    usePaySheetState.getState().reset();
  });

  it('prefills the fixed amount from amount_due when the sheet opens', async () => {
    const { result } = renderHook(() => usePaySheet(fixedCommitment, payment));
    act(() => result.current.setVisible(true));
    // prefill runs in an effect; flush microtasks
    await act(async () => {});
    expect(result.current.form.getValues('amount')).toBe(15);
    expect(result.current.form.getValues('paid_date')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('starts with rateOverride false on open', async () => {
    const { result } = renderHook(() => usePaySheet(fixedCommitment, payment));
    act(() => result.current.setVisible(true));
    await act(async () => {});
    expect(result.current.state.rateOverride).toBe(false);
  });

  it('toggleRateOverride flips the flag', async () => {
    const { result } = renderHook(() => usePaySheet(fixedCommitment, payment));
    act(() => result.current.setVisible(true));
    await act(async () => {});
    act(() => result.current.toggleRateOverride());
    expect(result.current.state.rateOverride).toBe(true);
  });

  it('setPaidDate writes an ISO string into the form (date-picker upgrade)', async () => {
    const { result } = renderHook(() => usePaySheet(fixedCommitment, payment));
    act(() => result.current.setVisible(true));
    await act(async () => {});
    act(() => result.current.setPaidDate('2026-05-20'));
    expect(result.current.form.getValues('paid_date')).toBe('2026-05-20');
  });
});
```

> Adjust the enum/literal cast shapes (`'months' as never`, etc.) to match the actual `Commitment`/`CommitmentPayment` entity field types — read `database/entities/commitment.entity.ts` and `commitment_payment.entity.ts` and use the real enum members (`RecurrencePeriod.Months`, `DurationType.Forever`) instead of casts where the entity types require them. The mock store wiring must match `commitments_detail.hook.test.ts` exactly.

- [ ] **Step 4: Run the test — expect failure (setPaidDate/toggleRateOverride/rateOverride not yet returned, or paid_date type)**

Run: `npm test -- __tests__/screens/commitments_pay_sheet.hook.test.ts`
Expected: FAIL — `result.current.setPaidDate is not a function` (Step 2 not yet applied) or the override flag missing.

- [ ] **Step 5: Rewrite `pay_sheet.tsx` to the declarative Sheet + date picker**

Copy the §7 `AddTransactionSheet` form-in-sheet pattern: `<Sheet visible onClose footer={<SaveCta/>}>` + `<Sheet.Body><BottomSheetScrollView>`. Inputs become HeroUI `Input`. The date field becomes a `Pressable` trigger opening `DateTimePickerAndroid` (Android) / inline `DateTimePicker` spinner (iOS) — same pattern the commitment form already uses (Task 19). The nested `AccountPickerSheet` (§7) is reused unchanged. The `ExchangeRateRow` (§7) gets real override wiring.

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useState } from 'react';
import { Controller } from 'react-hook-form';
import { Platform, Pressable, View } from 'react-native';
import { Input } from 'heroui-native';

import { SHEET_FOOTER_CLEARANCE, Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { AmountType, CommitmentPaymentStatus } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { CoreTokens } from '@/constants/theme_tokens';
import type { Commitment } from '@/database/entities/commitment.entity';
import type { CommitmentPayment } from '@/database/entities/commitment_payment.entity';
import { AccountPickerSheet } from '@/screens/transactions/transaction_form/components/account_picker_sheet';
import { ExchangeRateRow } from '@/screens/transactions/transaction_form/components/exchange_rate_row';
import { SaveCta } from '@/screens/transactions/transaction_form/components/save_cta';
import { formatLongDate, toLocalDateString } from '@/utils/format_date';

import { usePaySheet } from './pay_sheet.hook';

const numberFmt = new Intl.NumberFormat('en-US', { style: 'decimal' });

interface Props {
  commitment: Commitment | undefined;
  payment: CommitmentPayment | undefined;
}

export function PaySheet({ commitment, payment }: Props) {
  const {
    form,
    state,
    onSubmit,
    openAccountPicker,
    closeAccountPicker,
    selectAccount,
    setVisible,
    toggleRateOverride,
    setPaidDate,
  } = usePaySheet(commitment, payment);

  const [showIosDate, setShowIosDate] = useState(false);

  const isAlreadyPaid =
    payment?.status === CommitmentPaymentStatus.Paid ||
    payment?.status === CommitmentPaymentStatus.Skipped;
  const isVariable = commitment?.amount_type === AmountType.Variable;

  const amountError = form.formState.errors.amount?.message;
  const accountError = form.formState.errors.account_id?.message;
  const rateError = form.formState.errors.exchange_rate?.message;

  const exchangeRateStr = state.exchangeRateValue != null ? String(state.exchangeRateValue) : '';
  const amountWatch = form.watch('amount');
  const paidDate = form.watch('paid_date');
  const convertedTotal =
    state.requiresRate && state.exchangeRateValue && state.exchangeRateValue > 0
      ? amountWatch * state.exchangeRateValue
      : undefined;

  const paidDateAsDate = paidDate ? new Date(paidDate + 'T00:00:00') : new Date();

  function openDatePicker() {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: paidDateAsDate,
        mode: 'date',
        onChange: (_, d) => {
          if (d) setPaidDate(toLocalDateString(d));
        },
      });
    } else {
      setShowIosDate((v) => !v);
    }
  }

  function close() {
    setVisible(false);
  }

  return (
    <>
      <Sheet
        visible={state.visible}
        onClose={close}
        title={commitment ? Strings.commitmentsPayTitle(commitment.name) : ''}
        size="lg"
        footer={
          <SaveCta
            saving={state.saving || isAlreadyPaid}
            onPress={() => void onSubmit()}
            label={Strings.commitmentsPayConfirm}
          />
        }
      >
        <Sheet.Body>
          <BottomSheetScrollView
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: SHEET_FOOTER_CLEARANCE }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {payment ? (
              <Text className="font-inter text-muted mb-3 text-[12px]">
                {payment.due_date} · {payment.currency} ·{' '}
                {isVariable ? Strings.commitmentsAmountVariable : Strings.commitmentsAmountFixed}
              </Text>
            ) : null}

            {/* Amount */}
            <View className="mb-3 gap-1">
              <Text className="font-inter text-muted text-[11px] uppercase tracking-wide">
                {Strings.commitmentsPayAmount}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }} className="gap-2">
                <View style={{ flex: 1 }}>
                  <Controller
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <Input
                        value={field.value > 0 ? String(field.value) : ''}
                        onChangeText={(v) => {
                          const parsed = parseFloat(v);
                          field.onChange(isNaN(parsed) ? 0 : parsed);
                        }}
                        keyboardType="decimal-pad"
                        placeholder={isVariable ? Strings.commitmentsAmountPlaceholder : undefined}
                        isInvalid={!!amountError}
                        returnKeyType="done"
                      />
                    )}
                  />
                </View>
                {commitment ? (
                  <View className="bg-default border-border rounded-md border px-3 py-2">
                    <Text className="font-sora text-muted text-[15px] font-semibold">{commitment.currency}</Text>
                  </View>
                ) : null}
              </View>
              {amountError ? <Text className="font-inter text-danger text-[11px]">{amountError}</Text> : null}
            </View>

            {/* Pay-from account */}
            <View className="mb-3 gap-1">
              <Text className="font-inter text-muted text-[11px] uppercase tracking-wide">
                {Strings.commitmentsPayAccount}
              </Text>
              <Pressable
                onPress={openAccountPicker}
                style={{ flexDirection: 'row', alignItems: 'center' }}
                className="bg-default border-border gap-2 rounded-md border px-3 py-3"
              >
                {state.selectedAccount ? (
                  <>
                    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: state.selectedAccount.color ?? CoreTokens.surfaceEl }} />
                    <View style={{ flex: 1 }}>
                      <Text className="font-sora text-foreground text-[15px] font-semibold">{state.selectedAccount.name}</Text>
                      <Text className="font-inter text-muted text-[12px]">
                        {numberFmt.format(state.selectedAccount.current_balance)} {state.selectedAccount.currency}
                      </Text>
                    </View>
                  </>
                ) : (
                  <Text className="font-inter text-muted flex-1 text-[15px]">{Strings.commitmentsPayAccount}</Text>
                )}
                <MaterialCommunityIcons name="chevron-right" size={18} color={CoreTokens.text2} />
              </Pressable>
              {accountError ? <Text className="font-inter text-danger text-[11px]">{accountError}</Text> : null}
            </View>

            {/* Exchange rate (conditional) */}
            {state.requiresRate ? (
              <ExchangeRateRow
                value={exchangeRateStr}
                onChange={(v) => {
                  const parsed = parseFloat(v);
                  form.setValue('exchange_rate', isNaN(parsed) ? undefined : parsed, { shouldValidate: false });
                }}
                overrideEnabled={state.rateOverride}
                onToggleOverride={toggleRateOverride}
                rateUpdatedAt={state.rateUpdatedAt}
                amount={amountWatch || 0}
                error={rateError}
              />
            ) : null}

            {/* Converted total (conditional) */}
            {state.requiresRate && convertedTotal != null ? (
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }} className="mt-2">
                <Text className="font-sora text-foreground text-[15px] font-semibold">
                  = {numberFmt.format(convertedTotal)} {state.selectedAccount?.currency}
                </Text>
              </View>
            ) : null}

            {/* Date — upgraded to date picker (OQ-2) */}
            <View className="mb-3 mt-3 gap-1">
              <Text className="font-inter text-muted text-[11px] uppercase tracking-wide">
                {Strings.commitmentsPayDate}
              </Text>
              <Pressable
                onPress={openDatePicker}
                style={{ flexDirection: 'row', alignItems: 'center' }}
                className="bg-default border-border gap-2 rounded-md border px-3 py-3"
              >
                <Text className={paidDate ? 'font-sora text-foreground flex-1 text-[15px]' : 'font-inter text-muted flex-1 text-[15px]'}>
                  {paidDate ? formatLongDate(paidDate) : Strings.commitmentsPayDatePlaceholder}
                </Text>
                <MaterialCommunityIcons name="calendar" size={18} color={CoreTokens.text2} />
              </Pressable>
              {Platform.OS === 'ios' && showIosDate ? (
                <DateTimePicker
                  value={paidDateAsDate}
                  mode="date"
                  display="spinner"
                  themeVariant="dark"
                  onChange={(_, d) => {
                    if (d) setPaidDate(toLocalDateString(d));
                  }}
                />
              ) : null}
            </View>

            {/* Notes */}
            <View className="mb-3 gap-1">
              <Text className="font-inter text-muted text-[11px] uppercase tracking-wide">
                {Strings.commitmentsPayNotes}
              </Text>
              <Controller
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <Input
                    value={field.value ?? ''}
                    onChangeText={field.onChange}
                    placeholder={Strings.commitmentsOptional}
                    multiline
                    numberOfLines={3}
                    style={{ minHeight: 72, textAlignVertical: 'top' }}
                  />
                )}
              />
            </View>
          </BottomSheetScrollView>
        </Sheet.Body>
      </Sheet>

      <AccountPickerSheet
        visible={state.accountPickerVisible}
        title={Strings.commitmentsPayAccount}
        accounts={state.accounts}
        selectedId={state.selectedAccount?.id}
        onSelect={selectAccount}
        onClose={closeAccountPicker}
      />
    </>
  );
}
```

> KEY: no `react-native-actions-sheet` import remains. The imperative `useEffect`/`sheetRef.current?.show()/.hide()` is gone — `Sheet` is declarative via `visible`/`onClose`. `BottomSheetScrollView` (from `@gorhom/bottom-sheet`) is mandatory inside `Sheet` (CLAUDE.md sheet rule). The footer uses the §7 `SaveCta` — do not build a new CTA. Sheet stacking depth = 2 (PaySheet → AccountPickerSheet), within the documented max. `bg-default` is the input/row surface token — confirm against `global.css` and the §7 forms; swap to the slot §7 inputs use if different.

- [ ] **Step 6: Run the pay-sheet hook test — expect pass**

Run: `npm test -- __tests__/screens/commitments_pay_sheet.hook.test.ts`
Expected: PASS — prefill, override toggle, and ISO paid_date setter all green.

- [ ] **Step 7: Confirm the actions-sheet import is gone from this domain**

Run: `grep -rn "react-native-actions-sheet" screens/commitments/ || echo "no actions-sheet import in commitments — correct"`
Expected: `no actions-sheet import in commitments — correct`. (The dep + patch + the §9 `adjust_balance_sheet.tsx` consumer remain untouched.)

- [ ] **Step 8: Typecheck + run the preserved store/repository tests (cross-currency guard)**

Run:

```bash
npx tsc --noEmit
npm test -- __tests__/commitment.store.test.ts __tests__/commitment.repository.test.ts
```

Expected: PASS — the cross-currency math (C-06/C-07) is guarded by these untouched tests.

- [ ] **Step 9: Commit**

```bash
git add screens/commitments/detail/components/pay_sheet.tsx screens/commitments/detail/components/pay_sheet.hook.ts screens/commitments/detail/components/pay_sheet.state.ts __tests__/screens/commitments_pay_sheet.hook.test.ts
git commit -m "$(cat <<'EOF'
feat(§8): migrate PaySheet to declarative Sheet + upgrade pay-date to date picker

Removes the commitments-domain react-native-actions-sheet import (dep +
patch remain — §9 owns removal). Copies the §7 form-in-sheet pattern:
Sheet.Body + BottomSheetScrollView + sticky SaveCta footer. Pay-date
field upgraded from free-text to DateTimePicker (OQ-2, the one intended
behaviour change). ExchangeRateRow override now wired to a real
rateOverride flag (V1 stubbed it). markAsPaid + cross-currency math
(repository) untouched; C-06/C-07 logic tests stay green.
EOF
)"
```

---

## Task 16: CommitmentDetailScreen index.tsx — `<Screen>` + `<ScreenScroll>`

Lift to `<Screen edges={['top','bottom']}>` + `<ScreenScroll>`. HeroUI header (BackButton · centered title · Edit link gold). Wire the new `SkipConfirmSheet` (Task 14) import. The `viewState` branches (loading/notFound/ready), the `PaySheet` mount, and the `detail.hook` wiring are preserved.

**Files:**
- Rewrite: `screens/commitments/detail/index.tsx`

- [ ] **Step 1: Rewrite the screen**

```tsx
import { ActivityIndicator, Pressable, View } from 'react-native';

import { BackButton } from '@/components/ui/back_button';
import { Screen, ScreenScroll } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { GoldTokens } from '@/constants/theme_tokens';

import { CurrentCycleCard } from './components/current_cycle_card';
import { DetailHero } from './components/detail_hero';
import { DetailsCard } from './components/details_card';
import { PaySheet } from './components/pay_sheet';
import { PaymentHistory } from './components/payment_history';
import { SkipConfirmSheet } from './components/skip_confirm_sheet';
import { useCommitmentDetail } from './detail.hook';

export default function CommitmentDetailScreen() {
  const { state, confirmSkip, skipPayment, cancelSkip, openPaySheet, goToEdit, goBack } =
    useCommitmentDetail();

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }} className="border-separator h-14 justify-between border-b px-2">
        <BackButton onPress={goBack} />
        <Text className="font-sora text-foreground flex-1 text-center text-[20px] font-semibold" numberOfLines={1}>
          {state.commitment?.name ?? ''}
        </Text>
        {state.viewState === 'ready' && state.commitment ? (
          <Pressable onPress={goToEdit} hitSlop={8} className="min-w-[44px] items-center justify-center px-1">
            <Text className="font-inter text-[15px] font-semibold" style={{ color: GoldTokens[500] }}>
              {Strings.commitmentsDetailEdit}
            </Text>
          </Pressable>
        ) : (
          <View className="min-w-[44px]" />
        )}
      </View>

      {state.viewState === 'loading' ? (
        <View style={{ flex: 1 }} className="items-center justify-center">
          <ActivityIndicator color={GoldTokens[500]} />
        </View>
      ) : null}

      {state.viewState === 'notFound' ? (
        <View style={{ flex: 1 }} className="items-center justify-center">
          <Text className="font-inter text-muted text-[15px]">{Strings.commitmentsDetailNotFound}</Text>
        </View>
      ) : null}

      {state.viewState === 'ready' && state.commitment ? (
        <ScreenScroll contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <DetailHero
            commitment={state.commitment}
            category={state.category}
            payment={state.payment}
            recurrenceLabel={state.recurrenceLabel}
          />
          {state.payment ? (
            <CurrentCycleCard
              payment={state.payment}
              commitment={state.commitment}
              onMarkAsPaid={openPaySheet}
              onSkip={confirmSkip}
            />
          ) : null}
          <DetailsCard
            commitment={state.commitment}
            account={state.account}
            recurrenceLabel={state.recurrenceLabel}
            durationLabel={state.durationLabel}
          />
          <PaymentHistory payments={state.allPayments} commitment={state.commitment} />
        </ScreenScroll>
      ) : null}

      <PaySheet commitment={state.commitment} payment={state.payment} />

      <SkipConfirmSheet
        visible={state.skipConfirmVisible}
        onCancel={cancelSkip}
        onConfirm={() => void skipPayment()}
      />
    </Screen>
  );
}
```

> The `detail.hook` is unchanged — `findCurrentPayment`, the repo `getPaymentsByCommitment` load, skip flow, and nav all preserved. Confirm `BackButton` (`@/components/ui/back_button`) is the HeroUI back button used across §5–§7 headers.

- [ ] **Step 2: Typecheck + run the detail hook/state tests**

Run:

```bash
npx tsc --noEmit
npm test -- __tests__/screens/commitments_detail.hook.test.ts __tests__/screens/commitments_detail.state.test.ts __tests__/screens/commitments_detail_screen_data.state.test.ts
```

Expected: all PASS.

- [ ] **Step 3: Commit**

```bash
git add screens/commitments/detail/index.tsx
git commit -m "feat(§8): lift CommitmentDetailScreen to <Screen>/<ScreenScroll> + wire SkipConfirmSheet"
```

---

## Task 17: RecurrencePicker rewrite (Chip + Input)

Preset chips (Monthly/Weekly/Annually/Custom) + custom every/period row. Retire the custom `Pressable` + `chipActive` styling for HeroUI `Chip`; the every-count input becomes HeroUI `Input`. The preset/period logic (`PRESET_MAP`, `detectPreset`, `SET_OPTS`) and RHF wiring are preserved.

**Files:**
- Rewrite: `screens/commitments/components/recurrence_picker.tsx`

- [ ] **Step 1: Rewrite, preserving the form wiring**

Keep the `PRESETS`/`PERIODS` arrays and the `onPresetChange`/`form.setValue` callbacks. Swap the `Pressable` chips for HeroUI `Chip` (same single-select shape as Task 5) and the every-count `TextInput` for HeroUI `Input`:

```tsx
import { Controller, useWatch, type UseFormReturn } from 'react-hook-form';
import { View } from 'react-native';
import { Chip, Input } from 'heroui-native';

import { Text } from '@/components/ui/text';
import { RecurrencePeriod, RecurrencePreset } from '@/constants/enums';
import { Strings } from '@/constants/strings';

import { type CommitmentFormValues, SET_OPTS } from '../commitment_form.shared';

interface Props {
  form: UseFormReturn<CommitmentFormValues>;
  recurrencePreset: RecurrencePreset;
  onPresetChange: (preset: RecurrencePreset) => void;
}

const PRESETS: { key: RecurrencePreset; label: string }[] = [
  { key: RecurrencePreset.Monthly, label: Strings.commitmentsRecurrenceMonthly },
  { key: RecurrencePreset.Weekly, label: Strings.commitmentsRecurrenceWeekly },
  { key: RecurrencePreset.Annually, label: Strings.commitmentsRecurrenceAnnually },
  { key: RecurrencePreset.Custom, label: Strings.commitmentsRecurrenceCustom },
];
const PERIODS: { key: RecurrencePeriod; label: string }[] = [
  { key: RecurrencePeriod.Days, label: Strings.commitmentsRecurrenceUnitDays },
  { key: RecurrencePeriod.Weeks, label: Strings.commitmentsRecurrenceUnitWeeks },
  { key: RecurrencePeriod.Months, label: Strings.commitmentsRecurrenceUnitMonths },
  { key: RecurrencePeriod.Years, label: Strings.commitmentsRecurrenceUnitYears },
];

export function RecurrencePicker({ form, recurrencePreset, onPresetChange }: Props) {
  const recurrencePeriod = useWatch({ control: form.control, name: 'recurrencePeriod' });
  const everyError = form.formState.errors.recurrenceEvery?.message;

  return (
    <View className="bg-default gap-2 rounded-2xl px-3 py-3">
      <Text className="font-inter text-muted text-[11px]">{Strings.commitmentsFieldRecurrence}</Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }} className="gap-2">
        {PRESETS.map(({ key, label }) => (
          <Chip key={key} isSelected={recurrencePreset === key} onPress={() => onPresetChange(key)}>
            <Chip.Label>{label}</Chip.Label>
          </Chip>
        ))}
      </View>

      {recurrencePreset === RecurrencePreset.Custom ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }} className="gap-2">
          <Text className="font-inter text-muted text-[11px]">{Strings.commitmentsRecurrenceEvery}</Text>
          <View style={{ width: 56 }}>
            <Controller
              control={form.control}
              name="recurrenceEvery"
              render={({ field: { value, onChange, onBlur } }) => (
                <Input
                  // oxlint-disable-next-line typescript/no-unnecessary-condition -- RHF value can be null/undefined at reset
                  value={value != null ? String(value) : ''}
                  onChangeText={(v) => {
                    if (v === '') { onChange(undefined); return; }
                    const n = parseInt(v, 10);
                    if (!isNaN(n)) onChange(n);
                  }}
                  onBlur={onBlur}
                  keyboardType="number-pad"
                  maxLength={3}
                  isInvalid={!!everyError}
                  style={{ textAlign: 'center' }}
                />
              )}
            />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }} className="gap-2">
            {PERIODS.map(({ key, label }) => (
              <Chip
                key={key}
                isSelected={recurrencePeriod === key}
                onPress={() => form.setValue('recurrencePeriod', key, SET_OPTS)}
              >
                <Chip.Label>{label}</Chip.Label>
              </Chip>
            ))}
          </View>
        </View>
      ) : null}

      {everyError ? <Text className="font-inter text-danger text-[11px]">{everyError}</Text> : null}
    </View>
  );
}
```

> Match the exact `Chip` sub-API to whatever Task 5 settled on. `bg-default` is the field-container surface — confirm against the §7 form fields and use the same slot.

- [ ] **Step 2: Typecheck + run the form-shared test (preset detection)**

Run:

```bash
npx tsc --noEmit
npm test -- __tests__/commitment_form_shared.test.ts
```

Expected: PASS — `detectPreset`/`PRESET_MAP` are unchanged.

- [ ] **Step 3: Commit**

```bash
git add screens/commitments/components/recurrence_picker.tsx
git commit -m "feat(§8): rebrand RecurrencePicker to HeroUI Chip + Input (logic preserved)"
```

---

## Task 18: DurationPicker rewrite (Chip + Input; keep DateTimePicker)

Type chips (Forever/After N/Until date) + conditional inputs. Retire custom chips for HeroUI `Chip`; the after-count input becomes HeroUI `Input`. The `@react-native-community/datetimepicker` (Android modal + iOS spinner) is PRESERVED exactly (spec §4.10). RHF wiring preserved.

**Files:**
- Rewrite: `screens/commitments/components/duration_picker.tsx`

- [ ] **Step 1: Rewrite, preserving the date-picker and form wiring**

Keep `DURATION_TYPES`, `openEndDatePicker` (the Android `DateTimePickerAndroid.open` + iOS inline spinner), and the RHF callbacks. Swap chips → HeroUI `Chip`, count input → HeroUI `Input`, the until-date trigger row → a `Pressable` + tokens:

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Controller, useWatch, type UseFormReturn } from 'react-hook-form';
import { Platform, Pressable, View } from 'react-native';
import { Chip, Input } from 'heroui-native';

import { Text } from '@/components/ui/text';
import { DurationType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { CoreTokens } from '@/constants/theme_tokens';
import { formatLongDate, toLocalDateString } from '@/utils/format_date';

import { type CommitmentFormValues, SET_OPTS } from '../commitment_form.shared';

interface Props {
  form: UseFormReturn<CommitmentFormValues>;
  durationType: DurationType;
  onDurationTypeChange: (type: DurationType) => void;
  showEndDatePicker: boolean;
  setShowEndDatePicker: (v: boolean) => void;
}

const DURATION_TYPES: { key: DurationType; label: string }[] = [
  { key: DurationType.Forever, label: Strings.commitmentsDurationForever },
  { key: DurationType.AfterCount, label: Strings.commitmentsDurationAfterCount },
  { key: DurationType.UntilDate, label: Strings.commitmentsDurationUntilDate },
];

export function DurationPicker({ form, durationType, onDurationTypeChange, showEndDatePicker, setShowEndDatePicker }: Props) {
  const endDate = useWatch({ control: form.control, name: 'endDate' });
  const countError = form.formState.errors.endAfterCount?.message;
  const dateError = form.formState.errors.endDate?.message;

  const endDateAsDate = endDate ? new Date(endDate + 'T00:00:00') : new Date();
  const formattedEndDate = endDate ? formatLongDate(endDate) : Strings.commitmentDateInputFormat;

  function openEndDatePicker() {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: endDateAsDate,
        mode: 'date',
        onChange: (_, d) => {
          if (d) form.setValue('endDate', toLocalDateString(d), SET_OPTS);
        },
      });
    } else {
      setShowEndDatePicker(!showEndDatePicker);
    }
  }

  return (
    <View className="bg-default gap-2 rounded-2xl px-3 py-3">
      <Text className="font-inter text-muted text-[11px]">{Strings.commitmentsFieldDuration}</Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }} className="gap-2">
        {DURATION_TYPES.map(({ key, label }) => (
          <Chip key={key} isSelected={durationType === key} onPress={() => onDurationTypeChange(key)}>
            <Chip.Label>{label}</Chip.Label>
          </Chip>
        ))}
      </View>

      {durationType === DurationType.AfterCount ? (
        <View style={{ flexDirection: 'row', alignItems: 'center' }} className="gap-2">
          <Text className="font-inter text-muted text-[11px]">{Strings.commitmentsDurationStopAfter}</Text>
          <View style={{ width: 64 }}>
            <Controller
              control={form.control}
              name="endAfterCount"
              render={({ field: { value, onChange, onBlur } }) => (
                <Input
                  value={value != null ? String(value) : ''}
                  onChangeText={(v) => {
                    const n = parseInt(v, 10);
                    onChange(isNaN(n) ? undefined : n);
                  }}
                  onBlur={onBlur}
                  keyboardType="number-pad"
                  maxLength={4}
                  placeholder={Strings.commitmentsAfterCountPlaceholder}
                  isInvalid={!!countError}
                  style={{ textAlign: 'center' }}
                />
              )}
            />
          </View>
          <Text className="font-inter text-muted text-[11px]">{Strings.commitmentsDurationPayments}</Text>
        </View>
      ) : null}
      {countError ? <Text className="font-inter text-danger text-[11px]">{countError}</Text> : null}

      {durationType === DurationType.UntilDate ? (
        <Pressable
          onPress={openEndDatePicker}
          style={{ flexDirection: 'row', alignItems: 'center' }}
          className={`border-border gap-2 rounded-md border px-3 py-3 ${dateError ? 'border-danger' : ''}`}
        >
          <Text className={endDate ? 'font-sora text-foreground flex-1 text-[15px]' : 'font-inter text-muted flex-1 text-[15px]'}>
            {formattedEndDate}
          </Text>
          <MaterialCommunityIcons name="calendar" size={18} color={CoreTokens.text2} />
        </Pressable>
      ) : null}
      {durationType === DurationType.UntilDate && showEndDatePicker && Platform.OS === 'ios' ? (
        <DateTimePicker
          value={endDateAsDate}
          mode="date"
          display="spinner"
          themeVariant="dark"
          onChange={(_, d) => {
            if (d) form.setValue('endDate', toLocalDateString(d), SET_OPTS);
          }}
        />
      ) : null}
      {dateError ? <Text className="font-inter text-danger text-[11px]">{dateError}</Text> : null}
    </View>
  );
}
```

> The iOS picker now renders directly (the V1 had an extra "Done" header wrapper; the §7/§5 forms render the spinner inline without it — match that simpler shape). `border-danger` is the error-border slot — confirm against `global.css`.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add screens/commitments/components/duration_picker.tsx
git commit -m "feat(§8): rebrand DurationPicker to HeroUI Chip + Input; DateTimePicker preserved"
```

---

## Task 19: CommitmentFormBody rewrite (Input/Chip/Button + `<Screen>`)

Lift the whole form body to HeroUI: text fields → `Input`, toggle groups (amount type, currency) → `Chip` rows, CTA → gold-gradient `SaveCta`/`Button` in a sticky footer, pickers → §7 `CategoryPickerSheet`/`AccountPickerSheet` (already migrated, reused). The `DecimalAmountInput` and the start-date `DateTimePicker` are PRESERVED. Replaces `KeyboardAvoidingView` with `<Screen>` + `<ScreenScroll keyboardShouldPersistTaps="handled">` (spec §6.5). The Zod schema, defaults, preset/duration logic, and `commitment_form_body.state.ts` are unchanged.

**Files:**
- Rewrite: `screens/commitments/components/commitment_form_body.tsx`

- [ ] **Step 1: Read the §7 form body for the canonical HeroUI field pattern**

Run: read `screens/transactions/transaction_form/transaction_form_body.tsx`
Note: copy its field-label + `Input` + error-text shape, its `SaveCta` footer composition, and its picker-row pattern so the commitment form matches §7 visually.

- [ ] **Step 2: Rewrite the body**

Preserve all callbacks (`handleAmountTypeChange`, `handleRecurrencePresetChange`, `handleDurationTypeChange`, `openStartDatePicker`, `selectCategory`, `selectAccount`), the `useWatch` selectors, the `errors` map, and the `useCommitmentFormBodyState` wiring. Change only the rendering. Structure:

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Controller, useWatch, type UseFormReturn } from 'react-hook-form';
import { Platform, Pressable, View } from 'react-native';
import { Chip, Input } from 'heroui-native';
import { useShallow } from 'zustand/react/shallow';

import { BackButton } from '@/components/ui/back_button';
import { Screen, ScreenScroll } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { AmountType, Currency, DurationType, RecurrencePeriod } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { CoreTokens } from '@/constants/theme_tokens';
import type { Account } from '@/database/entities/account.entity';
import type { Category } from '@/database/entities/category.entity';
import { AccountPickerSheet } from '@/screens/transactions/transaction_form/components/account_picker_sheet';
import { CategoryPickerSheet } from '@/screens/transactions/transaction_form/components/category_picker_sheet';
import { SaveCta } from '@/screens/transactions/transaction_form/components/save_cta';
import { formatLongDate, toLocalDateString } from '@/utils/format_date';

import { type CommitmentFormValues, PRESET_MAP, SET_OPTS, detectPreset } from '../commitment_form.shared';
import { useCommitmentFormBodyState } from './commitment_form_body.state';
import { DecimalAmountInput } from './decimal_amount_input';
import { DurationPicker } from './duration_picker';
import { RecurrencePicker } from './recurrence_picker';

const CURRENCIES: Currency[] = [Currency.EGP, Currency.USD];
const AMOUNT_TYPES: { key: AmountType; label: string }[] = [
  { key: AmountType.Fixed, label: Strings.commitmentsAmountFixed },
  { key: AmountType.Variable, label: Strings.commitmentsAmountVariable },
];

interface CommitmentFormBodyProps {
  form: UseFormReturn<CommitmentFormValues>;
  categories: Category[];
  accounts: Account[];
  saving: boolean;
  onSubmit: () => void;
  title: string;
  locked?: boolean;
}

export function CommitmentFormBody({ form, categories, accounts, saving, onSubmit, title, locked }: CommitmentFormBodyProps) {
  // ... PRESERVE: useWatch selectors, recurrencePreset, selectedCategory/Account memos,
  //     useCommitmentFormBodyState destructure, the unmount reset effect, the errors map,
  //     startDateAsDate/formattedStartDate, and ALL handler functions verbatim ...

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }} className="border-separator h-14 border-b px-2">
        <BackButton onPress={() => router.back()} />
        <Text className="font-sora text-foreground flex-1 text-center text-[17px] font-semibold">{title}</Text>
        <View className="w-11" />
      </View>

      <ScreenScroll
        contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Name → Input
            Amount Type → Chip row
            Amount (DecimalAmountInput, preserved) + Currency → Chip row
            Category picker row → Pressable opening CategoryPickerSheet
            <RecurrencePicker .../>
            Start Date → Pressable opening DateTimePicker (Android modal / iOS inline spinner)
            Default Account picker row → Pressable opening AccountPickerSheet
            <DurationPicker .../>
            Notes → Input multiline
            — each field uses the §7 label + Input + error-text shape; chips use HeroUI Chip;
              the DecimalAmountInput and DateTimePicker are preserved exactly */}
      </ScreenScroll>

      <View className="border-separator border-t px-4 pb-6 pt-2">
        <SaveCta saving={saving} onPress={onSubmit} label={Strings.commitmentsSave} />
      </View>

      <CategoryPickerSheet
        visible={/* bodyState.categoryPickerVisible */ false}
        title={Strings.addTxPickCategoryTitle}
        categories={categories}
        selectedId={/* categoryId */ undefined}
        onSelect={/* selectCategory */ () => {}}
        onClose={/* () => setCategoryPickerVisible(false) */ () => {}}
      />
      <AccountPickerSheet
        visible={/* bodyState.accountPickerVisible */ false}
        title={Strings.addTxPickAccountTitle}
        accounts={accounts}
        selectedId={/* accountId */ undefined}
        onSelect={/* selectAccount */ () => {}}
        onClose={/* () => setAccountPickerVisible(false) */ () => {}}
      />
    </Screen>
  );
}
```

> The skeleton above marks the field block and picker props with comments — the executor fills each field using the PRESERVED handlers/state from the V1 file (read it: `screens/commitments_legacy/components/commitment_form_body.tsx` for the exact handler bodies, since the in-place V1 is overwritten by this task). Concretely:
> - **Name / Notes**: `<Controller>` → HeroUI `Input` (`isInvalid={!!errors.name}`, `editable={!locked}` → `isDisabled={locked}`).
> - **Amount Type / Currency**: `Chip` rows with `isSelected` + `onPress` calling `handleAmountTypeChange` / `form.setValue('currency', c, SET_OPTS)`, `isDisabled={locked}`.
> - **Amount**: keep `<DecimalAmountInput>` exactly (it is preserved); wrap with the same field label/error shape.
> - **Category / Default Account rows**: `Pressable` opening the picker via `setCategoryPickerVisible(true)` / `setAccountPickerVisible(true)`; show selected name + chevron (lock-outline when `locked`).
> - **Start Date**: `Pressable` calling `openStartDatePicker`; render the iOS inline `DateTimePicker` spinner when `bodyState.showStartDatePicker` (preserve the Android `DateTimePickerAndroid.open` path).
> - **Recurrence / Duration**: render `<RecurrencePicker>` and `<DurationPicker>` (Tasks 17/18) with the same props the V1 passed.
> - Wire the two picker sheets to the real `bodyState.*Visible` flags, `categoryId`/`accountId`, `selectCategory`/`selectAccount`, and the close setters.
> The footer uses `SaveCta` (§7) inside a bordered `View` — that bordered footer is the full-screen-route equivalent of the §7 in-sheet footer (here we are NOT in a sheet, so the explicit border-top/padding is correct, unlike the in-sheet SaveCta which omits it).

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Run the form-body-state + form-shared tests**

Run: `npm test -- __tests__/screens/commitments_form_body_state.test.ts __tests__/commitment_form_shared.test.ts`
Expected: PASS — the state store and schema are unchanged.

- [ ] **Step 5: Commit**

```bash
git add screens/commitments/components/commitment_form_body.tsx
git commit -m "feat(§8): rebrand CommitmentFormBody to HeroUI Input/Chip + <Screen>; pickers reused, DecimalAmountInput + DateTimePicker preserved"
```

---

## Task 20: AddCommitmentScreen wrapper (`<Screen>`)

The form body (Task 19) now owns the `<Screen>` wrapper, header, scroll, and footer. The Add wrapper collapses to just rendering `CommitmentFormBody` with the add hook's props — no outer `SafeAreaView` needed.

**Files:**
- Rewrite: `screens/commitments/add_commitment/index.tsx`

- [ ] **Step 1: Rewrite the wrapper**

```tsx
import { Strings } from '@/constants/strings';

import { CommitmentFormBody } from '../components/commitment_form_body';
import { useAddCommitment } from './add_commitment.hook';

export default function AddCommitmentScreen() {
  const { state, form, onSubmit } = useAddCommitment();

  return (
    <CommitmentFormBody
      form={form}
      categories={state.categories}
      accounts={state.accounts}
      saving={state.saving}
      onSubmit={() => void onSubmit()}
      title={Strings.commitmentsAddTitle}
    />
  );
}
```

> `CommitmentFormBody` is now the full-screen surface (it renders `<Screen>` internally). The legacy `SafeAreaView` + `styles.container` wrapper is removed. The `useAddCommitment` hook is untouched.

- [ ] **Step 2: Typecheck + run the add hook test**

Run:

```bash
npx tsc --noEmit
npm test -- __tests__/screens/commitments_add.hook.test.ts
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add screens/commitments/add_commitment/index.tsx
git commit -m "feat(§8): collapse AddCommitmentScreen wrapper (form body owns <Screen>)"
```

---

## Task 21: DeactivateSheet (migrate RN Modal → Sheet) + EditCommitmentScreen wrapper

Migrate `deactivate_dialog.tsx` (RN Modal) → a `Sheet` confirm (`deactivate_sheet.tsx`, same treatment as SkipConfirmSheet, spec §4.10). The EditCommitmentScreen wrapper renders `CommitmentFormBody` + a Deactivate link + the new Sheet. The `useEditCommitment` hook (incl. `confirmDeactivate`/`cancelDeactivate`/`handleDeactivate`) is unchanged.

**Files:**
- Create: `screens/commitments/edit_commitment/components/deactivate_sheet.tsx`
- Delete: `screens/commitments/edit_commitment/components/deactivate_dialog.tsx`
- Rewrite: `screens/commitments/edit_commitment/index.tsx`

- [ ] **Step 1: Create the Sheet version**

```tsx
import { ActivityIndicator, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Colors } from '@/constants/theme_tokens';
import { Strings } from '@/constants/strings';

interface Props {
  visible: boolean;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeactivateSheet({ visible, busy, onCancel, onConfirm }: Props) {
  return (
    <Sheet
      visible={visible}
      onClose={busy ? () => {} : onCancel}
      title={Strings.commitmentsDeactivateTitle}
      size="sm"
    >
      <Sheet.Body>
        <View className="gap-4 px-4 pb-6">
          <Text className="font-inter text-muted text-[15px] leading-6">{Strings.commitmentsDeactivateBody}</Text>
          <View style={{ flexDirection: 'row' }} className="gap-3">
            <View style={{ flex: 1 }}>
              <Button variant="ghost" label={Strings.commitmentsDeactivateCancel} onPress={onCancel} isDisabled={busy} />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                variant="primary"
                label={busy ? '' : Strings.commitmentsDeactivateConfirm}
                onPress={onConfirm}
                isDisabled={busy}
              >
                {busy ? <ActivityIndicator color={Colors.shared.midnightBlue} /> : null}
              </Button>
            </View>
          </View>
        </View>
      </Sheet.Body>
    </Sheet>
  );
}
```

> Deactivate is a state change on the commitment (no balance/transaction impact), so `primary` is acceptable; if the team prefers a danger tone use the closest destructive variant. If the `Button` wrapper does not accept `children` (it renders `label` only — check `components/ui/button.tsx`), instead pass `isLoading={busy}` (the wrapper renders `'Loading...'` for loading) OR keep a label and disable while busy — the executor picks whichever the wrapper supports. The point: replace the raw `Modal`, preserve the busy-guard.

- [ ] **Step 2: Delete the legacy Modal**

```bash
rm screens/commitments/edit_commitment/components/deactivate_dialog.tsx
```

- [ ] **Step 3: Rewrite the Edit wrapper**

```tsx
import { Pressable } from 'react-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';

import { CommitmentFormBody } from '../components/commitment_form_body';
import { DeactivateSheet } from './components/deactivate_sheet';
import { useEditCommitment } from './edit_commitment.hook';

export default function EditCommitmentScreen() {
  const { state, form, onSubmit, handleDeactivate, confirmDeactivate, cancelDeactivate } = useEditCommitment();

  return (
    <>
      <CommitmentFormBody
        form={form}
        categories={state.categories}
        accounts={state.accounts}
        saving={state.saving}
        onSubmit={() => void onSubmit()}
        title={Strings.commitmentsEditTitle}
      />
      <Pressable onPress={handleDeactivate} className="items-center px-4 py-5">
        <Text className="font-inter text-[15px] font-semibold" style={{ color: undefined }} accent={false}>
          {Strings.commitmentsDeactivate}
        </Text>
      </Pressable>
      <DeactivateSheet
        visible={state.deactivateDialogVisible}
        busy={state.saving}
        onCancel={cancelDeactivate}
        onConfirm={() => void confirmDeactivate()}
      />
    </>
  );
}
```

> The Deactivate link must render in danger color. Use `text-danger` className on the `Text` (drop the `style`/`accent` placeholders above): `<Text className="font-inter text-danger text-[15px] font-semibold">`. NOTE: because `CommitmentFormBody` now renders `<Screen>` with `flex:1`, the Deactivate `Pressable` sibling will sit BELOW the screen in the fragment — verify on device it renders inside the scroll, not clipped. If clipped, move the Deactivate link to be passed INTO `CommitmentFormBody` as an optional `footerExtra` slot rendered above the CTA (executor's call during Task 19 if QA flags it). The `useEditCommitment` hook is unchanged.

- [ ] **Step 4: Typecheck + run the edit hook + add/edit state tests**

Run:

```bash
npx tsc --noEmit
npm test -- __tests__/screens/commitments_edit.hook.test.ts __tests__/screens/commitments_add_edit.state.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add screens/commitments/edit_commitment/components/deactivate_sheet.tsx screens/commitments/edit_commitment/components/deactivate_dialog.tsx screens/commitments/edit_commitment/index.tsx
git commit -m "feat(§8): migrate deactivate confirm to Sheet; rebrand EditCommitmentScreen wrapper"
```

---

## Task 22: CLAUDE.md update + full CI parity (close Wave 1)

Update CLAUDE.md to drop the commitments line from the legacy-sheet list, run the full pre-push CI parity chain, and ship the Wave 1 PR with `newCommitments: false` (production stays on V1).

**Files:**
- Modify: `CLAUDE.md`

> **Cross-section coordination note (§8 + §9 both edit this list):** Both §8 and §9 touch the CLAUDE.md `Bottom Sheets` legacy-consumers paragraph and the Tech Stack `react-native-actions-sheet` tag. Whichever of §8/§9 merges SECOND must rebase onto the first and re-apply its edit (the two edits touch adjacent lines). §8 removes only its own `pay_sheet.tsx` line and leaves the `adjust_balance_sheet.tsx` line + the dep + the patch (all owned by §9).

- [ ] **Step 1: Update the legacy-consumers paragraph**

Open `CLAUDE.md`, find the `Bottom Sheets` section's "Legacy consumers still in-flight" line. Remove the `pay_sheet.tsx` clause; keep the `adjust_balance_sheet.tsx` clause; bump the label to "(as of §8)":

Change:

```markdown
Legacy consumers still in-flight (as of §7 cleanup): `screens/accounts/detail/components/adjust_balance_sheet.tsx` (migrates in §9), `screens/commitments/detail/components/pay_sheet.tsx` (migrates in §8). The §7 transaction-form consumers, the dashboard net-worth-breakdown sheet, and both settings category sheets have all been migrated.
```

to:

```markdown
Legacy consumers still in-flight (as of §8 cleanup): `screens/accounts/detail/components/adjust_balance_sheet.tsx` (migrates in §9). The §7 transaction-form consumers, the dashboard net-worth-breakdown sheet, both settings category sheets, and the §8 commitments pay sheet have all been migrated. The `react-native-actions-sheet` dep + patch remain until §9 (the last consumer) migrates.
```

- [ ] **Step 2: Update the Tech Stack actions-sheet tag**

Find the Tech Stack line `react-native-actions-sheet (legacy, phasing out §4–§9; do NOT add new usages)`. It already spans §4–§9, so no range change is needed — but verify the tag still reads correctly given §8 is now done. Leave it as `§4–§9` (the dep is alive until §9). No edit required unless the range was narrowed in a prior section; if so, ensure it still includes §9.

- [ ] **Step 3: Run the full pre-push CI parity chain**

Run:

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

Expected: `✓ CI parity green — safe to push`. If any step fails, fix it, re-run from the top until green. In particular `npm test -- --ci` must show all preserved logic tests + the new pay-sheet hook test green, and coverage thresholds (80/95/100) met — note the rebrand added no UI render tests (logic-only policy), so coverage is carried by the preserved logic suite.

- [ ] **Step 4: Commit + push the Wave 1 PR (flag stays false)**

```bash
git add CLAUDE.md
git commit -m "$(cat <<'EOF'
chore(§8): drop commitments pay_sheet from CLAUDE.md legacy-sheet list

§8 rebrand complete behind newCommitments: false. The dep + patch + the
§9 adjust_balance_sheet.tsx consumer remain. §9 merges second rebases
this CLAUDE.md edit.
EOF
)"
git push -u origin feat/section-8-commitments
gh pr create --title "feat(§8): Commitments HeroUI rebrand (behind newCommitments flag)" --body "$(cat <<'EOF'
## Summary

Full Commitments-domain HeroUI rebrand, built in place behind `newCommitments: false`. Pure visual + structural rebrand — zero financial-behaviour change. Headline: PaySheet migrated from `react-native-actions-sheet` to the declarative `Sheet`; pay-date upgraded to a date picker (OQ-2); Add/Edit form stays a full-screen route (OQ-1). Skip + deactivate confirms migrated from RN Modal to `Sheet`.

## Scope

- List: CommitmentRow, StatusFilterChips (HeroUI Chip), SummaryHeader (Card), MonthNavigator, EmptyState rewire, screen lifted to `<Screen>`, in-screen FAB dropped (tab FAB owns Add).
- Detail: DetailHero (gradient/grid/glow preserved), CurrentCycleCard (Card + Button), DetailsCard (§7 DetailRow/DetailRowsCard), PaymentHistory/Row, screen lifted to `<Screen>`/`<ScreenScroll>`.
- Pay: PaySheet → declarative Sheet + date picker; ExchangeRateRow override wired; markAsPaid + cross-currency math untouched.
- Form: CommitmentFormBody/RecurrencePicker/DurationPicker → HeroUI Input/Chip; DecimalAmountInput + DateTimePicker preserved.
- Removed only the commitments `react-native-actions-sheet` import. Dep + patch remain (§9 owns removal).

## Test plan

- [x] All preserved logic-layer tests green (compute_due_dates, store, repository, queries, form-shared, hook/state suites — C-01..C-11).
- [x] New pay-sheet hook logic test green (prefill, rateOverride, ISO paid_date).
- [x] `tsc --noEmit`, lint, format, expo-doctor, android prebuild dry-run all green (CI parity chain).
- [ ] Manual device QA (Wave 2) — user-facing gate, escalated.

## Follow-up

- Wave 2 device QA (escalated to user). Wave 3 promotion (flag flip, escalated). Wave 4 cleanup (V1 deletion, escalated).
- §9 migrates `adjust_balance_sheet.tsx` and removes the `react-native-actions-sheet` dep + patch; §9 rebases this CLAUDE.md edit.
EOF
)"
```

Tariq approves/merges on the user's behalf (routine rebrand, no critical trigger). Production stays on V1.

---

## Task 23: 🛑 Manual device QA matrix (USER-FACING GATE — escalate)

**CRITICAL TRIGGER (CLAUDE.md item 8): manual device QA is always escalated; only the user can walk it.** This task produces NO code — it produces a verdict. Sarah surfaces it to the user.

- [ ] **Step 1: Build and run on a physical Android device**

Run: `npx expo run:android --device`

- [ ] **Step 2: Temporarily flip the flag LOCALLY (do NOT commit)**

Edit `constants/feature_flags.ts`: `newCommitments: false` → `true`. Reload the dev build. Revert (`git restore constants/feature_flags.ts`) after QA.

- [ ] **Step 3: Walk the matrix (spec §7 Wave 2)**

- [ ] **List:** empty state; populated list; status grouping; each status filter chip; month navigation (incl. year rollover); summary totals + progress % correctness; pull-to-refresh.
- [ ] **Detail — display:** all status states (overdue/due/upcoming/paid/skipped); fixed vs variable amount; `~` tilde only when variable && not paid; notes present/absent; payment history rows.
- [ ] **Pay — same-currency:** fixed EGP commitment from EGP account → verify balance deducts the face value; status → paid.
- [ ] **Pay — variable amount:** enter an actual amount; saves correctly.
- [ ] **Pay — CROSS-CURRENCY (load-bearing):** USD commitment from EGP account, rate 48.85 → verify account balance deducts `amount × rate` (egp_amount), NOT the USD face value; transaction `egp_amount` correct (C-06). This is THE check.
- [ ] **Pay — exchange rate:** stale-rate warning shows when rate > 30 days old; override toggle works; reset-to-global works; live EGP preview updates.
- [ ] **Pay — date picker (OQ-2):** Android opens the modal date picker; iOS shows the inline spinner; selected date persists to the field and saves.
- [ ] **Pay — account picker:** stacks over the PaySheet (depth 2); selecting closes only the picker; PaySheet stays open.
- [ ] **Pay — validation:** amount required, account required errors render.
- [ ] **Skip:** confirm Sheet opens; balance unchanged; no transaction created; status → skipped.
- [ ] **Add:** all field types; recurrence presets + custom every/period; duration types + conditionals; start-date picker (Android modal + iOS spinner); category + account pickers; save creates the commitment + generates payments.
- [ ] **Edit:** prefill; save; deactivate confirm Sheet → commitment deactivates and pops to list.
- [ ] **Auto-deactivation:** after-count commitment, pay the final payment → commitment auto-deactivates (C-09).
- [ ] **Regression smoke:** §1–§7 screens (dashboard, transactions, settings, accounts) still render — flip the flag back and forth.
- [ ] **Dev-client compat:** no new native module added (the date picker is already in the stack).
- [ ] (Optional) repeat the pay + form flows on iOS.

- [ ] **Step 4: Revert the local flag edit**

Run: `git restore constants/feature_flags.ts`

- [ ] **Step 5: Report verdict to the user**

- **"all good"** → proceed to Task 24 (promotion).
- **"item X failed"** → open a fix branch, address, re-QA, re-run CI parity.

---

## Task 24: 🛑 Promotion PR — flip `newCommitments` flag (HIGH BLAST RADIUS — escalate)

**CRITICAL TRIGGER (CLAUDE.md item 3): feature-flag flip. Escalate to the user.** A single one-line flip paired with the test assertion, per the §5/§6/§7 promotion pattern.

**Files:**
- Modify: `constants/feature_flags.ts`
- Modify: `__tests__/feature_flags.test.ts`

- [ ] **Step 1: Flip the flag**

Open `constants/feature_flags.ts`. Change:

```typescript
  newCommitments: false, // §8
```

to:

```typescript
  newCommitments: true, // §8 — promoted to active route YYYY-MM-DD
```

(Insert the actual date.)

- [ ] **Step 2: Update the flag test assertion**

Open `__tests__/feature_flags.test.ts`, find the `toEqual({ ... })` block, change:

```typescript
    newCommitments: false, // §8
```

to:

```typescript
    newCommitments: true, // §8 — promoted to active route YYYY-MM-DD
```

(The `toMatchObject` block still lists all 4 keys — no change there.)

- [ ] **Step 3: Run full CI parity**

Run the full pre-push chain from Task 22 Step 3.
Expected: green, including `feature_flags.test.ts` asserting the new state.

- [ ] **Step 4: Commit + push + PR**

```bash
git checkout -b feat/section-8-promote
git add constants/feature_flags.ts __tests__/feature_flags.test.ts
git commit -m "$(cat <<'EOF'
feat(§8): promote Commitments V2 — flip newCommitments flag to true

Manual device QA passed (incl. the cross-currency pay balance check).
V2 becomes the active path. Cleanup PR (delete commitments_legacy,
restore route one-liner, drop flag) follows within 5 business days per
the feature-flag flip protocol in constants/feature_flags.ts header.
EOF
)"
git push -u origin feat/section-8-promote
gh pr create --title "feat(§8): promote Commitments V2 — flip newCommitments flag" --body "$(cat <<'EOF'
## Summary

Single-line flag flip promoting the §8 Commitments HeroUI rebrand to the active path. V1 (commitments_legacy) stays in the bundle until the cleanup PR.

## Test plan

- [x] Manual device QA matrix passed on Android — incl. cross-currency pay balance check (C-06).
- [x] CI parity chain green; feature_flags.test.ts asserts the new state.

## Follow-up

Cleanup PR opens within 5 business days: deletes commitments_legacy, restores the route one-liner, drops the flag.
EOF
)"
```

Escalate to the user for sign-off before merge (high blast radius).

---

## Task 25: 🛑 Cleanup PR — delete legacy dir, restore one-liner, drop flag (HIGH BLAST RADIUS — escalate)

**CRITICAL TRIGGER (CLAUDE.md item 3): V1 deletion. Escalate to the user.** Within 5 business days of the promotion merge, per the flag-flip protocol.

**Files:**
- Delete: `screens/commitments_legacy/` (entire holding directory)
- Modify: `app/(app)/(tabs)/commitments/index.tsx` (back to one-liner)
- Modify: `constants/feature_flags.ts` (remove `newCommitments`)
- Modify: `__tests__/feature_flags.test.ts` (remove `newCommitments`)

- [ ] **Step 1: Verify promotion is merged + locally synced**

Run:

```bash
git checkout main
git pull
git log -1 --oneline
```

Expected: top commit is the §8 promotion; working tree clean.

- [ ] **Step 2: Create the cleanup branch**

```bash
git checkout -b cleanup/section-8-v1-removal
```

- [ ] **Step 3: Delete the legacy holding directory**

```bash
rm -rf screens/commitments_legacy
```

- [ ] **Step 4: Restore the route one-liner**

Overwrite `app/(app)/(tabs)/commitments/index.tsx`:

```tsx
export { default } from '@/screens/commitments';
```

- [ ] **Step 5: Drop the feature flag**

Open `constants/feature_flags.ts`, delete the line:

```typescript
  newCommitments: true, // §8 — promoted to active route YYYY-MM-DD
```

Open `__tests__/feature_flags.test.ts`, remove `newCommitments` from BOTH the `toMatchObject` and `toEqual` blocks, and update the description string to note `newCommitments removed in §8`:

```typescript
  it('has all 3 remaining section flags (newDashboard/§5, newTransactions/§6, newAddTransaction/§7, newCommitments/§8 removed)', () => {
    expect(FeatureFlags).toMatchObject({
      newOnboarding: expect.any(Boolean),
      newSettings: expect.any(Boolean),
      newAccounts: expect.any(Boolean),
    });
  });

  it('matches the current migration state (forces deliberate test update on each flag flip)', () => {
    expect(FeatureFlags).toEqual({
      newOnboarding: false, // §2
      newSettings: false, // §4
      newAccounts: false, // §9
    });
  });
```

- [ ] **Step 6: Confirm no dangling references to the legacy dir**

Run:

```bash
grep -rn "commitments_legacy" . --include="*.ts" --include="*.tsx" || echo "no commitments_legacy references — clean"
```

Expected: `no commitments_legacy references — clean`.

- [ ] **Step 7: Run full CI parity**

Run the full pre-push chain from Task 22 Step 3.
Expected: green. Coverage thresholds met by the preserved logic suite + the pay-sheet hook test.

- [ ] **Step 8: Commit + push + PR**

```bash
git add -A
git commit -m "$(cat <<'EOF'
cleanup(§8): delete commitments_legacy, restore route one-liner, drop flag

V2 is now the only Commitments implementation. The legacy holding copy
is deleted; the route returns to a one-line re-export; newCommitments is
removed from FeatureFlags and the flag test. The react-native-actions-
sheet dep + patch + the §9 adjust_balance_sheet.tsx consumer remain —
§9 owns their removal.
EOF
)"
git push -u origin cleanup/section-8-v1-removal
gh pr create --title "cleanup(§8): remove commitments_legacy, restore one-liner, drop flag" --body "$(cat <<'EOF'
## Summary

Cleanup PR following §8 promotion. V2 is canonical at `screens/commitments/`; the legacy holding copy is deleted; the flag is removed.

## Files

- Deleted: `screens/commitments_legacy/` (V1 holding copy).
- Restored: `app/(app)/(tabs)/commitments/index.tsx` → one-line re-export.
- Removed: `newCommitments` from `feature_flags.ts` + `feature_flags.test.ts` (flag count down to 3).

## Test plan

- [x] CI parity chain green; coverage thresholds met.
- [x] No `commitments_legacy` references remain.
- [x] No `react-native-actions-sheet` import in `screens/commitments/`.

## Follow-up

§9 migrates `accounts/detail/adjust_balance_sheet.tsx` and removes the `react-native-actions-sheet` dep + patch (last consumer).
EOF
)"
```

Escalate to the user for sign-off before merge (high blast radius — V1 deletion).

---

## Self-Review

**1. Spec coverage (each §8 scope item → task):**

| Spec §1 item | Task(s) | Covered |
|---|---|---|
| 1. List screen rebrand (`<Screen>`, drop FAB) | 9 | ✅ |
| 2. CommitmentRow rewrite (Box/Text + Chip badge) | 4 | ✅ |
| 3. StatusFilterChips → HeroUI Chip | 5 | ✅ |
| 4. SummaryHeader rebrand (Card + gradient) | 6 | ✅ |
| 5. MonthNavigator rebrand | 7 | ✅ |
| 6. Empty state → §3 wrapper | 8 | ✅ |
| 7. Detail screen rebrand (hero/cycle/details/history) | 10, 11, 12, 13, 16 | ✅ |
| 8. PaySheet → declarative Sheet | 15 | ✅ |
| 9. Skip confirm → Sheet | 14 | ✅ |
| 10. Add/Edit form rebrand (full-screen route, OQ-1) | 17, 18, 19, 20, 21 | ✅ |
| 11. newCommitments flag retirement | 1, 24, 25 | ✅ |
| OQ-2 pay-date → date picker | 2, 15 | ✅ |
| OQ-3 skip/deactivate → Sheet | 14, 21 | ✅ |
| §4.6 DetailsCard on §7 DetailRow primitives | 12 | ✅ |
| §4.11 drop list press-scale anims | 3 | ✅ |
| §5 preserved invariants (C-01..C-11) | preserved logic tests (untouched) + Task 15 hook test | ✅ |
| §6.1 store/repo/DB/entities/compute_due_dates untouched | File Map "Untouched" + grep checks | ✅ |
| §7 Wave 1/2/3/4 cycle | 1–22 / 23 / 24 / 25 | ✅ |
| Migration mechanic: legacy holding dir | 1 (create), 25 (delete) | ✅ |
| Remove only commitments actions-sheet import; dep+patch stay | 15 (grep gate), 22 (CLAUDE.md) | ✅ |
| CLAUDE.md edit + §9 rebase note | 22 | ✅ |
| CI parity before every push | 22, 24, 25 (Step 3) | ✅ |

**No gaps.**

**2. Placeholder scan:** No `TBD`/`TODO`/`implement later`. Two tasks (19, 21) use a structured skeleton with explicit "fill from the PRESERVED handlers" instructions and a pointer to the legacy copy for the exact handler bodies — this is deliberate (the form body is 600 lines of mechanical port; reproducing it verbatim would bloat the plan without adding information, and the handlers are explicitly preserved-unchanged). Every other task ships complete code.

**3. Type/name consistency:**
- `usePaySheet` return shape: `setPaidDate`, `toggleRateOverride`, `state.rateOverride` defined in Task 15 Step 2, consumed in Task 15 Step 5, asserted in Task 15 Step 3 test — consistent.
- `PaySheetStateShape.rateOverride` + `setRateOverride` defined Task 15 Step 1, used Step 2 — consistent.
- `SkipConfirmSheet` (Task 14) ↔ imported in detail index (Task 16) — name matches.
- `DeactivateSheet` (Task 21) ↔ edit index (Task 21) — matches.
- `ExchangeRateRow` props (`value`/`onChange`/`overrideEnabled`/`onToggleOverride`/`rateUpdatedAt`/`amount`/`error`) match the §7 component signature read from source — consistent.
- `SaveCta` props (`saving`/`onPress`/`label`) match source — consistent.
- `DetailRow`/`DetailRowsCard` props (`icon`/`label`/`value`/`showDivider`) match source — consistent.
- `Sheet` props (`visible`/`onClose`/`title`/`size`/`footer`) + `Sheet.Body` + `SHEET_FOOTER_CLEARANCE` match source — consistent.
- `EmptyState` (`variant`/`onAction`, no `actionLabel`) matches source — Task 8 drops the legacy `actionLabel` accordingly.
- Flag key `newCommitments` consistent across Tasks 1, 24, 25 and the flag test.

**No inconsistencies.**

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-23-section-8-commitments.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — Sarah dispatches a fresh @dev subagent per task, two-stage review (spec compliance + code quality) between tasks. Tasks 4–8, 10–15, 17–18 are parallel-safe within their groups after Task 1 lands.

**2. Inline Execution** — Execute tasks in this session using `executing-plans`, batch execution with checkpoints.

**Which approach?**

> Reminder: Tasks 23 (device QA), 24 (flag flip), and 25 (V1 deletion) are critical triggers — escalate each to the user at execution time. Tasks 1–22 are routine; Tariq approves/merges on the user's behalf.
