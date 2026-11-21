# MA-289 — Shared budget pieces: category ring, trash-icon confirm, chip row
base: f6c0e0a8180b8b3f963caf7c5e8bfbc5859adc20 · verify: emulator · flags: none · expected diff: ~170 lines

## Steps

### 1. The ring is a shared piece at `src/components/ui/budget_ring.tsx`, unchanged
- File: `git mv src/modules/budget/screens/budget/components/budget_ring.tsx src/components/ui/budget_ring.tsx` (`BudgetRing`, `BudgetRingProps`, body byte-identical). The import line becomes `@/components/ui/budget_ring` in `src/modules/budget/screens/budget/components/category_budget_row.tsx:9`, `named_budget_row.tsx:8`, `spending_plan_allocation_chip.tsx:8`, `fifty_thirty_twenty/rule_contributor_row.tsx:7`, `fifty_thirty_twenty/rule_bucket_row.tsx:18`, and `src/modules/budget/screens/budget/spending_plan_detail/components/spending_plan_detail_category_row.tsx:12`.
- Change: a pure move, so git records a rename. No copy stays under `src/modules/budget/`.
- Test: `none` · the move changes no behaviour. `__tests__/screens/budget/fifty_thirty_twenty_ledger.test.tsx:24` changes its `jest.mock` path to `@/components/ui/budget_ring`. Jest throws on a mock of a missing module, so that suite fails if the path is stale.

### 2. `ConfirmDialog` takes an opt-in trash icon
- File: `src/components/ui/confirm_dialog.tsx` (`ConfirmDialogProps`, `ConfirmDialog`)
- Change: new prop `trashIcon?: boolean`, optional, never `null`, default `false`. No other prop changes and the argument order stays the same. When it is `true`, a circle sits above the title: a `View` of `TRASH_CIRCLE = ms(56)` square (`ms` imported from `@/utils/responsive`, not `@/constants/theme`, where it does not exist and every route fails at load), `borderRadius` half that, `alignSelf: 'center'`, `marginBottom: TRASH_CIRCLE_GAP = ms(14)`, `className="bg-danger/12"` (the `load_error_alert.tsx:92` tint). The circle holds `trash-can-outline` at `TRASH_GLYPH = ms(24)` through a module-level `withUniwind(MaterialCommunityIcons)` with `className="text-danger"`, which is the `error_state.tsx:15,62` pattern. These are frame B2 `.dlg .ci2`, `.dlg.ctr` (`MixB2Dialog.dc.html:779-780`). The same flag adds `text-center` to `Dialog.Title`, `Dialog.Description` and the `errorMessage` `Typography`. The error line keeps no glyph of its own: the ticket's Acceptance overrides frame S13's `i-alert-circle`. With the flag absent, the render is byte-identical to today. Busy and failed keep the paths at `:42-44`, `:50` and `:64-71` untouched.
- Test: `none` · render-only. No existing suite renders `ConfirmDialog` (`transactions.screen.test.tsx:146` mocks `TxDeleteDialog`), and `.claude/rules/tests.md` bars a new `.tsx` file. The Screens rows below check it.

### 3. Transactions delete and commitments stop show the icon
- File: `src/modules/transactions/screens/transactions/components/tx_delete_dialog.tsx` (`TxDeleteDialog`), `src/modules/commitments/screens/commitments/components/stop_confirm_dialog.tsx` (`StopConfirmDialog`)
- Change: each passes `trashIcon` to `ConfirmDialog`. `skip_confirm_dialog.tsx`, both accounts dialogs and `categories/.../delete_confirmation_dialog.tsx` stay as built.
- Test: `none` · the reason in step 2 applies. The Screens rows for `transactions.md`, `transaction_detail.md`, `commitment_detail.md` and `add_commitment.md` check it.

