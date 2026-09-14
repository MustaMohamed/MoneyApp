# MA-051 — Key the commitment edit screen state by its owner
base: 662bb98ac4bab1bcbd66ad30a887dc829fbba134 · verify: emulator · flags: none · expected diff: ~150 lines

Pattern to copy, verbatim shape: `src/modules/commitments/screens/commitments/detail/detail.state.ts` (keyed entries, guarded setter at `:38-42`, `release`, test-only `reset`) over `src/utils/keyed_entries.ts` (`withEntry`, `withoutEntry`). Owner is `useId()` per mount, as at `detail.hook.ts:62`.

One difference from the detail: the detail's `setViewState` is an unguarded begin action because a first mount writes it before any await. Here `setSaving(false)` runs in a `finally` after the await, so no setter may create an entry. Each slot gets a `claim(owner)` action that opens the entry at its initial values (idempotent when the entry exists), called from the mount effect whose cleanup calls `release(owner)`. Every setter refuses an absent owner and returns the same state object.

Steps 1 and 2 typecheck together, not apart (step 1 changes the setter signatures step 2's hook calls); same for steps 3 to 5. Commit 1+2 as one commit and 3+4+5 as one commit.

## Steps
### 1. The edit slot is keyed by owner
- File: `src/modules/commitments/screens/commitments/edit_commitment/edit_commitment.state.ts`
- Change: `interface EditCommitmentUiEntry { saving: boolean; saveError?: string; deactivateDialogVisible: boolean }`, exported frozen `INITIAL_UI_ENTRY`, shape `KeyedEntries<EditCommitmentUiEntry>`. Actions: `claim(owner)` (`withEntry(state, owner, INITIAL_UI_ENTRY)` when absent, else `state`), `setSaving(owner, v)`, `setSaveError(owner, message?)`, `setDeactivateDialogVisible(owner, v)`, all three guarded (`if (!(owner in state.entries)) return state`), `release(owner)` via `withoutEntry`, `reset()` to `{ entries: {} }` for tests only. Field names and meanings unchanged.
- Test: `__tests__/screens/commitments_add_edit.state.test.ts`, the `useEditCommitmentState` describe rewritten on `entries` in the shape of `__tests__/screens/commitments_detail.state.test.ts`: starts empty; `claim` opens an entry equal to `INITIAL_UI_ENTRY`; `claim` on an existing entry keeps it (`toBe`); each setter on owner-b leaves owner-a's entry `toBe(before)`; each setter on an unclaimed owner leaves `entries` `toBe(before)`; a setter after `release` does not resurrect; `claim` after `release` reopens from initial; `release` removes only the released owner; `reset` drops every copy. The `useAddCommitmentState` describe is untouched.

### 2. Each edit copy owns its entry, and a failed deactivate shows the banner
- File: `src/modules/commitments/screens/commitments/edit_commitment/edit_commitment.hook.ts`
- Change: `const owner = useId()`; read `useEditCommitmentState(useShallow((s) => s.entries[owner] ?? INITIAL_UI_ENTRY))`; every setter call passes `owner`. The unmount effect at `:65-67` becomes `useEffect(() => { claim(owner); return () => release(owner); }, [owner, claim, release])`. The two `reset()` calls before navigating (`:97`, `:117`) become `release(owner)`; the `finally` `setSaving(owner, false)` then refuses, which is the post-unmount guard. The deactivate `catch` at `:120-122` becomes `setDeactivateDialogVisible(owner, false); setSaveError(owner, Strings.commitmentsSaveError)`. Returned `state` shape unchanged; `index.tsx` untouched.
- Test: `__tests__/screens/commitments_edit.hook.test.ts`, the `edit_commitment.state` mock (lines 37-42, 85-93) dropped for the real store, `useEditCommitmentState.getState().reset()` in `beforeEach`; the failure case asserts `result.current.state.saveError === Strings.commitmentsSaveError` and `mockRouterDismissTo` not called. New cases, `deferred<T>()` copied from `commitments_detail.hook.test.ts:81`: (a) two copies mounted, a rejected save on A sets A's `saveError` and leaves B's undefined, `handleDeactivate` on B leaves A's `deactivateDialogVisible` false; (b) two mounted give two `entries` keys, unmounting the upper leaves one key holding the lower's shown error, unmounting the lower leaves `{}`; (c) a save whose `updateCommitment` resolves after unmount leaves `entries` `{}`; (d) same for a deactivate; (e) a rejected `deactivateCommitment` on the confirming copy closes its sheet and sets its `saveError`, the other copy's entry `toBe(before)`. The seven existing navigation cases stay as they are.

### 3. The form body slot is keyed by owner
- File: `src/modules/commitments/screens/commitments/components/commitment_form_body.state.ts`
- Change: same shape as step 1 over `{ categoryPickerVisible, accountPickerVisible, showStartDatePicker, showEndDatePicker }`, exported frozen `INITIAL_PICKER_ENTRY`, `claim`, four guarded setters taking `(owner, v)`, `release`, test-only `reset`.
- Test: `__tests__/screens/commitments_form_body_state.test.ts` rewritten on `entries`, the same nine shapes as step 1's list.

### 4. One hook binds the slot to a mount
- File: `src/modules/commitments/screens/commitments/components/commitment_form_body.hook.ts` (new)
- Change: `useCommitmentFormBodyPickers()` takes the owner from `useId()`, runs the `claim`/`release` mount effect, reads the entry with `useShallow(... ?? INITIAL_PICKER_ENTRY)`, and returns the four flags plus four setters already bound to the owner, `(v: boolean) => void`. No `useState`.
- Test: `__tests__/screens/commitments_form_body.hook.test.ts` (new, `renderHook`, no render): two instances mounted, a picker opened on one is closed on the other; unmounting one leaves the other's open picker as it was and its key alone in `entries`; unmounting both leaves `{}`.

### 5. The form body uses the hook
- File: `src/modules/commitments/screens/commitments/components/commitment_form_body.tsx` (`:107-121`)
- Change: the `useShallow` read, the four `getState()` setter bindings and the `useEffect(... reset(), [])` are replaced by one `useCommitmentFormBodyPickers()` call; the call sites at `:172-184`, `:298`, `:376`, `:414-417`, `:475`, `:483` keep their `(v)` shape. Drop the `useEffect` import at `:5` (`useMemo` stays) and the `useShallow` import at `:8`, both unused after the collapse; lint fails the commit otherwise. Props, JSX, `add_commitment/index.tsx` and `edit_commitment/index.tsx` untouched.
- Test: none, no render tests; step 4 covers the wiring.

## Screens
- Edit commitment, tabbed, one walk under a temporary throw at the top of `deactivate` in `src/modules/commitments/repositories/commitment.repository.ts:133` (not committed): the deactivate sheet open; after Confirm, the sheet closed and the form body's error banner reading `Strings.commitmentsSaveError`, the screen still mounted. Nothing else; the isolation is asserted in steps 2 and 4.

## Non-goals
- The pay sheet slot (MA-050), the detail's spinner and error view state (MA-052), the account lookup slot (MA-043).
- H14's mark-as-paid and add-commitment sites.
- The add screen's `add_commitment.state.ts`, `add_commitment.hook.ts` and `commitments_add.hook.test.ts`.
- The transaction detail's inline `withEntry`; the keyed slots of MA-041 and MA-044.
- `decimal_amount_input.state.ts`, already per instance.
- `attachMockSelectorStore`: flat-only, stays flat; the edit hook test stops using it for the edit state.
- Any change to `updateCommitment`, `deactivateCommitment`, their SQL, the schema, the defaults or the save payload.
- Clearing `saveError` at the start of `confirmDeactivate`: same string either way, nothing visible changes.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.
- `mqa needs-build` before the render pass; the diff is JS-only.

## Risks
- Two `renderHook` roots in one test must get distinct `useId()` values; `commitments_detail.hook.test.ts:331-345` already relies on this at React 19.2.3.
- The edit hook test mocks `useShallow` as identity (`:19`); the keyed read returns a stable reference (`entries[owner]` or the frozen initial), so no render loop. If the implementer drops the mock, nothing changes.
- The redirect effect at `edit_commitment.hook.ts:50-52` fires in the lower copy too when a deactivate removes the commitment. Existing behaviour, not touched; a hook test on two copies of the same commitment will see `mockRouterBack` called by both after a deactivate. Assert on `entries`, not on `router.back` counts.
- `release(owner)` before navigating leaves the same render as today's `reset()` (initial values) until the unmount; if a lens flags the guard-refused `setSaving(false)` in `finally` as dead, it is not: it is the post-unmount path of acceptance line 3.

## Self-assessment
Step 4 is the one I am least sure of. The ticket puts the form body's `useId()` "in the component" and lists no new file; I add a 30-line hook next to the component so the add-plus-edit picker isolation and the release on unmount get a jest assertion instead of an emulator walk. If the reviewer reads the ticket as forbidding the extra file, fold the hook body back into `commitment_form_body.tsx:107-121` and drop the step 4 test; the state test in step 3 then carries the isolation and the wiring goes unasserted.
