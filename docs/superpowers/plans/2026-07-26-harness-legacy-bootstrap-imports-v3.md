# Validated Legacy Bootstrap Imports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Phase 3 initiative allowlist with generic, replay-safe validation for legacy task bootstrap imports.

**Architecture:** A pure bootstrap module validates graph membership, checkpoints, chain order, dependencies, checks, and replacement monotonicity. The Git scope layer attests commit ancestry and exact diffs and emits canonical portable receipts; CLI append and repository replay share those contracts. A manifest-owned migration anchor and content-hashed evidence-bridge artifact permit only exact pre-change receipt-less events and their proven evidence-only gaps, while projection preserves completed work across graph replacement.

**Tech Stack:** Node.js CommonJS, canonical JSON/SHA-256 helpers, Git read-only plumbing, `node:test`, MoneyApp workflow/task ledgers.

---

## File Map

- Create `scripts/harness/lib/tasks/bootstrap.js`: pure chain normalization,
  replacement reconciliation, required-check validation, and portable receipt
  hashing.
- Modify `harness/manifest.json` and `scripts/harness/lib/manifest.js`: declare
  and validate the repository-wide legacy bootstrap anchor.
- Modify `scripts/harness/lib/tasks/schema.js`: accept general canonical
  bootstrap events and validate optional portable receipts without initiative
  IDs.
- Modify `scripts/harness/lib/tasks/git_scope.js`: capture stable repository
  snapshots, attest ordered ranges, and compare portable diff receipts.
- Modify `scripts/harness/lib/tasks/cli.js`: validate and attest activation and
  replacement before append.
- Modify `scripts/harness/lib/tasks/projection.js`: replay the pure chain and
  preserve completion state monotonically.
- Modify `scripts/harness/lib/tasks/store.js`: enforce receipt or migration
  anchor during repository-backed replay.
- Modify `scripts/harness/lib/tasks/projection.js`: consume only repository-
  verified transparent bridge pairs while projecting anchored legacy events.
- Create `harness/legacy_bootstrap_bridges.json`: canonical portable proof for
  evidence-only gaps in exact receipt-less events at the migration anchor.
- Modify focused files in `scripts/harness/__tests__/`: TDD coverage for each
  contract and end-to-end compatibility.

## Canonical Contracts

New nonempty bootstrap events add:

```js
bootstrapAttestation: {
  schemaVersion: 1,
  validatedHead: '40-lowercase-hex',
  ranges: [
    {
      taskId: 'task-01',
      digest: '64-lowercase-hex',
    },
  ],
  chainDigest: '64-lowercase-hex',
}
```

Each range digest hashes the canonical observed
`{ taskId, startHead, endHead, changedPaths }`. `chainDigest` hashes
`{ graphHash, branch, checkpoint, validatedHead, ranges }`. Empty bootstrap
arrays omit `bootstrapAttestation`. Historical nonempty events without the field
must be exact byte matches at `workflow.tasks.legacyBootstrapAnchor`.

The pure API is:

```js
validateBootstrapChain({
  graph,
  completions,
  baseSha,
  previousChain,
  previousAccountedHead,
  replacement,
});
```

It returns frozen `{ mode, chain, imported, accountedHead }`, where `mode` is
`activation`, `extension`, or `snapshot`.

## Task 1: Pure bootstrap contract and schema

**Files:**
- Create: `scripts/harness/lib/tasks/bootstrap.js`
- Modify: `harness/manifest.json`
- Modify: `scripts/harness/lib/manifest.js`
- Modify: `scripts/harness/lib/tasks/schema.js`
- Test: `scripts/harness/__tests__/manifest.test.js`
- Test: `scripts/harness/__tests__/task_schema.test.js`
- Test: `scripts/harness/__tests__/task_bootstrap.test.js`

- [ ] **Step 1: Write failing manifest and schema tests**

Add tests proving:

```js
assert.equal(
  manifest.workflow.tasks.legacyBootstrapAnchor,
  '4881847975ab6b8fc66d1e019584594feb474bb7',
);
assert.doesNotThrow(() => validateTaskEventPayload(genericBootstrapEvent));
assert.throws(() => validateTaskEventPayload(eventWithMalformedAttestation), /attestation/i);
```

Run:

```bash
node --test scripts/harness/__tests__/manifest.test.js scripts/harness/__tests__/task_schema.test.js
```

Expected: FAIL because the manifest has no migration anchor and schema still
contains the Phase 3 initiative guard.

- [ ] **Step 2: Implement the manifest and event shape**

