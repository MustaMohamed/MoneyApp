# Harness Durable Initiative State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dependency-free, repository-tracked initiative event ledger that reports and enforces MoneyApp workflow state without inferring approvals from chat, Git names, or Markdown status text.

**Architecture:** One canonical JSON machine declares initiative states, typed events, roles, and Phase 1 guard IDs. Each initiative stores canonically serialized, self-hashed immutable event files; Node modules validate, replay, and project those events, bind gates to artifact and delivery evidence, and install new events atomically. A single typed CLI exposes init, record, verify, status, list, check, and narrowly scoped recovery while existing generated policy adapters and `harness:check` remain the integration surface.

**Tech Stack:** Node.js CommonJS and built-ins (`node:assert`, `node:child_process`, `node:crypto`, `node:fs`, `node:os`, `node:path`, `node:test`), Git CLI, the existing Phase 1 harness renderer/validator, npm scripts, Husky/lint-staged, Markdown/JSON.

---

## Binding Scope

- Implement the approved spec at
  `docs/superpowers/specs/2026-07-25-harness-durable-initiative-state-design.md`.
- Do not change `src/`, application tests, Expo/native configuration, database
  migrations, dependencies, the six CI jobs, remote repositories, sessions, or
  worktrees.
- Do not add task dispatch, PR mutation, merge automation, identity
  authentication, historical backfill, or generic cleanup.
- Phase 2 ends at `integration_ready`. It never records or performs integration.
- Use TDD for every implementation task. Run the named failing test before
  implementation and the named passing test afterward.

## File Map

### New canonical/runtime files

- `harness/workflow/state_machine.json` — versioned states, event types, allowed
  origins, roles, next phases, and Phase 1 guard identifiers.
- `scripts/harness/workflow.js` — thin CLI entry point and exit-code handling.
- `scripts/harness/lib/workflow/canonical.js` — canonical JSON and event
  self-hashing.
- `scripts/harness/lib/workflow/schema.js` — strict event/machine/payload
  validation.
- `scripts/harness/lib/workflow/machine.js` — transition lookup and guard
  metadata.
- `scripts/harness/lib/workflow/projection.js` — deterministic history replay,
  validation-cycle invalidation, owner, blocker, and next-action projection.
- `scripts/harness/lib/workflow/evidence.js` — safe artifact references and
  SHA-256 validation.
- `scripts/harness/lib/workflow/git_revision.js` — branch/cleanliness facts and
  delivery-content digest.
- `scripts/harness/lib/workflow/store.js` — immutable event discovery,
  chain/fork validation, locks, atomic install, and token-scoped recovery.
- `scripts/harness/lib/workflow/status.js` — stable human and JSON reports.
- `scripts/harness/lib/workflow/verify.js` — capture/run/revalidate verification
  protocol.
- `scripts/harness/lib/workflow/cli.js` — dependency-free typed argument parsing
  and command dispatch.

### New tests

- `scripts/harness/__tests__/workflow_canonical.test.js`
- `scripts/harness/__tests__/workflow_schema.test.js`
- `scripts/harness/__tests__/workflow_machine.test.js`
- `scripts/harness/__tests__/workflow_projection.test.js`
- `scripts/harness/__tests__/workflow_evidence.test.js`
- `scripts/harness/__tests__/workflow_store.test.js`
- `scripts/harness/__tests__/workflow_status.test.js`
- `scripts/harness/__tests__/workflow_verify.test.js`
- `scripts/harness/__tests__/workflow_cli.test.js`
- `scripts/harness/__tests__/workflow_integration.test.js`

### Existing files modified

- `.gitattributes`
- `.gitignore`
- `harness/manifest.json`
- `harness/policy/workflow.md`
- `harness/templates/claude_feature_command.md`
- `harness/templates/claude_status_command.md`
- `scripts/harness/check.js`
- `scripts/harness/lib/manifest.js`
- `scripts/harness/lib/verification.js`
- `scripts/harness/__tests__/manifest.test.js`
- `scripts/harness/__tests__/verification.test.js`
- `scripts/harness/__tests__/workflow_commands.test.js`
- `scripts/harness/__tests__/integration.test.js`
- `lint-staged.config.mjs`
- `package.json`
- generated `AGENTS.md`, `CLAUDE.md`, `.claude/commands/feature.md`, and
  `.claude/commands/status.md`

### Dogfood artifact

- `docs/superpowers/initiatives/2026-07-25-harness-phase-2/events/*.json`

## Task 1: Register the Canonical Workflow Machine

**Files:**
- Create: `harness/workflow/state_machine.json`
- Modify: `harness/manifest.json`
- Modify: `scripts/harness/lib/manifest.js`
- Modify: `scripts/harness/__tests__/manifest.test.js`
- Create: `scripts/harness/__tests__/workflow_machine.test.js`

- [ ] **Step 1: Write failing manifest and machine tests**

Add tests that require:

