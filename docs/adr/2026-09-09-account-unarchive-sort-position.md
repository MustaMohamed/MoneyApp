# ADR: Restoring an account moves the flag and the sort position in one statement

- **Date:** 2026-09-09
- **Status:** accepted
- **Ticket:** #448 (MA-047), under #383 and epic #378; the screens that call it are MA-048 and MA-049
- **Applies to:** `src/modules/accounts/database/accounts.ts`, `src/modules/accounts/repositories/account.repository.ts`, `src/modules/accounts/repositories/account.errors.ts`, `src/modules/accounts/store/account.store.ts`

Restoring an archived account clears `is_archived` and seats the account after every active one, in a single guarded `UPDATE`. Three refusals are read before that write and raised as typed errors. No balance column is read or written.

## 1. One statement, because the flag and the position must not diverge

`setAccountUnarchived` (`accounts.ts:145`) sets `is_archived = 0` and `sort_order = (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM accounts WHERE is_archived = 0 AND is_deleted = 0)` together, under `WHERE id = ? AND is_archived = 1 AND is_deleted = 0`. The subquery reads the active rows while the row is still archived, so the account cannot allocate its own position; an empty active list yields `-1 + 1 = 0`.

Split across two statements, a failure between them leaves an account active at whatever position it held when it was archived, colliding with a live account. The predicate is the same guard `setAccountDeleted` (`:130`) uses, and it carries `AND is_deleted = 0` for the reason the soft-delete record names: a deleted row stays archived, so without that clause a deleted account returns to the live list under an empty name (`docs/adr/2026-09-08-account-soft-delete-keeps-history.md` §3).

A single statement also settles the transaction question. There is one write, so `withTransactionAsync` would wrap nothing.

## 2. Three refusals read first, because one row count cannot tell them apart

The guarded update returns `0` for a missing id, a deleted account, an already-active account and a name collision alike. `AccountRepository.unarchive` therefore reads the row and the active list first and throws a distinguishable class, the shape `delete` (`account.repository.ts`) already uses:

| Case | Error |
|---|---|
| id resolves to nothing, or to a deleted account | `AccountNotFoundError` |
| the account is not archived | `AccountNotArchivedError('Only an archived account can be restored')` |
| an active account already holds the name | `AccountNameTakenError` |

`AccountNotArchivedError` gained a message parameter rather than a sibling class: the caller tells cases apart by class, and delete's shipped message ("Only an archived account can be deleted") is wrong for a restore. The classes are the contract, so none of them has a `constants/strings.ts` entry; MA-048 and MA-049 choose the copy.

The row count is still checked after the write, and a `0` there throws `AccountNotFoundError`. It is unreachable through the reads above with a single local writer, and it is the reason the query returns `result.changes` rather than `void`.

## 3. The name comparison runs in JavaScript, over the active list

SQLite's `LOWER` folds ASCII only, so a SQL-side check would let a restored account collide with an active one whose name differs by a non-ASCII case pair. The comparison is `name.trim().toLowerCase()` over `getAccounts(db)`, and it is the one `isAccountNameTaken` (`utils/account_name_taken.ts`) holds: the add schema and the rename check call the same helper, the latter passing the edited account's own id as `excludeId`.

The list is the active one, so two archived accounts may share a name and neither blocks the other until one is restored. That follows from the schema, which has no `UNIQUE` on `name` (audit L12): an active and an archived account can already share one today. Widening the add and edit checks to archived accounts is off this milestone.

A concurrent add between the read and the write could seat a duplicate. There is one local writer, and it is the same window `delete` accepts.

## 4. No balance is read, written, or recomputed

`current_balance` and `revolving_balance` have three writers, `applyAccountDelta` (`accounts.ts:46`), `setAccountBalance` (`:164`) and `addAccount` (`:73`), and the restore calls none of them. The account rejoins the live totals with whatever the columns hold at that moment.

That is not a freeze, and MA-048 and MA-049 must not read it as one. Archiving closes the account to *new* money only. `add` refuses an archived source or destination through `requireSelectableAccount` (`transaction.repository.ts:271-272`, the check at `:125-127`), and `markAsPaid` refuses one as a payment account (`commitment.repository.ts:211-213`). A transaction that already points at the account takes neither path: `update` (`:369`) and `delete` (`:342`) resolve it with `requireAccount` and write through `applyAccountDelta` (`:433`, `:365`). Editing that transaction's amount or deleting it moves an archived account's balance, so the balance on restore is not guaranteed to be the balance at archive time.

What a restore changes is which rows the archived-filtered readers return. Every total, carousel and picker reads through `getAccounts` or filters `is_archived` in JavaScript, so they pick the account up on their next load with no new code.

## 5. One sort-order rule, on both paths

Adding an account and restoring one both assign **one past the highest active `sort_order`**, and both yield `0` when no active account is left. The restore does it in SQL, `COALESCE(MAX(sort_order), -1) + 1` over the active rows (`accounts.ts:145`); the add does it in JavaScript over the store's active list (`use_account_form.hook.ts:52`), which is the same set the query reads.

The add used to assign the active count instead. That collides after any restore: a restore raises the maximum above the count, so the next added account takes a number a restored account already holds. Nothing was lost, because both list queries order by `sort_order ASC, created_at ASC` and a tie breaks on creation time, but the two rules disagreed and only the tiebreak hid it.

MA-016 (#382) still owns sort order end to end. Drag-to-reorder rewrites positions across the whole list and may replace this allocator; until it lands, the two write paths agree.
