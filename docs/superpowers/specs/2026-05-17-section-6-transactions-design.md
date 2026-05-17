# Section 6 · Transactions — Design Spec

**Date:** 2026-05-17
**Status:** Draft — awaiting plan approval
**Owners:** [tariq] technical · [marcus] UX · [layla] financial · [sarah] sequencing
**Section:** 6 of 9 (Transactions) within the HeroUI Native migration initiative
**Branch:** `spec/section-6-transactions` (design) → `feat/section-6-transactions` (implementation)

**Cross-references:**

- §1 Foundation spec: `docs/superpowers/specs/2026-05-10-section-1-foundation-design.md`
- §3 Reusable Patterns spec: `docs/superpowers/specs/2026-05-12-section-3-reusable-patterns-design.md`
- §4 Settings spec: `docs/superpowers/specs/2026-05-12-section-4-settings-design.md`
- §5 Dashboard spec: `docs/superpowers/specs/2026-05-16-section-5-dashboard-design.md`

---

## 1. Feature Summary

§6 replaces the V1 Transactions tree (list · detail · filter drawer + 3 nested pickers) with a redesigned, HeroUI-Native-first surface. The list screen gets a new month-driven IA (carousel + totals strip + richer rows). The detail screen keeps its existing structure but receives a HeroUI + Cairo Nights polish pass and gains a transfer-aware flow card. The filter drawer is fully restructured (Accordion sections, HeroUI Sheet, three nested pickers retired). The Add Transaction sheet is out of scope and remains §7 territory.

**What ships in §6:**

