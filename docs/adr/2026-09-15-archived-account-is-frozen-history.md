# ADR: An archived account is frozen history

- **Date:** 2026-09-15
- **Status:** accepted
- **Ticket:** #458 (MA-053), under epic #378
- **Applies to:** `src/modules/transactions/repositories/transaction.repository.ts`, `src/modules/transactions/repositories/transaction.errors.ts`, `src/modules/accounts/repositories/account.repository.ts`, `src/modules/accounts/repositories/account.errors.ts`, `src/modules/accounts/database/accounts.ts`, `src/modules/transactions/screens/transactions/transaction_form/transaction_form.helpers.ts`, `src/modules/transactions/screens/transactions/transactions.hook.ts`, `src/modules/transactions/screens/transactions/detail/`

No write moves the balance of an archived account that is not deleted. The one way to change history on an archived account is to restore it, change the transaction, and archive it again. The figure MA-017's archived detail labels "Balance when archived" is therefore the balance at the moment of archive.

## 1. Every balance writer refuses an archived account

| Writer | Reached from | Refused when | Error |
|---|---|---|---|
| `applyAccountDelta` | `TransactionRepository.add` | either leg is archived | `TransactionAccountArchivedError` |
| `applyAccountDelta` | `TransactionRepository.update` | either leg is archived and not deleted | `TransactionAccountArchivedError` |
| `applyAccountDelta` | `TransactionRepository.delete` | either leg is archived and not deleted | `TransactionAccountArchivedError` |
| `applyAccountDelta` | `CommitmentRepository.markAsPaid` | the payment account is archived | unchanged by this record |
| `setAccountBalance` | `AccountRepository.adjustBalance` | the account is archived | `AccountArchivedError` |
| `setAccountBalance` | `AccountRepository.adjustBalance` | the account is deleted or missing | `AccountNotFoundError` |
| `addAccount` | `AccountRepository.add` | never; a new row is never archived | none |

Each refusal reads the account rows before any write, and a refusal writes nothing: no transaction column, no balance, no review flag. `setAccountBalance` also carries `AND is_archived = 0 AND is_deleted = 0` in its `WHERE`, so the statement cannot land on a frozen row even without the read. `applyAccountDelta` gets no predicate, because section 2 needs it to keep landing on a deleted row.

## 2. The predicate is archived and not deleted

A deleted account is archived too, since `setAccountDeleted` requires `is_archived = 1`. The soft-delete record (`2026-09-08-account-soft-delete-keeps-history.md` §1) promises that a deleted account's transactions still leave one at a time through `TransactionRepository.delete`, with the reversal applied to the hidden row. A guard on `is_archived` alone breaks that promise. `update` and `delete` refuse on `is_archived = 1 AND is_deleted = 0`, the predicate `setAccountDeleted` and `setAccountUnarchived` already use.

`add` keeps its older predicate, `is_archived = 1`, which also covers a deleted account. No picker offers a deleted account, and new money never lands on one.

A deleted account's balance left net worth with the account, so moving it changes no total the user sees.

## 3. The refusal is a class, and the error carries the name

`TransactionAccountArchivedError` extends `TransactionValidationError`, so every catch that reasons about a validation failure stays valid. It carries `role`, `accountId` and `accountName`. The repository is the only layer that read the row, and the name lets the add form, the edit form, the list's swipe delete and the transaction detail print one line, `Strings.txAccountArchived(name)`, with no second lookup.

`resolveTransactionSaveError` checks the class before its issues branch. The class carries `issues: []`, and in the other order it falls to the retry copy. `resolveTransactionDeleteError` maps the same class to the same line and anything else to `Strings.errDeleteFailed`.

`AccountArchivedError` has no strings entry. The adjust sheet is reachable only from the active account detail, and the classes are the contract, as the unarchive record §2 set.

## 4. The detail hides what the repository refuses

The transaction detail reads both legs from the account lookup. When either is archived and not deleted, it hides Edit and Delete the way it hides them on a commitment-owned transaction, and the action row shows the line instead. The list row is unchanged and carries no badge. Its swipe delete reaches the repository, which refuses, and the confirm sheet shows the same line.

The lookup resolves after the transaction, so Edit can show for a frame before it hides. The repository refuses regardless, and the edit form and the detail's delete alert print the line.

## 5. Nothing is recomputed

No balance is replayed, recomputed or snapshotted. There is no migration, no snapshot column and no archived date, and deltas stay resolver-owned and invertible.

The guards read outside `withTransactionAsync`. An archive that lands between the read and the write goes through, the same window `unarchive` accepts with one local writer.

The transactions remediation spec (`docs/superpowers/specs/2026-07-19-transactions-remediation-design.md`) allowed correcting a transaction on an archived account. This record replaces that allowance; the spec is frozen history and stays as written.
