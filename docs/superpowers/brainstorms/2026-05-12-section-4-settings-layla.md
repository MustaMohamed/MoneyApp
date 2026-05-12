# §4 Settings — Financial Domain Brainstorm
**Author:** Layla Hassan, CFA  
**Date:** 2026-05-12  
**Phase:** Brainstorm (parallel with Marcus)  
**Feeds into:** Tariq's §4 Settings Design Doc

---

## What I Read Before Writing This

- `CLAUDE.md` — Business Rules, Conventions, Database Layer sections
- `database/migrations/003_create_categories.ts` — seeded taxonomy, schema
- `database/migrations/004_create_transactions.ts` — FK constraint: `category_id REFERENCES categories(id)` (no ON DELETE rule — raw hard delete, no cascade/null guard at DB level)
- `database/entities/category.entity.ts` — Category shape (no `is_deleted` / `archived` flag today)
- `database/entities/transaction.entity.ts` — `category_id: string | null` (nullable; null is valid for transfer and cc_payment types)
- `database/entities/commitment.entity.ts` — `category_id: string` (NOT NULL, no FK constraint in migration 006)
- `database/categories.ts` — query contracts: `reassignCategory` updates `transaction.category_id`, then caller deletes the category
- `repositories/category.repository.ts` — `reassignAndDelete(fromId, toId)` is the atomic two-step
- `store/category.store.ts` — `deleteCategory` and `reassignAndDelete` exposed
- `screens/settings/categories/categories.hook.ts` — line 104: `const hasTransactions = false; // always false in M2a` — this is a **known stub** that must be completed in §4
- `screens/settings/categories/components/reassign_category_sheet.tsx` — existing UI, currently uses legacy `react-native-actions-sheet` (must migrate to `Sheet` in §4)
- `screens/settings/categories/components/delete_confirmation_dialog.tsx` — used when no transactions linked
- `store/currency.store.ts` — rate stored in `app_settings` under keys `usd_rate`, `usd_rate_fetched_at`, `usd_rate_manual_override`; default rate = 50 EGP/USD
- `constants/enums.ts` — `Currency { EGP, USD }`, `CategoryType { Expense, Income }`, `TransactionType { Expense, Income, Transfer, CCPayment }`
- `constants/config.ts` — `currencyRateUrl: 'https://open.er-api.com/v6/latest/USD'`

---

## 1. Currency Primary-Change Semantics

### 1.1 What "Primary Currency" Means Today

The app today stores:
- `app_settings.usd_rate` — a single EGP/USD rate (how many EGP per 1 USD)
- Each transaction has `amount` (face value, native currency), `currency` (EGP or USD), `egp_amount` (always-EGP canonical form computed at save time using the rate active at that moment), and `exchange_rate` (rate snapshot at save time, nullable)

"Primary currency" as a concept does not exist in the DB today. EGP is implicitly primary: all analytics (`egp_amount`, `totalEgp` in `getMonthExpenseStats`) are EGP-denominated. The rate setting is really an EGP/USD conversion tool, not a multi-currency primary selector.

### 1.2 Recommendation: Do Not Support Primary-Currency Change in v1

**Recommendation: Keep EGP as the immutable primary currency for v1. §4 Settings does NOT offer a "change primary currency" option.**

Rationale:

1. **Data integrity.** Every `egp_amount` column and every account `current_balance` for EGP accounts is a live, cumulative value. If a user had 100 transactions where `egp_amount = X * rate_at_time_of_entry`, changing "primary" to USD would require either: (a) re-displaying all balances as USD using some rate — which rate? the current one? a historical average? — or (b) a full migration of `egp_amount` columns — destructive and irreversible on a local-first DB with no cloud backup. Neither is safe.

2. **Currency enum is binary.** `Currency` only has EGP and USD. There is no "primary" field. This is not a two-line change.

3. **User base.** Business rule #5 (EGP pre-selected at onboarding) signals the intended market is Egypt-first. A primary-currency change is a v2+ feature for diaspora/multi-currency users.

