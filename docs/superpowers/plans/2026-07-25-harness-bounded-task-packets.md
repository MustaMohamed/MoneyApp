# Harness Bounded Task Packets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a strict approved-plan task graph, deterministic bounded task packets, and durable host-neutral task coordination to the existing MoneyApp workflow harness.

**Architecture:** A canonical JSON task graph is validated and content-bound to the approved Markdown plan. A separate immutable task-event ledger projects readiness, claims, blockers, completion, and graph replacement; packet generation binds that projection to exact initiative, artifact, branch, and dependency evidence. The existing dependency-free workflow CLI exposes read-only status/packet commands and explicit event mutations while never running task commands, dispatching agents, creating Git objects, or performing repository integration.

**Tech Stack:** Node.js CommonJS and built-ins (`node:assert`, `node:child_process`, `node:crypto`, `node:fs`, `node:os`, `node:path`, `node:test`), Git read-only plumbing, the existing Phase 1/2 harness renderer and validators, canonical JSON, npm scripts, Husky/lint-staged, Markdown/JSON.

---

## Binding Scope

- Implement the approved specification at
  `docs/superpowers/specs/2026-07-25-harness-bounded-task-packets-design.md`.
- Execute inline in the existing Phase 3 worktree. The product owner explicitly
  requested no subagents for this work.
- Do not change `src/`, application tests, Expo/native configuration, database
  migrations, dependencies, the six CI jobs, or remote repositories.
- Do not call a provider API or automatically create a session, subagent,
  worktree, branch, commit, push, pull request, merge, archive, or cleanup
  operation.
- Verification commands in packets are data. Phase 3 validates their argument
  arrays but never executes them automatically.
- Only one active task claim is allowed. Parallel-ready groups are reporting
  metadata, not authority for concurrent mutation.
- Historical version-1 initiative events without a task graph remain valid.
  New plan submissions and revisions made through the Phase 3 CLI require a
  graph.
- Use TDD for Tasks 1–10. Run the stated failing tests before implementation
  and the stated passing tests afterward.
- Phase 3 dogfood uses the bootstrap exception in the specification: Tasks
  completed before task-ledger activation are imported only from committed
  ranges and validated paths; all later work uses live packets and events.

## Locked Canonical Details

- `graphHash` is SHA-256 of `canonicalStringify(graphWithoutGraphHash)`.
- `packetHash` is SHA-256 of
  `canonicalStringify(packetWithoutPacketHash)`.
- A task graph is stored as the complete canonical object including its hash,
  with two-space indentation and exactly one final LF.
- Task-event envelopes reuse the initiative-event envelope fields and hashing
  rules, but live under `task-events/` and are validated by task-specific event
  definitions.
- The task runtime namespace is `.tasks-<32 lowercase hex>` and never aliases
  Phase 2 `.workflow-*` runtime files.
- A bootstrap activation may carry `bootstrapCompletions` only when the task
  ledger is empty, the initiative is
  `2026-07-25-harness-phase-3`, and each imported completion is proven by an
  ancestor commit range plus focused-check evidence. Future initiatives cannot
  use this field.

## File Map

### New canonical/runtime modules

- `scripts/harness/lib/tasks/graph.js` — exact graph schema, canonical graph
  hashing, artifact binding, limits, DAG validation, and overlap validation.
- `scripts/harness/lib/tasks/path_scope.js` — portable path/glob parsing,
  matching, and conservative scope-overlap analysis.
- `scripts/harness/lib/tasks/schema.js` — strict task-event envelope and payload
  validation.
- `scripts/harness/lib/tasks/projection.js` — deterministic task-ledger replay,
  states, ready order, active claim, blockers, replacement, and completion
  evidence.
- `scripts/harness/lib/tasks/packet.js` — bounded canonical packet creation and
  packet-hash validation.
- `scripts/harness/lib/tasks/store.js` — immutable task-event discovery,
  chaining, task-specific locks, atomic install, and recovery.
- `scripts/harness/lib/tasks/git_scope.js` — read-only Git branch, ancestry,
  clean-delivery, committed delta, and write-scope validation.
- `scripts/harness/lib/tasks/status.js` — stable task status/next projections
  and human/JSON formatting.
- `scripts/harness/lib/tasks/cli.js` — typed `workflow tasks ...` argument
  parsing and command orchestration.

### New tests

- `scripts/harness/__tests__/task_graph.test.js`
- `scripts/harness/__tests__/task_path_scope.test.js`
- `scripts/harness/__tests__/task_schema.test.js`
- `scripts/harness/__tests__/task_projection.test.js`
- `scripts/harness/__tests__/task_packet.test.js`
- `scripts/harness/__tests__/task_store.test.js`
- `scripts/harness/__tests__/task_git_scope.test.js`
- `scripts/harness/__tests__/task_cli.test.js`
- `scripts/harness/__tests__/task_integration.test.js`

### Existing runtime files modified

- `harness/manifest.json`
- `scripts/harness/lib/manifest.js`
- `scripts/harness/lib/workflow/canonical.js`
- `scripts/harness/lib/workflow/schema.js`
- `scripts/harness/lib/workflow/projection.js`
- `scripts/harness/lib/workflow/cli.js`
- `scripts/harness/lib/workflow/status.js`
- `scripts/harness/lib/workflow/check.js`
- `scripts/harness/workflow.js`
- `scripts/harness/check.js`
- `lint-staged.config.mjs`

### Existing tests modified

- `scripts/harness/__tests__/manifest.test.js`
- `scripts/harness/__tests__/workflow_canonical.test.js`
- `scripts/harness/__tests__/workflow_schema.test.js`
- `scripts/harness/__tests__/workflow_projection.test.js`
- `scripts/harness/__tests__/workflow_cli.test.js`
- `scripts/harness/__tests__/workflow_status.test.js`
- `scripts/harness/__tests__/workflow_integration.test.js`
- `scripts/harness/__tests__/integration.test.js`

### Canonical policy and generated surfaces

