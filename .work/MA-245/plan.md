# MA-245 — One form-session protocol for the commitment and transaction sheet hosts
base: 0da351eb82ff4a80dc402db75d8b37c6b7833644 · verify: none · flags: none · expected diff: ~195 lines

## Steps
### 1. The transaction add and edit session components sit in `transaction_form/components/`
- File: `git mv` `src/modules/transactions/screens/transactions/transaction_form/add_transaction_session.tsx` and `edit_transaction_session.tsx` into `src/modules/transactions/screens/transactions/transaction_form/components/`; `src/modules/transactions/screens/transactions/transaction_form/index.tsx:8,10`; `docs/adr/2026-09-27-account-strip-one-write.md:6`
- Change: only import specifiers change. The relative imports become `../` (`add_transaction_session.tsx:12-15`, `edit_transaction_session.tsx:11-14`), and the absolute `@/` imports stay as they are. `index.tsx` imports both from `./components/`. The ADR's `Applies to` names the new path of `add_transaction_session.tsx`. No re-export stays at the old path (ADR 2026-10-18 §3).
- Test: none · a move with no behaviour change. In this step, `__tests__/screens/transactions/transaction_form/transaction_form_host.test.tsx:89-103` retargets both `jest.mock` paths to `…/transaction_form/components/…` and drops `{ virtual: true }`, so a stale path fails to resolve and is not mocked silently. `__tests__/screens/transactions/transaction_form/transaction_form_sessions.test.tsx:121-122` imports from the new paths.

### 2. One shared form-session protocol exists
- File: `src/utils/use_form_session.hook.ts` (new)
- Change: exports these, each field required and never `null` unless a field says otherwise:
  - `FormSessionPhase = 'closed' | 'open' | 'closing'`
  - `FormSessionSubmit = () => Promise<void>`
  - `RegisterFormSessionSubmit = (sessionId: number, submit: FormSessionSubmit | undefined) => void`: `submit` is a required argument, and `undefined` unregisters.
  - `FormSessionFooter { saving: boolean; disabled?: boolean }`: `disabled` is optional, and absent means not disabled. Both module footer types satisfy it as they are. The commitment Save has no disabled state, and none is added (ticket Rules).
  - `FormSessionSnapshot { phase: FormSessionPhase; sessionId: number; footer: FormSessionFooter; sessionSaving: boolean }`
  - `FormSessionHostSource { read: () => FormSessionSnapshot; subscribe: (onChange: () => void) => () => void; requestClose: () => boolean }`: each host declares one as a module-level constant, so its identity is stable.
  - `subscribeToAll(stores: readonly { subscribe: (listener: () => void) => () => void }[]): (onChange: () => void) => () => void`: subscribes to every store and returns one unsubscribe that removes them all.
  - `useFormSessionHost(source: FormSessionHostSource): { state: { isDismissable: boolean }; registerSubmit: RegisterFormSessionSubmit; handleSave: () => void; handleOpenChange: (open: boolean) => void; handleClose: () => void }`
  - `FormSessionOptions<F extends object> { sessionId: number; submit: FormSessionSubmit; footer: F; onRegisterSubmit: RegisterFormSessionSubmit; publishFooter: (sessionId: number, footer: F) => void }`
  - `useFormSession<F extends object>(options: FormSessionOptions<F>): void`

  Invariants of `useFormSessionHost`:
  - `hasSession` and `isDismissable` come from `useSyncExternalStore(source.subscribe, …)`. Each getter returns a boolean, never an object. `isDismissable` is `!footer.saving && !sessionSaving`, the session-saving read behind the dismiss rule (Decisions 2026-10-23).
  - While `phase !== 'closed'`, one `hardwareBackPress` listener calls `source.requestClose()` and returns `true`. It is removed on close and on unmount, as at `commitment_form_host.hook.ts:48-56`.
  - When `phase` becomes `'closed'`, the registration and the in-flight mark clear.
  - `registerSubmit` ignores an id other than `source.read().sessionId`.
  - `handleSave` starts nothing when any of these hold: `phase !== 'open'`, `footer.disabled === true`, `footer.saving`, `sessionSaving`, the in-flight mark equals `sessionId`, or there is no registration or its `sessionId` is not the current one. Otherwise it marks the session in flight and calls `submit` once. It clears the mark only while the mark still holds that session id, and it clears it when the promise resolves, when it rejects, and when `submit` throws synchronously. This body moves from `transaction_form_host.hook.ts:71-105`.
  - `handleOpenChange(false)` and `handleClose()` call `source.requestClose()`. `handleOpenChange(true)` does nothing.

  Invariants of `useFormSession`:
  - It registers a stable submit that calls the latest `submit`, the ref at `commitment_form_session.hook.ts:27-29` moved unchanged. It registers on mount and on a `sessionId` change, and it unregisters with `undefined` on cleanup.
  - It publishes `footer` on mount, and again only when `sessionId` changes or a footer field changes under `shallow` from `zustand/shallow` (already read at `src/modules/transactions/store/transactions.store.ts:2`).
  - A rerender with an equal footer publishes nothing. An effect keyed on the `footer` object would loop: publish, host rerender, a new footer object, publish again.

  The file imports nothing from `src/modules/` (ADR 2026-10-18 §2).
