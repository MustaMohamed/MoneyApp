# MA-282 — One shared detail danger button
base: 90fd517d2bf8b2cf7c4395f0ab44d55b8c252b66 · verify: emulator · flags: none · expected diff: ~55 lines

## Steps

### 1. The danger half of a detail action row lives once in `src/components/ui/`
- File: `src/components/ui/detail_danger_button.tsx` (new), beside `src/components/ui/detail_edit_button.tsx`, which it mirrors.
- Change: export `DetailDangerButton({ icon, label, onPress }: DetailDangerButtonProps): React.ReactElement`. Props, all required and none nullable: `icon: NonNullable<ButtonProps['icon']>` (`ButtonProps` exported from `src/components/ui/button.tsx:39`), `label: string`, `onPress: () => void`. It returns `<Button variant="secondary" flat tone="danger" icon={icon} label={label} onPress={onPress} />` and nothing else: no wrapper, no `flex: 1`, no testID. The half-row wrapper stays at each site, as with `DetailEditButton`. Label and icon come from the caller because the three sites differ in both.
- Test: `none` · the repo forbids a new `.tsx` test file (`.claude/rules/tests.md` Render-suite policy). The render and press are covered by the existing case in step 3; the "every site draws it" property by the guard in step 5.

### 2. The commitment detail's Stop draws through `DetailDangerButton`
- File: `src/modules/commitments/screens/commitments/detail/components/detail_actions.tsx` (`CommitmentDetailActions`, the second `flex: 1` View, `:19-28`)
- Change: replace the inline `Button` with `<DetailDangerButton icon="close" label={Strings.commitmentsDetailStop} onPress={onStop} />`. Drop the now unused `Button` import. The row, its testID `commitment-detail-actions`, `gap-2` and both `flex: 1` wrappers stay as they are.
- Test: `none` · no suite renders `CommitmentDetailActions`, and a new `.tsx` file is forbidden; step 5's guard and the `bottom Edit and Stop` render row cover it.

### 3. The transaction detail's Delete draws through `DetailDangerButton`
- File: `src/modules/transactions/screens/transactions/detail/components/action_row.tsx` (`ActionRowContent`, case `editDelete`, `:44-53`)
- Change: replace the inline `Button` with `<DetailDangerButton icon="trash-can-outline" label={Strings.detailDeleteButton} onPress={props.onDelete} />`. Keep the `Button` import: `viewCommitment` still draws `Button`.
- Test: `none` new · `__tests__/screens/transactions/detail/detail_screen_actions.test.tsx` case "frame C1: shows flat Edit and Delete for an ordinary transaction, each pressing its own handler" already asserts the Delete label's `allowFontScaling`, `numberOfLines`, `Radius.cta` and the `onDelete` press; it must pass unchanged, with no assertion edited.

### 4. The account detail's Archive draws through `DetailDangerButton`
- File: `src/modules/accounts/screens/accounts/detail/index.tsx` (`AccountDetailScreen`, the second `Box style={{ flex: 1 }}`, `:184-193`)
- Change: replace the inline `Button` with `<DetailDangerButton icon="archive-outline" label={Strings.accountDetailArchive} onPress={() => setArchiveVisible(true)} />`. Keep the `Button` import: `Adjust balance` still draws it. The `Box` row and its classes stay.
- Test: `none` · no suite renders the account detail screen and a new `.tsx` file is forbidden; step 5's guard and the `body buttons, large font` render row cover it.

### 5. A lint guard keeps every detail danger half on the shared piece
- File: `scripts/validate-structural-guards.js` (`NAMED_ROWS`, `:179`; helpers `tag` `:68`, `literal` `:31`)
- Change: add one `NAMED_ROWS` row. `files`: the three files of steps 2 to 4. `banned: [literal('tone="danger"')]`, `rule` saying the file draws its own danger button and should render `DetailDangerButton`. `required: [tag('DetailDangerButton')]`, `needs` saying the detail action row draws its danger half through `DetailDangerButton`. Prior art: the `ListRail` rows (`:256-261`, `:268-274`). `archived_detail_body.tsx` (the ghost danger Delete account, ticket Context) is not in `files`.
- Test: `first` · `__tests__/scripts/validate_structural_guards.test.ts`: three `withoutTag(<site>, 'DetailDangerButton', '<where>')` entries in `REQUIRED` (`:445`), one per site, each with a new path constant beside `DETAIL_INDEX` (`:24`); one `BANNED` entry (`:259`) appending `tone="danger"` to one of the three files, token `tone="danger"`. Each fails at base and passes once the row exists.

