# MA-078 — Edit account screen: route, name and colour, locked type, currency and opening balance, footer; the detail's Edit opens it
base: 631291df · verify: emulator · flags: money path, user copy · expected diff: ~380 lines

Context line numbers hold at 631291df: `detail/index.tsx:164-199` header, `account_detail.hook.ts:115-123` `beforeRemove`, `:219-258` schema and save, `:378-384` `onBack`; `edit_account.schema.ts:25`; `account_form.helpers.ts:97`; `credit_fields.schema.ts:30-36,61`; `field_message_rail.tsx:23-75`; `account_color_field.tsx:30`; `onboarding_footer.tsx:16`; `stacked_route.ts:13-17`; `app.json:61`.

## Steps

### 1. The edit screen's copy exists in the strings file
- File: `src/constants/strings.ts` (new block after `accountBalanceReviewConfirm`, `:345`)
- Change: add `editAccountTitle` 'Edit account', `editAccountNameLabel` 'Name', `editAccountColorLabel` 'Colour', `editAccountTypeLabel` 'Type', `editAccountTypeHelper` 'Set when the account was created.', `editAccountBalanceHelper` 'Locked. Use Adjust balance for the current balance.', `editAccountFootnote` 'Changes apply everywhere this account appears.', `editAccountCta` 'Save changes', `editAccountSaveError` "Couldn't save your changes. Nothing was changed. Try again.", `editAccountFixFields: (count: number) => \`Fix the ${count} fields marked above.\``. Currency reuses `accountCurrencyLabel`, Opening balance reuses `accountBalanceLabel`, the name faults reuse `errNameRequired`, `errNameTooLong`, `errNameDuplicateNamed`, the CTA's busy label reuses `u4CtaBusy` (`strings.ts:407`; the canvas carries none, so no new string). No existing key changes.
- Test: `__tests__/screens/accounts/edit_account.strings.test.ts`: `editAccountFixFields(1)` is 'Fix the 1 fields marked above.', `(3)` the same template, the failure line byte-exact; shape of `account_detail_archive.strings.test.ts`.

### 2. The message rail's track renders without a form field behind it
- File: `src/modules/accounts/components/account_form/field_message_rail.tsx` (`FieldMessageRail`, `:30-75`)
- Change: extract the body from `:40-74` into an exported presentational `FieldMessageTrack({ error?: string; helper?: string })` in the same file; `FieldMessageRail` keeps its props and its `useFormState` read and renders `<FieldMessageTrack error={fieldError?.message} helper={helper} />`. The add form and `credit_card_fields.tsx` pass nothing new and render the same tree.
- Test: none, render layer (`.claude/rules/tests.md`); `__tests__/account_form.helpers.test.ts` and the typography suite stay green.

### 3. The colour field's label is a prop with today's default
- File: `src/modules/accounts/components/account_form/account_color_field.tsx` (`AccountColorFieldProps`, `:15-19`; label at `:30`)
- Change: add optional `label?: string`; `<FormLabelText label={label ?? Strings.accountColorLabel} />`. The add form passes none.
- Test: none, render layer.

