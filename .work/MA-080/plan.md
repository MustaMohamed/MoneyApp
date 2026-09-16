# MA-080 — The detail's inline edit retired: toggle, schema, three strings, animation
base: 513ee5c8 · verify: emulator · flags: none · expected diff: ~185 lines outside tests, ~220 lines of test deletions

Every step is a deletion. The branch compiles and the suite passes after each one because each step removes a consumer before the next removes what it consumed.

## Steps
### 1. The detail renders as a view with actions
- File: `src/modules/accounts/screens/accounts/detail/index.tsx`
- Change: drop `isEditing` and `form` from the `useAccountDetail()` destructure, the `useAccountDetailAnim()` call and the `control`/`errors` destructure (`:80-84`). Unwrap both `Animated.View style={headerStyle}` wrappers so `StackHeader` is a direct child of `Screen` (`:90-95`, `:162-178`). Gate the review alert on `shouldShowBalanceReview(account)` alone (`:186`). Delete the editing block (`:197-223`). Unwrap the `!isEditing &&` fragment (`:237-270`) so the action row `Box` and `AccountActivityCard` render unconditionally; the `mx-4` sibling comment at `:260` stays. Drop the imports this leaves unused: `Controller`, `Animated`, `FormErrorText`, `FormSectionLabel`, `Input`, `AccountColorField`, `useAccountDetailAnim`. `PressableFeedback`, `Typography`, `hitSlop` and the header's `goToEdit` button stay as MA-078 left them.
- Test: none; no render tests (`.claude/rules/tests.md`), the emulator pass covers the shape.

### 2. The hook holds no editing state, form, save or back-guard
- File: `src/modules/accounts/screens/accounts/detail/account_detail.hook.ts`
- Change: delete the `beforeRemove` effect (`:118-126`) with `useNavigation` and the `navigation` const; `editSchema`, `form` and the `form.reset` effect (`:222-235`); `handleSave` (`:242-261`); `isEditing`/`isSaving` from the `useShallow` selector and its destructure; the `setEditing`/`setSaving` consts; `updateAccount`. The return loses `isEditing`, `isSaving`, `form`, `setEditing`, `handleSave`; every other key stays. `popIfReloadFailed` stays (adjust and review call it). Imports that become unused go with them: `useNavigation`, `useZodForm`, `DEFAULT_ACCOUNT_COLOR`, `createEditAccountSchema`.
- Test: `__tests__/screens/accounts/account_detail.hook.test.ts`, deletions first. Whole cases: `:387-412` (update landed, reload failed), `:414-444` (credit values passed through), `:446-459` (update rejects), `:572-584` (beforeRemove prevents removal), `:671-685` (beforeRemove reads latest state). Lines inside surviving cases: `:304` and `:307` (`isEditing`, `isSaving`) in "returns local UI state as plain booleans"; `:316` (`handleSave`) in "exposes the handler surface"; `:553` and `:559` in the Back case, which keeps its `onBack` assertion and is retitled `Back pops the detail`; `:569` in the Edit case. Dead mocks: `mockSetEditing`, `mockSetSaving`, `mockUpdateAccount` and the `updateAccount:` key in `mockAccounts`, `mockAddListener` with the `BeforeRemoveEvent`/`BeforeRemoveHandler` types, the `useNavigation` key in the `expo-router` mock and the `mockAddListener.mockReturnValue` line in `setup`; `isEditing`, `isSaving`, `setEditing`, `setSaving` in `DetailStateMock` and `createDetailStore`. The MA-069 pop cases at `:461` and `:479` stay byte-identical.

### 3. The state store loses the editing slice
- File: `src/modules/accounts/screens/accounts/detail/account_detail.state.ts`
- Change: remove `isEditing`, `isSaving` from `AccountDetailStateShape` and `INITIAL_STATE`, `setEditing`, `setSaving` from the action type and the store body. `reset` stays `set(INITIAL_STATE)`.
- Test: `__tests__/account_detail.state.test.ts`, deletions first: `:11`, `:14` in the initial-state case; the `setEditing toggles` (`:30-36`) and `setSaving toggles` (`:51-57`) cases; `:138`, `:141`, `:155`, `:158` in the reset case.

### 4. The toggle animation file is gone
- File: `src/modules/accounts/screens/accounts/detail/account_detail.anim.ts`, deleted. Its only consumer left in step 1 (`git grep -n account_detail.anim -- src __tests__` lists `detail/index.tsx:22` alone at base).
- Test: none; nothing asserted on it.

