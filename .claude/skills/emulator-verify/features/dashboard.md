# Dashboard

Route `/dashboard`, the first tab. Screen `src/modules/dashboard/screens/dashboard/index.tsx`, section headers from the shared `src/components/ui/section_header.tsx` through the module re-export. Not redesigned by #378; drawn as it is today. This file carries only the pill states MA-086 needs — add the rest when a ticket reaches them.

## Reach it

- User path: the app opens here once onboarding is complete.
- Script: `adb shell am start -a android.intent.action.VIEW -d "moneyapp://dashboard"`, or the tab bar's exact content-desc from `mqa ui`; the bare `$MQA tap 'Dashboard'` is refused.
- Section label per account type (`Bank`, `Cash`, `Wallet`, `Savings`, `Credit Card`), each with its count badge on the right.

## States

| State | Frame | Force | Proof |
|---|---|---|---|
| section count badges | no frame, MA-086 | the hundred-accounts seed named in `accounts_list.md` § States (`section count badge`) — its three types carry a one-, two- and three-digit count — then the `Accounts` segment. One push serves both screens; do not build a second | each badge label's `TextView` bounds ÷ 2.625 read `lineHeightFor(msFont(12))` = 16 ± 1 high, so the pill is 16 + 4 (`py-0.5`) = 20 at every count; the pill stays wider than it is tall (label width + 16 for `px-2`); one shot of the section header rows |
| section title | no frame, MA-087 | any seeded account, so at least one type header draws | the uppercase title's `TextView` bounds ÷ 2.625 read `lineHeightFor(msFont(12))` = 16 ± 1; the header row (`items-center`) is 20 beside a badge and 16 without one; one shot |
| manual-rate pill | no frame, MA-087 | `Settings` → `Currency` (`Strings.settingsCurrencyRow`) → expand `Manual Override`, enter a rate, `Save Rate` (`Strings.currencySaveCta`), then back to the Dashboard | `$MQA ui \| grep -c 'MANUAL'` = 1 (the label is uppercase); its `TextView` bounds ÷ 2.625 read `lineHeightFor(msFont(11))` = 15 ± 1 and the painted pill 23 (15 + 2 × `ms(3)` + the 1 dp border pair) on the shot; one shot of the hero header row |

## Outbound

| Action | Lands on | Back lands on |
|---|---|---|
| `See all` on the Accounts segment | `/accounts` on the `(app)` stack | this dashboard |
| account card tap | `/accounts/[id]` | this dashboard |
| Back | exits the app from the first tab | n/a |

## Gotchas

- A section header renders only while its type has at least one active account; a zero count draws no badge at all (`section_header.tsx`, `count > 0`).
- The badge is the shared `SectionHeader`, the same component `/accounts` renders — a height read here and there must agree, and a divergence is a caller override, not the component.
- The title is the same shared `section_header.tsx`; the 16 read here holds on every screen that renders it (`/accounts`, `/accounts/[id]`), so it is measured once.
- The manual-rate pill draws only while the stored rate is a manual override; clearing it in Settings removes the pill, and there is no seed that forces it without the Settings walk.

## Seeding and forcing states

See `README.md` § Seeding and forcing states; the seed push is the only way to reach a hundred accounts.
