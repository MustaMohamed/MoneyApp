# MA-029 — One over-limit predicate and one string across detail, dashboard and list
base: 13f5c7fc7daa9a7c9d5f6fbf721f88cba3bb2c4b · verify: emulator · flags: user copy · expected diff: ~25 lines outside tests

Two naming calls made here rather than asked, both under "decide it and move": the shared module is `is_over_limit.ts` next to `available_credit_color.ts`, named after its export like that precedent; the surviving string key is `Strings.accountOverLimit`, since neither `cardOverLimit` nor `accountHeroOverLimit` names a state three surfaces render.

## Steps

### 1. A card's over-limit state is decided in one exported function
- File: `src/modules/accounts/constants/is_over_limit.ts` (new), beside `available_credit_color.ts` — the resolver the ticket names as precedent, imported today by the hero, the dashboard card helpers and `account_card.tsx`.
- Change: export `isOverLimit(balance: number, limit: number | null): boolean`, true only when `limit` is a positive number and `balance` is strictly greater than it. `limit` takes `null` because `Account.credit_limit` is `number | null` (`src/modules/accounts/entities/account.entity.ts:11`) and the zero/absent case is part of the contract. Computes nothing else: no `available`, no formatting, no currency.
- Test: `__tests__/accounts/is_over_limit.test.ts` (new), written first, in the shape of `__tests__/accounts/available_credit_color.test.ts` — balance under the limit, exactly at the limit, over the limit, `limit` 0, `limit` null. Exactly-at is the boundary the hero already ships (`balance_hero.helpers.test.ts:123`) and the one a `>=` slip would flip.

### 2. The detail hero reads the shared predicate
- File: `src/modules/accounts/screens/accounts/detail/components/balance_hero.helpers.ts` (`buildHeroCaption`, `:25-32`)
- Change: replace `if (account.current_balance > limit)` with a call to `isOverLimit(account.current_balance, limit)`. The enclosing `isCC && limit > 0` guard, the local `const limit = account.credit_limit ?? 0` (still needed for `limit - account.current_balance`), the returned `color: SemanticTokens.negative` and `adjusted: false` all stay as they are.
- Test: none new — `__tests__/screens/accounts/balance_hero.helpers.test.ts` already covers under (`:62`), null (`:77`), zero (`:89`), over (`:101`), exactly at (`:123`) and must pass byte-identical after this step.

### 3. The dashboard card reads the shared predicate, and the accounts list follows it
- File: `src/modules/dashboard/screens/dashboard/components/account_card.helpers.ts` (`buildInfoRows`, `:96` and `:109`)
- Change: delete the local `const isOverLimit = balance > limit && limit > 0;` at `:96` and call the imported `isOverLimit(balance, limit)` inline at `:109` — the const's only use, so the import name does not collide. `available`, `availColor` and the row's `valueColor` are untouched; an over-limit card still yields `available === 0` and therefore the negative band from `availableCreditColor`. `accounts_list.helpers.ts` needs no edit: `composeCaption` reads this row's `value` through `buildInfoRows` (`:44-51`). While here, the `InfoRow.amountText` doc at `:74` says "Over Limit rows"; make it "over-limit" so no comment carries the retired wording.
- Test: none new — `__tests__/screens/dashboard/account_card.helpers.test.ts:320` (both currencies) and `:484` (no `amountText`) must pass unchanged at this step; the string still reads "Over Limit" until step 4.

