# MA-032 — Compact segmented control: the unselected label clears the contrast floor

base: 73da991b6ba530a495324cb6f10ec0ce15d1495a · verify: emulator · flags: none · expected diff: ~3 lines outside tests

## Steps

### 1. The compact unselected label paints `Colors.dark.text2` instead of falling through to HeroUI's `--muted`

- File: `src/components/ui/tabs.tsx` (`SegmentedTabs`, the `Tabs.Label` `style` array at `tabs.tsx:118-121`)
- Change: add a third entry to the label's `style` array — `isCompact && !isSelected ? { color: Colors.dark.text2 } : undefined`. `Colors` is already imported (`tabs.tsx:5`); no new import, no className change, no caller change. Gate on `isCompact` alone, not on `isSolidGold`: Acceptance says every compact caller, current and future, and both compact tracks resolve to `--default` or darker. The entry sits after the `isSolidGold && isSelected` gold-label entry; the two predicates are mutually exclusive, so array order is not load-bearing, but keeping selected-then-unselected matches the icon branch above it. `style` rather than `className` because HeroUI's `.tabs__label--is-selected-false { color: var(--color-muted) }` arrives through `tabsClassNames.label({ isSelected, className })` (`node_modules/heroui-native/src/components/tabs/tabs.tsx:352`) as a plain component class that tailwind-merge cannot displace; the existing selected-gold override at `tabs.tsx:120` is the same mechanism and does win, which is what makes the selected label 5.34:1 today. The one-line comment at `tabs.tsx:111` already states that constraint — do not add a second.
- Test: `__tests__/components/ui/tabs.test.tsx`, the existing `renders compact segments with tighter spacing and a bolder selected label` case. Add `expect(getByText('Overdue')).toHaveStyle({ color: Colors.dark.text2 })` and `expect(getByText('All')).not.toHaveStyle({ color: Colors.dark.text2 })`. `Colors` is already imported at `tabs.test.tsx:5`. Written first: at base the label's flattened style is `{ flexShrink: 1 }` and the first assertion fails, so this is a gate that fails at base and passes at head. This adds to a `.tsx` render suite, which `.claude/rules/tests.md:19` says not to do; the Keep/Prune section at `:21-24` decides which existing assertions survive a prune and authorises nothing new. The reason for the exception is that the change is a JSX `style` binding with no logic-only layer short of extracting a one-line ternary into a helper, and this suite already owns the compact-density case. So the exception is capped at exactly these two assertions in exactly this case: no other render assertion is added anywhere in this ticket, in particular no non-compact guard. Do not touch the `className` assertions at `tabs.test.tsx:161-163`, which stay exactly as they are because this fix moves no class.

### 2. The 3:1 floor for `--content-secondary` on the compact track is pinned in the token suite

- File: `__tests__/semantic_colour_agreement.test.ts` (alongside `segment-foreground clears 4.5:1 on the segment fill it is read against`, `:101-108`)
- Change: none outside tests.
- Test: one case asserting `contrastRatio(value, fill) >= 3` for every declared `--content-secondary` against the matching `--default`, using the file's own `cssVarValues` reader and the `contrastRatio` import already at `:6`. Use a named `MIN_CONTROL_LABEL_RATIO = 3` constant next to `MIN_SEGMENT_RATIO`. `--default` is the worst case of the two compact tracks: `type_tabs.tsx:34` passes no background so its track is `--default` (#243044, 3.24:1), while `segment_filter.tsx:17`'s `bg-default/60` composites over the FilterRail's `bg-default/40` (`filter_rail.tsx:33`) and `--background` to #1f2a3c, a darker track at 3.52:1. This case passes at base — it is a drift guard on the token, not the gate for this diff; step 1 carries the gate.

## Screens

