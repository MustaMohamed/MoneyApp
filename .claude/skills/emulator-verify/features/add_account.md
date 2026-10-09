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
| header title, large font | no frame, MA-159 | `mqa open /accounts/add_account` on the empty database and on a seeded one; the `Font scale` force (README) at 1.0 and 2.0 | the `Header proof` (README) on `Add Account`, no right action |
| type tiles, large font | no frame, MA-162 | `$MQA open /accounts/add_account`, once on the empty database (no accounts) and once on a seeded one; the `Font scale` force (README) at 1.0 and 2.0. A tile the form has scrolled out of view is not tapped back in, so `$MQA scroll up --until 'label="Credit Card"'` before its tap | `mqa bounds` on `label="Credit Card"` reads `resolveAccountTypeTileGeometry(scale).height` ± 1 dp, 80.0 at 1.0 and 88.8 at 2.0 (89.1 on the upper row of tiles), with the caption's `TextView` box inside it, 16.0 and 33.5 high; one crop of the grid at 2.0, each icon whole and each caption whole or ending in a whole `…` (`Smart …`, `Cash …` and `Credit …` on 2026-10-09); the 1.0 shot matches `main`. Then the walk of the form at 2.0, on the bank form and, after `$MQA tap 'label="Credit Card"'`, on the credit card form: at the top and after each `$MQA scroll down`, to the form's end, one shot with no text cut at the top or bottom, and every text node `mqa read` lists goes to `mqa bounds`, where no box intersects another's. The colour row's label and the credit card block's labels and helpers are among them |
| currency tabs, large font | no frame, MA-162 | the same open, on both databases; the `Font scale` force (README) at 1.0 and 2.0 | `mqa bounds` on `label="EGP"` and `label="USD"`, which also match the balance field's own `EGP` suffix left of x 240: each trigger's top at or below the bottom of the `Currency` label's box, each bottom at or above the top of the helper `Today's balance.`, the line below them (at 2.0 the label ends at y 522.7, the triggers span 526.5 to 566.9 and the helper starts at 578.7), and at 2.0 the `EGP` text box `resolveSegmentedTabsGeometry(2, CURRENCY_TABS_MAX_FONT_SCALE).defaultLabel.lineHeight` ± 1 dp high, 28.2, the line box of scale 1.3, and wider than at 1.0, 44.2 against 32.0, which a code at the fit's 4 dp floor is not; one crop at 2.0, both codes whole with no `…`, neither cut at the top or bottom. The row asserts no centring on the balance field, 53.7 dp high at 2.0 against the box's 48 |
| credit card form, balance label, large font | no frame, MA-162 | the same open, then `$MQA tap 'label="Credit Card"'`; the `Font scale` force (README) at 1.0 and 2.0 | one crop of the balance and currency row at 2.0, `Amount currently owed` whole on two lines with no word broken and `Currency` on the lower line beside it; `mqa bounds`: the label's `TextView` 64.0 dp high at 2.0 and 16.0 at 1.0, its right edge at or left of the balance field's (239.2 against 239.6 at 2.0); the 1.0 shot matches `main` outside the tapped tile, which a shot can catch part-way through its press animation |

## Outbound

| Action | Lands on | Back lands on |
|---|---|---|
| `Save Account` | the list (or N3 in onboarding) | n/a |
| Back | where it was opened from | n/a |

## Gotchas

- Typing a name with `&`, `;`, `'` or `$` goes through `mqa type`, which quotes it; raw `input text` truncates silently.
- `current_balance = opening_balance` at creation is business rule 6; assert it in the db, never on the screen.
