# MA-183 — Four message areas keep their live region on Android
base: 8bd7e140e8b68c1d14f379cec59be1070f7e32e1 · verify: none · flags: none · expected diff: ~90 lines

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
- File: `scripts/validate-structural-guards.js` (`Requirement`, `:6`; `ACCOUNT_FORM`, `:16`; `OPENING_TAG` and `keptLiveRegion`, `:99-114`; the two live-region rows of `NAMED_ROWS`, `:306-320`; the `required` loop, `:433-436`)
- Change: `keptLiveRegion(marker: string): Requirement[]` takes one argument, required and not nullable, the literal text a holder tag carries, and returns three `Requirement`s, `{ found: (source: string) => boolean, missing: string }`, every field required and none nullable, in this order. The first is `readableMarker(marker)`: a factory, `readableMarker(marker: string): Requirement`, one argument required and not nullable, whose `found` is true when the count of `marker` in `source` equals the count of opening tags that hold it, true at zero, and whose `missing` is exactly ``a tag the pattern cannot read holds `<marker>`, so hoist the value of its prop that holds `<` or `>` ``. The second is `holds(literal(marker), …)` (`:44`), found when `marker` occurs anywhere in `source`, its `missing` exactly ``no element holds `<marker>` ``. The third is found when every tag that holds `marker` also holds `collapsable={false}`, true over zero tags, and its `missing` stays exactly ``no `collapsable={false}` on the view that holds the live region``. So a removed marker, a cut tag and a missing prop each report one line of their own (C1-2). An opening tag is a match of `OPENING_TAG`, now `/<[A-Za-z](?:=>|[^<>])*>/g`, so an arrow function's `=>` no longer ends a tag; its one-line comment names what still does, a `<` or `>` in a prop value other than `=>` (C1-1). One helper returns the tags in `source` that hold a pattern, for the first and third `Requirement`s and step 7. The rows apply `keptLiveRegion('accessibilityLiveRegion=')` to the files of steps 1 to 4 and `keptLiveRegion('{...model.a11y}')` to `${UI}/status_track.tsx`, each with `needs: KEEPS_LIVE_REGION`. Every entry of the four-file `files` array is a template literal on a prefix constant: `ACCOUNTS = 'src/modules/accounts'` replaces `ACCOUNT_FORM` (C1-4). `source` is the comment-stripped text the loop already passes. The prop on another element of the same file does not satisfy the row.
- Test: `first` · `__tests__/scripts/validate_structural_guards.test.ts`. (a) The five `withoutKeptView` entries in `REQUIRED` (`:456-460`) and (b) `reports the commitment form when the prop sits on a view other than the live region` (`:598-603`) do not change. (c) The `it.each` at `:605-612` takes rows of `{ rel, search, replacement, words, absent }`, each seeded by `replaceEvery(rel, search, replacement)`; each run reports the file with its `words`, and no stderr line for that file holds its `absent`. Three rows: `field_message_rail.tsx` with `accessibilityLiveRegion="polite"` removed, words ``no element holds `accessibilityLiveRegion=` ``; `status_track.tsx` with `{...model.a11y}` removed, words ``no element holds `{...model.a11y}` ``; both with `absent` the `missing` string of (a). And `status_track.tsx` with `{...model.a11y}` replaced by `hitSlop={n > 0 ? 4 : 0} {...model.a11y}`, words ``a tag the pattern cannot read holds `{...model.a11y}` ``, `absent` ``no element holds``. (d) One case in `named files`: with `accessibilityLiveRegion="polite"` in `commitment_form_body.tsx` replaced once by `onLayout={(e) => setH(e)} accessibilityLiveRegion="polite"`, the run is clean (`expectClean`). The case `exits 0 with one stdout line on the unseeded tree` (`:533`) does not change. At `f7535d80` every row of (c) reports the old words, and (d) reports the commitment form, whose tag ends at `=>`.

