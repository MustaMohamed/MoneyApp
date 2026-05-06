# Month In/Out: Count All Transaction Types

## Problem

`getAccountsStats()` in `database/account_stats.ts` filters `type IN ('income', 'expense')` and only joins on `account_id`. Transfers and cc_payments are excluded from Month In/Out and Week In/Out on account cards.

A user who transfers EGP 5,000 from bank to wallet sees no change in either account's activity stats, even though both balances updated. Same for CC payments — real cash outflow invisible to the dashboard.

## Decision

Account-level Month In/Out counts ALL transaction types. Budget and analytics (future) will only see income and expense — that filtering happens in a separate query path, not here.

## Approach: UNION ALL

Rewrite the SQL as two legs inside a UNION ALL, wrapped in an outer GROUP BY. Single DB call. Function signature and return type unchanged.

### Leg 1 — `account_id` rows (all types)

| type | direction | amount column |
|---|---|---|
| income | month_in / week_in | `amount` |
| expense | month_out / week_out | `amount` |
| transfer | month_out / week_out | `amount` |
| cc_payment | month_out / week_out | `amount` |

`amount` is always in the `account_id` account's currency.

### Leg 2 — `to_account_id` rows (transfer + cc_payment only)

| type | direction | amount column |
|---|---|---|
| transfer | month_in / week_in | `COALESCE(to_amount, amount)` |
| cc_payment | month_in / week_in | `COALESCE(to_amount, amount)` |

`to_amount` is always in the `to_account_id` account's currency. COALESCE is a safety net — `to_amount` is always populated for these types.

month_out / week_out = 0 for Leg 2 rows.

### Outer query

```sql
SELECT account_id,
  SUM(month_in)  AS month_in,
  SUM(month_out) AS month_out,
  SUM(week_in)   AS week_in,
  SUM(week_out)  AS week_out
FROM ( <leg1> UNION ALL <leg2> )
GROUP BY account_id
```

### Parameter binding order

Placeholders appear twice (once per leg):

```
Leg 1: monthStart, monthStart, weekStart, weekStart, ...accountIds, earliest
Leg 2: monthStart, weekStart, ...accountIds, earliest
```

## Currency correctness

- Leg 1 uses `amount` — face-value in the source account's currency
- Leg 2 uses `to_amount` — face-value in the destination account's currency
- Cross-currency example: USD 200 transfer to EGP account (rate 50) → source sees month_out = 200 (USD), destination sees month_in = 10,000 (EGP)

## What changes

- `database/account_stats.ts`: SQL query and parameter bindings inside `getAccountsStats()`

## What doesn't change

- `AccountStats` interface (same 4 fields)
- `getAccountsStats()` signature: `(db, accountIds) → Record<string, AccountStats>`
- Dashboard hook, account card, all consumers
- Backfill loop for missing account IDs (lines 64-66)

## Test cases

1. Transfer between two accounts — source sees month_out, destination sees month_in
2. CC payment — paying account sees month_out, CC account sees month_in
3. Cross-currency transfer — source uses `amount`, destination uses `to_amount`
4. Income + transfer to same account in same month — month_in sums both legs correctly

## Edge case: self-transfer

If `account_id = to_account_id`, Leg 1 counts month_out and Leg 2 counts month_in, inflating both. This is a form validation concern (prevent same-account transfers), not a stats query concern.
