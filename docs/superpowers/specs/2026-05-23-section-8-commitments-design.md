# Section 8 · Commitments — Design Spec

**Date:** 2026-05-23
**Status:** Draft — awaiting spec sign-off
**Owners:** [tariq] technical · [marcus] UX · [layla] financial · [sarah] sequencing
**Section:** 8 of 9 (Commitments) within the HeroUI Native migration initiative
**Branch:** `spec/section-8-commitments` (design) → `feat/section-8-commitments` (implementation)

**Cross-references:**

- §1 Foundation spec: `docs/superpowers/specs/2026-05-10-section-1-foundation-design.md`
- §3 Reusable Patterns spec: `docs/superpowers/specs/2026-05-12-section-3-reusable-patterns-design.md`
- §4 Settings spec: `docs/superpowers/specs/2026-05-12-section-4-settings-design.md`
- §5 Dashboard spec: `docs/superpowers/specs/2026-05-16-section-5-dashboard-design.md`
- §6 Transactions spec: `docs/superpowers/specs/2026-05-17-section-6-transactions-design.md`

---

## 1. Feature Summary

§8 migrates the entire **Commitments domain** from the legacy pattern (raw `StyleSheet.create`, `Colors.dark.*` tokens, raw RN components, zero HeroUI) to **HeroUI Native v1.0 + Unistyles 3 (via Uniwind) + Cairo Nights tokens**. It is the second-to-last section of the rebrand. The domain is presently 100% legacy — it has had no HeroUI exposure at all.

§8 is a **pure visual + structural rebrand. It changes no financial behaviour.** Every formula, status rule, due-date computation, and balance impact is a preserved invariant (see §5). The store (`store/commitment.store.ts`), repository (`repositories/commitment.repository.ts`), DB query files (`database/commitments.ts`, `database/commitment_payments.ts`), entities, and the `utils/compute_due_dates.ts` helper are **not touched** by §8 — only the `screens/commitments/**` UI tree and the route file change.

The headline technical change is the **legacy sheet migration**: `pay_sheet.tsx` moves from the imperative `react-native-actions-sheet` (`.show()`/`.hide()` via ref) to the declarative `Sheet` from `components/ui/sheet.tsx`, copying the §7 `AddTransactionSheet` form-in-sheet pattern. This retires the commitments-domain `react-native-actions-sheet` consumer. The dependency + patch removal itself is **owned by §9** (Accounts is the last consumer, `adjust_balance_sheet.tsx`); §8 only migrates its own consumer and must not delete the dep or patch.

**What ships in §8:**

1. **List screen rebrand** (`screens/commitments/index.tsx`). Same IA — Header, MonthNavigator, SummaryHeader, StatusFilterChips, status-grouped `SectionList`. Lifted to `<Screen edges={['top']}>`. The in-screen `Pressable` FAB is **removed** — the global tab FAB (built in §3, owned by `app/(app)/(tabs)/_layout.tsx`) owns Add Commitment, matching the §5/§6 decision that screens never mount their own FAB.
2. **`CommitmentRow` rewrite** — composed from `Box`/`Text` + HeroUI `Chip` for the status badge. Preserves the icon · title · due-date · signed-amount · status-badge layout. Drops the per-row Reanimated press-scale (replaced by HeroUI `Pressable` press feedback) unless QA shows a regression.
3. **`StatusFilterChips` → HeroUI `Chip` row.** Retires the custom Reanimated `interpolateColor` chip implementation (the §5 SegmentSwitcher lesson — no parallel implementations when a HeroUI primitive fits). Single-select, horizontal scroll, `All / Overdue / Due / Upcoming / Paid / Skipped`.
4. **`SummaryHeader` rebrand** — preserves the gradient progress card (totals-by-currency line, paid/total % badge, gradient progress bar, 5-stat row). Re-skinned to HeroUI `Card` + Cairo Nights tokens; gradient stays via `expo-linear-gradient` reading `GoldTokens`/`CoreTokens` from `theme_tokens`.
5. **`MonthNavigator` rebrand** — chevron-prev / month-label / chevron-next, lifted to HeroUI primitives.
6. **Empty state** — already consumes the shared `<EmptyState variant="commitments" />`; switches from the legacy `components/empty_states` import to `@/components/ui/empty_state` (the §3 HeroUI wrapper), matching §6.
7. **Detail screen rebrand** (`screens/commitments/detail/`). V1 vertical stack preserved: Header → DetailHero → CurrentCycleCard → DetailsCard → PaymentHistory. Hero gradient/grid/glow preserved verbatim (matches §5 HeroCard). `DetailsCard` rebuilt on the §7 `DetailRow` + `DetailRowsCard` primitives. `CurrentCycleCard` actions → HeroUI `Button` (gold gradient primary + ghost secondary). `PaymentRow`/`PaymentHistory` re-skinned.
8. **Pay flow migration — `PaySheet` → declarative `Sheet`.** Replaces `react-native-actions-sheet` with `Sheet` from `components/ui/sheet.tsx`. Copies the §7 `AddTransactionSheet` pattern: `Sheet.Body` + sticky-footer CTA, declarative `visible`/`onClose`, nested `AccountPickerSheet` (already migrated, reused as-is), `ExchangeRateRow` V2 (already migrated, reused as-is). All inputs become HeroUI `Input`. **No financial logic changes** — same `usePaySheet` hook wiring, same `markAsPaid` call.
9. **Skip confirm → `Sheet` confirm.** The raw RN `Modal` (`skip_confirm_dialog.tsx`) becomes a `Sheet` (`size="sm"`) confirm, consistent with the app's current destructive-confirm pattern. (See §11 open question OQ-3 for the alternative.)
10. **Add / Edit commitment form rebrand.** `commitment_form_body.tsx`, `recurrence_picker.tsx`, `duration_picker.tsx`, `decimal_amount_input.tsx`, and the add/edit screens lifted to HeroUI primitives (`Input`, `Chip`, `Button`) + `<Screen>` + sticky-footer CTA. The custom `DecimalAmountInput` and the `@react-native-community/datetimepicker` date pickers are preserved (no HeroUI equivalent). The `deactivate_dialog.tsx` becomes a `Sheet` confirm (same treatment as the skip dialog). **Pending OQ-1: full-screen route vs `Sheet`** — see §11.
11. **`newCommitments` flag retirement.** §1 added `newCommitments: false` in `constants/feature_flags.ts`. §8 ships the new tree behind it, flips it on after manual QA, then removes the flag and the V1 branch per the established cycle.

