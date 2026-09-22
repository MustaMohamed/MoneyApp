# MA-100 — Filter sheet footer flat
base: 4ec4342386ab55d2a5070e24d6a46d46b4b7fd47 · verify: emulator · flags: none · expected diff: ~16 lines

## Steps
### 1. The footer test sees the flat prop reach both buttons
- File: `__tests__/screens/transactions/filter/filter_sheet.test.tsx` (the `Button` mock at `:42-61`, the first case at `:125-133`)
- Change: the mock takes `flat?: boolean` and renders `${variant}${flat ? ':flat' : ''}:${label}`; the first case asserts `secondary:flat:Reset` and `primary:flat:Apply (2)`, and the press case at `:138,141` reads the same text. No new suite, no new case: two existing assertions move, so the suite is red at base and green after step 2.
- Test: `first` · the file above.

### 2. Reset and Apply render flat at Radius.cta and the md height
- File: `src/modules/transactions/screens/transactions/filter/index.tsx` (`:31-36`, `:39-48`)
- Change: add the `flat` literal to both `<Button>` tags, nothing else on them; `variant="secondary"` and `variant="primary"` stay, so `resolveFlatButtonStyle` (`button.content.ts:33,41-44`) gives Apply `Radius.cta` on the accent fill and Reset `Radius.cta` with `text-foreground`; `size` stays default `md`, no `tone`. `FILTER_SHEET_ACTION_STYLE`, the two testIDs, `isDisabled`, `onPress` and the label expression are byte-identical.
- Test: `none` · step 1 asserts the prop at the mock boundary; the style rows already exist in `__tests__/components/ui/button_content.test.ts:108-121`; handlers and disabled states stay under `__tests__/screens/transactions/filter/filter_hook.test.ts:37-108`.

### 3. The transactions recipe carries the sheet and its footer state
- File: `.claude/skills/emulator-verify/features/transactions.md` (`## Reach it`, `## States`)
- Change: under Reach it, one bullet: the filter sheet opens from the tune icon beside the search field, `$MQA tap` by its accessibility label `Strings.filterSearchButtonAccessibility` (`Strings.filterAccessibilityWithActiveCount` once a filter is on), the commitments.md shape. Under States, one row: `filter sheet footer, flat | B1, B2 | open the filter sheet, expand Accounts, select two options | the Reset and Apply button nodes' bounds ÷ 2.625 read 48 ± 1 high (HeroUI md, not Size.ctaHeight 52); Apply reads Apply (2) on a single accent fill with no gradient stop, Reset a foreground label on the secondary fill; one shot of the footer`.
- Test: `none` · a skill file.

## Screens
- `emulator-verify/features/transactions.md`: filter sheet footer, flat
- A state the file lacks: `filter sheet footer, flat`, frames B1, B2; step 3 appends it.

## Non-goals
- The list hero, month row and type tabs (MA-098); account chips mirroring the sheet's account filter (MA-099).
- The commitments filter sheet footer (`src/modules/commitments/screens/commitments/filter/index.tsx:33-48`), the same two bordered buttons: not on this ticket, not touched.
- `button.tsx`, `button.content.ts`, `filter_accordion.tsx`, the three accordion components, `filter.hook.ts`: no edits.
- The `gap-2` between the buttons, the `45%`/`92%` snap points, and `SHEET_FOOTER_CLEARANCE`: as shipped.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.
- `npx jest __tests__/screens/transactions/filter/filter_sheet.test.tsx` fails at base after step 1 and passes after step 2; `test -f` the path first.

## Risks
- Frames B1 and B2 sit on the claude.ai design artifact, not on disk; if they draw a height or gap other than the flat md defaults, the ticket's Rules win and the difference is a note at the render pass, not a style override.
- `ButtonProps` discriminates on `flat: true`; a `flat={flag}` written in passing fails typecheck, which is the intended guard.

## Self-assessment
Step 3's proof column is the least certain: the footer buttons sit in an absolute gorhom footer, and whether `mqa ui` reports each HeroUI button as its own clickable node with the 48 dp bounds, or flattens it into the footer container, is only known once the shot is taken. If the nodes are missing, the lens measures the painted button on the shot against the 2.625 density, the README's fallback for a flattened container.
