# Harness Phase 3: Bounded Task Packets and Dispatch Coordination Design

- **Date:** 2026-07-25
- **Status:** Approved by product owner
- **Scope:** Content-bound task graphs, deterministic task packets, durable task execution state, and host-neutral dispatch coordination
- **Depends on:** Harness Phase 1 and Phase 2 merged through `4c150561be49d3904e2556b9345530c9987a4e3b`
- **Initiative:** `2026-07-25-harness-phase-3`
- **Execution branch:** `refactor/harness-phase-3-task-packets`

## Decision Summary

Phase 3 will turn each approved implementation plan into an explicit,
machine-readable task graph. The graph will describe bounded tasks, dependency
edges, ownership, context paths, write scopes, acceptance criteria, and
verification commands. It will be submitted and approved with the human-readable
plan, not inferred from headings, checkboxes, chat, or model interpretation.

A separate immutable task-run ledger will record graph activation, claims,
completion, failure, blocking, release, and graph replacement. A deterministic
CLI will project ready, active, blocked, and completed tasks and emit a
content-hashed packet for one task. The packet is suitable for inline execution
or host-level subagent dispatch.

The repository harness will not call Codex, Claude, or another provider API. It
will not create sessions, worktrees, commits, pushes, pull requests, merges, or
cleanup operations. Those remain host behavior governed by existing policy and,
where applicable, explicit user authority.

Phase 3 permits only one active task claim per initiative. It may report other
dependency-ready tasks and their parallel eligibility, but concurrent execution
waits for a later worktree/integration phase.

## Why This Phase Exists

Phases 1 and 2 solved two foundation problems:

1. current project policy and personas now have one canonical source with
   deterministic adapters and executable semantic checks;
2. initiative state, approvals, review, verification, and QA now survive chat
   loss because they are recorded in an immutable evidence-bound ledger.

Execution is still reconstructed from long Markdown plans and inherited
conversation context. Existing plans vary materially:

- task headings use both `## Task` and `### Task`;
- some plans contain checkpoints that are already complete;
- file lists, commands, acceptance criteria, and dependencies are prose;
- plans range from a few tasks to more than one thousand lines;
- checkboxes describe intended work but are not durable execution authority;
- a fresh worker must read much of the plan and session history before finding
  its actual assignment.

That is the remaining source of oversized prompts, repeated archaeology,
ambiguous ownership, accidental scope expansion, and risky parallel work.
Phase 3 moves repeated execution coordination into a small deterministic
contract while keeping product and technical judgment in the spec and plan.

## User and Team Outcome

For an initiative with an approved Phase 3 task graph:

- `workflow tasks status` reports exact task progress without reading chat;
- `workflow tasks next` identifies dependency-ready work deterministically;
- `workflow tasks packet` emits only the context needed for one task;
- stale plan, graph, packet, branch, or event-sequence evidence is rejected;
- an unexpected write path blocks task completion before the ledger advances;
- interruption or compaction requires the initiative ID, not the full session;
- the same packet can be executed inline or passed to a supported host agent;
- final initiative review and six-check verification remain authoritative.

The routine cost is one graph at plan time and typed events at meaningful task
transitions. Conversational updates, individual test attempts, and model
thoughts are not recorded.

## Design Principles

1. **Explicit contracts beat prose inference.** Task metadata is authored as
   canonical JSON and content-bound to the approved plan.
2. **Packets are bounded references, not copied history.** They include a task
   slice and exact artifact references, never an inherited transcript.
3. **The repository coordinates; the host dispatches.** The CLI emits stable
   data but does not depend on a provider API.
4. **One coordinator writes task state.** Workers report results; Sarah records
   task-run events through the initiative worktree.
5. **Claims are compare-and-swap operations.** Every mutation requires the
   observed task-ledger sequence and current packet hash.
6. **Write scope is executable.** Completion validates the committed path delta
   against the task's approved scope.
7. **Parallelism is earned.** Tasks are parallel-eligible only when their
   dependencies and write scopes cannot conflict.
8. **Final verification stays global.** Focused task checks improve feedback but
   never replace Tariq review or `verify:pr`.
