# Currency

Route `/settings/currency`. Screen `src/modules/currency/screens/currency/index.tsx`, reached from Settings. Not redesigned; drawn as it is today. This file carries only the button states MA-130 needs; add the rest when a ticket reaches them.

## Reach it

- User path: Settings (the gear on the dashboard header, `Settings`), then the `Currency` row (`Strings.settingsCurrencyRow`); `dashboard.md`'s `manual-rate pill` walks the same path.
- Script: `$MQA open /settings/currency`.
- `Refresh Rate` fetches the live rate; `Manual Override` is an accordion whose body holds the rate field and `Save Rate`.

## States

| State | Frame | Force | Proof |
|---|---|---|---|
| buttons, large font | no frame, MA-130 | a seeded database; `Refresh Rate`, then `Save Rate` under an expanded `Manual Override`; the `Font scale` force (README) at 1.0 and 2.0 | the `Button proof` (README) on `Refresh Rate` and `Save Rate`, both `md`; one crop at 2.0 |
| manual rate half-typed | no frame, MA-115 | `$MQA open /settings/currency`; expand the accordion by its trigger, `$MQA tap '~Set your own rate'` (it reads `Manual Override, Set your own rate`, and with an override stored `Manual Override` alone also matches the hero chip); the rate field has no testID, label or placeholder, so `mqa read` lists it as `field "<its text>"` only while it holds text; tap it by its `@ref` while it holds the stored rate and keep the centre that tap prints, (541, 1221) px on `Pixel_2_API_34`; `$MQA clear`, then `$MQA tap 'label="Save Rate"'`, which is refused and writes nothing; `$MQA tapxy` the centre and `$MQA type` `48.`, then `fill` `0`, `0.0`, `50abc` by the field's `@ref` | `Please enter a valid amount` after Save and at `50abc`, absent at the other three; `Save Rate` at y 505.1 without the line and y 531.4 with it; the hero's rate and its `Last updated` line read at the end as they did at the start, and `mqa db "select key, value from app_settings where key like 'usd_rate%'"` returns the stored rate and `usd_rate_updated_at` unchanged; one shot at `48.` |

## Outbound

| Action | Lands on | Back lands on |
|---|---|---|
| Back | Settings | the dashboard |

## Gotchas

- `Save Rate` writes a manual override, which draws the dashboard's `MANUAL` pill until it is cleared; the render pass reads its bounds and does not tap it.
