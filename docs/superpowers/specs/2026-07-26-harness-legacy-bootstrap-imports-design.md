# Validated Legacy Bootstrap Imports Design

- **Date:** 2026-07-26
- **Status:** Awaiting exact product-owner sign-off
- **Initiative:** `2026-07-26-harness-legacy-bootstrap-imports`
- **Branch:** `feat/harness-legacy-bootstrap-imports`
- **Base:** `4881847975ab6b8fc66d1e019584594feb474bb7`
- **Scope:** Harness task-ledger activation, graph replacement, and replay only
- **Device QA:** Not applicable; this change has no app runtime or user interface

## Decision

Replace the initiative-specific Phase 3 bootstrap restriction with a reusable
validation contract. A nonempty bootstrap is accepted because its graph,
history, Git ranges, scopes, dependencies, checks, and repository state are
proven, never because its initiative ID is allowlisted.

The onboarding initiative is only the first consumer. This change will not edit,
special-case, activate, or otherwise mutate that initiative.

## Problem

The current harness has three related weaknesses:

1. `schema.js` permits nonempty bootstrap completions only for the hard-coded
   Phase 3 initiative.
2. CLI validation checks each imported range separately, so it does not prove
   that the ranges form one ordered chain from the accounted checkpoint.
3. replay trusts recorded Git evidence, and graph replacement clears the prior
   completion projection before importing a replacement snapshot. A malformed
   replacement can therefore hide or reopen completed work.

Removing the ID guard alone would expose those weaknesses to every initiative.

## Considered Approaches

### Rejected: another allowlist or initiative capability flag

This moves the exception without proving the imported history and requires
ongoing initiative-specific policy.

### Rejected: CLI-only validation

An event can be copied, reordered, or edited after append. Read-only status and
`harness:check` must reject invalid history during replay as well.

### Selected: shared invariants plus Git attestation

A pure validator owns graph, ordering, dependency, check, and replacement
monotonicity rules. A repository attestor owns branch, ancestry, diff scope, and
clean-delivery rules. Activation, replacement, projection replay, task-history
loading, and `harness:check` use the same contracts.

## Bootstrap Model

A bootstrap completion keeps the existing canonical fields:

```text
taskId, startHead, endHead, changedPaths, summary, checks
```

Bootstrap remains migration evidence, not a normal worker outcome. It can be
recorded only in `task_graph.activated` or `task_graph.replaced`, only by Tariq,
and never creates a claim.

### Activation

Activation begins with no task history. Its first imported range must start at
the initiative `baseSha`, which is the activation accounting checkpoint.
Subsequent ranges must begin exactly at the prior range's `endHead`.

### Replacement

Replacement starts from the prior task projection and may use either:

- an **extension**, whose first range starts at the prior `accountedHead`; or
- a **full legacy snapshot**, whose first range starts at the initiative
  `baseSha`.

The form is inferred from the first `startHead`; there is no initiative ID,
allowlist, or caller-selected bypass.

A full legacy snapshot must keep every previously completed task ID as an
ordered prefix, must not reduce the completed count, and must end at or after
the prior `accountedHead`. It may re-attest an earlier task against the newly
approved graph, but the old event remains immutable and the task remains
completed.

An extension preserves prior completions automatically and may only append newly
completed tasks. It cannot repeat a completed task ID.

In both forms:

- every previously completed task still exists in the approved replacement
  graph and remains completed;
- previously completed task IDs cannot be removed, reordered, made pending, or
  made ready;
- incomplete tasks from the old graph may be superseded;
- the resulting completion count is monotonic;
- the resulting `accountedHead` cannot move backward.

These rules preserve existing valid legacy snapshots while making extension
imports the smaller normal form.

## Required Invariants

Validation is fail-closed and runs before append and during replay.

### Graph and task identity

- The event graph hash and artifact references resolve to the exact signed and
  approved graph bundle referenced by the event's historical initiative
  snapshot.
- Every imported `taskId` exists exactly once in that graph.
- A replacement also satisfies the completion-preservation rules above.
- Unknown, duplicate, already-completed extension tasks, and stale graph
  references fail.

### Ordered commit chain

- The first range starts at the form's exact checkpoint.
- For every later range, `startHead === previous.endHead`.
- Every `endHead` equals or descends from its `startHead`.
- A mutation task moves HEAD and has a nonempty delivery delta.
- A validation task neither moves HEAD nor claims delivery changes.
- The final endpoint belongs to the current initiative branch.
- A replacement endpoint equals or descends from the prior `accountedHead`.

Disjoint, overlapping, invented, stale, truncated, or reordered ranges fail.

### Dependency and check evidence

