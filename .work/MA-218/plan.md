# MA-218 — Pay sheet body
base: 55706296c69fd941f5326c890c551a3998bb336f · verify: emulator · flags: money path, user copy · expected diff: ~110 lines

Scope is the Rules `Seam:` line: the Note cell, its reveal, the note geometry, the form inset and the status gap move to `src/components/ui/`, and the add-transaction sheet (add and edit) reads them there. Lines per file, added: `form_sheet.geometry.ts` ~18, `transaction_form.geometry.ts` ~3, `index.tsx` ~2, `transaction_form_loading.tsx` ~4, `transaction_form_body.tsx` ~14, `note_reveal.hook.ts` ~3, `note_fact_row.tsx` ~60, ADR ~3, `transaction_form.md` ~3.

## Steps
### 1. The form inset, the status gap and the note geometry live in `form_sheet.geometry.ts`
- File: `src/components/ui/form_sheet.geometry.ts`; `src/modules/transactions/screens/transactions/transaction_form/components/transaction_form.geometry.ts` (`TRANSACTION_FORM_STATUS_GAP` :15, `resolveNoteInputGeometry` :18-24, `TRANSACTION_FORM_CONTENT_CONTAINER_STYLE` :26-29); readers `transaction_form/index.tsx:10,41`, `transaction_form/components/transaction_form_loading.tsx:16-21,91`, `transaction_form/transaction_form_body.tsx:37-40,154,232`
- Change: add to `form_sheet.geometry.ts`, bodies and values unchanged: `export const FORM_SHEET_STATUS_GAP = Spacing.xs` (the gap between the status track and the flat button, was `TRANSACTION_FORM_STATUS_GAP`); `export const FORM_SHEET_CONTENT_CONTAINER_STYLE = { padding: Spacing.md, gap: Spacing.xs }` (was `TRANSACTION_FORM_CONTENT_CONTAINER_STYLE`, one object, so the skeleton and the loaded inset stay the same reference); `export function resolveNoteInputGeometry(fontScale: number): { minHeight: number; text: ScaledTextStyle | undefined }`, `fontScale` required and not null, both keys required, `text` `undefined` at or below scale 1, with the `resolveFactRowHeight` import from `fact_row.geometry.ts` (no cycle: `fact_row.geometry.ts` imports only `text_scale.geometry`, theme and `responsive`). Delete the three from `transaction_form.geometry.ts` with their now-unused imports (`Spacing`, `ScaledTextStyle`, `scaledTextStyleAboveOne`); `resolveFactRowHeight`, `Type` and `lineHeightFor` stay for the skeleton. Repoint the three readers to the new names. No re-export at the old path.
- Test: `first` · move `describe('transaction form content inset')` and `describe('resolveNoteInputGeometry')` from `__tests__/screens/transactions/transaction_form/transaction_form.geometry.test.ts:128-154` to `__tests__/components/ui/form_sheet.geometry.test.ts`, on the new names, no assertion changed, and drop the imports only those cases read; repoint the import in `__tests__/screens/budget/budget_categories_styling_architecture.test.ts:1,6` and `__tests__/screens/transactions/transaction_form/transaction_form_body.test.tsx:89,983` to `FORM_SHEET_CONTENT_CONTAINER_STYLE`.