- `harness/policy/workflow.md`
- `harness/policy/authority.md`
- `harness/personas/sarah.md`
- `harness/personas/tariq.md`
- `harness/personas/dev.md`
- `harness/templates/claude_feature_command.md`
- `harness/templates/claude_status_command.md`
- `harness/rules/semantics.json`
- generated `AGENTS.md`, `CLAUDE.md`, `.codex/agents/{sarah,tariq,dev}.toml`,
  `.claude/agents/{sarah,tariq,dev}.md`,
  `.agents/skills/moneyapp-expert-panel/SKILL.md`,
  `.claude/skills/moneyapp-expert-panel/SKILL.md`, and
  `.claude/commands/{feature,status}.md`

### Phase 3 dogfood artifacts

- `docs/superpowers/task-graphs/2026-07-25-harness-bounded-task-packets.json`
- `docs/superpowers/initiatives/2026-07-25-harness-phase-3/task-events/*.json`
- `docs/superpowers/reports/2026-07-25-harness-bounded-task-packets-dogfood.md`
- `docs/superpowers/reviews/2026-07-25-harness-bounded-task-packets-review.md`

## Task 1: Register Task-Graph Limits and Approval-Bundle Compatibility

**Files:**
- Modify: `harness/manifest.json`
- Modify: `scripts/harness/lib/manifest.js`
- Modify: `scripts/harness/lib/workflow/schema.js`
- Modify: `scripts/harness/lib/workflow/projection.js`
- Modify: `scripts/harness/lib/workflow/cli.js`
- Modify: `scripts/harness/__tests__/manifest.test.js`
- Modify: `scripts/harness/__tests__/workflow_schema.test.js`
- Modify: `scripts/harness/__tests__/workflow_projection.test.js`
- Modify: `scripts/harness/__tests__/workflow_cli.test.js`

- [ ] **Step 1: Write failing manifest and compatibility tests**

Add assertions for this exact canonical contract:

```js
assert.deepEqual(manifest.workflow.tasks, {
  directory: 'docs/superpowers/task-graphs',
  limits: {
    maxTasks: 40,
    maxDependencies: 12,
    maxReadPaths: 24,
    maxWritePaths: 16,
    maxAcceptanceCriteria: 12,
    maxVerificationCommands: 8,
    maxTaskTextBytes: 8192,
    maxPacketBytes: 24576,
  },
});
assert.deepEqual(projected.plan.current.taskGraph, TASK_GRAPH);
```

Cover these cases:

```js
assert.doesNotThrow(() => validateEventPayload(HISTORICAL_PLAN_SUBMITTED, context));
assert.throws(() => buildNewPlanPayload({ plan: PLAN }), /--task-graph is required/);
assert.throws(
  () => validatePlanBundle({ plan: PLAN, taskGraph: MISMATCHED_GRAPH }),
  /embedded plan reference/,
);
```

- [ ] **Step 2: Run the focused tests to verify failure**

Run:

```bash
node --test \
  scripts/harness/__tests__/manifest.test.js \
  scripts/harness/__tests__/workflow_schema.test.js \
  scripts/harness/__tests__/workflow_projection.test.js \
  scripts/harness/__tests__/workflow_cli.test.js
```

Expected: FAIL because the manifest has no task bounds and plan payloads do not
support a task-graph artifact.

- [ ] **Step 3: Add the exact manifest contract**

Add:

```json
"tasks": {
  "directory": "docs/superpowers/task-graphs",
  "limits": {
    "maxTasks": 40,
    "maxDependencies": 12,
    "maxReadPaths": 24,
    "maxWritePaths": 16,
    "maxAcceptanceCriteria": 12,
    "maxVerificationCommands": 8,
    "maxTaskTextBytes": 8192,
    "maxPacketBytes": 24576
  }
}
```

inside `workflow`. Validate exact keys, positive safe integers, safe directory,
and a packet bound no smaller than the task-text bound.

- [ ] **Step 4: Extend plan evidence without invalidating history**

Represent a plan bundle as:

```js
{
  current: {
    artifact: planReference,
    taskGraph: taskGraphReference,
  },
  approved: {
    artifact: planReference,
    taskGraph: taskGraphReference,
  },
}
```

Accept absent `taskGraph` while replaying stored schema-version-1 plan events.
Require `--task-graph` in new `plan.submitted` and `plan.revised` CLI calls,
validate both artifacts immediately before append, and require the graph
loader in Task 2 to prove its embedded plan reference equals the plan artifact.
Approval copies the exact submitted pair after revalidation.

- [ ] **Step 5: Run focused tests and commit**

Run:

```bash
node --test \
  scripts/harness/__tests__/manifest.test.js \
  scripts/harness/__tests__/workflow_schema.test.js \
  scripts/harness/__tests__/workflow_projection.test.js \
  scripts/harness/__tests__/workflow_cli.test.js
```

Expected: PASS.

Commit:

```bash
git add harness/manifest.json scripts/harness/lib/manifest.js \
  scripts/harness/lib/workflow/schema.js \
  scripts/harness/lib/workflow/projection.js \
  scripts/harness/lib/workflow/cli.js \
  scripts/harness/__tests__/manifest.test.js \
  scripts/harness/__tests__/workflow_schema.test.js \
  scripts/harness/__tests__/workflow_projection.test.js \
  scripts/harness/__tests__/workflow_cli.test.js
git commit -m "feat: bind task graphs to approved plans"
```

## Task 2: Validate and Hash the Canonical Task Graph

**Files:**
- Create: `scripts/harness/lib/tasks/graph.js`
- Modify: `scripts/harness/lib/workflow/canonical.js`
- Create: `scripts/harness/__tests__/task_graph.test.js`
- Modify: `scripts/harness/__tests__/workflow_canonical.test.js`

- [ ] **Step 1: Write failing graph contract tests**

Use a minimal valid fixture and assert:

```js
const graph = loadTaskGraph({
  root,
  relativePath: GRAPH_PATH,
  limits: LIMITS,
  expectedInitiativeId: ID,
  expectedPlan: PLAN,
});
assert.equal(graph.graphHash, hashCanonicalObject(graph, 'graphHash'));
assert(Object.isFrozen(graph));
assert.equal(canonicalStringify(graph), fs.readFileSync(graphPath, 'utf8'));
```

Reject:

```js
for (const invalid of [
  unknownField,
  duplicateJsonKey,
  wrongSchemaVersion,
  invalidInitiativeId,
  planMismatch,
  invalidTaskId,
  duplicateTaskId,
  invalidKind,
  invalidOwner,
  emptyCriteria,
  emptyVerificationCommands,
  mutationWithoutWrites,
  validationWithWrites,
  graphHashMismatch,
]) {
  assert.throws(() => validateTaskGraph(invalid, options));
}
```