### 6. The shared-pieces ADR names both detail buttons and their homes
- File: `docs/adr/2026-10-18-transactions-pieces-leave-screen-folders.md`
- Change: append `src/components/ui/detail_edit_button.tsx` and `src/components/ui/detail_danger_button.tsx` to `Applies to` (line 6). Add one `**Extended <commit date> (#922, MA-282).**` paragraph after the MA-279 paragraph (line 62), before `## 2.`: `DetailEditButton` lives in `src/components/ui/detail_edit_button.tsx` (MA-266, #876) and `DetailDangerButton` in `src/components/ui/detail_danger_button.tsx`, beside it (epic #777 R25); the commitment detail's Stop, the transaction detail's Delete and the account detail's Archive draw through the danger button, each passing its icon, label and press; the archived account's Delete account stays the flat ghost danger label; the file is new, so §3's `git mv` does not apply; `scripts/validate-structural-guards.js` holds the three sites to it.
- Test: `none` · a document.

### 7. The three feature files name the shared danger button on the rows that check it
- Files: `.claude/skills/emulator-verify/features/commitment_detail.md` (header paragraph line 3; row `bottom Edit and Stop`, line 66), `.claude/skills/emulator-verify/features/transaction_detail.md` (header line 3; row `action row, large font`, line 26), `.claude/skills/emulator-verify/features/account_detail.md` (header line 3; `Reach it` Header bullet, line 9; row `body buttons, large font`, line 40)
- Change: each header paragraph adds that since MA-282 the danger half (`Stop`, `Delete`, `Archive`) is the shared `src/components/ui/detail_danger_button.tsx`, which all three details draw. Each named row's Frame column appends `MA-282`; Force and Proof stay. In `account_detail.md` line 9, the stale `detail/index.tsx:187-194` becomes `detail/index.tsx`, `DetailDangerButton`.
- Test: `none` · a document.

## Screens
- `emulator-verify/features/commitment_detail.md`: bottom Edit and Stop
- `emulator-verify/features/transaction_detail.md`: action row, large font
- `emulator-verify/features/account_detail.md`: body buttons, large font
- The invariant pass (`features/README.md` § Invariant pass) on all three files, #802 Rule 4, per the ticket's Rules.

## Non-goals
- The shared detail Edit button, extracted by MA-266 (#876): untouched.
- The archived account's Delete account (`archived_detail_body.tsx:89-96`), the flat ghost danger label: untouched.
- No change to `Button`, `button.content.ts` or `button.geometry.ts`, and no new prop on `Button`.
- No shared two-button row component: the `flex: 1` halves and the row container stay at each site.
- No string, icon, tone, height or gap change on any screen.
- The header pencil `DetailEditAction` and the dialogs behind Stop, Delete and Archive: untouched.

## Untested inputs
- The commitment Stop and the account Archive have no render test of their press; step 5's guard proves they mount `DetailDangerButton`, and the render rows prove the press and look (steps 2, 4).

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- `commitment_detail.md` · bottom Edit and Stop: a new component; the Stop half must read the same glyph, danger colour, height and equal width as on `main`.
- `transaction_detail.md` · action row, large font: a new component at font scale 2.0; the Delete label's ellipsis and height must match `main`.
- `account_detail.md` · body buttons, large font: a new component at font scale 2.0; Archive must stay inside its half.
- Step 5's banned `tone="danger"` would also refuse a future second danger button on one of the three files; such a ticket edits the row.

## Self-assessment
Step 5 is the one I am least sure about. The ticket's Size line does not list `scripts/validate-structural-guards.js`, and I added the row because Acceptance 4 ("none of the three draws its own") has no other test that can fail: a new `.tsx` suite is forbidden and two of the three sites have no render suite. The `ListRail` rows are the precedent. It adds ~10 lines and keeps the plan far under the gate, so if the reviewer reads it as scope beyond the ticket, dropping it leaves steps 1 to 4, 6 and 7 intact.
