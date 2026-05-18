# §7 — Add / Edit Transaction Sheet — Design

**Date:** 2026-05-18
**Owners:** @marcus (UX), @layla (financial logic), @tariq (architecture)
**Feature flag:** `newAddTransaction` (already declared at `constants/feature_flags.ts`)
**Targets removed at cleanup:** the 3 legacy `react-native-actions-sheet` consumers in `screens/transactions/transaction_form/`.

---

## 1. Goal & Non-Goals

### Goal

Replace the legacy Add / Edit Transaction form with a modern implementation built on `Sheet` (gorhom v5 via `components/ui/sheet.tsx`) + HeroUI Native primitives + Cairo Nights tokens, while ratifying the financial rules that govern the form.

### Scope (in)

1. Migrate `AddTransactionSheet` and `EditTransactionSheet` off `react-native-actions-sheet`. Remove the 3 last legacy consumers in this tree.
2. Redesign the form UI: type selector, amount hero, account / category pickers, cross-currency row, date + time, save CTA.
3. Ratify and tighten financial rules (positive amounts, type-driven sign, CC payment / transfer constraints, cross-currency math, rounding policy).
4. Drop the time picker from the UI (auto-populate `transaction_time` from device clock); keep the DB column unchanged.
5. Add an `installment_id` nullable FK column on `transactions` to receive §8's installments work without a schema migration mid-stream. No UX.
6. Add a blocking empty state inside the sheet when the user has zero accounts.

### Non-goals (out)

- Negative amounts / explicit refund flow (model refunds as positive income).
- Optional categories on transfers / CC payments.
- Scheduled or future-dated transactions (`maximumDate = today` stays).
- CC → CC balance transfer as a new transaction type (documented workaround).
- New copy direction / voice / branding outside the existing `Strings` keys.
- Recurring transactions (lives in §8 commitments).
- Live FX feed (out of scope for this app entirely).

---

## 2. Product & UX (Marcus)

### 2.1 Container — bottom sheet, `Sheet` at `size="lg"`

Keep the bottom sheet. Add Transaction is a transient action initiated from multiple surfaces (dashboard FAB, transaction list, account detail, future commitments). A full-screen modal route would force a navigation push and break the sense of "I'm still where I was". Use `Sheet` from `components/ui/sheet.tsx` at `size="lg"` (≈92% screen height, matching the current `WINDOW_HEIGHT * 0.92`).

Sheet header: title + close icon, sticky.
Sheet body: `BottomSheetScrollView` from `@gorhom/bottom-sheet` (NOT from `react-native`).
Sheet footer: sticky CTA outside the scroll view.

### 2.2 Type selector — HeroUI `Tabs`, four tabs, per-type accent color

Keep all four types as first-class tabs: **Expense · Income · Transfer · CC Payment**. Hiding CC Payment behind a submenu adds a tap for a routinely-used flow.

Active-tab underline carries the per-type color:

| Type        | Active color token | Notes |
|---|---|---|
| Expense     | `text-danger`      | Already a token. |
| Income      | `text-success`     | Already a token. |
| Transfer    | `text-info`        | NEW — promote the current hardcoded `#4A9EE0` to a named token in `global.css` + `constants/theme_tokens.ts`. |
| CC Payment  | `text-accent-cc`   | NEW — promote `#9B73D4`. |

Inactive tabs: `text-muted`.

**Open question (1):** if HeroUI `Tabs` doesn't expose a per-item `classNames.activeIndicator` override, fall back to a `tv()`-composed tab row in `components/ui/type_tabs.tsx`. Resolution belongs in the plan — Tariq evaluates the HeroUI Tabs API before writing the plan; the fallback is documented up-front so it isn't a mid-implementation surprise.

### 2.3 Amount entry — custom numpad retained, hero header

Keep the custom numpad. The system numeric keyboard on Android is inconsistent across launchers and devices; an in-app numpad gives exact control over decimal handling, backspace, and 44pt targets. The numpad's `StyleSheet` is replaced with `className` + HeroUI primitives (`Pressable` keys, Sora typography), but behavior and layout are unchanged.