4. **Rate, not currency, is what users need to change.** The actual user need is: "the USD/EGP rate I entered is stale." That is already served by the existing `currency.hook.ts` / currency screen (fetch live rate, or enter manual rate). §4 should surface this as a Settings entry point, not a "primary currency" picker.

**If the human decides to defer primary-currency change, the §4 currency settings screen should:**
- Show the current EGP/USD rate
- Show last-fetched timestamp and whether it is a manual override
- Offer "Refresh Rate" (calls `fetchRate()`) and "Set Manual Rate" (calls `setManualRate(rate)`)
- Not surface any option to change EGP as the primary currency
- Display a footer note: "All balances and analytics are shown in Egyptian Pound (EGP)"

### 1.3 What If the Human Wants Primary-Currency Change Anyway (v2 specification preview)

If the product decision is "yes, allow it in v1", the only financially safe model is **lock-at-entry + display conversion**:

**Rule:** Historical `egp_amount` values are NEVER retroactively recalculated. They represent the real-world EGP value at the time of the transaction. Only the display layer converts them for viewing.

**Display formula for a single transaction viewed in target currency C with rate R (C per 1 EGP):**

```
displayed_amount = egp_amount * R
```

Where `R` is the current rate for the selected display currency against EGP. For EGP as display currency, R = 1.

**Worked example:**

| Transaction | amount | currency | egp_amount (stored) | Rate at entry | Display in USD @ today's rate (R = 0.020) |
|---|---|---|---|---|---|
| Groceries, May 1 | 500 | EGP | 500 | N/A | 500 * 0.020 = $10.00 |
| Amazon, May 5 | 25 | USD | 1,262.50 | 50.50 EGP/USD | 1,262.50 * 0.020 = $25.25 |
| Salary, May 10 | 25,000 | EGP | 25,000 | N/A | 25,000 * 0.020 = $500.00 |

Note: the Amazon row shows $25.25 not $25.00 because the display is using today's rate (50.00 EGP/USD), not the rate at entry (50.50). This is expected and correct — the stored `egp_amount` faithfully captured the real-world EGP cost at the time.

**Edge cases for v2 design:**
- Accounts with `current_balance` in native currency (USD account) — display as: `current_balance * current_usd_to_display_currency_rate`
- Net worth calculation: sum of all accounts' EGP-equivalent balances — same formula as today, only the display label changes
- No migration required — `egp_amount` remains the canonical form regardless of display currency

**This entire v2 section is informational only. §4 v1 recommendation is: no primary-currency change.**

### 1.4 Rate Refresh — Where and When

The currency screen already exists (`screens/settings/currency/`). §4 should wire it as a row in Settings under a "Currency" or "Exchange Rate" section.

The "Refresh Rate" action (network call to `https://open.er-api.com/v6/latest/USD`) should:
- Be available in Settings at any time
- Surface last-fetched timestamp so user can judge staleness
- Show a "Manual Override" badge when `isManualOverride = true`
- Not be a background/scheduled job in v1 (local-first, user-initiated only)

---

## 2. Categories — Taxonomy

### 2.1 Current Taxonomy — Affirmed With One Addition

The migration `003_create_categories.ts` seeds the following. I am affirming this taxonomy with one annotation.

**Expense categories (22 seeded):**