### 4. One key, one wording, on all three surfaces
- File: `src/constants/strings.ts` (`:228` `cardOverLimit`, `:327` `accountHeroOverLimit`), `src/modules/accounts/screens/accounts/detail/components/balance_hero.helpers.ts:28`, `src/modules/dashboard/screens/dashboard/components/account_card.helpers.ts:109`, `src/modules/accounts/screens/accounts/list/accounts_list.helpers.ts:47`
- Change: delete `cardOverLimit: 'Over Limit'` at `:228`; rename `accountHeroOverLimit` to `accountOverLimit` in place at `:327`, value unchanged at `'Over limit'`, with a one-line comment that the hero, the dashboard card and the list row all render it — the `formatCurrencyTotals` note at `:938` is the precedent for a shared string kept in a surface block. Point both source call sites at the new key. The `:47` comment in `accounts_list.helpers.ts` reads "Over Limit carries no bare amount"; match the new wording. One key and one wording must remain after this step: `git grep -n "cardOverLimit\|accountHeroOverLimit"` returns only the two frozen `docs/superpowers/` hits, and `git grep -n "Over Limit"` returns only `docs/scopes/MA-onboarding-redesign/tasks/MA-009.md:935`, an account name in a seed fixture.
- Test: move `__tests__/screens/accounts/balance_hero.helpers.test.ts:105,119` and `__tests__/screens/dashboard/account_card.helpers.test.ts:335,336,492` to `Strings.accountOverLimit`, and reword the three test titles that carry the retired string: `account_card.helpers.test.ts:320` names the old key, while `account_card.helpers.test.ts:484` (`the Over Limit and due-date rows carry no amountText`) and `__tests__/screens/accounts/accounts_list.helpers.test.ts:192` (`carries Over Limit through in place of the available amount`) name the old wording — the key grep above cannot catch those two. In `__tests__/screens/accounts/accounts_list.helpers.test.ts:193`, replace the interpolated key with the byte-exact caption `'Limit 40,000 · available Over limit'` — the file's sibling assertions are already byte-exact, and this is the one assertion in the suite that fails at base and passes at head, so the copy change has a gate rather than three tests that pass either way. That literal is `:193`'s only use of `Strings` in the file, so delete the `import { Strings } from '@/constants/strings';` at `:2` in the same edit — oxlint reports the leftover as a warning at exit 0, so `npm run lint` stays green over a dead import.

## Screens
One seeded run covers all three; the CC accounts are `credit_limit: 40000` with `current_balance: 45000` (over) and `8450` (under).
- Account detail, balance hero: over-limit card — caption reads "Over limit" in the negative colour; under-limit card — caption still reads "Available 31,550 EGP of 40,000" in its band colour.
- Dashboard, account card carousel: over-limit card — the Available row's label is still "Available" and its value reads "Over limit"; under-limit card — the row's amount and colour unchanged.
- Accounts list, row caption: over-limit card reads `Limit 40,000 · available Over limit`; under-limit card reads `Limit 40,000 · available 31,550`.

## Non-goals
- The dashboard card's layout and its credit progress bar (`account_card.tsx:50-53`), including that `Math.min(1, …)` clamps an over-limit card's fill — MA-015 (#381).
- `availableCreditColor`'s thresholds and the colours any surface applies.
- The detail facts row that prints the limit (`account_facts.helpers.ts:43`); it shows an amount, not the state.
- Any new amount: `available`, `limit - balance` and every formatter call stay where they are.
- Reworking `resolveAccountCaption` to stop borrowing the dashboard's rows — it is the shipped seam (ADR 2026-09-07) and this ticket does not touch it.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.
- The copy gate, demonstrated once: `npx jest __tests__/screens/accounts/accounts_list.helpers.test.ts` fails on the new byte-exact caption when run against step 3's tree and passes after step 4.

## Risks
- A rename of `accountHeroOverLimit` reaches five test call sites; miss one and `typecheck` catches it, so the risk is only that the rename lands without the byte-exact caption assertion and the wording change ships ungated.
- Nothing in the verification chain fails on an unused import: oxlint's `no-unused-vars` is a warning and exits 0. Any import the rename empties has to be removed by hand, in the same edit that empties it.
- `resolveAccountCaption` depends on the over-limit row carrying `value` and no `amountText` (`accounts_list.helpers.ts:48-51`); spreading `amountParts` into that row instead of a bare `{ value }` would silently change the list caption. Step 3 keeps the bare object.
- If MA-015 (#381) lands on `account_card.helpers.ts` first, step 3's line numbers move; the symbols do not.

## Self-assessment
Step 4 is the one I am least sure about, and only on placement: `Strings.accountOverLimit` has to live in some surface's block because `strings.ts` has no shared section, and I put it in the §9 balance-hero block because that is where the approved wording already ships — a reviewer could reasonably want it in the dashboard block at `:228` instead, or want the key left as `accountHeroOverLimit` to keep the diff smaller. Nothing downstream depends on the choice; the ticket lists the hero's own assertions among those that move, which is why I read a rename as intended rather than keeping the hero key as-is.