### 7. `npm run lint` fails on any live region under `src/` whose view Android flattens
- File: `scripts/validate-structural-guards.js` (`TREE_ROWS`, `:323-343`; the tree loop, `:445-450`)
- Change: A fourth tree row, `name: 'T4, every .tsx under src/'`, `matches: (rel) => rel.endsWith('.tsx')`, no `banned`, two `required` entries in this order and `needs: KEEPS_LIVE_REGION`. The first is step 6's `readableMarker('accessibilityLiveRegion=')`. The second is found when every opening tag that holds `accessibilityLiveRegion=` also holds a keeper, true over zero tags; its `missing` is exactly ``an element holds `accessibilityLiveRegion=` without `collapsable={false}`, `accessible`, or a literal `testID` or `nativeID` ``. A tag cut before its marker therefore fails the first and passes the second, one line per cause. A keeper is `collapsable={false}`, a bare `accessible` or `accessible={true}`, or `testID` or `nativeID` with a non-empty quoted string value, the four props of `node_modules/react-native/ReactCommon/react/renderer/components/view/ViewShadowNode.cpp:50-72` that the ticket's Context names. `testID={expr}` is not a keeper: `status_track.tsx` held `testID={testID}` and lost its view at the `src/components/ui/cta_footer.tsx:21` mount, where `testID` is undefined. The tree loop passes `row.banned ?? []` to `reportBanned` and runs each `row.required ?? []` over the file's joined source, pushing the named-row line `${rel}: ${missing}; ${row.needs}`. T1 to T3 do not change. The three kept sites stay byte-identical and pass: `income_sheet.tsx:82-87` (`accessible`), `exchange_rate_row.tsx:164-169` (`testID="exchange-rate-error-slot"`), `transaction_form_body.tsx:115` (`collapsable={false}`). A prototype of this row over the 273 `.tsx` files at `f7535d80` found 7 holder tags, all kept. `status_track.tsx` spreads its live region, holds no `accessibilityLiveRegion=`, and stays with its named row.
- Test: `first` · `__tests__/scripts/validate_structural_guards.test.ts`, describe `tree rows and deleted paths`. (e) An `it.each` over five rows of `{ tag, words }`, each tag written as the only line of the new file `src/modules/accounts/seeded_live_region.tsx`, and each run reports that file with its `words`: `<View style={{ flex: 1 }} accessibilityLiveRegion="polite" />`, `<View testID={testID} accessibilityLiveRegion="polite" />`, `<View accessible={false} accessibilityLiveRegion="polite" />` and `<View testID="" accessibilityLiveRegion="polite" />` with the second `missing` string, and `<View style={{ minHeight: lines > 1 ? 32 : 16 }} accessibilityLiveRegion="polite" />` with the first. (f) An `it.each` over five tags in the same file, `accessibilityLiveRegion="polite"` with `collapsable={false}`, with `accessible`, with `accessible={true}`, with `testID="seeded"` and with `nativeID="seeded"`: each run is clean. The unseeded-tree case (`:533`) is the passing half over the three kept sites. (e) is red at `f7535d80`; (f) passes there and fails on a row that rejects a keeper.

