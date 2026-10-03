# Add account

Route `/accounts/add_account`, and `(onboarding)/add_account` for N2. Screen `src/modules/accounts/screens/accounts/add_account/index.tsx` over the shared `account_form`. Not redesigned by #378; drawn as it is today.

## Reach it

- User path: accounts list `+`, or Settings, or N2 during onboarding.
- Script: `$MQA tap 'Add Account'` from Settings, or the `+` on the list header (`mqa up` turns off the dev-client Tools button that sat over the header's right action).

## States

| State | Frame | Force | Proof |
|---|---|---|---|
| bank form | none | open | type grid, name, currency tabs, opening balance; `mqa ui` |
| credit card form | none | pick `Credit card` | the credit block appears; `mqa ui` |
| active type card | MA-013 | pick a type | the active card background; shot |
| duplicate name, active | none | an existing name | refusal; db unchanged |
| duplicate name, archived | no frame, MA-076 open | an archived account's name | refusal once MA-076 merges |
| save failure | none | source force | `Couldn't save that account. Tap Save Account to try again.`; db unchanged |
| saved | none | `$MQA tap 'Save Account'` | `mqa db "select name, opening_balance, current_balance from accounts order by rowid desc limit 1"`: current equals opening |
| save button, large font | no frame, MA-130 | the add form; the `Font scale` force (README) at 1.0 and 2.0 | the `Button proof` (README) on the save button; one crop at 2.0 |
| colour sheet, large font | no frame, MA-130 | the colour row on the add form; the `Font scale` force (README) at 1.0 and 2.0 | the `Button proof` (README) on the sheet's buttons; one crop at 2.0 |
| credit card form, amounts half-typed | no frame, MA-115 | `$MQA open /accounts/add_account`, `$MQA tap 'label="Credit Card"'`, `$MQA scroll down`, tap the `switch` by its `@ref` for Track interest, `$MQA scroll down`, `$MQA tap 'label="Save Account"'` with the form empty; no field carries a testID: an empty one reads `field "<its label or placeholder>"` (`Credit limit`, `Minimum payment`, `e.g. 24.5` for the APR, `0.00` for the balance, labelled `Amount currently owed`) and a filled one `field "<its text>"`, each taken by its `@ref`; the limit `48.`, `0`, `0.`, `48.`, `0.001`, the APR `48.`, `101`, the minimum `48.`, each typed after a settled clear (`$MQA tap <@ref>`, `$MQA clear`, `$MQA type <text>`). A `scroll` with a field focused leaves the screen, so the balance is a second pass from a cold launch: the same up to Save Account, `$MQA scroll up`, then the balance `48.`, `0.001`, `0`. A `fill` over a text can drop it and leave the field empty under its required fault | after Save `Credit limit is required for credit cards`, `Please enter your card's APR`, `Enter an amount.` and `Enter a name for this account.`; under the limit the helper `Required.` at `48.`, `0` and `0.`, `Numbers only.` at `0.001`; under the APR the helper `Yearly rate on your card.` at `48.`, `Enter a rate from 0 to 100.` at `101`; under the minimum the helper `Can't exceed what you owe.` at `48.`; under the balance the helper `Enter 0 if the card is paid off.` at `48.` and at `0`, `Numbers only.` at `0.001`; in `mqa bounds` `Due day, optional` at y 347.8 and `Track interest` at y 443.0 before Save and at every typed value, 20.2 dp lower only while the two-line `Credit limit is required for credit cards` shows; one shot of the card fields and one of the balance at `48.` |

## Outbound

| Action | Lands on | Back lands on |
|---|---|---|
| `Save Account` | the list (or N3 in onboarding) | n/a |
| Back | where it was opened from | n/a |

## Gotchas

- Typing a name with `&`, `;`, `'` or `$` goes through `mqa type`, which quotes it; raw `input text` truncates silently.
- `current_balance = opening_balance` at creation is business rule 6; assert it in the db, never on the screen.
