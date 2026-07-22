# Transaction Form V1 Cleanup Design

## Goal

Make the rebuilt transaction form the sole canonical implementation before merge, without changing its approved UI, lifecycle, financial calculations, or navigation behavior.

## Current State

The legacy V1 sheet host and sheet components were removed when the rebuilt host landed. The remaining `transaction_form/` directory contains the shared form engine used by the rebuilt UI: add/edit hooks and stores, validation, amount/date/exchange-rate fields, picker sheets, and the form body. The separate `transaction_form_v2/` directory owns only the new host and session lifecycle.

Deleting `transaction_form/` would therefore delete active production code. The cleanup must promote the rebuilt lifecycle into that module instead.

## Canonical Architecture

- `transaction_form/index.tsx` exports the single `TransactionFormHost` mounted by the tabs layout.
- `transaction_form/transaction_form_host.hook.ts` owns host orchestration and submit registration.
- `transaction_form/transaction_form_host.state.ts` owns sheet phase, session identity, footer state, and post-close actions.
- `transaction_form/add_transaction_session.tsx` and `edit_transaction_session.tsx` compose the existing shared form engine.
- `transaction_form/transaction_form_prerequisites.hook.ts` owns prerequisite hydration.
- `transaction_form/transaction_form_session.hook.ts` binds a mounted form session to its host.
- Shared prerequisite types and readiness helpers live in `transaction_form_prerequisites.helpers.ts`.
- Shared form mode comes from `transaction_form.types.ts`; no parallel V2 mode type remains.

All `V2` identifiers, imports, test paths, and the `transaction_form_v2/` directory are removed. No compatibility re-export is retained because all consumers are in this repository and can move atomically.

## Behavior Boundaries

The cleanup must preserve:

- Add and edit session ownership, stale-save protection, and close-completion navigation.
- Warm-open prerequisite behavior and stable loading/footer geometry.
- First-press opening for account, destination-account, category, and budget pickers.
- Existing amount, currency, exchange-rate, budget-assignment, and transaction-save logic.
- FAB and detail-screen entry points.

## Verification

Architecture tests reject production imports containing `transaction_form_v2` or exported identifiers containing `TransactionFormV2`. Existing host, session, prerequisite, hook, component, and screen tests must pass after the move. Full CI parity remains required before push.
