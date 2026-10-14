# MA-188 — Edit commitment keeps what the user typed when the commitments reload
base: b005195bb96b873642d8154d28cf47ad85d9334b · verify: emulator · flags: none · expected diff: ~110 lines

Size recount: 4 files outside tests, lines the PR adds against base: `src/utils/use_route_draft.hook.ts` ~55 (new), `src/modules/commitments/screens/commitments/edit_commitment/edit_commitment.hook.ts` ~28, `src/modules/accounts/screens/accounts/edit_account/edit_account.hook.ts` ~24, `.claude/skills/emulator-verify/features/add_commitment.md` 2. The ticket's `Size:` line missed the features file (splitting.md § Size gate, `Verify emulator`), the shared hook and `edit_account.hook.ts`. 7 steps.

## Steps

### 1. Edit commitment re-drafts only when its route opens on another commitment
- File: `src/modules/commitments/screens/commitments/edit_commitment/edit_commitment.hook.ts` (the reset effect, `:63-66`; `useRef` joins the `react` import at `:2`)
- Change: add `draftedIdRef = useRef<string | undefined>(commitment ? id : undefined)`. It holds the id the form has a draft of. It is `undefined` until a commitment is drafted, so a commitment that loads after mount still drafts as it does today. Replace the effect. When `commitment` is defined and `draftedIdRef.current !== id`, it sets the ref to `id`, calls `form.reset(buildEditDefaults(commitment))`, `setSaveError(owner, undefined)` and `setDeactivateDialogVisible(owner, false)`. Deps are `[id, commitment, form, owner, setSaveError, setDeactivateDialogVisible]`, and the `exhaustive-deps` disable goes. A reload that publishes a new object for the same id changes nothing. `saving` is left alone, because it belongs to the write in flight. Pattern: `edit_account.hook.ts:74-83`.
- Test: `first` · `__tests__/screens/commitments_edit.hook.test.ts`, a new `describe('MA-188 …')` block. `setup()` reads a mutable `commitments` array per render, as `__tests__/screens/accounts/edit_account.hook.test.ts:84-101` does, and `openOn(id)` sets `mockParams` and rerenders. Add a `second` commitment (`com-2`) that differs from `commitment` in every form field. Cases:
  - A reload (`commitments = [{ ...commitment }, second]`, rerender) keeps a typed `name`.
  - After `openOn('com-2')`, `form.getValues()` equals `buildEditDefaults(second)`.
  - A settled save failure on `com-1` reads `state.saveError` undefined after `openOn('com-2')`.
  - A confirmation opened with `handleDeactivate()` reads `state.deactivateDialogVisible` false after `openOn('com-2')`.
  - Mounting with `commitments = []`, then rerendering with `[commitment]`, gives `buildEditDefaults(commitment)`.

### 2. Save and deactivate write only the drafted commitment, and a late result after a switch lands nowhere
- File: same (`onValid` `:81-110`, `confirmDeactivate` `:116-131`)
- Change: `onValid(data)` and `confirmDeactivate()` each start with `if (!commitment || useEditCommitmentState.getState().entries[owner]?.saving) return;`, which replaces `if (!id) return;`. A Save or Confirm on an id the loaded commitments lack therefore writes nothing. Only one write runs per screen at a time, so a late `setSaving(owner, false)` never clears the spinner of another write. Both write with `commitment.id`. After the await, when `draftedIdRef.current !== commitment.id`, a success returns before it closes the dialog or navigates. A failure sets no `saveError` and does not close the dialog. `finally { setSaving(owner, false) }` stays. Pattern: `edit_account.hook.ts:91-112`.
- Test: `first` · same file and block. Cases:
  - After `openOn('com-missing')`, `router.back` is called, and `onSubmit()` and `confirmDeactivate()` call neither `updateCommitmentMock` nor `deactivateCommitmentMock`.
  - A `com-1` save held by `deferred()` that resolves after `openOn('com-2')` calls none of `dismissTo`, `back` or `dismissAll`.
  - The same save that rejects after the switch leaves `saveError` undefined.
  - In both save cases, `updateCommitmentMock` is called once, with `'com-1'`, and `saving` reads false after the settle.
  - A held `com-1` deactivate resolves after the switch and after `handleDeactivate()` reopens the confirmation on `com-2`. It calls none of `replace`, `dismissTo` or `dismissAll`, and `deactivateDialogVisible` stays true.
  - The same deactivate rejects after `handleDeactivate()` reopens the confirmation on `com-2`. `saveError` stays undefined and `deactivateDialogVisible` stays true.
  - An `onSubmit()` on `com-2` while the `com-1` save is in flight leaves `updateCommitmentMock` called once.
  - A `confirmDeactivate()` while a save is in flight does not call `deactivateCommitmentMock`.