Add exact boundary tests for 40 tasks, 12 dependencies, 24 read scopes, 16
write scopes, 12 criteria, 8 commands, and 8192 UTF-8 text bytes; add one-over
tests for every bound.

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
node --test \
  scripts/harness/__tests__/workflow_canonical.test.js \
  scripts/harness/__tests__/task_graph.test.js
```

Expected: FAIL because graph hashing and validation do not exist.

- [ ] **Step 3: Export reusable canonical object helpers**

Add these exact APIs without weakening event validation:

```js
function hashCanonicalObject(value, hashField) {
  const cloned = canonicalClone(value);
  delete cloned[hashField];
  return sha256(canonicalStringify(cloned));
}

function verifyCanonicalHashedObject(value, hashField, label) {
  const parsed = parseCanonicalJson(value, label);
  const expected = hashCanonicalObject(parsed, hashField);
  if (parsed[hashField] !== expected) {
    throw new Error(`${label} hash mismatch`);
  }
  return deepFreeze(parsed);
}
```

Export `canonicalClone`, `canonicalStringify`, `hashCanonicalObject`,
`parseCanonicalJson`, and `verifyCanonicalHashedObject`. Keep
`finalizeEvent`/`verifyCanonicalEvent` behavior byte-identical.

- [ ] **Step 4: Implement the exact graph schema**

Use exact top-level keys:

```js
const GRAPH_KEYS = new Set([
  'schemaVersion',
  'initiativeId',
  'plan',
  'tasks',
  'graphHash',
]);
const TASK_KEYS = new Set([
  'id',
  'title',
  'kind',
  'ownerRole',
  'objective',
  'dependsOn',
  'readPaths',
  'writePaths',
  'acceptanceCriteria',
  'verificationCommands',
  'recommendedCommitMessage',
  'escalationNotes',
]);
```

Measure text bounds with:

```js
Buffer.byteLength(
  [
    task.title,
    task.objective,
    task.recommendedCommitMessage,
    ...task.acceptanceCriteria,
    ...task.verificationCommands.flat(),
    ...task.escalationNotes,
  ].join('\0'),
  'utf8',
);
```

Read with no-follow exact-file semantics, validate canonical bytes and
self-hash, verify the artifact reference through the existing evidence helper,
then deep-freeze the result.

- [ ] **Step 5: Run focused tests and commit**

Run:

```bash
node --test \
  scripts/harness/__tests__/workflow_canonical.test.js \
  scripts/harness/__tests__/task_graph.test.js
```

Expected: PASS.

Commit:

```bash
git add scripts/harness/lib/workflow/canonical.js \
  scripts/harness/lib/tasks/graph.js \
  scripts/harness/__tests__/workflow_canonical.test.js \
  scripts/harness/__tests__/task_graph.test.js
git commit -m "feat: validate canonical task graphs"
```

## Task 3: Enforce Portable Scopes, DAGs, and Ordered Writes

**Files:**
- Create: `scripts/harness/lib/tasks/path_scope.js`
- Modify: `scripts/harness/lib/tasks/graph.js`
- Create: `scripts/harness/__tests__/task_path_scope.test.js`
- Modify: `scripts/harness/__tests__/task_graph.test.js`

- [ ] **Step 1: Write failing scope and dependency tests**

Assert exact matches and the existing glob grammar:

```js
assert.equal(matchesScope('scripts/harness/lib/tasks/graph.js', 'scripts/harness/**'), true);
assert.equal(matchesScope('scripts/harness/lib/tasks/graph.js', 'scripts/*/graph.js'), false);
assert.equal(scopesOverlap('scripts/harness/**', 'scripts/harness/lib/tasks/*.js'), true);
assert.equal(scopesOverlap('harness/**', 'scripts/**'), false);
```

Reject absolute paths, `..`, `.`, duplicate identities, backslashes, non-NFC
text, Windows reserved segments, trailing dots/spaces, malformed `**`, symlink
escapes, unknown dependencies, self-dependencies, cycles, and unordered
overlapping write scopes.

Prove ordering:

```js
assert.doesNotThrow(() =>
  validateTaskOrdering([
    task('task-01', [], ['scripts/harness/**']),
    task('task-02', ['task-01'], ['scripts/harness/lib/tasks/*.js']),
  ]),
);
assert.throws(() =>
  validateTaskOrdering([
    task('task-01', [], ['scripts/harness/**']),
    task('task-02', [], ['scripts/harness/lib/tasks/*.js']),
  ]),
);
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
node --test \
  scripts/harness/__tests__/task_path_scope.test.js \
  scripts/harness/__tests__/task_graph.test.js
```

Expected: FAIL because task scopes and graph ordering are not implemented.

- [ ] **Step 3: Implement safe scope parsing and matching**

Expose:

```js
parsePathScope(scope);
matchesScope(relativePath, scope);
scopesOverlap(left, right);
assertScopeResolvesInside(root, scope);
```

Only `*` and whole-segment `**` are metacharacters; `?`, character classes, and
brace expansion remain invalid, matching the existing harness glob grammar.
Convert each segment to a deterministic regular expression after validating it through
`assertSafeRelativePath`; walk the literal prefix with `lstatSync` and reject
symlink components. `scopesOverlap` must be conservative: return `true` when
the two finite-state segment patterns can intersect, never return a false
negative.

- [ ] **Step 4: Add stable DAG and overlap validation**

Build task maps in task-ID order. Use depth-first color marking for cycle
detection, compute transitive reachability, and reject overlapping writes when
neither task reaches the other:

```js
const ordered = reaches(left.id, right.id) || reaches(right.id, left.id);
if (!ordered && anyScopeOverlap(left.writePaths, right.writePaths)) {
  errors.push(
    `Tasks ${left.id} and ${right.id} have unordered overlapping write scopes`,
  );
}
```

Return all deterministic graph errors sorted by task ID and rule, rather than
stopping after the first graph-wide error.

- [ ] **Step 5: Run focused tests and commit**

Run:

```bash
node --test \
  scripts/harness/__tests__/task_path_scope.test.js \
  scripts/harness/__tests__/task_graph.test.js
