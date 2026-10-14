# MA-188 — Edit commitment keeps what the user typed when the commitments reload
base: b005195bb96b873642d8154d28cf47ad85d9334b · verify: emulator · flags: none · expected diff: ~50 lines

Size recount: 2 files outside tests, `src/modules/commitments/screens/commitments/edit_commitment/edit_commitment.hook.ts` ~45 and `.claude/skills/emulator-verify/features/add_commitment.md` ~3. The ticket's `Size:` line missed the features file (splitting.md § Size gate, `Verify emulator`). 4 steps.

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

## Screens
- `emulator-verify/features/add_commitment.md`: second commitment by deep link on the mounted screen (new, added by step 4)

## Non-goals
- The category, account and date pickers stay as they are through a switch. They stage nothing outside the form, and a pick writes the form on screen (`commitment_form_body.tsx:172`, `:177`).
- No change to the reloads in `commitment.store.ts`, or to the resets at `add_commitment.hook.ts:63` and `pay_sheet.hook.ts:286`, which follow their own save or prefill.
- No change to `edit_commitment/index.tsx`, `CommitmentFormBody` or `strings.ts`. No `.tsx` test.

## Untested inputs
- A first-commitment save or deactivate that lands after the route opens on an id the commitments lack. The ref stays on the first commitment, so a success still navigates while the screen leaves through `router.back()` (step 2).
- The amount text when the second commitment's stored amount equals the number the first commitment's half-typed text holds. `DecimalAmountInput` syncs its text only when the value changes (`decimal_amount_input.tsx:21-27`), so `48.` stays `48.` (step 1).
- A picker sheet open at the switch (Non-goals).

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- `not probed: add_commitment.md · second commitment by deep link on the mounted screen`, the Force's creation of `Walk Gym` and `Walk Cloud` through `/commitments/add`. The probe walked commitments already on the device (`probe-cm-long`, 640 EGP; `ship-cm-usd`, 20 USD).
- `REBUILD: none`, build REUSE.
- Two of step 1's cases pass at base by design, because base re-drafts whenever the commitment object changes (`edit_commitment.hook.ts:63-66`). They are the `buildEditDefaults(second)` switch case and the mount-then-load case. Both guard behaviour base already has. Check that every other `first` case fails at base before the hook changes.

## Self-assessment
The step I am least sure of is step 1's ref start value. The hook change copies MA-186's shipped shape line for line, except that `draftedIdRef` starts `undefined` when no commitment is loaded at mount. MA-186 has no case that covers this. The mount-then-load case in step 1 passes at base and at head, so the case guards the departure but cannot show that it is needed. Step 4's deep link is settled by the probe: the tabbed twin keeps the mounted screen. Its creation of `Walk Gym` and `Walk Cloud` was not walked.