| ID | Name | Icon | Note |
|---|---|---|---|
| cat_housing | Housing | home | |
| cat_food | Food & Dining | food-fork-drink | |
| cat_groceries | Groceries | cart | |
| cat_dining_out | Dining Out | silverware-fork-knife | |
| cat_transport | Transport | bus | |
| cat_car | Car | car | |
| cat_utilities | Utilities | lightning-bolt | |
| cat_phone_internet | Phone & Internet | wifi | |
| cat_health | Health | pill | |
| cat_subscriptions | Subscriptions | cellphone | |
| cat_shopping | Shopping | shopping | |
| cat_clothes | Clothes | hanger | |
| cat_education | Education | school | |
| cat_family | Family | account-group | |
| cat_charity | Charity | hand-heart | |
| cat_gifts | Gifts | gift-outline | |
| cat_bills | Bills | receipt | |
| cat_debt_payment | Debt Payment | bank-transfer | |
| cat_bank_fees | Bank Fees | bank | |
| cat_entertainment | Entertainment | party-popper | |
| cat_money_transfer | Money Transfer | bank-transfer-out | |
| cat_other_expense | Other | dots-horizontal | **Protected — catch-all fallback** |

**Income categories (5 seeded):**

| ID | Name | Icon | Note |
|---|---|---|---|
| cat_salary | Salary | briefcase | |
| cat_freelance | Freelance | lightbulb | |
| cat_gift_income | Gift | gift | |
| cat_returns | Returns | chart-line | |
| cat_transfer_in | Transfer In | arrow-down-circle | |

**One annotation:** `cat_other_expense` ("Other") should be designated the **protected fallback sink** for reassignment. Reasoning: if a user deletes all custom categories in a type, the reassign picker must always have at least one valid target. "Other" is that guaranteed target. It must never be deletable.

**Missing "Other" for income:** There is no `cat_other_income` equivalent. Recommend adding one seeded protected category for income in §4 as a new migration (`009_add_other_income_category.ts`). This prevents an edge case where all income categories except one are deleted, and that last one cannot be deleted because it would leave a user stuck if they try to reassign.

**Transfer and CC Payment:** These transaction types (`TransactionType.Transfer`, `TransactionType.CCPayment`) carry `category_id = null` by design (confirmed in entity comment). They are excluded from the category taxonomy entirely. The `CategoryType` enum has only `Expense` and `Income` — this is correct and should not change.

### 2.2 Seeded Defaults — Deletability Rules

Two tiers:

**Tier 1 — Protected (undeletable):**
- `cat_other_expense` (system fallback for expense reassignment)
- `cat_other_income` (to be added — system fallback for income reassignment)
- Rule: `is_default = 1` AND `id` is in a hardcoded protected set. The `is_default` flag alone is insufficient — all seeded categories have `is_default = 1`, but the user should be able to delete seeded categories they don't use (e.g. a user who never uses "Car" should be able to remove it).

**Tier 2 — Seeded but Deletable:**
- All other `is_default = 1` categories
- User can delete these; if linked transactions exist, they must reassign first

**Tier 3 — User-Created:**
- `is_default = 0`
- Fully deletable with reassignment if linked transactions exist

**Naming rule for protection:** The `PROTECTED_CATEGORY_IDS` set is a compile-time constant (not a DB flag) checked in the store before allowing delete. This is intentional — it cannot be accidentally overwritten by a migration.

```
PROTECTED_CATEGORY_IDS = ['cat_other_expense', 'cat_other_income']
```

### 2.3 User-Created Custom Categories — Limits and Naming Rules

**Current limit:** 30 total custom categories (both expense and income combined). Source: `categories.hook.ts` line 61: `const isAtLimit = customCount >= 30`. This limit is affirmed.

**Rationale for 30:** A user adding 30 custom categories on top of 27 seeded ones = 57 categories total. This is the practical ceiling for a picker list that remains usable on mobile. Above 30 custom entries, the list becomes unwieldy.

**Naming rules:**

1. **Uniqueness:** Category name must be unique within the same `type`. "Groceries (expense)" and "Groceries (income)" are technically distinct records, but "Groceries" added twice under expense must be rejected. Rule: `UNIQUE(name, type)` enforced at application layer (not currently a DB constraint — recommend adding as a validation in the repository, not a migration, since SQLite UNIQUE constraints require careful handling with existing data).

2. **Length:** 1–50 characters. Min 1 prevents empty strings. Max 50 prevents layout overflow in pickers. Enforced via Zod: `z.string().min(1).max(50)`.