```

Expected: PASS.

Commit:

```bash
git add scripts/harness/lib/tasks/path_scope.js \
  scripts/harness/lib/tasks/graph.js \
  scripts/harness/__tests__/task_path_scope.test.js \
  scripts/harness/__tests__/task_graph.test.js
git commit -m "feat: enforce task dependency and write scopes"
```

## Task 4: Define Task Events and Deterministic Projection

**Files:**
- Create: `scripts/harness/lib/tasks/schema.js`
- Create: `scripts/harness/lib/tasks/projection.js`
- Create: `scripts/harness/__tests__/task_schema.test.js`
- Create: `scripts/harness/__tests__/task_projection.test.js`

- [ ] **Step 1: Write failing event-schema tests**

Require exact task-event types:

```js
assert.deepEqual(TASK_EVENT_TYPES, [
  'task_graph.activated',
  'task.claimed',
  'task.completed',
  'task.failed',
  'task.blocked',
  'task.unblocked',
  'task.released',
  'task_graph.replaced',
]);
```

Test every valid payload and reject unknown fields, invalid roles, bad hashes,
invalid timestamps, wrong parent links, wrong task IDs, empty basis/summary,
duplicate changed paths/check IDs, invalid execution modes, and a second root.

- [ ] **Step 2: Write failing projection tests**

Use a four-task diamond graph and assert:

```js
assert.deepEqual(projection.readyTaskIds, ['task-01']);
assert.equal(projection.tasks['task-01'].state, 'ready');
assert.equal(afterClaim.activeClaim.taskId, 'task-01');
assert.equal(afterComplete.tasks['task-01'].state, 'completed');
assert.deepEqual(afterComplete.readyTaskIds, ['task-02', 'task-03']);
assert.deepEqual(afterComplete.parallelReadyGroups, [['task-02', 'task-03']]);
assert.equal(afterReplace.tasks['task-01'].state, 'superseded');
```

Cover complete/fail/block/unblock/release, dependency rechecks, one active
claim, critical-trigger suppression, replacement with an active claim, and
stable task-ID ordering.

- [ ] **Step 3: Run tests to verify failure**

Run:

```bash
node --test \
  scripts/harness/__tests__/task_schema.test.js \
  scripts/harness/__tests__/task_projection.test.js
```

Expected: FAIL because task event validation and replay do not exist.

- [ ] **Step 4: Implement strict task-event payload validation**

Use the Phase 2 envelope and canonical hash functions. Bind root activation to:

```js
{
  initiative: { sequence, eventHash },
  spec,
  plan,
  taskGraph,
  branch,
  baseSha,
  graphHash,
  bootstrapCompletions,
}
```

For ordinary activations `bootstrapCompletions` is an explicit empty array.
Allow nonempty entries only under the locked Phase 3 bootstrap rule. Each entry
contains `taskId`, `startHead`, `endHead`, `changedPaths`, `summary`, and
`checks`.

- [ ] **Step 5: Implement pure projection**

Expose:

```js
replayTaskEvents({ graph, events, initiativeProjection });
deriveTaskState({ task, completed, blockers, activeClaim });
deriveReadyTaskIds(graph, completedIds, blockers, activeClaim);
deriveParallelReadyGroups(graph, readyTaskIds);
```

Reject invalid transitions while replaying. Store completion evidence by task
ID, preserve superseded graphs as history, and derive
`implementationReadyAllowed` only when every current task is completed and no
claim/blocker remains.

- [ ] **Step 6: Run focused tests and commit**

Run:

```bash
node --test \
  scripts/harness/__tests__/task_schema.test.js \
  scripts/harness/__tests__/task_projection.test.js
```

Expected: PASS.

Commit:

```bash
git add scripts/harness/lib/tasks/schema.js \
  scripts/harness/lib/tasks/projection.js \
  scripts/harness/__tests__/task_schema.test.js \
  scripts/harness/__tests__/task_projection.test.js
git commit -m "feat: project durable task execution state"
```

## Task 5: Generate Deterministic Bounded Task Packets

**Files:**
- Create: `scripts/harness/lib/tasks/packet.js`
- Create: `scripts/harness/__tests__/task_packet.test.js`

- [ ] **Step 1: Write failing packet tests**

Build an exact expected packet:

```js
const packet = createTaskPacket(context, 'task-02');
assert.deepEqual(Object.keys(packet).sort(), [
  'acceptanceCriteria',
  'branch',
  'constraints',
  'dependencyEvidence',
  'dependsOn',
  'escalationNotes',
  'graphHash',
  'initiativeId',
  'initiativeSequence',
  'kind',
  'objective',
  'ownerRole',
  'packetHash',
  'plan',
  'readPaths',
  'recommendedCommitMessage',
  'schemaVersion',
  'spec',
  'taskGraph',
  'taskId',
  'taskLedgerSequence',
  'title',
  'verificationCommands',
  'writePaths',
]);
assert.equal(packet.packetHash, hashCanonicalObject(packet, 'packetHash'));
assert.equal(canonicalStringify(packet), canonicalStringify(secondPacket));
```

For every binding input—initiative sequence, task-ledger sequence, branch,
spec, plan, graph artifact, graph hash, task field, dependency completion
hash—change one value and assert the packet hash changes. Reject non-ready
tasks and packets over 24576 canonical UTF-8 bytes.

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
node --test scripts/harness/__tests__/task_packet.test.js
```

Expected: FAIL because packet generation does not exist.

- [ ] **Step 3: Implement the exact packet builder**

Set:

```js
const constraints = {
  integrationAuthority: 'explicit-user-request-required',
  criticalTriggers: 'initiative-blocker-required',
  deviceQa: initiativeProjection.deviceQa.mode,
  commandExecution: 'worker-reported-not-automatic',
  writeScope: 'strict',
};
```

Sort dependency evidence by task ID and include only:

```js
{
  taskId,
  completionEventHash,
  endHead,
}
```

Never include transcript text, plan/spec bodies, source contents, environment
values, unrelated tasks, or inferred approvals. Canonicalize, measure, hash,
deep-freeze, and return the packet.

- [ ] **Step 4: Run focused tests and commit**

Run:

```bash
node --test scripts/harness/__tests__/task_packet.test.js
```

