# Dashboard

Route `/dashboard`, the first tab. Screen `src/modules/dashboard/screens/dashboard/index.tsx`, section headers from the shared `src/components/ui/section_header.tsx`. Not redesigned by #378; drawn as it is today. This file carries only the pill states MA-086 needs — add the rest when a ticket reaches them.

## Reach it

- User path: the app opens here once onboarding is complete.
- Script: `mqa open /dashboard`, or the tab bar's exact content-desc from `mqa ui`; the bare `$MQA tap 'Home'` is refused under the uiautomator engine (`Strings.tabHome`; no node reads `Dashboard`).
- Section label per account type (`Bank`, `Cash`, `Wallet`, `Savings`, `Credit Card`), each with its count badge on the right.

## States

| State | Frame | Force | Proof |
|---|---|---|---|
| section count badges | no frame, MA-086 | the hundred-accounts seed named in `accounts_list.md` § States (`section count badge`) — its three types carry a one-, two- and three-digit count — then the `Accounts` segment. One push serves both screens; do not build a second | each badge label's `TextView` bounds ÷ 2.625 read `lineHeightFor(msFont(12))` = 16 ± 1 high, so the pill is 16 + 4 (`py-0.5`) = 20 at every count; the pill stays wider than it is tall (label width + 16 for `px-2`); one shot of the section header rows |
| section title | no frame, MA-087 | any seeded account, so at least one type header draws | the uppercase title's `TextView` bounds ÷ 2.625 read `lineHeightFor(msFont(12))` = 16 ± 1; the header row (`items-center`) is 20 beside a badge and 16 without one; one shot |
| manual-rate pill | no frame, MA-087 | `Settings` → `Currency` (`Strings.settingsCurrencyRow`) → expand `Manual Override`, enter a rate, `Save Rate` (`Strings.currencySaveCta`), then back to the Dashboard | `$MQA ui \| grep -c 'MANUAL'` = 1 (the label is uppercase); its `TextView` bounds ÷ 2.625 read `lineHeightFor(msFont(11))` = 15 ± 1 and the painted pill 23 (15 + 2 × `ms(3)` + the 1 dp border pair) on the shot; one shot of the hero header row |
| tab bar labels, large font | no frame, MA-125 | the `Font scale` force (README) at 1.0 and 2.0 | at 2.0 each of the five label `TextView` boxes sits inside its cell's clickable node, its line box capped at the 16 dp the bundled cell leaves under its icon (MA-125: top 691.4, 16.00 dp high, cell bottom 707.46; `mqa bounds` clips at the cell, so the crop is the proof: `Budget`'s `g` ends 1 px above the cell's bottom), and a crop of the bar shows each label whole or ending in a whole `…`, no glyph cut at its leading edge, top or bottom; at 1.0 `fab-button` and the five label boxes' tops and bottoms read the same ± 1 dp as on `main`, and each label box is at most 7% wider (`Type.pillLabel` over the bundled raw 10, user ruling 2026-09-28); a crop of the bar at each scale |
| add button clearance, populated | no frame, MA-125 | a seed with accounts of more than one type and transactions this month, so both segments scroll; the `Font scale` force (README) at 1.0 and 2.0 | on `Overview` and on `Accounts`, scrolled to its end (`mqa scroll down --until` its last row), at both scales, the last text node's bottom from `mqa bounds` is at or above the top of `fab-button`; one shot per segment at 2.0 |
| add button clearance, empty | no frame, MA-125 | an empty database with onboarding complete: the accounts empty state; the `Font scale` force (README) at 1.0 and 2.0 | at both scales no text node's box from `mqa bounds` intersects `fab-button`'s; one shot at 2.0 |
| add button clearance, load error | no frame, MA-125 | source force: `throw new Error('forced')` as the first line of the `try` around `repository.getSnapshot(input)` in `dashboard.store.ts`, reverted after; the `Font scale` force (README) at 1.0 and 2.0 | `dashboard-load-error` shows; at both scales no text node's box from `mqa bounds` intersects `fab-button`'s; one shot at 2.0 |
| toast, large font | no frame, MA-125 | source force: in `useDashboard` (`dashboard.hook.ts`), `const { toast } = useToast();` and an effect that calls `toast.show` once with an existing string, reverted after, because no tab screen shows a toast; the `Font scale` force (README) at 2.0 | read while the toast shows, from `mqa bounds`: the toast's bottom is at or above the top of `fab-button`, and its box intersects neither `fab-button`'s nor any of the five tab cells' clickable nodes; one shot |

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