### 5. The schema module exports the form schema alone
- File: `src/modules/accounts/utils/edit_account.schema.ts`
- Change: delete `createEditAccountSchema` (`:11-23`). `createEditAccountFormSchema` and `EditAccountFormData` stay byte-identical; every import stays in use by them (`Strings`, `isBlankName`, `isAccountNameTaken`, `AccountType`, `creditFieldsShape`, `addCreditFieldIssues`).
- Test: `__tests__/screens/accounts/edit_account_schema.test.ts`, deletions first: `acct`, `err`, `nameMessages` and the `edit account schema` describe (`:12-128`), `createEditAccountSchema` and `Currency` from the imports (`Account`, `Strings`, `AccountType`, `makeTestAccount` stay in use). The `createEditAccountFormSchema` describe (`:130-266`) stays byte-identical.

### 6. The three strings are gone and the add form's comment names the live line
- File: `src/constants/strings.ts`
- Change: delete `o4SectionName` (`:23`), `errNameDuplicate` (`:164`), `accountDetailSave` (`:283`). `errNameDuplicateNamed` (`:62`), `accountDetailEdit` and `accountDetailCancel` stay.
- File: `src/modules/accounts/components/account_form/use_account_form.hook.ts:72`
- Change: the comment names `errNameDuplicateNamed`, the line `add_account.schema.ts:37` raises. Nothing else in the file moves.
- Test: none; the gate is `git grep -n "errNameDuplicate\b\|accountDetailSave\|createEditAccountSchema\b\|o4SectionName\|isEditing\|isSaving\|setEditing\|setSaving\|beforeRemove\|account_detail.anim" -- src/modules/accounts src/constants __tests__/account_detail.state.test.ts __tests__/screens/accounts ':(exclude)src/modules/accounts/screens/accounts/edit_account' ':(exclude)__tests__/screens/accounts/edit_account.state.test.ts'` returning nothing; at base it returns 96 lines across 9 files. The two excluded paths are the edit screen's own `isSaving`/`setSaving` store, untouched by this ticket.
- Acceptance gate, the four names across app code and tests: `git grep -ln "errNameDuplicate\b\|accountDetailSave\|createEditAccountSchema\b\|o4SectionName" -- src __tests__` prints nothing; at base it prints 6 files.

## Screens
- Account detail, active bank: loaded, balance hero, facts card, Adjust balance and Archive row, activity card; header Edit present, no Save.
- Account detail, active credit card: the same, card facts.
- Account detail, archived account: loaded, archived body with Unarchive and Delete.
- Each against MA-078's shots (PR #517); the only expected difference is none. Nothing else is walked.

## Non-goals
- The edit screen, its route, its hook, state and helpers (`src/modules/accounts/screens/accounts/edit_account/**`), MA-078 and MA-079.
- The add form component, its hook and its state store beyond the one comment.
- Any change to what the detail shows: facts, activity, review alert copy, the header button's styling.
- `docs/adr/2026-09-16-account-edit-credit-columns.md:29`, which names `createEditAccountSchema` as staying until the inline edit retires; ADRs are dated records and stay as written.
- `__tests__/account_color_sheet.state.test.ts:5`, where `'accounts/detail'` is an arbitrary owner id for the colour sheet state, not a reference to the detail's retired colour field.
- `accountDetailCancel` and `accountDetailMore`, which sit beside the deleted `accountDetailSave`; `accountDetailCancel` has two live consumers and a strings test.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.
- Step 6's `git grep` gate, empty at head.

## Risks
- Unwrapping the header's `Animated.View` changes the view tree above `StackHeader` in both branches of the render; if the header's width or top inset shifts, the shots against MA-078's will show it and step 1 needs a plain `View` in its place, which the ticket's "no restyle" rule would then have to weigh.
- Deleting the hook test's `useNavigation` mock while the hook still imports it (if step 2's source and test edits land out of order) throws at render; the test edit and the source edit are one commit.
- `expo-doctor` reads Expo's live table; a red there with a clean diff is not this ticket's.

## Self-assessment
Step 2's test deletions are the step I am least sure about: the surviving Back case at `:552` keeps its `onBack` assertion but its title names the inline edit, so it takes a retitle, which is the one edit in the ticket that is not a pure deletion; and the hook test file is 1,126 lines, so the implementer must confirm each cited line against the file rather than the numbers here, since the deletions above shift them as they land. Everything else is a straight removal with a single consumer already confirmed by grep at this checkout.