Expected: PASS.

Commit:

```bash
git add scripts/harness/lib/tasks/packet.js \
  scripts/harness/__tests__/task_packet.test.js
git commit -m "feat: emit deterministic bounded task packets"
```

## Task 6: Add the Immutable Task Ledger and Recovery

**Files:**
- Create: `scripts/harness/lib/tasks/store.js`
- Create: `scripts/harness/__tests__/task_store.test.js`

- [ ] **Step 1: Write failing store and recovery tests**

Adapt the proven Phase 2 adversarial fixture to
`docs/superpowers/initiatives/<id>/task-events/` and assert:

```js
const first = appendTaskEvent({ ...request, expectedSequence: 1 });
assert.match(first.path, /task-events\/000001-[a-f0-9]{64}\.json$/);
assert.equal(loadTaskHistory(options).projection.sequence, 1);
assert.throws(
  () => appendTaskEvent({ ...request, expectedSequence: 1 }),
  /Stale expected sequence/,
);
```

Cover forked sequences, duplicate hashes, filename mismatch, invalid UTF-8,
noncanonical bytes, symlink entries, unsupported filenames, lock races,
partial writes, fsync failures, install collisions, stale foreign locks,
live-process locks, dry-run recovery, wrong tokens, changed inodes, and
initiative `.workflow-*` files remaining untouched.

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
node --test scripts/harness/__tests__/task_store.test.js
```

Expected: FAIL because the task ledger does not exist.

- [ ] **Step 3: Implement task-specific durable storage**

Expose:

```js
appendTaskEvent({
  root,
  initiativeId,
  expectedSequence,
  event,
  graph,
  initiativeProjection,
});
loadTaskHistory({ root, initiativeId, graph, initiativeProjection });
recoverTaskRuntimeFiles({ root, initiativeId, token, dryRun });
```

Use:

```js
const EVENT_FILENAME = /^(\d{6})-([a-f0-9]{64})\.json$/;
const LOCK_NAME = '.tasks.lock';
const TEMP_FILENAME = /^\.tasks-([a-f0-9]{32})\.tmp$/;
```

Preserve Phase 2's no-follow reads, exclusive lock creation, exact inode
ownership, canonical temp bytes, file fsync, no-replace final install,
directory fsync, compare-and-swap sequence, and token-scoped recovery. Do not
change the initiative store.

- [ ] **Step 4: Run focused tests and commit**

Run:

```bash
node --test \
  scripts/harness/__tests__/workflow_store.test.js \
  scripts/harness/__tests__/task_store.test.js
```

Expected: PASS for both ledgers.

Commit:

```bash
git add scripts/harness/lib/tasks/store.js \
  scripts/harness/__tests__/task_store.test.js
git commit -m "feat: persist immutable task execution events"
```

## Task 7: Validate Committed Git Scope with Read-Only Commands

**Files:**
- Create: `scripts/harness/lib/tasks/git_scope.js`
- Create: `scripts/harness/__tests__/task_git_scope.test.js`

- [ ] **Step 1: Write failing Git-scope tests**

Stub the Git runner and assert the only allowed commands are:

```js
const READ_ONLY_GIT_COMMANDS = new Set([
  'rev-parse',
  'status',
  'merge-base',
  'diff',
]);
```

Cover attached branch, detached HEAD, branch mismatch, clean/dirty delivery,
ancestor/divergent end commits, empty mutation delta, validation-task HEAD
movement, create/modify/delete/rename/copy records, both rename paths,
evidence exclusions, near-miss prefixes, unsafe path identities, and
in-scope/out-of-scope changes.

Assert shell use is impossible:

```js
assert.equal(runGitCalls.every((args) => Array.isArray(args)), true);
assert.equal(runGitCalls.some((args) => args.join(' ').includes('sh -c')), false);
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
node --test scripts/harness/__tests__/task_git_scope.test.js
```

Expected: FAIL because Git task evidence is not implemented.

- [ ] **Step 3: Implement claim and completion evidence**

Expose:

```js
collectTaskStartRevision(root, expectedBranch, options);
collectTaskCompletionRevision(root, claim, task, options);
parseNameStatusZ(bytes);
validateChangedPaths(task, changedPaths);
```

Run direct argument arrays:

```js
['rev-parse', '--abbrev-ref', 'HEAD'];
['rev-parse', '--verify', 'HEAD'];
['status', '--porcelain=v1', '-z', '--untracked-files=all'];
['merge-base', '--is-ancestor', claim.startHead, endHead];
['diff', '--name-status', '-z', '--find-renames', '--find-copies', claim.startHead, endHead, '--'];
```

Exclude only paths under `docs/superpowers/initiatives/`,
`docs/superpowers/reviews/`, and `docs/superpowers/qa/`. Require every delivery
path to match at least one approved write scope. Mutation tasks require HEAD
movement and a nonempty delta; validation tasks require neither.

- [ ] **Step 4: Run focused tests and commit**

Run:

```bash
node --test scripts/harness/__tests__/task_git_scope.test.js
```

Expected: PASS.

Commit:

```bash
git add scripts/harness/lib/tasks/git_scope.js \
  scripts/harness/__tests__/task_git_scope.test.js