Hero header layout (top of sheet, below TypeTabs):

```
                EGP  122,300.50
                ─────────────────
```

- Currency code on the left (`text-muted`, ~60% of amount font size) — NEW affordance; currently no currency indicator is shown.
- Amount itself in Sora Extra at 40pt, colored per type (same color map as 2.2).
- Underline divider in `border-separator`.

When `amountStr` is empty / `'0'`, show `'0'` in `text-muted`.

Error message (`text-danger`, Inter Regular, micro) sits directly below.

### 2.4 Account picker (From / To) — sheet-on-sheet via `Sheet`, `size="md"`

Stack a second `Sheet` over the form sheet. Gorhom v5 supports stacking; we verify this on Android Fabric early in implementation (Risk 1).

Label semantics:

| Type        | From label   | To label  | Filters |
|---|---|---|---|
| Expense     | "Account"    | —         | All accounts. |
| Income      | "Account"    | —         | All accounts. |
| Transfer    | "From"       | "To"      | Both: exclude CreditCard accounts. To picker also excludes the From's `account_id`. |
| CC Payment  | "From"       | "To"      | From: exclude CreditCard. To: only CreditCard. |

List rendered with HeroUI `ListGroup` + `BottomSheetFlatList`. Each row:
- Color swatch (10pt dot) — runtime hex via `style={{ backgroundColor: account.color ?? defaultBorderToken }}`.
- Account name (Sora Semi, body).
- Balance (Inter Regular, caption, `text-muted`).
- Selected indicator (checkmark) at right when `account.id === selectedId`.

Locked (edit mode) account rows render as read-only `ListGroup` rows with a `lock-outline` icon at right instead of a chevron. **No more flat `View` vs `Pressable` difference** — the visual lock signal is the icon swap only.

### 2.5 Category picker — sheet-on-sheet, `size="lg"`, 3-column grid

The category set is fixed and small (~20 cells); a grid lets users scan visually rather than read a list. Differs from the account picker by design — the content type is different.

Each cell: HeroUI `Chip` with `variant="bordered"`. Active = `borderColor` set to `cairoGold` token + icon/label in gold. Inactive = `border-border`. Check-circle overlay on the active cell.

Filter: `category.type === 'income'` when the form type is Income; `'expense'` otherwise. Transfers and CC Payments **don't open this sheet at all** (no category for those types).

### 2.6 Cross-currency UX — contextual `ListGroup` row + override in-place + live EGP preview

Render the cross-currency row **only when** `requiresRate` is true (from-account is USD OR transfer/CC-payment with USD on either side).

Row 1 (`ListGroup` row, tappable):

```
Exchange Rate                                   1 USD = 50.75 EGP
Using stored rate · last updated 2026-05-12     ┌──────────┐
                                                │  Custom  │
                                                └──────────┘
```

- Left: "Exchange Rate" (Sora Semi, body) + subtitle showing source (`Using stored rate · last updated YYYY-MM-DD` OR `Custom`) in `text-muted`.
- Right: the rate value in Sora Semi + small "Custom" pill / "Reset" link depending on state.
- Container styling: `bg-accent/10 border border-accent/30 rounded-md` (a gold-tinted inset).

Tapping the row → enters override mode in place: the right side becomes a HeroUI `Input` with `keyboardType="decimal-pad"`. A "Reset to global" link below dismisses override and restores `currency_store.rate`.

Row 2 (read-only preview, beneath the rate row):

```
≈ 6,201,162.50 EGP
```

Live-computed: `egp_amount = amount × rate`, rendered with `text-muted` + Inter Regular. Updates on every numpad press. Updates on rate change.

The "last updated YYYY-MM-DD" timestamp is read from a new `currency_store.rate_updated_at` field — added if not present, sourced from the currency-update flow that already writes to `currency_store.rate`.