## Non-goals
- The words a screen reader speaks for a label, and the file that holds them: MA-173 (#709).
- The three live regions Android keeps today stay byte-identical and join no named row: `src/modules/budget/screens/budget/components/income_sheet.tsx:82-87`, `src/modules/transactions/screens/transactions/transaction_form/components/exchange_rate_row.tsx:164-169`, `src/modules/transactions/screens/transactions/transaction_form/transaction_form_body.tsx:115`. Step 7's tree row reads them.
- Step 7's row reads the `accessibilityLiveRegion=` attribute in `.tsx` files only: no row over `aria-live` or over a spread other than `{...model.a11y}`.
- No swap of the hand-copied track in `adjust_balance_sheet.tsx:74-91` for `FieldMessageTrack`, and no edit to its comment: C1-5 of the PR #726 triage, its own ticket.
- No new `accessibilityLiveRegion`, `accessibilityRole`, `accessible`, `testID` or `nativeID` on any view, and no `testID` passed from `CtaFooter` to `StatusTrack`.
- No change to `src/constants/strings.ts`.
- No Jest case that asserts the `collapsable` prop, and no new `.tsx` suite.
- No line in `.claude/rules/ui.md` and no ADR.
- No emulator pass and no TalkBack read. The read is Device QA when the module closes.

## Untested inputs
- What TalkBack speaks in each of the five areas on a device: no test, steps 1 to 5. Jest does not run Fabric's view flattening, so the row checks source text only.
- Each area keeps its size, position and text: no test and no emulator pass, steps 1 to 5.
- A live region reached through a spread other than `{...model.a11y}`, or through `aria-live`: outside both rows, steps 6 and 7.
- The three unchanged sites: step 7's row reads them, and the unseeded-tree case is their test. The PR diff shows them untouched.
- A view kept by a prop outside the four keepers, such as a background colour, a border, a handler or `opacity` (`ViewShadowNode.cpp:50-75`): step 7 reports it, and `collapsable={false}` clears it.
- A keeper written as an expression, `testID={'x'}` or `accessible={isOn}`: step 7 reports it.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- MA-169 (#696) merges first and brings `rate_editor_sheet.tsx`, whose slot at `e204c92f`, `rate_editor_sheet.tsx:44-48`, holds `testID="rate-editor-message-slot"`, so step 7's row passes it after the rebase. A site it adds without a keeper fails `npm run lint` at the rebase and takes `collapsable={false}`, recounted against the gate.
- MA-173 (#709) changes `commitment_form_body.tsx`. A conflict at `:453-466` keeps both sides.
- `collapsable={false}` makes the view a stacking context (`node_modules/react-native/ReactCommon/react/renderer/components/view/ViewShadowNode.cpp:50`), so a descendant with `zIndex` would order inside it. No child of the five areas sets one at this base, and HeroUI's `field-error` source holds neither `zIndex` nor `absolute`.
- Steps 6 and 7 read opening tags with a pattern, not a parser. An arrow function's `=>` no longer ends a tag; a `<` or `>` in any other prop value still does. A tag cut before its marker is reported by the named rows and step 7's row alike as ``a tag the pattern cannot read``. A tag cut between its marker and its keeper is reported though kept. The fix is to hoist that prop's value, never to loosen a row.
- A named `.tsx` file that loses `collapsable={false}` gets two lines, one from its named row and one from step 7's row, and one whose holder tag is cut gets the same line twice. Each pair names one fix.
- Step 6's first tests pin the `missing` string. A reworded string breaks eight cases.

## Amendments
- 2026-10-14 · step 6 · `OPENING_TAG` lets `=>` through (C1-1); `keptLiveRegion` takes its marker as a string and returns two `Requirement`s, so a file with no holder reports ``no element holds `<marker>` `` (C1-2); the four-file array takes one path style on `ACCOUNTS` (C1-4); Test (c) asserts the new words and (d) is added; PR #726 cycle 1 triage at `f7535d80`
- 2026-10-14 · step 7 · added: a tree row over every `.tsx` under `src/` fails on a live region whose tag holds no keeper (C1-3)
- 2026-10-14 · Non-goals · the exclusion of a tree-wide row removed; the three kept sites join no named row; C1-5's track swap added
- 2026-10-14 · Untested inputs, Risks · the sixth-file, three-sites, MA-169 and tag-pattern lines rewritten for steps 6 and 7; a line for keepers outside the four, one for expression keepers and one for the double report added
- 2026-10-14 · header · expected diff ~40 to ~80: `f7535d80` adds 39 lines outside tests, steps 6 and 7 add about 40 more to `scripts/validate-structural-guards.js`
- 2026-10-14 · step 7 · plan review round 1, F1: a first `Requirement` fails when `source` holds more `accessibilityLiveRegion=` than the tags that hold it, so a tag cut before its marker is reported, not passed; Test (e) gains the `>` seed and a `words` field
- 2026-10-14 · step 7 · plan review round 1, F2: Test (e) gains `testID=""` and (f) gains `accessible={true}`
- 2026-10-14 · Risks · the tag-pattern line rewritten: step 7 reports a cut tag
- 2026-10-14 · header · expected diff ~80 to ~85: F1 adds about 5 lines to the script
- 2026-10-14 · step 6 · plan review round 2, G1: `keptLiveRegion` returns three `Requirement`s, `readableMarker(marker)` first, so a cut tag reports the cut-tag words with its marker, and ``no element holds`` fires only when the marker is absent from the source; Test (c) takes `{ rel, search, replacement, words, absent }` rows and gains the `hitSlop` seed on `status_track.tsx`
- 2026-10-14 · step 7 · plan review round 2, G1: the first `required` entry is step 6's `readableMarker('accessibilityLiveRegion=')`
- 2026-10-14 · Risks · plan review round 2, G1: the tag-pattern and double-report lines rewritten for the cut-tag words on both rows
- 2026-10-14 · header · expected diff ~85 to ~90: G1 adds about 3 lines to the script

## Self-assessment
Step 7 is the one I am least sure about. Its keeper set is four props read as text, from the ticket's Context and `ViewShadowNode.cpp:50-72`, so a view kept by any other prop is reported, and a keeper that reaches a tag by spread is not seen. A prototype of the row over the 273 `.tsx` files at `f7535d80` reported none of them; it found 7 holder tags, each holding its file's one marker and kept by one of the four. It also sorted the eleven seeds of cases (d) to (f) and the three rows of (c) as the plan says. The second doubt is the tag pattern: a `<` or `>` in a prop value other than `=>` still cuts a tag, and both rows now fail closed on it. A cut that falls between a marker and its keeper reports a kept view, and the fix there is hoisting a value that was correct.
