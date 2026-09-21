# Dashboard

Route `/dashboard`, the first tab. Screen `src/modules/dashboard/screens/dashboard/index.tsx`, section headers from the shared `src/components/ui/section_header.tsx` through the module re-export. Not redesigned by #378; drawn as it is today. This file carries only the pill states MA-086 needs — add the rest when a ticket reaches them.

## Reach it

- User path: the app opens here once onboarding is complete.
- Script: `adb shell am start -a android.intent.action.VIEW -d "moneyapp://dashboard"`, or `$MQA tap 'Dashboard'` on the tab bar.
- Section label per account type (`Bank`, `Cash`, `Wallet`, `Savings`, `Credit Card`), each with its count badge on the right.

## States

| State | Frame | Force | Proof |
|---|---|---|---|
| section count badges | no frame, MA-086 | the hundred-accounts seed named in `accounts_list.md` § States (`section count badge`) — its three types carry a one-, two- and three-digit count — then the `Accounts` segment. One push serves both screens; do not build a second | each badge label's `TextView` bounds ÷ 2.625 read `lineHeightFor(msFont(12))` = 16 ± 1 high, so the pill is 16 + 4 (`py-0.5`) = 20 at every count; the pill stays wider than it is tall (label width + 16 for `px-2`); one shot of the section header rows |

## Outbound

| Action | Lands on | Back lands on |
|---|---|---|
| `See all` on the Accounts segment | `/accounts` on the `(app)` stack | this dashboard |
| account card tap | `/accounts/[id]` | this dashboard |
| Back | exits the app from the first tab | n/a |

## Gotchas

- A section header renders only while its type has at least one active account; a zero count draws no badge at all (`section_header.tsx`, `count > 0`).
- The badge is the shared `SectionHeader`, the same component `/accounts` renders — a height read here and there must agree, and a divergence is a caller override, not the component.

## Seeding and forcing states

See `README.md` § Seeding and forcing states; the seed push is the only way to reach a hundred accounts.