1. **Month carousel** — horizontal pill strip (`[All]` + last 6 months + `[Custom ›]`) drives period scoping. Pan-snap scrollable + tap. Default = current month. `Custom` opens a date-range picker sheet (HeroUI Sheet, migrated from V1's `FilterDateCustomPicker`).
2. **Totals strip** — three tinted cells (Income · Expense · Net) with polarity-correct deltas vs the previous month. Hidden when "All" pill is selected or when the selected month has no previous month.
3. **Type chips** — `All` / `Income` / `Expense` / `Transfer` single-select chip row (carries over from V1, restyled to HeroUI `Chip`).
4. **Search bar** — persistent HeroUI `Input` with debounced query (300 ms). Search scope respects the carousel selection.
5. **Filter button + drawer** — opens the redesigned `FilterSheet` (HeroUI Sheet · Accordion: Accounts · Categories · Amount). Date section is removed (carousel owns period). The three nested pickers (`FilterAccountPicker`, `FilterCategoryPicker`, `FilterDateCustomPicker`) are retired — Accounts/Categories render as inline togglable chips inside their accordion section, and the date picker moves to the carousel's `Custom` pill.
6. **Transaction row rewrite** — new three-line left column (category title + `TypeBadge` / italic note / account context) and three-slot right column (signed native amount / EGP equiv + `@ rate` for cross-currency / 12h time).
7. **`TypeBadge` component** — generic `commitment | goal | bill` badge. Only `commitment` is data-wired in §6 (uses existing `commitment_payment_id`). `goal` and `bill` variants are component-ready but currently never produced; ready for future sections.
8. **Detail screen polish** — V1 structure preserved (Hero · DetailRowsCard · ActionRow). HeroUI + Cairo Nights pass; `TypeBadge` added to the hero alongside the existing type tint; the `Original Amount` + `Exchange Rate` rows keep their split form.
9. **`TransferFlowCard`** — new visual element on the Transfer / CCPayment detail screens between hero and details rows. Two cells (FROM / TO) with native amounts; cells tappable → navigate to the corresponding account detail screen.
10. **`react-native-actions-sheet` retirement (transactions domain)** — all four V1 consumers in `screens/transactions/` (`filter/index.tsx`, `filter/components/filter_account_picker.tsx`, `filter/components/filter_category_picker.tsx`, `filter/components/filter_date_custom_picker.tsx`) are removed. The remaining `react-native-actions-sheet` consumers (Add Transaction form, Account adjust-balance, Commitment pay sheet, Settings categories) are owned by §7 / §8 / §9.
11. **`newTransactions` flag retirement** — §1 added `newTransactions: false`. §6 ships the new tree behind it, flips it on after manual QA, then removes the flag and the V1 branch per the §5 cycle.

**What does NOT ship in §6 (explicit out-of-scope):**

- **Add Transaction sheet (§7).** §6 wires the FAB tap-target only; the sheet itself is §7's surface.
- **Merchant identifier field.** Deferred to §7 — `note` continues to carry merchant text in §6 displays.
- **Goal / Bill data wiring.** `TypeBadge` ships ready, but no `goal_id` / `bill_id` columns are added in §6. Those badges never render until a future section produces the data.
- **Receipts / attachments.** Future surface.
- **Duplicate · share actions on detail screen.** No `⋯` overflow shipped in §6 (V1 doesn't have one either). Future surface.
- **Inline edit on detail rows.** Tap-to-edit fields. Edit still goes through the §7 sheet.
- **Trend / spending charts.** Future Insights-style section.
- **Multi-currency totals (USD column in totals strip).** Totals are always EGP (uses `egp_amount`). USD-native sums are not surfaced in §6.

---

## 2. Deviations from §1 Foundation

§1 prescribed §6 as "Transactions list + detail (list · filter · detail · empty states)" estimated at 3–5 days. §6 honours that scope.

| §1 prescription | §6 actual | Rationale |
|---|---|---|
| List + filter + detail + empty states | Same surfaces, deeper IA rework (month carousel, totals strip, type badge, restructured filter, transfer flow card on detail) | Direction from human during brainstorming: "Full redesign." §1 acknowledged per-section IA latitude (§5 used the same latitude for its 2-segment Dashboard). |
| FAB tap = Add Transaction (§3 wiring) | Unchanged. §6 inherits the global tab FAB from §3. | §3 owns the FAB primitive; screens do not mount or control it. §6 verifies it appears on the Transactions tab. |
| EmptyState pattern (§3) | Unchanged. `<EmptyState variant="transactions" />` and `variant="transactionsNoResults"` consumed from §3. | Already in use in V1. |

No other §1 commitments are altered. The carousel is a §6-local addition; the Custom-range picker is internal to §6 and uses the §3 `Sheet` primitive.

---

## 3. Information Architecture

### 3.1 Screen anatomy

```
TransactionsScreenV2  (screens/transactions_v2/index.tsx)
│
├── <Screen>                                          (full-screen wrapper, edges = ['top'])
│   ├── Header (in-flow)
│   │   └── Title "Transactions"
│   │
│   ├── MonthCarousel (in-flow, scrolls with content)    ← NEW
│   │   └── Pill row: [All] [N-5] [N-4] [N-3] [N-2] [N-1] [Current·active] [Custom ›]
│   │
│   ├── TotalsStrip (in-flow, conditional)               ← NEW
│   │   └── Three tinted cells · deltas · "vs <previousMonth>" footer
│   │
│   ├── SearchRow (in-flow)
│   │   ├── HeroUI Input (search) — debounced 300 ms
│   │   └── FilterButton (with active-count badge)
│   │
│   ├── TypeChips (in-flow)
│   │   └── [All] [Income] [Expense] [Transfer]
│   │
│   ├── SectionList                                   (date-grouped, sticky headers)
│   │   ├── DateHeader (per day)
│   │   └── TransactionRow                            ← TEMPLATE REWRITE
│   │
│   ├── FilterSheet (overlay)                         ← FULL RESTRUCTURE
│   ├── DateRangeSheet (overlay, opened from Custom pill)
│   └── AddTransactionSheet (overlay, §7-owned — wired by FAB tap)
│
└── (Global FAB — rendered by app/(app)/(tabs)/_layout.tsx, outside this screen)
```

Route file `app/(app)/(tabs)/transactions/index.tsx` becomes a flag-branch component:

```tsx
import { FeatureFlags } from '@/constants/feature_flags';
import TransactionsScreenV1 from '@/screens/transactions';
import TransactionsScreenV2 from '@/screens/transactions_v2';

export default function TransactionsRoute() {
  return FeatureFlags.newTransactions ? <TransactionsScreenV2 /> : <TransactionsScreenV1 />;
}
```

### 3.2 Empty states

Two empty states, both consumed from §3:

- **No transactions exist at all** (data store returns empty for current carousel selection AND no search/filter active) →
  `<EmptyState variant="transactions" onAction={openAddTransaction} actionLabel={Strings.emptyTransactionsCta} />`
- **No results in current period / under current filter** (data exists in store, but the active query returns 0) →
  `<EmptyState variant="transactionsNoResults" />`

The MonthCarousel and SearchRow remain visible above the empty state so the user can change scope or clear filters without leaving the screen.

### 3.3 Carousel behaviour

- **Strip composition:** `[All]` + last 6 months (chronological, oldest left → current right) + `[Custom ›]`. Always 8 pills exactly unless fewer than 6 months of data exist (then trailing slots are blank, not rendered). The current month is always rightmost of the month pills.
- **Default on screen open:** Current month pill is selected and centred via auto-scroll.
- **Gesture model:** Pan-snap (`ScrollView` `pagingEnabled={false}` with snap-to-item via `snapToOffsets`) plus tap. Tap any pill to switch; drag the strip horizontally to scroll, snaps to nearest pill on release.
- **Custom pill:** Tapping opens `DateRangeSheet` (HeroUI `Sheet`, `size="md"`). User picks `from` / `to` dates; on confirm, the Custom pill becomes active with label `from → to` (e.g. `Apr 1 → Apr 15`). Tapping Custom again while active re-opens the picker with current values. Tapping another pill clears the custom range.
- **Tab-focus reset:** On `useFocusEffect`, carousel resets to current month (not "All"). Reasoning: the most common return-to-tab use case is "what about this month?", not "show me everything."

### 3.4 Totals strip behaviour

- **Visibility:** Renders only when a specific month or custom range is selected. Hidden when `period === 'all'`. Hidden when the selected month has no preceding month within the carousel's range (no comparison possible — the strip's deltas need a previous period).
- **Three cells:** Income · Expense · Net. Each cell uses Cairo Nights polarity-aware coloring:
  - Income cell tinted emerald, value green
  - Expense cell tinted soft-red, value soft-red
  - Net cell tinted gold, value gold
- **Deltas:** Each cell carries a per-metric delta vs the previous month's equivalent value. Direction colors are polarity-aware (Income ↓ = red, Expense ↑ = red, Net ↓ = red).
- **Caption:** Bottom of the card reads `vs <previousMonth>` (e.g. `vs April 2026`).
- **Edge case:** Both current and previous metric == 0 → cell shows the value but no delta. Either metric == 0 with the other non-zero → delta shown but capped/labelled per `computeDeltaPct` rules (see §5.2).

### 3.5 Search / filter interaction model

- **Search query** is debounced 300 ms (preserved from V1).
- **Search scope** = the current carousel period intersected with all active filters. There is no global-search toggle in §6.
- **Type chips** (All / Income / Expense / Transfer) are single-select. They narrow within the carousel period.
- **Filter button** opens the `FilterSheet`. Active count badge sums Accounts + Categories + Amount filters (date is no longer a filter).
- **Clearing:** Pulling-to-refresh does not clear filters. Switching tabs (focus blur) resets search query, type chip, applied filters, and carousel to current month.
- **Pull-to-refresh:** `RefreshControl` on the `SectionList` calls the existing `refresh()` handler (reload transactions for current query). Spinner color = `Colors.shared.cairoGold`. Preserved from V1.

---

## 4. Product & UX ([marcus])

### 4.1 Visual hierarchy

The list screen tops out at ~280 px before the list starts — a deliberate budget that balances information density against list real estate:

```
≈ 56 px   Header
≈ 44 px   MonthCarousel
≈ 96 px   TotalsStrip (conditional · ~0 when "All" selected)
≈ 44 px   SearchRow
≈ 36 px   TypeChips
─────────
≈ 276 px  Top stack · then SectionList fills remainder
```

When carousel = "All", the TotalsStrip is hidden and the budget drops to ~180 px, giving the list more breathing room — appropriate because "All" is the everything-mode view.

### 4.2 Transaction row template (locked)

Two columns. Total row min-height ~64 px, but rows compress / expand based on which optional surfaces are present.

**Left column (flex 1, min-width: 0):**

| Row | Content | Type | Conditional |
|---|---|---|---|
| 1 | Category name + optional `TypeBadge` | Sora 700 13pt | Category name from `category.name`, fallback to type literal ("Transfer", "CC Payment") when `category_id` is null |
| 2 | Note (italic) | Inter regular italic 11.5pt | Rendered only when `note` is non-empty; line is omitted otherwise (row compresses) |
| 3 | Account context | Inter 500 10.5pt, opacity 0.55 | For Expense / Income → single account name. For Transfer / CCPayment → `FROM → TO` account names |

**Right column (shrink-0, align-end):**

| Row | Content | Type | Conditional |
|---|---|---|---|
| 1 | Signed native amount + currency code | Sora 700 14pt, type-coloured | Sign prefix: `+` income, `−` expense, none for transfer / cc-payment. Amount format: `Intl.NumberFormat('en-US', { style: 'decimal' })`. Currency code as `EGP` / `USD` (not symbol) |
| 2 | EGP equivalent + `@ rate` | Inter 500 10pt, opacity 0.6 | Rendered only when `currency !== 'EGP'`. Prefix: `≈` for expense/income, `→` for transfer/cc-payment. Format: `<verb> <amount> EGP <muted>@ <rate></muted>` |
| 3 | Time | Inter 400 10pt, opacity 0.4 | Always rendered. 12h format via existing `formatTime12h(tx.transaction_time)` |

**Icon (left-most, flex-shrink: 0):**

- 36×36 rounded-9 square
- Category icon (`category.icon`) tinted with category color; fallback `shape-outline` for missing category
- For Transfer: `swap-horizontal` icon over Cairo gold tint
- For CC Payment: `credit-card-refund` icon over the CC-plum tint

### 4.3 TypeBadge component

A generic pill component used in three places:

- Transaction row (Row 1, inline with category title)
- Detail screen hero (alongside the existing type badge)
- Future linked-section rows (Goal / Bill leaf labels)

**Props:** `type: 'commitment' | 'goal' | 'bill'` · `size?: 'sm' | 'md'` (default `sm`)

**Visual variants (size `sm`, used in rows):**

| Type | Background | Foreground / border | Label | Icon |
|---|---|---|---|---|
| `commitment` | `bg-cairoGold/16` | `text-cairoGold border-cairoGold/30` | "Commitment" | `⏱` (clock-outline) |
| `goal` | `bg-positive/16` | `text-positive border-positive/30` | "Goal" | `🎯` (target / bullseye) |
| `bill` | `bg-warning/16` | `text-warning border-warning/30` | "Bill" | `📄` (file-document-outline) |

In §6, only `commitment` is wired (driven by `tx.commitment_payment_id !== null`). The other two variants are exported and render correctly but no producer code emits them yet.

### 4.4 Detail screen polish

V1 structure is preserved in toto (see §6.2 component map). The polish pass:

1. **Header** — keep `BackButton` from `@/components/ui/back_button`. Centered title "Transaction".
2. **DetailHero** — keep hero amount + title + date/time. Add a `TypeBadge` to the right of the existing type-strip when `tx.commitment_payment_id` is set.
3. **DetailRowsCard** — wrap rows in a HeroUI `Card` with `bg-surface` and `border-separator`. Rows use `border-t border-separator` between items.
4. **DetailRow** — restyle to use the same `Box`/`Text` primitives as §4 Settings ListGroup row (icon · label uppercase · value · optional chevron · optional sublabel). No layout changes.
5. **Cross-currency rows** — `Original Amount` and `Exchange Rate` remain as two separate rows. `Exchange Rate` row keeps the small "captured" chip badge to disambiguate from live rates.
6. **TransferFlowCard (new, conditional)** — for `Transfer` and `CCPayment` types, rendered between Hero and DetailRowsCard. See §4.5.
7. **ActionRow** — Edit (gold gradient HeroUI `Button` variant) + Delete (red outline HeroUI `Button` variant). Edit still routes to the §7 Edit sheet (which §6 leaves untouched).

### 4.5 TransferFlowCard

Two cells with a centered arrow between them. Cell anatomy:

- 36×36 icon (account-coloured tint)
- Account name (Inter 600 11.5pt)
- Signed amount in that account's perspective (Sora 600 11pt)

**Same-currency transfer (5,000 EGP, CIB → QNB Reserve):**

```
┌─────────────────┬────┬─────────────────┐
│ From            │ →  │ To              │
│ 🏦 CIB          │    │ 🏦 QNB Reserve  │
│ −5,000 EGP      │    │ +5,000 EGP      │
└─────────────────┴────┴─────────────────┘
```

**Cross-currency transfer (100 USD → 4,885 EGP):**

```
┌──────────────────┬────┬───────────────┐
│ From             │ →  │ To            │
│ 💵 Wise USD      │    │ 🏦 CIB        │
│ −100.00 USD      │    │ +4,885 EGP    │
└──────────────────┴────┴───────────────┘
```

Both cells are tappable — `onPress` navigates to `/accounts/<id>` for that side. The card itself has no surrounding press affordance. The cells use `Pressable` (HeroUI primitive) with a subtle press scale animation (`useRowPressScale` from V1's existing helper, lifted into a shared util in §6 if not already).

### 4.6 FilterSheet (full restructure)

Sheet header:

- Close `×` (left) · "Filter" title (centre) · "Reset" link (right, gold)

Body — HeroUI Native `Accordion` with three items. One open at a time (default = none open).

**Accordion item · Accounts:**

- Collapsed: `Accounts` title · count chip (gold pill with `n`) · summary "CIB, Visa Credit ›"
- Expanded: chip grid, one chip per account, multi-select. Each chip carries the account's color swatch (8×8 dot) before the name. Tapping toggles. No "All" option (empty selection = all).

**Accordion item · Categories:**

- Same pattern, chip grid with category color swatches.

**Accordion item · Amount:**

- `Tabs` (HeroUI) for currency: EGP / USD
- Two side-by-side HeroUI `Input` fields: Min · Max
- Inputs are numeric (decimal pad)

**Footer:**

- `Apply (N filters)` CTA, gold gradient. `N` = `accountIds.length + categoryIds.length + (amountMin || amountMax ? 1 : 0)`. Disabled (greyed) when draft matches the currently applied filters (no change).
- Reset cleared all drafts to `EMPTY_FILTERS_V2` (see §6.6) without auto-applying.

---

## 5. Financial Logic ([layla])

§6 doesn't introduce new financial primitives, but it does introduce three derivations that warrant explicit specification + test cases:

### 5.1 Period totals (Income · Expense · Net)

For a given period `{ from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' }`:

```
incomeEgp  = SUM(egp_amount)  WHERE type='income'   AND transaction_date BETWEEN from AND to
expenseEgp = SUM(egp_amount)  WHERE type='expense'  AND transaction_date BETWEEN from AND to
netEgp     = incomeEgp - expenseEgp
```

Transfers and CC payments are excluded from totals (they move money between user-owned accounts and do not change net worth).

**Worked example:**

```
Period: May 2026
Transactions:
  +12,500 EGP income (Salary)
  +12,213 EGP income (Upwork, $250 USD @ 48.85 = egp_amount: 12,213)
  −8,300 EGP expense (sum of 14 expense rows)
  −5,000 EGP transfer (CIB → QNB Reserve)
  −4,080 EGP cc_payment (CIB → Visa Credit)

Totals:
  incomeEgp:  +24,713
  expenseEgp:  −8,300
  netEgp:     +16,413
```

### 5.2 Delta percentage vs previous period

```
deltaPct(current, previous):
  if previous == 0 and current == 0:  return null  (no signal — both empty)
  if previous == 0 and current != 0:  return null  (capped — would be infinite)
  return Math.round(((current - previous) / Math.abs(previous)) * 100)
```

**Polarity colour:**

- `incomeEgp` delta: positive = good (green), negative = bad (red)
- `expenseEgp` delta: positive = bad (red), negative = good (green)
- `netEgp` delta: positive = good (green), negative = bad (red)

The Math.abs(previous) denominator handles negative-net previous periods correctly.

**Worked examples:**

```
Income: prev 25,500, curr 24,713 → −3% (bad → red)
Expense: prev 7,685, curr 8,300 → +8% (bad → red)
Net: prev 5,100, curr 4,200 → −18% (bad → red)

Income: prev 0, curr 12,500 → null (no delta shown)
Net: prev −500, curr +1,500 → +400% (good → green)
```

### 5.3 Carousel period resolution

```
resolvePeriod(selection):
  if selection.type === 'all':       return { from: undefined, to: undefined }
  if selection.type === 'month':     return monthRange(selection.yearMonth)
  if selection.type === 'custom':    return { from: selection.from, to: selection.to }

monthRange(yearMonth):
  start = `${yearMonth}-01`
  end   = last day of yearMonth (inclusive)
  return { from: start, to: end }
```

### 5.4 Previous period for delta

```
previousPeriod(selection):
  if selection.type === 'all':       return null
  if selection.type === 'custom':    return null  (no canonical "previous" for arbitrary ranges)
  if selection.type === 'month':     return monthRange(yearMonth - 1 month)
```

Hidden-strip rule: when `previousPeriod()` returns `null`, the deltas hide (cells stay, just no delta sub-line). When `previousPeriod()` returns a range that is before the earliest transaction, deltas also hide (no signal vs an empty period).

---

## 6. Technical Architecture ([tariq])

### 6.1 File structure (§6 V2 tree)

```
screens/transactions_v2/
├── index.tsx                       — full UI, no useState / useSharedValue
├── transactions.hook.ts            — data wiring, RHF, nav
├── transactions.state.ts           — UI Zustand: refreshing
├── transactions.store.ts           — Data Zustand: searchQuery, activeFilter, period, appliedFilters
├── transactions.anim.ts            — Reanimated only (row press scale, list entrance)
├── transactions.helpers.ts         — pure helpers (currentYearMonth, computeCarouselPills, resolvePeriod, previousPeriod, computeDeltaPct, polarityColor)
└── components/
    ├── month_carousel.tsx
    ├── month_carousel.anim.ts
    ├── totals_strip.tsx
    ├── search_row.tsx
    ├── type_chips.tsx
    ├── date_range_sheet.tsx
    ├── transaction_row.tsx
    ├── transaction_row.anim.ts
    └── date_header.tsx             — refactor of V1's component for HeroUI

screens/transactions_v2/filter/
├── index.tsx                       — FilterSheet (replaces V1's FilterDrawer)
├── filter.hook.ts
├── filter.state.ts                 — UI Zustand: visible, openSection ('accounts' | 'categories' | 'amount' | null)
├── filter.store.ts                 — Data Zustand: draft (AdvancedFilters)
├── filter.helpers.ts               — countActiveFilters, toQueryFilters (date-free), parseAmountInput, formatSelectionSummary
└── components/
    ├── account_accordion.tsx
    ├── category_accordion.tsx
    └── amount_accordion.tsx

screens/transactions_v2/detail/
├── index.tsx                       — polished UI
├── detail.hook.ts
├── detail.state.ts
├── detail.store.ts
├── detail.anim.ts
└── components/
    ├── detail_hero.tsx             — adds TypeBadge slot
    ├── detail_row.tsx              — HeroUI styling
    ├── detail_rows_card.tsx
    ├── transfer_flow_card.tsx      — NEW
    ├── action_row.tsx
    ├── delete_confirm_dialog.tsx
    └── not_found_state.tsx

components/ui/
├── type_badge.tsx                  — NEW shared primitive
```

The V1 tree at `screens/transactions/` remains intact until the cleanup wave. The route file at `app/(app)/(tabs)/transactions/index.tsx` becomes the flag branch.

### 6.2 Store/state shape changes

**New screen store shape (`screens/transactions_v2/transactions.store.ts`):**

```ts
type CarouselSelection =
  | { type: 'all' }
  | { type: 'month'; yearMonth: string }                      // 'YYYY-MM'
  | { type: 'custom'; from: string; to: string };             // ISO dates

type AdvancedFilters = {
  accountIds: string[];
  categoryIds: string[];
  amountCurrency: Currency;
  amountMin?: number;
  amountMax?: number;
};

interface State {
  searchQuery: string;
  activeFilter: TransactionFilter;      // 'all' | TransactionType
  period: CarouselSelection;             // default { type: 'month', yearMonth: currentYearMonth() }
  appliedFilters: AdvancedFilters;       // default EMPTY_FILTERS_V2 (no date fields)
}
```

Removed fields (compared to V1): `datePreset`, `customDateFrom`, `customDateTo`. Date is now driven by `period` alone.

**Filter draft store (`screens/transactions_v2/filter/filter.store.ts`):**

Same shape as `AdvancedFilters` above. No `datePreset` / custom date fields.

**`useFilterDrawerState` (`filter.state.ts`):** adds `openSection: 'accounts' | 'categories' | 'amount' | null` to track which accordion item is open.

**`useTransactionsState`:** unchanged (still just `refreshing`).

### 6.3 Query layer

The existing `useTransactionStore.setQuery()` API is unchanged. The hook (`useTransactions`) maps the screen store's `period` → `{ dateFrom, dateTo }` via `resolvePeriod(period)`, then spreads onto the existing query payload alongside type / search / advanced filters. No DB layer changes; existing `transactions.ts` query already accepts `dateFrom` / `dateTo`.

For the totals strip, a new query function lands in `database/transactions.ts`:

```ts
async function getPeriodTotals(
  db: SQLiteDatabase,
  range: { from: string; to: string },
): Promise<{ incomeEgp: number; expenseEgp: number; netEgp: number }>
```

The hook calls `getPeriodTotals` twice on period change: once for the current period and once for `previousPeriod()` if non-null. Results are memoised in the hook and passed to `TotalsStrip` as props — no store entry needed (no other consumer outside the screen).

### 6.4 MonthCarousel internals

- Built on RN `ScrollView` (horizontal) with `snapToOffsets` derived from pill widths. HeroUI Native does not ship a Carousel primitive that matches this exact pattern.
- Pill widths are measured on layout once; `snapToOffsets` is recomputed if the strip remounts. Pan-snap uses `decelerationRate="fast"`.
- Tap → `scrollTo({ x: pillOffset, animated: true })` + state update.
- Auto-scroll-to-current on mount uses `scrollTo({ x: currentMonthOffset, animated: false })`.
- "Custom" pill: separate component on the right of the strip, hugged to the right with extra padding. Tapping toggles `dateRangeSheetVisible`.

### 6.5 DateRangeSheet

Built on `Sheet` from `@/components/ui/sheet` (§3 primitive), `size="md"`. Body is a simple from/to date picker (RN `DateTimePicker` is Expo Go compatible; can be wrapped). Apply CTA confirms and emits `{ type: 'custom', from, to }` to the screen store. Cancel dismisses without change. Used only by the carousel.

### 6.6 FilterSheet internals

- Wraps `@/components/ui/sheet`'s `Sheet` at `size="lg"`.
- Body uses HeroUI Native `Accordion` (from `heroui-native`) with `type="single"` `collapsible` configuration so users can collapse-all if desired.
- Each accordion item's body renders a HeroUI `Chip`-grid for Accounts / Categories or two `Input`s for Amount.
- Footer Apply button is a HeroUI `Button` variant primary with the gold gradient (matching §4 Settings sheet CTAs).

### 6.7 TypeBadge

`components/ui/type_badge.tsx`:

```tsx
type TypeBadgeProps = {
  type: 'commitment' | 'goal' | 'bill';
  size?: 'sm' | 'md';
};
```

Uses `tailwind-variants` to compose the variant styling. Exports default. Used by transaction row, detail hero, and any future linked-row consumer.

### 6.8 TransferFlowCard

`screens/transactions_v2/detail/components/transfer_flow_card.tsx`. Props:

```tsx
type TransferFlowCardProps = {
  fromAccount: Account;
  toAccount: Account;
  fromAmount: number;     // signed, in fromAccount.currency
  fromCurrency: Currency;
  toAmount: number;       // signed, in toAccount.currency
  toCurrency: Currency;
  onPressFrom?: () => void;
  onPressTo?: () => void;
};
```

Hook wires `onPressFrom = () => router.push('/accounts/<id>')` / same for to.

### 6.9 Performance

- SectionList renderer unchanged from V1 (already performant; no FlashList migration in §6).
- Totals are computed once per period change, not per render (memo + setter).
- Carousel strip is small (8 pills) — no virtualization needed.
- Filter sheet accordion items are mounted lazily by HeroUI Accordion (only the open item's body is in the tree).

### 6.10 Accessibility

- Carousel pills have `accessibilityRole="button"`, `accessibilityState={{ selected: pill === active }}`, label `"<month>, period filter"`.
- Custom pill includes the range in its accessibility label when active.
- TypeBadge passes `accessibilityLabel="Commitment"` etc.
- TransferFlowCard cells are `accessibilityRole="button"` with label `"<account name>, open account detail"`.
- TotalsStrip cells have `accessibilityLabel="Income, +12,500 EGP, down 3 percent from April"` patterns.

---

## 7. Migration Strategy

§6 follows the §5 Dashboard cycle exactly.

### Wave 1 — Build behind flag (this PR)

- Branch: `feat/section-6-transactions`
- Build `screens/transactions_v2/` tree end-to-end
- Build `components/ui/type_badge.tsx`
- Add `getPeriodTotals` query to `database/transactions.ts`
- Update `app/(app)/(tabs)/transactions/index.tsx` to the flag-branch component
- All tests pass with the flag `false` (V1 still active) and with the flag `true` (V2 active locally for dev/test only)
- PR merges with `newTransactions: false` — production users continue to see V1

### Wave 2 — Manual QA on device

- Run with `newTransactions: true` locally and on a physical Android device
- Test matrix: empty state, populated list, search, carousel navigation, totals correctness, type chips, filter accordion (all three sections, multi-select, reset, apply), detail screen for all four types, cross-currency display, commitment-linked transactions, transfer flow card navigation
- Verify Expo Go compatibility (no native modules added; HeroUI Native + Reanimated + GestureHandler already in tree)

### Wave 3 — Promotion PR

- Flip `newTransactions: true` in `constants/feature_flags.ts`
- Update `__tests__/feature_flags.test.ts` per-section explicit assertion (matching §5's pattern)
- Merge

### Wave 4 — Cleanup PR (within T+5 business days of promotion)

- Delete V1 tree (`screens/transactions/`)
- Rename `screens/transactions_v2/` → `screens/transactions/`
- Update all imports
- Drop `newTransactions` from `FeatureFlags` and the test
- Drop the flag-branch component at `app/(app)/(tabs)/transactions/index.tsx` — replace with the one-liner re-export per CLAUDE.md `app/` rules
- Verify all four legacy `react-native-actions-sheet` consumers in the transactions domain are gone

The `react-native-actions-sheet` dependency itself remains in `package.json` until §9 retires the last consumers. Its patch file `patches/react-native-actions-sheet+10.1.2.patch` also stays.

---

## 8. Testing Strategy

### 8.1 Pure helpers (`transactions.helpers.ts`)

100% function coverage required. Test cases:

- `currentYearMonth()` → returns `YYYY-MM` for `today`
- `resolvePeriod({ type: 'all' })` → `{ from: undefined, to: undefined }`
- `resolvePeriod({ type: 'month', yearMonth: '2026-05' })` → `{ from: '2026-05-01', to: '2026-05-31' }`
- `resolvePeriod({ type: 'month', yearMonth: '2026-02' })` → `{ from: '2026-02-01', to: '2026-02-28' }` (leap year handled)
- `resolvePeriod({ type: 'custom', from: 'X', to: 'Y' })` → passthrough
- `previousPeriod({ type: 'all' })` → `null`
- `previousPeriod({ type: 'custom', … })` → `null`
- `previousPeriod({ type: 'month', yearMonth: '2026-01' })` → `{ type: 'month', yearMonth: '2025-12' }`
- `computeDeltaPct(curr, prev)` → 5 cases including both zeros, prev zero, both negative, normal
- `polarityColor(metric, deltaPct)` → matrix of metric × sign
- `computeCarouselPills(today)` → 8 entries: `[All, ...last6Months, Custom]`

### 8.2 Component tests

- **`TypeBadge`** — renders correct icon + label for each type · accepts size variants
- **`MonthCarousel`** — renders correct pills · current month is highlighted · tap fires `onSelect` with right payload · Custom pill fires `onOpenCustom`
- **`TotalsStrip`** — renders three cells · hides delta lines when previous is null · polarity colours applied correctly · hides entirely when `period.type === 'all'`
- **`TransactionRow`** — renders left/right templates correctly for each of the 10 sample cases · TypeBadge slots correctly · cross-currency right-column row appears only for non-EGP
- **`TransferFlowCard`** — renders both cells · onPress handlers fire · arrow direction matches FROM → TO
- **`AccountAccordion` / `CategoryAccordion` / `AmountAccordion`** — multi-select toggles · summary line updates · open/closed state respected

### 8.3 Screen tests

`__tests__/screens/transactions_v2/transactions_screen.test.tsx`:

- Empty state when zero transactions (carousel + search row still visible above empty state)
- Populated state renders rows
- Tapping settings/header — n/a (no settings cog on transactions tab)
- Tapping FAB → opens AddTransactionSheet (mocked)
- Switching carousel pill → reloads data, totals update
- Search input → debounces and fires `setQuery`

### 8.4 Detail screen tests

`__tests__/screens/transactions_v2/detail/transaction_detail.test.tsx`:

- All four transaction types render correctly
- TypeBadge appears for commitment-linked tx
- TransferFlowCard appears for transfer and cc-payment, not for expense/income
- Cross-currency rows (Original Amount + Exchange Rate) appear only when cross-currency
- Edit button fires sheet open
- Delete button fires confirmation dialog

### 8.5 Filter sheet tests

`__tests__/screens/transactions_v2/filter/filter_sheet.test.tsx`:

- Three accordion items render closed by default
- Opening one closes others (single-collapsible behaviour)
- Multi-select on Accounts / Categories
- Amount currency toggle + min/max inputs
- Reset clears draft
- Apply with N filters fires the apply action and updates the count badge on the screen
- No date section anywhere in the sheet (regression guard for the date removal)

### 8.6 Smoke test

A single `__tests__/screens/smoke/transactions_v2.test.tsx` renders the screen with mocked heroui-native, gesture-handler, reanimated, and the sheet primitive, and asserts the screen mounts without throwing. Mirrors §5's pattern.

---

## 9. Strings (`constants/strings.ts`)

New strings added in §6:

```ts
// Carousel
carouselAllLabel: 'All',
carouselCustomLabel: 'Custom',
carouselCustomLabelActive: (from: string, to: string) => `${from} → ${to}`,

// Totals
totalsIncome: 'Income',
totalsExpense: 'Expense',
totalsNet: 'Net',
totalsVsPrev: (prevPeriod: string) => `vs ${prevPeriod}`,

// Type chips (unchanged from V1)
// All / Income / Expense / Transfer

// Type badges
typeBadgeCommitment: 'Commitment',
typeBadgeGoal: 'Goal',
typeBadgeBill: 'Bill',

// Filter
filterCountChip: (n: number) => `${n}`,
filterAccountsSummaryEmpty: 'All accounts',
filterCategoriesSummaryEmpty: 'All categories',
filterAmountSummaryEmpty: 'Any amount',
filterAmountSummary: (currency: Currency, min?: number, max?: number) => /* formatted */,

// Detail
// (existing V1 strings preserved)

// Empty
// (existing V1 strings preserved — emptyTransactionsCta, etc.)
```

Strings deleted in cleanup wave (Wave 4): all V1 filter-date-section strings (`Strings.filterSectionDate`, preset labels, etc.).

---

## 10. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Pan-snap gesture flakiness on Android Fabric | Medium | Medium | Use `snapToOffsets` with measured pill widths; fallback to tap-only if snap fails (still functional). Manual QA on Android required. |
| HeroUI Native `Accordion` open/close animation jitter | Low | Low | Already in use in §4 Settings. If issues arise, lock to `LayoutAnimation.Presets.easeInEaseOut`. |
| Date range picker UX on Android (native picker dialog vs inline) | Medium | Medium | Use Expo's `DateTimePicker` per platform (modal on iOS, inline on Android). Keep the Custom pill as the only entry to avoid duplicating the affordance. |
| Period totals query performance with many transactions | Low | Medium | Query is filtered by `transaction_date` with an existing index. Sub-100ms expected for ≤10k transactions. Add memoization on screen for thrashing avoidance. |
| Edge: leap year February in `resolvePeriod` | Low | High | Use `new Date(year, month, 0)` pattern (last-day trick). Unit-test 2024-02 + 2026-02. |
| Empty `TypeBadge` variants (Goal / Bill) shipped but never used | Low | Low | Acceptable — component is unit-tested and tree-shaken if unused; future sections wire them. |

---

## 11. Acceptance Criteria

§6 is ready for plan approval when this spec covers every decision needed to write a step-by-step implementation plan with no `TBD`s.

§6 is ready for promotion (Wave 3) when:

1. All Wave 1 build tasks complete, behind `newTransactions: false`.
2. All §8 tests pass · coverage thresholds met (80% lines / 95% functions / 100% branches).
3. Manual QA on Android device passes the §7 test matrix (empty state, populated, search, carousel navigation incl. Custom range, totals correctness with manual cross-check, type chips, filter accordion all three sections with multi-select / reset / apply, detail for all four types incl. cross-currency, commitment-linked rendering, transfer flow card navigation).
4. No regressions in §1–§5 screens (smoke test all tabs).
5. No new `react-native-actions-sheet` imports introduced anywhere; the four V1 transactions-domain consumers are unreachable from V2 (V1 still mounted at flag = `false`).

§6 is fully closed when:

1. Wave 4 cleanup PR ships within T+5 business days of Wave 3.
2. The four V1 sheets and all their files are deleted.
3. The `newTransactions` flag is removed from `FeatureFlags` and tests.
4. `screens/transactions/` is the renamed V2 tree and the route file is the CLAUDE.md-compliant one-liner re-export.

---

## 12. Open questions

None at design time. The following deferrals are intentional and recorded in §1:

- **Merchant identifier** — wait for §7 (Add Transaction redesign), which will introduce the entry surface for that field.
- **Goal / Bill data model** — wait for future Goals / Bills sections; `TypeBadge` ships ready.
- **Inline edit on detail rows** — out of scope; edit goes through the §7 sheet.
- **Trend / chart visualizations** — future Insights section; design surface area not yet defined.
- **USD-native totals column** — out of scope for §6; current totals strip is EGP-only.

If any of these constraints break during implementation, escalate via [sarah] rather than absorbing them into §6.