- A task's dependencies are completed either in preserved prior state or
  earlier in the validated chain.
- Every verification command declared by the exact graph task appears once with
  `passed: true` and a nonempty summary.
- Extra check reports are allowed as informational evidence but do not satisfy a
  missing required command.

### Scope and repository state

- Observed changed paths are derived from Git, including both sides of renames.
- The canonical observed path list exactly equals the event's `changedPaths`.
- Every delivery path matches one of that task's approved `writePaths`.
- HEAD is attached to the initiative branch.
- Delivery is clean before and after attestation. As elsewhere in the harness,
  uncommitted files under reserved workflow-evidence prefixes are not delivery
  changes and are not claimed by a bootstrap task.
- The branch and HEAD snapshot must remain unchanged throughout validation;
  otherwise the operation fails as stale without appending.

## Write-Time and Replay Flow

### Activation or replacement command

1. Resolve the exact historical initiative approval and graph bundle.
2. Capture branch, HEAD, and clean-delivery state once.
3. Run pure chain validation using activation or prior replacement state.
4. Attest every range against Git and its exact graph task.
5. Re-read branch, HEAD, and delivery state to detect a race.
6. Append only when every invariant still holds.

### Projection and task-history replay

1. Validate the immutable event envelope and graph binding.
2. Rebuild the completion chain with the same pure validator.
3. Preserve completion state monotonically across graph replacement.
4. During repository-backed history loading, re-attest bootstrap commit
   existence, ancestry, exact paths, scopes, branch ownership, and clean
   delivery.
5. Reject the ledger rather than projecting partial state when any event is
   disjoint, invented, stale, reordered, or completion-hiding.

The pure projection remains testable without Git. The normal repository replay
path combines it with Git attestation, so `tasks status`, `harness:check`, and
integration gates cannot accept evidence that append-time checks alone saw.

## Architecture

The implementation will:

- keep schema validation responsible only for canonical event shape;
- add one shared pure bootstrap-chain validator;
- extend the read-only Git evidence layer with chain-level snapshot and
  attestation support;
- call those contracts from activation and replacement instead of duplicating
  per-completion checks;
- make projection replacement reconcile preserved completions instead of
  clearing them;
- make task-history loading re-attest every bootstrap event against its resolved
  historical graph;
- add no dependency, provider call, command auto-execution, product code, or
  repository integration authority.

Likely implementation surfaces are:

```text
scripts/harness/lib/tasks/schema.js
scripts/harness/lib/tasks/bootstrap.js
scripts/harness/lib/tasks/git_scope.js
scripts/harness/lib/tasks/cli.js
scripts/harness/lib/tasks/projection.js
scripts/harness/lib/tasks/store.js
scripts/harness/__tests__/task_*.test.js
```

The final plan will narrow exact file ownership before execution.

## Error Behavior

Errors name the violated invariant and task/range where applicable. Validation
never repairs, truncates, reorders, partially imports, or silently ignores an
invalid completion. Failed activation/replacement appends no task event; failed
replay exposes no trusted task projection.

## Test Policy

TDD coverage will include:

- general activation success with no initiative allowlist;
- exact approved-graph binding and unknown/duplicate task rejection;
- first-checkpoint, contiguous-order, ancestry, and endpoint monotonicity;
- mutation versus validation range rules;
- exact diff paths, rename handling, scope escape, wrong branch, detached HEAD,
  dirty delivery, and branch/HEAD race rejection;
- dependency order and required-check failures;
- invented commits, stale snapshots, disjoint chains, reordered chains, and
  tampered replay;
- extension and full-snapshot replacement;
- replacement attempts that omit, reorder, repeat, reopen, or hide completed
  tasks;
- existing valid Phase 3 legacy ledger replay without an initiative-specific
  exception;
- a synthetic onboarding-shaped bootstrap proving the policy is generic;
- fresh task status, `harness:check`, complete `harness:test`, and CI-parity
  verification.

No app screenshot, simulator, or physical-device QA is required.

## Delivery and Onboarding Adoption

This initiative will be implemented, reviewed, and fully verified on its own
branch. It will not be pushed or opened as a PR without explicit user authority.

After this harness change is separately merged, the onboarding branch can be
rebased onto the updated `main`. Its existing sequence-6 blocker, task graph,
commits, and recovery stash remain the authority. The blocker can then be
resolved and its bootstrap validated through these general invariants; no
onboarding-specific harness code or ledger rewrite is permitted.

## Acceptance Criteria

The design is complete when implementation proves all user-required invariants,
the existing valid harness history still replays, no initiative identifier
controls bootstrap eligibility, the complete harness suite and CI parity pass,
and the onboarding initiative remains untouched until its own workflow resumes.