```js
assert.equal(manifest.workflow.machine, 'harness/workflow/state_machine.json');
assert.equal(machine.version, 1);
assert.deepEqual(machine.states, [
  'brainstorming',
  'awaiting_spec_signoff',
  'planning',
  'awaiting_plan_approval',
  'execution',
  'validation',
  'awaiting_device_qa',
  'integration_ready',
  'cancelled',
]);
assert.equal(machine.events['spec.signed'].guard, 'GATE-SPEC-SIGNOFF');
assert.equal(machine.events['plan.approved'].guard, 'LEAD-PLAN-APPROVAL');
assert.equal(machine.events['review.approved'].guard, 'LEAD-REVIEW-VERDICT');
assert.equal(machine.events['device_qa.passed'].guard, 'GATE-DEVICE-QA');
```

Test duplicate states/events, unknown origins/destinations, missing guard IDs,
`integration_ready` outgoing transitions other than revision/reopen, and
workflow-machine path aliasing a generated target.

- [ ] **Step 2: Run the tests to verify failure**

Run:

```bash
node --test \
  scripts/harness/__tests__/manifest.test.js \
  scripts/harness/__tests__/workflow_machine.test.js
```

Expected: FAIL because `manifest.workflow` and the machine do not exist.

- [ ] **Step 3: Add the machine and manifest contract**

Create a version-1 machine with exact origins:

```json
{
  "version": 1,
  "internalGuards": [
    "INIT-NON-MAIN",
    "DELIVERY-EVIDENCE-FRESH"
  ],
  "states": [
    "brainstorming",
    "awaiting_spec_signoff",
    "planning",
    "awaiting_plan_approval",
    "execution",
    "validation",
    "awaiting_device_qa",
    "integration_ready",
    "cancelled"
  ],
  "roles": ["user", "sarah", "tariq", "dev", "system"],
  "events": {
    "initiative.created": {
      "origins": ["none"],
      "destination": "brainstorming",
      "roles": ["sarah"],
      "guard": "INIT-NON-MAIN"
    },
    "spec.submitted": {
      "origins": ["brainstorming"],
      "destination": "awaiting_spec_signoff",
      "roles": ["sarah", "tariq"],
      "guard": "GATE-SPEC-SIGNOFF"
    },
    "spec.signed": {
      "origins": ["awaiting_spec_signoff"],
      "destination": "planning",
      "roles": ["sarah"],
      "guard": "GATE-SPEC-SIGNOFF"
    },
    "spec.revised": {
      "origins": [
        "awaiting_spec_signoff",
        "planning",
        "awaiting_plan_approval",
        "execution",
        "validation",
        "awaiting_device_qa",
        "integration_ready"
      ],
      "destination": "awaiting_spec_signoff",
      "roles": ["sarah", "tariq"],
      "guard": "GATE-SPEC-SIGNOFF"
    },
    "plan.submitted": {
      "origins": ["planning"],
      "destination": "awaiting_plan_approval",
      "roles": ["tariq"],
      "guard": "LEAD-PLAN-APPROVAL"
    },
    "plan.approved": {
      "origins": ["awaiting_plan_approval"],
      "destination": "execution",
      "roles": ["sarah"],
      "guard": "LEAD-PLAN-APPROVAL"
    },
    "plan.revised": {
      "origins": [
        "awaiting_plan_approval",
        "execution",
        "validation",
        "awaiting_device_qa",
        "integration_ready"
      ],
      "destination": "awaiting_plan_approval",
      "roles": ["tariq"],
      "guard": "LEAD-PLAN-APPROVAL"
    },
    "implementation.ready": {
      "origins": ["execution"],
      "destination": "validation",
      "roles": ["dev"],
      "guard": "DELIVERY-EVIDENCE-FRESH"
    },
    "review.approved": {
      "origins": ["validation"],
      "destination": "validation",
      "roles": ["tariq"],
      "guard": "LEAD-REVIEW-VERDICT"
    },
    "review.changes_requested": {
      "origins": ["validation"],
      "destination": "execution",
      "roles": ["tariq"],
      "guard": "LEAD-REVIEW-VERDICT"
    },
    "verification.passed": {
      "origins": ["validation"],
      "destination": "validation",
      "roles": ["system"],
      "guard": "VERIFY-SIX-CHECKS"
    },
    "verification.failed": {
      "origins": ["validation"],
      "destination": "validation",
      "roles": ["system"],
      "guard": "VERIFY-SIX-CHECKS"
    },
    "device_qa.passed": {
      "origins": ["awaiting_device_qa"],
      "destination": "integration_ready",
      "roles": ["sarah"],
      "guard": "GATE-DEVICE-QA"
    },
    "device_qa.failed": {
      "origins": ["awaiting_device_qa"],
      "destination": "execution",
      "roles": ["sarah"],
      "guard": "GATE-DEVICE-QA"
    },
    "work.reopened": {
      "origins": ["validation", "awaiting_device_qa", "integration_ready"],
      "destination": "execution",
      "roles": ["sarah", "tariq", "dev"],
      "guard": "DELIVERY-EVIDENCE-FRESH"
    },
    "blocker.opened": {
      "origins": [
        "brainstorming",
        "awaiting_spec_signoff",
        "planning",
        "awaiting_plan_approval",
        "execution",
        "validation",
        "awaiting_device_qa",
        "integration_ready"
      ],
      "destination": "same",
      "roles": ["sarah", "tariq", "dev"],
      "guard": "GATE-CRITICAL-TRIGGER"
    },
    "blocker.resolved": {
      "origins": [
        "brainstorming",
        "awaiting_spec_signoff",
        "planning",
        "awaiting_plan_approval",
        "execution",
        "validation",
        "awaiting_device_qa",
        "integration_ready"
      ],
      "destination": "same",
      "roles": ["sarah"],
      "guard": "GATE-CRITICAL-TRIGGER"
    },
    "initiative.cancelled": {
      "origins": [
        "brainstorming",
        "awaiting_spec_signoff",
        "planning",
        "awaiting_plan_approval",
        "execution",
        "validation",
        "awaiting_device_qa"
      ],
      "destination": "cancelled",
      "roles": ["sarah"],
      "guard": "AUTH-USER-INTEGRATION"
    }
  }
}
```