**What does NOT ship in §8 (explicit out-of-scope):**

- **Any financial-logic change.** Cycles, statuses, due-date generation, fixed/variable handling, multi-currency conversion, balance impact, auto-deactivation — all preserved byte-for-byte (§5). This is a UI rebrand, not a behaviour change.
- **`react-native-actions-sheet` dependency + patch removal.** Owned by §9 (last consumer). §8 removes only its own import in `pay_sheet.tsx`.
- **Store / repository / DB / entity changes.** `store/commitment.store.ts`, `repositories/commitment.repository.ts`, `database/commitments.ts`, `database/commitment_payments.ts`, both entities, and `utils/compute_due_dates.ts` are untouched.
- **New schema / migrations.** No DDL. No new columns.
- **Commitments-on-Dashboard card.** The §5 `CommitmentsCard` already shipped on the dashboard; §8 does not touch it (it reads the same store).
- **Notifications / reminders for due payments.** Future surface.
- **Edit-payment (changing a recorded payment after the fact).** Not in V1; not added in §8.
- **Bulk pay / pay-all-due.** Future surface.
- **Partial payments.** V1 records a single full payment per cycle; preserved.

---

## 2. Deviations from §1 Foundation

§1 prescribed §8 as the Commitments domain rebrand (list · detail · add/edit · pay/skip flows) within the 9-section vertical-slice plan.

| §1 prescription | §8 actual | Rationale (recorded for audit) |
|---|---|---|
| Rebrand Commitments to HeroUI | Same surfaces, IA preserved, sheets migrated to declarative `Sheet` | The V1 IA is already strong (status-grouped list, vertical detail stack). §8 lifts rather than re-architects. |
| FAB owned by tab layout (§3) | List screen drops its in-screen `Pressable` FAB; relies on the global tab FAB | §3 owns the FAB primitive; §5/§6 already removed in-screen FABs. §8 follows suit. The §3 FAB long-press mini-menu includes "Add Commitment". |
| Build-in-place vs `_v2` directory split | §8 builds **in place** under `screens/commitments/` behind the flag, mirroring §6/§7 | §6 abandoned the `_v2` directory split mid-flight (the `*_v2` dirs were cleaned up; only `onboarding_v2` remains). The route file flag-branch + in-place rebuild is the current, proven pattern. See §7 for the migration mechanics. |

No financial commitments from §1 are altered. The §3 `Sheet`, §7 `AccountPickerSheet`, `ExchangeRateRow`, `DetailRow`/`DetailRowsCard` primitives are consumed unchanged.

---

## 3. Information Architecture

### 3.1 Screen anatomy — List

```
CommitmentsScreen  (screens/commitments/index.tsx)
│
├── <Screen edges={['top']}>                          (full-screen wrapper, bg-background)
│   ├── Header (in-flow)
│   │   └── Title "Commitments"
│   │
│   ├── SectionList                                   (status-grouped, sticky headers)
│   │   ├── ListHeaderComponent:
│   │   │   ├── MonthNavigator        (‹ Month YYYY ›)
│   │   │   ├── SummaryHeader         (totals-by-currency · % paid · progress bar · 5 stats)
│   │   │   └── StatusFilterChips     ([All] [Overdue] [Due] [Upcoming] [Paid] [Skipped])
│   │   ├── renderSectionHeader → DateHeader (status group title)
│   │   └── renderItem → CommitmentRow
│   │
│   └── (empty) → <EmptyState variant="commitments" onAction={goToAdd} />
│
└── (Global FAB — rendered by app/(app)/(tabs)/_layout.tsx, outside this screen)
```

Route file `app/(app)/(tabs)/commitments/index.tsx` becomes a flag-branch component during the build wave (same pattern §5/§6 used):

```tsx
import { FeatureFlags } from '@/constants/feature_flags';
import CommitmentsScreenV1 from '@/screens/commitments_legacy';   // temporary alias — see §7
import CommitmentsScreenV2 from '@/screens/commitments';

export default function CommitmentsRoute() {
  return FeatureFlags.newCommitments ? <CommitmentsScreenV2 /> : <CommitmentsScreenV1 />;
}
```

> **In-place build mechanic (§7):** because §6/§7 build in place rather than in a `_v2` directory, the V1 tree is preserved by copying it to a sibling holding directory (`screens/commitments_legacy/`) for the duration of the build/QA waves, while the HeroUI rebuild lands in `screens/commitments/`. The flag branch points the OFF path at the legacy copy. At cleanup, the legacy copy is deleted and the route returns to its one-liner re-export. @dev confirms the exact holding-directory name in the plan; the principle (one path V1, one path V2, flag selects) is fixed.

### 3.2 Screen anatomy — Detail

```
CommitmentDetailScreen  (screens/commitments/detail/index.tsx)
│
├── <Screen edges={['top', 'bottom']}>
│   ├── Header (in-flow)
│   │   ├── BackButton  → router.back()
│   │   ├── Title (commitment name, centered)
│   │   └── Edit link (gold)  → /commitments/<id>/edit   (only when viewState === 'ready')
│   │
│   ├── viewState === 'loading' → <ActivityIndicator/>
│   ├── viewState === 'notFound' → centered "Commitment not found"
│   └── viewState === 'ready' → <ScreenScroll>
│       ├── DetailHero            (gradient · grid · glow · icon · name · amount · meta)
│       ├── CurrentCycleCard      (amount · due date · status badge · [Mark as Paid][Skip])  — only when state.payment exists
│       ├── DetailsCard           (Recurrence · Start Date · Default Account · Duration · Currency · Notes)
│       └── PaymentHistory        (per-cycle rows · status dot · month · status · amount)
│
├── PaySheet (overlay — declarative Sheet)            ← MIGRATED from react-native-actions-sheet
│   └── nested AccountPickerSheet (§7, reused)
└── SkipConfirmSheet (overlay — Sheet size="sm")       ← MIGRATED from RN Modal
```

