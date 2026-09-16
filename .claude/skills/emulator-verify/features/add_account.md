# Add account

Route `/accounts/add_account`, and `(onboarding)/add_account` for N2. Screen `src/modules/accounts/screens/accounts/add_account/index.tsx` over the shared `account_form`. Not redesigned by #378; drawn as it is today.

## Reach it

- User path: accounts list `+`, or Settings, or N2 during onboarding.
- Script: `$MQA tap 'Add Account'` from Settings, or the `+` on the list header (`mqa park` first: the dev-client bubble sits over the header's right action).

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

## Outbound

| Action | Lands on | Back lands on |
|---|---|---|
| `Save Account` | the list (or N3 in onboarding) | n/a |
| Back | where it was opened from | n/a |

## Gotchas

- Typing a name with `&`, `;`, `'` or `$` goes through `mqa type`, which quotes it; raw `input text` truncates silently.
- `current_balance = opening_balance` at creation is business rule 6; assert it in the db, never on the screen.