Add `legacyBootstrapAnchor` beside `directory` and `limits`, validate it as
lowercase 40-hex, remove the initiative-ID guard, and validate the exact
attestation keys above. Require the attestation exactly when a newly appended
nonempty event uses the new shape; retain structural acceptance of receipt-less
events so repository replay can apply the migration-anchor rule.

- [ ] **Step 3: Write failing pure-chain tests**

Cover activation, extension, and full snapshot success plus rejection of:

```text
unknown/duplicate task
wrong first checkpoint
disjoint or reordered range
incomplete dependency
missing/failed/duplicate required check
repeated extension task
snapshot missing or reordering prior completed IDs
completion-count or accounted-head retreat
```

Run:

```bash
node --test scripts/harness/__tests__/task_bootstrap.test.js
```

Expected: FAIL because `bootstrap.js` does not exist.

- [ ] **Step 4: Implement the pure validator**

Use graph task order only for identity lookup; completion order comes from the
commit chain. Infer replacement mode from the first task/checkpoint, preserve
previous completions for extensions, require the prior task-ID sequence as the
snapshot prefix, and validate dependencies against tasks completed earlier in
the resulting chain. Return frozen canonical data and deterministic errors.

- [ ] **Step 5: Run focused tests and commit**

```bash
node --test \
  scripts/harness/__tests__/manifest.test.js \
  scripts/harness/__tests__/task_schema.test.js \
  scripts/harness/__tests__/task_bootstrap.test.js
git add harness/manifest.json scripts/harness/lib/manifest.js \
  scripts/harness/lib/tasks/bootstrap.js scripts/harness/lib/tasks/schema.js \
  scripts/harness/__tests__/manifest.test.js \
  scripts/harness/__tests__/task_schema.test.js \
  scripts/harness/__tests__/task_bootstrap.test.js
git commit -m "feat: validate bootstrap completion chains"
```

Expected: focused tests pass.

## Task 2: Stable Git attestation and portable receipts

**Files:**
- Modify: `scripts/harness/lib/tasks/bootstrap.js`
- Modify: `scripts/harness/lib/tasks/git_scope.js`
- Test: `scripts/harness/__tests__/task_bootstrap.test.js`
- Test: `scripts/harness/__tests__/task_git_scope.test.js`

- [ ] **Step 1: Write failing repository-attestation tests**

Add real temporary-repository and injected-Git tests for:

```js
const attested = attestBootstrapChain(root, {
  branch,
  graph,
  checkpoint,
  completions,
});
assert.equal(attested.attestation.validatedHead, endHead);
assert.deepEqual(attested.observedCompletions, completions);
```

Also assert rejection for an invented end commit, non-descendant end, exact
path mismatch, rename escape, out-of-scope path, detached/wrong branch, dirty
delivery, partial Git availability, and branch/HEAD changes between the opening
and closing snapshots.

Run:

```bash
node --test scripts/harness/__tests__/task_git_scope.test.js
```

Expected: FAIL because chain attestation is absent.

- [ ] **Step 2: Implement stable chain attestation**

Add a repository snapshot primitive that captures expected branch, HEAD, and
clean delivery. Reuse `collectTaskCompletionRevision` for every range, compare
all observed fields exactly, prove a replacement endpoint descends the prior
accounted head, create per-range digests and `chainDigest`, then require the
closing snapshot to equal the opening snapshot.

- [ ] **Step 3: Write failing receipt-verification tests**

Prove `verifyBootstrapAttestation` accepts the canonical receipt and rejects a
changed graph, checkpoint, branch, validated HEAD, range order, path digest, or
chain digest.

Run:

```bash
node --test \
  scripts/harness/__tests__/task_bootstrap.test.js \
  scripts/harness/__tests__/task_git_scope.test.js
```

Expected: FAIL on the new receipt-verification assertions.

- [ ] **Step 4: Implement receipt verification and commit**

Use existing canonical hashing helpers; do not introduce crypto wrappers or a
new dependency.

```bash
node --test \
  scripts/harness/__tests__/task_bootstrap.test.js \
  scripts/harness/__tests__/task_git_scope.test.js
git add scripts/harness/lib/tasks/bootstrap.js \
  scripts/harness/lib/tasks/git_scope.js \
  scripts/harness/__tests__/task_bootstrap.test.js \
  scripts/harness/__tests__/task_git_scope.test.js
git commit -m "feat: attest bootstrap git ranges"
```

Expected: focused tests pass.

## Task 3: Monotonic projection and graph replacement

**Files:**
- Modify: `scripts/harness/lib/tasks/projection.js`
- Test: `scripts/harness/__tests__/task_projection.test.js`

- [ ] **Step 1: Write failing projection tests**

Add activation and repeated-replacement ledgers proving:

```js
assert.deepEqual(projection.completionOrder, ['task-01', 'task-02']);
assert.equal(projection.completedCount, 2);
assert.equal(projection.tasks['task-01'].state, 'completed');
```

Reject replacement snapshots/extensions that omit, repeat, reorder, reopen, or
hide prior completed tasks. Retain incomplete old tasks as `superseded`.

Run:

```bash
node --test scripts/harness/__tests__/task_projection.test.js
```

Expected: FAIL because replacement currently clears completions.

- [ ] **Step 2: Reconcile instead of clearing**

Call `validateBootstrapChain` for activation and replacement, keep an ordered
completion chain, rebuild the completion map from the validated result, and
derive `accountedHead` from it. Never clear completed work before replacement
validation succeeds.

- [ ] **Step 3: Run and commit**

```bash
node --test \
  scripts/harness/__tests__/task_bootstrap.test.js \
  scripts/harness/__tests__/task_projection.test.js
git add scripts/harness/lib/tasks/projection.js \
  scripts/harness/__tests__/task_projection.test.js
git commit -m "fix: preserve completed tasks across graph replacement"
```

Expected: focused tests pass.

## Task 4: CLI append and repository replay

**Files:**
- Modify: `scripts/harness/lib/tasks/cli.js`
- Modify: `scripts/harness/lib/tasks/store.js`
- Test: `scripts/harness/__tests__/task_cli.test.js`
- Test: `scripts/harness/__tests__/task_store.test.js`

- [ ] **Step 1: Write failing CLI tests**

Assert a generic initiative activation and replacement append the exact
attestation returned by Git validation. Assert no append for stale checkpoint,
missing required checks, invalid dependency order, changed branch/HEAD, or a
replacement that would reduce completed state.

Run:

```bash
node --test scripts/harness/__tests__/task_cli.test.js
```

Expected: FAIL because CLI validates ranges independently and emits no receipt.

- [ ] **Step 2: Integrate the shared validator**

Replace `validateBootstrapCompletions` with one orchestration path that:

```text
pure-validates -> Git-attests -> rechecks snapshot -> appends completion array
and bootstrapAttestation atomically
```

Empty bootstraps omit the receipt. Replacement validation receives the previous
completion chain and accounted head.

- [ ] **Step 3: Write failing repository-replay tests**

Cover:

```text
live objects + valid receipt -> accepted and recomputed
missing objects + valid portable receipt -> accepted
partial object availability -> rejected
receipt-less event at migration anchor -> accepted
receipt-less event absent from migration anchor -> rejected
tampered receipt or completion order -> rejected
```

Use an injected read-only Git adapter; do not rely on developer-local dangling
objects.

Run:

```bash
node --test scripts/harness/__tests__/task_store.test.js
```

Expected: FAIL because store replay has no attestation policy.

- [ ] **Step 4: Implement replay policy**

Pass a bootstrap verification callback through repository-backed replay. For a
receipt-less event, read the exact event bytes at the manifest migration anchor
and compare them to the canonical ledger file. For a receipt-bearing event,
verify the portable digest and recompute live Git evidence only when the entire
range is available; partial availability fails.

- [ ] **Step 5: Run and commit**

```bash
node --test \
  scripts/harness/__tests__/task_cli.test.js \
  scripts/harness/__tests__/task_store.test.js \
  scripts/harness/__tests__/task_projection.test.js
git add scripts/harness/lib/tasks/cli.js scripts/harness/lib/tasks/store.js \
  scripts/harness/__tests__/task_cli.test.js \
  scripts/harness/__tests__/task_store.test.js
git commit -m "feat: enforce bootstrap attestations on replay"
```

Expected: focused tests pass.

## Task 5: Evidence-transparent migration compatibility

**Files:**
- Create: `harness/legacy_bootstrap_bridges.json`
- Modify: `harness/manifest.json`
- Modify: `scripts/harness/lib/manifest.js`
- Modify: `scripts/harness/lib/tasks/bootstrap.js`
- Modify: `scripts/harness/lib/tasks/git_scope.js`
- Modify: `scripts/harness/lib/tasks/store.js`
- Modify: `scripts/harness/lib/tasks/projection.js`
- Modify: `scripts/harness/__tests__/manifest.test.js`
- Modify: `scripts/harness/__tests__/task_bootstrap.test.js`
- Modify: `scripts/harness/__tests__/task_git_scope.test.js`
- Modify: `scripts/harness/__tests__/task_projection.test.js`
- Modify: `scripts/harness/__tests__/task_integration.test.js`
- Modify: `scripts/harness/__tests__/task_store.test.js`
- Modify: `scripts/harness/__tests__/task_cli.test.js`

