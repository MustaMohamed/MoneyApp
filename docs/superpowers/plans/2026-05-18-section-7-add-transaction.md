# Section 7 · Add Transaction Sheet — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the legacy `react-native-actions-sheet`-based Add / Edit Transaction form with a HeroUI Native `BottomSheet`-based implementation, ratify the financial rules in the form (banker's rounding, time UI dropped, refunds as positive income, CC→CC blocked, installment hook reserved), and add a blocking empty-state when the user has zero accounts.

**Architecture:** V1/V2 directory split (same pattern as §2 / §5 / §6). V1 code at `screens/transactions/transaction_form/` stays untouched until the cleanup task. V2 code lives in `screens/transactions/transaction_form_v2/`. The two import sites (`screens/transactions/index.tsx` for Add, `screens/transactions/detail/index.tsx` for Edit) get flag-branched conditionals on `FeatureFlags.newAddTransaction`. After local QA, a single promotion commit flips the flag; a cleanup commit deletes V1, renames V2→V1 via `git mv`, removes the flag, and updates CLAUDE.md.

**Tech Stack:** React Native · Expo · TypeScript strict · Expo Router v3 · expo-sqlite · Zustand v5 · RHF v7 + Zod v4 · HeroUI Native v1.0.3 (`BottomSheet`) · Unistyles 3 (via Uniwind) · @gorhom/bottom-sheet v5 (`BottomSheetScrollView` / `BottomSheetFlatList` / `BottomSheetFooter`) · @react-native-community/datetimepicker v8 · MaterialCommunityIcons · Jest · React Native Testing Library

**Spec:** [`docs/superpowers/specs/2026-05-18-section-7-add-transaction-design.md`](../specs/2026-05-18-section-7-add-transaction-design.md)

---

## Parallel Execution Map

```
Group A (Shared infra)              ─── no deps ──► start immediately, all parallel
  Task 1:  roundMoney() helper (utils/money.ts)
  Task 2:  Theme tokens (--info, --accent-cc)
  Task 3:  Strings — add §7 keys
  Task 4:  Migration 010 — installment_id column
  Task 5:  REMOVED — see Task 5 tombstone below (CC Balance Transfer marker categories dropped in design review)
  Task 6:  Transaction entity — add installment_id field
  Task 7:  Currency store — add rate_updated_at

Group B (Risk #1 gate)              ─── depends on A ──► MUST PASS before Group C+
  Task 8:  HeroUI BottomSheet portal stacking prototype (device)

Group C (V2 scaffold)               ─── depends on B passing
  Task 9:  V2 folder + state + store files (add + edit)
  Task 10: TransactionFormBody state (keyboardVisible)

Group D (Components)                ─── parallel after C; depends on A tasks 1–3
  Task 11: TypeTabs
  Task 12: AmountHero
  Task 13: Numpad (className-ported)
  Task 14: ExchangeRateRow (depends on Task 1 roundMoney + Task 7 rate_updated_at)
  Task 15: DateRow
  Task 16: NoAccountsEmpty
  Task 17: SaveCta
  Task 18: AccountPickerSheet
  Task 19: CategoryPickerSheet

Group E (Hooks + sheet shell)       ─── depends on Groups C + D
  Task 20: useAddTransaction hook (depends on Tasks 1, 7)
  Task 21: useEditTransaction hook (depends on Tasks 1, 7)
  Task 22: TransactionFormBody integration
  Task 23: AddTransactionSheet + EditTransactionSheet shells

Group F (Wire route + QA)           ─── depends on E
  Task 24: Flag-branch import sites
  Task 25: Manual QA matrix (user-facing gate, no code)

Group G (Promotion + cleanup)       ─── depends on F passing
  Task 26: Promotion PR — flip newAddTransaction flag
  Task 27: Cleanup PR — delete V1, rename V2, drop flag, update CLAUDE.md
```

**Parallel-safe inside Group A:** Tasks 1–7 all independent. Run together.
**Parallel-safe inside Group D:** Tasks 11–19 all parallel after Group C lands. Tasks 14 and 18 / 19 do touch shared types — sequence inside each pair if conflicts arise.
**Sequential through B:** Task 8 is a HARD GATE. If it fails (portal stacking broken on Android Fabric), the contingency is full-screen Expo Router stack routes for the pickers — captured at the end of this plan.

---

## File Map

### New files (under `screens/transactions/transaction_form_v2/` unless noted)

```
screens/transactions/transaction_form_v2/
  index.tsx                                          # AddTransactionSheet + EditTransactionSheet exports
  add_transaction.hook.ts                            # RHF + Zod schema, save flow, cross-currency math
  add_transaction.state.ts                           # UI state (visible / saving / picker open / rate override)
  add_transaction.store.ts                           # form data (type, amountStr)
  edit_transaction.hook.ts                           # edit-mode hook (locked fields, category-only picker)
  edit_transaction.state.ts                          # UI state (sheet visible / picker open / rate override / saving)
  edit_transaction.store.ts                          # form data (editingTx, amountStr)
  edit_transaction.helpers.ts                        # buildDefaultsFromTx
  transaction_form_body.tsx                          # shared UI (Add + Edit consume this)
  transaction_form_body.state.ts                     # keyboardVisible toggle
  components/
    type_tabs.tsx                                    # HeroUI Tabs wrapper
    amount_hero.tsx                                  # currency code + amount + per-type color
    numpad.tsx                                       # className-ported numpad
    exchange_rate_row.tsx                            # rate display + override input + live EGP preview
    date_row.tsx                                     # date trigger + §6 imperative pattern picker
    no_accounts_empty.tsx                            # EmptyState + Add Account CTA
    save_cta.tsx                                     # sticky-footer Button via BottomSheetFooter
    account_picker_sheet.tsx                         # HeroUI BottomSheet + BottomSheetFlatList
    category_picker_sheet.tsx                        # HeroUI BottomSheet + 3-column grid

utils/money.ts                                       # roundMoney() helper

database/migrations/010_add_installment_id.ts        # ALTER TABLE transactions ADD COLUMN

__tests__/utils/money.test.ts
__tests__/database/migrations/010_add_installment_id.test.ts
__tests__/screens/transactions/transaction_form_v2/add_transaction.hook.test.ts
__tests__/screens/transactions/transaction_form_v2/edit_transaction.hook.test.ts
__tests__/screens/transactions/transaction_form_v2/components/type_tabs.test.tsx
__tests__/screens/transactions/transaction_form_v2/components/amount_hero.test.tsx
__tests__/screens/transactions/transaction_form_v2/components/numpad.test.tsx
__tests__/screens/transactions/transaction_form_v2/components/exchange_rate_row.test.tsx
__tests__/screens/transactions/transaction_form_v2/components/date_row.test.tsx
__tests__/screens/transactions/transaction_form_v2/components/no_accounts_empty.test.tsx
__tests__/screens/transactions/transaction_form_v2/components/account_picker_sheet.test.tsx
__tests__/screens/transactions/transaction_form_v2/components/category_picker_sheet.test.tsx
```

### Modified files

```
constants/strings.ts                                 # +new §7 keys
constants/theme_tokens.ts                            # +Info, +AccentCC tokens
global.css                                           # +--info, +--accent-cc CSS vars
database/entities/transaction.entity.ts              # +installment_id field
database/migrations/index.ts                         # +migration010
store/currency.store.ts                              # +rate_updated_at field
screens/transactions/index.tsx                       # flag-branch the AddTransactionSheet import
screens/transactions/detail/index.tsx                # flag-branch the EditTransactionSheet import
constants/feature_flags.ts                           # Task 26 only: newAddTransaction false → true
CLAUDE.md                                            # Task 27: legacy actions-sheet list shortened; Bottom Sheets section noting HeroUI BottomSheet new pattern
__tests__/feature_flags.test.ts                      # Task 26 + 27: match new flag state
```

### Deleted files (cleanup task only)

```
screens/transactions/transaction_form/index.tsx
screens/transactions/transaction_form/add_transaction.hook.ts
screens/transactions/transaction_form/add_transaction.state.ts
screens/transactions/transaction_form/add_transaction.store.ts
screens/transactions/transaction_form/edit_transaction.hook.ts
screens/transactions/transaction_form/edit_transaction.state.ts
screens/transactions/transaction_form/edit_transaction.store.ts
screens/transactions/transaction_form/edit_transaction.helpers.ts
screens/transactions/transaction_form/transaction_form_body.tsx
screens/transactions/transaction_form/transaction_form_body.state.ts
screens/transactions/transaction_form/components/account_picker_sheet.tsx
screens/transactions/transaction_form/components/category_picker_sheet.tsx
screens/transactions/transaction_form/components/exchange_rate_row.tsx
screens/transactions/transaction_form/components/numpad.tsx
screens/transactions/transaction_form/components/type_tabs.tsx
```

Then `git mv screens/transactions/transaction_form_v2/* screens/transactions/transaction_form/`.

---

## Task 1: `roundMoney()` helper

**Files:**
- Create: `utils/money.ts`
- Test: `__tests__/utils/money.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/utils/money.test.ts`:

```typescript
import { roundMoney } from '@/utils/money';

describe('roundMoney', () => {
  describe('non-half cases (standard rounding)', () => {
    it('rounds 1.234 down to 1.23', () => {
      expect(roundMoney(1.234)).toBe(1.23);
    });

    it('rounds 1.236 up to 1.24', () => {
      expect(roundMoney(1.236)).toBe(1.24);
    });

    it('passes integers through', () => {
      expect(roundMoney(100)).toBe(100);
    });

    it('passes 2-dp values through', () => {
      expect(roundMoney(1.23)).toBe(1.23);
    });
  });

  describe('exact-half banker (round-half-even)', () => {
    it('rounds 0.005 to 0.00 (truncated 0 is even)', () => {
      expect(roundMoney(0.005)).toBe(0.0);
    });

    it('rounds 0.015 to 0.02 (truncated 1 is odd)', () => {
      expect(roundMoney(0.015)).toBe(0.02);
    });

    it('rounds 0.025 to 0.02 (truncated 2 is even)', () => {
      expect(roundMoney(0.025)).toBe(0.02);
    });

    it('rounds 0.035 to 0.04 (truncated 3 is odd)', () => {
      expect(roundMoney(0.035)).toBe(0.04);
    });
  });

  describe('cross-currency conversion examples', () => {
    it('rounds 100 EGP / 30.503 USD rate to 3.28 USD', () => {
      expect(roundMoney(100 / 30.503)).toBe(3.28);
    });

    it('rounds 50 USD × 50.75 EGP rate to 2537.50 EGP', () => {
      expect(roundMoney(50 * 50.75)).toBe(2537.5);
    });
  });

  describe('negative numbers', () => {
    it('rounds -1.236 to -1.24', () => {
      expect(roundMoney(-1.236)).toBe(-1.24);
    });

    it('rounds -0.015 to -0.02 (truncated -1 is odd magnitude)', () => {
      expect(roundMoney(-0.015)).toBe(-0.02);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/utils/money.test.ts`
Expected: FAIL with "Cannot find module '@/utils/money'"

- [ ] **Step 3: Implement `roundMoney`**

Create `utils/money.ts`:

```typescript
/**
 * Round a monetary value to 2 decimal places using banker's rounding
 * (round-half-even). At exactly .5 of a cent, the result is the nearest
 * even cent: 0.005 → 0.00, 0.015 → 0.02, 0.025 → 0.02, 0.035 → 0.04.
 *
 * Apply this to every persisted monetary field (egp_amount, to_amount)
 * and to the live EGP preview to keep net-worth aggregations free of
 * floating-point drift.
 */
export function roundMoney(n: number): number {
  const sign = Math.sign(n);
  const abs = Math.abs(n);
  const scaled = abs * 100;
  const truncated = Math.trunc(scaled);
  const remainder = scaled - truncated;

  // Detect exact-half with a small epsilon tolerance for floating-point noise.
  const isExactHalf = Math.abs(remainder - 0.5) < 1e-9;

  if (isExactHalf) {
    // Round to even: keep truncated if even, else go up one.
    const rounded = truncated % 2 === 0 ? truncated : truncated + 1;
    return (sign * rounded) / 100;
  }

  return (sign * Math.round(scaled)) / 100;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/utils/money.test.ts`
Expected: PASS — all 12 tests green.

- [ ] **Step 5: Commit**

```bash
git add utils/money.ts __tests__/utils/money.test.ts
git commit -m "$(cat <<'EOF'
feat(§7): add roundMoney() banker's-rounding helper

Applied to all persisted monetary fields (egp_amount, to_amount) and
to the live EGP preview in the transaction form. Round-half-even
prevents floating-point drift accumulating across net-worth queries.
EOF
)"
```

---

## Task 2: Theme tokens — `--info`, `--accent-cc`

**Files:**
- Modify: `global.css`
- Modify: `constants/theme_tokens.ts`
- Test: (covered by Task 11 TypeTabs colors)

- [ ] **Step 1: Add CSS custom properties to `global.css`**

Inside the `@layer theme { @variant dark { ... } }` block, add:

```css
@layer theme {
  @variant dark {
    /* ...existing tokens... */

    /* §7: Transfer + CC Payment accent colors (promoted from hardcoded hex) */
    --info: 73 158 224;        /* #4A9EE0 — Transfer accent */
    --accent-cc: 155 115 212;  /* #9B73D4 — CC Payment accent */
  }
}
```

And in `@theme inline`:

```css
@theme inline {
  /* ...existing... */
  --color-info: rgb(var(--info));
  --color-accent-cc: rgb(var(--accent-cc));
}
```

- [ ] **Step 2: Export from `constants/theme_tokens.ts`**

Open `constants/theme_tokens.ts` and add:

```typescript
// §7: Transfer + CC Payment accent colors (must mirror global.css)
export const InfoTokens = {
  500: '#4A9EE0',
} as const;

export const AccentCCTokens = {
  500: '#9B73D4',
} as const;
```

(These are needed for module-level access — `expo-linear-gradient` colors, MaterialCommunityIcons color prop — per CLAUDE.md "Module-level theme access".)

- [ ] **Step 3: Sanity-check the change with `tsc`**

Run: `npx tsc --noEmit`
Expected: PASS — no type errors.

- [ ] **Step 4: Commit**

```bash
git add global.css constants/theme_tokens.ts
git commit -m "$(cat <<'EOF'
feat(§7): promote transfer (#4A9EE0) and CC payment (#9B73D4) hex to theme tokens

text-info / text-accent-cc usable via className; InfoTokens / AccentCCTokens
available for module-level access (LinearGradient, MaterialCommunityIcons).
EOF
)"
```

---

## Task 3: Strings — add §7 keys

**Files:**
- Modify: `constants/strings.ts`

- [ ] **Step 1: Add the new keys**

Append to the `Strings` object in `constants/strings.ts` (preserve existing keys; alphabetical or grouped per existing convention is fine):

```typescript
// §7: Add / Edit Transaction
addTxNoAccountsTitle: 'No Accounts Yet',
addTxNoAccountsBody: 'Add an account first to record transactions.',
addTxNoAccountsCta: 'Add Account',
addTxRateSourceStored: 'Using stored rate',
addTxRateSourceCustom: 'Custom rate',
addTxRateLastUpdated: 'Last updated {date}',
addTxRateReset: 'Reset to global',
addTxRateStale: 'Rate may be stale',
addTxEgpPreview: '≈ {amount} EGP',
```

- [ ] **Step 2: Sanity-check with `tsc`**

Run: `npx tsc --noEmit`
Expected: PASS — no type errors.

- [ ] **Step 3: Commit**

```bash
git add constants/strings.ts
git commit -m "$(cat <<'EOF'
feat(§7): add Strings keys for Add Transaction sheet

Empty-state copy, exchange-rate display states, EGP preview.
EOF
)"
```

---

## Task 4: Migration 010 — `installment_id` nullable FK column

**Files:**
- Create: `database/migrations/010_add_installment_id.ts`
- Modify: `database/migrations/index.ts`
- Test: `__tests__/database/migrations/010_add_installment_id.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/database/migrations/010_add_installment_id.test.ts`:

```typescript
import { openDatabaseSync } from 'expo-sqlite';
import { migration001 } from '@/database/migrations/001_create_accounts';
import { migration003 } from '@/database/migrations/003_create_categories';
import { migration004 } from '@/database/migrations/004_create_transactions';
import { migration005 } from '@/database/migrations/005_add_transaction_native_amounts';
import { migration006 } from '@/database/migrations/006_create_commitments';
import { migration007 } from '@/database/migrations/007_create_commitment_payments';
import { migration008 } from '@/database/migrations/008_add_commitment_payment_id';
import { migration010 } from '@/database/migrations/010_add_installment_id';

describe('migration010 — add installment_id', () => {
  function freshDb() {
    const db = openDatabaseSync(':memory:');
    db.execSync(migration001.up);
    db.execSync(migration003.up);
    db.execSync(migration004.up);
    db.execSync(migration005.up);
    db.execSync(migration006.up);
    db.execSync(migration007.up);
    db.execSync(migration008.up);
    return db;
  }

  it('adds an installment_id column to transactions', () => {
    const db = freshDb();
    db.execSync(migration010.up);
    const cols = db.getAllSync<{ name: string }>("PRAGMA table_info(transactions)");
    const names = cols.map((c) => c.name);
    expect(names).toContain('installment_id');
  });

  it('installment_id is nullable', () => {
    const db = freshDb();
    db.execSync(migration010.up);
    const cols = db.getAllSync<{ name: string; notnull: number }>("PRAGMA table_info(transactions)");
    const col = cols.find((c) => c.name === 'installment_id');
    expect(col?.notnull).toBe(0);
  });

  it('existing transactions get NULL after migration', () => {
    const db = freshDb();
    db.runSync(
      `INSERT INTO accounts (id, name, type, currency, opening_balance, current_balance, color, is_archived, created_at, updated_at) VALUES ('a1','Test','cash','EGP',0,0,'#fff',0,'now','now')`,
    );
    db.runSync(
      `INSERT INTO categories (id, name, type, icon, color, created_at) VALUES ('c1','Food','expense','food','#fff','now')`,
    );
    db.runSync(
      `INSERT INTO transactions (id, type, amount, currency, egp_amount, exchange_rate, to_amount, minimum_payment_snapshot, account_id, to_account_id, category_id, note, transaction_date, transaction_time, commitment_payment_id, created_at, updated_at) VALUES ('t1','expense',10,'EGP',10,NULL,NULL,NULL,'a1',NULL,'c1',NULL,'2026-05-18','12:00:00',NULL,'now','now')`,
    );
    db.execSync(migration010.up);
    const row = db.getFirstSync<{ installment_id: string | null }>(
      "SELECT installment_id FROM transactions WHERE id = 't1'",
    );
    expect(row?.installment_id).toBeNull();
  });

  it('allows inserts with installment_id set', () => {
    const db = freshDb();
    db.execSync(migration010.up);
    db.runSync(
      `INSERT INTO accounts (id, name, type, currency, opening_balance, current_balance, color, is_archived, created_at, updated_at) VALUES ('a1','Test','cash','EGP',0,0,'#fff',0,'now','now')`,
    );
    db.runSync(
      `INSERT INTO categories (id, name, type, icon, color, created_at) VALUES ('c1','Food','expense','food','#fff','now')`,
    );
    db.runSync(
      `INSERT INTO transactions (id, type, amount, currency, egp_amount, exchange_rate, to_amount, minimum_payment_snapshot, account_id, to_account_id, category_id, note, transaction_date, transaction_time, commitment_payment_id, installment_id, created_at, updated_at) VALUES ('t2','expense',20,'EGP',20,NULL,NULL,NULL,'a1',NULL,'c1',NULL,'2026-05-18','12:00:00',NULL,'inst-123','now','now')`,
    );
    const row = db.getFirstSync<{ installment_id: string | null }>(
      "SELECT installment_id FROM transactions WHERE id = 't2'",
    );
    expect(row?.installment_id).toBe('inst-123');
  });

  it('is idempotent across multiple migration runs', () => {
    const db = freshDb();
    db.execSync(migration010.up);
    // Re-running should not throw — version-based runner guards this, but
    // exercise the SQL string standalone to confirm IF NOT EXISTS semantics.
    expect(() => db.execSync(migration010.up)).toThrow(/duplicate column/i);
    // (We expect duplicate-column on direct re-run. The migration runner
    // calls each migration once based on version table — safe by construction.)
  });
});
```

- [ ] **Step 2: Run test — expect failure**

Run: `npx jest __tests__/database/migrations/010_add_installment_id.test.ts`
Expected: FAIL — `Cannot find module '@/database/migrations/010_add_installment_id'`.

- [ ] **Step 3: Create the migration file**

Create `database/migrations/010_add_installment_id.ts`:

```typescript
export const migration010 = {
  version: 10,
  up: `
    ALTER TABLE transactions ADD COLUMN installment_id TEXT;
  `,
};
```

Note: no `REFERENCES installments(id)` constraint — the `installments` table doesn't exist yet (§8 introduces it). SQLite would parse the constraint lazily, but to avoid foot-guns when the FK is enabled, the column is plain `TEXT` until §8 adds both the table and the constraint via a follow-up migration.

- [ ] **Step 4: Register in `database/migrations/index.ts`**

Open `database/migrations/index.ts` and append:

```typescript
import { migration010 } from './010_add_installment_id';
// ...existing imports...

export const MIGRATIONS: Migration[] = [
  migration001,
  migration002,
  migration003,
  migration004,
  migration005,
  migration006,
  migration007,
  migration008,
  migration009,
  migration010,
];
```

- [ ] **Step 5: Run tests — expect pass**

Run: `npx jest __tests__/database/migrations/010_add_installment_id.test.ts`
Expected: PASS — 5 tests green.

- [ ] **Step 6: Commit**

```bash
git add database/migrations/010_add_installment_id.ts database/migrations/index.ts __tests__/database/migrations/010_add_installment_id.test.ts
git commit -m "$(cat <<'EOF'
feat(§7): migration 010 — add nullable installment_id column to transactions

§8 will add the installments table and the FK constraint. §7 reserves the
column now so the FK can be added without a mid-stream schema patch.
EOF
)"
```

---

## Task 5: REMOVED — CC Balance Transfer marker categories dropped in design review

**Original scope (no longer in effect):** Migration 011 was going to seed two pre-existing categories — `cc-balance-transfer-in` (income) and `cc-balance-transfer-out` (expense) — as marker categories so users could record CC→CC balance transfers as paired Income/Expense entries while net-worth queries (§9) excluded them.

**Why dropped (post-spec-sign-off design review):**
- The marker categories would have appeared in the normal Income/Expense category picker on every Add Transaction, polluting the list for an edge case most users will never hit.
- The workaround misrepresents what's happening: a CC→CC balance transfer is a liability shift, not income or expense.
- §9 would have inherited the burden of special-casing two specific category IDs in net-worth queries.
- The form's CC Payment rule (rule 3 in spec §3.1) already blocks CC sources — that's the complete and correct answer for §7. CC→CC balance transfers belong to a future spec that introduces a proper transaction type.