9. **Historical evidence remains valid.** Existing Phase 2 ledgers and plans are
   not rewritten or retrofitted.
10. **No new authority.** A task packet never grants push, merge, destructive,
    Device QA, or critical-trigger authority.

## Approaches Considered

### Recommended: explicit task graph plus task-run ledger

The planner authors a JSON task graph beside the Markdown plan. Plan events bind
both artifacts. A separate append-only task ledger projects execution state and
the CLI emits deterministic packets.

Advantages:

- strict schema, DAG, path, size, and authority validation;
- stable across plan-writing styles and providers;
- exact stale-evidence detection;
- supports inline work now and host dispatch later;
- preserves a small initiative state machine.

Cost:

- the planner maintains structured task metadata in addition to explanatory
  Markdown;
- Phase 3 adds a second, task-scoped ledger and its tests.

### Rejected: infer tasks from existing Markdown

A parser could search for headings, file lists, checkboxes, and shell blocks.
This has a lower authoring cost but makes punctuation and formatting into
workflow authority. Existing plans already demonstrate incompatible heading
levels, checkpoints, embedded examples, and very large sections. Heuristics
would silently mis-scope packets or require a full Markdown parser and extensive
fallback judgment.

### Rejected: external planner or provider-specific swarm service

A service could own queues, identities, sessions, leases, and provider APIs.
That introduces authentication, network availability, cost, provider coupling,
and new operational infrastructure before MoneyApp has validated its local task
contract. It also expands repository authority beyond the approved harness
boundary.

## Scope

### In scope

- A versioned canonical task graph schema and validation policy.
- One content-hashed task graph artifact per approved plan revision.
- Optional task-graph references on new plan submission, approval, and revision
  events while preserving historical Phase 2 events.
- A separate immutable task-run event ledger per initiative.
- Deterministic projection of pending, ready, claimed, blocked, failed, released,
  completed, and superseded task state.
- Task dependency and unordered write-scope conflict validation.
- Bounded deterministic packet generation with a canonical packet hash.
- Typed CLI commands for task graph activation, status, ready-task selection,
  packet output, claim, completion, failure, block, unblock, release, and graph
  replacement.
- Clean committed-diff validation for task completion.
- Integration with initiative status and the `implementation.ready` precondition.
- Canonical policy, Sarah, Tariq, Dev, feature-command, and status-command
  guidance for packet-driven execution.
- Read-only validation in `harness:check`, lint-staged, and existing CI surfaces.
- Phase 3 dogfood using its approved plan and actual commits.
- Unit, corruption, concurrency, stale-evidence, scope, and integration tests.

### Out of scope

- Calling Codex, Claude, MCP, or other provider APIs.
- Automatically creating or managing subagents, sessions, chats, or archives.
- Automatic worktree, branch, commit, cherry-pick, rebase, push, PR, merge, or
  cleanup operations.
- Concurrent mutating task claims in one initiative.
- Automatically executing arbitrary commands from a task graph.
- Treating a task result as final code review or project verification.
- Model selection, token accounting, cost dashboards, or scheduling economics.
- Cryptographic user or worker identity.
- Retrospective task graphs for historical initiatives.
- Product, React Native, Expo, native, database, or migration changes.
- A new npm dependency, external service, or CI job.

## Canonical Artifacts

### Human plan

The Markdown implementation plan remains the readable technical execution
document:

```text
docs/superpowers/plans/YYYY-MM-DD-<feature>.md
```

It explains architecture, task intent, TDD steps, commands, and rollout.

### Task graph

The structured companion is:

```text
docs/superpowers/task-graphs/YYYY-MM-DD-<feature>.json
```

This path is outside the initiative/review/QA evidence exclusions, so it is part
of delivery content and changes the delivery digest.

The graph is canonical UTF-8 JSON with two-space indentation, one final LF, and
a self-hash computed with the existing canonical JSON rules.

### Task-run events

Task execution evidence is stored under:

```text
docs/superpowers/initiatives/<initiative-id>/task-events/
```