Add `"workflow": { "machine": "harness/workflow/state_machine.json" }` to the
manifest. Extend manifest validation so the machine path is safe, exists, is a
registered input, and cannot alias a generated target. Machine validation
accepts guard identifiers only when they are either a Phase 1 semantic rule ID
or declared in `internalGuards`; it rejects duplicates and unused internal
guards.

- [ ] **Step 4: Run the focused tests**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add harness/workflow/state_machine.json harness/manifest.json \
  scripts/harness/lib/manifest.js \
  scripts/harness/__tests__/manifest.test.js \
  scripts/harness/__tests__/workflow_machine.test.js
git commit -m "feat: register durable workflow machine"
```

## Task 2: Canonicalize and Strictly Validate Events

**Files:**
- Create: `scripts/harness/lib/workflow/canonical.js`
- Create: `scripts/harness/lib/workflow/schema.js`
- Create: `scripts/harness/__tests__/workflow_canonical.test.js`
- Create: `scripts/harness/__tests__/workflow_schema.test.js`
- Modify: `.gitattributes`

- [ ] **Step 1: Write failing canonicalization tests**

Test this public contract:

```js
const {
  canonicalStringify,
  finalizeEvent,
  verifyCanonicalEvent,
} = require('../lib/workflow/canonical');

const event = finalizeEvent({
  schemaVersion: 1,
  initiativeId: '2026-07-25-example',
  sequence: 1,
  type: 'initiative.created',
  recordedAt: '2026-07-25T00:00:00.000Z',
  recordedBy: { role: 'sarah' },
  payload: {
    title: 'Example',
    branch: 'refactor/example',
    baseSha: 'a'.repeat(40),
  },
});
assert.match(event.eventHash, /^[a-f0-9]{64}$/);
assert.deepEqual(
  verifyCanonicalEvent(canonicalStringify(event)),
  event,
);
```

Also assert recursive key sorting, two-space JSON, UTF-8/LF/trailing-LF bytes,
self-hash failure after a leaf edit, noncanonical whitespace rejection, and
hash stability across input-key order.

- [ ] **Step 2: Write failing strict-schema tests**

Export:

```js
validateMachine(machine);
validateEventEnvelope(event, machine);
validateEventPayload(event, context);
```

Test unknown envelope/payload keys, non-ISO timestamps, unsafe initiative IDs,
wrong sequence/hash/parent shape, unknown event/role, wrong recorder role,
missing user/Sarah/Tariq authority basis, invalid QA mode, missing device/OS
data, invalid digest, and a valid fixture for every event type.

- [ ] **Step 3: Run the tests to verify failure**

```bash
node --test \
  scripts/harness/__tests__/workflow_canonical.test.js \
  scripts/harness/__tests__/workflow_schema.test.js
```

Expected: FAIL because the workflow modules do not exist.

- [ ] **Step 4: Implement canonicalization**

Use recursively sorted plain objects. `finalizeEvent` hashes
`canonicalStringify(eventWithoutEventHash)`, inserts the digest, and returns a
frozen object. `verifyCanonicalEvent` parses, validates exact canonical stored
bytes, recomputes the self-hash, and returns the object. Reject non-plain
objects, unsupported JSON values, duplicate JSON keys, and invalid UTF-8 rather
than normalizing them silently.

- [ ] **Step 5: Implement strict schemas**

Use explicit `Set` instances for allowed keys and one payload validator per
event. Gate payloads must distinguish:

```js
authority: {
  decisionBy: 'user' | 'sarah' | 'tariq',
  recordedBy: 'sarah' | 'tariq',
  basis: string
}
```

Artifact references are `{ path, sha256 }`. `implementation.ready` carries the
delivery seed `{ branch, headSha, contentDigest }`; its finalized event hash is
the authoritative `validationCycleId`. Downstream cycle-bound delivery
references are `{ branch, headSha, contentDigest, validationCycleId }`. This
avoids an impossible self-reference in which an event hash would depend on
itself.

- [ ] **Step 6: Enforce LF in Git**

Add:

```gitattributes
docs/superpowers/initiatives/**/*.json text eol=lf
```

- [ ] **Step 7: Run the focused tests and commit**

```bash
git add .gitattributes scripts/harness/lib/workflow/canonical.js \
  scripts/harness/lib/workflow/schema.js \
  scripts/harness/__tests__/workflow_canonical.test.js \
  scripts/harness/__tests__/workflow_schema.test.js