### 3. A Save begun on the first commitment leaves the second commitment's form unsubmitted
- File: same (the returned `onSubmit`, `:146`)
- Change: `onSubmit` becomes `async function onSubmit(): Promise<void>`, with no arguments. It records `startedOn = draftedIdRef.current` and awaits `form.handleSubmit(onValid)()`. When `draftedIdRef.current !== startedOn`, it calls `form.reset(undefined, { keepValues: true, keepDefaultValues: true, keepDirty: true, keepTouched: true, keepErrors: true })`, because `handleSubmit` marks the form submitted after `onValid` returns. The return key stays `onSubmit`. Its type narrows from `(e?: BaseSyntheticEvent) => Promise<void | undefined>` to `() => Promise<void>`. Its consumers, `edit_commitment/index.tsx:21` (`() => void onSubmit()`) and the suite, pass no argument. Pattern: `edit_account.hook.ts:114-127`.
- Test: `first` · same file and block, an `it.each` over resolves and rejects. Hold a `com-1` save in flight, call `openOn('com-2')`, then `setValue('name', 'Typed on second', { shouldDirty: true, shouldTouch: true })`, then settle. Expect `formState.isSubmitted` false, `submitCount` 0, the typed name kept, and `getFieldState('name')` dirty and touched.

### 4. `add_commitment.md` carries the switch state
- File: `.claude/skills/emulator-verify/features/add_commitment.md` (§ States, § Gotchas)
- Change: append one States row and one Gotchas line.
  - State: `second commitment by deep link on the mounted screen`. Frame: `no frame, MA-188`.
  - Force: two active commitments made through `/commitments/add`: `Walk Gym`, fixed 900 EGP, and `Walk Cloud`, fixed 15 USD, with any category and no default account. Read `Walk Cloud`'s id with `mqa db "select id from commitments where name = 'Walk Cloud'"`. Run `$MQA open /commitments` first, so the list's focus load fills the store. A cold deep link to an edit route leaves at once (`edit_commitment.hook.ts:53-55`). Then `$MQA tap '~Walk Gym'` and `$MQA tap 'Edit'`, which opens the tabbed `/commitments/<id>/edit`. Take the Name by the `@ref` of its `field "Walk Gym"` line and run `$MQA tap <@ref>`, `$MQA clear`, `$MQA type 'Typed draft'`. Then `$MQA tap 'label="Deactivate Commitment"'` and `$MQA wait 'text="Deactivate this commitment?"'`. Then `$MQA open /commitments/<Walk Cloud's id>/edit`, the tabbed twin, with no relaunch between.
  - Proof: `mqa read` holds `field "Walk Cloud"`, `field "15"` and `group "USD" [selected]`. `grep -c 'Deactivate this commitment?'` over the read is 0. One `mqa back` lands on `Walk Gym`'s detail, not on an edit form. At base the same walk leaves `Deactivate this commitment?` open over `Walk Cloud`'s fields, and one `mqa back` only closes the sheet. `grep -c 'Typed draft'` reads 0 at head and at base, because base re-drafts when the commitment object changes. Only the dialog count and the `mqa back` landing tell head from base. One shot after the link.
  - Gotchas line: `MA-188: a deep link to the tabbed /commitments/<id>/edit of a second commitment keeps the mounted screen and re-drafts every field from the new id (edit_commitment.hook.ts); one frame may still draw the first commitment's fields. The stacked link /stacked/commitments/<id>/edit pushes a fresh stacked edit screen over it instead.`