Task events are evidence, not implementation. They remain under the existing
initiative exclusion from the delivery digest. Their filenames use the Phase 2
sequence/hash convention:

```text
000001-<64-character-event-hash>.json
```

Task runtime lock and temporary names use a distinct `.tasks-<token>` namespace
and the same no-follow, exclusive-create, fsync, install, and recovery
requirements as initiative events.

## Task Graph Contract

The version 1 graph has this shape:

```json
{
  "schemaVersion": 1,
  "initiativeId": "2026-07-25-example",
  "plan": {
    "path": "docs/superpowers/plans/2026-07-25-example.md",
    "sha256": "<64 lowercase hex>"
  },
  "tasks": [
    {
      "id": "task-01",
      "title": "Add the bounded schema",
      "kind": "mutation",
      "ownerRole": "dev",
      "objective": "Implement and test the approved schema without changing runtime application code.",
      "dependsOn": [],
      "readPaths": [
        "docs/superpowers/specs/2026-07-25-example-design.md",
        "scripts/harness/lib/workflow/schema.js"
      ],
      "writePaths": [
        "scripts/harness/lib/tasks/schema.js",
        "scripts/harness/__tests__/task_schema.test.js"
      ],
      "acceptanceCriteria": [
        "Valid graphs load deterministically.",
        "Unknown fields and unsafe paths fail closed."
      ],
      "verificationCommands": [
        ["node", "--test", "scripts/harness/__tests__/task_schema.test.js"]
      ],
      "recommendedCommitMessage": "feat: validate bounded task graphs",
      "escalationNotes": []
    }
  ],
  "graphHash": "<64 lowercase hex>"
}
```

### Exact graph rules

- `initiativeId` is the same safe date-prefixed ID used by Phase 2.
- `plan` is an exact artifact reference validated by the existing evidence
  helper.
- Task IDs match `task-[0-9][0-9]` through `task-[0-9][0-9][0-9]` and are
  unique.
- `kind` is `mutation` or `validation`.
- `ownerRole` is one of `sarah`, `marcus`, `layla`, `tariq`, or `dev`.
- Dependencies reference existing tasks, contain no duplicates, and form a DAG.
- A task cannot depend on itself or on a transitive cycle.
- Paths use the existing safe, NFC, portable repository-relative path rules.
- Read and write entries may be exact paths or the existing harness glob
  grammar; absolute paths, parent traversal, aliases, and symlink escapes fail.
- Two tasks with overlapping write scopes must have a dependency path ordering
  one before the other. Unordered overlap makes the graph invalid.
- Every task has at least one verification command. Commands are nonempty
  argument arrays, not shell strings; they are packet content, and Phase 3 never
  executes them automatically.
- Mutation tasks have at least one write scope. Validation tasks have no write
  scopes and cannot claim a delivery change.
- Every task has at least one acceptance criterion.
- Empty optional arrays are stored explicitly for canonical output.
- Unknown fields fail closed.

### Initial packet bounds

Bounds are canonical manifest values rather than scattered constants:

- maximum 40 tasks per graph;
- maximum 12 direct dependencies per task;
- maximum 24 read scopes per task;
- maximum 16 write scopes per task;
- maximum 12 acceptance criteria per task;
- maximum 8 verification commands per task;
- maximum 8 KiB of objective, title, criteria, command, and escalation text per
  task;
- maximum 24 KiB canonical serialized packet size.

The limits keep a task useful while preventing a generated packet from becoming
another inherited session. Changing a limit is a canonical policy change with
tests, not a runtime override.

## Binding the Graph to Plan Approval

Phase 3 extends the payloads for future `plan.submitted`, `plan.approved`, and
`plan.revised` events with a `taskGraph` artifact reference.

Compatibility rules:

- existing schema-version-1 events without `taskGraph` remain valid;
- the CLI requires `--task-graph` for all newly submitted or revised plans after
  Phase 3;
- approval revalidates both plan and graph immediately before append;
- the graph's embedded plan reference must equal the submitted plan reference;
- projection stores plan and task graph as one approval bundle;
- changing either artifact makes the bundle stale and requires `plan.revised`;
- historical initiatives without a graph retain initiative status but cannot
  use task commands.

