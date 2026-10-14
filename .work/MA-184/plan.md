# MA-184 — The adjust balance sheet's helper and error line is the shared field message track
base: c86c716be86fda14ed27f9e1291998d748feb1a1 · verify: emulator · flags: none · expected diff: ~8 lines

## Steps
### 1. The live-region row stops naming the sheet, with its seed gone
- File: `scripts/validate-structural-guards.js` (the `keptLiveRegion(LIVE_REGION)` row, `:335-344`)
- Change: delete the `adjust_balance_sheet.tsx` entry at `:338`; the row keeps `field_message_rail.tsx`, `account_color_sheet.tsx` and `commitment_form_body.tsx`. Lands before step 2: after step 2 the sheet holds no `accessibilityLiveRegion=` tag, and `holds(...)` in `keptLiveRegion` (`:137`) reports `no element holds` on a file still in the row. Until step 2 the sheet's copy stays under row T4 (`:372-385`) and keeps its `collapsable={false}`.
- Test: `first` · `__tests__/scripts/validate_structural_guards.test.ts`: delete the `ADJUST_BALANCE_SHEET` constant (`:33-34`) and the `withoutKeptView(ADJUST_BALANCE_SHEET, ...)` seed (`:463`). Otherwise `replaceEvery` throws `fixture mutation target absent` (`:111-114`) once step 2 removes `collapsable={false}` from the sheet. `withoutKeptView(FIELD_MESSAGE_RAIL, ...)` (`:462`) stays: it is the case that shows `npm run lint` fails when the shared track loses `collapsable={false}`. `exits 0 with one stdout line on the unseeded tree` covers the row after each step.

### 2. The sheet mounts `FieldMessageTrack` and holds no copy of it
- File: `src/modules/accounts/screens/accounts/detail/components/adjust_balance_sheet.tsx` (`AdjustBalanceSheetBody`, `:74-91`)
- Change: replace the comment at `:74` and the `Box` at `:75-91` with `<FieldMessageTrack error={error} helper={Strings.adjustBalanceHelper} />`, imported from `'../../../../components/account_form/field_message_rail'`, the specifier `locked_field.tsx:8` uses at the same depth. Interface, `field_message_rail.tsx:23-30`, one props object: `error` optional `string`, never `null`, given the state's `error`, which is `''` when there is none and which the track reads as no error at `:37`; `helper` optional `string`, never `null`, given `Strings.adjustBalanceHelper`; `reserveErrorLines` omitted, so the track's style is `FIELD_MESSAGE_RAIL_STYLE` (`account_form.geometry.ts:29`) and its height is the copy's. The track returns an element, never `null`. Drop the imports left unused: `FormErrorText` (`:8`) and the `account_form.geometry` import (`:21-24`). `Typography`, `Type` and `lineHeightFor` stay, used by the balance row and the currency suffix. No `AdjustBalanceSheet` prop, state field or string changes.
- Test: `first` · `__tests__/screens/accounts/adjust_balance_sheet_save_error.test.tsx`, a case in an existing render suite under the Render-suite policy: the glyph beside the error is render-only wiring, and the style assertion binds to `FIELD_MESSAGE_RAIL_STYLE`. Mock `@expo/vector-icons/MaterialCommunityIcons` to a `View` with `testID={`icon-${name}`}`, as `__tests__/screens/commitments/pay_sheet_rate_error.test.tsx:24-27` does. Keep the suite's `FormErrorText` mock, which the shared track's import also resolves to. New `describe('AdjustBalanceSheet message track')`: (a) at rest, `Strings.adjustBalanceHelper` shows and `icon-alert-circle-outline` is absent; (b) after `27,500abc` and `Save`, `icon-alert-circle-outline` precedes `balance-error` in tree order, `balance-error` reads `Strings.errBalanceInvalid`, the helper is gone, and the host view holding `accessibilityLiveRegion`, found walking up from `balance-error`, has `accessibilityLiveRegion` `'polite'`, `collapsable` `false` and `toHaveStyle(FIELD_MESSAGE_RAIL_STYLE)`; (c) on a rejected save, `icon-alert-circle-outline` precedes `balance-error`, which reads `Strings.adjustBalanceSaveError`. At base (b) and (c) fail on the missing glyph.