- Test: first · `__tests__/utils/use_form_session.hook.test.ts`, made by `git mv` of `__tests__/screens/commitments/commitment_form_session.hook.test.ts`. Its first three cases are retargeted at `useFormSession` with a `jest.fn` `publishFooter`. The fourth case, the older-session footer, is a store guard. `__tests__/screens/commitments/commitment_form_host.state.test.ts:217` already holds it, so it is dropped. New cases:
  - a rerender with an equal footer publishes nothing, and a changed field publishes once.
  - a rerender with a new `sessionId` and an equal footer unregisters the old id, registers the new one, and publishes once under the new id.
  - `subscribeToAll` over two fake stores: its unsubscribe calls both removers.
  - `useFormSessionHost` over a test-local zustand store source:
    - one Save runs the current submit once.
    - Save runs nothing while closing, while `disabled`, while `saving`, while `sessionSaving`, or as a second tap before the first settles.
    - after a reject, and after a synchronous throw, the next tap runs it.
    - a submit registered under an older id never runs, and neither does one registered before a close and reopen.
    - a pending submit of a closed session does not block the next session's Save.
    - an older session's submit that settles after the next session's Save has started leaves the newer session's mark, so that session's second tap stays refused.
    - back calls `requestClose` and returns `true`; no listener is added while closed; the listener is removed once closed.
    - `isDismissable` follows `saving` and `sessionSaving` as the store changes.
    - `handleOpenChange(false)` and `handleClose` request a close, and `handleOpenChange(true)` does not.

### 3. The commitment host and its sessions run on the shared protocol
- File: `src/modules/commitments/screens/commitments/commitment_form/commitment_form_host.hook.ts`, `.../commitment_form/components/add_commitment_session.tsx`, `.../commitment_form/components/edit_commitment_session.tsx`. Delete `.../commitment_form/commitment_form_session.hook.ts`.
- Change:
  - The host declares `COMMITMENT_FORM_SESSION_SOURCE`:
    - `read` builds the snapshot from `useCommitmentFormHostState.getState()`: `phase`, `sessionId`, `footer`, and `sessionSaving: isCommitmentFormSessionSaving(mode)`.
    - `subscribe` is `subscribeToAll([useCommitmentFormHostState, useAddCommitmentState, useEditCommitmentState])`.
    - `requestClose` calls the store's `requestClose`.
  - The host takes `registerSubmit`, `handleSave`, `handleOpenChange`, `handleClose` and `state.isDismissable` from `useFormSessionHost`.
  - These go: `CommitmentFormSubmit`, `RegisterCommitmentFormSubmit` and `RegisteredSubmit` (`:14-23`), the saving reads (`:35-38`), and the refs, effects and handlers (`:41,43-87`). `hasSession` at `:42` stays, because the return reads it at `:114` and `commitment_form/index.tsx:31,40,48` reads `state.hasSession`.
  - The return shape of `useCommitmentFormHost` is unchanged, so `commitment_form/index.tsx` does not change.
  - Both sessions call `useFormSession` with `publishFooter: useCommitmentFormHostState.getState().publishFooter`, and type `onRegisterSubmit` as `RegisterFormSessionSubmit`.
  - Save now also refuses a second tap before the first settles (Acceptance 2).
- Test: first · `__tests__/screens/commitments/commitment_form_host.hook.test.ts` adds "starts no second save before the first settles, and after a failed save the next Save starts one", which fails at base. The `CommitmentFormSubmit` import becomes `FormSessionSubmit` from `@/utils/use_form_session.hook`. Every existing case passes unchanged.

### 4. The transaction host and its sessions run on the shared protocol
- File: `src/modules/transactions/screens/transactions/transaction_form/transaction_form_host.hook.ts`, `.../transaction_form/components/add_transaction_session.tsx`, `.../transaction_form/components/edit_transaction_session.tsx`. Delete `.../transaction_form/transaction_form_session.hook.ts`.
- Change:
  - The host declares `TRANSACTION_FORM_SESSION_SOURCE`:
    - `read` builds the snapshot from `useTransactionFormState.getState()`: `phase`, `sessionId`, `footer`, and `sessionSaving: isTransactionFormSessionSaving(mode)`.
    - `subscribe` is `subscribeToAll([useTransactionFormState, useAddTransactionState, useEditTransactionState])`.
    - `requestClose` calls the store's `requestClose`.
  - The host takes the same five values from `useFormSessionHost`.
  - These go: `TransactionFormSubmit`, `RegisterTransactionFormSubmit` and `RegisteredSubmit` (`:15-24`), both refs (`:39-40`), the saving reads (`:41-44`), the effects (`:49-64`), and `registerSubmit`, `handleSave`, `handleOpenChange` and `handleClose` (`:66-116`). `completeSave`, `completeClose` and `requestAccountCreation` at `:45-47` stay, because `handleSaved` (`:121`), `handleRequestAccountCreation` (`:129`) and `handleCloseComplete` (`:135`) read them.
  - The return shape is unchanged.
  - Both sessions call `useFormSession` with `publishFooter: useTransactionFormState.getState().publishFooter`, and type `onRegisterSubmit` as `RegisterFormSessionSubmit`.