- Transactions tab, filter rail: default state with `All` selected; after tapping `Income` so a different segment is selected; the rail scrolled right to its last segments.
- Commitments tab, filter rail: default state with `All` selected, all unselected segment labels visible.
- Add transaction sheet (FAB): type selector with `Expense` selected and `Income` / `Transfer` / `CC Payment` unselected.
- Edit transaction sheet (transaction row → edit): the same type selector in its `isDisabled` state (`transaction_form_body.tsx:154` passes `locked`), which is the only place the new colour composites under HeroUI's disabled opacity.
- Settings → Categories: the non-compact solid-gold control (`categories/index.tsx:90`) unchanged — the regression shot for the Rules line that the non-compact density is untouched.

## Non-goals

- The account-type filter on the accounts list, MA-022 (#396) — it inherits this fix if and when it lands as a compact caller.
- The compact icon colours. Callers own `icon.color` (`transactions/index.tsx:33`, `commitments/index.tsx:37` already pass `Colors.dark.text2`); do not move them into the primitive.
- The seven non-compact render sites (`filter_accordion.tsx:138`, `commitment_form_body.tsx:225` and `:282`, `categories/index.tsx:90`, `add_edit_category_sheet.tsx:216`, `currency_selector.tsx:23`, `budget/index.tsx:118`).
- The selected label, the gold fill, the compact radii, and the compact heights — `segment_filter.tsx` deliberately takes the trigger's `h-7` while `type_tabs.tsx:34` pins `h-9`; adding a height to the primitive would move the rail.
- `--muted` itself and every other `text-muted` consumer.
- Any edit to `segment_filter.tsx`, `segment_filter.hook.ts`, `filter_rail.tsx` or `type_tabs.tsx`.
- Deleting or rewriting the `className` assertions in `tabs.test.tsx`; the render-suite prune is its own decision, not this ticket's.

## Verification

- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md` (`format:check`, `lint`, `typecheck`, `test -- --ci`, `npx --yes expo-doctor@1.20.1`, `npx expo prebuild --no-install --platform android`, `test -d android`).
- Gate demonstration for step 1: run `npx jest __tests__/components/ui/tabs.test.tsx` with the `tabs.tsx` edit reverted and confirm the new assertion fails, then with it applied and confirm it passes.

## Risks

- Uniwind could resolve the label's className-derived colour over the inline `style` rather than under it, in which case step 1 changes nothing on the device. The selected-gold override at `tabs.tsx:120` producing a midnight-blue selected label today is the evidence it does not; the render pass is where this is settled. If it were to fail, the fallback is `text-content-secondary` on the compact unselected `className`, which moves the exact-equality assertion at `tabs.test.tsx:162`.
- `adjustsFontSizeToFit` with `minimumFontScale={0.85}` (`tabs.tsx:113-114`) shrinks compact labels at render time. A colour change does not interact with it, but a smaller rendered size raises the contrast the eye needs; the emulator shots are the check, not the ratio arithmetic.
- HeroUI's disabled opacity (`disabled:element-disabled` on the trigger) composites over the new colour in the edit sheet. If that reads as illegible it is a separate defect against the disabled state, not a reason to change this colour.
- A sibling ticket landing another compact caller before merge invalidates nothing in the code but does invalidate the render evidence for the rails.

## Self-assessment

Step 1 is the one I am least sure about, and precisely on the point I cannot test from source: whether Uniwind gives the inline `style` colour precedence over the `.tabs__label--is-selected-false` rule that HeroUI's own CSS puts on the same element. I read the mechanism as far as it goes — `tabsClassNames.label({ isSelected, className })` merges the component class with the caller's, tailwind-merge has no way to know that an opaque class sets `color`, and heroui-native's stylesheet is imported unlayered — but none of that predicts Uniwind's resolution order in React Native. What convinced me is the working code: the selected label renders midnight blue on the gold fill, and the only thing producing that is the `style` entry at `tabs.tsx:120` beating `.tabs__label--is-selected`. The unselected case is the same element and the same two sources, so it should behave the same way. It should, not it will — which is why the fallback is written into Risks and why the two rails are the first thing the render pass shoots.