3. **Trim whitespace:** Leading/trailing whitespace stripped before uniqueness check and save.

4. **Characters:** No restriction on character set (Arabic names must be supported — Egyptian user base).

### 2.4 Subcategories — Deferred

No subcategories in v1. The schema has no `parent_id` column. Adding subcategories would require a migration, a new picker UX (two-level drill-down), and changes to all analytics queries that group by `category_id`. This is a v2 feature. Marcus should not design sub-category UI for §4.

---

## 3. Categories — CRUD Rules

### 3.1 Edit — Which Fields Are Editable Post-Creation

**Editable:** `name`, `icon`, `color`

**Not editable:** `type` (expense vs income)

**Rationale for locking `type`:** A category's type determines which transaction type it can be attached to (`expense` or `income`). If a user reclassifies "Salary" from income to expense, every transaction currently tagged "Salary" would have a type-mismatch with its `category_id` reference. There is no FK enforcement preventing this at the DB level today, but it would corrupt analytics (income transactions appearing in expense totals). Locking `type` after creation is the safe choice.

This is already what the code enforces: `UpdateCategoryInput = Pick<Category, 'name' | 'icon' | 'color'>` — `type` is absent from the update contract.

**Editable for seeded (default) categories:** Same rules. Name, icon, and color are editable for all default categories. This lets a user rename "Food & Dining" to "Akl" (Arabic) or recolor it without losing the underlying data relationships.

### 3.2 Delete — Recommended Model: User-Driven Reassignment (With Protected Fallback)

**Recommendation: User-driven reassignment via the existing `ReassignCategorySheet`, with a protected fallback "Other" that can never be deleted, and a direct delete path when zero transactions are linked.**

Decision matrix:

| Option | Verdict | Reason |
|---|---|---|
| Block delete if linked transactions exist | Rejected | Frustrating UX — user cannot clean up categories they no longer want. |
| Soft-delete (archive flag, hide from pickers) | Rejected | Adds DB complexity (migration required for `is_deleted` column), orphaned data still exists, transaction history shows categories that "don't exist" anymore. |
| Cascade-reassign to system "Uncategorized" | Rejected | Silent data mutation. User loses the ability to audit what was reassigned. Worse: if "Uncategorized" becomes a dumping ground with hundreds of transactions, it is useless for analytics. |
| **User-driven reassignment via picker** | **Accepted** | User explicitly chooses the target. Category is only deleted after reassignment completes atomically. Full transparency. Existing `reassignAndDelete` function already implements this correctly. |

### 3.3 The Delete Flow — Exact Rules

**Step 1: Check linked transaction count**

Before opening any modal, the hook must count transactions linked to the category:

```
linked_count = SELECT COUNT(*) FROM transactions WHERE category_id = ?
```

Note: This query already exists conceptually — line 104 of `categories.hook.ts` stubs it as `const hasTransactions = false`. §4 must replace this stub with the real query. Recommend adding `getCategoryTransactionCount(db, id): Promise<number>` to `database/categories.ts`.

**Step 2a: Zero linked transactions → Direct delete confirmation dialog**

No reassignment needed. Show the existing `DeleteConfirmationDialog` with category name. On confirm: call `deleteCategory(id)`. On cancel: dismiss.

**Step 2b: One or more linked transactions → Reassign sheet**

Open `ReassignCategorySheet` with:
- Header text: "Where should [N] transactions go?" (N = linked_count)
- Options: all categories of the same `type` as the deleted category, excluding the deleted category itself and excluding protected categories that are not valid reassignment targets (there are none — "Other" is a perfectly valid target)
- The picker must always have at least one option because of the protected "Other" category. If somehow the user reaches a state where no non-protected category exists, the protected "Other" is the sole option shown (not hidden, not disabled).
- On confirm with selected `toId`: call `reassignAndDelete(fromId, toId)`
- On cancel: dismiss with no changes