git commit -m "feat: validate canonical workflow events"
```

## Task 3: Replay the Machine and Project Current State

**Files:**
- Create: `scripts/harness/lib/workflow/machine.js`
- Create: `scripts/harness/lib/workflow/projection.js`
- Modify: `scripts/harness/__tests__/workflow_machine.test.js`
- Create: `scripts/harness/__tests__/workflow_projection.test.js`

- [ ] **Step 1: Write failing transition and replay tests**

Require:

```js
const projection = replayEvents(machine, events);
assert.equal(projection.phase, 'validation');
assert.equal(projection.owner, 'tariq');
assert.equal(
  projection.validationCycleId,
  implementationReady.eventHash,
);
```

Cover every allowed/forbidden origin, same-state blocker overlays, unresolved
critical blockers preventing forward movement, deterministic output regardless
of filesystem enumeration order, and cancellation.

- [ ] **Step 2: Write failing freshness-cycle tests**

Test:

- `implementation.ready` creates a cycle from its event hash;
- review and verification must match both cycle and content digest;
- matching approved review + green verification derives
  `awaiting_device_qa` or `integration_ready` from the signed QA declaration;
- review changes, QA failure, revision, and reopen invalidate the cycle;
- a same-byte new implementation cycle cannot reuse old evidence;
- spec revision invalidates plan/delivery; plan revision preserves signed spec
  but invalidates delivery.

- [ ] **Step 3: Run tests and confirm failure**

```bash
node --test \
  scripts/harness/__tests__/workflow_machine.test.js \
  scripts/harness/__tests__/workflow_projection.test.js
```

- [ ] **Step 4: Implement the machine facade**

Expose:

```js
loadWorkflowMachine(root, manifest);
getEventDefinition(machine, type);
assertAllowedOrigin(definition, phase);
```

Validate the machine once and return frozen registry data.

- [ ] **Step 5: Implement projection**

Replay in numeric sequence order. Keep latest spec/plan references, signed QA
mode, active validation cycle, review/verification/QA receipts, open blockers,
phase, owner, and exact legal next event(s). Derived forward states occur only
when the current cycle/digest pair has all required receipts and no critical
blocker.

- [ ] **Step 6: Run focused tests and commit**

```bash
git add scripts/harness/lib/workflow/machine.js \
  scripts/harness/lib/workflow/projection.js \
  scripts/harness/__tests__/workflow_machine.test.js \
  scripts/harness/__tests__/workflow_projection.test.js
git commit -m "feat: project durable workflow state"
```

## Task 4: Bind Artifact and Delivery Evidence

**Files:**
- Create: `scripts/harness/lib/workflow/evidence.js`
- Create: `scripts/harness/lib/workflow/git_revision.js`
- Create: `scripts/harness/__tests__/workflow_evidence.test.js`

- [ ] **Step 1: Write failing artifact tests**

Test:

```js
const reference = createArtifactReference(root, relativePath);
assert.deepEqual(reference, {
  path: relativePath,
  sha256: sha256(exactBytes),
});
assert.deepEqual(validateArtifactReference(root, reference), reference);
```

Reject absolute/traversal/non-NFC/alias/symlink paths, untracked files, missing
files, directories, stale hashes, and evidence outside the repository.

- [ ] **Step 2: Write failing delivery-digest tests**

Inject Git command/file readers and assert:

- sorted tracked paths and exact bytes produce a stable SHA-256 digest;
- initiative ledger, review, and QA paths are excluded;
- source, test, harness, spec, plan, package, or CI changes change the digest;
- ledger/review/QA evidence-only commits do not;
- ignored files do not dirty delivery;
- tracked/untracked non-evidence changes block a receipt;
- branch and `HEAD` are reported but `contentDigest` is the equality key.

- [ ] **Step 3: Run tests and confirm failure**

```bash
node --test scripts/harness/__tests__/workflow_evidence.test.js
```

- [ ] **Step 4: Implement evidence helpers**

Reuse `assertSafeRelativePath`, `pathIdentity`, and `resolveInside`. Use
`git ls-files --error-unmatch -- <path>` for tracked evidence and hash exact
bytes with `crypto.createHash('sha256')`.

- [ ] **Step 5: Implement Git revision helpers**

Expose:

```js
collectDeliveryRevision(root, initiative);
assertDeliveryClean(root);
computeDeliveryDigest(root, trackedPaths);
```

Use NUL-delimited Git output. Exclude only:

```js
[
  'docs/superpowers/initiatives/',
  'docs/superpowers/reviews/',
  'docs/superpowers/qa/',
]
```

Never call checkout, add, commit, branch, push, merge, reset, or clean.

- [ ] **Step 6: Run focused tests and commit**

```bash
git add scripts/harness/lib/workflow/evidence.js \
  scripts/harness/lib/workflow/git_revision.js \
  scripts/harness/__tests__/workflow_evidence.test.js
