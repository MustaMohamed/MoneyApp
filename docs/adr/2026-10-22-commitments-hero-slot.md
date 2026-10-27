# ADR: The commitments hero reads one store slot keyed by month and account, at the rate the screen hook passes

- **Date:** 2026-10-22
- **Status:** accepted
- **Ticket:** #814 (MA-232), under #784
- **Applies to:** `src/modules/commitments/store/commitment.store.ts`, `src/modules/commitments/screens/commitments/components/commitments_hero.helpers.ts`, `src/modules/commitments/screens/commitments/commitments.hook.ts`, `src/modules/commitments/screens/commitments/components/commitments_hero.tsx`, `src/components/ui/list_hero.tsx`, `src/components/ui/status_counter.tsx`

The commitments hero and its counters take every figure from the month aggregate (`docs/adr/2026-10-21-commitments-month-aggregate.md`), never from a fold over the loaded rows. This record states where the store keeps that aggregate, when it reads it again, which of three modes the hero model takes, and where the live rate enters. MA-211 draws the hero from the model this record describes.

## 1. One slot, keyed by month and account

The store holds one slot, `monthAggregate: { key, aggregate } | undefined`, and one error field, `monthAggregateErrorKey: string | undefined`. Both start `undefined`, and `reset` clears both.

- The key is `monthAggregateKey(yearMonth, accountId)`, `` `${yearMonth}|${accountId ?? ''}` ``. `2026-05|` covers every account; `2026-05|<id>` covers one.
- The hero is scoped by the account filter only when the filter holds exactly one account (`resolveCommitmentsHeroAccountId`). With none, or two or more, the key carries no account. The status tabs, the search and the filter's other sections never change the key.
- A successful load publishes `{ key, aggregate }` in one `set` and clears `monthAggregateErrorKey` only when it equals that key.
- A failed load sets `monthAggregateErrorKey` to its key and keeps the slot it holds. `loadMonthAggregate` logs the error and never rejects.
- A load sets no state when it starts. A held slot and an error key stay as they are while a reload runs.
- Each load takes a request id and the store's data generation. A response from an older id, or one read before a write bumped the generation, publishes nothing and sets no error key, so a month left behind or a read from before a write never overwrites what is on screen. The generation re-check guards a future write that invalidates the data without reloading the slot; every write today reloads it, so the request id drops the older read first and no public store path tests the generation re-check alone.

## 2. When the slot loads

`loadMonthAggregate(yearMonth, accountId, now?)` runs housekeeping first, then reads `getMonthAggregate(yearMonth, today, accountId)` with `today = toLocalDateString(now)`, the local date as of that read. Two calls for the same key, today and data generation share one read.

It runs:

- on each focus of the list, from a second `useFocusEffect` in the screen hook. Like the rows' focus load, it starts after interactions through `runAfterInteractions`, and its cleanup cancels a start still pending. Its callback depends on the selected month and the hero's account, and expo-router runs a focus effect again when its callback changes while the screen is focused (`node_modules/expo-router/build/useFocusEffect.js:134-137,164`). That one effect covers focus, a month change and an account-scope change.
- on pull to refresh, beside the rows' reload.
- after each of the six writes: Pay, Skip, Undo, Add and Stop through `revalidateAfterMutation`, and Edit in `updateCommitment` before it awaits the rows. The reload uses the selected month and the account of the latest load. Before the first `loadMonthAggregate`, a write reads no aggregate.

The focus read has no freshness gate, because the ticket asks for the aggregate to be read again on each focus. A gate added later (audit M32) must also key on the accounts write that moves unpaid payments to a replacement account when an account is archived (`updateUnpaidPaymentsAccount`, `src/modules/accounts/repositories/account.repository.ts:163`). That write does not bump the commitments store's generation, so a gate keyed on that generation alone would hold stale figures.

A failed aggregate load reaches the hero model alone. The rows' load and its `loadError` are separate, and `loadMonthSnapshot` is unchanged.

## 3. Three modes

`resolveCommitmentsHeroMode` compares the held key and the error key with the key on screen, in this order:

1. The held slot is for the key on screen: `'figures'` when the rate has loaded, else `'skeleton'`.
2. The error key is the key on screen: `'dashes'`.
3. Otherwise `'skeleton'`.

A slot held for another month or account gives `'skeleton'`, never its figures. A first load that fails gives `'dashes'`, and the dashes stay while that key loads again, since a load clears nothing as it starts. A held slot keeps its figures while a reload runs and when that reload fails, because rule 1 wins over rule 2.

## 4. The rate is read once, in the screen hook

The screen hook reads `rate` and `hasLoaded` from `useCurrencyStore` in one `useShallow` selection and passes `rate` to `buildCommitmentsHeroModel`, which passes it to `computeCommitmentMonthTotals`. No money function reads a store. The hero model is memoized on the rate, so when the live rate changes while the hero holds figures, the next render converts the USD legs at the new rate. `hasLoaded` gates `'figures'`: before the rate loads, the store's default rate never reaches the screen. A bad rate throws `CommitmentMonthTotalsError` from the totals, as `docs/adr/2026-10-21-commitments-month-aggregate.md` §7 states.

## 5. Dashes and days left

The dash is `Strings.commitmentsHeroUnavailable`, `—`.

- In `'skeleton'` and `'dashes'`, every money figure, every count and the percent print the dash; `paidPct` and the carried segment are `undefined`.
- In `'figures'`, the percent prints the dash when Committed is 0 in EGP; otherwise it is `wholePercent(Paid, Committed)` over the two EGP amounts (`docs/adr/2026-10-06-whole-percent-from-two-amounts.md` §3).
- In `'figures'`, the Overdue figure prints the dash and the carried segment is absent when the month has 0 carried rows. The Overdue count still reads the month's overdue rows.
- Days left is `daysLeftInMonth(yearMonth, today)` from `src/utils/year_month.ts`, in every mode. It is `undefined`, and the caption has no days-left segment, for any month but the current one. The hook reads today in render, as the transactions hook does, so days left can trail the aggregate's own today across midnight until the next focus.

The cases are in `__tests__/utils/year_month.test.ts`, `__tests__/screens/commitments/commitments_hero.helpers.test.ts`, `__tests__/commitment.store.test.ts` and `__tests__/screens/commitments.hook.test.ts`.

## 6. The hero draws on the shared list hero

**Added 2026-10-27 (#859, MA-258).**

- `commitments_hero.tsx` draws the model on `ListHero` (`src/components/ui/list_hero.tsx`) through `buildCommitmentsListHeroModel`. The summary card, `summary_header.tsx`, and its fold over the loaded rows (`summarizeMonthPayments` in the screen hook) are gone; `payment_summary.ts` stays for the dashboard.
- The title is `Left to pay`, and `Left to pay · <account>` when the filter holds one account, its name from `resolveAccountName`, as the transactions title reads it. Two accounts, or one not yet loaded, read `Left to pay`.
- A figure that holds an estimate prints through `commitmentsSectionSumEstimate`, `~ 4,000`.
- The rail fills to `paidPct`, 0 when it is `undefined`, in a new `gold` tone, `bg-gold-600` (`#C9973A`, frame A1).
- Overdue is in danger only while it holds a figure. Its dash, at 0 carried rows or in `'dashes'`, is plain (frame A6EmptyMonth).
- The five counters speak `{status}, {n} payments`, `1 payment` at 1, and `{status}, —` off `'figures'`, and their text stops growing at 1.3 (`LIST_HERO_MAX_FONT_SCALE`). The Home Commitments card's counters keep their number and uncapped scale.
