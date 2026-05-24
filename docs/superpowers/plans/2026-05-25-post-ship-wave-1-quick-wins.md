# Post-Ship Wave 1 — Quick Wins Implementation Plan

> **Source:** `docs/superpowers/reviews/2026-05-24-post-ship-heroui-consistency-review.md` → "Suggested fix waves" #1.
> **Goal:** Low-risk, high-confidence cleanup with zero rendered-text regressions. No new logic, no schema/auth/dep changes → no critical triggers.

**Branch:** `feat/post-ship-wave-1-quick-wins` (off `origin/main` @ `fa6953e`)

**Architecture:** Pure cleanup — delete unreferenced files, swap an off-brand hex for the canonical token, format one date, centralize literals into `constants/strings.ts` (preserving exact on-screen text), and remove a stale doc note. Existing logic-only test suite + CI parity is the safety net; no new tests (no logic changes, and UI-render tests are not written per project policy).

---

## Pre-flight validation (done 2026-05-25)

All items re-validated against current `main`:
- `Numpad` component: **zero importers** (grep `import.*Numpad` / `<Numpad` / `from.*numpad` → none). `handleNumpad` store action is separate and **heavily used** (hooks + ~50 test assertions) → **stays**.
- `useTabAnim` (`categories.anim.ts`): **zero importers** → file is fully dead.
- `#D4AF37`: 5 live occurrences across 4 files (matches no token). Closest brand token = `GoldTokens[500]` `#D4A44C`.
- `pay_sheet.tsx:105`: confirmed raw `{payment.due_date}`.
- String targets: some keys exist with **identical** values (clean swap), some with **different** values, some **missing** → new keys added to preserve current text.
- `react-native-actions-sheet`: **not** in `package.json`, `patches/` empty, **no imports** anywhere → CLAUDE.md note is stale.

---

## Task 1: Delete dead code

**Files:**
- Delete: `screens/transactions/transaction_form/components/numpad.tsx`
- Delete: `screens/settings/categories/categories.anim.ts`

- [ ] `git rm` both files.
- [ ] Verify no dangling import: `grep -rn "categories.anim\|components/numpad\|<Numpad\|useTabAnim" screens app __tests__` → expect no matches.
- [ ] `npm run typecheck` → expect 0 errors.

---

## Task 2: Replace off-brand `#D4AF37` → `GoldTokens[500]`

`GoldTokens[500]` = `#D4A44C` (canonical, from `@/constants/theme_tokens`). These are module-level / icon `color` props (not `className`), so the token import is the correct mechanism per CLAUDE.md.

**Files & edits:**
- `screens/transactions/components/transaction_row.tsx:145` — `category?.color ?? '#D4AF37'` → `category?.color ?? GoldTokens[500]`
- `screens/transactions/detail/components/transfer_flow_card.tsx:46,93` — `color="#D4AF37"` → `color={GoldTokens[500]}`
- `screens/transactions/filter/components/account_accordion.tsx:92` — `color="#D4AF37"` → `color={GoldTokens[500]}`
- `screens/transactions/filter/components/category_accordion.tsx:93` — `color="#D4AF37"` → `color={GoldTokens[500]}`

- [ ] Add `import { GoldTokens } from '@/constants/theme_tokens';` to each file that lacks it (check existing imports first).
- [ ] `grep -rn "D4AF37" screens components constants` → expect no matches.
- [ ] `npm run typecheck`.

---

## Task 3: Fix `pay_sheet.tsx` raw-ISO date

**File:** `screens/commitments/detail/components/pay_sheet.tsx:105`

- [ ] Confirm sibling payment displays (`payment_row.tsx`, `current_cycle_card.tsx`) formatter; match it (expected `formatShortDate`).
- [ ] Add `formatShortDate` to the existing `@/utils/format_date` import.
- [ ] `{payment.due_date}` → `{formatShortDate(payment.due_date)}`.
- [ ] `npm run typecheck`.

---

## Task 4: Centralize hardcoded strings

**Principle:** preserve exact current rendered text. Where the canonical key's value differs, add a new key matching the current literal rather than changing copy.

**4a — New keys in `constants/strings.ts`** (group near related keys):
```ts
addTxTypeCcPayment: 'CC Payment',
statTxsUnit: 'txs',
filterAmountUpTo: 'Up to',
filterAmountFrom: 'From',
currencyManualShort: 'Manual',
```

**4b — Clean swaps (existing keys, identical values):**
- `screens/dashboard/components/hero_card.tsx:155` — `{totalAccounts} accounts` → `{totalAccounts} {Strings.o6AccountsUnit}`
- `screens/dashboard/components/hero_card.tsx:116` — `Manual` → `{Strings.currencyManualShort}`
- `screens/transactions/transaction_form/components/exchange_rate_row.tsx:75` — `Exchange Rate` → `{Strings.currencyRateLabel}`
- `screens/transactions/components/type_chips.tsx:15-18` — `'All'`/`'Income'`/`'Expense'`/`'Transfer'` → `Strings.filterAll`/`Strings.addTxTypeIncome`/`Strings.addTxTypeExpense`/`Strings.addTxTypeTransfer`
- `screens/transactions/components/type_chips.tsx:23` — `'CC Payment'` → `Strings.addTxTypeCcPayment`
- `screens/dashboard/components/stat_cards.tsx:192` — `{monthSpendCount} txs` → `{monthSpendCount} {Strings.statTxsUnit}`
- `screens/transactions/filter/filter.helpers.ts:48-49` — `Up to ${max}` / `From ${min}` → `${Strings.filterAmountUpTo} ${max}` / `${Strings.filterAmountFrom} ${min}`

**4c — search_row:** `screens/transactions/components/search_row.tsx:29,32` — placeholder + a11y `"Search transactions"` → `Strings.searchTransactionsPlaceholder` (`'Search transactions…'` — adds standard ellipsis affordance; field-level, accepted).

- [ ] Add `import { Strings } from '@/constants/strings';` where missing.
- [ ] `npm run typecheck` + `npm test -- --ci` (filter.helpers / store tests still assert identical output text → must stay green).

**Excluded from this wave:** `detail_hero.tsx` type labels (duplicate `detail.hook.ts` `TYPE_BADGE` → dedup, Wave 2); `exchange_rate_row`/`no_accounts_empty` wrapper-bypass imports (Lens-1, Wave 4).

---

## Task 5: Remove stale `react-native-actions-sheet` note from CLAUDE.md

- [ ] Tech-stack line: delete `react-native-actions-sheet (legacy, phasing out §4–§9; do NOT add new usages) · `.
- [ ] "Bottom Sheets" section: delete the entire `**react-native-actions-sheet — LEGACY...**` subsection (the paragraph + the "Legacy consumers still in-flight" paragraph). Keep the `Sheet`/`BottomSheet*` current-pattern guidance above it.
- [ ] `grep -n "actions-sheet" CLAUDE.md` → expect no matches.

---

## Task 6: CI parity, commit, PR, review

- [ ] Ensure worktree env: real `node_modules` present + `expo-env.d.ts` present (copy from main if missing).
- [ ] Full CI parity chain (format:check → lint → typecheck → jest --ci → expo-doctor → prebuild --no-install android). Fix-and-rerun until green.
- [ ] Commit (one focused commit), push, open PR with summary + test plan.
- [ ] Independent code review (Tariq lens). Merge on the user's behalf if clean (non-critical wave); escalate only if a trigger surfaces.
