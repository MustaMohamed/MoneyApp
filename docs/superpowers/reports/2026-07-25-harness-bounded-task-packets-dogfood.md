# Harness Bounded Task Packets Dogfood Report

## Current Snapshot

- Initiative: `2026-07-25-harness-phase-3`
- Branch: `refactor/harness-phase-3-task-packets`
- Current graph: `docs/superpowers/task-graphs/2026-07-25-harness-bounded-task-packets-v8.json`
- Graph hash: `8758b85f41035f0e1620aa125e8b61c72f0c5401e1f20818fa17eec1f7ae14cd`
- Graph artifact SHA-256: `6d15e131d1577637d554ed029020d2db14a2414e4cf7bb2b7bd5042e149a21b0`
- Plan artifact SHA-256: `7b0679cac856115cfb5b59202c384bb489971f2016d8b15be2b99e5bb52c5ed3`
- Current tasks: 15
- Imported completed tasks before this live claim: 14
- Current live task at review checkpoint: `task-15`
- Task-ledger sequence at review checkpoint: 17
- Device QA: not applicable

## Observed Metrics

| Metric | Count |
| --- | ---: |
| Task-ledger activations | 1 |
| Task-graph replacements | 5 |
| Recorded live claims | 6 |
| Recorded task failures | 4 |
| Recorded releases | 0 |
| Recorded task blockers | 0 |
| Critical-trigger blockers | 0 |
| Rejected mutations with no event appended | 6 |
| Defined execution retries | 11 |
| Scope-violation batches | 1 |
| Tasks in the scope-violation batch | 2 |
| Preserved graph artifacts | 8 |

`Defined execution retries` counts the initial activation scope correction, the
first failed dogfood regression, the bad-SHA replacement retry, the first
post-replacement claim retry, the repeated-replacement resolver retry, and the
current-graph fixture retry, plus the rejected noncanonical completion payload,
immutable-evidence formatter correction, source-format correction, type-aware
lint correction, and v8 committed-graph task-count correction. It does not
count ordinary read-only status or packet regeneration.

## Determinism Evidence

For unchanged v6 state, two consecutive status and packet calls were
byte-identical.

- Task-ledger sequence before the current claim: 8
- Status bytes: 403
- Packet bytes: 2,922
- Packet hash:
  `bc8ed545f2a7e80728a7164e6d0fa26aba8ba61cd5ec579a3638cb149401d2c4`
- Fresh checkout:
  `/tmp/moneyapp-phase3-v6.Oa9clU/checkout`
- Fresh-checkout status: byte-identical
- Fresh-checkout packet: byte-identical
- Fresh-checkout packet hash:
  `bc8ed545f2a7e80728a7164e6d0fa26aba8ba61cd5ec579a3638cb149401d2c4`

Earlier immutable checkpoints also matched their fresh checkout:

| Graph | Ready task | Packet bytes | Packet hash |
| --- | --- | ---: | --- |
| Original | `task-11` | 2,698 | `07b620553ac07aecfe6eebf8c119eed0973119bd9e8aabda84815563a9928b8e` |
| v2 | `task-12` | 2,716 | `e7a4d2ce21e153b7af0e456066241a8a78082eeddcb322da2531b3fee7a4037b` |
| v5 | `task-13` | 2,716 | `3280022c11bef0d3b058e536d1cdb40d5159e125dcb800146b79002b8913d9c8` |
| v6 | `task-13` | 2,922 | `bc8ed545f2a7e80728a7164e6d0fa26aba8ba61cd5ec579a3638cb149401d2c4` |
| v8 | `task-15` | 3,232 | `bbf28f8f62cd4f02274362681badf402a3600fed622f8867a8b14ecac9dcbfd8` |

## Dogfood Findings and Repairs

1. Bootstrap activation rejected omitted Task 8 and Task 9 write paths. The
   graph was corrected before activation; no invalid completion was imported.
2. The first live regression found an old workflow-machine manifest fixture.
   The task failed explicitly, then the fixture was updated under a revised
   approved graph.
3. Real graph replacement exposed three coupled replay assumptions that unit
   fixtures had not exercised: historical activation versus the latest
   approval bundle, candidate-event replay starting from the replacement graph,
   and a replacement CLI resolver that discarded historical graph resolution.
   Each received a focused failing regression before repair.
4. A replacement attempt with an incorrect full commit SHA was rejected by
   ancestry validation and appended no event.
5. The next full regression found the committed-graph fixture pinned to the
   immutable original graph while hashing the revised current plan. The v6 live
   packet owns the exact two-line fixture correction.
6. A canonical task-completion payload supplied as compact JSON was rejected
   without an append; retrying the exact pretty canonical bytes succeeded.
7. Repository-wide formatting attempted to rewrite canonical self-hashed
   initiative events, task events, and graphs. v7 added tested exclusions to
   both oxfmt and lint-staged while preserving harness validation.
8. The first exact type-aware lint run exposed five Phase 3 errors: four
   unnecessary bounds conditions in path-scope intersection and one redundant
   `O_NOFOLLOW` fallback. v8 repaired them without weakening lint policy.

The intermediate graphs remain immutable evidence. No event, graph, or shipped
migration was rewritten.

## Current Verification

- `node --test scripts/harness/__tests__/task_path_scope.test.js scripts/harness/__tests__/task_graph.test.js`:
  12 passed, 0 failed.
- `npm run harness:test`:
  514 tests, 513 passed, 0 failed, 1 filesystem-capability skip.
- `npm run harness:check`:
  valid, 16 generated targets current.
- `npm run format:check`:
  all formatter-managed files use the correct format.
- `npm run lint`:
  exit 0 with no errors; existing warning-level debt remains non-blocking.
- `npm run typecheck`:
  exit 0 with no TypeScript errors.

## Authority and Scope

- Provider API calls: 0
- Automatic task command execution: 0
- Automatic subagent/session dispatch: 0
- Automatic branch/worktree/commit/push/PR/merge actions by the harness: 0
- New dependencies or native changes: 0
- Signals dependencies or Signals guidance added: 0
- Pushes, pull requests, or merges performed in this phase: 0

Task packets remained execution context, not integration authority. Repository
integration still requires the product owner's explicit request.

## Review Verdict

Inline Tariq review verdict: **approved with no blocking findings**. All thirteen
specification acceptance criteria are covered by implementation and executable
evidence. Merge is recommended only after Task 15 completion, fresh
`implementation.ready` and `review.approved` receipts, and a green six-job
`npm run verify:pr` receipt. Repository integration remains a separate explicit
product-owner action.