The task graph does not replace the plan. It is the machine execution view of
the same approved decision.

## Task-Run Event Model

The task ledger is separate from the initiative state machine so task
coordination cannot inflate or weaken initiative gates.

### `task_graph.activated`

Root event recorded by Tariq after plan approval. It binds:

- initiative ID;
- current initiative sequence and event hash;
- signed spec, approved plan, and approved task-graph references;
- initiative branch and base SHA;
- task graph hash.

It is legal only while the initiative is in `execution`.

### `task.claimed`

Recorded by Sarah after generating the exact current packet. It binds:

- task ID;
- packet hash;
- execution mode: `inline` or `dispatched`;
- assignee role;
- current task-ledger expected sequence;
- current Git branch and start HEAD;
- a nonempty assignment basis.

Only one incomplete task claim may exist. A stale packet, graph, initiative
sequence, branch, or task-ledger sequence rejects the claim.

### `task.completed`

Recorded by Sarah after the worker reports completion and the coordinator
inspects the repository. It binds:

- task ID and packet hash;
- start and end Git HEAD;
- the exact committed changed paths between those revisions, excluding task and
  initiative evidence paths;
- a bounded result summary;
- reported focused-check results;
- the claim event hash.

Completion requires:

- the same branch and graph;
- a clean delivery worktree outside evidence paths;
- an active matching claim;
- all dependencies still completed;
- for a mutation task, a nonempty commit range;
- for a mutation task, every changed delivery path to match the approved task
  write scopes and no path outside those scopes;
- for a validation task, no delivery path change and no HEAD movement;
- all required focused checks reported passed.

These checks establish task-scope evidence. They do not replace Tariq review or
the six global PR checks.

### `task.failed`

Ends the active claim and returns the task to `ready`. It records a bounded
failure summary and whether repository changes remain. Dirty delivery prevents
another claim until the coordinator resolves or commits the work.

### `task.blocked` and `task.unblocked`

`task.blocked` moves a ready or claimed task to `blocked` with an owner and
reason. If the reason is a canonical critical trigger, the initiative-level
`blocker.opened` event is also required before other forward work.

`task.unblocked` is recorded by Sarah with the resolution basis and returns the
task to `ready` when dependencies are complete.

### `task.released`

Returns an active claim to `ready` without asserting success. Release is
explicit; Phase 3 has no clock-based lease expiry and never guesses that a
worker or session is dead.

### `task_graph.replaced`

Recorded only after a newly revised plan and graph are approved. It binds the new
approval bundle and projects a fresh task set. It is rejected while a claim is
active or delivery is dirty; the coordinator must explicitly complete, fail,
block, or release current work first. Prior task events remain immutable
evidence. Completed task IDs are not silently carried forward; the revised graph
must explicitly account for retained work in its task design.

## Task Projection

Replay derives each task as:

- `pending` — at least one dependency is incomplete;
- `ready` — all dependencies are complete and no claim or blocker is active;
- `claimed` — one current packet has been assigned;
- `blocked` — an explicit task blocker is open;
- `completed` — a valid completion event exists for the current graph;
- `superseded` — the task belongs to a replaced graph.

The graph projection also reports:

- graph and plan evidence validity;
- task-ledger sequence and latest event;
- ready tasks in stable task-ID order;
- one active claim, if any;
- blocked tasks and owners;
- completed count and total count;
- parallel-eligible ready groups based on dependency and write-scope analysis;
- exact next legal commands;
- whether `implementation.ready` is allowed.

`implementation.ready` is rejected when an approved task graph exists and any
current task is not completed. Historical initiatives without a graph preserve
their Phase 2 behavior.

## Deterministic Task Packet

`workflow tasks packet` emits canonical JSON. The same repository content and
ledger state produce byte-identical output.

The packet contains:

- packet schema version and packet hash;
- initiative ID, branch, initiative sequence, and task-ledger sequence;
- signed spec, approved plan, and task-graph references;
- graph hash;
- task ID, title, kind, owner, objective, and dependencies;
- only the task's read scopes, write scopes, acceptance criteria, verification
  argument arrays, recommended commit message, and escalation notes;