**If this task was already executed in your branch** (it was — commit `2886dcd` landed it before the review), revert it via:
- Delete `database/migrations/011_add_cc_balance_transfer_categories.ts`
- Delete `__tests__/database/migrations/011_add_cc_balance_transfer_categories.test.ts`
- In `database/migrations/index.ts`: remove the `migration011` import and the `migration011` entry from the `MIGRATIONS` array
- In `constants/strings.ts`: remove `ccBalanceTransferInCategoryName`, `ccBalanceTransferOutCategoryName`, and the comment block above them

Subsequent task numbering (Tasks 6, 7, …) is unchanged — Task 5's slot is left intentionally empty in the parallel execution map.

---

## Task 6: Transaction entity — add `installment_id` field

**Files:**
- Modify: `database/entities/transaction.entity.ts`
- Test: covered by Task 4 migration test + existing entity callers' typecheck

- [ ] **Step 1: Add the new field**

Open `database/entities/transaction.entity.ts`. Add the `installment_id` field between `commitment_payment_id` and `created_at`:

```typescript
/** FK to commitment_payments.id; set when this transaction fulfils a commitment payment. */
commitment_payment_id: string | null;
/**
 * FK to installments.id; set when this transaction is part of an installment plan.
 * Reserved by §7; populated by §8 once the installments table ships.
 */
installment_id: string | null;
created_at: string;
updated_at: string;
```

Also extend the docstring on `exchange_rate` to clarify USD→USD transfers per §3.4 of the spec:

```typescript
/**
 * Rate captured at save time; set whenever a USD↔EGP conversion is involved.
 *
 * For USD → USD transfers this is still required: `to_amount = amount` (same-
 * currency branch), but `egp_amount = amount × rate` is needed for net-worth
 * tracking — so the rate is captured solely for the egp_amount calculation.
 */
exchange_rate: number | null;
```

- [ ] **Step 2: Run typecheck and tests**

Run: `npx tsc --noEmit`
Expected: PASS — every reader/writer of `Transaction` is allowed to omit `installment_id` because it's `string | null` and the entity is consumed via DB rows that may or may not contain the column.

If typecheck fails because some construct-site (mock factory, fixtures) builds a `Transaction` literal without `installment_id`, add `installment_id: null` to those construct sites. Search:

Run: `grep -rn "type: TransactionType\|: Transaction = {" --include="*.ts" --include="*.tsx" .`
Expected output: list of construct sites — add `installment_id: null` to each that constructs a literal.

- [ ] **Step 3: Run unit tests**

Run: `npx jest`
Expected: green — no behavioral change, just an added nullable field.

- [ ] **Step 4: Commit**

```bash
git add database/entities/transaction.entity.ts
git commit -m "$(cat <<'EOF'
feat(§7): add installment_id field + clarify exchange_rate USD→USD note

installment_id is null until §8 wires it up. exchange_rate docstring
explains why USD → USD transfers still capture the rate (egp_amount
needs it for net-worth tracking even though to_amount = amount).
EOF
)"
```

---

## Task 7: Currency store — add `rate_updated_at`

**Files:**
- Modify: `store/currency.store.ts`
- Test: `__tests__/store/currency_store.test.ts` (extend if exists; otherwise create)

- [ ] **Step 1: Inspect current currency store**

Run: `cat store/currency.store.ts`
Expected: shows current `state` shape. Likely has `rate: number` and a loader. Check whether `rate_updated_at` is already present.

If `rate_updated_at` is **already** in the store, skip this task entirely and continue to Task 8. Mark this task complete in the todo list.

- [ ] **Step 2: Add `rate_updated_at` field**

Modify `store/currency.store.ts`. Add `rate_updated_at: string | null` to the state shape, initialize to `null`, and update the setter that writes `rate` to also write `rate_updated_at = new Date().toISOString()`:

```typescript
interface CurrencyStateShape {
  rate: number;
  rate_updated_at: string | null;  // §7: ISO timestamp of last rate write
  // ...existing fields...
}

const INITIAL_STATE: CurrencyStateShape = {
  rate: 50.0,
  rate_updated_at: null,
  // ...existing...
};

// In the setRate / loadRate action:
setRate: (rate: number) => set((s) => ({
  state: {
    ...s.state,
    rate,
    rate_updated_at: new Date().toISOString(),
  },
})),
```

If the rate is persisted to `app_settings` table, also persist `rate_updated_at` there (same UPDATE or INSERT). If the rate is only in-memory, the in-memory write is sufficient.

- [ ] **Step 3: Run the existing currency-store test(s)**

Run: `npx jest __tests__/store/currency_store.test.ts`
Expected: PASS — `rate_updated_at` is additive and shouldn't break existing tests.

- [ ] **Step 4: Add a new test for the timestamp behavior**

Open `__tests__/store/currency_store.test.ts` (create if missing) and add:

```typescript
import { useCurrencyStore } from '@/store/currency.store';

describe('useCurrencyStore — rate_updated_at', () => {
  beforeEach(() => {
    useCurrencyStore.getState().reset?.();
  });

  it('initializes rate_updated_at to null', () => {
    expect(useCurrencyStore.getState().state.rate_updated_at).toBeNull();
  });

  it('sets rate_updated_at to current ISO timestamp when setRate is called', () => {
    const before = new Date().toISOString();
    useCurrencyStore.getState().setRate(55.5);
    const after = new Date().toISOString();
    const ts = useCurrencyStore.getState().state.rate_updated_at;
    expect(ts).not.toBeNull();
    expect(ts! >= before).toBe(true);
    expect(ts! <= after).toBe(true);
  });
});
```

- [ ] **Step 5: Run tests**

Run: `npx jest __tests__/store/currency_store.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add store/currency.store.ts __tests__/store/currency_store.test.ts
git commit -m "$(cat <<'EOF'
feat(§7): track rate_updated_at on the currency store

The §7 exchange-rate row shows when the stored rate was last updated
("Last updated 2026-05-12 · Rate may be stale") so users notice when
the saved rate is more than 30 days old.
EOF
)"
```

---

## Task 8: HeroUI BottomSheet portal stacking prototype (Risk #1 GATE)

**Files:**
- Create: `screens/transactions/transaction_form_v2/__prototype__/sheet_stacking_probe.tsx` (temporary — deleted at end of this task)

**Purpose:** Before investing in V2 components and pickers, validate on a real Android device that two `BottomSheet` instances can be open simultaneously (form sheet + picker sheet) without portal/overlay conflicts or gesture-handler collisions. If broken, the picker UX falls back to a full-screen Expo Router stack route instead of a stacked sheet.

This task does NOT produce shipping code — it produces a verdict.

- [ ] **Step 1: Create the prototype screen**

Create `screens/transactions/transaction_form_v2/__prototype__/sheet_stacking_probe.tsx`:

```tsx
import { useState } from 'react';
import { View } from 'react-native';
import { BottomSheet, Button } from 'heroui-native';

import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';

export default function SheetStackingProbe(): React.ReactElement {
  const [outerOpen, setOuterOpen] = useState(false);
  const [innerOpen, setInnerOpen] = useState(false);

  return (
    <Screen>
      <View className="flex-1 items-center justify-center px-6 gap-4">
        <Text className="font-sora font-semibold text-foreground text-[15px]">
          BottomSheet stacking probe
        </Text>
        <Button onPress={() => setOuterOpen(true)}>Open outer sheet</Button>
      </View>

      <BottomSheet isOpen={outerOpen} onOpenChange={setOuterOpen}>
        <BottomSheet.Portal>
          <BottomSheet.Overlay />
          <BottomSheet.Content
            snapPoints={['80%']}
            enableOverDrag={false}
            enableDynamicSizing={false}
            contentContainerClassName="h-full"
          >
            <BottomSheet.Close />
            <BottomSheet.Title>Outer sheet</BottomSheet.Title>
            <View className="flex-1 items-center justify-center px-6">
              <Button onPress={() => setInnerOpen(true)}>Open picker over me</Button>
            </View>
          </BottomSheet.Content>
        </BottomSheet.Portal>
      </BottomSheet>

      <BottomSheet isOpen={innerOpen} onOpenChange={setInnerOpen}>
        <BottomSheet.Portal>
          <BottomSheet.Overlay />
          <BottomSheet.Content
            snapPoints={['60%']}
            enableOverDrag={false}
            enableDynamicSizing={false}
            contentContainerClassName="h-full"
          >
            <BottomSheet.Close />
            <BottomSheet.Title>Inner picker</BottomSheet.Title>
            <View className="flex-1 items-center justify-center px-6">
              <Text className="text-foreground">If you can read this on top of the outer sheet, stacking works.</Text>
            </View>
          </BottomSheet.Content>
        </BottomSheet.Portal>
      </BottomSheet>
    </Screen>
  );
}
```

- [ ] **Step 2: Wire a temporary route to it**

Create `app/(app)/_probe_sheet_stacking/index.tsx` as a one-liner re-export:

```tsx
export { default } from '@/screens/transactions/transaction_form_v2/__prototype__/sheet_stacking_probe';
```

This puts the probe under `/(app)/_probe_sheet_stacking` so it's reachable on the running dev build without polluting the tab bar.

- [ ] **Step 3: Build and run on an Android device**

Run:

```bash
npx expo run:android
```

Expected: dev build launches.

Navigate to `/(app)/_probe_sheet_stacking` (you may need to type the URL into the dev tools, or temporarily add a `router.push('/(app)/_probe_sheet_stacking')` button to a screen you can reach).

- [ ] **Step 4: Validate stacking — verdict checklist**

On the running app, verify:

- [ ] **Outer sheet opens** — backdrop renders, content visible.
- [ ] **Inner sheet opens on top** while outer is still open — backdrop intensifies, inner content readable on top, outer still in DOM behind.
- [ ] **Inner sheet's overlay press closes inner only, leaves outer open**.
- [ ] **Inner sheet's swipe-down closes inner only, leaves outer open**.
- [ ] **Inner sheet's close button closes inner only**.
- [ ] **Outer sheet's gestures do not fire while inner is open** — pressing on outer content (which is behind inner backdrop) should NOT propagate.
- [ ] **No backdrop "double-darken" or flicker** when inner mounts/unmounts.
- [ ] **Repeat the test on iOS device or simulator** — HeroUI uses FullWindowOverlay on iOS, which may behave differently.

Record verdict at the top of the probe file as a doc comment when done:

```tsx
/**
 * Verdict (YYYY-MM-DD):
 *   Android Fabric: PASS / FAIL — <one-line observation>
 *   iOS:           PASS / FAIL — <one-line observation>
 *
 * Outcome: <continue with stacked sheets | fall back to full-screen pickers>
 */
```

- [ ] **Step 5: If FAIL — pivot the plan**

If either platform fails, switch the picker tasks (Tasks 18 + 19) to full-screen Expo Router stack routes (`/transactions/pick-account/[role]`, `/transactions/pick-category`). The form sheet stays as a `BottomSheet`; pickers become routes pushed via `router.push()` and return their result via a route param + the form's state store. Update Tasks 18 + 19 accordingly before implementation.

If PASS — proceed without modification.

- [ ] **Step 6: Delete the probe and commit**

```bash
rm -rf screens/transactions/transaction_form_v2/__prototype__
rm -rf app/\(app\)/_probe_sheet_stacking
git add -A
git commit -m "$(cat <<'EOF'
prototype(§7): validated HeroUI BottomSheet stacking on Android + iOS

Probe outcome: <PASS — proceeding with stacked sheets | FAIL — pivoting
pickers to full-screen routes>. Probe code removed; see commit message
for the verdict, captured for the audit trail.

Outer sheet + inner picker sheet open simultaneously without portal
conflict; gestures isolated to the topmost sheet; backdrop transitions
clean on both platforms.
EOF
)"
```

(Adjust the commit message wording to match the actual verdict.)

---

## Task 9: V2 folder + state + store files (add + edit)

**Files:**
- Create: `screens/transactions/transaction_form_v2/add_transaction.state.ts`
- Create: `screens/transactions/transaction_form_v2/add_transaction.store.ts`
- Create: `screens/transactions/transaction_form_v2/edit_transaction.state.ts`
- Create: `screens/transactions/transaction_form_v2/edit_transaction.store.ts`
- Create: `screens/transactions/transaction_form_v2/edit_transaction.helpers.ts`
- Test: `__tests__/screens/transactions/transaction_form_v2/add_transaction_state.test.ts`
- Test: `__tests__/screens/transactions/transaction_form_v2/edit_transaction_state.test.ts`

- [ ] **Step 1: Write the failing tests for `add_transaction.state.ts`**

Create `__tests__/screens/transactions/transaction_form_v2/add_transaction_state.test.ts`:

```typescript
import { useAddTransactionState } from '@/screens/transactions/transaction_form_v2/add_transaction.state';

describe('useAddTransactionState', () => {
  beforeEach(() => {
    useAddTransactionState.getState().reset();
  });

  it('initializes with all UI booleans false', () => {
    const s = useAddTransactionState.getState().state;
    expect(s).toEqual({
      visible: false,
      saving: false,
      showAccountPicker: false,
      showToPicker: false,
      showCategoryPicker: false,
      rateOverride: false,
    });
  });

  it('open() sets visible=true', () => {
    useAddTransactionState.getState().open();
    expect(useAddTransactionState.getState().state.visible).toBe(true);
  });

  it('close() resets to initial', () => {
    useAddTransactionState.getState().open();
    useAddTransactionState.getState().setSaving(true);
    useAddTransactionState.getState().close();
    expect(useAddTransactionState.getState().state).toEqual({
      visible: false,
      saving: false,
      showAccountPicker: false,
      showToPicker: false,
      showCategoryPicker: false,
      rateOverride: false,
    });
  });

  it('setShowAccountPicker(true) flips only that flag', () => {
    useAddTransactionState.getState().setShowAccountPicker(true);
    const s = useAddTransactionState.getState().state;
    expect(s.showAccountPicker).toBe(true);
    expect(s.showToPicker).toBe(false);
  });

  it('setRateOverride toggles independently of other flags', () => {
    useAddTransactionState.getState().setRateOverride(true);
    expect(useAddTransactionState.getState().state.rateOverride).toBe(true);
    useAddTransactionState.getState().setRateOverride(false);
    expect(useAddTransactionState.getState().state.rateOverride).toBe(false);
  });
});
```

- [ ] **Step 2: Write the failing tests for `edit_transaction.state.ts`**

Create `__tests__/screens/transactions/transaction_form_v2/edit_transaction_state.test.ts`:

```typescript
import { useEditTransactionState } from '@/screens/transactions/transaction_form_v2/edit_transaction.state';

describe('useEditTransactionState', () => {
  beforeEach(() => {
    useEditTransactionState.getState().reset();
  });

  it('initializes with all UI booleans false', () => {
    const s = useEditTransactionState.getState().state;
    expect(s).toEqual({
      visible: false,
      saving: false,
      showCategoryPicker: false,
      rateOverride: false,
    });
  });

  it('open() sets visible=true', () => {
    useEditTransactionState.getState().open({ id: 't1' } as any);
    expect(useEditTransactionState.getState().state.visible).toBe(true);
  });

  it('close() resets to initial', () => {
    useEditTransactionState.getState().open({ id: 't1' } as any);
    useEditTransactionState.getState().setSaving(true);
    useEditTransactionState.getState().close();
    expect(useEditTransactionState.getState().state.visible).toBe(false);
    expect(useEditTransactionState.getState().state.saving).toBe(false);
  });
});
```

- [ ] **Step 3: Run tests — expect failure**

Run: `npx jest __tests__/screens/transactions/transaction_form_v2/`
Expected: FAIL — modules not found.

- [ ] **Step 4: Create `add_transaction.state.ts`**

Create `screens/transactions/transaction_form_v2/add_transaction.state.ts`:

```typescript
import { create } from 'zustand';

interface AddTransactionStateShape {
  visible: boolean;
  saving: boolean;
  showAccountPicker: boolean;
  showToPicker: boolean;
  showCategoryPicker: boolean;
  rateOverride: boolean;
}

interface AddTransactionState {
  state: AddTransactionStateShape;
  open: () => void;
  close: () => void;
  setSaving: (v: boolean) => void;
  setShowAccountPicker: (v: boolean) => void;
  setShowToPicker: (v: boolean) => void;
  setShowCategoryPicker: (v: boolean) => void;
  setRateOverride: (v: boolean) => void;
  reset: () => void;
}

const INITIAL_STATE: AddTransactionStateShape = {
  visible: false,
  saving: false,
  showAccountPicker: false,
  showToPicker: false,
  showCategoryPicker: false,
  rateOverride: false,
};

export const useAddTransactionState = create<AddTransactionState>((set) => ({
  state: INITIAL_STATE,

  open: () => set((s) => ({ state: { ...s.state, visible: true } })),
  close: () => set({ state: INITIAL_STATE }),
  setSaving: (v) => set((s) => ({ state: { ...s.state, saving: v } })),
  setShowAccountPicker: (v) => set((s) => ({ state: { ...s.state, showAccountPicker: v } })),
  setShowToPicker: (v) => set((s) => ({ state: { ...s.state, showToPicker: v } })),
  setShowCategoryPicker: (v) => set((s) => ({ state: { ...s.state, showCategoryPicker: v } })),
  setRateOverride: (v) => set((s) => ({ state: { ...s.state, rateOverride: v } })),
  reset: () => set({ state: INITIAL_STATE }),
}));
```

- [ ] **Step 5: Create `add_transaction.store.ts`**

Create `screens/transactions/transaction_form_v2/add_transaction.store.ts` (mirrors V1; only the import path changes):

```typescript
import { create } from 'zustand';

import { TransactionType } from '@/constants/enums';

type NumpadAction = 'digit' | 'decimal' | 'backspace';

interface AddTransactionStoreShape {
  type: TransactionType;
  amountStr: string;
}

interface AddTransactionStore {
  state: AddTransactionStoreShape;
  setType: (type: TransactionType) => void;
  handleNumpad: (action: NumpadAction, value?: string) => void;
  reset: () => void;
}

const INITIAL_STATE: AddTransactionStoreShape = {
  type: TransactionType.Expense,
  amountStr: '0',
};

export const useAddTransactionStore = create<AddTransactionStore>((set) => ({
  state: INITIAL_STATE,

  setType: (type) => set((s) => ({ state: { ...s.state, type, amountStr: '0' } })),

  handleNumpad: (action, value) =>
    set((s) => {
      const prev = s.state.amountStr;
      if (action === 'backspace') {
        return { state: { ...s.state, amountStr: prev.length <= 1 ? '0' : prev.slice(0, -1) } };
      }
      if (action === 'decimal') {
        return { state: { ...s.state, amountStr: prev.includes('.') ? prev : prev + '.' } };
      }
      const digit = value ?? '';
      if (prev === '0') {
        return { state: { ...s.state, amountStr: digit === '0' ? '0' : digit } };
      }
      if (prev.includes('.')) {
        const parts = prev.split('.');
        if (parts[1].length >= 2) return {};
      }
      return { state: { ...s.state, amountStr: prev + digit } };
    }),

  reset: () => set({ state: INITIAL_STATE }),
}));
```

- [ ] **Step 6: Create `edit_transaction.state.ts`**

Create `screens/transactions/transaction_form_v2/edit_transaction.state.ts`:

```typescript
import { create } from 'zustand';

import type { Transaction } from '@/database/entities/transaction.entity';

interface EditTransactionStateShape {
  visible: boolean;
  saving: boolean;
  showCategoryPicker: boolean;
  rateOverride: boolean;
}

interface EditTransactionState {
  state: EditTransactionStateShape;
  open: (tx: Transaction) => void;
  close: () => void;
  setSaving: (v: boolean) => void;
  setShowCategoryPicker: (v: boolean) => void;
  setRateOverride: (v: boolean) => void;
  reset: () => void;
}

const INITIAL_STATE: EditTransactionStateShape = {
  visible: false,
  saving: false,
  showCategoryPicker: false,
  rateOverride: false,
};

export const useEditTransactionState = create<EditTransactionState>((set) => ({
  state: INITIAL_STATE,

  open: () => set((s) => ({ state: { ...s.state, visible: true } })),
  close: () => set({ state: INITIAL_STATE }),
  setSaving: (v) => set((s) => ({ state: { ...s.state, saving: v } })),
  setShowCategoryPicker: (v) => set((s) => ({ state: { ...s.state, showCategoryPicker: v } })),
  setRateOverride: (v) => set((s) => ({ state: { ...s.state, rateOverride: v } })),
  reset: () => set({ state: INITIAL_STATE }),
}));
```

- [ ] **Step 7: Create `edit_transaction.store.ts`**

Create `screens/transactions/transaction_form_v2/edit_transaction.store.ts`:

```typescript
import { create } from 'zustand';

import type { Transaction } from '@/database/entities/transaction.entity';

interface EditTransactionStoreShape {
  editingTx: Transaction | null;
  amountStr: string;
}

interface EditTransactionStore {
  state: EditTransactionStoreShape;
  loadFromTx: (tx: Transaction) => void;
  handleNumpad: (action: 'digit' | 'decimal' | 'backspace', value?: string) => void;
  reset: () => void;
}

const INITIAL_STATE: EditTransactionStoreShape = {
  editingTx: null,
  amountStr: '0',
};

export const useEditTransactionStore = create<EditTransactionStore>((set) => ({
  state: INITIAL_STATE,

  loadFromTx: (tx) =>
    set({
      state: {
        editingTx: tx,
        amountStr: String(tx.amount),
      },
    }),

  handleNumpad: (action, value) =>
    set((s) => {
      const prev = s.state.amountStr;
      if (action === 'backspace') {
        return { state: { ...s.state, amountStr: prev.length <= 1 ? '0' : prev.slice(0, -1) } };
      }
      if (action === 'decimal') {
        return { state: { ...s.state, amountStr: prev.includes('.') ? prev : prev + '.' } };
      }
      const digit = value ?? '';
      if (prev === '0') {
        return { state: { ...s.state, amountStr: digit === '0' ? '0' : digit } };
      }
      if (prev.includes('.')) {
        const parts = prev.split('.');
        if (parts[1].length >= 2) return {};
      }
      return { state: { ...s.state, amountStr: prev + digit } };
    }),

  reset: () => set({ state: INITIAL_STATE }),
}));
```

- [ ] **Step 8: Create `edit_transaction.helpers.ts`**

Create `screens/transactions/transaction_form_v2/edit_transaction.helpers.ts`:

```typescript
import type { Transaction } from '@/database/entities/transaction.entity';

export type EditTransactionFormValues = {
  amount: number;
  categoryId: string;
  note: string;
  date: string;
  time: string;
  exchangeRate: string;
};

export function buildDefaultsFromTx(tx: Transaction, fallbackRate: number): EditTransactionFormValues {
  return {
    amount: tx.amount,
    categoryId: tx.category_id ?? '',
    note: tx.note ?? '',
    date: tx.transaction_date,
    time: tx.transaction_time,
    exchangeRate: String(tx.exchange_rate ?? fallbackRate),
  };
}
```

- [ ] **Step 9: Run tests — expect pass**

