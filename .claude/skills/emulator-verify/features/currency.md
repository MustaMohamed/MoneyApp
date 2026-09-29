# Currency

Route `/settings/currency`. Screen under `src/modules/settings/`, reached from Settings. Not redesigned; drawn as it is today. This file carries only the button states MA-130 needs — add the rest when a ticket reaches them.

## Reach it

- User path: Settings (the gear on the dashboard header, `Settings`), then the `Currency` row (`Strings.settingsCurrencyRow`); `dashboard.md`'s `manual-rate pill` walks the same path.
- Script: `$MQA open /settings/currency`.
- `Refresh Rate` fetches the live rate; `Manual Override` is an accordion whose body holds the rate field and `Save Rate`.

## States

| State | Frame | Force | Proof |
|---|---|---|---|
| buttons, large font | no frame, MA-130 | a seeded database; `Refresh Rate`, then `Save Rate` under an expanded `Manual Override`; the `Font scale` force (README) at 1.0 and 2.0 | the `Button proof` (README) on `Refresh Rate` and `Save Rate`, both `md`; one crop at 2.0 |

## Outbound

| Action | Lands on | Back lands on |
|---|---|---|
| Back | Settings | the dashboard |

## Gotchas

- `Save Rate` writes a manual override, which draws the dashboard's `MANUAL` pill until it is cleared; the render pass reads its bounds and does not tap it.
