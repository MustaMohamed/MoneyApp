# Transaction Form V2 Design

- **Date:** 2026-07-21
- **Status:** Approved
- **Scope:** Add/Edit Transaction sheet presentation, session lifecycle, prerequisite loading, nested picker ownership, and FAB integration

## Problem

The current transaction form host conditionally mounts a HeroUI `BottomSheet` and then tries to coordinate its first open through readiness phases. HeroUI renders its Gorhom sheet at index `-1` and opens it only after observing a mounted `false -> true` transition. The form host, HeroUI portal, and Gorhom content do not share one mount boundary, so component-level readiness signals can race the portal. The result is a hidden FAB with no sheet, a blocked overlay, or a permanently loading shell.

## Goals

1. Open Add Transaction reliably from a tap or the long-press menu on every tab without navigation.
2. Open Edit Transaction from list and detail contexts through the same host.
3. Keep one HeroUI `Sheet` mounted for the lifetime of the tabs layout.
4. Give each open form a fresh, explicitly owned session.
5. Keep prerequisite loading, retry, save, close, and nested picker state deterministic.
6. Preserve the approved transaction form layout and existing financial validation.
7. Prevent automatic amount focus, trailing zero insertion, and automatic date-picker presentation.

## Non-goals

1. No visual redesign of the transaction form.
2. No changes to transaction reporting, balance effects, repository validation, or monthly totals.
3. No new dependency, native change, route, or custom bottom-sheet primitive.
4. No rewrite of pure transaction amount, budget-assignment, or save-error helpers.

## Architecture

### Stable shell

`TransactionFormV2Host` is mounted once beside the global FAB in the tabs layout. It always renders one project `Sheet` wrapper, including while closed. The shell's `isOpen` prop is the only presentation control. Add/Edit session content mounts inside that already-existing shell.

There are no presentation timers, ready callbacks, portal markers, conditional `Sheet` instances, or imperative Gorhom refs.

### Session state

The V2 Zustand state owns:

- mode: `add`, `edit`, or absent;
- phase: `closed`, `open`, or `closing`;
- monotonically increasing session ID;
- optional edit transaction and post-save callback;
- prerequisite generation and status;
- footer visibility, disabled state, and saving state.

`openAdd` and `openEdit` reset the relevant form stores, create the session, and set `phase = open` atomically. `requestClose` refuses dismissal while saving and otherwise moves to `closing`. `completeClose` clears only the matching session after HeroUI reports index `-1`.

### Prerequisite ownership

The mounted Add/Edit session asks the V2 state to begin its prerequisite generation. That action is idempotent, so React Strict Mode effect replay cannot duplicate or orphan the request. Promise completion is accepted only when session ID and generation still match. Closing or replacing a session invalidates stale completion without relying on component cleanup flags.

Add loads active accounts and categories. Edit also resolves archived account IDs required by the existing transaction.

### Form sessions and footer

Add and Edit retain separate RHF/Zod hooks and stores. The hooks receive the V2 prerequisite status rather than owning first-load requests. A session registers its current submit callback with the host hook and publishes footer state to V2. The always-mounted shell renders the sticky Save button from that state.

Existing form body, amount input, type tabs, account/category/budget pickers, date picker, validation schemas, amount resolution, and repository mutations remain canonical.

### FAB and navigation

The FAB calls `openAdd` directly. It never changes tabs. The FAB is hidden only while the shell is open or closing. A failed or absent form session cannot strand the FAB hidden because opening and session ownership are one state update.

## UI States

1. **Closed:** shell mounted with `isOpen=false`, no session body or footer.
2. **Loading:** sheet open with fixed loading body and disabled Save footer.
3. **Error:** same shell geometry with retry action; Save remains disabled.
4. **Ready:** form replaces loading content inside the existing shell.
5. **Saving:** Save shows loading and all dismissal paths are disabled.
6. **Closing:** form and footer remain mounted until close completion, then reset.

Nested pickers remain mounted through their own close completion and cannot reset a newer parent session.

## Verification

Automated tests cover:

- the V2 host renders a closed `Sheet` before any request;
- tap and long-press Add actions open without routing or timing work;
- Add/Edit shell identity stays stable across closed/open/closing transitions;
- Strict Mode prerequisite replay starts one owned request and completes it;
- stale completion cannot mutate a newer session;
- failed prerequisites expose retry without trapping the sheet;
- saving blocks overlay, close button, swipe, hardware back, and duplicate submit;
- repeated close/reopen creates clean form sessions;
- amount and date inputs do not open or focus automatically;
- nested picker close completion cannot clear a newer picker/session.

Final verification includes format, lint, typecheck, full Jest, Expo Doctor, Android prebuild, Android Metro bundle compilation, and real-device QA.