- completion evidence hashes for direct dependencies;
- execution constraints derived from canonical authority policy;
- a reminder that repository integration, critical triggers, and Device QA keep
  their existing authority.

The packet does not contain:

- chat transcripts or session summaries;
- the complete spec or plan body;
- unrelated task instructions;
- source-file contents;
- secrets or environment values;
- approval or QA inference;
- a command granting repository integration.

Consumers resolve referenced files through normal tools when needed. The packet
is an assignment contract, not a preloaded context dump.

## CLI Contract

Commands remain under the existing dependency-free entry point:

```bash
npm run workflow -- tasks activate --id <initiative-id> \
  --expected-initiative-sequence <n> \
  --task-graph <repository-relative-path>

npm run workflow -- tasks status --id <initiative-id> [--json]
npm run workflow -- tasks next --id <initiative-id> [--json]
npm run workflow -- tasks packet --id <initiative-id> --task <task-id> --json

npm run workflow -- tasks claim --id <initiative-id> \
  --task <task-id> \
  --packet-hash <hash> \
  --expected-sequence <n> \
  --mode <inline|dispatched> \
  --assignee-role <role> \
  --basis <basis>

npm run workflow -- tasks complete --id <initiative-id> \
  --task <task-id> \
  --packet-hash <hash> \
  --expected-sequence <n> \
  --summary <summary> \
  --checks <canonical-json>

npm run workflow -- tasks fail|block|unblock|release ...
npm run workflow -- tasks replace ...
npm run workflow -- tasks recover --id <initiative-id> --token <token> [--dry-run]
```

Mutation commands append one typed event or nothing. Read-only commands never
repair, claim, release, complete, dispatch, or execute work.

`tasks next` reports stable ready-task order and parallel eligibility. It does
not create a claim. `tasks packet` does not create a claim. The host must
explicitly claim the exact packet before execution.

## Host-Neutral Dispatch

The generated MoneyApp policy will define this host protocol:

1. run initiative and task status;
2. generate one current packet;
3. claim that exact packet;
4. execute it inline or pass the packet unchanged to the domain owner;
5. keep the worker inside packet scope;
6. inspect the actual Git diff and focused checks;
7. record completion, failure, blocking, or release;
8. repeat until all tasks complete;
9. proceed to initiative review and verification.

Provider adapters may use their native dispatch tools, but repository code will
not invoke those tools. A host without subagents uses `mode=inline` with the
same packet and ledger. This Phase 3 implementation will itself run inline in
accordance with the user's current no-subagent direction.

Worker messages are not workflow authority. Only coordinator-recorded task
events after repository inspection advance durable task state.

## Git and Write-Scope Validation

Task claim captures the current branch and start HEAD using read-only Git.
Completion captures current HEAD and uses direct Git argument arrays—never a
shell—to obtain the committed name-status delta.

Validation rules:

- branch must equal the initiative branch;
- HEAD must be attached;
- delivery must be clean outside existing evidence prefixes;
- end HEAD must descend from start HEAD;
- renamed paths validate both source and destination;
- copied destinations validate as writes;
- deleted paths require write permission;
- task/initiative evidence paths are excluded from task delivery scope;
- case, Unicode, path separator, and symlink aliases fail closed;
- an empty delivery delta cannot complete a mutation task;
- a validation task cannot complete after HEAD movement or a delivery delta;
- paths touched by another unordered task fail graph validation before claim.

Phase 3 validates commits but never creates them.

## Concurrency Model

Task event appends reuse Phase 2's exclusive lock, expected-sequence,
inode-capture, no-replace install, directory-fsync, and token-scoped recovery
model with a task-specific namespace.

Additional rules:

- only Sarah's coordinator context writes the task ledger;
- workers never append task events directly;
- at most one active task claim exists;
- two coordinators racing to claim use the same expected sequence, so one fails;
- packet hash binds a claim to the exact graph and ledger snapshot;
- replacing a graph invalidates every packet from the previous graph;
- no automatic timeout reassigns ownership;
- cross-worktree task-ledger forks are detected and rejected.