### 4. One chip model serves any list, with an All-first builder
- File: new `src/components/ui/chip_row.helpers.ts`; `src/components/ui/account_chips.helpers.ts` (`buildAccountChips`, remove `AccountChipModel`, `AccountChipTile`); `src/modules/accounts/store/use_account_chip_filter.hook.ts:5,19`; `src/components/ui/account_chips.tsx:25,72,135-158`
- Change: `chip_row.helpers.ts` exports:
  - `type ChipLead = { kind: 'tile'; color: string | null; type: AccountType } | { kind: 'dot'; color: string }`. A tile's `color` can be `null` (an account with no colour) and a dot's never is.
  - `interface ChipRowItem { id: string; label: string; accessibilityLabel: string; lead: ChipLead | undefined }`. `lead` is required but can be `undefined`, which draws a text-only chip.
  - `interface ChipRowModel { id: string | undefined; label: string; accessibilityLabel: string; lead: ChipLead | undefined; selected: boolean }`. `id: undefined` is the All chip.
  - `buildChipRow(allLabel: string, items: readonly ChipRowItem[], selectedId: string | undefined): ChipRowModel[]`. It returns All first (`id` and `lead` `undefined`, its label both texts), then every item in input order with `selected: item.id === selectedId`. All is `selected` exactly when no item matched, so an unknown `selectedId` lights All.
  
  `buildAccountChips` keeps its signature and selection rule (All lit only at zero applied accounts, none lit at two or more, ADR 2026-09-27 Decision 2026-10-23 C). It now returns `ChipRowModel[]`, with `accountId` renamed to `id` and `tile` to `lead: { kind: 'tile', color, type }`. `AccountChipFilter.accountChips` becomes `ChipRowModel[]`. `account_chips.tsx` reads `chip.id` and draws the tile when `lead?.kind === 'tile'`. `toggleAccountFilter`, `pruneAccountFilter` and `countFunnelFilters` are unchanged, so `transactions.hook.ts` and `commitments.hook.ts` stay untouched.
- Test: `first` · new `__tests__/components/ui/chip_row.helpers.test.ts`, covering four cases:
  - `selectedId` `undefined` lights All only.
  - A matching id lights that item and not All.
  - An unknown id lights All.
  - All comes first and the items keep their input order with their `lead` passed through.
  
  To follow the rename, `__tests__/components/ui/account_chips_helpers.test.ts`, `__tests__/use_account_chip_filter.hook.test.ts:4,163,188`, `__tests__/screens/commitments.screen.test.tsx:5,97-99,299,375-383` and `__tests__/screens/commitments.hook.test.ts:1671,1765` read `id`/`lead` and `ChipRowModel`.

### 5. `ChipRow` draws tile, dot and text chips at one height
- File: `git mv src/components/ui/account_chips.tsx src/components/ui/chip_row.tsx` (export `ChipRow`); `git mv src/components/ui/account_chips.geometry.ts src/components/ui/chip_row.geometry.ts`; `src/modules/transactions/screens/transactions/index.tsx:6,128`; `src/modules/commitments/screens/commitments/index.tsx:6,122`; `src/modules/transactions/screens/transactions/components/search_row.tsx:3`; `src/modules/commitments/screens/commitments/components/search_row.tsx:3`; `.claude/skills/emulator-verify/features/commitments.md:3`
- Change:
  - Props are `{ chips: readonly ChipRowModel[]; onToggle: (id: string | undefined) => void; testID: string }`, all required, with `onToggle(undefined)` for All. The frame map, `revealSelected`, `CHIP_HIT_SLOP`, the gap, the paddings and `overScrollMode` key on `id` and apply to every chip whatever its lead.
  - A `dot` lead draws a `View` of `CHIP_DOT = ms(8)` square with `borderRadius` half that and `backgroundColor: lead.color`, whether the chip is lit or not (frame A1 Watch chip on `.spill .d`).
  - A dot chip's style is `[CHIP_STYLE, { paddingVertical: SELECTABLE_PILL_PADDING_BLOCK, paddingHorizontal: DOT_CHIP_PADDING_INLINE }]`. `DOT_CHIP_PADDING_INLINE = 12` is the bare pill's `px-3` in unscaled CSS px, frame `.spill` `padding: 4px 12px`. The style beats the adornment `py-1.5 px-2.5`, so a dot chip is as tall as All accounts.
  - Text-only chips keep `CHIP_STYLE`, and tile chips keep `tileChipStyle` unchanged.
  - `CHIP_DOT` and `DOT_CHIP_PADDING_INLINE` go in `chip_row.geometry.ts`.
  - Both screens mount `<ChipRow>` with the same props and testIDs, and both search rows import `CHIP_ROW_ROOM_BELOW` from `@/components/ui/chip_row.geometry`.
  - `commitments.md:3` names `src/components/ui/chip_row.tsx` in the same commit as the rename: `checkPathRefs` (`scripts/validate-agent-assets.js:117-129`) fails `npm run lint` on the stale `account_chips.tsx` path.