**Step 3: What `reassignAndDelete` does (atomically, inside a DB transaction):**

```
BEGIN TRANSACTION
  UPDATE transactions SET category_id = toId WHERE category_id = fromId
  DELETE FROM categories WHERE id = fromId
COMMIT
```

This already matches the implementation in `repositories/category.repository.ts` (`reassignCategory` then `deleteCategory`) — but currently NOT atomic (two separate `runAsync` calls, no `withTransactionAsync` wrapper). §4 must wrap them in `db.withTransactionAsync`. Tariq should note this as a correctness fix.

**What reassignment does NOT change:**
- `amount` — untouched. Category is metadata only.
- `egp_amount` — untouched. This is a financial value, not a category attribute.
- `currency` — untouched.
- `account_id`, `to_account_id` — untouched.
- Account `current_balance` — untouched. Category deletion never touches balances.
- `commitment.category_id` — **this is a separate problem** (see §3.4 below).

### 3.4 Commitments Pointing at a Deleted Category — Critical Gap

`commitment.category_id` is `string` (NOT NULL in the entity type). There is no FK constraint in migration `006_create_commitments.ts` (confirmed by reading `commitments.ts`). This means:

- `reassignCategory` in `database/categories.ts` only updates `transactions.category_id`. It does NOT update `commitments.category_id`.
- If a user deletes a category that is referenced by an active commitment, the commitment's `category_id` becomes a dangling reference.

**Rule: The reassign-and-delete flow MUST also update commitments.**

Updated atomicity contract for `reassignAndDelete(fromId, toId)`:

```
BEGIN TRANSACTION
  UPDATE transactions  SET category_id = toId WHERE category_id = fromId
  UPDATE commitments   SET category_id = toId WHERE category_id = fromId
  DELETE FROM categories WHERE id = fromId
COMMIT
```