### 3.3 Screen anatomy — Add / Edit form

```
AddCommitmentScreen / EditCommitmentScreen
│
├── <Screen edges={['top', 'bottom']}>
│   ├── Header (BackButton · title · spacer)
│   ├── <ScreenScroll> (or KeyboardAvoiding equivalent — see §6.5)
│   │   ├── Name (Input)
│   │   ├── Amount Type (Chip row: Fixed / Variable)
│   │   ├── Amount (DecimalAmountInput) + Currency (Chip row: EGP / USD)
│   │   ├── Category (picker row → CategoryPickerSheet §7)
│   │   ├── RecurrencePicker (preset chips + custom every/period)
│   │   ├── Start Date (picker row → DateTimePicker)
│   │   ├── Default Account (picker row → AccountPickerSheet §7) [optional]
│   │   ├── DurationPicker (Forever / After N / Until date + conditional inputs)
│   │   └── Notes (Input multiline) [optional]
│   ├── Footer: gold-gradient CTA ("Save Commitment")
│   └── (Edit only) Deactivate link  → SkipConfirmSheet-style Sheet confirm
│
├── CategoryPickerSheet (§7, reused)
└── AccountPickerSheet (§7, reused)
```

> **OQ-1:** whether the Add/Edit form stays a full-screen route (as above) or moves into a `Sheet` like §7's Add Transaction. Recorded for sign-off (§11). The anatomy above assumes full-screen-route (status-quo IA). If sign-off chooses `Sheet`, the form body is unchanged but the wrapper, navigation, and route wiring differ — flagged because it is a genuine IA fork that binds the plan.

### 3.4 Empty state

When the selected month has zero payments (`commitmentState.payments.length === 0`):