### 4. The stored row drafts into the edit form and the status track resolves from faults
- File: `src/modules/accounts/screens/accounts/edit_account/edit_account.helpers.ts` (new)
- Change: `export const EDIT_ACCOUNT_DRAFT_DECIMALS = 2` (the persisted precision of `roundMoney`, `money.ts:14`, never `CURRENCY_CONFIG` display decimals). `buildEditAccountDraft(account: Account): EditAccountFormData` returns `{ name, color: account.color ?? DEFAULT_ACCOUNT_COLOR, interest_tracking: account.interest_tracking === 1, credit_limit, min_payment, apr: formatAmount(value, EDIT_ACCOUNT_DRAFT_DECIMALS) or '' on null, due_day: String(day) or '' on null }`; every number goes through `formatAmount`'s `decimals` parameter, no `Intl` here (review.md 3, M1/M22). `countFieldErrors(errors: FieldErrors): number` is `Object.keys(errors).length`. `resolveEditStatusMessage({ errorCount, saveError }): string | undefined` returns `Strings.editAccountFixFields(errorCount)` when `errorCount > 0`, else `saveError`, else `undefined` (the footer paints the footnote on `undefined`, `onboarding_shell.geometry.ts:55`).
- Test: `__tests__/screens/accounts/edit_account.helpers.test.ts`, written first: a card with `credit_limit: 1500.5, minimum_payment: 200, statement_due_day: 15, interest_tracking: 1, apr: 24.5` on EGP drafts `'1,500.50'`, `'200.00'`, `'15'`, `true`, `'24.50'`, and `toUpdateAccountInput(draft, card)` returns the five stored numbers unchanged (the round trip past EGP's 0 display decimals); `8450` drafts `'8,450.00'`; every null credit column drafts `''` with `interest_tracking: false`; `color: null` drafts `DEFAULT_ACCOUNT_COLOR`; `resolveEditStatusMessage` idle → `undefined`, `{ errorCount: 1 }` → 'Fix the 1 fields marked above.', `{ errorCount: 3 }` the same template, `{ errorCount: 0, saveError }` → the failure line, faults win over `saveError`.

### 5. Screen UI state is keyed by its owner
- File: `src/modules/accounts/screens/accounts/edit_account/edit_account.state.ts` (new)
- Change: `useEditAccountState` over `KeyedEntries<{ saving: boolean; saveError?: string }>` with `claim`, `setSaving`, `setSaveError`, `release`, `reset`, and an `updateEntry` that returns the same state for an absent owner; byte-for-byte the shape of `edit_commitment.state.ts` minus the dialog flag. `INITIAL_UI_ENTRY` exported and frozen.
- Test: `__tests__/screens/accounts/edit_account.state.test.ts`, written first: `claim` opens a default entry and a second `claim` keeps it; `setSaving`/`setSaveError` write only their owner; `release` drops the entry; `setSaving` on a released owner leaves `entries` unchanged; `reset` empties.

### 6. The hook drafts, validates, saves the full editable set and leaves
- File: `src/modules/accounts/screens/accounts/edit_account/edit_account.hook.ts` (new)
- Change: `useEditAccount()` reads `id` from `useLocalSearchParams`, `owner = useId()`, `accounts` and `archivedAccounts` from `useAccountStore`, `updateAccount` via `getState()`, the owner's entry through `useShallow(s => s.entries[owner] ?? INITIAL_UI_ENTRY)`; `claim` on mount, `release` on unmount. `account = accounts.find(a => a.id === id)`; `useEffect(() => { if (!account) router.back(); }, [account, router])` (archived, deleted and unknown ids are all absent from `accounts`). Schema: `useMemo(() => createEditAccountFormSchema(accounts, archivedAccounts, account ?? { id, type: AccountType.Bank, current_balance: 0 }), [...])`, the placeholder never validates because the effect pops first. `useZodForm(schema, { mode: 'onSubmit', reValidateMode: 'onChange', defaultValues: account ? buildEditAccountDraft(account) : undefined })`, no reset effect: a landed save leaves the screen and a failed one keeps the typed values. `onValid(data)`: return if `!account` or `useEditAccountState.getState().entries[owner]?.saving` (read off the store at call time, as `account_detail.hook.ts:298,329` read `getState()` for their guards; the render-closure `saving` is one render stale and two `submit()` calls in one `act` would both pass it); `setSaveError(owner, undefined)`; `setSaving(owner, true)`; `try { await updateAccount(account.id, toUpdateAccountInput(data, account)) } catch (error) { console.error('[editAccount] updateAccount failed:', error); setSaveError(owner, Strings.editAccountSaveError); return } finally { setSaving(owner, false) }`; then `useAccountStore.getState().loadError ? router.dismissTo('/accounts') : router.back()` (the detail's `popIfReloadFailed`, MA-069). `statusMessage = resolveEditStatusMessage({ errorCount: countFieldErrors(form.formState.errors), saveError })`. Returns `{ state: { account, saving, statusMessage }, form, submit: form.handleSubmit(onValid), onBack: () => router.back() }`. No `beforeRemove`; Back discards silently.
- Test: `__tests__/screens/accounts/edit_account.hook.test.ts`, written first, mocks as `commitments_edit.hook.test.ts` (`expo-router` with `useLocalSearchParams`, `useRouter` back/dismissTo; `attachMockSelectorStore` on `useAccountStore` with `accounts`, `archivedAccounts`, `loadError`, `updateAccount`; `makeTestAccount` fixtures, a card's `current_balance` at or above its minimum): bank with name and colour edited → `updateAccount('acc-1', { name, color, credit_limit: null, minimum_payment: null, statement_due_day: null, interest_tracking: 0, apr: null })` then `back`; card with a colour-only change → the five stored credit values sent unchanged, `credit_limit` 1500.5; rejected write → `updateAccount` called, form values kept, `statusMessage` the failure line, `saving` false, `back` not called; landed write with `loadError` true → `dismissTo('/accounts')`, not `back`; empty name → `errors.name.message` is `errNameRequired`, `statusMessage` 'Fix the 1 fields marked above.', `updateAccount` not called; 31-character name → `errNameTooLong`; an archived account's name → `errNameDuplicateNamed(typed)` in `errors.name`; paid-down card (`minimum_payment: 500`, `current_balance: 100`) with a name change → `statusMessage` 'Fix the 1 fields marked above.', `errors.name` undefined, no write; `accounts` without the id → `back` called on mount, no write; the id present in `archivedAccounts` and absent from `accounts` → `back` on mount, no write (the archived list is a name comparand, never a presence check); a second `submit` while the first `updateAccount` is pending (deferred promise) → one call; unmount releases the owner's entry.

### 7. The screen composes the leaf pieces under the fixed footer
- File: `src/modules/accounts/screens/accounts/edit_account/index.tsx` (new, `EditAccountScreen`, default export)
- Change: `<Screen>` → `StackHeader` (`Strings.editAccountTitle`, `onBack`) → `ScreenScroll` (`paddingHorizontal: Spacing.md`, `paddingBottom: Spacing.xl`, `keyboardShouldPersistTaps="handled"`) → `Animated.View style={useKeyboardLiftAnim()}` wrapping `OnboardingFooter({ footnote: Strings.editAccountFootnote, message: statusMessage, cta })`; `cta` is `<Button variant="primary" flat label={editAccountCta} loadingLabel={Strings.u4CtaBusy} isDisabled={saving} isLoading={saving} onPress={() => void submit()} />`. Body, top to bottom: Name (`FormLabelText`, `Controller name="name"` → `Input` with `maxLength={30}`, `isInvalid={fieldState.invalid}`, `accessibilityLabel`, then `FieldMessageRail control name="name"`, no helper); Colour (`Controller name="color"` → `AccountColorField ownerId="accounts/edit_account" label={editAccountColorLabel}`); a two-cell row (`flexDirection: 'row'`, `gap: Spacing.xs`, `flex: 1` each) of Type and Currency as `Input isDisabled editable={false}` with `value={ACCOUNT_TYPE_LABELS[account.type]}` / `account.currency` and `suffix={<MaterialCommunityIcons name="lock-outline" size={Size.iconSm} color={CoreTokens.text2} />}`, with `FieldMessageTrack helper={editAccountTypeHelper}` under Type and an empty `FieldMessageTrack` under Currency on a non-card, nothing under either on a card; on a non-card only, Opening balance (`accountBalanceLabel`, `Input isDisabled editable={false}` with `value={formatCurrencyParts(account.opening_balance, account.currency).value}` and `suffix` a `Typography className="font-sora text-content-secondary"` at `Type.meta`/`lineHeightFor(Type.meta)` holding `account.currency`, as `balance_currency_suffix.tsx:18-23` paints it, then `FieldMessageTrack helper={editAccountBalanceHelper}`); on a card nothing below the row. While `account` is undefined render the header alone. No `useState`, no `useSharedValue`; every size from `theme.ts`; all copy from `Strings`.
- Test: none, render layer; the emulator pass covers it (Screens below).

### 8. The route exists on the `(app)` Stack
- File: `src/app/(app)/accounts/[id]/edit/index.tsx` (new)
- Change: `export { default } from '@/modules/accounts/screens/accounts/edit_account';` and nothing else in that folder. `npm run typecheck` regenerates `.expo/types/router.d.ts` from `src/app` (`scripts/generate-typed-routes.js`), so `/accounts/${string}/edit` becomes a typed href from this step on.
- Test: none; `npx expo prebuild --no-install --platform android` in the parity chain resolves it.

### 9. The detail's Back pops and its Edit pushes the route
- File: `src/modules/accounts/screens/accounts/detail/account_detail.hook.ts` (`onBack`, `:378-384`; return object `:423-465`)
- Change: `onBack` becomes `() => router.back()`; add module-level `const editAccountRoute = (accountId: string): \`/accounts/${string}/edit\` => \`/accounts/${accountId}/edit\`` (typed as `stacked_route.ts:13-17`) and `goToEdit = () => router.push(editAccountRoute(id))`, returned. `beforeRemove`, `isEditing`, `handleSave`, `setEditing`, `createEditAccountSchema` and the form stay, unreachable, for MA-080.
- Test: `__tests__/screens/accounts/account_detail.hook.test.ts`: rewrite 'leaves edit mode instead of navigating back when editing' (`:552-560`) to assert `mockBack` called once and `mockSetEditing` not called while `isEditing` is true; add `goToEdit` pushes `'/accounts/acc-1/edit'`; the `beforeRemove` cases (`:562-574`, `:661-676`) stay untouched.

### 10. The detail's header never shows Save
- File: `src/modules/accounts/screens/accounts/detail/index.tsx` (`right`, `:168-197`; destructures `:39-82`)
- Change: `right` is the Edit `PressableFeedback` alone, `onPress={goToEdit}`, no `triggerEditToggle()`; the `isEditing` ternary and the Save pill go. Drop `isSaving`, `handleSave`, `setEditing` and `triggerEditToggle` from the destructures (unused after this, oxlint fails on them); `isEditing`, the `Controller` block and the anim's `headerStyle`, `fieldEntering`, `fieldExiting` stay for MA-080. The archived branch (`:80-87`) is unchanged.
- Test: none, render layer; step 9's hook test carries the behaviour.

### 11. The decision record
- File: `docs/adr/2026-09-16-account-edit-draft-precision.md` (new, shape of `2026-09-16-account-edit-credit-columns.md`)
- Change: Ticket #514 (MA-078) under #504; applies to `edit_account.helpers.ts`, `edit_account.hook.ts`, `account_form.helpers.ts`. §1 the draft formats stored money at `EDIT_ACCOUNT_DRAFT_DECIMALS` = 2, `roundMoney`'s persisted precision, through `formatAmount`'s `decimals` parameter (review.md M22), never the currency's display decimals: EGP's 0 would turn 1500.5 into 1,501 and a colour-only save would move the limit; `DECIMAL_PATTERN` admits the formatter's grouping. §2 every save sends the full editable set, name, colour and the five credit columns, through `toUpdateAccountInput`, unchanged values included, so one `UPDATE` (ADR 2026-09-16 §1) never reads a partial object. §3 MA-079 extends this record when it renders the draft.
- Test: none.

## Screens
- Edit account, bank (D1): reached from the bank detail's Edit; idle, footnote 'Changes apply everywhere this account appears.', Type and Currency locked with the glyph, the Type helper, Opening balance '40,000' with 'EGP' and its helper, Save changes flat gold.
- Edit account, bank, empty name: 'Enter a name for this account.' in the name rail, 'Fix the 1 fields marked above.' in the status track, nothing moved (compare against the idle shot).
- Account detail after a saved name and colour: the new title and dot read back.
- Edit account, card (D2), top: Name, Colour, Type 'Credit Card' and Currency locked with no helper, no Opening balance row, nothing below.
- F3 and the pop on a missing id are step 6's tests, not walked.

## Decision record
- `docs/adr/2026-09-16-account-edit-draft-precision.md`: the draft formats stored money at 2dp through a named `decimals` constant, and every save sends the full editable set; step 11 adds the file.

## Non-goals
- The card's credit block, its suffixes, the three shared strings' new wording, MA-079; the draft is built here and not rendered.
- Removing the inline edit's code, `beforeRemove`, `isEditing`, `createEditAccountSchema`, its strings and tests, MA-080.
- Any change to `account_form.tsx`, `use_account_form.hook.ts`, `account_form.state.ts`, `credit_card_fields.tsx`, `credit_card_slot.tsx`, `balance_currency_suffix.tsx`, or the colour sheet.
- Moving `OnboardingFooter` out of the onboarding folder; it is imported across modules as it stands.
- A discard dialog on Back; a `beforeRemove` on the edit screen.
- Any other route or layout change; the detail beyond its header action and `onBack`.
- Adjusting the current balance; widening the add form's duplicate check (MA-076).

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.
- Each new jest path passes `test -f` before it is cited anywhere (review.md, Gates).

## Risks
- HeroUI `TextField`'s `isDisabled` may not stop text input on Android; `editable={false}` on the three locked `Input`s is the belt.
- The typed href in step 9 compiles only after step 8's file exists and `npm run typecheck` regenerates the route types; commit 8 before 9 or together.
- A card row with `credit_limit` null (created before the credit fields) refuses every save with 'Fix the 1 fields marked above.' and no field marked until MA-079, by the same rule as the paid-down card.
- Reading `form.formState.errors` in the hook is what subscribes the count to RHF; reading it only in `index.tsx` would leave `statusMessage` stale.
- A landed write republishes `accounts`; the hook leaves before that render, so no reset effect is needed. If a later change keeps the screen mounted after a save, a reset keyed on `account.updated_at` is the fix, not one on object identity.
- `edit_account.helpers.ts` is a fourth caller of `formatAmount` with an explicit `decimals`; `scripts/validate-money-formatting.js` scans for `new Intl.NumberFormat(` only, so it stays green.
- Amended after review round 1: step 6's re-entry guard reads `getState()` instead of the render closure (two submits in one `act` both saw `saving: false`), step 1 drops `editAccountCtaBusy` for `u4CtaBusy` (copy the canvas does not carry), step 6's pop test adds the archived-present case, step 5's test moves beside its siblings under `__tests__/screens/accounts/`.

## Self-assessment
Step 2 is the step I am least sure about. The ticket says the rail takes "only additive optional props the add form does not pass", and I read that as a constraint on the add form's rendering rather than a literal prop, because a helper-only rail cannot sit on `useFormState` without a field name and a hook cannot be skipped, so I extract the presentational body as `FieldMessageTrack` and leave `FieldMessageRail`'s props untouched. If the reviewer wants a prop instead, the only shape that works is making `control` and `name` optional with an early presentational return before the hook, which violates the rules of hooks; the extraction is the safe reading. The schema placeholder in step 6 for a missing account is the other soft spot: it exists only so `useZodForm` has a schema on the render that pops, and a test asserts no write happens on that path.