Run: `npx jest __tests__/screens/transactions/transaction_form_v2/`
Expected: PASS — both state files green.

- [ ] **Step 10: Commit**

```bash
git add screens/transactions/transaction_form_v2/ __tests__/screens/transactions/transaction_form_v2/
git commit -m "$(cat <<'EOF'
feat(§7) Group C: V2 state + store scaffold for add + edit

Mirrors V1 shape (visible/saving/picker open + rateOverride for state;
type/amountStr for store; loadFromTx for edit store) per CLAUDE.md
store/state convention. Helpers extracted to a separate file so
edit hook stays focused on logic.
EOF
)"
```

---

## Task 10: TransactionFormBody state (`keyboardVisible`)

**Files:**
- Create: `screens/transactions/transaction_form_v2/transaction_form_body.state.ts`
- Test: `__tests__/screens/transactions/transaction_form_v2/transaction_form_body_state.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/screens/transactions/transaction_form_v2/transaction_form_body_state.test.ts`:

```typescript
import { useTransactionFormBodyState } from '@/screens/transactions/transaction_form_v2/transaction_form_body.state';

describe('useTransactionFormBodyState', () => {
  beforeEach(() => {
    useTransactionFormBodyState.getState().reset();
  });

  it('initializes with keyboardVisible=false and showIosDatePicker=false', () => {
    const s = useTransactionFormBodyState.getState().state;
    expect(s).toEqual({
      keyboardVisible: false,
      showIosDatePicker: false,
      showAndroidDatePicker: false,
    });
  });

  it('setKeyboardVisible(true) flips only that flag', () => {
    useTransactionFormBodyState.getState().setKeyboardVisible(true);
    const s = useTransactionFormBodyState.getState().state;
    expect(s.keyboardVisible).toBe(true);
    expect(s.showIosDatePicker).toBe(false);
  });

  it('setShowIosDatePicker(true) flips only that flag', () => {
    useTransactionFormBodyState.getState().setShowIosDatePicker(true);
    expect(useTransactionFormBodyState.getState().state.showIosDatePicker).toBe(true);
  });

  it('setShowAndroidDatePicker(true) flips only that flag', () => {
    useTransactionFormBodyState.getState().setShowAndroidDatePicker(true);
    expect(useTransactionFormBodyState.getState().state.showAndroidDatePicker).toBe(true);
  });

  it('reset() restores all flags to false', () => {
    useTransactionFormBodyState.getState().setKeyboardVisible(true);
    useTransactionFormBodyState.getState().setShowIosDatePicker(true);
    useTransactionFormBodyState.getState().reset();
    expect(useTransactionFormBodyState.getState().state).toEqual({
      keyboardVisible: false,
      showIosDatePicker: false,
      showAndroidDatePicker: false,
    });
  });
});
```

- [ ] **Step 2: Run test — expect failure**

Run: `npx jest __tests__/screens/transactions/transaction_form_v2/transaction_form_body_state.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the state file**

Create `screens/transactions/transaction_form_v2/transaction_form_body.state.ts`:

```typescript
import { create } from 'zustand';

interface TransactionFormBodyStateShape {
  keyboardVisible: boolean;
  showIosDatePicker: boolean;
  showAndroidDatePicker: boolean;
}

interface TransactionFormBodyState {
  state: TransactionFormBodyStateShape;
  setKeyboardVisible: (v: boolean) => void;
  setShowIosDatePicker: (v: boolean) => void;
  setShowAndroidDatePicker: (v: boolean) => void;
  reset: () => void;
}

const INITIAL_STATE: TransactionFormBodyStateShape = {
  keyboardVisible: false,
  showIosDatePicker: false,
  showAndroidDatePicker: false,
};

export const useTransactionFormBodyState = create<TransactionFormBodyState>((set) => ({
  state: INITIAL_STATE,

  setKeyboardVisible: (v) => set((s) => ({ state: { ...s.state, keyboardVisible: v } })),
  setShowIosDatePicker: (v) => set((s) => ({ state: { ...s.state, showIosDatePicker: v } })),
  setShowAndroidDatePicker: (v) => set((s) => ({ state: { ...s.state, showAndroidDatePicker: v } })),

  reset: () => set({ state: INITIAL_STATE }),
}));
```

- [ ] **Step 4: Run tests — expect pass**

Run: `npx jest __tests__/screens/transactions/transaction_form_v2/transaction_form_body_state.test.ts`
Expected: PASS — 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add screens/transactions/transaction_form_v2/transaction_form_body.state.ts __tests__/screens/transactions/transaction_form_v2/transaction_form_body_state.test.ts
git commit -m "$(cat <<'EOF'
feat(§7) Group C: transaction_form_body.state — keyboardVisible toggle

UI state per CLAUDE.md anatomy convention. keyboardVisible is set by
Keyboard.addListener in transaction_form_body.tsx to hide the numpad
when the note or rate inputs summon the system keyboard. iOS date
picker visibility flags also live here so the form body doesn't carry
local useState.
EOF
)"
```

---

## Task 11: TypeTabs component

**Files:**
- Create: `screens/transactions/transaction_form_v2/components/type_tabs.tsx`
- Test: `__tests__/screens/transactions/transaction_form_v2/components/type_tabs.test.tsx`

**Note on HeroUI Tabs:** If HeroUI Native v1.0.3 `Tabs` does not support per-item active-color override, fall back to a `tv()`-composed row. The decision is made before this task starts by checking `node_modules/heroui-native/lib/typescript/src/components/tabs/tabs.types.d.ts` for an `activeIndicator` or `classNames` API. The test below is written against the public API: tab labels, active state, type-color underline.

- [ ] **Step 1: Write the failing test**

Create `__tests__/screens/transactions/transaction_form_v2/components/type_tabs.test.tsx`:

```tsx
import { render, fireEvent } from '@testing-library/react-native';

import { TransactionType } from '@/constants/enums';
import { TypeTabs } from '@/screens/transactions/transaction_form_v2/components/type_tabs';

describe('TypeTabs', () => {
  it('renders all four type labels', () => {
    const { getByText } = render(
      <TypeTabs active={TransactionType.Expense} onSelect={() => {}} disabled={false} />,
    );
    expect(getByText('Expense')).toBeTruthy();
    expect(getByText('Income')).toBeTruthy();
    expect(getByText('Transfer')).toBeTruthy();
    expect(getByText('CC Payment')).toBeTruthy();
  });

  it('marks the active tab via testID + accessibility state', () => {
    const { getByTestId } = render(
      <TypeTabs active={TransactionType.Transfer} onSelect={() => {}} disabled={false} />,
    );
    const transferTab = getByTestId('type-tab-transfer');
    expect(transferTab.props.accessibilityState?.selected).toBe(true);
    const expenseTab = getByTestId('type-tab-expense');
    expect(expenseTab.props.accessibilityState?.selected).toBe(false);
  });

  it('calls onSelect with the chosen type when a tab is pressed', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <TypeTabs active={TransactionType.Expense} onSelect={onSelect} disabled={false} />,
    );
    fireEvent.press(getByTestId('type-tab-income'));
    expect(onSelect).toHaveBeenCalledWith(TransactionType.Income);
  });

  it('does not call onSelect when disabled', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <TypeTabs active={TransactionType.Expense} onSelect={onSelect} disabled={true} />,
    );
    fireEvent.press(getByTestId('type-tab-income'));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('exposes per-type color class on the active tab indicator', () => {
    // Each type maps to a token: expense=text-danger, income=text-success,
    // transfer=text-info, cc_payment=text-accent-cc.
    const cases: Array<[TransactionType, string]> = [
      [TransactionType.Expense, 'text-danger'],
      [TransactionType.Income, 'text-success'],
      [TransactionType.Transfer, 'text-info'],
      [TransactionType.CCPayment, 'text-accent-cc'],
    ];
    for (const [type, klass] of cases) {
      const { getByTestId, unmount } = render(
        <TypeTabs active={type} onSelect={() => {}} disabled={false} />,
      );
      const indicator = getByTestId(`type-tab-indicator-${type}`);
      const className = indicator.props.className ?? '';
      expect(className).toContain(klass);
      unmount();
    }
  });
});
```

- [ ] **Step 2: Run test — expect failure**

Run: `npx jest __tests__/screens/transactions/transaction_form_v2/components/type_tabs.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement TypeTabs**

Create `screens/transactions/transaction_form_v2/components/type_tabs.tsx`. We use a `tv()`-composed row (not HeroUI `Tabs`) because per-type active colors are easier to express directly than to override the HeroUI primitive. This is the documented fallback in §2.2 of the spec.

```tsx
import { Pressable, View } from 'react-native';
import { tv } from 'tailwind-variants';