git commit -m "feat: enforce committed task write scopes"
```

## Task 8: Expose the Typed Task CLI

**Files:**
- Create: `scripts/harness/lib/tasks/status.js`
- Create: `scripts/harness/lib/tasks/cli.js`
- Modify: `scripts/harness/lib/workflow/cli.js`
- Modify: `scripts/harness/workflow.js`
- Create: `scripts/harness/__tests__/task_cli.test.js`

- [ ] **Step 1: Write failing CLI command tests**

Exercise:

```text
tasks activate
tasks status
tasks next
tasks packet
tasks claim
tasks complete
tasks fail
tasks block
tasks unblock
tasks release
tasks replace
tasks recover
```

Assert read-only commands append nothing and mutation commands append exactly
one event or nothing. Reject unknown/duplicate flags, positional arguments,
wrong roles, stale initiative/task sequences, stale packet hashes, non-ready
tasks, active claims, invalid canonical `--checks` JSON, and unapproved graph
replacement.

Use this completion check shape:

```json
[
  {
    "command": ["node", "--test", "scripts/harness/__tests__/task_cli.test.js"],
    "passed": true,
    "summary": "1 file passed"
  }
]
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
node --test scripts/harness/__tests__/task_cli.test.js
```

Expected: FAIL because the `tasks` command family does not exist.

- [ ] **Step 3: Implement read-only orchestration**

`tasks status`, `next`, and `packet` load and revalidate the current initiative,
approved artifacts, graph, and task ledger. `next` returns ready IDs in stable
order plus advisory parallel groups. `packet` requires `--json` and writes
canonical packet bytes.

Human status contains:

```text
Task graph: <completed>/<total> completed
Task ledger sequence: <n>
Active claim: <task-id|none>
Ready: <stable comma-separated IDs|none>
Blocked: <task-id:owner|none>
Implementation ready: <yes|no>
```

- [ ] **Step 4: Implement mutation orchestration**

Require exact packet regeneration before claim/complete. Sarah records claims,
completion, failure, blocking, unblocking, and release; Tariq records
activation/replacement. Claim captures current branch/HEAD. Completion
revalidates the repository and every required focused command report before
append. `fail`, `block`, and `release` never claim success.

For bootstrap activation accept:

```text
--bootstrap-completions <canonical-json-array>
```

only under the locked Phase 3 exception. Validate each imported range with
`collectTaskCompletionRevision` and require every imported task's declared
verification command to appear as passed.

- [ ] **Step 5: Run focused tests and commit**

Run:

```bash
node --test \
  scripts/harness/__tests__/task_cli.test.js \
  scripts/harness/__tests__/workflow_cli.test.js
```

Expected: PASS.

Commit:

```bash
git add scripts/harness/lib/tasks/status.js \
  scripts/harness/lib/tasks/cli.js \
  scripts/harness/lib/workflow/cli.js \
  scripts/harness/workflow.js \
  scripts/harness/__tests__/task_cli.test.js \
  scripts/harness/__tests__/workflow_cli.test.js
git commit -m "feat: add workflow task coordination commands"
```

## Task 9: Integrate Task State with Initiative Gates and Read-Only Harness Checks

**Files:**
- Modify: `scripts/harness/lib/workflow/status.js`
- Modify: `scripts/harness/lib/workflow/cli.js`
- Modify: `scripts/harness/lib/workflow/check.js`
- Modify: `scripts/harness/check.js`
- Modify: `lint-staged.config.mjs`
- Create: `scripts/harness/__tests__/task_integration.test.js`
- Modify: `scripts/harness/__tests__/workflow_status.test.js`
- Modify: `scripts/harness/__tests__/workflow_integration.test.js`
- Modify: `scripts/harness/__tests__/integration.test.js`

- [ ] **Step 1: Write failing integration tests**

Assert:

```js
assert.equal(status.tasks.completed, 3);
assert.equal(status.tasks.total, 5);
assert.equal(status.implementationReadyAllowed, false);
assert.throws(
  () => recordImplementationReady(incompleteContext),
  /current task graph has incomplete tasks/,
);
assert.doesNotThrow(() => recordImplementationReady(historicalNoGraphContext));
```

Also prove `harness:check` discovers every `task-events` ledger and current task
graph, reports corrupt/stale artifacts deterministically, performs no mutation,
and keeps `manifest.targets.length === 16` plus the existing six verification
checks.

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
node --test \
  scripts/harness/__tests__/task_integration.test.js \
  scripts/harness/__tests__/workflow_status.test.js \
  scripts/harness/__tests__/workflow_integration.test.js \
  scripts/harness/__tests__/integration.test.js
```

Expected: FAIL because initiative status and checks ignore task state.

- [ ] **Step 3: Add task-aware initiative status and gate checks**

When the approved plan bundle has a task graph, attach:

```js
tasks: {
  graphHash,
  sequence,
  latestEventType,
  completed,
  total,
  readyTaskIds,
  blockedTasks,
  activeClaim,
  implementationReadyAllowed,
}
```

Before `implementation.ready`, reload the exact bundle and task ledger and
require all current tasks completed. Preserve Phase 2 behavior for historical
approved plans with no graph.

- [ ] **Step 4: Add read-only validation wiring**

Discover only canonical initiative IDs and task-event directories. Validate
current graph bytes/hash/plan binding and task event replay. Add task graph and
task-event globs to lint-staged's existing `harness:check` group without adding
another CI job or a mutating formatter.

- [ ] **Step 5: Run focused tests and commit**

Run:

```bash
node --test \
  scripts/harness/__tests__/task_integration.test.js \
  scripts/harness/__tests__/workflow_status.test.js \
  scripts/harness/__tests__/workflow_integration.test.js \
  scripts/harness/__tests__/integration.test.js
```

Expected: PASS.

Commit:

```bash
git add scripts/harness/lib/workflow/status.js \
  scripts/harness/lib/workflow/cli.js \
  scripts/harness/lib/workflow/check.js \
  scripts/harness/check.js lint-staged.config.mjs \
  scripts/harness/__tests__/task_integration.test.js \
  scripts/harness/__tests__/workflow_status.test.js \
  scripts/harness/__tests__/workflow_integration.test.js \
  scripts/harness/__tests__/integration.test.js
git commit -m "feat: enforce task completion at implementation gate"
```

## Task 10: Generate Provider-Neutral Task Policy and Persona Guidance

**Files:**
- Modify: `harness/policy/workflow.md`
- Modify: `harness/policy/authority.md`
- Modify: `harness/personas/sarah.md`
- Modify: `harness/personas/tariq.md`
- Modify: `harness/personas/dev.md`
- Modify: `harness/templates/claude_feature_command.md`
- Modify: `harness/templates/claude_status_command.md`
- Modify: `harness/rules/semantics.json`
- Modify: `scripts/harness/__tests__/personas.test.js`
- Modify: `scripts/harness/__tests__/semantics.test.js`
- Modify: `scripts/harness/__tests__/workflow_commands.test.js`
- Modify: `scripts/harness/__tests__/semantic_integration.test.js`
- Regenerate: `AGENTS.md`
- Regenerate: `CLAUDE.md`
- Regenerate: `.codex/agents/{sarah,tariq,dev}.toml`
- Regenerate: `.claude/agents/{sarah,tariq,dev}.md`
- Regenerate: `.agents/skills/moneyapp-expert-panel/SKILL.md`
- Regenerate: `.claude/skills/moneyapp-expert-panel/SKILL.md`
- Regenerate: `.claude/commands/{feature,status}.md`