- Test: first · `__tests__/screens/transactions/transaction_form/transaction_form_host.hook.test.ts` adds a `describe('useTransactionFormHost Save gate')` with a `BackHandler` spy, as in the commitment suite. The suite's `beforeEach` (`:28-29`) sets `hasLoaded: false`, so `openAdd` opens on `LOADING_FOOTER` with `disabled: true` (`transaction_form_host.state.ts:58-62,99`). Each case therefore first publishes `{ visible: true, saving: false, disabled: false }` for the current session, as `transaction_form_host.test.tsx:290-294` does, and a positive tap in the same case shows that baseline runs the submit. Each refusing case then changes one condition from that baseline. The cases:
  - Save runs nothing while closing, or while the footer reads `disabled`.
  - after a rejected submit, the next Save runs it.
  - a submit registered under an older session id never runs.
  - back and a close request leave the sheet open while the add state saves, and `isDismissable` reads `false`.

  These pass at base as a refactor guard, and each fails with the condition it names deleted from `handleSave`. `transaction_form_host.test.tsx:287` and `transaction_form_sessions.test.tsx:358` pass unchanged.

### 5. ADR 2026-10-18 names the shared protocol
- File: `docs/adr/2026-10-18-transactions-pieces-leave-screen-folders.md` (`:6` Applies to, plus a paragraph after `:28`)
- Change: `Applies to` adds `src/utils/use_form_session.hook.ts` and the two moved session paths. A paragraph `**Extended 2026-10-23 (#840, MA-245).**` (epic #777 R25, ticket Rules) records:
  - The protocol both form sheet hosts run lives in `src/utils/use_form_session.hook.ts`. `useFormSessionHost` reads a host's `FormSessionHostSource` and owns the Save gate, the registration keyed by session, the back listener, the close handlers and the session-saving read behind the dismiss rule. `useFormSession` registers a session's submit and publishes its footer.
  - It lives in `src/utils/`, not `src/components/ui/`, because it draws nothing and no single module owns it, under 2026-09-28 §1 as superseded 2026-10-04.
  - It imports no module, so §2 holds.
  - Each host's stores stay in the module and reach the hook only through its source.
  - The transaction add and edit sessions moved to `transaction_form/components/` with `git mv`, and only their imports changed (§3), as MA-239 moved the commitment pair.
  - Both module session hooks were deleted, and no re-export remains.
- Test: none · a doc. `npm run lint` checks its banned phrases.

## Non-goals
- MA-244 (#839): the host's recovery from a close the sheet does not carry out.
- No `disabled` state on the commitment Save, and no change to either footer's look, fields, copy, landings, toasts or writes.
- No change to `requestClose`, `completeSave`, `completeClose` or `publishFooter` in either host store.
- No move of `transaction_form_body.tsx` or the other top-level transaction form files into `components/`.

## Untested inputs
- none

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- `useSyncExternalStore` is new to `src/`. A getter that returns a fresh object loops, and a `source` built inline re-subscribes and re-adds the back listener on every render.
- `useFormSession` keyed on the `footer` object identity loops through publish and host rerender. The shallow guard is the step 2 case that catches it.
- `handleSave` discards a rejected or thrown submit, as `transaction_form_host.hook.ts:86-104` does today. Each submit sets its own error field (`add_commitment.hook.ts:67-71`, `edit_commitment.hook.ts:103-106`), so review class 1 holds only while that stays true.
- A `jest.mock` path left on the old session location with `{ virtual: true }` mocks nothing and stays silent. Step 1 drops `virtual`.
- `submitRef.current = submit` during render moves unchanged, so the React Compiler skips `useFormSession` as it skips the module hooks today. Jest never runs the compiler.
- MA-244 (#839) edits the same host close path. If it merges first, steps 3 and 4 rebase onto it.
- `npm run lint` fails the ADR paragraph on a banned method-certification phrase.

## Self-assessment
Step 2 is the step I am least sure about. To honour Decision A, the reactive session-saving read moves into the shared hook through each host's `subscribe` and `useSyncExternalStore`, and no other file in `src/` uses that pattern. The alternative is a reactive `sessionSaving` argument each host computes from its own add and edit state. That alternative is simpler, but it leaves two store subscriptions and the mode switch in each host, which the Decision rules out. The rest is a move and a consolidation whose gate already exists at `transaction_form_host.hook.ts:71-105`.
