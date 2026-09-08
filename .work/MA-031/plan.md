# MA-031 — List: close the canvas gaps in the list, its empty and error states
base: 13f5c7fc · verify: emulator · flags: none · expected diff: ~45 lines

## Steps
### 1. The archived-only block sits 32 below the header and leaves 8 beneath itself
- File: `src/components/ui/state_screen.geometry.ts` (`StateScreenGeometry:19`, `STATE_SCREEN_LAYOUT:27`, `rootInline:68-73`)
- Change: replace the one shared `inlinePaddingVertical` slot with two, `inlinePaddingTop: Spacing.xxl` and `inlinePaddingBottom: Spacing.xs`, in the interface and the literal; `rootInline` reads `paddingTop` from the first and `paddingBottom` from the second. Both stay top-level shared slots, not per-kind. `root`, `iconCircle`, `headline`, `body` do not change. Only `EmptyState` `placement: 'inline'` (the `accountsArchivedOnly` variant) renders `rootInline`, so no other screen moves.
- Test: `__tests__/components/ui/state_screen_geometry.test.ts:103-108` becomes two assertions, `rootInline.paddingTop` is `STATE_SCREEN_LAYOUT.inlinePaddingTop`, `Spacing.xxl`, 37 (jest scale 1.15), and `rootInline.paddingBottom` is `STATE_SCREEN_LAYOUT.inlinePaddingBottom`, `Spacing.xs`, 9; `:145-151` asserts the two new slot names are absent from both kind configs in place of `inlinePaddingVertical`. Written first; fails at base on the 37 and 9.

### 2. The error action spans the full width inside the screen's side padding
- File: `src/components/ui/state_screen.geometry.ts` (`action:94-97`)
- Change: the error branch drops `maxWidth: config.bodyMaxWidth` and keeps `{ marginTop: config.actionGap, width: '100%' }`. The empty branch, `body.maxWidth` and `error.bodyMaxWidth` (still used by `body`) do not change. All three `ErrorState` callers widen: `startup_error.tsx:15`, `route_error_fallback.tsx:9`, the accounts list; none has a frame, the ticket accepts it.
- Test: `__tests__/components/ui/state_screen_geometry.test.ts:133-136` asserts `errorLayout.action.width` is `'100%'` and `errorLayout.action.maxWidth` is `undefined`; `:138-141` (empty carries no width) stays as it is. Fails at base on the `maxWidth`.

### 3. The error state's type and body ink match the empty state's
- File: `src/components/ui/error_state.tsx` (`:54`, `:57`)
- Change: headline `Text` takes `variant="h3"` (Sora 600 18) in place of `h2`; body `Text` takes `variant="hint"` (Inter 12) in place of `variant="body" muted`, with `className="text-content-secondary"` so the merged class wins over the variant's `text-muted` (`text.tsx:39` runs `cn`, which is HeroUI's tailwind-merge wrapper, `node_modules/heroui-native/lib/module/helpers/external/utils/cn.js`). `style={LAYOUT.headline}` and `style={LAYOUT.body}` stay. No `ms()` enters the file; `scripts/validate-state-screen-geometry.js` bans it and keeps the comment at `:47` on its own line.
- Test: none; the repo forbids new render tests (`tests.md`), and `npm run lint` still runs the geometry-binding script over this file.

### 4. The row caption renders at 11 over 14
- File: `src/modules/accounts/screens/accounts/list/accounts_list.geometry.ts`; `src/modules/accounts/screens/accounts/list/components/account_list_row.tsx:64-75`
- Change: export `ACCOUNTS_LIST_ROW_CAPTION_STYLE: Readonly<TextStyle>`, frozen, `{ fontSize: Type.micro, lineHeight: lineHeightFor(Type.micro), marginTop: Spacing.xxxs }` (the shape `ready.geometry.ts:150` uses); the caption `Typography` at `:67-70` takes `style={ACCOUNTS_LIST_ROW_CAPTION_STYLE}` and drops the inline object. `Type` and `lineHeightFor` imports leave the row file if nothing else there uses them (the name and balance at `:56` and `:83-84` still do; keep them). `ACCOUNTS_LIST_ROW_STYLE` does not change.
- Test: `__tests__/screens/accounts/accounts_list.geometry.test.ts` adds a describe: `fontSize` is `Type.micro`, `lineHeight` is `lineHeightFor(Type.micro)`, `marginTop` is `Spacing.xxxs`, keys are exactly `fontSize`, `lineHeight`, `marginTop`, and the object is frozen. Written first; fails at base on the missing export.