- Test: `none` · a features file; the implementer and the render lens run it.

### 5. One shared hook keys a form's draft on the route's id and moves its refs inside the commit
- File: `src/utils/use_route_draft.hook.ts` (new, `useRouteDraft`). `useLayoutEffect` precedent: `src/modules/transactions/screens/transactions/transaction_form/components/rate_editor_sheet.hook.ts:30`.
- Change: `useRouteDraft<TEntity extends { id: string }, TValues extends FieldValues>(options)` takes one argument, an object whose fields are all required and none `null`:
  - `id: string`, the route's id.
  - `entity: TEntity | undefined`, `undefined` when the loaded list lacks `id`.
  - `form: UseFormReturn<TValues>`, the `useZodForm` return (hover: `UseFormReturn<CommitmentFormValues, any, …>`, `UseFormReturn<EditAccountFormData, any, …>`).
  - `buildDraft: (entity: TEntity) => TValues`.
  - `onRedraft: () => void`, run after every re-draft.
  - `isBusy: () => boolean`, true while the screen's write is in flight.
  - Returns `{ isCurrent: (entityId: string) => boolean; submit: (onValid: SubmitHandler<TValues>) => Promise<void> }`, both never `null`.
  - Body: `routeIdRef = useRef(id)`. `draftedIdRef = useRef<string | undefined>(entity ? id : undefined)`, the commitment start value: edit_account's `useRef(id)` differs only on a mount whose account is missing, which leaves through `router.back()`. One `useLayoutEffect`, deps `[id, entity, form, buildDraft, onRedraft]`, sets `routeIdRef.current = id`. When `entity` is defined and `draftedIdRef.current !== id`, it also sets `draftedIdRef.current = id`, calls `form.reset(buildDraft(entity))`, then `onRedraft()`. React runs it inside the commit, so no tap and no promise continuation sees the new route with the old refs (F1). `isCurrent(entityId)` is `routeIdRef.current === entityId && draftedIdRef.current === entityId`, so it reads false for the first entity once the route opens on a missing id (F2). `submit(onValid)` returns at once when `isBusy()`, so a refused Save neither validates nor marks the form (F3). Otherwise it is `edit_commitment.hook.ts:121-134` as it stands: `startedOn = draftedIdRef.current`, `await form.handleSubmit(onValid)()`, then the `keep*` reset when `draftedIdRef.current !== startedOn`. Comments: one line at the refs on the id key, one at the effect on the layout timing, one at the unmark; no other.
- Test: `first · owned by implementer` · `__tests__/utils/use_route_draft.hook.test.ts` (new, logic-only `.ts`). A probe hook calls `useForm<{ name: string }>`, then `useRouteDraft` over `{ id, entities }` props, then a `useLayoutEffect` that pushes `[isCurrent('e-1'), isCurrent('e-2')]` to `reads` on every commit; `isBusy` reads a module `busy` flag. Cases:
  - A rerender naming `e-2`: the first entry it adds to `reads` is `[false, true]`, `form.getValues()` equals `e-2`'s draft, `onRedraft` called once. A hook that drafts in `useEffect` adds `[true, false]` first.
  - A rerender naming an id the entities lack: first new entry `[false, false]`, the typed `name` kept, `onRedraft` not called.
  - A rerender with a new object for `e-1`: the typed `name` kept, `onRedraft` not called, `isCurrent('e-1')` true.
  - A mount with `entities: []`, then a rerender with `[e1]`: `form.getValues()` equals `e-1`'s draft and `isCurrent('e-1')` is true.
  - `submit(onValid)` while `busy` is true: `onValid` not called, `formState.isSubmitted` false, `submitCount` 0.

