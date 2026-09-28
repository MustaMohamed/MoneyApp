# MA-126 — Search field, filter badge, status rail, month pill and empty-state button hold at a 2.0 font scale
base: 85e84a22 · verify: emulator · flags: none · expected diff: ~315 lines

Every step reads the scale from `useWindowDimensions().fontScale` in the component and passes it to a pure resolver, as `src/components/ui/empty_state.tsx:148` and `search_tally.tsx:90` do. Every label a step touches takes `numberOfLines={1}`. Where its resolver returns a size, from `scaledFontSize` (`src/components/ui/text_scale.geometry.ts`) paired with `lineHeightFor` in one style object, the label also takes `allowFontScaling={false}`; where the resolver returns `undefined`, the label keeps today's props and the OS scales it.

## Steps

### 1. The search field and the filter badge take their heights from the font scale
- File: `src/components/ui/search_filter_row.geometry.ts` (new), `src/components/ui/search_filter_row.tsx`, `src/modules/transactions/screens/transactions/components/search_row.tsx`, `src/modules/commitments/screens/commitments/components/search_row.tsx`
- Change: new `SEARCH_INPUT_MAX_FONT_SCALE = DISPLAY_HEADLINE_MAX_FONT_SCALE` (1.3, `src/components/ui/display_headline.geometry.ts:13`) and `resolveSearchFilterRowGeometry(fontScale: number): { input: { height; minHeight; paddingTop: 0; paddingBottom: 0 }; inputText: { fontSize; lineHeight } | undefined; filterButton: { height; width; borderRadius }; badge: { top; right; minWidth; height; borderRadius }; badgeText: { fontSize; lineHeight } }`. Invariants: `inputText` is `undefined` at `fontScale <= 1`, so the input keeps the size it draws today, and above it `fontSize = scaledFontSize(Type.body, fontScale, SEARCH_INPUT_MAX_FONT_SCALE)`; `input.height = max(ms(36), lineHeightFor(scaledFontSize(Type.body, fontScale, SEARCH_INPUT_MAX_FONT_SCALE)) + 2 * Spacing.xxs)`; `filterButton.height === input.height`, `filterButton.width` stays `ms(36)`; `badge.height = max(ms(16), lineHeightFor(scaledFontSize(Type.chip, fontScale)))`, `badgeText.lineHeight === badge.height` (the existing `oxlint-disable` reason moves with it); at `fontScale` 1 every height equals today's constant. `SearchField.Input` keeps its `placeholder` prop and takes `allowFontScaling={false}` only with `inputText`. `SEARCH_INPUT_COMPACT_STYLE`, `FILTER_BUTTON_COMPACT_STYLE` and `FILTER_BADGE_STYLE` are deleted, and so are their re-exports in both `search_row.tsx` files (only tests read them). No element is added.
- Test: `first` · `__tests__/components/ui/search_filter_row.geometry.test.ts` (new): at 1 and at 0.85 `inputText` is undefined and the heights are `ms(36)` and `ms(16)`; at 2 `inputText.fontSize` is `scaledFontSize(Type.body, 1.3)`, `input.height >= inputText.lineHeight`, `badge.height >= lineHeightFor(scaledFontSize(Type.chip, 2))`, `filterButton.height === input.height`. `after` · the existing assertions on the three deleted constants in `__tests__/components/ui/search_filter_row.test.tsx`, `__tests__/screens/transactions/search_row.test.tsx` and `__tests__/screens/commitments/search_row.test.tsx` rebind to the resolver at the jest window's `fontScale`; no case is added.

### 2. Rail and tab labels end in an ellipsis inside their segment, and the compact segment grows with the text
- File: `src/components/ui/tabs.geometry.ts` (new), `src/components/ui/tabs.tsx` (`COMPACT_LABEL_STYLE` `:16`, trigger class `:119`, `Tabs.Label` `:133-146`)
- Change: new `resolveSegmentedTabsGeometry(fontScale: number): { compact: { label: { fontSize; lineHeight }; triggerHeight: number; listHeight: number }; defaultLabel: { fontSize; lineHeight } | undefined }` and exported `TABS_LIST_PADDING` (moved from `tabs.tsx:10`). Invariants: `compact.label.fontSize = scaledFontSize(Type.micro, fontScale)`; `compact.triggerHeight = max(28, compact.label.lineHeight + 2 * Spacing.xxxs)`; `compact.listHeight = compact.triggerHeight + 2 * TABS_LIST_PADDING`; `defaultLabel` is `undefined` at `fontScale <= 1`, so default density keeps HeroUI's own size there, and `scaledFontSize(Type.subhead, fontScale)` above it. In `tabs.tsx` the compact trigger loses `h-7` and takes `height: compact.triggerHeight` in `style`; a `Tabs.Label` takes `allowFontScaling={false}` only when the resolver returns its size: the compact label at every scale, the default label above 1. `flexShrink: 1` keeps today's condition (`isCompact || segmentWidth != null`, `tabs.tsx:140`) and is also set whenever the resolver returns a size. `segmentWidth`, `adjustsFontSizeToFit` and `minimumFontScale` stay.
- Test: `first` · `__tests__/components/ui/tabs.geometry.test.ts` (new): at 1 `triggerHeight` is 28, the compact label is `Type.micro` with its `lineHeightFor`, `defaultLabel` is undefined; at 2 `triggerHeight >= label.lineHeight` and `defaultLabel.lineHeight === lineHeightFor(defaultLabel.fontSize)`. `after` · the compact label style assertions at `__tests__/components/ui/tabs.test.tsx:149-158` rebind to the resolver at the jest window's `fontScale`.