### 2.7 Date — §6 imperative pattern. **Time UI is dropped.**

Date row only — no time picker UI. The DB column `transaction_time` stays (data layer unchanged); it's auto-populated from the device clock when the sheet opens, and frozen at that value through save. This removes a useless friction step (manually entered time on a delayed entry is fabricated precision anyway) while preserving same-day intra-day ordering in the list.

Date picker UX follows the §6 standard `DateRangeSheet` pattern verbatim:
- iOS: inline spinner (`display="spinner"` for single-date), conditionally mounted.
- Android: trigger button → conditionally mount the picker (imperative pattern, fixes the re-pop loop from §6 PR #82).

`maximumDate = new Date()` — no future-dated transactions in §7.

Date row visual: HeroUI `ListGroup` row with calendar icon, formatted-date value (e.g. "May 18, 2026"), and a chevron / trigger affordance.

### 2.8 Save CTA — sticky footer, `Button` variant `primary`

Sticky footer outside `BottomSheetScrollView`. Use `Button` from `components/ui/button` (the project wrapper).

States:

| State    | Visual |
|---|---|
| Default  | Gold gradient bg, midnight-blue label. Label: "Save Transaction" / "Save Changes". |
| Disabled | `opacity-50`, `disabled` prop; tapping is no-op. |
| Loading  | Same gold bg; label swapped to `ActivityIndicator`; width fixed so layout doesn't shift. |
| Error    | Inline `text-danger` caption above the CTA. No modal. |

Footer container: `border-t border-separator pt-2 px-4 pb-6` (matching `Screen` anatomy convention from `CLAUDE.md`).

### 2.9 Edit-vs-Add lock policy — **confirmed**

In Edit mode:

| Field             | Locked? | Notes |
|---|---|---|
| Type              | ✅      | Changing type post-creation would require DB reclassification + orphaned-link cleanup. Out of scope. |
| Account (from)    | ✅      | Moving a transaction across accounts requires full balance-mutation reversal — out of scope. |
| Account (to)      | ✅      | Same as above. |
| Category          | ❌      | Editable for Expense/Income. N/A for Transfer/CCPayment. |
| Amount            | ❌      | Editable. Triggers full balance recompute on save. |
| Exchange rate     | ❌      | Editable when applicable. |
| Date              | ❌      | Editable; `maximumDate = today`. |
| Note              | ❌      | Editable. |

Visual: locked fields render with the same `ListGroup` row styling as editable, but with a `lock-outline` icon at right (no chevron). The locked type appears as a `Chip variant="flat"` in the type's color in the sheet subtitle — not a full disabled TypeTabs row (which wastes vertical space).

### 2.10 Empty / no-accounts state — gate the sheet

If the user opens "Add Transaction" with zero accounts (`accountStore.state.accounts.length === 0`), the sheet body renders `EmptyState` instead of the form:

- Icon: `bank-off`.
- Title: "No Accounts Yet" (new key: `Strings.addTxNoAccountsTitle`).
- Body: "Add an account first to record transactions." (new key: `Strings.addTxNoAccountsBody`).
- CTA: "Add Account" — dismisses the sheet and navigates to the account-creation route (existing route, decided by Sarah at plan time).

Edit mode doesn't apply this guard — by definition, an editable transaction implies the account exists.

If account store is mid-hydration, show a `Skeleton` row for up to 300ms then resolve to either the empty state or the form. (Hydration race exists today and would otherwise produce a flicker.)

---

## 3. Financial Logic (Layla)

### 3.1 Rule-by-rule ratification

| # | Rule | Verdict | Notes |
|---|---|---|---|
| 1 | Amount > 0, stored positive, type-driven sign | **Hold** | Standard PF convention; avoids sign-ambiguity in queries. |
| 2 | Four types: Expense / Income / Transfer / CC Payment | **Hold** | `cc_payment` is asymmetric (asset debit, liability reduce); correctly distinct from `transfer`. |
| 3 | CC Payment: source non-CC asset, target CC | **Hold** | See 3.5 for the CC→CC edge case workaround. |
| 4 | Transfer: neither side may be CC | **Hold** | CC moves route through `cc_payment` to keep type taxonomy accurate. |
| 5 | Cross-currency: `exchange_rate` required when either side is USD | **Hold** | Required even for USD→USD transfer (needed for `egp_amount` net-worth tracking). See 3.4. |
| 6 | Persistence shape | **Hold** | Current `Transaction` entity covers the audit trail; no new column needed for currency-conversion audit. |
| 7 | Conversion math (5 branches) | **Hold all 5** | Add banker's rounding — see 3.2. |
| 8 | `maximumDate = today` | **Hold** | Scheduled tx deferred to §8. |
| 9 | Time HH:mm:ss required | **Change** | Drop from UI; persist auto-`now()` from device clock at sheet-open time. DB column unchanged. |
| 10 | Categories: Expense/Income only | **Hold** | Transfers don't get optional categories (scope creep with zero analytical gain in §7). |

### 3.2 Rounding policy (NEW)

All computed monetary fields (`egp_amount`, `to_amount`) are persisted with **round-half-even (banker's rounding) to 2 decimal places**. Raw JS floating-point math accumulates errors that compound across net-worth aggregations.

Helper to add at `utils/money.ts`:

```ts
/** Round to 2 decimal places using banker's rounding (round-half-even). */
export function roundMoney(n: number): number {
  const scaled = n * 100;
  const rounded = Math.round(scaled);
  // Adjust for half-even: if exactly .5 away, round to nearest even
  if (Math.abs(scaled - Math.trunc(scaled) - 0.5) < Number.EPSILON) {
    const truncated = Math.trunc(scaled);
    return (truncated % 2 === 0 ? truncated : truncated + Math.sign(scaled)) / 100;
  }
  return rounded / 100;
}
```

Apply `roundMoney()` to every conversion result before persisting (`egp_amount`, `to_amount`) and before display in the live EGP preview.

### 3.3 Audit trail — current shape is sufficient

`amount` IS the original entered figure (not a derived value). With `currency` and `exchange_rate`, the full audit chain is reconstructible. No new columns needed for cross-currency audit.

### 3.4 Cross-currency edge case: USD → USD transfer

The form-level rule "`exchange_rate` required when either side is USD" fires correctly. `to_amount = amount` (same-currency branch), but `egp_amount = amount × rate` is still needed for net-worth tracking. **Not a bug** — clarify in the entity docstring that for USD→USD transfers, `exchange_rate` exists solely to compute `egp_amount`, not to convert `to_amount`.

Action: edit `database/entities/transaction.entity.ts` comment on `exchange_rate` to add the USD→USD clarification.

### 3.5 CC → CC balance transfer — blocked at form, workaround documented

A CC-to-CC balance transfer (one CC pays off another) is fundamentally different from both transfer and cc_payment (it involves two liabilities). It cannot be correctly modeled with the four-type taxonomy.

For §7: form continues to block this (current rule 3 holds). For users who need to record it, document the workaround in CLAUDE.md `Business Rules`:

> Recording a CC-to-CC balance transfer: split into two transactions — (1) Income on the receiving card with category "CC Balance Transfer In", (2) Expense on the originating card with category "CC Balance Transfer Out". Net-worth queries that aggregate `egp_amount` must exclude transactions tagged with these categories.

Required category seeds in migration: `"CC Balance Transfer In"` (income) and `"CC Balance Transfer Out"` (expense). Marker for downstream reporting. See migration plan in §4.6.

### 3.6 Refunds and negative amounts

**Not supported.** Model refunds as positive Income with a "Refund — {Category}" category. This is the convention every personal-finance app uses for single-entry models.

### 3.7 Stored rate freshness

A new field `rate_updated_at` (ISO date) is added to `currency_store` and surfaced in the Exchange Rate row subtitle (see 2.6). If the rate is stale (>30 days), the subtitle gets a `text-warning` color cue. The user is free to save anyway — the warning is informational, not blocking.

### 3.8 Installments hook (cross-section flag for §8)

Add a nullable FK column on `transactions`: `installment_id`. No FK constraint enforcement in §7 (the `installments` table doesn't exist yet). No UI. §8 will fill in the meaning.

Rationale: schema patches mid-stream are messy. Reserving one nullable column in §7 costs one migration line and unblocks §8 cleanly.

---

## 4. Architecture (Tariq)

### 4.1 Folder layout

V2 implementation lives at `screens/transactions/transaction_form_v2/` during build-out. After flag flip + cleanup, it moves into `screens/transactions/transaction_form/` (replacing V1).

```
screens/transactions/transaction_form_v2/
  index.tsx                            # exports AddTransactionSheet + EditTransactionSheet (≈80 lines)
  add_transaction.hook.ts              # form logic, validation, save
  add_transaction.state.ts             # UI state (visibility, picker open, override toggle, saving)
  add_transaction.store.ts             # form data state (type, amountStr)
  edit_transaction.hook.ts             # edit-mode logic
  edit_transaction.state.ts
  edit_transaction.store.ts
  edit_transaction.helpers.ts          # buildDefaultsFromTx
  transaction_form_body.tsx            # the shared UI (Add + Edit consume this)
  components/
    type_tabs.tsx                      # HeroUI Tabs wrapper OR tv() row, per Tariq's evaluation
    account_picker_sheet.tsx           # Sheet + ListGroup + BottomSheetFlatList
    category_picker_sheet.tsx          # Sheet + 3-column grid of Chips
    exchange_rate_row.tsx              # contextual rate UI (override in place + EGP preview)
    amount_hero.tsx                    # currency code + amount + per-type color
    numpad.tsx                         # ported to className/HeroUI primitives
    date_row.tsx                       # date trigger + §6-style platform-split picker
    no_accounts_empty.tsx              # EmptyState shell + Add Account CTA
```

Hook returns the standard `{ state: { ... }, ...flat actions }` shape per CLAUDE.md store/state convention.

### 4.2 Data model

#### Migration 010 — installment hook (NEW)

`database/migrations/010_add_installment_id.ts`:

```ts
export const migration010 = {
  version: 10,
  up: `
    ALTER TABLE transactions ADD COLUMN installment_id TEXT REFERENCES installments(id);
  `,
};
```

Note: no FK enforcement in §7 because `installments` table doesn't exist yet. SQLite tolerates this — the constraint is parsed but lazy until both tables exist. §8 will add the `installments` table and the FK becomes live then.

Append to `database/migrations/index.ts`. **Never edit a shipped migration.**

`Transaction` entity gains:

```ts
/** FK to installments.id; set when this transaction is part of an installment plan. Wired up in §8. */
installment_id: string | null;
```

#### Currency store — add `rate_updated_at`

If not already present, add `rate_updated_at: string` (ISO) to `currency_store` state. Source: whichever flow writes `rate` already (likely settings). If absent, default to `created_at` of the row in `app_settings`.

### 4.3 State shape

Per CLAUDE.md store/state convention:

```ts
// add_transaction.state.ts (UI state)
interface AddTransactionStateShape {
  visible: boolean;
  saving: boolean;
  showAccountPicker: boolean;
  showToPicker: boolean;
  showCategoryPicker: boolean;
  rateOverride: boolean;
}

// add_transaction.store.ts (form data state)
interface AddTransactionStoreShape {
  type: TransactionType;
  amountStr: string;
}
```

Both shapes match V1 — no churn here. RHF holds the rest (accountId, toAccountId, categoryId, note, date, time, exchangeRate).

`time` stays in the form state for now (still persisted) but is never rendered; it's set once at sheet-open time via `useEffect` from the device clock.

### 4.4 Validation (Zod)

Schema lives in `add_transaction.hook.ts` and `edit_transaction.hook.ts` (one each). Logic is the V1 logic with these adjustments:

1. Apply `roundMoney()` to `egp_amount` and `to_amount` in `onValid()` before passing to `addTransaction()` / `updateTransaction()`.
2. `time` is no longer user-input; default to `new Date().toTimeString().slice(0, 8)` at form-open; not re-validated.
3. Categories list filter: when type is Income, surface the seeded `"Refund — *"` and `"CC Balance Transfer In"` categories. When type is Expense, surface `"CC Balance Transfer Out"`. (Marker categories from 3.5/3.6.)

### 4.5 Key API patterns

#### Sheet shell (declarative)

```tsx
import { Sheet } from '@/components/ui/sheet';
import { useShallow } from 'zustand/react/shallow';

export function AddTransactionSheet({ visible, onClose }: AddProps) {
  const hook = useAddTransaction(onClose);

  return (
    <Sheet visible={visible} onClose={onClose} title={Strings.addTxTitle} size="lg">
      <Sheet.Body>
        {hook.state.hasAccounts ? <TransactionFormBody {...hook.state} {...hook} /> : <NoAccountsEmpty onAddAccount={...} />}
      </Sheet.Body>
    </Sheet>
  );
}
```

No `useRef`, no `.show()` / `.hide()`. Pure declarative props.

#### Sheet-on-sheet stacking

Account picker and category picker render as siblings of the form body, each in their own `Sheet`, gated by `state.showAccountPicker` / `state.showCategoryPicker`. Gorhom v5 supports stacking — verified in §6 (DateRangeSheet stacked with FilterSheet).

```tsx
<Sheet visible={state.showAccountPicker} onClose={() => setShowAccountPicker(false)} title="From" size="md">
  <Sheet.Body>
    <BottomSheetFlatList data={accountsForFrom} renderItem={...} />
  </Sheet.Body>
</Sheet>
```

#### Date picker (§6 imperative pattern)

```tsx
{Platform.OS === 'android' ? (
  <>
    <Pressable onPress={() => setShowDatePicker(true)}>{formattedDate}</Pressable>
    {showDatePicker ? (
      <DateTimePicker
        value={dateAsDate}
        mode="date"
        maximumDate={new Date()}
        onChange={(event, d) => {
          setShowDatePicker(false);
          if (event.type === 'set' && d) setDate(d.toISOString().slice(0, 10));
        }}
      />
    ) : null}
  </>
) : (
  // iOS: spinner display, inline, conditionally rendered via toggle
)}
```

#### Numpad → system keyboard coexistence (Risk 2)

Two `TextInput`s in the V2 form can summon the system keyboard: the **note** field and (when override mode is active) the **exchange rate** `Input`. The custom numpad sits below them in the form layout. When either input is focused, the system keyboard would cover the numpad and force a layout collision.

Two options:

- **A:** Hide the numpad when any `TextInput` is focused, restore on blur.
- **B:** Always render the numpad and let the system keyboard cover it. Visual jank.

Use **Option A**. Wire via `Keyboard.addListener('keyboardDidShow' / 'keyboardDidHide')` in `transaction_form_body.tsx`. The numpad is conditionally rendered based on a `keyboardVisible` boolean held in `transaction_form_body.state.ts` (UI state, per CLAUDE.md anatomy convention).

### 4.6 Strings & seed data

New `Strings` keys (`constants/strings.ts`):

```ts
// §7 new
addTxNoAccountsTitle: 'No Accounts Yet',
addTxNoAccountsBody: 'Add an account first to record transactions.',
addTxNoAccountsCta: 'Add Account',
addTxRateSourceStored: 'Using stored rate',
addTxRateSourceCustom: 'Custom rate',
addTxRateLastUpdated: 'Last updated {{date}}',
addTxRateReset: 'Reset to global',
addTxEgpPreview: '≈ {{amount}} EGP',
ccBalanceTransferInCategoryName: 'CC Balance Transfer In',
ccBalanceTransferOutCategoryName: 'CC Balance Transfer Out',
```

Seed data migration `database/migrations/011_add_cc_balance_transfer_categories.ts` — follows the `009_add_other_income_category.ts` pattern:

```ts
export const migration011 = {
  version: 11,
  up: `
    INSERT OR IGNORE INTO categories (id, name, type, icon, color, created_at)
    VALUES
      ('cc-balance-transfer-in',  'CC Balance Transfer In',  'income',  'swap-horizontal', '#9B73D4', strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      ('cc-balance-transfer-out', 'CC Balance Transfer Out', 'expense', 'swap-horizontal', '#9B73D4', strftime('%Y-%m-%dT%H:%M:%fZ','now'));
  `,
};
```

Append to `database/migrations/index.ts`. Color reuses the CC Payment accent (the same `#9B73D4` that §2.2 promotes to `text-accent-cc`); icon `swap-horizontal` matches the semantic of a sideways money move. Both values are final, not placeholders — Dev does not need to choose at implementation time.

### 4.7 Tests

| File | What it covers |
|---|---|
| `__tests__/screens/transactions/transaction_form/add_transaction.hook.test.ts` | Validation per type (positive, transfer, cc_payment); rounding; rate-required logic; cross-currency math 5 branches; USD→USD edge case. |
| `__tests__/screens/transactions/transaction_form/edit_transaction.hook.test.ts` | Lock policy; rate override default initialized from stored tx; save → update. |
| `__tests__/utils/money.test.ts` | `roundMoney()` covers .005, .015, .025, .035 half-even cases. |
| `__tests__/screens/transactions/transaction_form/components/exchange_rate_row.test.tsx` | Stored vs override mode; live EGP preview; reset-to-global. |
| `__tests__/screens/transactions/transaction_form/components/date_row.test.tsx` | iOS + Android paths; maximumDate; §6 imperative pattern. |
| `__tests__/screens/transactions/transaction_form/components/no_accounts_empty.test.tsx` | Renders when accounts.length === 0; CTA navigates correctly. |
| `__tests__/database/migrations/010_add_installment_id.test.ts` | Column added; existing transactions get NULL. |
| `__tests__/database/migrations/011_add_cc_balance_transfer_categories.test.ts` | Both seed categories inserted with correct type/icon/color; idempotent re-run. |

Coverage targets per CLAUDE.md: 80% lines / 95% functions / 100% branches.

### 4.8 Migration & legacy cleanup (follows §5/§6 pattern)

Three waves:

1. **Build alongside.** Implement V2 at `screens/transactions/transaction_form_v2/`. Flag-gate at the import site (`screens/transactions/index.tsx` for the Add sheet, `screens/transactions/detail/index.tsx` for the Edit sheet). V2 is dark on main.
2. **Manual QA + flag flip.** User walks the device QA matrix. PR flips `newAddTransaction: false → true`. V2 goes live.
3. **Cleanup.** Delete `screens/transactions/transaction_form/`; `git mv transaction_form_v2/* transaction_form/`. Remove the flag from `constants/feature_flags.ts` and the flag-gate conditional. Update `__tests__/feature_flags.test.ts`. Remove the 3 entries from CLAUDE.md `Bottom Sheets` legacy actions-sheet consumers list. Since these were the last 3 entries in the `transaction_form/` tree, ratify CLAUDE.md's note about removing the dep "no earlier than §9" — after §7 ships, §8 (commitments) + §9 (accounts) consumers remain.

Cleanup PR follows immediately after the flag flip PR per the 5-business-day rule in `constants/feature_flags.ts` header.

### 4.9 Risks & mitigations

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| 1 | Sheet-on-sheet gesture conflict or backdrop bleed on Android Fabric (gorhom v5) | **HIGH** | Validate on real device in the very first implementation wave (a 1-screen prototype before any picker UI). If broken, fall back to rendering pickers as full-screen modals — captured as a contingency in the plan, not mid-build. |
| 2 | Numpad + system keyboard coexistence | MEDIUM | Option A from §4.5: hide numpad on `keyboardDidShow`. Wired into `transaction_form_body.tsx`. |
| 3 | HeroUI Tabs per-item active-color API | LOW | Tariq evaluates `Tabs` API during plan-writing. If insufficient, use `tv()`-composed row — already-known pattern in this codebase. Decision made before any task begins. |
| 4 | Floating-point rounding accumulating in net-worth aggregations | MEDIUM | `roundMoney()` helper (§3.2) applied to every persisted monetary field. Unit-tested. |
| 5 | Stale stored exchange rate producing incorrect `egp_amount` for USD transactions | MEDIUM | Surface `rate_updated_at` in the rate row subtitle; warn-color when >30 days stale. User can update via settings flow (existing). |
| 6 | Banker's-rounding implementation edge cases at exact-half values | LOW | Unit tests at `__tests__/utils/money.test.ts` cover 0.005 / 0.015 / 0.025 / 0.035 to lock the invariant. |
| 7 | Migration 010 with FK to non-existent `installments` table | LOW | SQLite tolerates lazy FK definition. Verified with a unit test on the migration that inserts a transaction post-migration. |
| 8 | CC balance-transfer workaround leaking into net-worth queries | MEDIUM (cross-section to §9) | Document in CLAUDE.md `Business Rules`. Net-worth queries in §9 (Accounts) must exclude the two marker categories. **Flagged here, owned by §9 spec.** |

---

## 5. Open Questions

These are issues that need a decision but don't block spec sign-off. Each is captured in §4.9 risks or has a documented resolution path. Listed here for sign-off awareness.

1. **HeroUI Tabs per-item active color API** — Tariq investigates during plan-writing. Fallback (`tv()` row) is documented. Decision before implementation begins.
2. **Sheet-on-sheet on Android Fabric** — Tariq's first implementation step is a device prototype to validate. Contingency (full-screen pickers) captured.
3. **Numpad keyboard coexistence** — Resolved (Option A in §4.5).
4. **CC balance-transfer query design** — Flagged to §9, not a §7 blocker.
5. **Stored rate `rate_updated_at` source** — Implementation detail; Tariq locates the source field at plan-writing time (likely `currency_store.rate_updated_at`, or backfilled from `app_settings.updated_at`).
6. **Add-account navigation target** — `/accounts/add` exists? Sarah confirms at plan time. If not, the CTA dismisses the sheet and the user manually navigates via settings — graceful fallback.

---

## 6. Acceptance Criteria

For the spec to be considered shipped:

- [ ] All 3 legacy `react-native-actions-sheet` consumers in `transaction_form/` are removed.
- [ ] Add Transaction and Edit Transaction sheets work end-to-end on Android and iOS device builds (manual QA matrix).
- [ ] All 4 type flows save and reverse correctly (`addTransaction`, `updateTransaction`, `deleteTransaction`).
- [ ] Cross-currency math passes the 5 conversion-branch unit tests with banker's rounding applied.
- [ ] Empty / no-accounts state blocks the form correctly.
- [ ] No hardcoded hex literals in any V2 file (`#4A9EE0`, `#9B73D4` are promoted to tokens; account-color hex stays via `style={{ backgroundColor }}` per CLAUDE.md).
- [ ] Time picker UI is gone; `transaction_time` is still persisted on save.
- [ ] Coverage thresholds (80/95/100) hold or improve.
- [ ] CLAUDE.md `Bottom Sheets` legacy consumers list is shortened by 3 entries.
- [ ] CLAUDE.md `Business Rules` gets the CC balance-transfer workaround entry.
- [ ] `transaction.entity.ts` gets the `installment_id` field with docstring; migration 010 ships.

---

## 7. Appendix — Reference apps consulted

YNAB (transaction quick-add sheet pattern), Monarch (no-accounts blocking state, rate-display pattern), Revolut (cross-currency live preview), Money Manager Ex (numpad design), N26 (locked-field iconography in edit).