Parallel-ready reporting is advisory in Phase 3. Concurrent mutating dispatch
requires the later branch/worktree integration phase.

## Error Handling and Recovery

- Invalid graph: report every deterministic schema, DAG, path, overlap, or
  budget error; write no task event.
- Stale plan or graph: report exact expected and observed artifact hashes and
  require a typed plan revision.
- Stale packet: report current graph and sequence; regenerate the packet.
- Scope violation: list unexpected changed paths; keep the claim active until
  the coordinator resolves the repository.
- Failed focused checks: refuse completion and keep the claim active unless
  `task.failed` is recorded.
- Interrupted dispatch: `task.released` returns the task to ready; no inferred
  death or timeout.
- Critical trigger: require the initiative blocker event and suppress further
  claims until resolution.
- Task-ledger corruption or fork: make task status invalid and make
  `harness:check` fail without selecting a branch automatically.
- Runtime residue: expose the same token-specific dry-run and recovery behavior
  as Phase 2.

Errors never trigger cleanup, reset, branch deletion, or remote mutation.

## Generated Harness Integration

Canonical sources will be updated rather than editing generated files:

- workflow policy describes approved-plan task graphs and packet execution;
- Sarah owns packet selection, claims, durable outcomes, and blocker routing;
- Tariq authors/reviews graph structure and plan alignment;
- Dev executes only the claimed packet and reports actual results;
- feature command resumes initiative and task state before execution;
- status command reports task progress when a graph is active.

The generator then refreshes:

- `AGENTS.md`;
- `CLAUDE.md`;
- Codex and Claude Sarah/Tariq/Dev personas;
- Claude feature and status commands;
- any MoneyApp expert-panel sections that contain changed binding decisions.

Semantic rules verify identical authority across supported surfaces and prohibit
claims that the harness may dispatch through provider APIs or perform repository
integration.

## Daily Workflow

After Phase 3, a normal feature follows this sequence:

1. initialize the initiative ledger;
2. brainstorm and sign the spec;
3. write the Markdown plan and task graph together;
4. submit and approve both artifacts;
5. activate the graph;
6. ask task status for the next ready task;
7. generate and claim one packet;
8. execute inline or dispatch through the host;
9. inspect committed scope and record the outcome;
10. repeat until task status is complete;
11. record `implementation.ready`;
12. run Tariq review, canonical verification, Device QA when required, and
    user-authorized repository integration.

A resumed session starts at steps 1 and 6: initiative ID plus durable status is
enough to locate current work.

## Dogfood and Rollout

Phase 3 is a bootstrap initiative because its plan and early implementation
exist before task-graph support is executable.

The one-time bootstrap is:

1. commit and sign this design through the Phase 2 initiative ledger;
2. write and approve the Phase 3 plan using the existing plan event shape;
3. author the companion graph manually to the approved version 1 schema;
4. implement the foundational graph, ledger, and packet modules through the
   approved plan without pretending task events already existed;
5. activate the actual graph once the CLI supports it, citing the approved plan
   and bootstrap basis;
6. import already completed Phase 3 tasks only from their actual commits and
   verified changed paths;
7. use live packets and events for the remaining integration, review-preparation,
   and verification tasks;
8. prove that a fresh checkout projects the same task state and emits the same
   next packet.

No other historical initiative is backfilled.

Rollout remains one Phase 3 branch and one PR. There is no stacked base branch.
The PR targets current `main` after the complete task engine, dogfood record,
review, and verification are ready.

## Test Strategy

### Graph and packet tests

- canonical graph and packet hashing;
- strict keys and schema version;
- task ID and role validation;
- safe portable paths and glob behavior;
- DAG cycle and missing-dependency rejection;
- unordered write-scope overlap rejection;
- deterministic ready ordering and parallel eligibility;
- every packet budget boundary;
- byte-identical packets for identical state;
- packet-hash changes for every binding input.

### Task-ledger tests