- `MonthNavigator`, `SummaryHeader`, and `StatusFilterChips` are part of the `SectionList` `ListHeaderComponent` in V1; in V2 the empty state renders **in place of the SectionList body** (the list-header stack is not shown when there are zero payments, matching V1's `isEmpty` branch which short-circuits the whole list).
- `<EmptyState variant="commitments" onAction={goToAdd} />` — full-screen, centred.
- The global FAB remains visible (owned by tab layout). Tapping it routes to Add Commitment.

> Behaviour note: V1's empty branch hides the month navigator entirely (you cannot scrub months when empty). §8 preserves this. This is a deliberate carry-over, not a regression.

---

## 4. Product & UX ([marcus])

### 4.1 List row template (`CommitmentRow`)

Three regions, lifted to `Box`/`Text` + HeroUI `Chip`. Layout preserved from V1 (min-height ~48px).

**Icon (left, flex-shrink: 0):**

- 36×36 rounded-`sm` square. Category icon tinted with category color over a `${category.color}2E` tint background (runtime hex → `style={{ backgroundColor }}`, per CLAUDE.md runtime-hex rule). Fallback `tag-outline` over `bg-default` when category is missing.

**Center (flex 1, min-width: 0):**

| Row | Content | Type |
|---|---|---|
| 1 | Commitment name (fallback `—`) | Sora 500, `text-foreground`, 1 line |
| 2 | Due date (`formatShortDate(payment.due_date)`) | Inter regular, `text-muted`, 1 line |

**Right (shrink-0, align-end):**

| Row | Content | Type | Conditional |
|---|---|---|---|
| 1 | Signed amount + currency code | Sora 700, `text-foreground` | `~` prefix when Variable && not Paid; amount via `Intl.NumberFormat('en-US', {style:'decimal'})`; `—` when amount null |
| 2 | Status badge | HeroUI `Chip` (status color tint) | Always — icon + label per status |

**Status color map (preserved from V1, sourced from `theme_tokens`):**

| Status | Color slot | Icon |
|---|---|---|
| Overdue | `danger` / negative | `alert-circle` |
| Due | gold | `clock-outline` |
| Upcoming | `muted` / text2 | `calendar-clock` |
| Paid | positive | `check-circle` |
| Skipped | text3 | `minus-circle` |

The `MaterialCommunityIcons` color prop reads from `theme_tokens` (module-level, cannot use the hook), per CLAUDE.md styling rule.

### 4.2 StatusFilterChips → HeroUI `Chip`

Single-select horizontal `Chip` row. Active chip = gold fill on midnight-blue text; inactive = `bg-surface` on `text-muted` with `border-border`. Retires the custom Reanimated `interpolateColor`/`useChipPressScale` chip. The chip set: `All`, `Overdue`, `Due`, `Upcoming`, `Paid`, `Skipped`, mapping to `CommitmentStatusFilter = 'all' | CommitmentPaymentStatus`. Selection narrows the visible status sections (the `sections` memo in `commitments.hook.ts` already does this — unchanged).

### 4.3 SummaryHeader (rebrand, behaviour preserved)

HeroUI `Card` (`bg-surface`, `border-border`). Content unchanged from V1:

- **Hero row:** "Total committed" label (uppercase `text-muted`) + totals-by-currency line (e.g. `12,500 EGP · 250 USD`) + paid-% badge (gold pill).
- **Progress bar:** gold gradient fill, width = `progressPct%`. Gradient via `expo-linear-gradient` with `GoldTokens`.
- **5-stat row:** paid (positive · check) · overdue (negative · alert) · due (gold · clock) · upcoming (muted · calendar) · skipped (text3 · minus). Each is an icon + count.

`progressPct = round(paid / total * 100)` where `total` excludes skipped (preserved — see §5).

### 4.4 Detail hero (preserved)

The V1 `DetailHero` gradient (`heroGrad1/2/3`), grid texture (SVG pattern), gold glow, category-tinted icon box, commitment name (Sora extra-bold), amount, and meta line (`category · recurrence`) are **preserved verbatim** — they already match Cairo Nights and the §5 HeroCard. Only token sourcing changes (hex literals → `theme_tokens`/className where possible; the SVG pattern `stroke="#FFFFFF"` opacity-0.02 grid stays as an inline literal because SVG props are not className-able — same exception §5/§6 took).

Amount display logic preserved exactly:
- Paid → `amount_paid ?? amount_due ?? commitment.amount`
- Not paid → `amount_due ?? commitment.amount`
- Variable && not paid → `~` prefix; null → "Variable" literal.

### 4.5 CurrentCycleCard (rebrand)

HeroUI `Card` with a status-colored left border (preserved). Header row: amount text (with `~` for variable-unpaid) + due date sublabel + status `Chip`. When the payment is actionable (status ∉ {paid, skipped}):

- **Mark as Paid** → HeroUI `Button` variant primary, gold gradient on midnight-blue text → opens `PaySheet`.
- **Skip** → HeroUI `Button` variant ghost / tertiary, `text-muted` → opens `SkipConfirmSheet`.

Retires the custom `Pressable` + `LinearGradient` CTA in favour of the HeroUI `Button` (the §5 lesson). Gold gradient achieved per the project Button wrapper / `tv` variant.

### 4.6 DetailsCard → §7 `DetailRow` / `DetailRowsCard`

Rebuilt on the existing §7 primitives (`screens/transactions/detail/components/detail_row.tsx`, `detail_rows_card.tsx`) — **do not rebuild a parallel row component.** Rows (preserved from V1, same order):

1. `repeat` · "Recurrence" · recurrence label
2. `calendar-start` · "Start Date" · `formatLongDate(start_date)`
3. `bank-outline` · "Default Account" · account name or "None"
4. `timer-sand` · "Duration" · duration label
5. `currency-usd` · "Currency" · currency code
6. (conditional) `text` · "Notes" · notes — only when `notes != null`

`showDivider=false` on the last visible row (matches the §7 `DetailRow` divider rule).

> If the existing §7 `DetailRow` API does not cover a needed field shape, **compose/extend it** rather than fork — per CLAUDE.md "compose over parallel implementation."

### 4.7 PaymentHistory / PaymentRow (rebrand)

HeroUI `Card` wrapper, `BottomSheetFlatList` not needed (it is in the scroll body, not a sheet — keep the V1 `FlatList` `scrollEnabled={false}` inside the `ScreenScroll`). Each `PaymentRow`: status dot (runtime hex `style`) · month-year label · status label (status color) · amount (right). Behaviour preserved: `amount_paid ?? amount_due ?? commitment.amount`, `—` when null. Renders nothing when there are zero payments.

### 4.8 PaySheet (migrated to declarative `Sheet`)

The pay flow is the section's headline UX change. Target: copy §7 `AddTransactionSheet` exactly.

```tsx
<Sheet
  visible={state.visible}
  onClose={close}
  title={Strings.commitmentsPayTitle(commitment.name)}
  size="lg"
  footer={
    <SaveCta
      saving={state.saving}
      onPress={() => void onSubmit()}
      label={Strings.commitmentsPayConfirm}
    />
  }
>
  <Sheet.Body>
    {/* form fields — see below */}
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
```

Form body (HeroUI primitives, behaviour preserved):

- **Sub-header line:** `due_date · currency · Fixed|Variable`.
- **Amount** — HeroUI `Input` (decimal-pad) + currency chip suffix. Pre-filled by `usePaySheet` (fixed → `amount_due ?? commitment.amount`; variable → blank).
- **Pay-from account** — picker row → `AccountPickerSheet` (§7, reused unchanged).
- **Exchange rate** (conditional, when `requiresRate`) — `ExchangeRateRow` (§7 V2, reused unchanged). Shows live EGP preview + stale-rate warning.
- **Converted total** (conditional) — `= amount × rate <accountCurrency>`.
- **Date** — `Input` (the V1 free-text date input is preserved; OQ-2 asks whether to upgrade to a date picker).
- **Notes** — `Input` multiline, optional.
- **CTA** — sticky footer `SaveCta` (the §7 footer component), disabled while saving or when the payment is already paid/skipped.

Scrollable content inside the sheet **must use `BottomSheetScrollView`** from `@gorhom/bottom-sheet` (CLAUDE.md sheet rule), not RN `ScrollView` — the V1 used `react-native-actions-sheet`'s own `ScrollView`, which is being removed.

The `usePaySheet` hook (form schema, prefill logic, `markAsPaid` call, account selection) is **preserved as-is** — only the imperative `sheetRef.current?.show()/.hide()` `useEffect` is deleted (the declarative `visible` prop replaces it).

### 4.9 SkipConfirmSheet (migrated from RN Modal)

`Sheet` (`size="sm"`), title "Skip this payment?", body copy preserved (`commitmentsSkipConfirmBody`), two buttons: Cancel (ghost) + Skip Payment (destructive). Replaces the raw `Modal`. Same `confirmSkip`/`skipPayment`/`cancelSkip` wiring from `detail.hook.ts`.

### 4.10 Add / Edit form (rebrand)

Lift the form body to HeroUI:

- **Text fields** (Name, Notes) → HeroUI `Input`.
- **Toggle groups** (Amount Type, Currency, Recurrence presets, Recurrence period, Duration type) → HeroUI `Chip` rows. Retires the custom `Pressable` + `chipActive` styling.
- **CTA** → gold-gradient HeroUI `Button` in a sticky footer (matching §7).
- **Pickers** (Category, Default Account) → existing §7 `CategoryPickerSheet` / `AccountPickerSheet` (already migrated, reused).
- **Preserved as-is:** `DecimalAmountInput` (numeric masking, no HeroUI equivalent), `@react-native-community/datetimepicker` for start/end dates (Android `DateTimePickerAndroid.open` modal + iOS inline spinner — preserved exactly; this is already a dev-client native dep, not a new dependency).
- **Deactivate** (edit only) → `Sheet` confirm (same treatment as SkipConfirmSheet), replacing `deactivate_dialog.tsx`'s RN Modal.

The `commitment_form.shared.ts` Zod schema, defaults builders, and preset/duration logic are **preserved unchanged** (form validation is financial-adjacent and already correct).

### 4.11 Animations

V1 detail entrance animations (`heroEntering` FadeInDown, `cardEntering` FadeInUp delay-150, `historyEntering` FadeInUp delay-250) are preserved in `detail.anim.ts`. List row press-scale (`useRowPressScale`) and chip pop (`useChipPressScale`) in `commitments.anim.ts` are dropped where the HeroUI primitive (`Pressable`, `Chip`) provides its own press feedback; kept only if QA shows a perceptible regression. Reanimated stays the animation engine.

---

## 5. Financial Logic ([layla]) — Preserved Invariants

§8 introduces **no new financial primitives.** The following are the existing behaviours that must be preserved byte-for-byte. They are documented here with worked examples and test cases so the rebrand cannot accidentally regress them. The implementing engineer ports the existing tests forward unchanged and adds the cases below if missing.

### 5.1 Cycle / due-date generation (`utils/compute_due_dates.ts` — untouched)

Generates due dates from `start_date` by `(recurrence_every, recurrence_period)`, capped at `maxCount = 64`, bounded by `duration_type`:

- `Days` / `Weeks` — UTC day arithmetic.
- `Months` — month arithmetic with **month-end clamping**: day = `min(startDay, daysInMonth(y, m))`.
- `Years` — year arithmetic, same clamping for Feb 29.
- `Forever` → up to `maxCount`. `AfterCount` → `min(endAfterCount, maxCount)`. `UntilDate` → stop when `date > endDate`.

**Worked example (month-end clamp):**

```
start_date: 2026-01-31, every 1 Month, Forever
→ 2026-01-31, 2026-02-28, 2026-03-31, 2026-04-30, 2026-05-31, …
(Feb clamps to 28; Apr clamps to 30)
```

**Worked example (after-count):**

```
start_date: 2026-03-01, every 1 Month, AfterCount endAfterCount=3
→ 2026-03-01, 2026-04-01, 2026-05-01  (exactly 3)
```

### 5.2 Payment status lifecycle

Status is assigned at **generation time** (in `makePayments`, store) and on status-change — it is **not** live-recomputed on every render:

```
due_date <  today  → 'overdue'
due_date == today  → 'due'
due_date >  today  → 'upcoming'
markAsPaid         → 'paid'    (terminal)
skip               → 'skipped' (terminal)
```

The detail screen's "current payment" picks the first of `[Overdue, Due, Upcoming]` (priority order) from the commitment's full payment list (`findCurrentPayment` — preserved).

### 5.3 Fixed vs Variable amounts

- **Fixed:** `amount` is set; pay sheet pre-fills `amount_due ?? commitment.amount`.
- **Variable:** `amount` may be null; UI shows `~estimate` or "Variable" literal; pay sheet leaves the amount blank for the user to enter the actual paid figure.
- The `~` tilde renders only when `amount_type === Variable && status !== Paid`. Once paid, the actual `amount_paid` shows with no tilde. Preserved in hero, row, and cycle card.

### 5.4 Multi-currency payment + exchange-rate snapshot (the bug-magnet)

When the **pay-from account currency ≠ commitment currency**, the user supplies an exchange rate. `markCommitmentAsPaid` (DB, untouched) runs a 4-step atomic transaction:

1. `UPDATE commitment_payments`: status='paid', `paid_date`, `amount_paid`, `account_id`, `exchange_rate_snapshot`, `notes`.
2. `INSERT transactions`: type='expense', `amount = amount_paid` (commitment-currency face value), `egp_amount = amount_paid × exchange_rate_snapshot` (or `amount_paid` for same-currency), `commitment_payment_id` link.
3. `UPDATE accounts`: `current_balance = current_balance − tx.egp_amount` — **deduct the account-currency equivalent, NOT the foreign face value.**
4. `UPDATE commitment_payments`: set `transaction_id = tx.id`.

**Worked example (USD commitment paid from EGP account):**

```
Commitment: Netflix, currency USD, amount 15.00 (Fixed)
Pay-from: CIB (EGP account), balance 50,000 EGP
User enters rate: 48.85

Transaction row:
  amount       = 15.00      (USD face value — what was owed)
  currency     = USD
  exchange_rate / snapshot = 48.85
  egp_amount   = 15.00 × 48.85 = 732.75

Account balance:
  CIB: 50,000 − 732.75 = 49,267.25 EGP   ← deducts egp_amount, NOT 15
```

> If the rebrand ever deducts `tx.amount` (15) instead of `tx.egp_amount` (732.75), the EGP account would be off by 50×. The repository preserves the correct behaviour; the spec carries this example so any reviewer can spot a regression.

**Worked example (same-currency, no rate):**

```
Commitment: Rent, currency EGP, amount 8,000 (Fixed)
Pay-from: CIB (EGP), balance 49,267.25
No rate (currencies match) → exchange_rate_snapshot = null
  egp_amount = amount_paid = 8,000
Account: 49,267.25 − 8,000 = 41,267.25 EGP
```

### 5.5 Skip + auto-deactivation

- **Skip:** sets status='skipped' + `skipped_date`. **Touches no account balance, creates no transaction.** Skipped payments are excluded from totals and from the paid/total denominator.
- **Auto-deactivation** (`checkAndDeactivateExpired`, runs after each pay): `AfterCount` → deactivate when `paidCount >= end_after_count`; `UntilDate` → deactivate when `today > end_date`. Preserved.

### 5.6 Totals + progress (list `SummaryHeader`)

`totalsByCurrency` (preserved):

```
for each payment p (excluding skipped):
  value = (p.status === Paid) ? (p.amount_paid ?? p.amount_due) : p.amount_due
  if value != null: totals[p.currency] += value
```

`progress` (preserved): `paidCount / totalCount` where `totalCount = paid + overdue + due + upcoming` (excludes skipped).

### 5.7 Test cases ([layla] — port existing, add any missing)

| ID | Scope | Input | Expected |
|---|---|---|---|
| C-01 | due dates | start 2026-01-31, monthly, forever | Feb clamps to 28, Apr to 30 |
| C-02 | due dates | start 2026-03-01, monthly, after_count 3 | exactly 3 dates |
| C-03 | due dates | start 2024-02-29, yearly | 2024-02-29, 2025-02-28, … (leap clamp) |
| C-04 | status | due_date yesterday | 'overdue' |
| C-05 | status | due_date today | 'due' |
| C-06 | pay (cross-currency) | USD 15 commitment, EGP account, rate 48.85 | egp_amount 732.75, account −732.75 |
| C-07 | pay (same-currency) | EGP 8,000, EGP account, no rate | egp_amount 8,000, account −8,000 |
| C-08 | skip | any payment | status skipped, account unchanged, no tx |
| C-09 | auto-deactivate | after_count 3, 3rd payment paid | commitment is_active → 0 |
| C-10 | totals | mixed currencies, 1 skipped | skipped excluded; per-currency sums correct |
| C-11 | progress | 2 paid / 5 total (1 skipped of 6) | round(2/5×100) = 40% |

These are **logic-layer tests** (helpers, store, repository), not UI render tests — per the project's logic-only test philosophy (§8 Testing Strategy below). Most already exist; the rebrand must keep them green.

---

## 6. Technical Architecture ([tariq])

### 6.1 File map

The UI tree under `screens/commitments/**` is rebuilt in place. The store, repository, DB, entities, and `compute_due_dates` are untouched.

**Rebuilt (HeroUI):**

```
screens/commitments/
├── index.tsx                       — <Screen>, HeroUI, no in-screen FAB
├── commitments.hook.ts             — PRESERVED (data wiring) — verify no StyleSheet refs leak
├── commitments.state.ts            — PRESERVED (refreshing + statusFilter)
├── commitments.anim.ts             — pruned (row/chip press-scale dropped if unused)
├── commitment_form.shared.ts       — PRESERVED (Zod schema, defaults, presets)
└── components/
    ├── commitment_row.tsx          — REWRITE (Box/Text/Chip)
    ├── summary_header.tsx          — REWRITE (Card, gradient via theme_tokens)
    ├── month_navigator.tsx         — REWRITE (HeroUI primitives)
    ├── status_filter_chips.tsx     — REWRITE (HeroUI Chip)
    ├── empty_state.tsx             — REWIRE to @/components/ui/empty_state
    ├── commitment_form_body.tsx    — REWRITE (Input/Chip/Button)
    ├── commitment_form_body.state.ts — PRESERVED (picker visibility UI state)
    ├── recurrence_picker.tsx       — REWRITE (Chip)
    ├── duration_picker.tsx         — REWRITE (Chip) — keep DateTimePicker
    ├── decimal_amount_input.tsx    — PRESERVED (numeric mask)
    └── decimal_amount_input.state.ts — PRESERVED

screens/commitments/detail/
├── index.tsx                       — <Screen> + <ScreenScroll>, HeroUI header
├── detail.hook.ts                  — PRESERVED (verify imports)
├── detail.state.ts                 — PRESERVED (skip-confirm + screen-data stores)
├── detail.anim.ts                  — PRESERVED (entrance animations)
└── components/
    ├── detail_hero.tsx             — REWRITE (gradient/grid/glow preserved; tokens)
    ├── current_cycle_card.tsx      — REWRITE (Card + Button)
    ├── details_card.tsx            — REWRITE on §7 DetailRow / DetailRowsCard
    ├── payment_history.tsx         — REWRITE (Card)
    ├── payment_row.tsx             — REWRITE (Box/Text)
    ├── pay_sheet.tsx               — MIGRATE to Sheet (declarative)  ← headline
    ├── pay_sheet.hook.ts           — PRESERVED (delete only the .show()/.hide() useEffect)
    ├── pay_sheet.state.ts          — PRESERVED (visible/saving/accountPickerVisible)
    └── skip_confirm_dialog.tsx     — MIGRATE to Sheet (size="sm")  → consider rename to skip_confirm_sheet.tsx

screens/commitments/add_commitment/   — REWRITE wrapper (<Screen>) + reuse form body
screens/commitments/edit_commitment/  — REWRITE wrapper + deactivate → Sheet confirm

constants/feature_flags.ts             — newCommitments stays false through build; flip in promotion commit
constants/strings.ts                   — extend if new copy needed (see §9)
app/(app)/(tabs)/commitments/index.tsx — flag-branch during build; one-liner at cleanup
```

**Untouched (must not change):**

```
store/commitment.store.ts
repositories/commitment.repository.ts
database/commitments.ts
database/commitment_payments.ts
database/entities/commitment.entity.ts
database/entities/commitment_payment.entity.ts
utils/compute_due_dates.ts
```

### 6.2 Store / state shape

No store/state shape changes. `commitments.state.ts` (refreshing + statusFilter), `detail.state.ts` (skip-confirm UI store + screen-data store), `pay_sheet.state.ts` (visible/saving/accountPickerVisible), and `commitment_form_body.state.ts` (picker visibility) all keep their current `{ state: {...}, ...flat setters, reset }` shape per CLAUDE.md. The domain store (`store/commitment.store.ts`) is untouched.

### 6.3 PaySheet migration mechanics

V1 drives the sheet imperatively:

```tsx
// DELETE this — replaced by declarative <Sheet visible={state.visible} ...>
useEffect(() => {
  if (state.visible) sheetRef.current?.show();
  else sheetRef.current?.hide();
}, [state.visible]);
```

V2 mirrors §7 `AddTransactionSheet`: `<Sheet visible={state.visible} onClose={...} footer={<SaveCta .../>}>`. The `usePaySheet` hook's `setVisible` already exists; the detail screen opens via `usePaySheetState.getState().setVisible(true)` (preserved) and closes via `onClose`. The nested `AccountPickerSheet` is the §7 component, already declarative — reused with no change. Sheet stacking depth = 2 (PaySheet → AccountPickerSheet), within the `Sheet` primitive's documented max.

Scrollable body switches to `BottomSheetScrollView` (from `@gorhom/bottom-sheet`). Footer uses the §7 `SaveCta` (already a sticky-footer CTA component) or an inline gold `Button` — @dev picks the closest existing component; do not build a new CTA.

### 6.4 Routing

No route-tree changes (OQ-1 pending). Routes stay:

- `app/(app)/(tabs)/commitments/index.tsx` → list (flag-branch during build, one-liner at cleanup)
- `app/(app)/(tabs)/commitments/[id]/index.tsx` → detail (one-liner, unchanged)
- `app/(app)/(tabs)/commitments/[id]/edit/index.tsx` → edit (unchanged)
- `app/(app)/(tabs)/commitments/add/index.tsx` → add (unchanged)
- `app/(app)/(tabs)/commitments/_layout.tsx` → Stack (unchanged)

The `_layout.tsx` `contentStyle` background uses `Colors.dark.bg`; keep it (module-level color from `theme_tokens` is fine here — this is the §5/§6 precedent).

### 6.5 Keyboard handling in forms

V1's `commitment_form_body.tsx` uses `KeyboardAvoidingView`. V2 keeps keyboard handling but inside `<Screen>` + `<ScreenScroll>` (the project full-screen wrappers). If the full-screen form needs keyboard avoidance the `ScreenScroll` + `keyboardShouldPersistTaps="handled"` covers it; @dev validates on Android. If OQ-1 chooses a `Sheet`, the `Sheet` primitive's `keyboardBehavior="interactive"` handles it (as §7 proved).

### 6.6 Performance

- `SectionList` renderer preserved (already performant for the small commitments dataset). No FlashList migration.
- Detail screen reads from the store + one repo call (`getPaymentsByCommitment`) — unchanged.
- HeroUI `Chip`/`Card` are build-time-composed via Uniwind (no runtime style cost beyond RN baseline).
- Cold-start budget (<2s mid-range Android) unaffected — no new deps, no new native code.

### 6.7 Accessibility

- Status chips: `accessibilityRole="button"`, `accessibilityState={{ selected }}`, label = status name.
- CommitmentRow: `accessibilityRole="button"`, label = `"<name>, <amount> <currency>, <status>"`.
- PaySheet CTA, AccountPicker rows, Skip/Deactivate confirms: labelled buttons (reuse §7 a11y patterns).
- Touch targets ≥44px (CTA height token `Size.ctaHeight` = 52).

### 6.8 Risks & mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| PaySheet migration changes pay behaviour (esp. cross-currency balance deduction) | Low | **High** | `usePaySheet` + `markAsPaid` + repository untouched; only the sheet wrapper changes. C-06/C-07 logic tests guard the math. Manual QA pays a USD commitment from an EGP account and verifies balance. |
| In-place build holding-directory (`commitments_legacy`) collides with imports | Medium | Medium | One isolated commit creates the copy; flag-branch points OFF path at it. Grep imports before/after. Deleted at cleanup. @dev confirms name in plan. |
| Dropping row/chip press-scale animations feels less responsive | Low | Low | HeroUI `Pressable`/`Chip` ship press feedback. Re-add Reanimated press-scale only if QA flags it. |
| HeroUI `Chip` single-select row scroll jitter on Android Fabric | Low | Low | Already proven in §6 TypeChips. Reuse that component shape. |
| Free-text date input in PaySheet is error-prone (OQ-2) | Medium | Medium | Preserve V1 behaviour for now; OQ-2 asks whether to upgrade to a date picker. If deferred, keep the V1 free-text input verbatim. |
| Accidentally deleting the `react-native-actions-sheet` dep/patch (owned by §9) | Low | High | §8 removes only the import in `pay_sheet.tsx`. The dep + patch + the §9 `adjust_balance_sheet.tsx` consumer stay. CLAUDE.md updated to drop only the commitments line from the legacy-migration list. |
| Detail hero SVG grid hex literal flagged by lint | Low | Low | SVG props are not className-able; same documented exception §5/§6 took. Lint allowlist already covers SVG stroke. |

---

## 7. Migration Strategy

§8 follows the established §5/§6 cycle (in-place build behind a flag, then promote, then cleanup).

### Wave 1 — Build behind flag (this PR)

- Branch: `feat/section-8-commitments`.
- Isolated commit: copy the V1 tree to the holding directory (`screens/commitments_legacy/`, name confirmed in plan) and point the route's OFF path at it.
- Rebuild `screens/commitments/**` to HeroUI in place.
- Migrate `pay_sheet.tsx` → `Sheet`; migrate skip + deactivate dialogs → `Sheet` confirms.
- Reuse §7 `AccountPickerSheet`, `CategoryPickerSheet`, `ExchangeRateRow`, `DetailRow`, `DetailRowsCard`, `SaveCta`.
- Remove the in-screen list FAB.
- Route file → flag-branch component.
- All tests pass with `newCommitments: false` (legacy active) and `true` (V2 active for dev/test).
- Update CLAUDE.md legacy-sheet list: remove the `screens/commitments/detail/components/pay_sheet.tsx` line; **leave the `adjust_balance_sheet.tsx` line and the dep/patch (owned by §9).**
- PR merges with `newCommitments: false` — production stays on V1.

### Wave 2 — Manual QA on device (🛑 user-facing gate)

Run with `newCommitments: true` on a physical Android device. Matrix:

- List: empty state, populated list, status grouping, status filter chips (each), month navigation, summary totals + progress correctness, refresh.
- Detail: all status states (overdue/due/upcoming/paid/skipped), fixed vs variable amount display, `~` tilde, notes present/absent, payment history.
- **Pay flow:** fixed same-currency pay (verify balance), **variable amount entry**, **cross-currency pay USD commitment from EGP account (verify balance = `−amount×rate`, transaction `egp_amount` correct)**, stale-rate warning, account picker, validation errors.
- Skip flow: confirm sheet, balance unchanged, status → skipped.
- Add/Edit: all field types, recurrence presets + custom, duration types + conditionals, date pickers (Android modal + iOS spinner), category/account pickers, deactivate confirm.
- Auto-deactivation after the final after-count payment.
- Expo Go / dev-client compat: no new native modules added.

### Wave 3 — Promotion PR

- Flip `newCommitments: true` in `constants/feature_flags.ts` (same commit that promotes V2).
- Update `__tests__/feature_flags.test.ts` per-section assertion.
- Merge.

### Wave 4 — Cleanup PR (within T+5 business days of promotion)

- Delete the legacy holding directory (`screens/commitments_legacy/`).
- Restore `app/(app)/(tabs)/commitments/index.tsx` to the one-liner: `export { default } from '@/screens/commitments';`.
- Remove `newCommitments` from `FeatureFlags` and the test assertion.
- Confirm `pay_sheet.tsx` has no `react-native-actions-sheet` import.
- **Do NOT remove** the `react-native-actions-sheet` dependency or its patch — §9 owns that (the `adjust_balance_sheet.tsx` consumer is still live until §9 ships).

---

## 8. Testing Strategy

**Logic-only.** Per the project test philosophy (no UI render tests), §8 writes no `.tsx` render tests. The rebrand must keep the existing logic-layer tests green and add any missing cases from §5.7.

### 8.1 Preserved / verified

- `utils/compute_due_dates` tests (C-01..C-03) — already exist; must stay green (file untouched).
- `store/commitment.store` tests — markAsPaid, skipPayment, generatePayments, checkAndDeactivateExpired, totals/counts derivations (C-04..C-11). Verify present; add missing.
- `repositories/commitment.repository` tests — `markAsPaid` builds the correct `Transaction` (egp_amount math, C-06/C-07).

### 8.2 Hook-logic tests (if present in the suite)

- `commitments.hook` — `sections` grouping by status filter, `counts`, `totalsByCurrency`, `navigateMonth` arithmetic (year rollover).
- `detail.hook` — `findCurrentPayment` priority, recurrence/duration label builders, skip flow.
- `pay_sheet.hook` — prefill logic (fixed vs variable, account fallback chain), `requiresRate` derivation, `onValid` payload to `markAsPaid`.

### 8.3 Coverage

Existing thresholds hold: 80% lines / 95% functions / 100% branches (`npm run test:coverage`).

### 8.4 No UI tests

No render/snapshot tests for `CommitmentRow`, `PaySheet`, etc. — consistent with the logic-only philosophy adopted after the §-wide removal of `.tsx` render tests.

---

## 9. Strings (`constants/strings.ts`)

The existing commitment strings (lines ~372–493) are comprehensive and **mostly preserved**. New keys likely needed:

```ts
// Skip confirm — when it becomes a Sheet, the existing keys still apply:
//   commitmentsSkipConfirmTitle / Body / Cancel / Confirm  (reuse)
// Deactivate confirm — existing keys reused:
//   commitmentsDeactivateTitle / Body / Cancel / Confirm  (reuse)

// Only add if the rebrand surfaces new copy (e.g. a converted-total label
// if it wasn't already a string). Field labels and error messages are
// team-decided per CLAUDE.md (not a critical trigger).
```

No new **voice/branding** copy is anticipated (the list header "Commitments", field labels, and error messages already exist and stay). If any new user-visible string with branding weight emerges, escalate per the critical-trigger rule. Strings deleted at cleanup: any legacy-only copy with no V2 consumer (none anticipated).

---

## 10. Acceptance Criteria

§8 is ready for **plan approval** when this spec covers every decision needed to write a step-by-step implementation plan with no `TBD`s, and the open questions (§11) are resolved at sign-off.

§8 is ready for **promotion (Wave 3)** when:

1. All Wave 1 build tasks complete behind `newCommitments: false`.
2. All §8 logic tests pass; coverage thresholds met.
3. Manual QA on Android passes the Wave 2 matrix — **especially the cross-currency pay balance check**.
4. No regressions in §1–§7 screens (smoke all tabs).
5. `pay_sheet.tsx` no longer imports `react-native-actions-sheet`; the dep, patch, and §9 `adjust_balance_sheet.tsx` consumer remain.
6. No new hex literals, no hardcoded spacing/radius, no hardcoded user-visible copy outside `constants/strings.ts` (lint enforces).

§8 is **fully closed** when:

1. Wave 4 cleanup PR ships within T+5 business days of promotion.
2. The legacy holding directory is deleted; the route file is the CLAUDE.md-compliant one-liner.
3. `newCommitments` is removed from `FeatureFlags` and tests.
4. CLAUDE.md legacy-sheet list shows only the §9 `adjust_balance_sheet.tsx` consumer remaining.

---

## 11. Open questions for sign-off

These are genuine product/IA forks the team should not decide unilaterally. Recommendations are given; the user resolves at the spec sign-off gate.

**OQ-1 — Add/Edit commitment form: full-screen route or `Sheet`?**
§7 moved Add/Edit Transaction into a declarative `Sheet`. The commitments form is longer (recurrence + duration + date pickers) and currently a full-screen route reached via navigation. Moving it into a `Sheet` would unify the "create" UX across domains but a long form in a sheet competes with the keyboard and the two native date pickers.
*Recommendation:* **keep the full-screen route** for the Add/Edit form (status-quo IA, lower risk, native date pickers behave better full-screen), and only migrate the pay/skip/deactivate confirmations to `Sheet`. This is a cross-section consistency call (binds whether a future "create" pattern is sheet-only), so it is escalated rather than team-decided.

**OQ-2 — PaySheet payment-date input: keep free-text or upgrade to a date picker?**
V1 uses a free-text `YYYY-MM-DD` input for the payment date (error-prone, no validation beyond the Zod string-min). The Add/Edit form already uses `@react-native-community/datetimepicker`.
*Recommendation:* **upgrade to the same date picker** for consistency and fewer input errors — but this is a small UX behaviour change (not pure rebrand), so it is surfaced rather than absorbed silently. If the user prefers strict pure-rebrand, keep the free-text input verbatim.

**OQ-3 — Skip / Deactivate confirms: `Sheet` or keep a centered modal?**
The spec proposes migrating the raw RN `Modal` confirms to `Sheet` (`size="sm"`) for consistency with the rest of the app. A bottom sheet for a 2-button destructive confirm is slightly heavier than a centered dialog.
*Recommendation:* **migrate to `Sheet`** — it removes the last raw-`Modal` confirm pattern in the domain and matches how confirms render elsewhere post-rebrand. If the user prefers a centered dialog, we keep a `Modal` but re-skin it with HeroUI tokens (no behaviour change either way).

---

*All other decisions (component naming, file structure, token swaps, test file layout, wave/PR sequencing within the section, dropping the press-scale animations) are team-decided per CLAUDE.md's "Not critical" list and recorded above.*