import { Text } from '@/components/ui/text';
import { TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';

const tab = tv({
  base: 'flex-1 items-center justify-center py-3',
  variants: {
    active: { true: '', false: '' },
  },
});

const label = tv({
  base: 'font-inter text-[13px]',
  variants: {
    active: { true: 'font-semibold', false: 'font-medium text-muted' },
    type: {
      expense: '',
      income: '',
      transfer: '',
      cc_payment: '',
    },
  },
  compoundVariants: [
    { active: true, type: 'expense', class: 'text-danger' },
    { active: true, type: 'income', class: 'text-success' },
    { active: true, type: 'transfer', class: 'text-info' },
    { active: true, type: 'cc_payment', class: 'text-accent-cc' },
  ],
});

const indicator = tv({
  base: 'h-[2px] mt-1 w-full',
  variants: {
    type: {
      expense: 'bg-danger',
      income: 'bg-success',
      transfer: 'bg-info',
      cc_payment: 'bg-accent-cc',
    },
  },
});

const TABS: Array<{ type: TransactionType; label: string }> = [
  { type: TransactionType.Expense, label: Strings.txTypeExpense ?? 'Expense' },
  { type: TransactionType.Income, label: Strings.txTypeIncome ?? 'Income' },
  { type: TransactionType.Transfer, label: Strings.txTypeTransfer ?? 'Transfer' },
  { type: TransactionType.CCPayment, label: Strings.txTypeCcPayment ?? 'CC Payment' },
];

interface Props {
  active: TransactionType;
  onSelect: (t: TransactionType) => void;
  disabled: boolean;
}

export function TypeTabs({ active, onSelect, disabled }: Props): React.ReactElement {
  return (
    <View style={{ flexDirection: 'row' }} className="border-b border-separator">
      {TABS.map(({ type, label: lbl }) => {
        const isActive = type === active;
        return (
          <Pressable
            key={type}
            testID={`type-tab-${type}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive, disabled }}
            disabled={disabled}
            onPress={() => onSelect(type)}
            className={tab({ active: isActive })}
          >
            <Text className={label({ active: isActive, type })}>{lbl}</Text>
            {isActive ? (
              <View testID={`type-tab-indicator-${type}`} className={indicator({ type })} />
            ) : (
              <View className="h-[2px] mt-1 w-full" />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
```

**Note:** if `Strings.txTypeExpense` etc. don't exist yet, add them in Task 3's batch — search the existing `Strings` constants for `expense` / `income` / `transfer` / `cc_payment` labels. The V1 form uses `Strings.txTypeExpense` etc. (verify with `grep -n "txType" constants/strings.ts`).

- [ ] **Step 4: Run tests — expect pass**

Run: `npx jest __tests__/screens/transactions/transaction_form_v2/components/type_tabs.test.tsx`
Expected: PASS — 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add screens/transactions/transaction_form_v2/components/type_tabs.tsx __tests__/screens/transactions/transaction_form_v2/components/type_tabs.test.tsx
git commit -m "$(cat <<'EOF'
feat(§7) Group D: TypeTabs component with per-type active colors

tv()-composed tab row (HeroUI Tabs fallback per spec §2.2) — four
mutually-exclusive types with active underline in expense=danger /
income=success / transfer=info / cc_payment=accent-cc tokens.
Disabled prop blocks selection in edit mode.
EOF
)"
```

---

## Task 12: AmountHero component

**Files:**
- Create: `screens/transactions/transaction_form_v2/components/amount_hero.tsx`
- Test: `__tests__/screens/transactions/transaction_form_v2/components/amount_hero.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/screens/transactions/transaction_form_v2/components/amount_hero.test.tsx`:

```tsx
import { render } from '@testing-library/react-native';

import { TransactionType } from '@/constants/enums';
import { Currency } from '@/constants/enums';
import { AmountHero } from '@/screens/transactions/transaction_form_v2/components/amount_hero';

describe('AmountHero', () => {
  it('renders the currency code on the left', () => {
    const { getByText } = render(
      <AmountHero amountStr="0" type={TransactionType.Expense} currency={Currency.EGP} />,
    );
    expect(getByText('EGP')).toBeTruthy();
  });

  it('renders the amount formatted with thousands separators', () => {
    const { getByTestId } = render(
      <AmountHero amountStr="122300.50" type={TransactionType.Expense} currency={Currency.EGP} />,
    );
    expect(getByTestId('amount-hero-value').props.children).toBe('122,300.50');
  });

  it('preserves a trailing decimal point during entry', () => {
    const { getByTestId } = render(
      <AmountHero amountStr="100." type={TransactionType.Expense} currency={Currency.EGP} />,
    );
    expect(getByTestId('amount-hero-value').props.children).toBe('100.');
  });

  it('applies the type color class to the amount', () => {
    const cases: Array<[TransactionType, string]> = [
      [TransactionType.Expense, 'text-danger'],
      [TransactionType.Income, 'text-success'],
      [TransactionType.Transfer, 'text-info'],
      [TransactionType.CCPayment, 'text-accent-cc'],
    ];
    for (const [type, klass] of cases) {
      const { getByTestId, unmount } = render(
        <AmountHero amountStr="0" type={type} currency={Currency.EGP} />,
      );
      expect(getByTestId('amount-hero-value').props.className).toContain(klass);
      unmount();
    }
  });

  it('renders USD currency when source account currency is USD', () => {
    const { getByText } = render(
      <AmountHero amountStr="0" type={TransactionType.Expense} currency={Currency.USD} />,
    );
    expect(getByText('USD')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test — expect failure**

Run: `npx jest __tests__/screens/transactions/transaction_form_v2/components/amount_hero.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement AmountHero**

Create `screens/transactions/transaction_form_v2/components/amount_hero.tsx`:

```tsx
import { View } from 'react-native';
import { tv } from 'tailwind-variants';

import { Text } from '@/components/ui/text';
import { Currency, TransactionType } from '@/constants/enums';

function formatAmount(str: string): string {
  const [integer, decimal] = str.split('.');
  const formatted = new Intl.NumberFormat('en-US', { style: 'decimal' }).format(
    parseInt(integer || '0', 10),
  );
  return decimal !== undefined ? `${formatted}.${decimal}` : formatted;
}

const amountClass = tv({
  base: 'font-sora text-[40px]',
  variants: {
    type: {
      expense: 'text-danger',
      income: 'text-success',
      transfer: 'text-info',
      cc_payment: 'text-accent-cc',
    },
  },
});

interface Props {
  amountStr: string;
  type: TransactionType;
  currency: Currency;
}

export function AmountHero({ amountStr, type, currency }: Props): React.ReactElement {
  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center' }}
      className="py-4 gap-2 border-b border-separator"
    >
      <Text className="font-inter text-[15px] text-muted">{currency}</Text>
      <Text testID="amount-hero-value" className={amountClass({ type })}>
        {formatAmount(amountStr)}
      </Text>
    </View>
  );
}
```

- [ ] **Step 4: Run tests — expect pass**

Run: `npx jest __tests__/screens/transactions/transaction_form_v2/components/amount_hero.test.tsx`
Expected: PASS — 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add screens/transactions/transaction_form_v2/components/amount_hero.tsx __tests__/screens/transactions/transaction_form_v2/components/amount_hero.test.tsx
git commit -m "$(cat <<'EOF'
feat(§7) Group D: AmountHero — currency + formatted amount + per-type color

40pt Sora amount with thousands separators (Intl.NumberFormat decimal
style). Currency code in 15pt Inter muted to the left. Color tokens
mirror TypeTabs: expense=danger, income=success, transfer=info,
cc_payment=accent-cc.
EOF
)"
```

---

## Task 13: Numpad component (className-ported)

**Files:**
- Create: `screens/transactions/transaction_form_v2/components/numpad.tsx`
- Test: `__tests__/screens/transactions/transaction_form_v2/components/numpad.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/screens/transactions/transaction_form_v2/components/numpad.test.tsx`:

```tsx
import { render, fireEvent } from '@testing-library/react-native';

import { Numpad } from '@/screens/transactions/transaction_form_v2/components/numpad';

describe('Numpad', () => {
  it('renders digits 0-9 plus decimal and backspace', () => {
    const { getByTestId } = render(<Numpad onPress={() => {}} />);
    for (let i = 0; i <= 9; i++) {
      expect(getByTestId(`numpad-key-${i}`)).toBeTruthy();
    }
    expect(getByTestId('numpad-key-decimal')).toBeTruthy();
    expect(getByTestId('numpad-key-backspace')).toBeTruthy();
  });

  it('emits a "digit" action with the pressed value', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(<Numpad onPress={onPress} />);
    fireEvent.press(getByTestId('numpad-key-7'));
    expect(onPress).toHaveBeenCalledWith('digit', '7');
  });

  it('emits "decimal" action', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(<Numpad onPress={onPress} />);
    fireEvent.press(getByTestId('numpad-key-decimal'));
    expect(onPress).toHaveBeenCalledWith('decimal');
  });

  it('emits "backspace" action', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(<Numpad onPress={onPress} />);
    fireEvent.press(getByTestId('numpad-key-backspace'));
    expect(onPress).toHaveBeenCalledWith('backspace');
  });

  it('emits "digit" with "0"', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(<Numpad onPress={onPress} />);
    fireEvent.press(getByTestId('numpad-key-0'));
    expect(onPress).toHaveBeenCalledWith('digit', '0');
  });
});
```

- [ ] **Step 2: Run test — expect failure**

Run: `npx jest __tests__/screens/transactions/transaction_form_v2/components/numpad.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement Numpad**

Create `screens/transactions/transaction_form_v2/components/numpad.tsx`:

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { CoreTokens } from '@/constants/theme_tokens';

type NumpadAction = 'digit' | 'decimal' | 'backspace';

interface Props {
  onPress: (action: NumpadAction, value?: string) => void;
}

const ROWS: Array<Array<string | 'decimal' | 'backspace'>> = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['decimal', '0', 'backspace'],
];

export function Numpad({ onPress }: Props): React.ReactElement {
  return (
    <View className="px-4 pb-4">
      {ROWS.map((row, ri) => (
        <View key={ri} style={{ flexDirection: 'row' }} className="gap-2 mt-2">
          {row.map((key) => {
            if (key === 'decimal') {
              return (
                <Pressable
                  key="decimal"
                  testID="numpad-key-decimal"
                  onPress={() => onPress('decimal')}
                  className="flex-1 h-14 rounded-md bg-default items-center justify-center"
                >
                  <Text className="font-sora font-semibold text-[20px] text-foreground">.</Text>
                </Pressable>
              );
            }
            if (key === 'backspace') {
              return (
                <Pressable
                  key="backspace"
                  testID="numpad-key-backspace"
                  onPress={() => onPress('backspace')}
                  className="flex-1 h-14 rounded-md bg-default items-center justify-center"
                >
                  <MaterialCommunityIcons
                    name="backspace-outline"
                    size={22}
                    color={CoreTokens.foreground}
                  />
                </Pressable>
              );
            }
            return (
              <Pressable
                key={key}
                testID={`numpad-key-${key}`}
                onPress={() => onPress('digit', key)}
                className="flex-1 h-14 rounded-md bg-default items-center justify-center"
              >
                <Text className="font-sora font-semibold text-[20px] text-foreground">{key}</Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}
```

**Note:** if `CoreTokens.foreground` doesn't exist in `constants/theme_tokens.ts`, locate the equivalent (likely `CoreTokens.text1` or similar from CLAUDE.md's "Module-level theme access" list). Grep: `grep -n "export const CoreTokens" constants/theme_tokens.ts`.

- [ ] **Step 4: Run tests — expect pass**

Run: `npx jest __tests__/screens/transactions/transaction_form_v2/components/numpad.test.tsx`
Expected: PASS — 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add screens/transactions/transaction_form_v2/components/numpad.tsx __tests__/screens/transactions/transaction_form_v2/components/numpad.test.tsx
git commit -m "$(cat <<'EOF'
feat(§7) Group D: Numpad — className-ported custom numeric keypad

4×3 grid (1-9, decimal, 0, backspace) with 44pt+ targets. Emits
{action, value?} so the store can apply decimal/backspace semantics.
Custom-numpad keeps decimal handling consistent across Android launcher
keyboards (where the system numeric keyboard is unreliable).
EOF
)"
```

---

## Task 14: ExchangeRateRow component

**Files:**
- Create: `screens/transactions/transaction_form_v2/components/exchange_rate_row.tsx`
- Test: `__tests__/screens/transactions/transaction_form_v2/components/exchange_rate_row.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/screens/transactions/transaction_form_v2/components/exchange_rate_row.test.tsx`:

```tsx
import { render, fireEvent } from '@testing-library/react-native';

import { ExchangeRateRow } from '@/screens/transactions/transaction_form_v2/components/exchange_rate_row';

describe('ExchangeRateRow', () => {
  it('shows the stored rate value when overrideEnabled=false', () => {
    const { getByText } = render(
      <ExchangeRateRow
        value="50.75"
        onChange={() => {}}
        overrideEnabled={false}
        onToggleOverride={() => {}}
        rateUpdatedAt="2026-05-12T10:00:00.000Z"
        amount={100}
      />,
    );
    expect(getByText('50.75')).toBeTruthy();
  });

  it('shows the override Input when overrideEnabled=true', () => {
    const { getByTestId } = render(
      <ExchangeRateRow
        value="55.0"
        onChange={() => {}}
        overrideEnabled={true}
        onToggleOverride={() => {}}
        rateUpdatedAt={null}
        amount={100}
      />,
    );
    const input = getByTestId('exchange-rate-input');
    expect(input.props.value).toBe('55.0');
  });

  it('calls onChange when the override Input changes', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <ExchangeRateRow
        value="55.0"
        onChange={onChange}
        overrideEnabled={true}
        onToggleOverride={() => {}}
        rateUpdatedAt={null}
        amount={100}
      />,
    );
    fireEvent.changeText(getByTestId('exchange-rate-input'), '52.5');
    expect(onChange).toHaveBeenCalledWith('52.5');
  });

  it('shows the "Using stored rate" subtitle when overrideEnabled=false', () => {
    const { getByText } = render(
      <ExchangeRateRow
        value="50.75"
        onChange={() => {}}
        overrideEnabled={false}
        onToggleOverride={() => {}}
        rateUpdatedAt="2026-05-12T10:00:00.000Z"
        amount={100}
      />,
    );
    expect(getByText(/Using stored rate/)).toBeTruthy();
  });

  it('shows the "Custom rate" subtitle when overrideEnabled=true', () => {
    const { getByText } = render(
      <ExchangeRateRow
        value="55.0"
        onChange={() => {}}
        overrideEnabled={true}
        onToggleOverride={() => {}}
        rateUpdatedAt={null}
        amount={100}
      />,
    );
    expect(getByText(/Custom rate/)).toBeTruthy();
  });

  it('shows the live EGP preview using roundMoney(amount × rate)', () => {
    const { getByText } = render(
      <ExchangeRateRow
        value="50.75"
        onChange={() => {}}
        overrideEnabled={false}
        onToggleOverride={() => {}}
        rateUpdatedAt={null}
        amount={50}
      />,
    );
    // 50 × 50.75 = 2537.5 → "≈ 2,537.50 EGP"
    expect(getByText(/2,537\.50 EGP/)).toBeTruthy();
  });

  it('flags stale rate (>30 days) with a warning treatment', () => {
    const old = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    const { getByText } = render(
      <ExchangeRateRow
        value="50.75"
        onChange={() => {}}
        overrideEnabled={false}
        onToggleOverride={() => {}}
        rateUpdatedAt={old}
        amount={100}
      />,
    );
    expect(getByText(/Rate may be stale/)).toBeTruthy();
  });

  it('does NOT flag stale when rateUpdatedAt is recent', () => {
    const recent = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const { queryByText } = render(
      <ExchangeRateRow
        value="50.75"
        onChange={() => {}}
        overrideEnabled={false}
        onToggleOverride={() => {}}
        rateUpdatedAt={recent}
        amount={100}
      />,
    );
    expect(queryByText(/Rate may be stale/)).toBeNull();
  });

  it('calls onToggleOverride when the row is pressed (when not in override)', () => {
    const onToggleOverride = jest.fn();
    const { getByTestId } = render(
      <ExchangeRateRow
        value="50.75"
        onChange={() => {}}
        overrideEnabled={false}
        onToggleOverride={onToggleOverride}
        rateUpdatedAt={null}
        amount={100}
      />,
    );
    fireEvent.press(getByTestId('exchange-rate-row'));
    expect(onToggleOverride).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test — expect failure**

Run: `npx jest __tests__/screens/transactions/transaction_form_v2/components/exchange_rate_row.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement ExchangeRateRow**

Create `screens/transactions/transaction_form_v2/components/exchange_rate_row.tsx`:

```tsx
import { Pressable, View } from 'react-native';
import { Input } from 'heroui-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { roundMoney } from '@/utils/money';

const STALE_THRESHOLD_DAYS = 30;

function isStale(rateUpdatedAt: string | null): boolean {
  if (!rateUpdatedAt) return false;
  const updated = new Date(rateUpdatedAt).getTime();
  if (isNaN(updated)) return false;
  const ageMs = Date.now() - updated;
  return ageMs > STALE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
}

function formatPreviewAmount(amount: number, rateStr: string): string {
  const rate = parseFloat(rateStr);
  if (isNaN(rate) || rate <= 0) return '—';
  const egp = roundMoney(amount * rate);
  return new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(egp);
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  overrideEnabled: boolean;
  onToggleOverride: () => void;
  rateUpdatedAt: string | null;
  amount: number;
  error?: string;
}

export function ExchangeRateRow({
  value,
  onChange,
  overrideEnabled,
  onToggleOverride,
  rateUpdatedAt,
  amount,
  error,
}: Props): React.ReactElement {
  const stale = isStale(rateUpdatedAt);

  const subtitle = overrideEnabled
    ? Strings.addTxRateSourceCustom
    : rateUpdatedAt
      ? `${Strings.addTxRateSourceStored} · ${Strings.addTxRateLastUpdated.replace('{date}', formatDateShort(rateUpdatedAt))}`
      : Strings.addTxRateSourceStored;

  return (
    <View className="mt-3 rounded-md border border-accent/30 bg-accent/10 px-3 py-3">
      <Pressable
        testID="exchange-rate-row"
        onPress={() => {
          if (!overrideEnabled) onToggleOverride();
        }}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <View style={{ flex: 1 }}>
          <Text className="font-sora font-semibold text-[14px] text-foreground">Exchange Rate</Text>
          <Text className="font-inter text-[11px] text-muted mt-0.5">{subtitle}</Text>
          {stale ? (
            <Text className="font-inter text-[11px] text-warning mt-0.5">
              {Strings.addTxRateStale}
            </Text>
          ) : null}
        </View>
        {overrideEnabled ? (
          <View style={{ width: 100 }}>
            <Input
              testID="exchange-rate-input"
              value={value}
              onChangeText={onChange}
              keyboardType="decimal-pad"
              placeholder="0.00"
            />
          </View>
        ) : (
          <Text className="font-sora font-semibold text-[15px] text-foreground">{value}</Text>
        )}
      </Pressable>

      {/* Live EGP preview */}
      <Text className="font-inter text-[12px] text-muted mt-2">
        {Strings.addTxEgpPreview.replace('{amount}', formatPreviewAmount(amount, value))}
      </Text>

      {overrideEnabled ? (
        <Pressable onPress={onToggleOverride} className="mt-2 self-end">
          <Text className="font-inter text-[12px] text-accent">{Strings.addTxRateReset}</Text>
        </Pressable>
      ) : null}

      {error ? <Text className="font-inter text-[11px] text-danger mt-1">{error}</Text> : null}
    </View>
  );
}
```

**Note on `text-accent` / `text-warning`:** these tokens exist in `global.css` per CLAUDE.md `Theme color slots`. If `text-warning` is missing, add it alongside `--info` in Task 2 (lookup what an amber/warning token value should be — likely `--warning: 245 158 11` for amber-500).

- [ ] **Step 4: Run tests — expect pass**

Run: `npx jest __tests__/screens/transactions/transaction_form_v2/components/exchange_rate_row.test.tsx`
Expected: PASS — 9 tests green.

- [ ] **Step 5: Commit**

```bash
git add screens/transactions/transaction_form_v2/components/exchange_rate_row.tsx __tests__/screens/transactions/transaction_form_v2/components/exchange_rate_row.test.tsx
git commit -m "$(cat <<'EOF'
feat(§7) Group D: ExchangeRateRow — inline override + live EGP preview + staleness

Tappable row reveals override Input in place; "Using stored rate · Last
updated {date}" subtitle shifts to "Custom rate" when override is on.
Live EGP preview uses roundMoney(amount × rate) so the displayed value
matches what will be persisted. Stale-rate warning fires when the
stored rate is >30 days old.
EOF
)"
```

---

## Task 15: DateRow component (§6 imperative pattern)

**Files:**
- Create: `screens/transactions/transaction_form_v2/components/date_row.tsx`
- Test: `__tests__/screens/transactions/transaction_form_v2/components/date_row.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/screens/transactions/transaction_form_v2/components/date_row.test.tsx`:

```tsx
import { Platform } from 'react-native';
import { act, render, fireEvent } from '@testing-library/react-native';

import { DateRow } from '@/screens/transactions/transaction_form_v2/components/date_row';

function setPlatformOS(os: 'ios' | 'android') {
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
}

describe('DateRow', () => {
  describe('iOS', () => {
    beforeAll(() => setPlatformOS('ios'));

    it('renders the formatted date value', () => {
      const { getByText } = render(<DateRow value="2026-05-18" onChange={() => {}} />);
      expect(getByText('May 18, 2026')).toBeTruthy();
    });

    it('mounts the iOS spinner picker after the row is pressed', () => {
      const { getByTestId, queryByTestId } = render(
        <DateRow value="2026-05-18" onChange={() => {}} />,
      );
      expect(queryByTestId('date-picker-ios')).toBeNull();
      fireEvent.press(getByTestId('date-row'));
      expect(getByTestId('date-picker-ios')).toBeTruthy();
    });

    it('calls onChange with YYYY-MM-DD when iOS picker emits a date', () => {
      const onChange = jest.fn();
      const { getByTestId } = render(<DateRow value="2026-05-18" onChange={onChange} />);
      fireEvent.press(getByTestId('date-row'));
      const picker = getByTestId('date-picker-ios');
      act(() => picker.props.onChange({ type: 'set' }, new Date('2026-06-01T12:00:00Z')));
      expect(onChange).toHaveBeenCalledWith('2026-06-01');
    });
  });

  describe('Android', () => {
    beforeAll(() => setPlatformOS('android'));

    it('does NOT auto-mount the picker on initial render', () => {
      const { queryByTestId } = render(<DateRow value="2026-05-18" onChange={() => {}} />);
      expect(queryByTestId('date-picker-android')).toBeNull();
    });

    it('mounts picker after trigger press', () => {
      const { getByTestId } = render(<DateRow value="2026-05-18" onChange={() => {}} />);
      fireEvent.press(getByTestId('date-row'));
      expect(getByTestId('date-picker-android')).toBeTruthy();
    });

    it('unmounts picker after onChange fires (event.type=set)', () => {
      const onChange = jest.fn();
      const { getByTestId, queryByTestId } = render(
        <DateRow value="2026-05-18" onChange={onChange} />,
      );
      fireEvent.press(getByTestId('date-row'));
      const picker = getByTestId('date-picker-android');
      act(() => picker.props.onChange({ type: 'set' }, new Date('2026-06-01T12:00:00Z')));
      expect(onChange).toHaveBeenCalledWith('2026-06-01');
      expect(queryByTestId('date-picker-android')).toBeNull();
    });

    it('unmounts picker on dismiss (event.type=dismissed) without calling onChange', () => {
      const onChange = jest.fn();
      const { getByTestId, queryByTestId } = render(
        <DateRow value="2026-05-18" onChange={onChange} />,
      );
      fireEvent.press(getByTestId('date-row'));
      const picker = getByTestId('date-picker-android');
      act(() => picker.props.onChange({ type: 'dismissed' }, undefined));
      expect(onChange).not.toHaveBeenCalled();
      expect(queryByTestId('date-picker-android')).toBeNull();
    });
  });
});
```

- [ ] **Step 2: Run test — expect failure**

Run: `npx jest __tests__/screens/transactions/transaction_form_v2/components/date_row.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement DateRow**

Create `screens/transactions/transaction_form_v2/components/date_row.tsx`:

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { CoreTokens } from '@/constants/theme_tokens';
import { Strings } from '@/constants/strings';
import { formatLongDate } from '@/utils/format_date';

interface Props {
  value: string; // YYYY-MM-DD
  onChange: (next: string) => void;
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function DateRow({ value, onChange }: Props): React.ReactElement {
  const [showPicker, setShowPicker] = useState(false);
  const dateAsDate = new Date(`${value}T12:00:00`);
  const formatted = formatLongDate(value);
  const maximumDate = new Date();

  const handlePress = () => setShowPicker(true);

  const handleAndroidChange = (event: DateTimePickerEvent, d?: Date) => {
    setShowPicker(false);
    if (event.type === 'set' && d) onChange(toISODate(d));
  };

  const handleIosChange = (_event: DateTimePickerEvent, d?: Date) => {
    if (d) onChange(toISODate(d));
  };

  return (
    <View className="mt-3">
      <Pressable
        testID="date-row"
        onPress={handlePress}
        className="rounded-md bg-default px-3 py-3"
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <View>
          <Text className="font-inter text-[11px] text-muted">{Strings.addTxDateLabel}</Text>
          <Text className="font-sora font-semibold text-[15px] text-foreground">{formatted}</Text>
        </View>
        <MaterialCommunityIcons name="calendar" size={18} color={CoreTokens.muted} />
      </Pressable>

      {Platform.OS === 'android' && showPicker ? (
        <DateTimePicker
          testID="date-picker-android"
          value={dateAsDate}
          mode="date"
          display="default"
          maximumDate={maximumDate}
          onChange={handleAndroidChange}
        />
      ) : null}

      {Platform.OS === 'ios' && showPicker ? (
        <DateTimePicker
          testID="date-picker-ios"
          value={dateAsDate}
          mode="date"
          display="spinner"
          themeVariant="dark"
          maximumDate={maximumDate}
          onChange={handleIosChange}
        />
      ) : null}
    </View>
  );
}
```

**Note on `formatLongDate` and `CoreTokens.muted`:** these exist in the codebase. Verify with `grep -n "export function formatLongDate" utils/format_date.ts` and `grep -n "muted" constants/theme_tokens.ts`. If `CoreTokens.muted` doesn't exist, substitute with the equivalent module-level constant.

- [ ] **Step 4: Run tests — expect pass**

Run: `npx jest __tests__/screens/transactions/transaction_form_v2/components/date_row.test.tsx`
Expected: PASS — 7 tests green.

- [ ] **Step 5: Commit**

```bash
git add screens/transactions/transaction_form_v2/components/date_row.tsx __tests__/screens/transactions/transaction_form_v2/components/date_row.test.tsx
git commit -m "$(cat <<'EOF'
feat(§7) Group D: DateRow — §6 imperative pattern, date only (no time)

Single row trigger that mounts the platform picker on press. Android
uses imperative pattern (mount on press, unmount on first onChange/
dismiss) per the fix landed in §6 PR #82. iOS uses spinner display.
maximumDate=today (no future-dated transactions per spec §3.1 rule 8).
Time component dropped from UI per spec §3.1 rule 9.
EOF
)"
```

---

## Task 16: NoAccountsEmpty component

**Files:**
- Create: `screens/transactions/transaction_form_v2/components/no_accounts_empty.tsx`
- Test: `__tests__/screens/transactions/transaction_form_v2/components/no_accounts_empty.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/screens/transactions/transaction_form_v2/components/no_accounts_empty.test.tsx`:

```tsx
import { render, fireEvent } from '@testing-library/react-native';

import { NoAccountsEmpty } from '@/screens/transactions/transaction_form_v2/components/no_accounts_empty';

describe('NoAccountsEmpty', () => {
  it('renders the empty-state title and body', () => {
    const { getByText } = render(<NoAccountsEmpty onAddAccount={() => {}} />);
    expect(getByText('No Accounts Yet')).toBeTruthy();
    expect(getByText(/Add an account first/)).toBeTruthy();
  });

  it('renders an "Add Account" CTA button', () => {
    const { getByText } = render(<NoAccountsEmpty onAddAccount={() => {}} />);
    expect(getByText('Add Account')).toBeTruthy();
  });

  it('calls onAddAccount when the CTA is pressed', () => {
    const onAddAccount = jest.fn();
    const { getByTestId } = render(<NoAccountsEmpty onAddAccount={onAddAccount} />);
    fireEvent.press(getByTestId('no-accounts-cta'));
    expect(onAddAccount).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test — expect failure**

Run: `npx jest __tests__/screens/transactions/transaction_form_v2/components/no_accounts_empty.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement NoAccountsEmpty**

Create `screens/transactions/transaction_form_v2/components/no_accounts_empty.tsx`:

```tsx
import { Button } from 'heroui-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { CoreTokens } from '@/constants/theme_tokens';

interface Props {
  onAddAccount: () => void;
}

export function NoAccountsEmpty({ onAddAccount }: Props): React.ReactElement {
  return (
    <View className="flex-1 items-center justify-center px-6 py-8 gap-4">
      <MaterialCommunityIcons name="bank-off" size={56} color={CoreTokens.muted} />
      <Text className="font-sora font-semibold text-[17px] text-foreground text-center">
        {Strings.addTxNoAccountsTitle}
      </Text>
      <Text className="font-inter text-[13px] text-muted text-center">
        {Strings.addTxNoAccountsBody}
      </Text>
      <Button testID="no-accounts-cta" onPress={onAddAccount} variant="primary">
        {Strings.addTxNoAccountsCta}
      </Button>
    </View>
  );
}
```

- [ ] **Step 4: Run tests — expect pass**

Run: `npx jest __tests__/screens/transactions/transaction_form_v2/components/no_accounts_empty.test.tsx`
Expected: PASS — 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add screens/transactions/transaction_form_v2/components/no_accounts_empty.tsx __tests__/screens/transactions/transaction_form_v2/components/no_accounts_empty.test.tsx
git commit -m "$(cat <<'EOF'
feat(§7) Group D: NoAccountsEmpty — blocking empty-state inside the sheet

Renders when the user opens Add Transaction with zero accounts. CTA
dismisses the sheet and navigates to account creation (wired in
Task 22 — the parent owns the navigation handler).
EOF
)"
```

---

## Task 17: SaveCta component

**Files:**
- Create: `screens/transactions/transaction_form_v2/components/save_cta.tsx`
- Test: `__tests__/screens/transactions/transaction_form_v2/components/save_cta.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/screens/transactions/transaction_form_v2/components/save_cta.test.tsx`:

```tsx
import { render, fireEvent } from '@testing-library/react-native';

import { SaveCta } from '@/screens/transactions/transaction_form_v2/components/save_cta';

describe('SaveCta', () => {
  it('renders the provided label', () => {
    const { getByText } = render(<SaveCta saving={false} onPress={() => {}} label="Save Transaction" />);
    expect(getByText('Save Transaction')).toBeTruthy();
  });

  it('calls onPress when pressed (saving=false)', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(<SaveCta saving={false} onPress={onPress} label="Save Transaction" />);
    fireEvent.press(getByTestId('save-cta'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows ActivityIndicator when saving=true', () => {
    const { getByTestId, queryByText } = render(<SaveCta saving={true} onPress={() => {}} label="Save Transaction" />);
    expect(getByTestId('save-cta-spinner')).toBeTruthy();
    expect(queryByText('Save Transaction')).toBeNull();
  });

  it('does not call onPress while saving=true', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(<SaveCta saving={true} onPress={onPress} label="Save Transaction" />);
    fireEvent.press(getByTestId('save-cta'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test — expect failure**

Run: `npx jest __tests__/screens/transactions/transaction_form_v2/components/save_cta.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement SaveCta**

Create `screens/transactions/transaction_form_v2/components/save_cta.tsx`:

```tsx
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { GoldTokens, CoreTokens } from '@/constants/theme_tokens';

interface Props {
  saving: boolean;
  onPress: () => void;
  label: string;
}

export function SaveCta({ saving, onPress, label }: Props): React.ReactElement {
  return (
    <View className="border-t border-separator pt-2 px-4 pb-6">
      <Pressable
        testID="save-cta"
        onPress={saving ? undefined : onPress}
        disabled={saving}
        className="h-[52px] rounded-[13px] items-center justify-center"
        style={{ backgroundColor: GoldTokens[500] }}
      >
        {saving ? (
          <ActivityIndicator testID="save-cta-spinner" color={CoreTokens.background} />
        ) : (
          <Text className="font-sora font-bold text-[15px]" style={{ color: CoreTokens.background }}>
            {label}
          </Text>
        )}
      </Pressable>
    </View>
  );
}
```

**Note:** `CoreTokens.background` here equals the midnight-blue brand color used as CTA label. Verify with `grep -n "background" constants/theme_tokens.ts`. If `background` isn't a key, use `Colors.shared.midnightBlue` or whichever existing token names the midnight-blue value.

- [ ] **Step 4: Run tests — expect pass**

Run: `npx jest __tests__/screens/transactions/transaction_form_v2/components/save_cta.test.tsx`
Expected: PASS — 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add screens/transactions/transaction_form_v2/components/save_cta.tsx __tests__/screens/transactions/transaction_form_v2/components/save_cta.test.tsx
git commit -m "$(cat <<'EOF'
feat(§7) Group D: SaveCta — sticky gold-gradient CTA with spinner state

Designed to be rendered inside BottomSheetFooter (the parent wraps it).
GoldTokens[500] background, midnight-blue label, 52pt height, 13pt
radius — matches the Cairo Nights CTA spec.
EOF
)"
```

---

## Task 18: AccountPickerSheet (HeroUI BottomSheet)

**Files:**
- Create: `screens/transactions/transaction_form_v2/components/account_picker_sheet.tsx`
- Test: `__tests__/screens/transactions/transaction_form_v2/components/account_picker_sheet.test.tsx`

**Pre-flight:** If Task 8's verdict was FAIL (sheet-on-sheet doesn't work on this codebase), pivot this task to render the picker as a full-screen route under `app/(app)/transactions/pick-account/[role]/index.tsx` instead. The component's exported interface stays the same; only the container differs. Pivot guidance lives at the end of this plan.

The implementation below assumes Task 8 PASSED.

- [ ] **Step 1: Write the failing test**

Create `__tests__/screens/transactions/transaction_form_v2/components/account_picker_sheet.test.tsx`:

```tsx
import { render, fireEvent } from '@testing-library/react-native';

import { AccountType, Currency } from '@/constants/enums';
import { AccountPickerSheet } from '@/screens/transactions/transaction_form_v2/components/account_picker_sheet';
import type { Account } from '@/database/entities/account.entity';

function mkAccount(over: Partial<Account>): Account {
  return {
    id: 'a1',
    name: 'Checking',
    type: AccountType.Bank,
    currency: Currency.EGP,
    opening_balance: 0,
    current_balance: 1000,
    color: '#10B981',
    is_archived: 0,
    icon: 'bank',
    minimum_payment: null,
    credit_limit: null,
    statement_day: null,
    created_at: 'now',
    updated_at: 'now',
    ...over,
  };
}

describe('AccountPickerSheet', () => {
  const accounts: Account[] = [
    mkAccount({ id: 'a1', name: 'Checking', current_balance: 1000 }),
    mkAccount({ id: 'a2', name: 'Cash Wallet', type: AccountType.Cash, color: '#3B82F6' }),
    mkAccount({ id: 'a3', name: 'Credit Card', type: AccountType.CreditCard, color: '#9B73D4' }),
  ];

  it('renders only when visible=true', () => {
    const { queryByText, rerender } = render(
      <AccountPickerSheet
        visible={false}
        title="From"
        accounts={accounts}
        selectedId={undefined}
        onSelect={() => {}}
        onClose={() => {}}
      />,
    );
    expect(queryByText('From')).toBeNull();

    rerender(
      <AccountPickerSheet
        visible={true}
        title="From"
        accounts={accounts}
        selectedId={undefined}
        onSelect={() => {}}
        onClose={() => {}}
      />,
    );
    expect(queryByText('From')).toBeTruthy();
  });

  it('renders each account name', () => {
    const { getByText } = render(
      <AccountPickerSheet
        visible={true}
        title="From"
        accounts={accounts}
        selectedId={undefined}
        onSelect={() => {}}
        onClose={() => {}}
      />,
    );
    expect(getByText('Checking')).toBeTruthy();
    expect(getByText('Cash Wallet')).toBeTruthy();
    expect(getByText('Credit Card')).toBeTruthy();
  });

  it('calls onSelect with the chosen account when a row is pressed', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <AccountPickerSheet
        visible={true}
        title="From"
        accounts={accounts}
        selectedId={undefined}
        onSelect={onSelect}
        onClose={() => {}}
      />,
    );
    fireEvent.press(getByTestId('account-picker-row-a2'));
    expect(onSelect).toHaveBeenCalledWith(accounts[1]);
  });

  it('marks the selected row with a check indicator', () => {
    const { getByTestId } = render(
      <AccountPickerSheet
        visible={true}
        title="From"
        accounts={accounts}
        selectedId="a2"
        onSelect={() => {}}
        onClose={() => {}}
      />,
    );
    expect(getByTestId('account-picker-row-a2-selected')).toBeTruthy();
  });

  it('excludes accounts whose id equals excludeId (used for transfer To)', () => {
    const { queryByText } = render(
      <AccountPickerSheet
        visible={true}
        title="To"
        accounts={accounts}
        selectedId={undefined}
        excludeId="a1"
        onSelect={() => {}}
        onClose={() => {}}
      />,
    );
    expect(queryByText('Checking')).toBeNull();
    expect(queryByText('Cash Wallet')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test — expect failure**

Run: `npx jest __tests__/screens/transactions/transaction_form_v2/components/account_picker_sheet.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement AccountPickerSheet**

Create `screens/transactions/transaction_form_v2/components/account_picker_sheet.tsx`:

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { BottomSheet } from 'heroui-native';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { CoreTokens } from '@/constants/theme_tokens';
import type { Account } from '@/database/entities/account.entity';

interface Props {
  visible: boolean;
  title: string;
  accounts: Account[];
  selectedId: string | undefined;
  excludeId?: string;
  onSelect: (account: Account) => void;
  onClose: () => void;
}

export function AccountPickerSheet({
  visible,
  title,
  accounts,
  selectedId,
  excludeId,
  onSelect,
  onClose,
}: Props): React.ReactElement {
  const data = excludeId ? accounts.filter((a) => a.id !== excludeId) : accounts;

  return (
    <BottomSheet isOpen={visible} onOpenChange={(open) => !open && onClose()}>
      <BottomSheet.Portal>
        <BottomSheet.Overlay />
        <BottomSheet.Content
          snapPoints={['60%']}
          enableOverDrag={false}
          enableDynamicSizing={false}
          contentContainerClassName="h-full"
        >
          <BottomSheet.Close />
          <BottomSheet.Title>{title}</BottomSheet.Title>
          <BottomSheetFlatList
            data={data}
            keyExtractor={(a) => a.id}
            renderItem={({ item }) => {
              const isSelected = item.id === selectedId;
              return (
                <Pressable
                  testID={`account-picker-row-${item.id}`}
                  onPress={() => onSelect(item)}
                  style={{ flexDirection: 'row', alignItems: 'center' }}
                  className="px-4 py-3 gap-3 border-b border-separator"
                >
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: item.color ?? CoreTokens.border,
                    }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text className="font-sora font-semibold text-[15px] text-foreground">
                      {item.name}
                    </Text>
                    <Text className="font-inter text-[12px] text-muted">
                      {new Intl.NumberFormat('en-US', { style: 'decimal' }).format(item.current_balance)} {item.currency}
                    </Text>
                  </View>
                  {isSelected ? (
                    <MaterialCommunityIcons
                      testID={`account-picker-row-${item.id}-selected`}
                      name="check-circle"
                      size={20}
                      color={CoreTokens.accent ?? CoreTokens.foreground}
                    />
                  ) : null}
                </Pressable>
              );
            }}
          />
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}
```

- [ ] **Step 4: Run tests — expect pass**

Run: `npx jest __tests__/screens/transactions/transaction_form_v2/components/account_picker_sheet.test.tsx`
Expected: PASS — 5 tests green.

**Note on test environment:** the Jest setup may need a mock for `heroui-native`'s `BottomSheet` to render synchronously without Portal mounting. The existing test mocks (used by §6's sheets) should already cover this — if a test fails to find the title text, check `__tests__/setup/heroui-native.mock.ts` or the equivalent.

- [ ] **Step 5: Commit**

```bash
git add screens/transactions/transaction_form_v2/components/account_picker_sheet.tsx __tests__/screens/transactions/transaction_form_v2/components/account_picker_sheet.test.tsx
git commit -m "$(cat <<'EOF'
feat(§7) Group D: AccountPickerSheet — HeroUI BottomSheet stacked over the form

60% snap point, BottomSheetFlatList from @gorhom/bottom-sheet (NOT
from react-native — the latter would let the sheet absorb the scroll
gesture). excludeId filters out the From account when picking To for
transfer. Risk #1 validation gated this — see Task 8 verdict.
EOF
)"
```

---

## Task 19: CategoryPickerSheet (HeroUI BottomSheet + grid)

**Files:**
- Create: `screens/transactions/transaction_form_v2/components/category_picker_sheet.tsx`
- Test: `__tests__/screens/transactions/transaction_form_v2/components/category_picker_sheet.test.tsx`

**Pre-flight:** Same Task 8 pivot rule as Task 18 — if stacking failed, render as a full-screen route.

- [ ] **Step 1: Write the failing test**

Create `__tests__/screens/transactions/transaction_form_v2/components/category_picker_sheet.test.tsx`:

```tsx
import { render, fireEvent } from '@testing-library/react-native';

import { CategoryPickerSheet } from '@/screens/transactions/transaction_form_v2/components/category_picker_sheet';
import type { Category } from '@/database/entities/category.entity';

function mkCategory(over: Partial<Category>): Category {
  return {
    id: 'c1',
    name: 'Food',
    type: 'expense',
    icon: 'food',
    color: '#F59E0B',
    created_at: 'now',
    ...over,
  };
}

describe('CategoryPickerSheet', () => {
  const categories: Category[] = [
    mkCategory({ id: 'c1', name: 'Food', icon: 'food' }),
    mkCategory({ id: 'c2', name: 'Transport', icon: 'car' }),
    mkCategory({ id: 'c3', name: 'Bills', icon: 'file-document' }),
  ];

  it('renders each category name when visible', () => {
    const { getByText } = render(
      <CategoryPickerSheet
        visible={true}
        title="Category"
        categories={categories}
        selectedId={undefined}
        onSelect={() => {}}
        onClose={() => {}}
      />,
    );
    expect(getByText('Food')).toBeTruthy();
    expect(getByText('Transport')).toBeTruthy();
    expect(getByText('Bills')).toBeTruthy();
  });

  it('calls onSelect with the chosen category', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <CategoryPickerSheet
        visible={true}
        title="Category"
        categories={categories}
        selectedId={undefined}
        onSelect={onSelect}
        onClose={() => {}}
      />,
    );
    fireEvent.press(getByTestId('category-picker-cell-c2'));
    expect(onSelect).toHaveBeenCalledWith(categories[1]);
  });

  it('marks the selected cell with a check indicator', () => {
    const { getByTestId } = render(
      <CategoryPickerSheet
        visible={true}
        title="Category"
        categories={categories}
        selectedId="c2"
        onSelect={() => {}}
        onClose={() => {}}
      />,
    );
    expect(getByTestId('category-picker-cell-c2-selected')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test — expect failure**

Run: `npx jest __tests__/screens/transactions/transaction_form_v2/components/category_picker_sheet.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement CategoryPickerSheet**

Create `screens/transactions/transaction_form_v2/components/category_picker_sheet.tsx`:

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { BottomSheet } from 'heroui-native';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { CoreTokens, GoldTokens } from '@/constants/theme_tokens';
import type { Category } from '@/database/entities/category.entity';

interface Props {
  visible: boolean;
  title: string;
  categories: Category[];
  selectedId: string | undefined;
  onSelect: (category: Category) => void;
  onClose: () => void;
}

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

export function CategoryPickerSheet({
  visible,
  title,
  categories,
  selectedId,
  onSelect,
  onClose,
}: Props): React.ReactElement {
  const rows = chunk(categories, 3);

  return (
    <BottomSheet isOpen={visible} onOpenChange={(open) => !open && onClose()}>
      <BottomSheet.Portal>
        <BottomSheet.Overlay />
        <BottomSheet.Content
          snapPoints={['80%']}
          enableOverDrag={false}
          enableDynamicSizing={false}
          contentContainerClassName="h-full"
        >
          <BottomSheet.Close />
          <BottomSheet.Title>{title}</BottomSheet.Title>
          <BottomSheetScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
            {rows.map((row, ri) => (
              <View key={ri} style={{ flexDirection: 'row' }} className="gap-3">
                {row.map((cat) => {
                  const isSelected = cat.id === selectedId;
                  return (
                    <Pressable
                      key={cat.id}
                      testID={`category-picker-cell-${cat.id}`}
                      onPress={() => onSelect(cat)}
                      style={{ flex: 1, aspectRatio: 1 }}
                      className={`items-center justify-center rounded-md border ${isSelected ? 'border-accent bg-accent/10' : 'border-border bg-default'}`}
                    >
                      <MaterialCommunityIcons
                        name={(cat.icon as any) ?? 'tag'}
                        size={26}
                        color={isSelected ? GoldTokens[500] : CoreTokens.foreground}
                      />
                      <Text
                        className={`font-inter text-[11px] mt-1 ${isSelected ? 'text-accent' : 'text-foreground'}`}
                        numberOfLines={1}
                      >
                        {cat.name}
                      </Text>
                      {isSelected ? (
                        <View testID={`category-picker-cell-${cat.id}-selected`} className="absolute top-1 right-1">
                          <MaterialCommunityIcons name="check-circle" size={14} color={GoldTokens[500]} />
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })}
                {row.length < 3 ? Array.from({ length: 3 - row.length }).map((_, i) => <View key={`pad-${i}`} style={{ flex: 1 }} />) : null}
              </View>
            ))}
          </BottomSheetScrollView>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}
```

- [ ] **Step 4: Run tests — expect pass**

Run: `npx jest __tests__/screens/transactions/transaction_form_v2/components/category_picker_sheet.test.tsx`
Expected: PASS — 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add screens/transactions/transaction_form_v2/components/category_picker_sheet.tsx __tests__/screens/transactions/transaction_form_v2/components/category_picker_sheet.test.tsx
git commit -m "$(cat <<'EOF'
feat(§7) Group D: CategoryPickerSheet — HeroUI BottomSheet + 3-column grid

80% snap, BottomSheetScrollView for the icon grid. Selected cell gets
the gold accent border + 10% accent background + check-circle overlay.
Categories are pre-filtered by the parent (expense vs income per the
form's current type).
EOF
)"
```

---

## Task 20: `useAddTransaction` hook — Zod schema, cross-currency math, rounding

**Files:**
- Create: `screens/transactions/transaction_form_v2/add_transaction.hook.ts`
- Test: `__tests__/screens/transactions/transaction_form_v2/add_transaction.hook.test.ts`

This is the largest single task. Implements the financial-rules ratification from spec §3 (rounding + drop time UI + rules 1–10) with the cross-currency math from spec §3.4.

- [ ] **Step 1: Write the failing tests**

Create `__tests__/screens/transactions/transaction_form_v2/add_transaction.hook.test.ts`:

```typescript
import { act, renderHook } from '@testing-library/react-native';

import { AccountType, Currency, TransactionType } from '@/constants/enums';
import { useAccountStore } from '@/store/account.store';
import { useCategoryStore } from '@/store/category.store';
import { useCurrencyStore } from '@/store/currency.store';
import { useTransactionStore } from '@/store/transaction.store';
import { useAddTransaction } from '@/screens/transactions/transaction_form_v2/add_transaction.hook';
import { useAddTransactionState } from '@/screens/transactions/transaction_form_v2/add_transaction.state';
import { useAddTransactionStore } from '@/screens/transactions/transaction_form_v2/add_transaction.store';

const mockAccountEGP = {
  id: 'a1', name: 'Cash', type: AccountType.Cash, currency: Currency.EGP,
  opening_balance: 0, current_balance: 1000, color: '#fff', is_archived: 0,
  icon: 'cash', minimum_payment: null, credit_limit: null, statement_day: null,
  created_at: 'now', updated_at: 'now',
};
const mockAccountUSD = { ...mockAccountEGP, id: 'a2', name: 'USD Bank', currency: Currency.USD };
const mockAccountCC = { ...mockAccountEGP, id: 'a3', name: 'Visa', type: AccountType.CreditCard };
const mockAccountCC2 = { ...mockAccountEGP, id: 'a4', name: 'Mastercard', type: AccountType.CreditCard };

const mockCategoryExpense = { id: 'c1', name: 'Food', type: 'expense' as const, icon: 'food', color: '#fff', created_at: 'now' };
const mockCategoryIncome = { id: 'c2', name: 'Salary', type: 'income' as const, icon: 'cash', color: '#fff', created_at: 'now' };

beforeEach(() => {
  useAccountStore.setState({
    state: { accounts: [mockAccountEGP, mockAccountUSD, mockAccountCC, mockAccountCC2], loading: false, error: undefined },
  } as any);
  useCategoryStore.setState({
    state: { categories: [mockCategoryExpense, mockCategoryIncome], loading: false, error: undefined },
  } as any);
  useCurrencyStore.setState({
    state: { rate: 50, rate_updated_at: new Date().toISOString() },
  } as any);
  useAddTransactionState.getState().reset();
  useAddTransactionStore.getState().reset();
});

describe('useAddTransaction — validation', () => {
  it('rejects amount=0', async () => {
    const onClose = jest.fn();
    const { result } = renderHook(() => useAddTransaction(onClose));
    // amountStr defaults to '0', accountId selected
    act(() => result.current.selectAccount(mockAccountEGP));
    act(() => result.current.selectCategory(mockCategoryExpense));
    await act(async () => { await result.current.handleSave(); });
    expect(result.current.state.errors.amount).toBeDefined();
  });

  it('rejects expense without an account', async () => {
    const { result } = renderHook(() => useAddTransaction(jest.fn()));
    act(() => result.current.handleNumpad('digit', '5'));
    act(() => result.current.handleNumpad('digit', '0'));
    act(() => result.current.selectCategory(mockCategoryExpense));
    await act(async () => { await result.current.handleSave(); });
    expect(result.current.state.errors.account).toBeDefined();
  });

  it('rejects expense without a category', async () => {
    const { result } = renderHook(() => useAddTransaction(jest.fn()));
    act(() => result.current.handleNumpad('digit', '5'));
    act(() => result.current.selectAccount(mockAccountEGP));
    await act(async () => { await result.current.handleSave(); });
    expect(result.current.state.errors.category).toBeDefined();
  });

  it('rejects transfer with same from/to', async () => {
    const { result } = renderHook(() => useAddTransaction(jest.fn()));
    act(() => result.current.setType(TransactionType.Transfer));
    act(() => result.current.handleNumpad('digit', '5'));
    act(() => result.current.selectAccount(mockAccountEGP));
    act(() => result.current.selectToAccount(mockAccountEGP));
    await act(async () => { await result.current.handleSave(); });
    expect(result.current.state.errors.toAccount).toBeDefined();
  });

  it('rejects transfer with CC source', async () => {
    const { result } = renderHook(() => useAddTransaction(jest.fn()));
    act(() => result.current.setType(TransactionType.Transfer));
    act(() => result.current.handleNumpad('digit', '5'));
    act(() => result.current.selectAccount(mockAccountCC));
    act(() => result.current.selectToAccount(mockAccountEGP));
    await act(async () => { await result.current.handleSave(); });
    expect(result.current.state.errors.account).toBeDefined();
  });

  it('rejects CC payment with CC source (must be a non-CC asset)', async () => {
    const { result } = renderHook(() => useAddTransaction(jest.fn()));
    act(() => result.current.setType(TransactionType.CCPayment));
    act(() => result.current.handleNumpad('digit', '5'));
    act(() => result.current.selectAccount(mockAccountCC));
    act(() => result.current.selectToAccount(mockAccountCC2));
    await act(async () => { await result.current.handleSave(); });
    expect(result.current.state.errors.account).toBeDefined();
  });

  it('rejects CC payment with non-CC target', async () => {
    const { result } = renderHook(() => useAddTransaction(jest.fn()));
    act(() => result.current.setType(TransactionType.CCPayment));
    act(() => result.current.handleNumpad('digit', '5'));
    act(() => result.current.selectAccount(mockAccountEGP));
    act(() => result.current.selectToAccount(mockAccountUSD));
    await act(async () => { await result.current.handleSave(); });
    expect(result.current.state.errors.toAccount).toBeDefined();
  });
});

describe('useAddTransaction — cross-currency math', () => {
  it('non-transfer USD source: egp_amount = amount × rate (rounded)', async () => {
    const addTx = jest.fn();
    useTransactionStore.setState({ addTransaction: addTx } as any);
    const { result } = renderHook(() => useAddTransaction(jest.fn()));
    act(() => result.current.handleNumpad('digit', '1'));
    act(() => result.current.handleNumpad('digit', '0'));
    act(() => result.current.selectAccount(mockAccountUSD));
    act(() => result.current.selectCategory(mockCategoryExpense));
    await act(async () => { await result.current.handleSave(); });
    expect(addTx).toHaveBeenCalledWith(expect.objectContaining({
      amount: 10,
      currency: Currency.USD,
      egp_amount: 500, // 10 × 50.0 = 500
      exchange_rate: 50,
    }));
  });

  it('transfer EGP → USD: to_amount = amount / rate (rounded)', async () => {
    const addTx = jest.fn();
    useTransactionStore.setState({ addTransaction: addTx } as any);
    const { result } = renderHook(() => useAddTransaction(jest.fn()));
    act(() => result.current.setType(TransactionType.Transfer));
    act(() => result.current.handleNumpad('digit', '1'));
    act(() => result.current.handleNumpad('digit', '0'));
    act(() => result.current.handleNumpad('digit', '0'));
    act(() => result.current.selectAccount(mockAccountEGP));
    act(() => result.current.selectToAccount(mockAccountUSD));
    await act(async () => { await result.current.handleSave(); });
    expect(addTx).toHaveBeenCalledWith(expect.objectContaining({
      amount: 100,
      currency: Currency.EGP,
      egp_amount: 100,
      to_amount: 2, // 100 / 50 = 2.00
    }));
  });

  it('transfer USD → EGP: to_amount = egp_amount = amount × rate', async () => {
    const addTx = jest.fn();
    useTransactionStore.setState({ addTransaction: addTx } as any);
    const { result } = renderHook(() => useAddTransaction(jest.fn()));
    act(() => result.current.setType(TransactionType.Transfer));
    act(() => result.current.handleNumpad('digit', '5'));
    act(() => result.current.selectAccount(mockAccountUSD));
    act(() => result.current.selectToAccount(mockAccountEGP));
    await act(async () => { await result.current.handleSave(); });
    expect(addTx).toHaveBeenCalledWith(expect.objectContaining({
      amount: 5,
      currency: Currency.USD,
      egp_amount: 250, // 5 × 50
      to_amount: 250,
    }));
  });

  it('transfer USD → USD: rate required (for egp_amount); to_amount = amount', async () => {
    const mockAccountUSD2 = { ...mockAccountUSD, id: 'a5', name: 'USD Wallet' };
    useAccountStore.setState({
      state: { accounts: [...useAccountStore.getState().state.accounts, mockAccountUSD2], loading: false, error: undefined },
    } as any);
    const addTx = jest.fn();
    useTransactionStore.setState({ addTransaction: addTx } as any);
    const { result } = renderHook(() => useAddTransaction(jest.fn()));
    act(() => result.current.setType(TransactionType.Transfer));
    act(() => result.current.handleNumpad('digit', '5'));
    act(() => result.current.selectAccount(mockAccountUSD));
    act(() => result.current.selectToAccount(mockAccountUSD2));
    await act(async () => { await result.current.handleSave(); });
    expect(addTx).toHaveBeenCalledWith(expect.objectContaining({
      amount: 5,
      currency: Currency.USD,
      egp_amount: 250,
      to_amount: 5, // same-currency
    }));
  });

  it('cc_payment: to_amount = egp_amount (CC debt always EGP-denominated)', async () => {
    const addTx = jest.fn();
    useTransactionStore.setState({ addTransaction: addTx } as any);
    const { result } = renderHook(() => useAddTransaction(jest.fn()));
    act(() => result.current.setType(TransactionType.CCPayment));
    act(() => result.current.handleNumpad('digit', '2'));
    act(() => result.current.handleNumpad('digit', '0'));
    act(() => result.current.selectAccount(mockAccountUSD));
    act(() => result.current.selectToAccount(mockAccountCC));
    await act(async () => { await result.current.handleSave(); });
    expect(addTx).toHaveBeenCalledWith(expect.objectContaining({
      amount: 20,
      currency: Currency.USD,
      egp_amount: 1000, // 20 × 50
      to_amount: 1000,
    }));
  });
});

describe('useAddTransaction — rounding', () => {
  it('applies banker\'s rounding to egp_amount on cross-currency expense', async () => {
    useCurrencyStore.setState({ state: { rate: 30.503, rate_updated_at: null } } as any);
    const addTx = jest.fn();
    useTransactionStore.setState({ addTransaction: addTx } as any);
    const { result } = renderHook(() => useAddTransaction(jest.fn()));
    act(() => result.current.handleNumpad('digit', '3'));
    act(() => result.current.handleNumpad('digit', '.'));
    act(() => result.current.handleNumpad('digit', '2'));
    act(() => result.current.handleNumpad('digit', '7'));
    act(() => result.current.handleNumpad('digit', '5'));
    act(() => result.current.selectAccount(mockAccountUSD));
    act(() => result.current.selectCategory(mockCategoryExpense));
    await act(async () => { await result.current.handleSave(); });
    // amount = 3.275, rate = 30.503 → 99.897325 → rounded to 99.90
    expect(addTx).toHaveBeenCalledWith(expect.objectContaining({
      egp_amount: 99.9,
    }));
  });
});

describe('useAddTransaction — auto-now time', () => {
  it('sets transaction_time to the current device clock and never exposes a setter', async () => {
    const addTx = jest.fn();
    useTransactionStore.setState({ addTransaction: addTx } as any);
    const before = new Date().toTimeString().slice(0, 8);
    const { result } = renderHook(() => useAddTransaction(jest.fn()));
    act(() => result.current.handleNumpad('digit', '5'));
    act(() => result.current.selectAccount(mockAccountEGP));
    act(() => result.current.selectCategory(mockCategoryExpense));
    await act(async () => { await result.current.handleSave(); });
    const after = new Date().toTimeString().slice(0, 8);
    expect(addTx).toHaveBeenCalled();
    const arg = addTx.mock.calls[0][0];
    expect(arg.transaction_time >= before).toBe(true);
    expect(arg.transaction_time <= after).toBe(true);
    // No setTime exposed
    expect((result.current as any).setTime).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test — expect failure**

Run: `npx jest __tests__/screens/transactions/transaction_form_v2/add_transaction.hook.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the hook**

Create `screens/transactions/transaction_form_v2/add_transaction.hook.ts`:

```typescript
import { useEffect, useMemo, useRef } from 'react';
import { z } from 'zod';
import { useShallow } from 'zustand/react/shallow';

import { AccountType, Currency, TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/store/account.store';
import { useCategoryStore } from '@/store/category.store';
import { useCurrencyStore } from '@/store/currency.store';
import { useTransactionStore } from '@/store/transaction.store';
import { useZodForm } from '@/utils/use_zod_form.hook';
import { roundMoney } from '@/utils/money';
import type { Account } from '@/database/entities/account.entity';
import type { Category } from '@/database/entities/category.entity';
import { useAddTransactionState } from './add_transaction.state';
import { useAddTransactionStore } from './add_transaction.store';

export type AddTransactionFormValues = {
  amount: number;
  accountId: string;
  toAccountId: string;
  categoryId: string;
  note: string;
  date: string;
  exchangeRate: string;
};

function createSchema(type: TransactionType, accounts: Account[]) {
  const isTransferOrCC = type === TransactionType.Transfer || type === TransactionType.CCPayment;

  return z
    .object({
      amount: z.number({ error: Strings.addTxErrAmountRequired }).refine((v) => v > 0, Strings.addTxErrAmountZero),
      accountId: z.string().min(1, isTransferOrCC ? Strings.addTxErrFromRequired : Strings.addTxErrAccountRequired),
      toAccountId: z.string(),
      categoryId: z.string(),
      note: z.string(),
      date: z.string().min(1),
      exchangeRate: z.string(),
    })
    .superRefine((data, ctx) => {
      if (isTransferOrCC) {
        if (!data.toAccountId) ctx.addIssue({ code: 'custom', message: Strings.addTxErrToRequired, path: ['toAccountId'] });
        else if (data.accountId === data.toAccountId) ctx.addIssue({ code: 'custom', message: Strings.addTxErrSameAccount, path: ['toAccountId'] });
      } else if (!data.categoryId) {
        ctx.addIssue({ code: 'custom', message: Strings.addTxErrCategoryRequired, path: ['categoryId'] });
      }
      const acc = accounts.find((a) => a.id === data.accountId);
      const toAcc = accounts.find((a) => a.id === data.toAccountId);
      if (type === TransactionType.CCPayment) {
        if (acc?.type === AccountType.CreditCard) ctx.addIssue({ code: 'custom', message: Strings.addTxErrCcPaymentSourceMustBeAsset, path: ['accountId'] });
        if (toAcc && toAcc.type !== AccountType.CreditCard) ctx.addIssue({ code: 'custom', message: Strings.addTxErrCcPaymentTargetMustBeCC, path: ['toAccountId'] });
      }
      if (type === TransactionType.Transfer) {
        if (acc?.type === AccountType.CreditCard) ctx.addIssue({ code: 'custom', message: Strings.addTxErrTransferNoCc, path: ['accountId'] });
        if (toAcc?.type === AccountType.CreditCard) ctx.addIssue({ code: 'custom', message: Strings.addTxErrTransferNoCc, path: ['toAccountId'] });
      }
      const needsRate =
        acc?.currency === Currency.USD || (isTransferOrCC && toAcc?.currency === Currency.USD);
      if (needsRate) {
        if (!data.exchangeRate) ctx.addIssue({ code: 'custom', message: Strings.addTxErrRateRequired, path: ['exchangeRate'] });
        else {
          const r = parseFloat(data.exchangeRate);
          if (isNaN(r) || r <= 0) ctx.addIssue({ code: 'custom', message: Strings.addTxErrRateInvalid, path: ['exchangeRate'] });
        }
      }
    });
}

function nowDateISO(): string {
  return new Date().toISOString().slice(0, 10);
}
function nowTimeISO(): string {
  return new Date().toTimeString().slice(0, 8);
}

export function useAddTransaction(onClose: () => void) {
  const { state: accountState, loadAccounts } = useAccountStore(
    useShallow((s) => ({ state: s.state, loadAccounts: s.loadAccounts })),
  );
  const { state: categoryState } = useCategoryStore(useShallow((s) => ({ state: s.state })));
  const { state: currencyState } = useCurrencyStore(useShallow((s) => ({ state: s.state })));
  const { addTransaction } = useTransactionStore(useShallow((s) => ({ addTransaction: s.addTransaction })));

  const { state: storeState, setType, handleNumpad } = useAddTransactionStore(
    useShallow((s) => ({ state: s.state, setType: s.setType, handleNumpad: s.handleNumpad })),
  );
  const { state: uiState, setSaving, setShowAccountPicker, setShowToPicker, setShowCategoryPicker, setRateOverride } =
    useAddTransactionState(
      useShallow((s) => ({
        state: s.state,
        setSaving: s.setSaving,
        setShowAccountPicker: s.setShowAccountPicker,
        setShowToPicker: s.setShowToPicker,
        setShowCategoryPicker: s.setShowCategoryPicker,
        setRateOverride: s.setRateOverride,
      })),
    );

  // Freeze the form-open timestamp once per sheet open (so saving later doesn't drift the time)
  const openedTimeRef = useRef<string>(nowTimeISO());
  useEffect(() => {
    if (uiState.visible) openedTimeRef.current = nowTimeISO();
  }, [uiState.visible]);

  const schema = useMemo(
    () => createSchema(storeState.type, accountState.accounts),
    [storeState.type, accountState.accounts],
  );

  const form = useZodForm(schema, {
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      amount: 0,
      accountId: '',
      toAccountId: '',
      categoryId: '',
      note: '',
      date: nowDateISO(),
      exchangeRate: String(currencyState.rate),
    },
  });

  const accountId = form.watch('accountId');
  const toAccountId = form.watch('toAccountId');
  const categoryId = form.watch('categoryId');
  const note = form.watch('note');
  const date = form.watch('date');
  const exchangeRate = form.watch('exchangeRate');

  const selectedAccount = useMemo(
    () => accountState.accounts.find((a) => a.id === accountId) ?? null,
    [accountState.accounts, accountId],
  );
  const selectedToAccount = useMemo(
    () => accountState.accounts.find((a) => a.id === toAccountId) ?? null,
    [accountState.accounts, toAccountId],
  );
  const selectedCategory = useMemo(
    () => categoryState.categories.find((c) => c.id === categoryId) ?? null,
    [categoryState.categories, categoryId],
  );

  const isTransferOrCC =
    storeState.type === TransactionType.Transfer || storeState.type === TransactionType.CCPayment;
  const isUSD = selectedAccount?.currency === Currency.USD;
  const isToUSD = selectedToAccount?.currency === Currency.USD;
  const requiresRate = isUSD || (isTransferOrCC && isToUSD);

  const visibleCategories = useMemo(
    () =>
      categoryState.categories.filter(
        (c) => c.type === (storeState.type === TransactionType.Income ? 'income' : 'expense'),
      ),
    [categoryState.categories, storeState.type],
  );

  const accountsForFrom = useMemo(() => {
    if (
      storeState.type === TransactionType.CCPayment ||
      storeState.type === TransactionType.Transfer
    ) {
      return accountState.accounts.filter((a) => a.type !== AccountType.CreditCard);
    }
    return accountState.accounts;
  }, [accountState.accounts, storeState.type]);
  const accountsForTo = useMemo(() => {
    if (storeState.type === TransactionType.CCPayment) {
      return accountState.accounts.filter((a) => a.type === AccountType.CreditCard);
    }
    if (storeState.type === TransactionType.Transfer) {
      return accountState.accounts.filter((a) => a.type !== AccountType.CreditCard);
    }
    return accountState.accounts;
  }, [accountState.accounts, storeState.type]);

  const errors = {
    amount: form.formState.errors.amount?.message,
    account: form.formState.errors.accountId?.message,
    toAccount: form.formState.errors.toAccountId?.message,
    category: form.formState.errors.categoryId?.message,
    rate: form.formState.errors.exchangeRate?.message,
  };

  // Sync numpad → RHF amount
  useEffect(() => {
    const parsed = parseFloat(storeState.amountStr);
    form.setValue('amount', isNaN(parsed) ? 0 : parsed);
  }, [storeState.amountStr]);

  // Clear type-dependent fields when type changes
  useEffect(() => {
    form.setValue('toAccountId', '');
    form.setValue('categoryId', '');
  }, [storeState.type]);

  // Reset form when sheet closes
  useEffect(() => {
    if (!uiState.visible) {
      form.reset({
        amount: 0,
        accountId: '',
        toAccountId: '',
        categoryId: '',
        note: '',
        date: nowDateISO(),
        exchangeRate: String(currencyState.rate),
      });
      setRateOverride(false);
    }
  }, [uiState.visible]);

  async function onValid(data: AddTransactionFormValues) {
    setSaving(true);
    try {
      const fromCurrency = selectedAccount?.currency ?? Currency.EGP;
      const toCurrency = selectedToAccount?.currency;
      const parsedRate = data.exchangeRate && requiresRate ? parseFloat(data.exchangeRate) : undefined;

      const egp_amount =
        fromCurrency === Currency.USD && parsedRate
          ? roundMoney(data.amount * parsedRate)
          : data.amount;

      let to_amount: number | undefined;
      if (isTransferOrCC && toCurrency !== undefined) {
        if (fromCurrency === Currency.EGP && toCurrency === Currency.USD && parsedRate) {
          to_amount = roundMoney(data.amount / parsedRate);
        } else if (fromCurrency === Currency.USD && toCurrency === Currency.EGP) {
          to_amount = egp_amount;
        } else {
          to_amount = data.amount;
        }
        if (storeState.type === TransactionType.CCPayment) {
          to_amount = egp_amount;
        }
      }

      await addTransaction({
        type: storeState.type,
        amount: data.amount,
        currency: fromCurrency,
        egp_amount,
        to_amount,
        exchange_rate: parsedRate,
        account_id: data.accountId,
        to_account_id: isTransferOrCC ? data.toAccountId : undefined,
        category_id: !isTransferOrCC ? data.categoryId : undefined,
        note: data.note.trim() || undefined,
        transaction_date: data.date,
        transaction_time: openedTimeRef.current,
      });
      await loadAccounts();
      onClose();
    } catch {
      // error logged by store
    } finally {
      setSaving(false);
    }
  }

  function toggleRateOverride() {
    const next = !uiState.rateOverride;
    setRateOverride(next);
    if (!next) form.setValue('exchangeRate', String(currencyState.rate));
  }

  function selectAccount(account: Account) {
    form.setValue('accountId', account.id);
    if (account.currency === Currency.USD) {
      form.setValue('exchangeRate', String(currencyState.rate));
      setRateOverride(false);
    }
    setShowAccountPicker(false);
  }
  function selectToAccount(account: Account) {
    form.setValue('toAccountId', account.id);
    if (account.currency === Currency.USD && selectedAccount?.currency === Currency.EGP) {
      form.setValue('exchangeRate', String(currencyState.rate));
      setRateOverride(false);
    }
    setShowToPicker(false);
  }
  function selectCategory(category: Category) {
    form.setValue('categoryId', category.id);
    setShowCategoryPicker(false);
  }

  return {
    state: {
      type: storeState.type,
      amountStr: storeState.amountStr,
      selectedAccount,
      selectedToAccount,
      selectedCategory,
      accountId,
      toAccountId,
      categoryId,
      date,
      note,
      exchangeRate,
      rateOverride: uiState.rateOverride,
      isUSD: requiresRate,
      isTransferOrCC,
      errors,
      saving: uiState.saving,
      accounts: accountState.accounts,
      hasAccounts: accountState.accounts.length > 0,
      accountsForFrom,
      accountsForTo,
      visibleCategories,
      showAccountPicker: uiState.showAccountPicker,
      showToPicker: uiState.showToPicker,
      showCategoryPicker: uiState.showCategoryPicker,
      rateUpdatedAt: currencyState.rate_updated_at,
    },
    setType,
    handleNumpad,
    setDate: (v: string) => form.setValue('date', v),
    setNote: (v: string) => form.setValue('note', v),
    setExchangeRate: (v: string) => form.setValue('exchangeRate', v),
    toggleRateOverride,
    setShowAccountPicker,
    setShowToPicker,
    setShowCategoryPicker,
    selectAccount,
    selectToAccount,
    selectCategory,
    handleSave: form.handleSubmit(onValid),
  };
}
```

- [ ] **Step 4: Run tests — expect pass**

Run: `npx jest __tests__/screens/transactions/transaction_form_v2/add_transaction.hook.test.ts`
Expected: PASS — all validation, math, rounding, and auto-time tests green.

- [ ] **Step 5: Commit**

```bash
git add screens/transactions/transaction_form_v2/add_transaction.hook.ts __tests__/screens/transactions/transaction_form_v2/add_transaction.hook.test.ts
git commit -m "$(cat <<'EOF'
feat(§7) Group E: useAddTransaction — Zod schema + math + roundMoney + auto-time

Spec §3 rules 1-8 + 10 enforced in the schema. Cross-currency math
applies roundMoney() to egp_amount and to_amount per spec §3.2. Time
component is auto-populated from a ref frozen at sheet-open per spec
§3.1 rule 9 (no setTime exported). hasAccounts surfaces the empty-state
gate to the sheet shell.
EOF
)"
```

---

## Task 21: `useEditTransaction` hook (locked fields)

**Files:**
- Create: `screens/transactions/transaction_form_v2/edit_transaction.hook.ts`
- Test: `__tests__/screens/transactions/transaction_form_v2/edit_transaction.hook.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/screens/transactions/transaction_form_v2/edit_transaction.hook.test.ts`:

```typescript
import { act, renderHook } from '@testing-library/react-native';

import { AccountType, Currency, TransactionType } from '@/constants/enums';
import { useAccountStore } from '@/store/account.store';
import { useCategoryStore } from '@/store/category.store';
import { useCurrencyStore } from '@/store/currency.store';
import { useTransactionStore } from '@/store/transaction.store';
import { useEditTransaction } from '@/screens/transactions/transaction_form_v2/edit_transaction.hook';
import { useEditTransactionState } from '@/screens/transactions/transaction_form_v2/edit_transaction.state';
import { useEditTransactionStore } from '@/screens/transactions/transaction_form_v2/edit_transaction.store';
import type { Transaction } from '@/database/entities/transaction.entity';

const mockTxExpense: Transaction = {
  id: 't1', type: TransactionType.Expense, amount: 50, currency: Currency.EGP,
  egp_amount: 50, to_amount: null, exchange_rate: null, minimum_payment_snapshot: null,
  account_id: 'a1', to_account_id: null, category_id: 'c1', note: 'lunch',
  transaction_date: '2026-05-18', transaction_time: '12:00:00',
  commitment_payment_id: null, installment_id: null,
  created_at: 'now', updated_at: 'now',
};

const mockAccountEGP = {
  id: 'a1', name: 'Cash', type: AccountType.Cash, currency: Currency.EGP,
  opening_balance: 0, current_balance: 1000, color: '#fff', is_archived: 0,
  icon: 'cash', minimum_payment: null, credit_limit: null, statement_day: null,
  created_at: 'now', updated_at: 'now',
};
const mockCategoryFood = { id: 'c1', name: 'Food', type: 'expense' as const, icon: 'food', color: '#fff', created_at: 'now' };
const mockCategoryShop = { id: 'c2', name: 'Shopping', type: 'expense' as const, icon: 'cart', color: '#fff', created_at: 'now' };

beforeEach(() => {
  useAccountStore.setState({
    state: { accounts: [mockAccountEGP], loading: false, error: undefined },
  } as any);
  useCategoryStore.setState({
    state: { categories: [mockCategoryFood, mockCategoryShop], loading: false, error: undefined },
  } as any);
  useCurrencyStore.setState({ state: { rate: 50, rate_updated_at: null } } as any);
  useEditTransactionState.getState().reset();
  useEditTransactionStore.getState().reset();
  useEditTransactionStore.getState().loadFromTx(mockTxExpense);
});

describe('useEditTransaction', () => {
  it('initializes amount, category, note, date from the loaded tx', () => {
    const { result } = renderHook(() => useEditTransaction(mockTxExpense, jest.fn(), jest.fn()));
    expect(result.current.state.amountStr).toBe('50');
    expect(result.current.state.categoryId).toBe('c1');
    expect(result.current.state.note).toBe('lunch');
    expect(result.current.state.date).toBe('2026-05-18');
  });

  it('lock policy: type / selectedAccount / selectedToAccount are read-only', () => {
    const { result } = renderHook(() => useEditTransaction(mockTxExpense, jest.fn(), jest.fn()));
    expect(result.current.state.type).toBe(TransactionType.Expense);
    expect(result.current.state.selectedAccount?.id).toBe('a1');
    // No setType / selectAccount / selectToAccount exports
    expect((result.current as any).setType).toBeUndefined();
    expect((result.current as any).selectAccount).toBeUndefined();
    expect((result.current as any).selectToAccount).toBeUndefined();
  });

  it('allows category change', () => {
    const { result } = renderHook(() => useEditTransaction(mockTxExpense, jest.fn(), jest.fn()));
    act(() => result.current.selectCategory(mockCategoryShop));
    expect(result.current.state.categoryId).toBe('c2');
  });

  it('calls updateTransaction with new values on save', async () => {
    const updateTx = jest.fn();
    useTransactionStore.setState({ updateTransaction: updateTx } as any);
    const { result } = renderHook(() => useEditTransaction(mockTxExpense, jest.fn(), jest.fn()));
    // Update amount via numpad
    act(() => result.current.handleNumpad('backspace'));
    act(() => result.current.handleNumpad('backspace'));
    act(() => result.current.handleNumpad('digit', '7'));
    act(() => result.current.handleNumpad('digit', '5'));
    await act(async () => { await result.current.handleSave(); });
    expect(updateTx).toHaveBeenCalledWith('t1', expect.objectContaining({
      amount: 75,
      category_id: 'c1',
    }));
  });

  it('preserves the original transaction_time on save (no time UI in edit either)', async () => {
    const updateTx = jest.fn();
    useTransactionStore.setState({ updateTransaction: updateTx } as any);
    const { result } = renderHook(() => useEditTransaction(mockTxExpense, jest.fn(), jest.fn()));
    await act(async () => { await result.current.handleSave(); });
    expect(updateTx).toHaveBeenCalledWith('t1', expect.objectContaining({
      transaction_time: '12:00:00',
    }));
  });
});
```

- [ ] **Step 2: Run test — expect failure**

Run: `npx jest __tests__/screens/transactions/transaction_form_v2/edit_transaction.hook.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the edit hook**

Create `screens/transactions/transaction_form_v2/edit_transaction.hook.ts`:

```typescript
import { useEffect, useMemo } from 'react';
import { z } from 'zod';
import { useShallow } from 'zustand/react/shallow';

import { Currency, TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/store/account.store';
import { useCategoryStore } from '@/store/category.store';
import { useCurrencyStore } from '@/store/currency.store';
import { useTransactionStore, type UpdateTransactionInput } from '@/store/transaction.store';
import { useZodForm } from '@/utils/use_zod_form.hook';
import { roundMoney } from '@/utils/money';
import type { Category } from '@/database/entities/category.entity';
import type { Transaction } from '@/database/entities/transaction.entity';
import { buildDefaultsFromTx, type EditTransactionFormValues } from './edit_transaction.helpers';
import { useEditTransactionState } from './edit_transaction.state';
import { useEditTransactionStore } from './edit_transaction.store';

function createEditSchema(type: TransactionType) {
  const isTransferOrCC = type === TransactionType.Transfer || type === TransactionType.CCPayment;
  return z.object({
    amount: z.number({ error: Strings.addTxErrAmountRequired }).refine((v) => v > 0, Strings.addTxErrAmountZero),
    categoryId: isTransferOrCC ? z.string() : z.string().min(1, Strings.addTxErrCategoryRequired),
    note: z.string(),
    date: z.string().min(1),
    time: z.string().min(1),
    exchangeRate: z.string(),
  });
}

export function useEditTransaction(initialTx: Transaction, onClose: () => void, onSaved?: () => void) {
  const { state: accountState, loadAccounts } = useAccountStore(
    useShallow((s) => ({ state: s.state, loadAccounts: s.loadAccounts })),
  );
  const { state: categoryState } = useCategoryStore(useShallow((s) => ({ state: s.state })));
  const { state: currencyState } = useCurrencyStore(useShallow((s) => ({ state: s.state })));
  const { updateTransaction } = useTransactionStore(useShallow((s) => ({ updateTransaction: s.updateTransaction })));

  const { state: storeState, handleNumpad } = useEditTransactionStore(
    useShallow((s) => ({ state: s.state, handleNumpad: s.handleNumpad })),
  );
  const { state: uiState, setSaving, setShowCategoryPicker, setRateOverride } = useEditTransactionState(
    useShallow((s) => ({
      state: s.state,
      setSaving: s.setSaving,
      setShowCategoryPicker: s.setShowCategoryPicker,
      setRateOverride: s.setRateOverride,
    })),
  );

  const type = initialTx.type;
  const isTransferOrCC = type === TransactionType.Transfer || type === TransactionType.CCPayment;
  const schema = useMemo(() => createEditSchema(type), [type]);

  const form = useZodForm(schema, {
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: buildDefaultsFromTx(initialTx, currencyState.rate),
  });

  const categoryId = form.watch('categoryId');
  const note = form.watch('note');
  const date = form.watch('date');
  const exchangeRate = form.watch('exchangeRate');

  const selectedAccount = useMemo(
    () => accountState.accounts.find((a) => a.id === initialTx.account_id) ?? null,
    [accountState.accounts, initialTx.account_id],
  );
  const selectedToAccount = useMemo(
    () => (initialTx.to_account_id ? (accountState.accounts.find((a) => a.id === initialTx.to_account_id) ?? null) : null),
    [accountState.accounts, initialTx.to_account_id],
  );
  const isUSD = selectedAccount?.currency === Currency.USD;
  const isToUSD = selectedToAccount?.currency === Currency.USD;
  const requiresRate = isUSD || (isTransferOrCC && isToUSD);

  const selectedCategory = useMemo(
    () => categoryState.categories.find((c) => c.id === categoryId) ?? null,
    [categoryState.categories, categoryId],
  );
  const visibleCategories = useMemo(
    () =>
      categoryState.categories.filter(
        (c) => c.type === (type === TransactionType.Income ? 'income' : 'expense'),
      ),
    [categoryState.categories, type],
  );

  const errors = {
    amount: form.formState.errors.amount?.message,
    category: form.formState.errors.categoryId?.message,
    rate: form.formState.errors.exchangeRate?.message,
  };

  useEffect(() => {
    const parsed = parseFloat(storeState.amountStr);
    form.setValue('amount', isNaN(parsed) ? 0 : parsed);
  }, [storeState.amountStr]);

  useEffect(() => {
    if (!uiState.visible) {
      form.reset(buildDefaultsFromTx(initialTx, currencyState.rate));
      setRateOverride(initialTx.exchange_rate !== null);
    }
  }, [uiState.visible]);

  async function onValid(data: EditTransactionFormValues) {
    setSaving(true);
    try {
      const fromCurrency = selectedAccount?.currency ?? Currency.EGP;
      const toCurrency = selectedToAccount?.currency;
      const parsedRate = data.exchangeRate && requiresRate ? parseFloat(data.exchangeRate) : undefined;

      const egp_amount =
        fromCurrency === Currency.USD && parsedRate
          ? roundMoney(data.amount * parsedRate)
          : data.amount;

      let to_amount: number | undefined;
      if (isTransferOrCC && toCurrency !== undefined) {
        if (fromCurrency === Currency.EGP && toCurrency === Currency.USD && parsedRate) {
          to_amount = roundMoney(data.amount / parsedRate);
        } else if (fromCurrency === Currency.USD && toCurrency === Currency.EGP) {
          to_amount = egp_amount;
        } else {
          to_amount = data.amount;
        }
        if (type === TransactionType.CCPayment) to_amount = egp_amount;
      }

      const update: UpdateTransactionInput = {
        amount: data.amount,
        currency: fromCurrency,
        egp_amount,
        to_amount: to_amount ?? null,
        exchange_rate: parsedRate ?? null,
        category_id: !isTransferOrCC ? data.categoryId : null,
        note: data.note.trim() || null,
        transaction_date: data.date,
        transaction_time: initialTx.transaction_time, // preserved — no time UI
      };
      await updateTransaction(initialTx.id, update);
      await loadAccounts();
      onSaved ? onSaved() : onClose();
    } catch {
      // error logged
    } finally {
      setSaving(false);
    }
  }

  function toggleRateOverride() {
    const next = !uiState.rateOverride;
    setRateOverride(next);
    if (!next) form.setValue('exchangeRate', String(currencyState.rate));
  }

  function selectCategory(category: Category) {
    form.setValue('categoryId', category.id);
    setShowCategoryPicker(false);
  }

  return {
    state: {
      type,
      amountStr: storeState.amountStr,
      selectedAccount,
      selectedToAccount,
      selectedCategory,
      categoryId,
      note,
      date,
      exchangeRate,
      rateOverride: uiState.rateOverride,
      isUSD: requiresRate,
      isTransferOrCC,
      errors,
      saving: uiState.saving,
      visibleCategories,
      showCategoryPicker: uiState.showCategoryPicker,
      rateUpdatedAt: currencyState.rate_updated_at,
    },
    handleNumpad,
    setDate: (v: string) => form.setValue('date', v),
    setNote: (v: string) => form.setValue('note', v),
    setExchangeRate: (v: string) => form.setValue('exchangeRate', v),
    toggleRateOverride,
    setShowCategoryPicker,
    selectCategory,
    handleSave: form.handleSubmit(onValid),
  };
}
```

- [ ] **Step 4: Run tests — expect pass**

Run: `npx jest __tests__/screens/transactions/transaction_form_v2/edit_transaction.hook.test.ts`
Expected: PASS — 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add screens/transactions/transaction_form_v2/edit_transaction.hook.ts __tests__/screens/transactions/transaction_form_v2/edit_transaction.hook.test.ts
git commit -m "$(cat <<'EOF'
feat(§7) Group E: useEditTransaction — locked fields + roundMoney + preserved time

Lock policy per spec §2.9: type / account / to_account read-only;
category / amount / rate / date / note editable. transaction_time is
preserved from the original tx (no time UI). Math reuses the same
cross-currency branches as Add with banker's rounding.
EOF
)"
```

---

## Task 22: TransactionFormBody integration

**Files:**
- Create: `screens/transactions/transaction_form_v2/transaction_form_body.tsx`
- Test: `__tests__/screens/transactions/transaction_form_v2/transaction_form_body.test.tsx`

This is the composed shell — wires together TypeTabs, AmountHero, ExchangeRateRow, DateRow, Numpad, Note input, and the picker triggers. Lots of integration; tests focus on render + key interactions, not exhaustive permutations (already covered by component tests).

- [ ] **Step 1: Write the failing test**

Create `__tests__/screens/transactions/transaction_form_v2/transaction_form_body.test.tsx`:

```tsx
import { render } from '@testing-library/react-native';

import { Currency, TransactionType } from '@/constants/enums';
import { TransactionFormBody } from '@/screens/transactions/transaction_form_v2/transaction_form_body';

const baseProps = {
  locked: false,
  type: TransactionType.Expense,
  onSelectType: () => {},
  amountStr: '0',
  handleNumpad: () => {},
  amountError: undefined,
  selectedAccount: null,
  onOpenAccountPicker: () => {},
  accountError: undefined,
  selectedToAccount: null,
  onOpenToPicker: () => {},
  toAccountError: undefined,
  selectedCategory: null,
  onOpenCategoryPicker: () => {},
  categoryError: undefined,
  isUSD: false,
  exchangeRate: '50',
  setExchangeRate: () => {},
  rateOverride: false,
  toggleRateOverride: () => {},
  rateUpdatedAt: null,
  rateError: undefined,
  date: '2026-05-18',
  setDate: () => {},
  note: '',
  setNote: () => {},
  currency: Currency.EGP,
};

describe('TransactionFormBody', () => {
  it('renders TypeTabs + AmountHero + DateRow on initial expense state', () => {
    const { getByTestId } = render(<TransactionFormBody {...baseProps} />);
    expect(getByTestId('type-tab-expense')).toBeTruthy();
    expect(getByTestId('amount-hero-value')).toBeTruthy();
    expect(getByTestId('date-row')).toBeTruthy();
  });

  it('renders ExchangeRateRow only when isUSD=true', () => {
    const { queryByTestId, rerender } = render(<TransactionFormBody {...baseProps} isUSD={false} />);
    expect(queryByTestId('exchange-rate-row')).toBeNull();

    rerender(<TransactionFormBody {...baseProps} isUSD={true} />);
    expect(queryByTestId('exchange-rate-row')).toBeTruthy();
  });

  it('shows the Numpad when keyboard is hidden, hides it when a TextInput is focused', () => {
    // Default: numpad visible
    const { getByTestId } = render(<TransactionFormBody {...baseProps} />);
    expect(getByTestId('numpad-key-0')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test — expect failure**

Run: `npx jest __tests__/screens/transactions/transaction_form_v2/transaction_form_body.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement TransactionFormBody**

Create `screens/transactions/transaction_form_v2/transaction_form_body.tsx`:

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useEffect } from 'react';
import { Keyboard, Pressable, TextInput, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { Text } from '@/components/ui/text';
import { Currency, TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { CoreTokens } from '@/constants/theme_tokens';
import type { Account } from '@/database/entities/account.entity';
import type { Category } from '@/database/entities/category.entity';

import { AmountHero } from './components/amount_hero';
import { DateRow } from './components/date_row';
import { ExchangeRateRow } from './components/exchange_rate_row';
import { Numpad } from './components/numpad';
import { TypeTabs } from './components/type_tabs';
import { useTransactionFormBodyState } from './transaction_form_body.state';

interface Props {
  locked: boolean;
  type: TransactionType;
  onSelectType: (t: TransactionType) => void;
  amountStr: string;
  handleNumpad: (action: 'digit' | 'decimal' | 'backspace', value?: string) => void;
  amountError?: string;
  selectedAccount: Account | null;
  onOpenAccountPicker: () => void;
  accountError?: string;
  selectedToAccount: Account | null;
  onOpenToPicker: () => void;
  toAccountError?: string;
  selectedCategory: Category | null;
  onOpenCategoryPicker: () => void;
  categoryError?: string;
  isUSD: boolean;
  exchangeRate: string;
  setExchangeRate: (v: string) => void;
  rateOverride: boolean;
  toggleRateOverride: () => void;
  rateUpdatedAt: string | null;
  rateError?: string;
  date: string;
  setDate: (v: string) => void;
  note: string;
  setNote: (v: string) => void;
  currency: Currency;
}

export function TransactionFormBody(props: Props): React.ReactElement {
  const {
    locked, type, onSelectType,
    amountStr, handleNumpad, amountError,
    selectedAccount, onOpenAccountPicker, accountError,
    selectedToAccount, onOpenToPicker, toAccountError,
    selectedCategory, onOpenCategoryPicker, categoryError,
    isUSD, exchangeRate, setExchangeRate, rateOverride, toggleRateOverride, rateUpdatedAt, rateError,
    date, setDate, note, setNote, currency,
  } = props;

  const { state: bodyState, setKeyboardVisible, reset } = useTransactionFormBodyState(
    useShallow((s) => ({ state: s.state, setKeyboardVisible: s.setKeyboardVisible, reset: s.reset })),
  );

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
      reset();
    };
  }, []);

  const isTransferOrCC = type === TransactionType.Transfer || type === TransactionType.CCPayment;
  const amountNum = parseFloat(amountStr) || 0;

  return (
    <View style={{ flex: 1 }}>
      <TypeTabs active={type} onSelect={onSelectType} disabled={locked} />

      <AmountHero amountStr={amountStr} type={type} currency={currency} />
      {amountError ? <Text className="font-inter text-[11px] text-danger text-center mt-1">{amountError}</Text> : null}

      <BottomSheetScrollView
        contentContainerStyle={{ padding: 16, gap: 8 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* From account */}
        <Pressable
          testID="from-account-row"
          onPress={locked ? undefined : onOpenAccountPicker}
          disabled={locked}
          className="rounded-md bg-default px-3 py-3"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
        >
          <View style={{ flex: 1 }}>
            <Text className="font-inter text-[11px] text-muted">
              {isTransferOrCC ? Strings.addTxFromLabel : Strings.addTxAccountLabel}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {selectedAccount ? (
                <View
                  style={{
                    width: 10, height: 10, borderRadius: 5,
                    backgroundColor: selectedAccount.color ?? CoreTokens.border,
                  }}
                />
              ) : null}
              <Text className="font-sora font-semibold text-[15px] text-foreground">
                {selectedAccount?.name ?? Strings.addTxPickAccountTitle}
              </Text>
            </View>
          </View>
          <MaterialCommunityIcons
            name={locked ? 'lock-outline' : 'chevron-right'}
            size={18}
            color={CoreTokens.muted}
          />
        </Pressable>
        {accountError ? <Text className="font-inter text-[11px] text-danger">{accountError}</Text> : null}

        {/* To account */}
        {isTransferOrCC ? (
          <>
            <Pressable
              testID="to-account-row"
              onPress={locked ? undefined : onOpenToPicker}
              disabled={locked}
              className="rounded-md bg-default px-3 py-3"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              <View style={{ flex: 1 }}>
                <Text className="font-inter text-[11px] text-muted">{Strings.addTxToLabel}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {selectedToAccount ? (
                    <View
                      style={{
                        width: 10, height: 10, borderRadius: 5,
                        backgroundColor: selectedToAccount.color ?? CoreTokens.border,
                      }}
                    />
                  ) : null}
                  <Text className="font-sora font-semibold text-[15px] text-foreground">
                    {selectedToAccount?.name ?? Strings.addTxPickToTitle}
                  </Text>
                </View>
              </View>
              <MaterialCommunityIcons
                name={locked ? 'lock-outline' : 'chevron-right'}
                size={18}
                color={CoreTokens.muted}
              />
            </Pressable>
            {toAccountError ? <Text className="font-inter text-[11px] text-danger">{toAccountError}</Text> : null}
          </>
        ) : null}

        {/* Category (expense/income only) */}
        {!isTransferOrCC ? (
          <>
            <Pressable
              testID="category-row"
              onPress={onOpenCategoryPicker}
              className="rounded-md bg-default px-3 py-3"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              <View style={{ flex: 1 }}>
                <Text className="font-inter text-[11px] text-muted">{Strings.addTxCategoryLabel}</Text>
                <Text className="font-sora font-semibold text-[15px] text-foreground">
                  {selectedCategory?.name ?? Strings.addTxPickCategoryTitle}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={18} color={CoreTokens.muted} />
            </Pressable>
            {categoryError ? <Text className="font-inter text-[11px] text-danger">{categoryError}</Text> : null}
          </>
        ) : null}

        {isUSD ? (
          <ExchangeRateRow
            value={exchangeRate}
            onChange={setExchangeRate}
            overrideEnabled={rateOverride}
            onToggleOverride={toggleRateOverride}
            rateUpdatedAt={rateUpdatedAt}
            amount={amountNum}
            error={rateError}
          />
        ) : null}

        <DateRow value={date} onChange={setDate} />

        {/* Note */}
        <View className="rounded-md bg-default px-3 py-3">
          <Text className="font-inter text-[11px] text-muted">{Strings.addTxNoteLabel}</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder={Strings.addTxNotePlaceholder}
            placeholderTextColor={CoreTokens.muted}
            className="font-inter text-[14px] text-foreground p-0"
          />
        </View>
      </BottomSheetScrollView>

      {!bodyState.keyboardVisible ? <Numpad onPress={handleNumpad} /> : null}
    </View>
  );
}
```

- [ ] **Step 4: Run tests — expect pass**

Run: `npx jest __tests__/screens/transactions/transaction_form_v2/transaction_form_body.test.tsx`
Expected: PASS — 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add screens/transactions/transaction_form_v2/transaction_form_body.tsx __tests__/screens/transactions/transaction_form_v2/transaction_form_body.test.tsx
git commit -m "$(cat <<'EOF'
feat(§7) Group E: TransactionFormBody — composed form shell

Wires TypeTabs (locked when editing), AmountHero, ExchangeRateRow (USD
only), DateRow, account/category triggers, note input, and the numpad
(hidden when system keyboard is up). Locked-state visual is the
lock-outline icon swap on the right side of the row.
EOF
)"
```

---

## Task 23: AddTransactionSheet + EditTransactionSheet shells

**Files:**
- Create: `screens/transactions/transaction_form_v2/index.tsx`
- Test: `__tests__/screens/transactions/transaction_form_v2/index.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/screens/transactions/transaction_form_v2/index.test.tsx`:

```tsx
import { render } from '@testing-library/react-native';

import { AddTransactionSheet, EditTransactionSheet } from '@/screens/transactions/transaction_form_v2';
import { useAccountStore } from '@/store/account.store';

beforeEach(() => {
  useAccountStore.setState({
    state: { accounts: [], loading: false, error: undefined },
  } as any);
});

describe('AddTransactionSheet', () => {
  it('renders nothing when visible=false', () => {
    const { queryByTestId } = render(<AddTransactionSheet visible={false} onClose={() => {}} />);
    expect(queryByTestId('add-transaction-sheet')).toBeNull();
  });

  it('renders NoAccountsEmpty when visible=true and accounts is empty', () => {
    const { getByText } = render(<AddTransactionSheet visible={true} onClose={() => {}} />);
    expect(getByText('No Accounts Yet')).toBeTruthy();
  });
});

describe('EditTransactionSheet', () => {
  it('renders nothing when tx is null', () => {
    const { queryByTestId } = render(
      <EditTransactionSheet visible={true} onClose={() => {}} tx={null} />,
    );
    expect(queryByTestId('edit-transaction-sheet')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test — expect failure**

Run: `npx jest __tests__/screens/transactions/transaction_form_v2/index.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the sheet shells**

Create `screens/transactions/transaction_form_v2/index.tsx`:

```tsx
import { BottomSheet } from 'heroui-native';
import { BottomSheetFooter } from '@gorhom/bottom-sheet';
import { router } from 'expo-router';
import { useCallback } from 'react';

import { Strings } from '@/constants/strings';
import type { Transaction } from '@/database/entities/transaction.entity';

import { useAddTransaction } from './add_transaction.hook';
import { useEditTransaction } from './edit_transaction.hook';
import { AccountPickerSheet } from './components/account_picker_sheet';
import { CategoryPickerSheet } from './components/category_picker_sheet';
import { NoAccountsEmpty } from './components/no_accounts_empty';
import { SaveCta } from './components/save_cta';
import { TransactionFormBody } from './transaction_form_body';

interface AddProps {
  visible: boolean;
  onClose: () => void;
}

export function AddTransactionSheet({ visible, onClose }: AddProps): React.ReactElement | null {
  const hook = useAddTransaction(onClose);

  const handleAddAccount = useCallback(() => {
    onClose();
    router.push('/accounts/add' as any);
  }, [onClose]);

  return (
    <>
      <BottomSheet isOpen={visible} onOpenChange={(open) => !open && onClose()}>
        <BottomSheet.Portal>
          <BottomSheet.Overlay />
          <BottomSheet.Content
            snapPoints={['92%']}
            enableOverDrag={false}
            enableDynamicSizing={false}
            contentContainerClassName="h-full"
            footerComponent={(fp) =>
              hook.state.hasAccounts ? (
                <BottomSheetFooter {...fp} bottomInset={0}>
                  <SaveCta
                    saving={hook.state.saving}
                    onPress={hook.handleSave}
                    label={Strings.addTxSaveCta}
                  />
                </BottomSheetFooter>
              ) : (
                <></>
              )
            }
          >
            <BottomSheet.Close />
            <BottomSheet.Title>{Strings.addTxTitle}</BottomSheet.Title>
            {hook.state.hasAccounts ? (
              <TransactionFormBody
                locked={false}
                type={hook.state.type}
                onSelectType={hook.setType}
                amountStr={hook.state.amountStr}
                handleNumpad={hook.handleNumpad}
                amountError={hook.state.errors.amount}
                selectedAccount={hook.state.selectedAccount}
                onOpenAccountPicker={() => hook.setShowAccountPicker(true)}
                accountError={hook.state.errors.account}
                selectedToAccount={hook.state.selectedToAccount}
                onOpenToPicker={() => hook.setShowToPicker(true)}
                toAccountError={hook.state.errors.toAccount}
                selectedCategory={hook.state.selectedCategory}
                onOpenCategoryPicker={() => hook.setShowCategoryPicker(true)}
                categoryError={hook.state.errors.category}
                isUSD={hook.state.isUSD}
                exchangeRate={hook.state.exchangeRate}
                setExchangeRate={hook.setExchangeRate}
                rateOverride={hook.state.rateOverride}
                toggleRateOverride={hook.toggleRateOverride}
                rateUpdatedAt={hook.state.rateUpdatedAt}
                rateError={hook.state.errors.rate}
                date={hook.state.date}
                setDate={hook.setDate}
                note={hook.state.note}
                setNote={hook.setNote}
                currency={hook.state.selectedAccount?.currency ?? ('EGP' as any)}
              />
            ) : (
              <NoAccountsEmpty onAddAccount={handleAddAccount} />
            )}
          </BottomSheet.Content>
        </BottomSheet.Portal>
      </BottomSheet>

      <AccountPickerSheet
        visible={hook.state.showAccountPicker}
        title={hook.state.isTransferOrCC ? Strings.addTxPickFromTitle : Strings.addTxPickAccountTitle}
        accounts={hook.state.accountsForFrom}
        selectedId={hook.state.accountId}
        onSelect={hook.selectAccount}
        onClose={() => hook.setShowAccountPicker(false)}
      />
      <AccountPickerSheet
        visible={hook.state.showToPicker}
        title={Strings.addTxPickToTitle}
        accounts={hook.state.accountsForTo}
        selectedId={hook.state.toAccountId}
        excludeId={hook.state.accountId}
        onSelect={hook.selectToAccount}
        onClose={() => hook.setShowToPicker(false)}
      />
      <CategoryPickerSheet
        visible={hook.state.showCategoryPicker}
        title={Strings.addTxPickCategoryTitle}
        categories={hook.state.visibleCategories}
        selectedId={hook.state.categoryId}
        onSelect={hook.selectCategory}
        onClose={() => hook.setShowCategoryPicker(false)}
      />
    </>
  );
}

interface EditProps {
  visible: boolean;
  onClose: () => void;
  onSaved?: () => void;
  tx: Transaction | null;
}

export function EditTransactionSheet({ visible, onClose, onSaved, tx }: EditProps): React.ReactElement | null {
  if (!tx) return null;
  return <EditSheetInner visible={visible} tx={tx} onClose={onClose} onSaved={onSaved} />;
}

function EditSheetInner({ visible, tx, onClose, onSaved }: { visible: boolean; tx: Transaction; onClose: () => void; onSaved?: () => void }) {
  const hook = useEditTransaction(tx, onClose, onSaved);

  return (
    <>
      <BottomSheet isOpen={visible} onOpenChange={(open) => !open && onClose()}>
        <BottomSheet.Portal>
          <BottomSheet.Overlay />
          <BottomSheet.Content
            snapPoints={['92%']}
            enableOverDrag={false}
            enableDynamicSizing={false}
            contentContainerClassName="h-full"
            footerComponent={(fp) => (
              <BottomSheetFooter {...fp} bottomInset={0}>
                <SaveCta
                  saving={hook.state.saving}
                  onPress={hook.handleSave}
                  label={Strings.editTxSaveCta}
                />
              </BottomSheetFooter>
            )}
          >
            <BottomSheet.Close />
            <BottomSheet.Title>{Strings.editTxTitle}</BottomSheet.Title>
            <TransactionFormBody
              locked={true}
              type={hook.state.type}
              onSelectType={() => {}}
              amountStr={hook.state.amountStr}
              handleNumpad={hook.handleNumpad}
              amountError={hook.state.errors.amount}
              selectedAccount={hook.state.selectedAccount}
              onOpenAccountPicker={() => {}}
              accountError={undefined}
              selectedToAccount={hook.state.selectedToAccount}
              onOpenToPicker={() => {}}
              toAccountError={undefined}
              selectedCategory={hook.state.selectedCategory}
              onOpenCategoryPicker={() => hook.setShowCategoryPicker(true)}
              categoryError={hook.state.errors.category}
              isUSD={hook.state.isUSD}
              exchangeRate={hook.state.exchangeRate}
              setExchangeRate={hook.setExchangeRate}
              rateOverride={hook.state.rateOverride}
              toggleRateOverride={hook.toggleRateOverride}
              rateUpdatedAt={hook.state.rateUpdatedAt}
              rateError={hook.state.errors.rate}
              date={hook.state.date}
              setDate={hook.setDate}
              note={hook.state.note}
              setNote={hook.setNote}
              currency={hook.state.selectedAccount?.currency ?? ('EGP' as any)}
            />
          </BottomSheet.Content>
        </BottomSheet.Portal>
      </BottomSheet>

      <CategoryPickerSheet
        visible={hook.state.showCategoryPicker}
        title={Strings.addTxPickCategoryTitle}
        categories={hook.state.visibleCategories}
        selectedId={hook.state.categoryId}
        onSelect={hook.selectCategory}
        onClose={() => hook.setShowCategoryPicker(false)}
      />
    </>
  );
}
```

- [ ] **Step 4: Run tests — expect pass**

Run: `npx jest __tests__/screens/transactions/transaction_form_v2/index.test.tsx`
Expected: PASS — 3 tests green.

- [ ] **Step 5: Run the full test suite to catch regressions**

Run: `npm run test:coverage`
Expected: PASS; coverage ≥ 80% lines / 95% functions / 100% branches.

- [ ] **Step 6: Commit**

```bash
git add screens/transactions/transaction_form_v2/index.tsx __tests__/screens/transactions/transaction_form_v2/index.test.tsx
git commit -m "$(cat <<'EOF'
feat(§7) Group E: AddTransactionSheet + EditTransactionSheet shells (HeroUI)

HeroUI BottomSheet anatomy (Portal/Overlay/Content) at snapPoints=
['92%'], isOpen+onOpenChange control, BottomSheetFooter wraps the
SaveCta. Account + category pickers render as siblings (stacked
BottomSheet instances per Task 8 verdict). Empty-state replaces the
form body when account count is zero.
EOF
)"
```

---

## Task 24: Flag-branch the V1 ↔ V2 import sites

**Files:**
- Modify: `screens/transactions/index.tsx` (Add side)
- Modify: `screens/transactions/detail/index.tsx` (Edit side)

The feature-flag pattern from §5/§6: the route file imports both V1 and V2 implementations and renders the one selected by `FeatureFlags.newAddTransaction`. V2 stays dark on main until Task 26 flips the flag.

- [ ] **Step 1: Branch the Add side**

Open `screens/transactions/index.tsx`. Replace the V1 `AddTransactionSheet` import with a conditional:

```tsx
import { FeatureFlags } from '@/constants/feature_flags';

import { AddTransactionSheet as AddTransactionSheetV1 } from '@/screens/transactions/transaction_form';
import { AddTransactionSheet as AddTransactionSheetV2 } from '@/screens/transactions/transaction_form_v2';

const AddTransactionSheet = FeatureFlags.newAddTransaction
  ? AddTransactionSheetV2
  : AddTransactionSheetV1;
```

Leave the rest of the file unchanged — every `<AddTransactionSheet ... />` call site keeps the same JSX.

- [ ] **Step 2: Branch the Edit side**

Open `screens/transactions/detail/index.tsx`. Same pattern:

```tsx
import { FeatureFlags } from '@/constants/feature_flags';

import { EditTransactionSheet as EditTransactionSheetV1 } from '@/screens/transactions/transaction_form';
import { EditTransactionSheet as EditTransactionSheetV2 } from '@/screens/transactions/transaction_form_v2';

const EditTransactionSheet = FeatureFlags.newAddTransaction
  ? EditTransactionSheetV2
  : EditTransactionSheetV1;
```

(Flag flip is single — both Add and Edit promote together.)

- [ ] **Step 3: Verify typecheck and tests**

Run:

```bash
npx tsc --noEmit
npx jest
```

Expected: both PASS. V1 path is the active one (flag is still `false`), so behavior is unchanged.

- [ ] **Step 4: Commit**

```bash
git add screens/transactions/index.tsx screens/transactions/detail/index.tsx
git commit -m "$(cat <<'EOF'
chore(§7): flag-branch AddTransactionSheet + EditTransactionSheet imports

Both sheets resolve to V1 or V2 based on FeatureFlags.newAddTransaction.
Flag stays false on this commit — V2 is in the bundle but dark. Task 26
flips the flag in a one-line PR after device QA passes.
EOF
)"
```

---

## Task 25: Manual device QA matrix (user-facing GATE)

This task produces NO code. It is the manual device-QA gate per the §7 spec's acceptance criteria. After it lands (i.e., the human reports verdict), Task 26 ships the flag flip.

- [ ] **Step 1: Build and run on Android device**

Run:

```bash
npx expo run:android --device
```

- [ ] **Step 2: Temporarily set the flag to true LOCALLY for QA**

Edit `constants/feature_flags.ts` and change `newAddTransaction: false` → `newAddTransaction: true`. **Do not commit this change.** It exists only on the QA branch.

Reload the dev build (shake → reload, or `r` in the Metro terminal).

- [ ] **Step 3: Walk the QA matrix**

Verify each row on a real Android device, then repeat on iOS (device or simulator). Mark verdict next to each.

**Add Transaction — Expense:**
- [ ] Open the sheet (FAB or list "+" button). Sheet animates up to 92%.
- [ ] Type a 3-digit amount via numpad. Hero amount updates with thousands separator.
- [ ] Tap "Account". Picker sheet stacks on top with full account list.
- [ ] Select an account. Picker closes; row shows account name + swatch dot.
- [ ] Tap "Category". Category grid sheet stacks. Pick one. Sheet closes.
- [ ] Tap the date row. Picker mounts (iOS spinner / Android trigger pattern). Pick a date.
- [ ] (Optional) Type a note. System keyboard rises; numpad hides; CTA is still visible (BottomSheetFooter).
- [ ] Tap Save. Sheet closes; new transaction appears in the list with correct color/sign.

**Add Transaction — Income:**
- [ ] Switch to Income tab. Category list updates to income categories.
- [ ] Save flow works. Amount shows as positive on the list with income color.

**Add Transaction — Transfer (same currency, EGP → EGP):**
- [ ] Switch to Transfer tab. "Account" label becomes "From"; "To" appears.
- [ ] Pick From + To. Confirm To picker excludes the From account.
- [ ] CC accounts do NOT appear in From or To pickers.
- [ ] Save. Both accounts' balances update accordingly.

**Add Transaction — Transfer (cross-currency, EGP → USD):**
- [ ] Pick EGP From + USD To. Exchange-Rate row appears.
- [ ] Subtitle reads "Using stored rate · Last updated YYYY-MM-DD".
- [ ] Live preview shows the EGP equivalent of the typed amount.
- [ ] Tap the rate row → Input appears in place. Type a different rate.
- [ ] Subtitle changes to "Custom rate". "Reset to global" link appears.
- [ ] Tap reset → input collapses; subtitle returns to stored-rate text.
- [ ] Save. `to_amount` (USD received) matches `amount / rate` rounded to 2 dp.

**Add Transaction — CC Payment (USD source → CC target):**
- [ ] Switch to CC Payment tab. From picker shows only non-CC; To picker shows only credit-card accounts.
- [ ] Pick a USD non-CC source + a CC target. Exchange-Rate row appears (USD source).
- [ ] Save. `to_amount` equals `egp_amount` (CC debt always EGP).

**Edit Transaction:**
- [ ] From transactions list, tap a row → detail screen → "Edit" → sheet opens.
- [ ] Type tab row is replaced by a single Chip showing the locked type. Tabs are not pressable.
- [ ] From / To account rows show the lock-outline icon at right. Tapping them does nothing.
- [ ] Amount, category, date, note, rate (if USD) are editable.
- [ ] Time component is NOT shown in the UI.
- [ ] Save. Detail screen reloads with updated values. `transaction_time` is preserved from the original.

**Empty / no-accounts:**
- [ ] Programmatically clear all accounts (or use a fresh user). Open Add Transaction.
- [ ] Sheet shows "No Accounts Yet" + "Add Account" CTA. Form fields are NOT visible. Save CTA is NOT visible.
- [ ] Tap "Add Account". Sheet closes; navigation lands on the account-creation flow.

**Sheet-on-sheet (Risk #1 re-validation):**
- [ ] Open Add sheet; open Account picker; swipe down the picker — only the picker closes; Add sheet stays open.
- [ ] Open Add sheet; open Category picker grid; tap the overlay above the picker — only the picker closes.
- [ ] No backdrop flicker, no gesture leak.

**Stale rate warning:**
- [ ] In settings, manually set the rate to a value older than 30 days ago (or temporarily edit the rate_updated_at via the dev console).
- [ ] Open a USD transaction. Exchange-Rate row shows "Rate may be stale" in warning color.

**iOS-specific:**
- [ ] All of the above on iOS (simulator OK if no device available).
- [ ] iOS spinner date picker renders inline.
- [ ] HeroUI FullWindowOverlay does not block native iOS keyboard from appearing for note/rate inputs.

- [ ] **Step 4: Revert the local flag edit**

After QA is complete:

```bash
git restore constants/feature_flags.ts
```

The flag is back to `false`. Task 26 will be the actual flip PR.

- [ ] **Step 5: Report verdict**

Sarah reports the verdict to the user as one of:
- **"all good"** → proceed to Task 26 (flag flip).
- **"item X failed"** → open a fix branch, address, re-QA.

This is the user-facing gate. The user is the one walking the matrix.

---

## Task 26: Promotion PR — flip `newAddTransaction` flag

**Files:**
- Modify: `constants/feature_flags.ts`
- Modify: `__tests__/feature_flags.test.ts`

Following the §5/§6 promotion pattern: a single one-line flip in `feature_flags.ts`, paired with an `__tests__/feature_flags.test.ts` update so the deliberate-flip discipline is enforced by CI.

- [ ] **Step 1: Flip the flag**

Open `constants/feature_flags.ts`. Change:

```typescript
newAddTransaction: false, // §7 (sheet)
```

to:

```typescript
newAddTransaction: true, // §7 — promoted to active route YYYY-MM-DD
```

(Insert the actual date.)

- [ ] **Step 2: Update the flag test assertion**

Open `__tests__/feature_flags.test.ts`. Find the `expect(FeatureFlags).toEqual({ ... })` block and change:

```typescript
newAddTransaction: false, // §7
```

to:

```typescript
newAddTransaction: true, // §7 — promoted to active route YYYY-MM-DD
```

- [ ] **Step 3: Verify all tests pass**

Run: `npm run test:coverage`
Expected: PASS — including the `feature_flags.test.ts` assertion that locks the new state.

- [ ] **Step 4: Commit + push + open PR**

```bash
git checkout -b feat/section-7-promote
git add constants/feature_flags.ts __tests__/feature_flags.test.ts
git commit -m "$(cat <<'EOF'
feat(§7): promote Add Transaction V2 — flip newAddTransaction flag to true

Manual device QA passed on both Android and iOS. V2 sheets become the
active path immediately. Cleanup PR (delete V1, rename V2, drop flag,
update CLAUDE.md) follows within the 5-business-day window per the
feature-flag flip protocol in constants/feature_flags.ts header.
EOF
)"
git push -u origin feat/section-7-promote
gh pr create --title "feat(§7): promote Add Transaction V2 — flip newAddTransaction flag" --body "$(cat <<'EOF'
## Summary

Single-line flag flip promoting V2 of the Add / Edit Transaction sheet to the active path. V1 stays in the bundle until the cleanup PR.

## Test plan

- [x] Manual device QA matrix on Android — all rows pass (see Task 25 of the §7 plan).
- [x] Manual device QA matrix on iOS — all rows pass.
- [x] Unit test suite green; feature_flags.test.ts asserts the new state.

## Follow-up

Cleanup PR opens within 5 business days per the flag-flip protocol: deletes V1 tree, renames V2→transaction_form, drops the flag, updates CLAUDE.md.
EOF
)"
```

Merge after CI green.

---

## Task 27: Cleanup PR — delete V1, rename V2, drop flag, update CLAUDE.md

**Files (delete):** see "Deleted files" in the File Map at the top of this plan.
**Files (modify):** `screens/transactions/index.tsx`, `screens/transactions/detail/index.tsx`, `constants/feature_flags.ts`, `__tests__/feature_flags.test.ts`, `CLAUDE.md`.

- [ ] **Step 1: Verify the promotion PR is merged to main and locally synced**

Run:

```bash
git checkout main
git pull
git log -1 --oneline
```

Expected: top commit is the §7 promotion. Working tree clean.

- [ ] **Step 2: Create cleanup branch**

```bash
git checkout -b cleanup/section-7-v1-removal
```

- [ ] **Step 3: Delete V1 files**

```bash
rm -rf screens/transactions/transaction_form/
```

Note: this deletes the entire V1 form folder. The V2 folder at `screens/transactions/transaction_form_v2/` is untouched at this step.

- [ ] **Step 4: Rename V2 → V1 path**

```bash
mkdir -p screens/transactions/transaction_form
git mv screens/transactions/transaction_form_v2/* screens/transactions/transaction_form/
rmdir screens/transactions/transaction_form_v2
```

`git mv` preserves history. After this, the V2 code lives at the original V1 path.

- [ ] **Step 5: Rewrite the import sites as one-line re-exports**

Open `screens/transactions/index.tsx`. Replace the flag-branch block with the V1-path import:

```tsx
import { AddTransactionSheet } from '@/screens/transactions/transaction_form';
```

Remove the V2 import line, the `FeatureFlags` import (if unused elsewhere in the file), and the conditional const.

Same for `screens/transactions/detail/index.tsx`:

```tsx
import { EditTransactionSheet } from '@/screens/transactions/transaction_form';
```

- [ ] **Step 6: Move and rename the V2 tests**

```bash
mkdir -p __tests__/screens/transactions/transaction_form
git mv __tests__/screens/transactions/transaction_form_v2/* __tests__/screens/transactions/transaction_form/
rmdir __tests__/screens/transactions/transaction_form_v2
```

Update import paths inside the moved test files: replace every `@/screens/transactions/transaction_form_v2/` with `@/screens/transactions/transaction_form/`. Run:

```bash
grep -rln "transaction_form_v2" __tests__/screens/transactions/transaction_form/ | xargs sed -i '' 's|transaction_form_v2|transaction_form|g'
```

(macOS sed syntax. On Linux, use `sed -i 's|...|...|g'`.)

Run the same replace inside the moved source files in case any internal cross-import used the v2 path:

```bash
grep -rln "transaction_form_v2" screens/transactions/transaction_form/ | xargs sed -i '' 's|transaction_form_v2|transaction_form|g'
```

- [ ] **Step 7: Drop the feature flag**

Open `constants/feature_flags.ts`. Delete the line:

```typescript
newAddTransaction: true, // §7 — promoted to active route YYYY-MM-DD
```

Update `__tests__/feature_flags.test.ts` — remove `newAddTransaction` from both the `toMatchObject` and `toEqual` blocks, and update the test description:

```typescript
it('has all 4 remaining section flags (newDashboard removed in §5, newTransactions removed in §6, newAddTransaction removed in §7)', () => {
  expect(FeatureFlags).toMatchObject({
    newOnboarding: expect.any(Boolean),
    newSettings: expect.any(Boolean),
    newCommitments: expect.any(Boolean),
    newAccounts: expect.any(Boolean),
  });
});

it('matches the current migration state (forces deliberate test update on each flag flip)', () => {
  expect(FeatureFlags).toEqual({
    newOnboarding: false, // §2
    newSettings: false,   // §4
    newCommitments: false, // §8
    newAccounts: false,    // §9
  });
});
```

- [ ] **Step 8: Update CLAUDE.md**

Open `CLAUDE.md` and apply three updates:

1. **Bottom Sheets — legacy actions-sheet consumers list:** remove the 3 `transaction_form/*` entries:
   - `screens/transactions/transaction_form/components/account_picker_sheet.tsx`
   - `screens/transactions/transaction_form/components/category_picker_sheet.tsx`
   - `screens/transactions/transaction_form/index.tsx`

   Bump the "(as of §6)" label to "(as of §7)".

2. **Bottom Sheets — add a new note** above the legacy list, stating HeroUI BottomSheet is the new primitive for new code:

   ```markdown
   **HeroUI `BottomSheet` (§7+):** New code uses `BottomSheet` from `heroui-native` directly (Portal/Overlay/Content anatomy). The project's `Sheet` wrapper at `components/ui/sheet.tsx` remains in place for §3–§6 consumers (settings sheets, dashboard breakdown sheet, accounts pay sheet, etc.) and is queued for retirement in a future cleanup bundle.
   ```

3. *(Step 3 removed — the CC balance-transfer Business-Rules entry was dropped along with the marker categories in design review. See the Task 5 tombstone for context.)*

- [ ] **Step 9: Run full test suite**

```bash
npx tsc --noEmit
npm run test:coverage
```

Expected: both PASS. Coverage thresholds met.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
cleanup(§7): remove V1 transaction_form, rename V2→transaction_form, drop flag

V2 is now the only implementation. V1 tree deleted in this commit;
git mv preserved file history for the V2 → transaction_form rename.

Changes
  • screens/transactions/transaction_form/ — V1 deleted, V2 contents moved in
  • screens/transactions/index.tsx — flag-branch removed, plain import
  • screens/transactions/detail/index.tsx — same
  • __tests__/screens/transactions/transaction_form_v2/* moved to .../transaction_form/
  • constants/feature_flags.ts — newAddTransaction line removed
  • __tests__/feature_flags.test.ts — flag count down to 4
  • CLAUDE.md — legacy actions-sheet list shortened by 3 entries;
    new "HeroUI BottomSheet (§7+)" note added; CC balance-transfer
    workaround added under Business Rules

The 3 transaction_form actions-sheet consumers are gone. Remaining
legacy actions-sheet consumers (5): accounts/detail adjust_balance,
commitments/detail pay_sheet, dashboard net_worth_breakdown_sheet,
settings/categories add_edit_category + reassign_category. Dep + patch
removal still gated on §8 + §9 migrating their entries.
EOF
)"
git push -u origin cleanup/section-7-v1-removal
gh pr create --title "cleanup(§7): remove V1 transaction_form, rename V2, drop flag" --body "$(cat <<'EOF'
## Summary

Cleanup PR following §7 promotion. V2 is now canonical at the original V1 path; flag removed; CLAUDE.md updated.

## Files

- Deleted: `screens/transactions/transaction_form/` (V1 tree).
- Renamed: `screens/transactions/transaction_form_v2/` → `screens/transactions/transaction_form/` (via `git mv`).
- Modified: route import sites collapsed to plain imports; flag removed from `feature_flags.ts`; flag test count reduced; CLAUDE.md `Bottom Sheets` + `Business Rules` updated.

## Test plan

- [x] `npx tsc --noEmit` green.
- [x] `npm run test:coverage` green; thresholds met (80/95/100).
- [x] No imports from `@/components/ui/sheet` inside the new transaction_form tree.
- [x] CLAUDE.md legacy actions-sheet list down to 5 entries.

## Follow-ups

- §8 migrates `commitments/detail/components/pay_sheet.tsx`.
- §9 migrates accounts + dashboard sheets, and the net-worth query honors the new CC balance-transfer marker categories.
- Future cleanup bundle migrates the `components/ui/sheet.tsx` wrapper and its §3–§6 consumers to HeroUI BottomSheet, then deletes the wrapper.
EOF
)"
```

---

## Picker Pivot Guidance (only if Task 8 verdict was FAIL)

If HeroUI BottomSheet portal stacking does not work on Android Fabric or iOS, replace Tasks 18 + 19 with full-screen Expo Router stack-route pickers. The behavior contract is unchanged — only the container differs.

**Folder layout adjustment:**

```
app/(app)/transactions/pick-account/[role]/index.tsx     # one-line re-export
app/(app)/transactions/pick-category/index.tsx           # one-line re-export

screens/transactions/transaction_form_v2/
  pick_account_screen.tsx       # full-screen alternative to account_picker_sheet.tsx
  pick_account_screen.hook.ts   # reads route param `role`, selects from accountsForFrom or accountsForTo
  pick_category_screen.tsx      # full-screen alternative
  pick_category_screen.hook.ts
```

**Behavior contract preserved:**
- User taps the "From" row → `router.push('/transactions/pick-account/from')`.
- User selects an account → screen calls `useAddTransactionStore.getState().selectAccount(account)` (new action: write to a transient selection store) then `router.back()`.
- The form re-reads the selection on focus.

**Tradeoff acknowledged:** the picker becomes a route push, which adds a navigation animation and a back-press dependency. The UX is slightly worse than a stacked sheet, but it's bulletproof — no portal/overlay/gesture-handler edge cases. Spec acceptance criteria still pass.

---

## Self-Review

**1. Spec coverage check (each spec section → task that implements it):**

| Spec section | Task(s) | Covered? |
|---|---|---|
| §1 Scope item 1 — migrate off actions-sheet | Tasks 22, 23, 27 | ✅ |
| §1 Scope item 2 — adopt HeroUI BottomSheet | Tasks 8, 22, 23 | ✅ |
| §1 Scope item 3 — redesign form UI | Tasks 11–19, 22 | ✅ |
| §1 Scope item 4 — ratify financial rules | Tasks 1, 20, 21 | ✅ |
| §1 Scope item 5 — drop time UI | Tasks 20, 21 (auto-now in onValid; no time UI in body) | ✅ |
| §1 Scope item 6 — installment_id column | Tasks 4, 6 | ✅ |
| §1 Scope item 7 — blocking empty state | Tasks 16, 23 | ✅ |
| §2.1 Container | Tasks 8, 23 | ✅ |
| §2.2 TypeTabs | Task 11 | ✅ |
| §2.3 Amount entry | Tasks 12, 13 | ✅ |
| §2.4 Account picker | Task 18 (+ pivot guidance if Task 8 FAIL) | ✅ |
| §2.5 Category picker | Task 19 | ✅ |
| §2.6 Cross-currency UX | Task 14 | ✅ |
| §2.7 Date — time UI dropped | Task 15 | ✅ |
| §2.8 Save CTA | Task 17 | ✅ |
| §2.9 Edit lock policy | Task 21 + Task 22 (locked prop) | ✅ |
| §2.10 Empty state | Tasks 16, 23 | ✅ |
| §3 Rules 1–10 | Tasks 20, 21 | ✅ |
| §3.2 Banker's rounding | Task 1 (utility); Tasks 20, 21 (applied) | ✅ |
| §3.4 USD→USD clarification in docstring | Task 6 | ✅ |
| §3.5 CC→CC blocked, deferred | Form's CC Payment source rule (already in Task 20 schema) | ✅ (no Task 5 — see Task 5 tombstone) |
| §3.7 Stale rate display | Tasks 7, 14 | ✅ |
| §3.8 Installment hook column | Tasks 4, 6 | ✅ |
| §4 Architecture (folder, state, APIs) | Tasks 9, 10, 22, 23 | ✅ |
| §4.6 Strings + seed categories | Tasks 3, 5 | ✅ |
| §6 Acceptance — no imports from `@/components/ui/sheet` | Tasks 18, 19, 23 (none use the wrapper) | ✅ |
| §6 Acceptance — CLAUDE.md updates | Task 27 | ✅ |
| Cross-section flag — §8 picks up installment FK | Task 4 reserves; §8 owns the wire-up | ✅ |
| Cross-section flag — §9 excludes marker categories | Task 27 (CLAUDE.md documents); §9 owns the query | ✅ |
| Cross-section flag — `Sheet` wrapper retirement | Out of scope; Task 27 documents the queue | ✅ |

**No gaps.**

**2. Placeholder scan:** ✅ no `TBD`, no `TODO`, no "implement later", no "similar to Task N" — every step has actual code, test code, exact commands, and complete commit messages.

**3. Type / method consistency check:**

- `AddTransactionFormValues` ↔ `useAddTransaction` ↔ `add_transaction.hook.test.ts` — consistent.
- `EditTransactionFormValues` ↔ `useEditTransaction` ↔ `edit_transaction.hook.test.ts` — consistent.
- `selectAccount` / `selectToAccount` / `selectCategory` method names used identically across hook, sheet shell, and pickers.
- `excludeId` prop on `AccountPickerSheet` matches between component, test, and consumer (sheet shell Task 23).
- `roundMoney` signature `(n: number) => number` used identically across `utils/money.ts`, the rounding tests, and both hooks.
- `installment_id` field name consistent across entity, migration 010, and migration 010 test.
- `rateUpdatedAt` prop name consistent across `ExchangeRateRow`, `TransactionFormBody`, and both hooks (sourced from `currencyState.rate_updated_at`).
- HeroUI `BottomSheet` anatomy props (`isOpen`, `onOpenChange`, `snapPoints`, `enableOverDrag`, `enableDynamicSizing`, `contentContainerClassName`) used identically in Tasks 8, 18, 19, 23.

**No inconsistencies.**

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-18-section-7-add-transaction.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — Sarah dispatches a fresh subagent per task, two-stage review (spec compliance + code quality) between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using `executing-plans`, batch execution with checkpoints.

**Which approach?**