- every legal event and origin;
- forbidden transitions and roles;
- claim compare-and-swap behavior;
- one-active-write-claim enforcement;
- completion, failure, blocking, release, and replacement projection;
- stale graph, plan, packet, branch, and sequence rejection;
- corruption, forks, symlinks, unsupported names, and invalid UTF-8;
- lock, fsync, install, crash, cleanup, and token recovery failures.

### Git scope tests

- exact, created, modified, renamed, copied, and deleted paths;
- evidence exclusions and near-miss prefixes;
- dirty worktree, detached HEAD, divergent history, and empty delta;
- case, Unicode, separator, symlink, and directory aliases;
- paths inside and outside approved scopes;
- no write-capable or shell Git invocation.

### Integration tests

- plan and graph approval bundle compatibility;
- historical Phase 2 ledgers remain valid;
- initiative execution status includes task summary;
- `implementation.ready` rejects incomplete current graphs;
- generated policy and command parity;
- lint-staged and `harness:check` validate task artifacts read-only;
- inline and dispatched modes produce the same packet contract;
- full harness tests and unchanged six-job `verify:pr`.

## Success Metrics

Phase 3 records enough deterministic data for later analysis without adding a
dashboard. Dogfood reports:

- total graph tasks;
- canonical packet byte size per task;
- number of read and write scopes per task;
- claim attempts, failures, releases, and blockers;
- unexpected write-scope violations;
- task retries;
- time between recorded claim and outcome as descriptive evidence only;
- full-session context copied into packets: zero.

The design succeeds when a fresh session can identify and execute the next task
from repository state without scanning the full plan or prior conversation.

## Acceptance Criteria

1. A strict, self-hashed task graph is submitted and approved with every new
   plan while historical plan events remain valid.
2. Graph validation rejects cycles, unknown dependencies, unsafe paths,
   excessive packets, and unordered overlapping write scopes.
3. Task-run history is immutable, atomic, recoverable, and independently
   projected from initiative state.
4. Ready-task ordering and packet bytes are deterministic.
5. Claims bind the exact graph, packet, branch, Git start revision, and expected
   task-ledger sequence.
6. Completion rejects dirty, empty, divergent, or out-of-scope committed
   changes.
7. At most one task claim is active; parallel groups are advisory only.
8. The same packet supports inline and host-dispatched execution.
9. No repository code calls a provider API or creates a session, worktree,
   branch, commit, push, PR, merge, or cleanup action.
10. Task completion cannot bypass review, `verify:pr`, Device QA, critical
    triggers, or explicit user integration authority.
11. Phase 3 dogfood reaches all tasks complete and the initiative reaches
    `integration_ready` with fresh review and verification evidence.
12. The complete harness suite and existing six CI jobs remain green.
13. No application source, dependency, native configuration, migration, or CI
    job changes.

## Critical-Trigger Assessment

This specification changes how all future implementation plans are executed,
so the normal user Spec sign-off gate applies.

Device QA is `not_applicable` for Phase 3 because the implementation is
repository tooling and generated agent policy only. It changes no application,
Expo, native, database, or user-facing runtime behavior.

The following are additional critical triggers and are not authorized:

- adding a dependency, provider SDK, service, authentication, or identity
  system;
- automatically creating sessions, agents, worktrees, branches, commits, or
  remote operations;
- enabling concurrent task claims;
- weakening review, verification, QA, or user integration authority;
- rewriting historical plans or ledgers;
- changing product/runtime code;
- expanding Phase 3 into worktree, PR, archive, or cleanup automation.

## Phase Boundary

After product-owner sign-off:

1. record `spec.submitted` and `spec.signed` in the Phase 3 initiative ledger;
2. invoke `writing-plans` to produce the detailed implementation plan and
   bootstrap task graph;
3. let Sarah approve the plan on the user's behalf;
4. implement inline in the existing Phase 3 worktree, because the user requested
   no subagents for this work;
5. stop again only at critical triggers, Device QA if scope changes, or
   user-controlled repository integration.

The next harness phase may automate isolated worktree/branch preparation and PR
handoff using Phase 3 packets. It must remain separate because those operations
have a larger repository blast radius and different authority requirements.