### 3. The sheet's type tab row and its skeleton shape share one height
- File: `src/modules/transactions/screens/transactions/transaction_form/components/transaction_form.geometry.ts`, `.../components/type_tabs.tsx` (`listClassName` `:52`), `.../components/transaction_form_loading.tsx` (`:38-41`), `src/components/ui/tabs.tsx` (`SegmentedTabsProps`)
- Change: new `resolveTypeTabsGeometry(fontScale: number): { listHeight: number; skeletonHeight: number }`. Invariants: `listHeight = max(36, resolveSegmentedTabsGeometry(fontScale).compact.listHeight)`; `skeletonHeight = max(TRANSACTION_FORM_SKELETON_GEOMETRY.tabBar, listHeight)`; wherever the text line box decides, the two are equal. `TRANSACTION_FORM_SKELETON_GEOMETRY` keeps every key. `SegmentedTabs` gains an optional `listStyle?: { height: number }` prop merged into `Tabs.List`'s `style`; `type_tabs.tsx` drops `h-9` from `listClassName` and passes `listStyle`, the only caller that does. `transaction_form_loading.tsx` reads `skeletonHeight`.
- Test: `first` · `__tests__/screens/transactions/transaction_form/transaction_form.geometry.test.ts`, new cases: at 1 `listHeight` is 36 and `skeletonHeight` is `TRANSACTION_FORM_SKELETON_GEOMETRY.tabBar`; at 2 `skeletonHeight === listHeight` and `listHeight >= compact.triggerHeight + 2 * TABS_LIST_PADDING`.

### 4. The month pill's height follows its label
- File: `src/components/ui/month_filter.geometry.ts` (new), `src/components/ui/month_filter.tsx` (`:54-61`)
- Change: new `resolveMonthPillGeometry(fontScale: number): { label: { fontSize; lineHeight }; height: number }` with `label.fontSize = scaledFontSize(Type.micro, fontScale)` and `height = max(32, label.lineHeight + 2 * Spacing.xxxs)`. The pill loses `h-8` and takes `height` in `style`; the label takes `flexShrink: 1`. The step buttons and the picker sheet stay.
- Test: `first` · `__tests__/components/ui/month_filter.geometry.test.ts` (new): at 1 `height` is 32 and the label is `Type.micro`; at 2 `height >= label.lineHeight`. `after` · the label style assertion at `__tests__/components/ui/month_filter.test.tsx:30-33` rebinds to the resolver at the jest window's `fontScale`.

### 5. Every label the shared button draws ends in a tail ellipsis
- File: `src/components/ui/button.geometry.ts` (new), `src/components/ui/button.tsx` (the three `HButton.Label` at `:76`, `:98`, `:124`), `src/components/ui/button.content.ts` (`resolveFlatButtonStyle`, `:36`)
- Change: new `resolveButtonLabelStyle(size: ButtonSize, fontScale: number): { fontSize; lineHeight } | undefined`, `undefined` at `fontScale <= 1`, above it `scaledFontSize` of `Type.body` for `sm`, `Type.subhead` for `md`, `Type.title` for `lg`; and `resolveCompactCtaHeight(fontScale: number, size: ButtonSize): number = max(Size.compactCtaTrack, label line height)`. All three `HButton.Label` take `numberOfLines={1}` and `flexShrink: 1` at every scale; `allowFontScaling={false}` and the resolved pair only when the resolver returns one. `resolveFlatButtonStyle` gains optional `fontScale?: number` and `size?: ButtonSize`, read only by the `tone === 'accent'` arm for its `height`; absent, it returns today's object. HeroUI's `sm`, `md` and `lg` root heights stay.
- Test: `first` · `__tests__/components/ui/button.geometry.test.ts` (new): `undefined` at 1 for each size; at 2 the `md` pair is `scaledFontSize(Type.subhead, 2)` with its `lineHeightFor`; `resolveCompactCtaHeight(1, 'md')` is `Size.compactCtaTrack` and at 2 is at least the label's line height. `__tests__/components/ui/button_content.test.ts`, new case: the accent arm with `fontScale: 2` returns the `resolveCompactCtaHeight` value; the existing rows pass unchanged.