git commit -m "feat: bind workflow evidence to repository content"
```

## Task 5: Store Events Atomically and Recover Runtime Files Safely

**Files:**
- Create: `scripts/harness/lib/workflow/store.js`
- Create: `scripts/harness/__tests__/workflow_store.test.js`
- Modify: `.gitignore`

- [ ] **Step 1: Write failing history-validation tests**

Test discovery and replay of
`000001-<64-hex-hash>.json`, including sequence gaps/duplicates, duplicate
hashes, filename/envelope mismatch, parent sequence/hash mismatch, multiple
children/forks, edited leaf events, partial final files, and unsupported files
inside `events/`.

- [ ] **Step 2: Write failing mutation/concurrency tests**

Require:

```js
appendEvent({
  root,
  initiativeId,
  expectedSequence,
  draft,
  machine,
});
```

Test stale expected sequence, active lock contention, fully rendered/fsynced
temp before install, no-overwrite final creation, simulated write/link/fsync
failure leaving no final event, and no existing event ever opened for write.

- [ ] **Step 3: Write failing recovery tests**

Require a token-scoped `recoverRuntimeFiles` that:

- rejects the wrong token;
- rejects a live same-host PID;
- reports lock/temp paths;
- deletes only exact ignored runtime files;
- rejects symlinks and any path outside the selected initiative;
- never deletes an event or evidence artifact.

- [ ] **Step 4: Run tests and confirm failure**

```bash
node --test scripts/harness/__tests__/workflow_store.test.js
```

- [ ] **Step 5: Implement immutable storage**

Use:

```text
docs/superpowers/initiatives/<id>/events/
  .workflow.lock
  .workflow-<token>.tmp
  000001-<eventHash>.json