### 6. Edit commitment writes and lands results only through the shared hook
- File: `src/modules/commitments/screens/commitments/edit_commitment/edit_commitment.hook.ts` at `6eebb6e0` (`:2`, `:63-71`, `:87-88`, `:109-110`, `:114-115`, `:121-134`, `:141`, `:145-146`, `:151`)
- Change: `:63-71` becomes three declarations, in this order. First, one read site for the in-flight flag (F6), `const isSaving = (): boolean => useEditCommitmentState.getState().entries[owner]?.saving === true;`, with the `:87` comment moved onto it. Second, `const onRedraft = (): void => { setSaveError(owner, undefined); setDeactivateDialogVisible(owner, false); };`. Third, `const { isCurrent, submit } = useRouteDraft({ id, entity: commitment, form, buildDraft: buildEditDefaults, onRedraft, isBusy: isSaving })`. `:88` and `:141` become `if (!commitment || !isCurrent(commitment.id) || isSaving()) return;`, which refuses a stale handler (F1). `:110`, `:146` and `:151` test `!isCurrent(commitment.id)`; `:115` tests `isCurrent(commitment.id)`. `onSubmit` becomes `(): Promise<void> => submit(onValid)`, so `index.tsx:21` sees the same type. `useRef` leaves the `:2` import. Comments `:64`, `:109`, `:114`, `:124` and `:145` go (F4); `:152` stays.
- Test: `first · owned by implementer` · `__tests__/screens/commitments_edit.hook.test.ts`, the MA-188 block. F2 and F3 fail at `6eebb6e0`; F5 passes there and guards the move.
  - F2, `it.each(settles)`: a `com-1` save held by `startSave` settles after `openOn('com-missing')`. `updateCommitmentMock` is called once, with `'com-1'`. `mockRouterBack` is called (the leave). `dismissTo`, `dismissAll` and `replace` are not called, and `saveError` is undefined.
  - F2, `it.each(settles)`: the same for a `com-1` deactivate held by `startDeactivate`, with `deactivateCommitmentMock` called once with `'com-1'`.
  - F3: the case at `:607` reads `formState.isSubmitted` and `formState.submitCount` once right after `renderHook`, before `startSave`, as `:640-641` does, so react-hook-form re-renders on the submit's publish. It then expects `isSubmitted` false and `submitCount` 0 right after the refused `onSubmit()`.
  - F5: after `openOn('com-2')`, `onSubmit()` calls `updateCommitmentMock` once with `'com-2'`, and `dismissTo('/commitments')`.
  - F5: after `openOn('com-2')`, `handleDeactivate()` then `confirmDeactivate()` calls `deactivateCommitmentMock` with `'com-2'`, and `replace('/commitments')`. Prior art: `__tests__/screens/accounts/edit_account.hook.test.ts:626`, `:650`.

### 7. Edit account uses the shared hook
- File: `src/modules/accounts/screens/accounts/edit_account/edit_account.hook.ts` (`:2`, `:74-83`, `:92-93`, `:100-101`, `:106-107`, `:114-127`, `:137`)
- Change: `:74-83` becomes three declarations, in this order. First, `const isSaving = (): boolean => useEditAccountState.getState().entries[owner]?.saving === true;`, with the `:92` comment moved onto it. Second, `const onRedraft = (): void => { setSaveError(owner, undefined); useAccountColorSheetState.getState().close(); };`, with the `:81` comment on the `close()` line. Third, `const draft = useRouteDraft({ id, entity: account, form, buildDraft: buildEditAccountDraft, onRedraft, isBusy: isSaving })`. `:93` becomes `if (!account || !draft.isCurrent(account.id) || isSaving()) return;`. `:101` tests `draft.isCurrent(account.id)` and `:107` tests `!draft.isCurrent(account.id)`. `console.error` at `:99` stays unconditional. `submit` becomes `(): Promise<void> => draft.submit(onValid)`, returned under the same key at `:137` for `index.tsx:159`. `useRef` leaves the `:2` import. Comments `:75`, `:100`, `:106` and `:117` go.
- Test: `none` · the dispatch keeps `__tests__/screens/accounts/edit_account.hook.test.ts` unchanged; it stays green, and its MA-186 block (`:592-857`) runs through the shared hook.

## Screens
- `emulator-verify/features/add_commitment.md`: second commitment by deep link on the mounted screen (new, added by step 4)