### 6. The feature files carry the large-font states
- File: `.claude/skills/emulator-verify/features/transactions.md`, `commitments.md`, `accounts_list.md`, `budget.md`, `dashboard.md`, `transaction_form.md`
- Change: append the rows named under Screens to each States table. Every row's Force is the `Font scale` force (README) at 1.0 and 2.0; every Proof but one has two parts. From `mqa bounds`, heights and containment: the text node's box lies inside its control's box, and at 1.0 the control reads today's height (`ms(36)` field, 38 on `Pixel_2_API_34`; `ms(16)` badge, 17 on `Pixel_2_API_34`; 28 segment, 32 pill, 48 button, 36 tab row). From a crop of the control at 2.0, which is the proof of the text itself, since `mqa bounds` reads the full text from the tree whatever is drawn: the label or placeholder is whole or ends in a whole `…`, and no glyph is cut at the top, the bottom or the control's edge. Rail rows scroll the segment fully into the rail before reading. Rows marked empty run on an empty database, the rest on a seeded one. The search field rows take three crops at 2.0: the placeholder whole, then the typed word `rent` whole, then a typed query longer than the field, whose glyphs are cut at neither the top nor the bottom. The `loading, large font` row's Proof is a shot pair at 2.0, the loading sheet and the loaded sheet, plus the height a temporary `onLayout` on the skeleton's tab shape logs (`transaction_form.md` § Gotchas), read with `mqa logs` and equal to `resolveTypeTabsGeometry(2).skeletonHeight` ± 1; the loaded row's height comes from `mqa bounds`.
- Test: `none` · markdown recipe files, no test layer.

## Screens
All states below are missing from their files; step 6 adds them. Frame: `no frame, MA-126` on each.
- `emulator-verify/features/transactions.md`: search field, large font; filter badge, large font; status rail, large font; month pill, large font; empty-state button, large font
- `emulator-verify/features/commitments.md`: search field, large font; filter badge, large font; status rail, large font; month pill, large font; empty-state button, large font
- `emulator-verify/features/accounts_list.md`: type rail, large font; empty-state button, large font (on `zero active, archived present`)
- `emulator-verify/features/budget.md`: lens tabs, large font; month pill, large font; copy sheet month pill, large font; empty-state button, large font
- `emulator-verify/features/dashboard.md`: empty-state button, large font
- `emulator-verify/features/transaction_form.md`: type tabs, large font; loading, large font (the `loading` source force)

## Non-goals
- Tab bar labels, the add button, bottom clearance, Goals text (MA-125).
- Rows, cards and other skeleton heights on the tab screens (MA-127); no other key of `TRANSACTION_FORM_SKELETON_GEOMETRY` changes.
- `LinkButton`, buttons that bypass `src/components/ui/button.tsx`, and any walk of buttons other than the empty-state button (MA-130).
- The month row above iconed type tabs (MA-109); the transactions tally, date header and hero (MA-121).
- `Size.filterSegmentCompactWidth` and `segment_filter.tsx`: segment width does not grow.
- `src/components/ui/empty_state.tsx`, `filter_rail.tsx`, `budget/index.tsx`, `accounts/list/index.tsx`: they mount the controls and do not change.
- No assertion on the five other default-density `SegmentedTabs` mounts.
- No string in `src/constants/strings.ts` changes; the placeholders keep their copy.
- No new `.tsx` test file.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- The ticket's Context is counted at 10b1540f. At 85e84a22 `transaction_form_geometry.ts` is `transaction_form.geometry.ts`, and the `h-7` and `h-8` assertions it cites in `tabs.test.tsx` and `month_filter.test.tsx` are gone; those suites assert label styles instead.
- The jest window's `fontScale` is 2 (`node_modules/@react-native/jest-preset/jest/mocks/NativeModules.js:41`), so render suites that assert `Type.micro` on a touched label fail until rebound to the resolver; screen suites beyond the three named in step 1 may assert the same styles.
- At the 1.3 cap `Search commitments…` is whole by arithmetic only (about 200 dp of text in about 250 dp of field at 411 dp wide); a device read that shows it cut is a discrepancy against the ticket's Rule.
- `Pai` on the status rail may be the rail's edge and not a clip; the rail rows read a segment scrolled fully in.
- `adjustsFontSizeToFit` beside `allowFontScaling={false}` is unproven on Android; if the ellipsis leaves the box, `adjustsFontSizeToFit` goes on compact labels above scale 1.
- Amended after review: step 1 drops the placeholder overlay for a capped input size and guards the input at `fontScale <= 1`; steps 2 and 5 set `allowFontScaling={false}` only with a resolved size; step 5's line numbers corrected; step 6's search and loading proofs restated. Round 2: step 6's text proofs are crops at 2.0 and its field and badge heights are `ms()` values; step 2 keeps today's `flexShrink` condition.
- MA-093 (#549), MA-123 (#598), MA-127 (#605) touch `button.tsx`, `empty_state.tsx`, `type_tabs.tsx` and the skeleton object; a merge of any one before this PR is a rebase.

## Self-assessment
Step 1 is the one I am least sure about. The ticket caps the search input's text at a 1.3 scale, and whether `Search commitments…` is whole at that size rests on arithmetic, not on a device read; on a 360 dp device the margin is under 10 dp. If the device shows it cut, the plan has no second mechanism, since the placeholder of a `TextInput` cannot end in an ellipsis.
