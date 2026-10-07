# ADR: Account balances take their sign from the owned composer, and lint fails a hand-built owned sign

- **Date:** 2026-10-06
- **Status:** accepted
- **Ticket:** #667 (MA-156), under #585
- **Applies to:** `src/utils/format_amount.ts`, `scripts/validate-money-formatting.js`, the nine sites in §2

ADR 2026-10-04 §2 gave the account detail hero the owned composer. Nine other places printed an account's balance through `formatCurrencyAmount` or `formatCurrencyParts`, so an overdrawn balance read `-1,900` (U+002D) there and `−1,900` (U+2212) on the hero. Nothing stopped a new site from building an owned sign by hand either.

**Superseded in part 2026-10-07 (#687).** Three statements below no longer hold: the detail hero's opening caption in the §2 table calls `formatAccountBalance`, the dashboard account card in §5 calls `formatOwnedAmount`, and the balance-column scan in §6 also fails `formatDisplayAmount`, `formatDisplayAmountParts` and `formatDisplayMagnitude`. `docs/adr/2026-10-04-owned-owed-composers-shared-home.md` §1 records all three.

## 1. The account balance composer lives in `src/utils/format_amount.ts`

- `formatAccountBalanceParts(balance: number, currency: Currency): AccountBalanceParts` returns `{ amount: string; code: string; printsAsZero: boolean }`. Its magnitude is `formatCurrencyMagnitude(balance, currency)`, passed to `formatOwnedAmountParts` as the third argument (ADR 2026-10-04 §2).
- `formatAccountBalance(balance: number, currency: Currency): string` is `amount`, a space, `code`.

Both moved from `src/modules/accounts/screens/accounts/detail/components/balance_hero.helpers.ts` with `AccountBalanceParts`, names and bodies unchanged. That file keeps no re-export. `balance_hero.tsx`, `archive_confirmation.helpers.ts` and `adjust_balance_sheet.tsx` import them from the shared file.

Accounts, onboarding and commitments all read the composer, so no single module owns it, and it lives in the shared file under ADR 2026-10-04 §1, the file audit M1 names as the source of every money string.

## 2. Every site that prints an account balance calls it

| Site | File | Call |
|---|---|---|
| accounts list row, the value over the code | `src/modules/accounts/screens/accounts/list/components/account_list_row.tsx` | `formatAccountBalanceParts` |
| archived card caption | `src/modules/accounts/screens/accounts/list/components/archived_card.helpers.ts` | `formatAccountBalance` |
| account row screen-reader label (list row, archived row, N3 row) | `src/modules/accounts/constants/account_row_a11y_label.ts` | `formatAccountBalance` |
| account picker and replacement account rows | `src/modules/accounts/components/account_row_content.tsx` | `formatAccountBalance` |
| onboarding more-accounts row, the value over the code | `src/modules/onboarding/screens/onboarding/more_accounts/components/account_row.tsx` | `formatAccountBalanceParts` |
| pay sheet account line | `src/modules/commitments/screens/commitments/detail/components/pay_sheet.tsx` | `formatAccountBalance` |
| account facts, opening balance | `src/modules/accounts/screens/accounts/detail/components/account_facts.helpers.ts` | `formatAccountBalance` |
| detail hero, opening caption | `src/modules/accounts/screens/accounts/detail/components/balance_hero.helpers.ts` | `formatAccountBalanceParts(...).amount` |
| edit form, locked opening balance | `src/modules/accounts/screens/accounts/edit_account/index.tsx` | `formatAccountBalanceParts(...).amount` |

Each site prints the digits and the currency code it printed before. For a balance below zero the glyph moves from U+002D to U+2212, and nothing else changes for a nonzero balance.

## 3. A credit card's balance is an owned amount on its own rows

A credit card's row prints its balance unsigned when positive, as the detail hero does. The owed sign (`formatLiabilityRowValue`) stays on the net worth sheet's liability rows alone (ADR 2026-08-27 decision 3).

## 4. An exact `-0` balance prints `0` at these sites

`formatCurrencyAmount(-0, currency)` prints `-0`: `formatAmount` strips the sign only from a nonzero value that rounds to zero. The composer takes the absolute magnitude and gives no sign to a text that prints as zero, so the nine sites now print `0` (`0.00` in USD) for `-0`, as the detail hero already did.

## 5. Sites left on other formatters

- The N4 hero and pill (`src/modules/onboarding/screens/onboarding/ready/ready.helpers.ts`) print the starting net position, not a balance, and ADR 2026-08-21 §2 keeps an exact `-0` visible there.
- The dashboard account card and the net worth sheet rows already call `formatOwnedAmountParts` on its default magnitude, which escalates a sub-unit amount to 2dp. That stays.
- The credit limit and minimum payment facts, the hero's available caption and the pay sheet's converted total are not balances.

## 6. `npm run lint` fails a hand-built owned sign and a plain formatter on a balance column

`scripts/validate-money-formatting.js` runs a second scan over the same tracked `src` files, on each file's comment-stripped lines joined, so a ternary wrapped across lines still matches.

- **Pattern.** A conditional whose two branches are a minus glyph and an empty string literal, in either order. The minus glyph is the identifier `MINUS_SIGN` or a quoted U+002D or U+2212, the second as the character or as the escape `\u2212`; quotes are single, double or backtick. A branch still matches when parentheses wrap it or it carries an `as <Type>` cast. A quoted `-` against an empty string matches whatever it builds, a separator between two parts of a name as much as a sign, and an `OWNED_SIGN_ALLOWLIST` entry is the way out for a match that signs no money.
- **Report.** One stderr line per match, `<path>:<line>: builds an owned sign by hand`, at the line of the match's `?`, naming `formatOwnedAmountParts` and `formatAccountBalanceParts`, then `OWNED_SIGN_ALLOWLIST` for a match that signs no money; exit 1.
- **`OWNED_SIGN_ALLOWLIST`.** `{ path: 'src/utils/format_amount.ts' }` covers every match in the composer's file. `{ path: 'src/modules/transactions/screens/transactions/transactions.helpers.ts', name: 'leftOfIncome' }` covers a match in that file only inside the value of the property keyed `leftOfIncome`, the transactions hero's percent caption. It signs a percent, not money, and is not rewritten.
- **The property test.** On the stripped text, a match sits in the property when the stretch from the nearest `leftOfIncome:` before the match's `?` up to that `?` holds no `,` or `;` at bracket depth 0 and no `)`, `]` or `}` closing a bracket opened before the key. Depth counts `(`, `[` and `{`.
- **Stale entries.** An entry whose path is untracked, gone from disk or holds no match the entry covers fails the run, as the `Intl.NumberFormat` allowlist does.

The scan does not see these shapes:

- A sign built without a ternary: an `if` that assigns `MINUS_SIGN`, a named empty-string constant, a concatenation.
- `undefined` or `null` in place of the empty string.
- A quoted glyph spelled as any escape other than `\u2212`: `\u{2212}` for U+2212, `\x2d` for U+002D.
- A template literal that embeds the glyph beside other text, `` `−${text}` `` against `text`.
- A cast to a type with type arguments on the branch ahead of the `:`.
- A flow sign that picks between `PLUS_SIGN` and `MINUS_SIGN`. It is not an owned sign and is not linted. Nor is the three-way form, `delta > 0 ? PLUS_SIGN : delta < 0 ? MINUS_SIGN : ''`. The scan skips a match whose `?` opens the false branch of a `? PLUS_SIGN :` ternary, and it reads that from the text between that `:` and the match's `?` holding no `?`, `:`, `,`, `;` or bracket. A condition that holds one of those is reported. With the minus branch first, as `transaction_row.helpers.ts` writes it, the pattern has nothing to match.
- The property test reads text and has no syntax tree. It misreads a string literal in the `leftOfIncome` value that holds a bracket, a `,` or a `;` ahead of the sign, a ternary whose false branch follows a bare `leftOfIncome`, and a type annotation on a variable or parameter named `leftOfIncome`, which it takes for the property.

An oxlint plugin rule on the syntax tree was not written: it would exempt by property key with no bracket counting, and would need `.oxlintrc.json` overrides for tests and for the composer's file.

**A plain formatter on a balance column.** A third scan over the same stripped, joined text fails a call to `formatAmount`, `formatCurrencyAmount` or `formatCurrencyParts` whose first argument ends in `.current_balance` or `.opening_balance`, through optional chaining and across wrapped lines. None of the nine sites in §2 built a sign ternary. Each made this call, and the owned-sign scan cannot see a tenth. The report is one stderr line per match, `<path>:<line>: prints an account balance through a plain formatter`, at the line of the call, naming `formatAccountBalanceParts` and `formatAccountBalance`; exit 1. The scan has no allowlist, since nothing in `src` matches it. It does not see a balance read into a local or destructured before the call, or a prop or parameter that carries the balance under another name, as in `formatCurrencyAmount(currentBalance, currency)`. Nor does it see a first argument that holds a call or goes on past the column, as `account.current_balance ?? 0` does.
