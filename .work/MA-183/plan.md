# MA-183 — Four message areas keep their live region on Android
base: 8bd7e140e8b68c1d14f379cec59be1070f7e32e1 · verify: none · flags: none · expected diff: ~40 lines

## Steps
### 1. The field message area on the account form stays a native view on Android
- File: `src/modules/accounts/components/account_form/field_message_rail.tsx` (`FieldMessageTrack`, `:32`)
- Change: Add `collapsable={false}` to the `Box` that holds `accessibilityLiveRegion="polite"`. No other prop, style or child changes. `collapsable={false}` is the prop this repo keeps a View with, `docs/adr/2026-10-13-converted-amount.md` §5 and `src/components/ui/sheet.tsx:263`. The tag is 111 columns with the prop, so oxfmt wraps it.
- Test: `none` · `.claude/rules/tests.md:24` makes this check a row under lint, which step 6 adds with its test.

### 2. The field message area on the adjust balance sheet stays a native view on Android
- File: `src/modules/accounts/screens/accounts/detail/components/adjust_balance_sheet.tsx` (`AdjustBalanceSheetBody`, `:75`)
- Change: Add `collapsable={false}` to the `Box` that holds `FIELD_MESSAGE_RAIL_STYLE` and `accessibilityLiveRegion="polite"`. Nothing else changes.
- Test: `none` · as step 1. `__tests__/screens/accounts/adjust_balance_sheet_save_error.test.tsx` gets no case: no Acceptance line names render-only wiring (`.claude/rules/tests.md:19`).

### 3. The colour name area on the account colour sheet stays a native view on Android
- File: `src/modules/accounts/components/account_form/account_color_sheet.tsx` (`AccountColorSheet`, `:99`)
- Change: Add `collapsable={false}` to the `Box` with `style={{ flex: 1 }}` and `accessibilityLiveRegion="polite"`. Nothing else changes.
- Test: `none` · as step 1.

### 4. The error area on the commitment form stays a native view on Android
- File: `src/modules/commitments/screens/commitments/components/commitment_form_body.tsx` (`:454-458`)
- Change: Add `collapsable={false}` to the `View` that holds `accessibilityLiveRegion="polite"` above the Save button. Nothing else changes.
- Test: `none` · as step 1.

### 5. The footer's status line stays a native view on Android at every mount
- File: `src/components/ui/status_track.tsx` (`StatusTrack`, `:28-37`)
- Change: Add `collapsable={false}` to the root `View`, unconditional, on the same tag as `testID={testID}` and `{...model.a11y}`. `StatusTrackProps`, `resolveStatusTrack` and `src/components/ui/cta_footer.tsx` do not change.
- Test: `none` · as step 1.

### 6. `npm run lint` fails when one of the five areas loses the prop
- File: `scripts/validate-structural-guards.js` (`Requirement`, `:6`; `NAMED_ROWS`, `:118`; the `required` loop, `:400-403`)
- Change: Add one factory that returns a `Requirement`, `{ found: (source: string) => boolean, missing: string }`, both fields required and neither nullable, and the row or rows in `NAMED_ROWS` that apply it to the five files of steps 1 to 5. The factory takes one argument, `marker: RegExp`, required. `found(source)` is true only when at least one JSX opening tag in `source` holds `marker` and every tag that holds it also holds `collapsable={false}`. `source` is the comment-stripped text the loop already passes. The marker is the attribute `accessibilityLiveRegion=` for the files of steps 1 to 4 and the spread `{...model.a11y}` for `src/components/ui/status_track.tsx`. `missing` is exactly ``no `collapsable={false}` on the view that holds the live region``. A file with no tag that holds its marker reports, as a tree row over zero files does at `:414-415`. The prop on another element of the same file does not satisfy the row. `needs` is the implementer's wording.
- Test: `first` · `__tests__/scripts/validate_structural_guards.test.ts`. (a) Five entries in `REQUIRED` (`:408`), one per file of steps 1 to 5: the seed is `replaceEvery(rel, 'collapsable={false}', '')` and `words` is the `missing` string. (b) One case in `named files`: with the prop removed from `commitment_form_body.tsx` and the line `<View collapsable={false} />` appended to it, the run reports the file with the `missing` string. (c) One `it.each` over two files: with `accessibilityLiveRegion="polite"` removed from `field_message_rail.tsx`, and with `{...model.a11y}` removed from `status_track.tsx`, the run reports the file with the `missing` string. The existing case `exits 0 with one stdout line on the unseeded tree` (`:511`) is the passing half and does not change. Cases (a) to (c) are red until steps 1 to 6 land: the seeds of (a) throw `fixture mutation target absent` while a site lacks the prop, which fails every case in their `describe`.