### 3. The features file holds the two invalid-amount states
- File: `.claude/skills/emulator-verify/features/account_detail.md` (§ States table, after the `adjust balance sheet, large font` row at `:42`)
- Change: append two rows, both bank account only, since the track has no type branch.
  - `adjust balance sheet, invalid amount`, frame `G1 field, D3 message`. Force: from `adjust balance sheet, positive`, take the amount field by its `@ref` from `mqa ui`, where it reads `field "<the prefilled balance>"`, then `$MQA tap <@ref>`, `$MQA clear`, `$MQA tap 'label="Save"'`. Proof: before `Save`, `mqa read` holds `Enter the balance on your statement.` and `mqa bounds` gives the helper `TextView`'s box. After `Save`, `mqa read` holds `Please enter a valid amount` and no helper. The error `TextView`'s left edge is 19 ± 1 dp right of the helper's, `FIELD_MESSAGE_GLYPH.size` + `.gap`, `ms(13)` + `ms(5)` on the 411 dp emulator. Its top sits as far below the amount field's bottom as the helper's did ± 1 dp, and its height equals the helper's ± 1 dp, so the track's height holds. One crop of the track: the alert glyph in the danger colour, then the text.
  - `adjust balance sheet, invalid amount, large font`, `no frame, MA-184`. Force: the `invalid amount` force under the `Font scale` force (README) at 2.0. Then the save error: `throw new Error('forced');` as the first line of the `try` in `handleAdjustBalance` (`account_detail.hook.ts:231`), a valid amount, `Save`, reverted with `git status` clean after; the sheet's `catch` logs nothing, so no LogBox banner. Proof at 2.0: the crop shows `Please enter a valid amount` on one line, and `Could not save this balance. Please try again.` on two lines with the first ending at `balance.`. The first error's `TextView` is half the height of the second's ± 1 dp. Each error's bottom sits above `sheet-footer`'s top. The glyph is whole and aligned with the first line. One crop of each error.
- Test: `none` · a recipe file the implementer and the render lens run; no Jest layer reads it.

## Screens
- `emulator-verify/features/account_detail.md` · adjust balance sheet, invalid amount · new, step 3 adds it · risk none
- `emulator-verify/features/account_detail.md` · adjust balance sheet, invalid amount, large font · new, step 3 adds it · risk a font scale above 1.0

## Non-goals
- No edit to `field_message_rail.tsx` or `account_form.geometry.ts`: glyph size, gap, inset, line height and live region stay as they are.
- No `reserveErrorLines` on the sheet; the track keeps `FIELD_MESSAGE_RAIL_STYLE`.
- No new structural-guard row or seed requiring `FieldMessageTrack` in the sheet.
- No change to `strings.ts`, to `AdjustBalanceSheet`'s props, or to `adjust_balance_sheet.state.ts`.
- No move of `FieldMessageTrack` into `src/components/ui/`.
- Where the sheet rests over the keyboard: MA-185 (#729).
- The kept live region on the other message areas and its lint check: MA-183 (#725), merged at c86c716b.

## Untested inputs
- A credit card's refused negative (`adjust_balance_sheet.helpers.ts:22-24`) sets the same `Strings.errBalanceInvalid` through the same `setError`; step 2 has no case of its own for it.
- The line breaks at font scale 2.0 have no Jest case; step 3's large-font row is their only check.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- `account_detail.md · adjust balance sheet, invalid amount, large font`: the one-line and two-line breaks at 2.0 come from arithmetic on Inter's advance widths in the ticket's Context. A wrap the 19 dp glyph column adds grows the track and breaks the Acceptance line on its height.
- `account_detail.md · adjust balance sheet, invalid amount, large font`: the save error needs a source force in `account_detail.hook.ts`, which a read-only render lens cannot apply; the implementer's shot at head is that error's proof.
- The suite's new icon mock replaces `MaterialCommunityIcons` for every case in the file; a case that reads an icon as text would change, and none does today.

## Self-assessment
Step 3's proofs are the least certain. The 19 dp offset comes from the ticket, not from a reading. The large-font row proves the line counts by a ratio of two error heights, because no figure for either error at 2.0 exists on `main` to compare against. If the save error's first line breaks somewhere other than `balance.` on the device, the row's wording, not the code, is wrong, and the implementer rewrites the row from the reading.