- Test: `first` · `git mv __tests__/components/ui/account_chips.geometry.test.ts __tests__/components/ui/chip_row.geometry.test.ts`, import path updated, plus one case: `CHIP_DOT` is less than `scaledTextStyle(SELECTABLE_PILL_LABEL_FONT_SIZE, 1).lineHeight`, so the label line, not the dot, sets a dot chip's height at every scale ≥ 1. The import path follows the rename in `__tests__/screens/transactions.screen.test.tsx:112-113` (mock path and `ChipRow`), `__tests__/screens/commitments.screen.test.tsx:93-97,300`, `__tests__/screens/transactions/search_row.test.tsx:4`, `__tests__/screens/commitments/search_row.test.tsx:4`, `__tests__/components/ui/search_filter_row.geometry.test.ts:1` and `__tests__/components/ui/search_filter_row.test.tsx:4`.

### 6. Docs and feature files name the moved pieces and the icon
- File: `.claude/skills/emulator-verify/features/commitments.md:133`; `.claude/skills/emulator-verify/features/transactions.md:80,88-91`; `.claude/skills/emulator-verify/features/transaction_detail.md:41`; `.claude/skills/emulator-verify/features/commitment_detail.md:77-80`; `.claude/skills/emulator-verify/features/add_commitment.md:32`; `docs/adr/2026-09-27-transactions-account-chips.md`; `docs/adr/2026-10-18-transactions-pieces-leave-screen-folders.md:6,22`
- Change:
  - `commitments.md:133` names `chip_row.tsx` where it says `account_chips.tsx` still draws the adornment-free pill.
  - The Expected cell of each trash-icon dialog row adds the icon: a danger-tinted circle with the trash glyph above a centred title and body (B2 Remove dialog, MA-289). On the failed rows the failure line is centred under the body with no glyph. On the large-font rows the circle overlaps no text box by more than 1 dp in `mqa bounds`. The skip, archive and delete rows stay as they are.
  - The account-chips ADR gets an `**Extended 2026-11-21 (#943, MA-289).**` paragraph: `ChipRow` and `ChipRowModel` replace `AccountChips` and `AccountChipModel`, with leads tile, dot or none, and `buildChipRow` lights All when no chip matches while `buildAccountChips` keeps its rule. Its Applies-to line and the 10-18 ADR's path list name `chip_row.tsx`, `chip_row.helpers.ts` and `chip_row.geometry.ts`.
- Test: `none` · docs. `npm run lint` checks the paths.

## Screens
- transactions.md: delete dialog, body per type · risk: a clipped or rounded container
- transactions.md: delete dialog, busy · risk: a clipped or rounded container
- transactions.md: delete dialog, failed · risk: a clipped or rounded container
- transactions.md: delete dialog, archived account · risk: a clipped or rounded container
- transactions.md: delete confirm sheet, large font · risk: a font scale above 1.0, a clipped or rounded container
- transaction_detail.md: delete dialog · risk: a font scale above 1.0, a clipped or rounded container
- commitment_detail.md: stop dialog · risk: a clipped or rounded container
- commitment_detail.md: stop dialog, busy · risk: a clipped or rounded container
- commitment_detail.md: stop dialog, failed · risk: a clipped or rounded container
- commitment_detail.md: skip and stop dialogs, large font · risk: a font scale above 1.0, a clipped or rounded container
- add_commitment.md: stop dialog from the edit sheet · risk: a clipped or rounded container
- commitment_detail.md: skip dialog · risk: a clipped or rounded container
- account_detail.md: archive dialog · risk: a clipped or rounded container
- archived_account.md: delete dialog, large font · risk: a font scale above 1.0, a clipped or rounded container
- categories.md: delete dialog, large font · risk: a font scale above 1.0, a clipped or rounded container
- budget.md: summary cards, category rows, named budget rows and plan cards at a float tie, Categories and Plans lenses · risk: a clipped or rounded container
- budget.md: lens walk, large font · risk: a font scale above 1.0, a clipped or rounded container
- spending_plan_detail.md: plan at a float tie · risk: a clipped or rounded container
- transactions.md: account chips, all accounts · risk: a height that is not a whole number of dp, a clipped or rounded container
- transactions.md: account chip on · risk: a height that is not a whole number of dp, a clipped or rounded container
- transactions.md: account chip hit area · risk: a height that is not a whole number of dp
- transactions.md: account chips, dragged back to the start · risk: a swipe or a drag, a clipped or rounded container
- commitments.md: account chips · risk: a height that is not a whole number of dp, a clipped or rounded container
- commitments.md: account chip on · risk: a height that is not a whole number of dp, a clipped or rounded container
- commitments.md: account chips, dragged back to the start · risk: a swipe or a drag, a clipped or rounded container