## Non-goals
- The words a screen reader speaks for a label, and the file that holds them: MA-173 (#709).
- The three live regions Android keeps today stay byte-identical and join no row: `src/modules/budget/screens/budget/components/income_sheet.tsx:82-87`, `src/modules/transactions/screens/transactions/transaction_form/components/exchange_rate_row.tsx:164-169`, `src/modules/transactions/screens/transactions/transaction_form/transaction_form_body.tsx:115`.
- No tree-wide row over every `accessibilityLiveRegion` in `src/`. The row names the five files.
- No new `accessibilityLiveRegion`, `accessibilityRole`, `accessible`, `testID` or `nativeID` on any view, and no `testID` passed from `CtaFooter` to `StatusTrack`.
- No change to `src/constants/strings.ts`.
- No Jest case that asserts the `collapsable` prop, and no new `.tsx` suite.
- No line in `.claude/rules/ui.md` and no ADR.
- No emulator pass and no TalkBack read. The read is Device QA when the module closes.

## Untested inputs
- What TalkBack speaks in each of the five areas on a device: no test, steps 1 to 5. Jest does not run Fabric's view flattening, so the row checks source text only.
- Each area keeps its size, position and text: no test and no emulator pass, steps 1 to 5.
- A live region that reaches a view in a sixth file, or through a spread other than `{...model.a11y}`: outside the row, step 6.
- The three unchanged sites: no row or test covers them. The PR diff shows them untouched.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- MA-169 (#696) merges first and brings a rail copied from `adjust_balance_sheet.tsx`. After the rebase `git grep -n -E "accessibilityLiveRegion|aria-live" -- src` must list the 11 lines of this base, seven JSX sites and four in `src/components/ui/status_track.geometry.ts`, and no other. A new site takes the prop and joins the row of step 6, recounted against the gate.
- MA-173 (#709) changes `commitment_form_body.tsx`. A conflict at `:453-466` keeps both sides.
- `collapsable={false}` makes the view a stacking context (`node_modules/react-native/ReactCommon/react/renderer/components/view/ViewShadowNode.cpp:50`), so a descendant with `zIndex` would order inside it. No child of the five areas sets one at this base, and HeroUI's `field-error` source holds neither `zIndex` nor `absolute`.
- Step 6 reads opening tags with a pattern, not a parser. A prop that holds `<` or `>`, such as an inline arrow function, cuts the tag short, and the row then reports an area that has the prop. The fix is to hoist that prop's value, never to loosen the row.
- Step 6's first tests pin the `missing` string. A reworded string breaks eight cases.

## Self-assessment
Step 6 is the one I am least sure about. Its check matches JSX opening tags by pattern over comment-stripped text. A prototype of that match, run against the eight files that hold a live region at this base, found one holding tag in each; the five files of steps 1 to 5 failed as they are, passed with the prop beside the marker, and failed with the prop on another element. The prototype does not cover a tag whose props hold `<` or `>`, which the row reports even when the prop is present. The second doubt is the row's reach: it names five files because Acceptance asks for the five, so a sixth live region added after this merge is caught by nothing.