- [ ] **Step 1: Add failing bridge and end-to-end regressions**

Build fixtures for:

1. the existing Phase 3 receipt-less event chain anchored at the migration
   boundary, including its evidence-only first and intermediate gaps;
2. a generic onboarding-shaped activation with pre-harness asset commits;
3. live bridge verification, fully portable bridge verification, and rejection
   for partial endpoint availability;
4. missing, changed, non-descendant, reordered, or non-evidence bridges;
5. replayed disjoint, invented, stale, and reordered completions;
6. replacement attempts that omit or reopen completed work.

Run:

```bash
node --test \
  scripts/harness/__tests__/manifest.test.js \
  scripts/harness/__tests__/task_bootstrap.test.js \
  scripts/harness/__tests__/task_git_scope.test.js \
  scripts/harness/__tests__/task_store.test.js \
  scripts/harness/__tests__/task_integration.test.js
```

Expected: FAIL because exact anchored Phase 3 history still fails strict
checkpoint equality and there is no durable bridge proof.

- [ ] **Step 2: Add the canonical bridge artifact**

Create one self-hashed canonical artifact bound from the manifest. Each bridge
records the earlier endpoint, later endpoint, exact reserved-evidence path
list, and deterministic digest. Validate exact keys, ordering, uniqueness,
lowercase hashes, the migration-anchor binding, and evidence-only paths.

- [ ] **Step 3: Resolve bridges only for exact anchored legacy events**

Keep strict equality in the normal pure validator. During receipt-less replay,
after exact anchor-byte verification, derive each non-equal checkpoint pair and
require a matching bridge. Recompute ancestry, changed paths, and digest when
both endpoints exist; use the portable bridge when neither exists; reject
partial availability. Pass only the verified transparent pairs into pure chain
validation and projection replay; never let projection independently infer or
trust a bridge.

- [ ] **Step 4: Apply the smallest integration corrections**

Adjust shared context plumbing, manifest fixture construction, and assertions
needed by the end-to-end cases. Do not add an initiative ID, onboarding
condition, provider call, command auto-execution, or a relaxed path prefix.

- [ ] **Step 5: Run all task tests and commit**

```bash
node --test scripts/harness/__tests__/task_*.test.js
git add harness/legacy_bootstrap_bridges.json harness/manifest.json \
  scripts/harness/lib/manifest.js scripts/harness/lib/tasks/bootstrap.js \
  scripts/harness/lib/tasks/git_scope.js scripts/harness/lib/tasks/store.js \
  scripts/harness/lib/tasks/projection.js \
  scripts/harness/__tests__/manifest.test.js \
  scripts/harness/__tests__/task_bootstrap.test.js \
  scripts/harness/__tests__/task_git_scope.test.js \
  scripts/harness/__tests__/task_projection.test.js \
  scripts/harness/__tests__/task_integration.test.js \
  scripts/harness/__tests__/task_store.test.js \
  scripts/harness/__tests__/task_cli.test.js
git commit -m "fix: attest legacy bootstrap evidence bridges"
```

Expected: all task harness tests pass.

## Task 6: Review and complete verification

**Files:**
- Read: `docs/superpowers/specs/2026-07-26-harness-legacy-bootstrap-imports-design.md`
- Read: `scripts/harness/lib/tasks/*.js`
- Read: `scripts/harness/__tests__/task_*.test.js`

- [ ] **Step 1: Review from the complete diff**

Inspect:

```bash
git diff 4881847975ab6b8fc66d1e019584594feb474bb7...HEAD -- \
  harness scripts/harness docs/superpowers
```

Verify every spec invariant has a behavioral test, there is no initiative
allowlist, and failure paths append/project no partial state.

- [ ] **Step 2: Run formatter and focused harness checks**

```bash
npm run format:check
npm run harness:check
npm run harness:test
```

Expected: all pass with no changed generated targets.

- [ ] **Step 3: Run complete CI parity**

```bash
npm run verify:pr
```

Expected: all six registered checks pass.

- [ ] **Step 4: Record actual evidence**

Sarah inspects the commits and actual command outputs before recording task
outcomes. Tariq then performs the final code review. No push or PR follows
without a new explicit user request.

## Plan Self-Review

- Every approved spec invariant maps to Tasks 1–5.
- Existing receipt-less history and post-squash replay are explicit in Tasks 4
  and 5.
- The plan contains no initiative allowlist, onboarding exception, dependency,
  native change, product code, automatic command execution, push, PR, or merge.
- Device QA remains not applicable.
- Function names and receipt fields are consistent across all tasks.