This requires:
1. Adding `UPDATE commitments SET category_id = ? WHERE category_id = ?` to `database/categories.ts` (or inlining in the repository's `reassignAndDelete`)
2. Updating `repositories/category.repository.ts` `reassignAndDelete` to use `db.withTransactionAsync`

Tariq must be flagged: this is a bug in the current M2a stub (the stub is harmless now because `hasTransactions = false` always skips the flow, but §4 activates it).

### 3.5 What Reassignment Does NOT Touch

The following are confirmed unaffected by category reassignment:

- Account balances (`current_balance`, `revolving_balance`) — no change
- Transaction amounts, currencies, exchange rates — no change
- Commitment amounts, recurrence rules, payment statuses — no change (only `category_id` updates)
- Commitment payment rows — no category column exists on `commitment_payments` (confirmed by reading the entity)

### 3.6 Protection Rule: Cannot Delete Own Last Category

Edge case: user has only one expense category left (e.g., they deleted everything except "Other"). "Other" is protected, so the effective minimum is 1 expense category + 1 income category at all times. The `PROTECTED_CATEGORY_IDS` rule enforces this: the delete button for protected categories is simply absent (not disabled with a tooltip — absent, per CRUD clarity).

---

## 4. Worked Test Cases

These are financial-domain acceptance criteria. @dev should convert to Jest unit tests.

### TC-01: Reassign and Delete — Transactions Only

**Setup:**
- Category A = `cat_groceries` (expense, seeded)
- Category B = `cat_food` (expense, seeded)
- Transactions linked to cat_groceries: 47 rows
- Transactions linked to cat_food before reassign: 12 rows

**Action:** User deletes `cat_groceries`, reassigns to `cat_food`

**Expected:**
| Assertion | Expected Value |
|---|---|
| `SELECT COUNT(*) FROM transactions WHERE category_id = 'cat_groceries'` | 0 |
| `SELECT COUNT(*) FROM transactions WHERE category_id = 'cat_food'` | 59 (12 + 47) |
| `SELECT COUNT(*) FROM categories WHERE id = 'cat_groceries'` | 0 |
| `SELECT COUNT(*) FROM categories WHERE id = 'cat_food'` | 1 |
| Any account `current_balance` changed | false |
| Any transaction `amount` changed | false |
| Any transaction `egp_amount` changed | false |

---

### TC-02: Reassign and Delete — With Active Commitment

**Setup:**
- Category C = `cat_subscriptions` (expense, seeded)
- Category D = `cat_entertainment` (expense, seeded)
- Transactions linked to cat_subscriptions: 8 rows
- Commitments linked to cat_subscriptions: 2 rows (Netflix monthly, Spotify monthly)

**Action:** User deletes `cat_subscriptions`, reassigns to `cat_entertainment`

**Expected:**
| Assertion | Expected Value |
|---|---|
| `SELECT COUNT(*) FROM transactions WHERE category_id = 'cat_subscriptions'` | 0 |
| `SELECT COUNT(*) FROM commitments WHERE category_id = 'cat_subscriptions'` | 0 |
| `SELECT COUNT(*) FROM transactions WHERE category_id = 'cat_entertainment'` | prior_entertainment_count + 8 |
| `SELECT COUNT(*) FROM commitments WHERE category_id = 'cat_entertainment'` | prior_entertainment_count + 2 |
| `SELECT COUNT(*) FROM categories WHERE id = 'cat_subscriptions'` | 0 |
| Any commitment `amount` changed | false |
| Any commitment `recurrence_every` changed | false |

---

### TC-03: Delete — Zero Linked Transactions (Direct Delete, No Reassign)

**Setup:**
- Category E = custom user-created expense category, name "Weekend Fun", 0 linked transactions, 0 linked commitments

**Action:** User deletes "Weekend Fun" via direct delete dialog (no reassign sheet shown)

**Expected:**
| Assertion | Expected Value |
|---|---|
| `SELECT COUNT(*) FROM categories WHERE name = 'Weekend Fun'` | 0 |
| `SELECT COUNT(*) FROM transactions WHERE category_id = <weekend_fun_id>` | 0 (was already 0) |
| Category count decreases by 1 | true |
| `customCount` (is_default=0 categories) decreases by 1 | true |
| `isAtLimit` (customCount >= 30) recalculated correctly | true if was at 30, now false |

---

### TC-04: Attempt to Delete Protected Category

**Setup:** `cat_other_expense` exists (seeded, protected)

**Action:** User attempts delete via UI

**Expected:**
- Delete button/option is not rendered for `cat_other_expense`
- No DB call is made
- (No unit test needed for "button absent" — this is a UI assertion. Unit test: `isProtected('cat_other_expense') === true`)

---

### TC-05: Custom Category Limit Enforcement

**Setup:** User has exactly 30 custom categories (is_default=0, any type mix)

**Action:** User attempts to add a 31st custom category

**Expected:**
| Assertion | Expected Value |
|---|---|
| `isAtLimit` | true |
| Add sheet does not open / add button is disabled | true |
| `SELECT COUNT(*) FROM categories WHERE is_default = 0` | 30 (unchanged) |

---

### TC-06: Category Name Uniqueness Within Type

**Setup:** Category "My Expenses" (expense) already exists

**Action:** User tries to create another "My Expenses" (expense)

**Expected:**
- Validation error surfaces: "A category with this name already exists"
- No insert is executed
- `SELECT COUNT(*) FROM categories WHERE name = 'My Expenses' AND type = 'expense'` = 1

**Cross-type note:** "My Expenses" (income) would be allowed — different type, not a collision.

---

### TC-07: Edit Category — Type Field Immutable

**Setup:** Category "Salary" (income), has 15 linked transactions

**Action:** Attempt to change type to "expense" via API (even if UI doesn't expose it)

**Expected:**
- `UpdateCategoryInput` does not include a `type` field
- Repository `update()` method signature: `update(id: string, data: UpdateCategoryInput)` where `UpdateCategoryInput = Pick<Category, 'name' | 'icon' | 'color'>`
- `SELECT type FROM categories WHERE id = 'cat_salary'` still returns `'income'`

---

### TC-08: Rate Change Does Not Alter Historical egp_amount

**Setup:** Transaction T1: amount=500 EGP, egp_amount=500, exchange_rate=null. Rate changes from 50 to 52.

**Action:** User updates EGP/USD rate to 52 via Settings currency screen

**Expected:**
| Assertion | Expected Value |
|---|---|
| `SELECT egp_amount FROM transactions WHERE id = 'T1'` | 500 (unchanged) |
| `app_settings WHERE key = 'usd_rate'` value | '52' |
| `useCurrencyStore.state.rate` | 52 |
| Account current_balance | unchanged |

New USD transactions after the rate change will use 52 for their `egp_amount` computation — but no historical row is touched.

---

### TC-09: Reassignment Atomicity — Partial Failure

**Setup:** 47 transactions linked to `cat_groceries`. DB write fails mid-operation (simulated).

**Expected:**
- Either ALL 47 transactions are reassigned AND the category is deleted, OR neither change persists
- `SELECT COUNT(*) FROM transactions WHERE category_id = 'cat_groceries'` is either 47 or 0 — never an intermediate value
- This requires `db.withTransactionAsync` wrapping the reassign + delete SQL (see §3.4 — current code lacks this wrapper)

---

### TC-10: No "Other Income" Category Exists (Gap Until Migration 009 Ships)

**Setup:** User has only one income category remaining (e.g., "Salary")

**Action:** User tries to delete "Salary"

**Expected before migration 009:**
- `reassignOptions` = `[]` (empty — no other income categories exist)
- Reassign sheet opens but has no options to select — CTA is permanently disabled
- Delete cannot complete — user is stuck
- This is a **known bug** in the current code that §4 must fix by: (a) adding `cat_other_income` via migration 009, AND (b) making `cat_other_income` protected

**Expected after migration 009:**
- `reassignOptions` always contains at least `cat_other_income`
- Delete of "Salary" triggers reassign to "Other Income" — 0 to N transactions move

---

## 5. Security — Financial Considerations

### 5.1 What v1 UX Should Promise

Per business rule #6: "O3 security is UI only — no real PIN/biometric yet." This is the correct constraint. §4 cannot ship real security in v1. What it can do is design the promise correctly so v2 can fulfill it without breaking changes.

**Recommended v1 promise:** "App Lock — hide your financial data when you're away"

Two lock trigger options to consider:

| Option | Recommendation |
|---|---|
| Lock on app-close (background → foreground) | **Recommend YES — include in v1** |
| Idle timeout (e.g., lock after 5 min of inactivity) | Defer to v2 — requires background timer, more complexity |

Rationale: Lock-on-resume is the minimal viable promise. It requires only: (a) storing the user's PIN/biometric-skip choice in SecureStore (already done — `SecurityChoice` enum exists), (b) checking on `AppState.change` to `active` whether a lock screen should show, (c) if locked, showing a PIN-entry screen or biometric prompt placeholder. Since no real PIN validation exists in v1, the lock screen is UI-only — pressing any digit sequence or "Skip" unlocks. This is documented in the in-app copy: "Screen lock is coming soon."

### 5.2 Should Locked State Hide Balances?

**Recommendation: YES — hide all balance amounts when locked.**

Financial reasoning: the lock feature's primary purpose is preventing shoulder-surfing or opportunistic viewing on a lost/borrowed device. If balances are visible on the lock screen, the feature provides no financial privacy. The lock state should replace all monetary values with `••••` or a blur overlay.

**Specifically, locked state should hide:**
- Account balances on the dashboard
- Net worth figure
- Individual transaction amounts
- Any summary totals

This is a display-layer concern (Marcus's domain for implementation), but the rule is: **no monetary value is rendered while `isLocked === true`**.

The `isLocked` boolean is UI state only — it does not affect the DB, does not pause background operations (there are none in a local-first app), and resets to `false` when the user authenticates (even if authentication is a stub in v1).

### 5.3 What v1 Explicitly Does NOT Promise

The copy in Settings must not say "your data is encrypted" or "PIN protected" — because it is not, yet. The correct framing is "App Lock" (a screen privacy feature) not "Security" (a data protection feature). Suggested copy: "Require a passcode when reopening the app." — present tense, accurate.

---

## 6. Open Questions for Marcus

1. **Category picker ordering in §4:** Should the categories list in Settings be user-reorderable (drag to reorder `sort_order`)? I've found no reorder logic in the current code, but `sort_order` column exists. If yes, what is the sort scope — per-type or global?

2. **Delete flow disambiguation:** When a user taps delete and has linked transactions, the reassign sheet opens. But what if they want to cancel entirely (not delete, not reassign)? The current `onCancel` handler closes both the sheet and clears `categoryToDelete`. Is there a "go back to just viewing the category" state needed?

3. **Lock screen visual:** When `isLocked = true` and balances are hidden, does the dashboard still show the account list (with names but no amounts)? Or is the entire app content replaced by a PIN-entry screen? This is a UX architecture question — I can only say "all monetary values must be hidden."

4. **Add category — icon and color pickers:** The `NewCategoryInput` requires `icon` and `color`. Are these mandatory at creation time? Is there a default icon/color to fall back to so the user doesn't have to choose? This affects whether the Zod schema for creation has those fields as required or optional.

5. **Reassign sheet — show transaction count?** I recommend showing the count ("47 transactions will be moved") in the sheet header so the user understands the impact. Is this confirmed from a UX perspective?

---

## 7. Open Questions for the Human (Product Decisions)

1. **Multi-currency in v1 or v2?** The current schema supports EGP and USD only. Primary-currency change is not recommended for v1 (see §1.2). But should the user be allowed to add USD accounts and USD transactions at all in §4+? This is already supported today — the question is whether the Settings currency screen gains any new surface area.

2. **Custom category limit of 30 — is this the right number?** The 30-limit is already in code. Do you want to change it? The financial answer is: 30 custom + 27 seeded = 57 total is near the usability ceiling for a mobile picker. I'd recommend keeping 30 or reducing to 20, not increasing.

3. **Add `cat_other_income` as a protected seeded category?** This is my recommendation (see §2.1 and TC-10). It requires a new migration (009). Confirm whether you want this in §4 or deferred.

4. **Lock behavior when `SecurityChoice = Skip`:** If the user chose "Skip" at onboarding (O3), does the §4 settings lock screen still offer them a toggle to turn on app lock? Or is it locked behind "you must set a PIN first"? Since PINs are not real in v1, this is a product question: show the toggle (and it's always a no-op unlock), or hide the feature entirely when Skip was chosen at onboarding?

5. **Idle timeout for v1?** I recommend deferring idle-timeout lock to v2. Do you agree, or does v1 need it?

---

## Summary of Key Financial Rules Established

1. No primary-currency change in v1. EGP is immutable primary. Settings currency screen = rate management only.
2. Historical `egp_amount` values are never retroactively modified by rate changes — lock-at-entry model.
3. Category taxonomy affirmed: 22 expense + 5 income seeded. Recommend adding `cat_other_income` as protected fallback.
4. Protected categories: `['cat_other_expense', 'cat_other_income']` — no delete option exposed.
5. Delete path: zero transactions → direct confirm dialog; 1+ transactions → user-driven reassignment.
6. `reassignAndDelete` must be atomic (`withTransactionAsync`) and must update BOTH `transactions.category_id` AND `commitments.category_id`.
7. Category edit locks `type` field — editable fields are name, icon, color only.
8. Custom category limit: 30 total (is_default=0), uniqueness scoped to `(name, type)`.
9. App lock v1 = display-only, lock-on-resume. All monetary values hidden when locked.
10. Idle timeout deferred to v2.