### 5. The list card sits 16 from both screen edges on this screen only
- File: `src/modules/accounts/screens/accounts/list/accounts_list.geometry.ts`; `src/components/ui/list_card.tsx` (`ListCardProps:6-8`, `:13-16`); `src/modules/accounts/screens/accounts/list/index.tsx:78`
- Change: export `ACCOUNTS_LIST_CARD_STYLE: Readonly<ViewStyle>`, frozen, `{ marginHorizontal: Spacing.md }`. `ListCard` gains `style?: StyleProp<ViewStyle>` and passes `style={[{ borderWidth, borderRadius, boxShadow }, style]}` with the same three values it sets today; absent, the two onboarding callers (`more_accounts/index.tsx:149`, `ready_summary_rows.tsx:26`) render byte-identical. The accounts list passes `<ListCard style={ACCOUNTS_LIST_CARD_STYLE}>`. `SectionHeader`'s `mx-4` stays, so the header and the card share one edge.
- Test: `__tests__/screens/accounts/accounts_list.geometry.test.ts` adds: `marginHorizontal` is `Spacing.md`, keys are exactly `['marginHorizontal']`, frozen. Fails at base on the missing export.

### 6. The selected segment label takes the foreground ink on the dashboard and the budget lens tabs
- File: `global.css` (`@variant dark:34`, `@variant light:79`)
- Change: add `--segment-foreground: #f0ebe3;` directly under `--segment` in both blocks. HeroUI's `.tabs__label--is-selected` reads `var(--color-segment-foreground)` (`node_modules/heroui-native/src/styles/components/tabs.css:70-72`) and, with the app defining only `--segment`, falls to its own light default `--eclipse`. The bare `Tabs` on the dashboard (`dashboard/index.tsx:139-147`) and the default-variant `SegmentedTabs` on the budget screen (`budget/index.tsx:118`) pick it up with no component edit; the eight `solid-gold` callers set `color: Colors.shared.midnightBlue` through `style` (`tabs.tsx:120`), which beats the class, so they do not change. No `.tsx` changes in this step.
- Test: `__tests__/semantic_colour_agreement.test.ts` adds a case beside the `text2` one: `cssVarValues(css, 'segment-foreground')` has length 2 and every value is `Colors.dark.text1.toLowerCase()`. Fails at base with length 0.

## Screens
- `/accounts`, populated (B1): the card inset 16 from both edges with its corners visible, aligned under the section header; a row's caption at 11 the same size as the currency code beneath the balance.
- `/accounts`, archived-only (B2, seeded database, no active accounts): the empty block 32 under the `StackHeader`, 8 of padding beneath the CTA.
- `/accounts`, error (F1, one-line source force on the load path, reverted before commit): headline 18, body 12 in `#6B7F99`, the Try again button as wide as the content column, same width as B3's CTA.
- Dashboard (A1), Accounts segment selected: the selected label in `#F0EBE3` on the `#1A2535` segment; Overview selected as the counter-check.
- Budget, any lens tab selected: the same label ink; every `solid-gold` control (transaction type tabs, currency selector) still midnight-blue on gold.

## Non-goals
- The empty-state CTA height stays 48 (ruling 2026-09-08); no `Size` or `Button` change.
- The canvas amendments (MA-014), the row's `49.00` rate reading (MA-024), the tile palette (MA-014), the filter rail (MA-022), the archived card (MA-017).
- No copy change, no `Strings` edit.
- Do not add width to the empty kind's `action` slot in the geometry: `EmptyState` adds its own `width: '100%'` on `ctaWrapper` and shares `LAYOUT.action` with the text-link `clearWrapper`, which must stay hug-width.
- Do not widen or unify the two `Text` variants, add a `segment-foreground` class to `SegmentedTabs`, or touch the solid-gold override.
- Do not put the gutter inside `ListCard`'s defaults; the two onboarding callers keep their own containers.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.
- `test -f` each of the three test paths named above before citing them in the PR.

## Risks
- `tailwind-merge` must classify `text-content-secondary` and `text-muted` as one colour group for step 3; if the body still renders `#4A5568` on device, set the colour through `style` as `EmptyState` does (`empty_state.tsx:195-198`, `Colors.dark.text2`) and leave the class off.
- `--segment-foreground` is declared inside `@layer theme` like `--segment`; if the emulator still shows `#18181B`, the variable is being resolved from HeroUI's `variables.css` ahead of the app's block and the override needs the same block `--segment` lives in, which is where the step puts it.
- `__tests__/scripts/validate_state_screen_geometry.test.ts` runs the guard as a subprocess over the real `error_state.tsx`; any comment naming `ms(` added on a JSX line would red it.
- The `Verify emulator` walk needs a seeded database for B2 and a reverted one-line force for F1; the render evidence is invalid if the force leaks into the commit.

## Self-assessment
Step 3's colour override is the one I am least sure of. The class route rests on HeroUI's `cn` running tailwind-merge with `text-muted` and `text-content-secondary` in the same conflict group, which I read from the wrapper's source but did not execute; the geometry-binding script rules out `ms()` in the file but not a `Colors` reference, so the fallback in Risks is cheap and matches what `EmptyState` already does. Everything else is a token swap or a test-pinned geometry change whose failing-at-base assertion is named.