## Non-goals
- The category, account and date pickers stay as they are through a switch. They stage nothing outside the form, and a pick writes the form on screen (`commitment_form_body.tsx:172`, `:177`).
- No change to the reloads in `commitment.store.ts`, or to the resets at `add_commitment.hook.ts:63` and `pay_sheet.hook.ts:286`, which follow their own save or prefill.
- No change to `edit_commitment/index.tsx`, `CommitmentFormBody` or `strings.ts`. No `.tsx` test.
- No change to `edit_account/index.tsx`, `edit_account.helpers.ts`, `edit_account.state.ts` or `__tests__/screens/accounts/edit_account.hook.test.ts`.
- The deactivate success's `router.replace` followed by the reload's `router.back()` on one commitment stays as it is (triage: code-review #3, rejected).

## Untested inputs
- A tap or a late result between the commit that names the second commitment and its effects, on either screen hook. `act` flushes both effect phases, so only step 5's probe reaches the gap, in the shared hook.
- Two edit account inputs that step 7 changes, covered only through step 5's cases: a first-account result landing after the route opens on a missing id, which navigates nowhere after step 7 where `b005195b` runs `dismissTo` at `:111`; and a Save refused while a write is in flight, which leaves the form unsubmitted after step 7 where `b005195b` marks it. The edit account suite stays unchanged, and `:557` writes once with or without the `isBusy` wiring (step 7).
- A Save or Confirm through a handler captured on the first commitment and called after the switch. Step 6's `isCurrent` guard refuses it; no case calls a captured handler, because the dispatch limits the commitments suite to F2, F3 and F5 (step 6).
- The amount text when the second commitment's stored amount equals the number the first commitment's half-typed text holds. `DecimalAmountInput` syncs its text only when the value changes (`decimal_amount_input.tsx:21-27`), so `48.` stays `48.` (step 1).
- A picker sheet open at the switch (Non-goals).

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- `not probed: add_commitment.md · second commitment by deep link on the mounted screen`, the Force's creation of `Walk Gym` and `Walk Cloud` through `/commitments/add`. The probe walked commitments already on the device (`probe-cm-long`, 640 EGP; `ship-cm-usd`, 20 USD).
- `REBUILD: none`, build REUSE.
- Step 5 resets the form from a layout effect. If react-hook-form drops or defers a `reset` published inside the commit, step 1's switch case and the MA-186 switch cases fail; fall back to `useEffect` for the reset and keep `routeIdRef` in the layout effect.
- Step 7 adds the `isBusy` check before `handleSubmit` on edit account. `edit_account.hook.test.ts:557` taps twice in one frame, where both taps pass that check and the second is refused in `onValid`, so its one-write assertion holds.
- Two of step 1's cases pass at base by design, because base re-drafts whenever the commitment object changes (`edit_commitment.hook.ts:63-66`). They are the `buildEditDefaults(second)` switch case and the mount-then-load case. Both guard behaviour base already has. Check that every other `first` case fails at base before the hook changes.

## Amendments
- `2026-10-14 · step 5 · added: F1, F2, F3 and F7 of cycle 1 at 6eebb6e0 put the id-keyed draft, the late-result check and the submit unmark in one shared hook that moves its refs inside the commit`
- `2026-10-14 · step 6 · added: edit commitment uses the shared hook, refuses a stale handler, reads the in-flight flag at one site and drops five comments (F1, F2, F3, F4, F5, F6)`
- `2026-10-14 · step 7 · added: edit account uses the shared hook, so the F1 window closes there too (F7)`

## Self-assessment
The step I am least sure of is step 5's layout effect. Moving the refs into the commit closes the F1 window only because React runs layout effects before any event handler or promise continuation, and no Jest case can put a tap in that gap. The probe case shows the refs move before passive effects, which is the closest a test gets. The `form.reset` inside that effect re-renders react-hook-form during the commit, which `rate_editor_sheet.hook.ts:30` does not do, so the MA-186 and MA-188 switch cases are the first check that it publishes. Step 4's Force creation of `Walk Gym` and `Walk Cloud` is still unwalked.