- [ ] **Step 1: Write failing policy-parity tests**

Require all supported surfaces to state:

```text
run initiative and task status before execution
claim the exact current packet before work
Sarah alone records task outcomes after repository inspection
workers stay inside packet write scopes
packets work inline or through a host dispatcher
task verification commands are not automatically executed
push, PR, merge, and destructive actions still require explicit user authority
```

Reject statements that repository code dispatches agents, calls provider APIs,
executes arbitrary packet commands, allows worker event writes, permits
concurrent claims, or grants repository integration.

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
node --test \
  scripts/harness/__tests__/personas.test.js \
  scripts/harness/__tests__/semantics.test.js \
  scripts/harness/__tests__/workflow_commands.test.js \
  scripts/harness/__tests__/semantic_integration.test.js
```

Expected: FAIL because generated policy does not describe task packets.

- [ ] **Step 3: Update canonical sources and semantic rules**

Make Sarah responsible for selection, exact claim, outcome recording, and
critical-trigger routing. Make Tariq responsible for plan/graph alignment,
activation, replacement, and review. Make Dev execute only a claimed packet,
report actual focused checks, and never write task events. Keep inline and
host-dispatched modes equivalent and provider-neutral.

- [ ] **Step 4: Regenerate and prove idempotence**

Run:

```bash
npm run harness:generate
npm run harness:generate
git diff --check
```

Expected: the second generation changes nothing; generated targets contain the
canonical task protocol and no provider API promise.

- [ ] **Step 5: Run focused tests and commit**

Run:

```bash
node --test \
  scripts/harness/__tests__/personas.test.js \
  scripts/harness/__tests__/semantics.test.js \
  scripts/harness/__tests__/workflow_commands.test.js \
  scripts/harness/__tests__/semantic_integration.test.js
npm run harness:check
```

Expected: PASS.

Commit:

```bash
git add harness AGENTS.md CLAUDE.md .codex/agents .claude/agents \
  .agents/skills/moneyapp-expert-panel/SKILL.md \
  .claude/skills/moneyapp-expert-panel/SKILL.md \
  .claude/commands scripts/harness/__tests__/personas.test.js \
  scripts/harness/__tests__/semantics.test.js \
  scripts/harness/__tests__/workflow_commands.test.js \
  scripts/harness/__tests__/semantic_integration.test.js