## Non-goals
- The trash icon on Remove budget (MA-294) and Remove plan (MA-305). Both still use `ConfirmSheet`, which stays as it is.
- Any ring change on budget rows (MA-299, MA-304, MA-310). The ring keeps the `BudgetRing` name and its props.
- Mounting dot or text chips on any screen: the state chips (MA-302), the lifecycle chips (MA-307) and the group chips (MA-312).
- A shared single-select toggle for dot and text chips. `toggleAccountFilter` stays account-only.
- Moving `toggleAccountFilter`, `pruneAccountFilter` or `countFunnelFilters` out of `account_chips.helpers.ts`.
- An icon on the skip, archive, account delete or category delete dialogs, and the S13 alert glyph on the error line.

## Untested inputs
- Steps 4 and 5 add dot and text chips that no screen draws, so nothing checks them on a device. This covers the lit dot keeping its colour, a lit dot or text chip scrolling into view, the 44 dp floor and font scale 2.0. The first screen tickets that mount them (MA-302, MA-307, MA-312) carry those checks. The geometry case in step 5 and the shared slop and reveal path are the only cover here.
- Step 2: the trash icon at font scale 2.0, and busy and failed with the icon, are covered by the Screens rows only.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md` (`npm run ci:local`).
- Critical trigger 2: the run stops for the user before the first push that carries step 3 or step 5.

## Risks
- `chip_row.tsx` must keep enough of `account_chips.tsx` for git to record a rename. If it does not, `pr_size.mjs` counts all 165 lines as added, about 130 more than this plan's figure.
- HeroUI `Chip` merges `style` after its classes (`chip.tsx:147` comment). If the adornment `py-1.5` beat the style padding, a dot chip would stand 4 px taller than All accounts.
- `bg-danger/12` might not compile as an opacity modifier on `--danger` under Uniwind. `load_error_alert.tsx:92` already ships it, which lowers the risk.
- transactions.md · delete dialog, body per type: the circle is 56 dp plus 14 dp above the title, so the dialog grows 70 dp and its border must stay whole round all four corners.
- commitment_detail.md · skip and stop dialogs, large font: at 2.0 the centred title and the two-sentence stop body grow beside a circle that does not scale. No text box may overlap the circle by more than 1 dp.
- transactions.md · account chips, all accounts: after the rename, a tile chip still reads `ms(28)` = 30 ± 1 high, 6 ± 1 apart and 17 ± 1 from the left.
- budget.md · lens walk, large font: the ring import moved, so every lens that draws it must still render.
- REBUILD: package.json, package-lock.json
- not probed: transactions.md · delete dialog, archived account
- not probed: transactions.md · delete confirm sheet, large font
- not probed: transaction_detail.md · delete dialog
- not probed: commitment_detail.md · stop dialog
- not probed: commitment_detail.md · stop dialog, busy
- not probed: commitment_detail.md · stop dialog, failed
- not probed: commitment_detail.md · skip and stop dialogs, large font
- not probed: add_commitment.md · stop dialog from the edit sheet
- not probed: commitment_detail.md · skip dialog
- not probed: account_detail.md · archive dialog
- not probed: archived_account.md · delete dialog, large font
- not probed: categories.md · delete dialog, large font
- not probed: budget.md · summary cards, category rows, named budget rows and plan cards at a float tie, Categories and Plans lenses
- not probed: budget.md · lens walk, large font
- not probed: spending_plan_detail.md · plan at a float tie
- not probed: transactions.md · account chips, all accounts
- not probed: transactions.md · account chip on
- not probed: transactions.md · account chip hit area
- not probed: transactions.md · account chips, dragged back to the start
- not probed: commitments.md · account chips
- not probed: commitments.md · account chip on
- not probed: commitments.md · account chips, dragged back to the start

## Self-assessment
I am least sure of step 5's dot-chip padding. The plan sets the dot chip's vertical padding to the bare pill's block on the strength of the existing comment that `tileChipStyle` "beats the pill's `py-1.5`" (`account_chips.tsx:56`). I did not measure a dot chip, because no screen mounts one in this ticket. A wrong padding passes every test here and shows first on MA-302's emulator check. The horizontal 12 follows frame `.spill`, while the adornment pill ships 10. It may read as a different chip width beside an account chip, which keeps the pill's 10 left of its label.