```

Acquire the fixed lock with `openSync(..., 'wx')`, write PID/host/time/token,
validate history while locked, canonicalize the draft, write/fsync the temp,
install without overwrite using a same-filesystem no-replace operation, fsync
the directory where supported, then remove the lock/temp in `finally`.

- [ ] **Step 6: Ignore only runtime names**

Add exact patterns for `.workflow.lock` and `.workflow-*.tmp`; never ignore
`events/*.json`.

- [ ] **Step 7: Run focused tests and commit**

```bash
git add .gitignore scripts/harness/lib/workflow/store.js \
  scripts/harness/__tests__/workflow_store.test.js
git commit -m "feat: append immutable workflow events"
```

## Task 6: Add Typed CLI, Status, List, Record, Check, and Recovery

**Files:**
- Create: `scripts/harness/lib/workflow/status.js`
- Create: `scripts/harness/lib/workflow/cli.js`
- Create: `scripts/harness/workflow.js`
- Create: `scripts/harness/__tests__/workflow_status.test.js`
- Create: `scripts/harness/__tests__/workflow_cli.test.js`
- Modify: `package.json`

- [ ] **Step 1: Write failing status tests**

Human status must include phase, owner, sequence, latest event, artifact
validity, branch/HEAD/delivery digest, current validation cycle, review,
verification, QA, blockers, explicit user action, and exact next command(s).

Stable JSON must use:

```js
{
  schemaVersion: 1,
  initiativeId,
  phase,
  owner,
  sequence,
  evidence,
  blockers,
  nextActions,
}
```

Test no ledger (`untracked initiative`), invalid ledger, stale evidence, dirty
delivery, branch mismatch, ambiguous current-branch selection, and two legal
parallel validation actions.

- [ ] **Step 2: Write failing CLI tests**

Inject stdout/stderr, clock, Git, verification, and store functions. Test:

```bash
npm run workflow -- init --id <id> --title <title>
npm run workflow -- status [--id <id>] [--json]
npm run workflow -- list [--json]
npm run workflow -- record <typed-event> --id <id> --expected-sequence <n> ...
npm run workflow -- check [--id <id>]
npm run workflow -- recover --id <id> --token <token>
```

Reject unknown flags/events, missing typed evidence, generic
`transition --to`, wrong roles/authority, mutation without expected sequence,
and any request for repository integration.

The flag-to-payload contract is binding. Every `record` command requires
`--id`, `--expected-sequence`, and `--recorded-by`; artifact flags accept a
repository-relative path and the CLI computes the SHA-256:

| Typed event | Additional required flags |
|---|---|
| `spec.submitted` | `--spec`, `--device-qa-mode`, `--device-qa-rationale` |
| `spec.signed` | `--decision-by user`, `--basis` |
| `spec.revised` | `--spec`, `--device-qa-mode`, `--device-qa-rationale`, `--reason` |
| `plan.submitted` | `--plan` |
| `plan.approved` | `--decision-by sarah`, `--basis` |
| `plan.revised` | `--plan`, `--reason` |
| `implementation.ready` | No additional flags; CLI computes branch, HEAD, and digest, then derives the cycle ID from the finalized event hash |
| `review.approved` | `--review`, `--decision-by tariq`, `--basis` |
| `review.changes_requested` | `--review`, `--decision-by tariq`, `--basis` |
| `device_qa.passed` | `--qa`, `--decision-by user`, `--basis`, `--device`, `--os` |
| `device_qa.failed` | `--qa`, `--decision-by user`, `--basis`, `--device`, `--os`, `--failed-cases` |
| `work.reopened` | `--reason` |
| `blocker.opened` | `--blocker-id`, `--trigger`, `--owner`, `--resolver`, `--reason` |
| `blocker.resolved` | `--blocker-id`, `--decision-by user`, `--basis`, `--resolution` |
| `initiative.cancelled` | `--decision-by user`, `--basis`, `--reason` |

`verification.passed` and `verification.failed` are rejected by `record`; only
`workflow verify` can produce them. `init` requires `--id`, `--title`,
`--branch`, and `--base-sha`; it never infers an historical base.

- [ ] **Step 3: Run tests and confirm failure**

```bash
node --test \
  scripts/harness/__tests__/workflow_status.test.js \
  scripts/harness/__tests__/workflow_cli.test.js
```

- [ ] **Step 4: Implement status and CLI**

Keep `workflow.js` to:

```js
const path = require('node:path');
const { runCli } = require('./lib/workflow/cli');

void runCli({
  root: path.resolve(__dirname, '../..'),
  argv: process.argv.slice(2),
}).then((code) => {
  process.exitCode = code;
});
```

Use typed event-specific flag builders in `cli.js`; never accept a destination
state from callers.

- [ ] **Step 5: Register the npm command**

Add:

```json
"workflow": "node scripts/harness/workflow.js"
```

- [ ] **Step 6: Run focused tests and commit**

```bash
git add package.json scripts/harness/workflow.js \
  scripts/harness/lib/workflow/status.js \
  scripts/harness/lib/workflow/cli.js \
  scripts/harness/__tests__/workflow_status.test.js \
  scripts/harness/__tests__/workflow_cli.test.js
git commit -m "feat: expose typed workflow commands"
```

## Task 7: Record Verification with a Two-Phase Freshness Check

**Files:**
- Create: `scripts/harness/lib/workflow/verify.js`
- Create: `scripts/harness/__tests__/workflow_verify.test.js`
- Modify: `scripts/harness/lib/verification.js`
- Modify: `scripts/harness/__tests__/verification.test.js`
- Modify: `scripts/harness/lib/workflow/cli.js`

- [ ] **Step 1: Write failing structured-verification tests**

Extend `runVerification` to return:

```js
{
  ok: true | false,
  failedCheck: string | undefined,
  checks: [
    { id: 'format', status: 'passed' },
    { id: 'lint', status: 'passed' }
  ]
}
```

Preserve stop-on-first-failure and the existing `verify_pr.js` output/exit
contract.

- [ ] **Step 2: Write failing two-phase tests**

Test `verifyWorkflow`:

1. locks and captures expected sequence/cycle/digest/branch cleanliness;
2. releases the lock before running checks;
3. reacquires and recomputes everything;
4. records `verification.passed` or `.failed` only when unchanged;
5. records nothing when sequence, cycle, branch, cleanliness, or digest changes;
6. cannot record a free-form green claim.

- [ ] **Step 3: Run tests and confirm failure**

```bash
node --test \
  scripts/harness/__tests__/verification.test.js \
  scripts/harness/__tests__/workflow_verify.test.js
```

- [ ] **Step 4: Implement structured results and workflow verification**

`workflow verify` is the only producer of `verification.passed`. Its payload
includes the manifest check IDs/results, cycle ID, branch, HEAD, and content
digest. On stale post-run facts, print the changed field and return nonzero
without an event.

- [ ] **Step 5: Run focused tests and commit**

```bash
git add scripts/harness/lib/verification.js \
  scripts/harness/lib/workflow/verify.js \
  scripts/harness/lib/workflow/cli.js \
  scripts/harness/__tests__/verification.test.js \
  scripts/harness/__tests__/workflow_verify.test.js
git commit -m "feat: record fresh workflow verification"
```

## Task 8: Integrate Workflow State with the Canonical Harness

**Files:**
- Modify: `harness/policy/workflow.md`
- Modify: `harness/templates/claude_feature_command.md`
- Modify: `harness/templates/claude_status_command.md`
- Modify: `scripts/harness/check.js`
- Create: `scripts/harness/__tests__/workflow_integration.test.js`
- Modify: `scripts/harness/__tests__/workflow_commands.test.js`
- Modify: `scripts/harness/__tests__/integration.test.js`
- Modify: `lint-staged.config.mjs`
- Regenerate: `AGENTS.md`
- Regenerate: `CLAUDE.md`
- Regenerate: `.claude/commands/feature.md`
- Regenerate: `.claude/commands/status.md`

- [ ] **Step 1: Write failing integration tests**

Assert:

- `harness:check` validates the machine and all initiative histories read-only;
- status command invokes `npm run workflow -- status` and forbids artifact/chat
  inference;
- feature command initializes or resumes a ledger before plan work;
- canonical policy requires status on resume and initiative-level events only;
- lint-staged treats the machine, ledger, workflow modules, evidence docs,
  manifest, templates, generated commands, `.gitattributes`, and `.gitignore`
  as relevant;
- no seventh CI job or second verification order exists;
- generated target count remains 16.

- [ ] **Step 2: Run tests and confirm failure**

```bash
node --test \
  scripts/harness/__tests__/workflow_commands.test.js \
  scripts/harness/__tests__/workflow_integration.test.js \
  scripts/harness/__tests__/integration.test.js
```

- [ ] **Step 3: Add read-only check integration**

Load the machine, discover ledgers deterministically, validate every event
chain, replay state, and validate only the latest active artifact references.
Do not repair or create ledgers in `harness:check`.

- [ ] **Step 4: Update canonical policy/templates and staged checks**

State that the ledger is workflow authority after Phase 2, while push/merge and
destructive operations still require explicit user requests. Do not expand
persona authority. Add `.gitattributes` and `.gitignore` to the exact
`HARNESS_FILES` staged-validation set.

- [ ] **Step 5: Regenerate and verify parity**

```bash
npm run harness:generate
npm run harness:check
```

Expected: 16 targets valid.

- [ ] **Step 6: Run focused tests and commit**

```bash
git add AGENTS.md CLAUDE.md .claude/commands/feature.md \
  .claude/commands/status.md harness/policy/workflow.md \
  harness/templates/claude_feature_command.md \
  harness/templates/claude_status_command.md scripts/harness/check.js \
  scripts/harness/__tests__/workflow_commands.test.js \
  scripts/harness/__tests__/workflow_integration.test.js \
  scripts/harness/__tests__/integration.test.js lint-staged.config.mjs
git commit -m "feat: integrate durable workflow status"
```

## Task 9: Dogfood Phase 2 and Verify the Complete Implementation

**Files:**
- Create: `docs/superpowers/initiatives/2026-07-25-harness-phase-2/events/*.json`
- Test: all `scripts/harness/__tests__/*.test.js`

- [ ] **Step 1: Run all harness tests before dogfood**

```bash
npm run harness:test
```

Expected: all tests pass with only the existing filesystem-capability skip.

- [ ] **Step 2: Initialize the Phase 2 ledger through the CLI**

Use the current branch/base SHA:

```bash
npm run workflow -- init \
  --id 2026-07-25-harness-phase-2 \
  --title "Harness Phase 2 durable initiative state" \
  --branch refactor/harness-phase-2-workflow-state \
  --base-sha 8096bbfb9aa4f05280bfaec0ed730973f54ee375
```

Do not hand-author event JSON.

- [ ] **Step 3: Record the bootstrap evidence**

Record the bootstrap with these exact success-path commands. The CLI computes
artifact hashes and delivery evidence:

```bash
npm run workflow -- record spec.submitted \
  --id 2026-07-25-harness-phase-2 --expected-sequence 1 \
  --recorded-by tariq \
  --spec docs/superpowers/specs/2026-07-25-harness-durable-initiative-state-design.md \
  --device-qa-mode not_applicable \
  --device-qa-rationale "Repository tooling only; no application, Expo, native, or user-facing runtime behavior changed"

npm run workflow -- record spec.signed \
  --id 2026-07-25-harness-phase-2 --expected-sequence 2 \
  --recorded-by sarah --decision-by user \
  --basis "Product owner approved the Phase 2 spec in the MoneyApp task"

npm run workflow -- record plan.submitted \
  --id 2026-07-25-harness-phase-2 --expected-sequence 3 \
  --recorded-by tariq \
  --plan docs/superpowers/plans/2026-07-25-harness-durable-initiative-state.md

npm run workflow -- record plan.approved \
  --id 2026-07-25-harness-phase-2 --expected-sequence 4 \
  --recorded-by sarah --decision-by sarah \
  --basis "Sarah approved the corrected Phase 2 plan for autonomous execution"

npm run workflow -- record implementation.ready \
  --id 2026-07-25-harness-phase-2 --expected-sequence 5 \
  --recorded-by dev
```

- [ ] **Step 4: Verify deterministic status**

```bash
npm run workflow -- check --id 2026-07-25-harness-phase-2
npm run workflow -- status --id 2026-07-25-harness-phase-2
npm run workflow -- status --id 2026-07-25-harness-phase-2 --json
```

Expected: phase `validation`, owner `tariq`, exact current validation cycle,
review and verification pending, QA not applicable, no blocker.

- [ ] **Step 5: Run focused and full local verification**

```bash
npm run harness:test
npm run harness:check
npm run format:check
npm run lint
npm run typecheck
npm test -- --ci
```

Expected: all pass.

- [ ] **Step 6: Commit the dogfood ledger**

The approved plan remains byte-immutable after approval. Task completion is
reported by the ledger and final review artifact, not by editing these
checkboxes. Commit only the generated ledger:

```bash
git add docs/superpowers/initiatives/2026-07-25-harness-phase-2
git commit -m "docs: dogfood durable workflow state"
```

## Task 10: Review, Record Final Evidence, and Reach Integration Ready

**Files:**
- Create: `docs/superpowers/reviews/2026-07-25-harness-phase-2-review.md`
- Create: additional Phase 2 ledger events

- [ ] **Step 1: Request Tariq code review**

Review the implementation against the approved spec and this plan. The review
must inspect actual diffs, run focused tests, name any findings with file/line
evidence, and bind its verdict to the current validation cycle/content digest.

- [ ] **Step 2: Remediate findings through TDD**

For each review cycle with material findings, preserve this exact order:

1. write the changes-requested verdict and findings into the review artifact,
   including the current validation cycle/content digest, then commit that
   review artifact;
2. record `review.changes_requested` against that unchanged pre-remediation
   cycle/digest; this event returns the initiative to `execution`;
3. reproduce each finding with a failing focused test, implement the minimal
   correction, run focused and full harness suites, and commit the delivery
   changes;
4. record a new `implementation.ready`, which creates a fresh validation cycle;
5. re-review the new cycle and never reuse the prior review or verification
   evidence.

Use `work.reopened` only when delivery changes after validation without an
existing changes-requested or failed-QA transition.

- [ ] **Step 3: Record approved review**

Commit the review artifact, then use the typed CLI to record
`review.approved` with `decisionBy=tariq`, the review artifact digest, current
validation cycle, and delivery digest.

- [ ] **Step 4: Run and record the canonical verification**

On the no-remediation success path, `review.approved` is event 7. Run:

```bash
npm run workflow -- verify \
  --id 2026-07-25-harness-phase-2 \
  --expected-sequence 7
```

After any remediation cycle, first run:

```bash
npm run workflow -- status \
  --id 2026-07-25-harness-phase-2 --json
```

Read the exact integer `sequence` from that output and pass that integer to
`--expected-sequence`; do not use a placeholder or infer it from filenames.

Expected: the six checks pass, `verification.passed` is installed only after
the post-run sequence/cycle/digest revalidation, and status derives
`integration_ready` because signed Device QA mode is `not_applicable`.

- [ ] **Step 5: Check the projected final evidence before commit**

```bash
npm run workflow -- check --id 2026-07-25-harness-phase-2
npm run workflow -- status --id 2026-07-25-harness-phase-2
```

Expected: `integration_ready`, explicit user integration action pending, clean
delivery outside excluded review/ledger evidence, and no push/PR/merge
performed by the workflow tool. The newly created review/ledger evidence is
expected to be uncommitted at this point.

- [ ] **Step 6: Commit final evidence**

```bash
git add docs/superpowers/reviews/2026-07-25-harness-phase-2-review.md \
  docs/superpowers/initiatives/2026-07-25-harness-phase-2
git commit -m "docs: record harness phase 2 approval"
```

- [ ] **Step 7: Run final clean-state checks**

```bash
npm run workflow -- check --id 2026-07-25-harness-phase-2
npm run workflow -- status --id 2026-07-25-harness-phase-2
git status --short --branch
```

Expected: `integration_ready`, explicit user integration action pending, and a
clean worktree. Do not edit the approved plan or any delivery-bound file after
the final recorded verification.

No push, PR update, merge, branch deletion, worktree cleanup, or Phase 3
implementation is authorized by this plan.

## Plan Self-Review

- [ ] Every approved-spec scope item maps to Tasks 1–10.
- [ ] Every approved-spec exclusion remains explicit.
- [ ] State IDs, event IDs, roles, payload names, `eventHash`,
  `contentDigest`, and `validationCycleId` are consistent across tasks.
- [ ] Every code-producing task begins with a failing focused test and ends with
  a passing focused test plus commit.
- [ ] Canonical six-check order remains sourced only from
  `harness/manifest.json`.
- [ ] No placeholder, generic error-handling instruction, dependency, native
  change, app change, or external mutation is present.