git commit -m "docs: generate bounded task execution policy"
```

## Task 11: Activate and Dogfood the Phase 3 Task Graph

**Files:**
- Read: `docs/superpowers/task-graphs/2026-07-25-harness-bounded-task-packets.json`
- Create: `docs/superpowers/initiatives/2026-07-25-harness-phase-3/task-events/*.json`
- Create: `docs/superpowers/reports/2026-07-25-harness-bounded-task-packets-dogfood.md`
- Test: all focused Phase 3 harness tests

- [ ] **Step 1: Build bootstrap completion evidence from actual commits**

For every already completed graph task, collect:

```bash
git show --format='%H%n%P%n%s' --name-status -z <task-commit>
```

Record the exact parent as `startHead`, commit as `endHead`, changed delivery
paths, the commit subject as summary, and the focused command named by that
task as a passed check. Do not include planning/spec/initiative-event commits
as implementation completions.

- [ ] **Step 2: Activate with the reviewed bootstrap evidence**

Run:

```bash
npm run workflow -- tasks activate \
  --id 2026-07-25-harness-phase-3 \
  --expected-initiative-sequence 8 \
  --task-graph docs/superpowers/task-graphs/2026-07-25-harness-bounded-task-packets.json \
  --bootstrap-completions '<canonical JSON from Step 1>'
```

Expected: one `task_graph.activated` root event whose imported tasks exactly
match validated commit ranges and whose remaining tasks project as ready or
pending.

- [ ] **Step 3: Prove deterministic fresh-checkout projection**

Run twice:

```bash
npm run workflow -- tasks status \
  --id 2026-07-25-harness-phase-3 --json
npm run workflow -- tasks next \
  --id 2026-07-25-harness-phase-3 --json
npm run workflow -- tasks packet \
  --id 2026-07-25-harness-phase-3 --task <first-ready-task> --json
```

Expected: byte-identical status ordering and packet output for unchanged
repository state. Copy the repository to a temporary directory with
`git archive HEAD`, copy the task-event evidence, and prove the same projection
and packet hash there.

- [ ] **Step 4: Claim Task 11 through the live packet protocol**

Generate and claim the Task 11 packet:

```bash
npm run workflow -- tasks packet \
  --id 2026-07-25-harness-phase-3 --task task-11 --json
npm run workflow -- tasks claim \
  --id 2026-07-25-harness-phase-3 --task task-11 \
  --packet-hash <packet-hash> --expected-sequence <task-sequence> \
  --mode inline --assignee-role dev \
  --basis "Inline Phase 3 dogfood under the product owner's no-subagent direction."
```

Keep Task 12 pending until Task 11's report commit and task completion are
recorded.

- [ ] **Step 5: Write, commit, and complete the dogfood task**

Create
`docs/superpowers/reports/2026-07-25-harness-bounded-task-packets-dogfood.md`
with the observed graph hash, completed/imported task count, live claim count,
packet byte sizes, fresh-checkout packet hash comparison, failures, releases,
blockers, retries, and scope violations. Use numeric zeroes when none occurred.

Commit:

```bash
git add docs/superpowers/reports/2026-07-25-harness-bounded-task-packets-dogfood.md \
  docs/superpowers/initiatives/2026-07-25-harness-phase-3/task-events
git commit -m "test: dogfood bounded task coordination"
```

Run every Task 11 verification command manually, inspect the actual Git range,
then record:

```bash
npm run workflow -- tasks complete \
  --id 2026-07-25-harness-phase-3 --task task-11 \
  --packet-hash <packet-hash> --expected-sequence <task-sequence> \
  --summary "<actual bounded result>" \
  --checks '<canonical JSON array of actual passed checks>'
```

On interruption use `tasks release`; on a test failure use `tasks fail`; on a
real dependency/critical trigger use `tasks block` plus the required initiative
blocker event. Never infer an outcome.

Run:

```bash
npm run workflow -- tasks status \
  --id 2026-07-25-harness-phase-3 --json
```

Expected: every current task is `completed`, no active claim/blocker exists,
except the final validation task, which is now `ready`.

## Task 12: Review, Verify, and Record Integration Readiness

**Files:**
- Create: `docs/superpowers/reviews/2026-07-25-harness-bounded-task-packets-review.md`
- Modify: `docs/superpowers/reports/2026-07-25-harness-bounded-task-packets-dogfood.md`
- Create: `docs/superpowers/initiatives/2026-07-25-harness-phase-3/events/*.json`
- Modify: `docs/superpowers/initiatives/2026-07-25-harness-phase-3/task-events/*.json`

- [ ] **Step 1: Run the complete harness regression suite**

Generate and claim Task 12 first:

```bash
npm run workflow -- tasks packet \
  --id 2026-07-25-harness-phase-3 --task task-12 --json
npm run workflow -- tasks claim \
  --id 2026-07-25-harness-phase-3 --task task-12 \
  --packet-hash <packet-hash> --expected-sequence <task-sequence> \
  --mode inline --assignee-role tariq \
  --basis "Run the final Phase 3 regression and review inline."
```

Run:

```bash
npm run harness:test
npm run harness:check
npm run format:check
npm run lint
npm run typecheck
```

Expected: all harness tests pass, all generated targets are current, formatting
is clean, lint is clean, and TypeScript reports no errors.

- [ ] **Step 2: Perform Tariq's evidence-backed review**

Review the diff against all thirteen specification acceptance criteria. Write a
review artifact containing:

```markdown
# Harness Bounded Task Packets Review

- Verdict: approved
- Scope: repository harness and generated policy only
- Dependency/native/runtime changes: none
- Task graph and packet determinism: verified
- Ledger durability and recovery: verified
- Git scope enforcement: verified
- Authority preservation: verified
- Device QA: not applicable
- Merge recommendation: approve after green six-check verification
```

Include exact focused commands, results, the observed graph hash, task count,
packet byte sizes, claim/failure/release/blocker counts, retry count, and any
scope violation count.

Append the final regression counts and review verdict to the delivery-visible
dogfood report. This report update is the Task 12 mutation delta; review and
ledger files remain evidence exclusions.

- [ ] **Step 3: Commit implementation and review evidence**

Run:

```bash
git add scripts harness AGENTS.md CLAUDE.md .codex .claude \
  .agents/skills/moneyapp-expert-panel \
  docs/superpowers/task-graphs \
  docs/superpowers/initiatives/2026-07-25-harness-phase-3 \
  docs/superpowers/reports/2026-07-25-harness-bounded-task-packets-dogfood.md \
  docs/superpowers/reviews/2026-07-25-harness-bounded-task-packets-review.md \
  lint-staged.config.mjs
git commit -m "test: verify harness phase 3 delivery"
```

Run every Task 12 verification command manually, inspect the committed range,
and complete the claim:

```bash
npm run workflow -- tasks complete \
  --id 2026-07-25-harness-phase-3 --task task-12 \
  --packet-hash <packet-hash> --expected-sequence <task-sequence> \
  --summary "Full harness regression and Tariq review are green." \
  --checks '<canonical JSON array of actual passed checks>'
```

Expected: all twelve graph tasks are completed and
`implementationReadyAllowed` is `true`.

- [ ] **Step 4: Record implementation and review gates**

Run:

```bash
npm run workflow -- record implementation.ready \
  --id 2026-07-25-harness-phase-3 \
  --expected-sequence 8 \
  --recorded-by dev
npm run workflow -- record review.approved \
  --id 2026-07-25-harness-phase-3 \
  --expected-sequence 9 \
  --recorded-by tariq \
  --review docs/superpowers/reviews/2026-07-25-harness-bounded-task-packets-review.md \
  --decision-by tariq \
  --basis "The approved specification and plan are fully implemented; task state, scope evidence, authority semantics, and focused regressions are green."
```

Expected: initiative phase remains `validation`, with current review evidence
bound to the exact delivery digest.

- [ ] **Step 5: Run the six-job local CI parity verifier**

Run:

```bash
npm run verify:pr
```

Expected: format, lint, typecheck, 221+ Jest suites, Expo Doctor, and Android
prebuild all pass. The verifier appends `verification.passed` for the current
delivery and transitions this device-QA-not-applicable initiative to
`integration_ready`.

- [ ] **Step 6: Verify final durable state and commit evidence**

Run:

```bash
npm run workflow -- check --id 2026-07-25-harness-phase-3
npm run workflow -- status --id 2026-07-25-harness-phase-3 --json
npm run workflow -- tasks status --id 2026-07-25-harness-phase-3 --json
git status --short
```

Expected: initiative and task ledgers are valid, all task artifacts are fresh,
all tasks are completed, phase is `integration_ready`, and only newly appended
evidence files are uncommitted.

Commit:

```bash
git add docs/superpowers/initiatives/2026-07-25-harness-phase-3
git commit -m "chore: record harness phase 3 verification"
```

Do not push or create a pull request without a new explicit user request.

## Plan Self-Review

- **Spec coverage:** Tasks 1–3 cover graph/evidence/limits/DAG/scope rules;
  Tasks 4–6 cover task events, projection, packets, atomicity, and recovery;
  Tasks 7–9 cover Git scope, CLI, status, historical compatibility, and the
  `implementation.ready` gate; Task 10 covers provider-neutral generated
  policy; Tasks 11–12 cover bootstrap dogfood, fresh-checkout determinism,
  review, six-check verification, and durable integration readiness.
- **Authority boundary:** No task authorizes provider calls, automatic command
  execution, sessions, subagents, worktrees, branches, commits, push, PR,
  merge, cleanup, product/runtime changes, dependencies, native changes, or CI
  job changes.
- **Type consistency:** `taskGraph`, `graphHash`, `packetHash`,
  `bootstrapCompletions`, `implementationReadyAllowed`, task IDs, event names,
  check records, artifact references, and CLI flag names are identical across
  the plan.
- **Placeholder scan:** The plan contains no deferred implementation markers,
  generic “handle errors” steps, or unspecified test instructions.