### 2. The Note reveal lives in `src/components/ui/note_reveal.hook.ts`
- File: `src/modules/transactions/screens/transactions/transaction_form/transaction_form_note_reveal.hook.ts` to `src/components/ui/note_reveal.hook.ts` by `git mv`; reader `transaction_form_body.tsx:49,137-138`
- Change: rename `useTransactionFormNoteReveal` to `useNoteReveal` and its return interface `TransactionFormNoteReveal` to `NoteReveal`; nothing else in the file changes. `useNoteReveal(): NoteReveal`, no arguments; every field required: `scrollRef: RefObject<BottomSheetScrollViewMethods | null>` (the ref's value can be `null`), `handleScrollLayout: (event: LayoutChangeEvent) => void`, `handleNoteFocus: () => void`, `handleNoteBlur: () => void`. The body imports it from `@/components/ui/note_reveal.hook`.
- Test: `first` · `git mv __tests__/screens/transactions/transaction_form/transaction_form_note_reveal.hook.test.ts __tests__/components/ui/note_reveal.hook.test.ts`, import and `describe` renamed to `useNoteReveal`, no assertion changed.

### 3. The Note cell is `NoteFactRow` in `src/components/ui/note_fact_row.tsx`, and the add sheet mounts it
- File: `src/components/ui/note_fact_row.tsx` (new); `transaction_form_body.tsx` (`:136-146` focus and blur wrappers, `:154` `noteGeometry`, `:367-392` the `FactRow` and `Input`)
- Change: `export function NoteFactRow(props: NoteFactRowProps): ReactElement`, props in this order: `label: string` required; `placeholder: string` required; `value: string` required, never `null` or `undefined` (a form holding an optional note passes `?? ''`); `onChangeText: (text: string) => void` required; `onFocus?: () => void` optional, called after the sheet-aware focus handler; `onBlur?: () => void` optional, called after the sheet-aware blur handler; `testID?: string` optional, default `'note-row'`. The cell calls `useBottomSheetAwareHandlers()` from `@/components/ui/sheet` itself, so it renders inside a `Sheet`'s children (`.claude/rules/ui.md` § Bottom sheets), reads `resolveNoteInputGeometry(useWindowDimensions().fontScale)` from step 1, and draws `FactRow` with `showDivider={false}`, the card's last row, around the `Input` exactly as `transaction_form_body.tsx:368-391` draws it today (multiline, `allowFontScaling`, `submitBehavior`, classes, style and its comment). No string import: each sheet passes its own label and placeholder. The body replaces the block with `<NoteFactRow label={Strings.addTxNoteLabel} placeholder={Strings.addTxNotePlaceholder} value={note} onChangeText={setNote} onFocus={handleNoteFocus} onBlur={handleNoteBlur} />`, takes `scrollRef`, `handleScrollLayout`, `handleNoteFocus` and `handleNoteBlur` straight from `useNoteReveal()`, and drops the imports only the Note read: `Input`, `FactRow`, `INPUT_NO_FOCUS_BORDER_COLOR`, `useBottomSheetAwareHandlers`, `resolveNoteInputGeometry`. `Spinner`, `Type` and `lineHeightFor` stay.
- Test: `none` · the cell is render-only and `.claude/rules/tests.md` bars a new `.tsx` suite and, with no Acceptance line, a new render case; the existing cases `transaction_form_body.test.tsx:385` (label in `note-row`, placeholder, `minHeight` at the fact row height, `changeText` to `setNote`) and `:398` (scroll to end on a shrink while focused, not after blur) run through it unchanged, and the suite's `@/components/ui/sheet` mock (`:42-59`) already supplies `useBottomSheetAwareHandlers`.

### 4. ADR 2026-10-18 names the moved Note pieces
- File: `docs/adr/2026-10-18-transactions-pieces-leave-screen-folders.md` (Applies to `:6`, §1 after the MA-245 paragraph `:32`)
- Change: `:6` gains `src/components/ui/note_fact_row.tsx` and `src/components/ui/note_reveal.hook.ts`. A paragraph `**Extended 2026-10-24 (#792, MA-218).**` names each piece and its home: `NoteFactRow` in `note_fact_row.tsx`, taking label, placeholder, value and the reveal's handlers, owning the sheet-aware focus handlers and the note geometry; `useNoteReveal` in `note_reveal.hook.ts`, moved with `git mv` and renamed from `useTransactionFormNoteReveal`; `resolveNoteInputGeometry`, `FORM_SHEET_CONTENT_CONTAINER_STYLE` (was `TRANSACTION_FORM_CONTENT_CONTAINER_STYLE`) and `FORM_SHEET_STATUS_GAP` (was `TRANSACTION_FORM_STATUS_GAP`) in `form_sheet.geometry.ts`. Why: the pay sheet body, MA-259 (#860), mounts them beside the add-transaction sheet (epic #777 R22, R25). None reads module code, no old path keeps a re-export, and `transaction_form.geometry.ts` imports none of them back (§3). Wording passes `npm run lint`'s banned-phrase check.
- Test: `none` · a record; `docs/` is outside `scripts/validate-agent-assets.js`'s path check, so `test -f` the two new paths it cites.

### 5. `transaction_form.md` cites the Note's new homes
- File: `.claude/skills/emulator-verify/features/transaction_form.md` (`:3` "which draws the Note too", `:24` `add, note focused` Expected cell, `transaction_form_note_reveal.hook.ts`)
- Change: `:3` names the Note cell `src/components/ui/note_fact_row.tsx` over the shared fact row; `:24` cites `src/components/ui/note_reveal.hook.ts` in place of `transaction_form_note_reveal.hook.ts`. No figure, step or other row changes.
- Test: `none` · a recipe file; `npm run lint` (`validate:agent-assets`) fails on a cited `src/` path that does not exist.

## Screens
- `.claude/skills/emulator-verify/features/transaction_form.md`: add, note focused
- The invariant pass of `.claude/skills/emulator-verify/features/README.md` on `transaction_form.md`, the one screen this diff mounts (ticket Rule 5). `commitment_detail.md` stays out: the ticket's 2026-10-24 Decisions line puts the pay sheet's `commitment_detail.md` checks in MA-259 (#860), `.claude/skills/emulator-verify/features/README.md:70-72` runs the pass on the screens the PR touches, and `pay_sheet.tsx:1-28` imports none of the moved pieces.

## Decision record
- `docs/adr/2026-10-18-transactions-pieces-leave-screen-folders.md`: the Note cell, its reveal, the note geometry, the form inset and the status gap live in `src/components/ui/`; step 4 adds the dated extension.

## Non-goals
- Mounting `NoteFactRow`, `useNoteReveal`, `FORM_SHEET_CONTENT_CONTAINER_STYLE` or `FORM_SHEET_STATUS_GAP` in the pay sheet, and the pay sheet's `commitment_detail.md` checks and invariant pass: MA-259 (#860). This diff changes no file the commitment detail mounts.
- Every Out of scope line of the ticket: the cycle line, strip, hero, rate card, Date row, status track preview, idle track, `Pay` button.
- The commitment add and edit form's notes field and `COMMITMENT_FORM_CONTENT_CONTAINER_STYLE` (`commitment_form.geometry.ts:53`, a different inset: `paddingTop: Spacing.xs`).
- `FACT_CELL_CLASS`, the other fact rows, the skeleton geometry and `resolveTypeTabsSkeletonHeight`: they stay in the transactions module.
- Any change to the reveal's behaviour, the Note's geometry values, its strings or the gap's value. No new string.
- `DateRow`, the date picker sheet and the strip wrapper: MA-255 (#855) and MA-254 (#853).

## Untested inputs
- `NoteFactRow` with `onFocus` or `onBlur` absent, and a `testID` other than the default: no caller in this diff passes either; step 3.
- The sheet-aware focus and blur that `NoteFactRow` sends to gorhom (`useBottomSheetAwareHandlers`), and their order ahead of the reveal's `handleNoteFocus` and `handleNoteBlur`: the body suite's mock (`transaction_form_body.test.tsx:58`) returns `jest.fn()`s no case reads; the only proof is `transaction_form.md · add, note focused`, `note-row`'s and Save's bottoms above the keyboard's top and `note-row` 17.9 ± 1 above `sheet-footer`; step 3.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.
- `test -f` each moved test path before it is cited (`.claude/rules/review.md` § Gates).

## Risks
- MA-255 (#855) also moves `resolveNoteInputGeometry` to `form_sheet.geometry.ts`: whichever merges second meets a conflict in that file and in `transaction_form.geometry.ts`, resolved by keeping one definition and the other ticket's imports.
- MA-254 (#853) edits `transaction_form_body.tsx`'s strip imports: a rebase conflict in the import block, no behaviour overlap.
- `transaction_form.md · add, note focused`: the sheet-aware focus handler now runs in `NoteFactRow` before the reveal's `handleNoteFocus`, the order the body's wrapper used; a reversed order would ask for the end before gorhom marks the input, and the row's `note-row` gap above `sheet-footer` is the read that catches it.
- Ticket Rule 4 asks the emulator check to name both sheets, and Rule 5 asks the invariant pass on `commitment_detail.md` beside `transaction_form.md`; the pay sheet mounts none of the moved pieces until MA-259 (#860), whose Rules carry both lines, so the one Screen checks row and the one invariant pass are the add sheet's and both pay-sheet halves are MA-259's.

## Self-assessment
Step 3 is the least certain: `NoteFactRow`'s props are shaped for the add-transaction sheet and for what MA-259 will need from a react-hook-form `Controller` (a `value` that may be `undefined`, an RHF `onBlur` composed with the reveal's), and MA-259 may find it wants the blur to receive the event or the divider to be optional; both are additive changes there, not a reason to widen the interface now.
