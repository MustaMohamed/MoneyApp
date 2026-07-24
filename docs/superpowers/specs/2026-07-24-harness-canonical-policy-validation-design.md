# Harness Phase 1: Canonical Policy and Validation Design

- **Date:** 2026-07-24
- **Status:** Design approved; written specification awaiting user review
- **Scope:** Canonical harness policy, generated Codex and Claude adapters, semantic validation, and enforcement of the repository's existing verification contract

## Goal

Replace MoneyApp's duplicated, contradictory agent instructions with one human-maintained policy model and deterministic generated adapters. Make policy drift, stale stack guidance, invalid authority, and verification mismatches fail locally and in CI before they can shape future agent work.

This is the foundation of the larger harness refactor. It does not introduce the workflow state machine, automated task dispatch, PR orchestration, QA recording, session archival, or worktree cleanup.

## Why This Phase Exists

The session and repository audit found a coordination problem rather than a model-capability problem:

- A single root task grew to about 472 MB, crossed 25 branches, and compacted 120 times.
- The repository has roughly 120 tracked harness assets across root policy, Codex, Claude, and skill surfaces.
- Seventeen shared skill files differ between `.agents/skills/` and `.claude/skills/`.
- Current Codex persona and inline-persona guidance still prescribes Preact Signals even though the app and root policy use Zustand and the Signals dependency was removed.
- Repository authority differs between live surfaces: current policy reserves push, merge, and destructive actions for the user, while other guidance assigns integration authority to agents.
- Claude command guidance contains obsolete user approval gates.
- The existing asset validator checks structure and syntax but does not detect semantic contradictions.
- Local pre-push enforcement does not execute the full six-check CI-parity contract.

These are small-team versions of the split-brain design, oversized shared memory, and coordination churn described in Cursor's agent-swarm research. MoneyApp does not need swarm-scale infrastructure; it needs a single source of truth and executable invariants.

## Design Principles

1. **Intent is authored once.** Stable project policy and persona responsibilities have one canonical source.
2. **Adapters are products, not authorities.** Codex and Claude files are rendered views of the same policy.
3. **Generation prevents textual drift; validation prevents semantic drift.**
4. **Repository facts outrank stale prose.** Dependency and workflow assertions are checked against the repository.
5. **Stable policy is separate from historical artifacts.** Old specs and plans remain evidence and are not rewritten into false current state.
6. **The foundation stays small.** Existing Node, npm, Git, Husky, and CI are sufficient; no dependency or native change is allowed.
7. **Checks are deterministic and side-effect free by default.** Read-only checking is safe in hooks and CI.
8. **Human authority remains explicit.** Automation may prepare and verify repository operations but may not grant itself permission to push, merge, or destroy data.

## Supported Surfaces

Phase 1 supports both Codex and Claude. This is the conservative migration choice because both surfaces are tracked and contain MoneyApp-specific behavior. Retiring Claude later is a separate, explicit cleanup decision.

Supported generated surfaces are:

- root `AGENTS.md`;
- root `CLAUDE.md`;
- `.codex/agents/{sarah,marcus,layla,tariq,dev}.toml`;
- `.claude/agents/{sarah,marcus,layla,tariq,dev}.md`;
- the MoneyApp expert-panel content used by the `.agents` and `.claude` skill surfaces;
- Claude workflow commands whose gates and authority derive from the canonical workflow policy.

Generic or third-party skill instructions are not rewritten merely because copies differ. A tracked skill becomes a generated target only when it embeds MoneyApp-specific policy or persona content. Other live skill files are scanned for forbidden MoneyApp claims but remain owned by their upstream skill.

## Scope

### In scope

- Capture the current authority, workflow, stack, architecture, UI, and verification rules as canonical Markdown modules.
- Capture each MoneyApp persona's domain, responsibilities, escalation boundary, and repository authority once.
- Add an explicit manifest that maps canonical content and adapter templates to generated targets.
- Generate supported Codex and Claude policy/persona surfaces deterministically.
- Add semantic rules that compare live harness content with canonical policy and repository facts.
- Add one canonical six-check PR-verification command and make the pre-push hook call it.
- Add `harness:generate` and `harness:check` npm commands.
- Integrate read-only harness validation into relevant staged-file checks and pull-request CI.
- Add regression fixtures for contradictions observed in MoneyApp history.
- Produce a before/after drift report for Phase 1.
- Document how maintainers safely change harness policy.

### Out of scope

- Product behavior or React Native application changes.
- A workflow-state manifest for individual initiatives.
- Planner/worker task-tree generation or automatic subagent dispatch.
- Automatic commit, push, PR, merge, or destructive cleanup.
- Review-lens orchestration.
- Device-QA automation or inferred QA verdicts.
- Expo development-server lifecycle management.
- Session creation, handoff, archive, or deletion.
- Retrospective rewriting of specs, plans, reviews, or QA records.
- A custom version-control or merge-conflict system.
- Model-routing or model-cost optimization.
- New npm packages, native modules, or external services.

## Canonical Source Architecture

The implementation will introduce a repository-owned harness source tree:

```text
harness/
  manifest.json
  policy/
    authority.md
    workflow.md
    stack.md
    architecture.md
    ui.md
    verification.md
  personas/
    sarah.md
    marcus.md
    layla.md
    tariq.md
    dev.md
  templates/
    agents.md
    claude.md
    codex_agent.toml
    claude_agent.md
    expert_panel.md
    claude_feature_command.md
  rules/
    semantics.json
  fixtures/
    invalid/
    valid/
```

Responsibilities are deliberately separated:

- `policy/` contains human-maintained project truth in readable Markdown.
- `personas/` contains domain ownership and behavior shared by inline and dispatched personas.
- `templates/` contains surface-specific framing and serialization, not independent project decisions.
- `manifest.json` declares every source, generated target, template, and required section.
- `rules/semantics.json` declares stable invariant identifiers and the repository evidence used to validate them.
- `fixtures/` records representative valid and invalid harness states for regression tests.

These paths and ownership boundaries are binding. Any required path change must be made as an explicit amendment to this specification rather than decided during implementation.

## Generation Model

`npm run harness:generate` renders only targets declared in `harness/manifest.json`.

Generation must be:

- deterministic: identical inputs produce byte-identical outputs;
- idempotent: a second run produces no diff;
- bounded: it cannot write outside registered repository-relative paths;
- attributable: each generated file includes its canonical sources and a direct-edit warning;
- atomic: a target is replaced only after its complete output renders successfully;
- dependency-free: it uses the Node runtime and existing repository packages only.

Adapter templates may change headings, metadata, or serialization required by a tool, but they may not override canonical authority, stack, gates, or persona ownership.

The initial migration may adopt existing files by explicitly registering them. After adoption, an unregistered or manually edited generated target is an error. Check mode never repairs drift automatically.

## Semantic Validation

`npm run harness:check` performs four layers of validation.

### 1. Structural validation

- All manifest sources and targets exist.
- Target paths are unique and repository-relative.
- Required policy sections and persona identifiers are present.
- Templates contain only supported placeholders.
- TOML and Markdown/frontmatter outputs satisfy the formats already expected by the repository.
- Generated targets contain the expected provenance marker.

### 2. Generation parity

The validator renders all targets in memory and byte-compares them with the working tree. Any direct edit, missing generation step, or stale adapter fails with a focused diff and a remediation command.

### 3. Cross-surface semantic invariants

At minimum, stable rule identifiers enforce:

- `AUTH-USER-INTEGRATION`: only the user authorizes push, merge, and destructive repository actions.
- `GATE-SPEC-SIGNOFF`: product work requires user spec sign-off before plan writing.
- `GATE-DEVICE-QA`: only the user records real-device QA.
- `GATE-CRITICAL-TRIGGER`: established critical triggers escalate to the user.
- `LEAD-PLAN-APPROVAL`: Sarah may approve implementation plans after a signed spec.
- `LEAD-REVIEW-VERDICT`: Tariq may recommend approval or request remediation but may not merge.
- `STACK-ZUSTAND`: Zustand v5 is the current state layer.
- `STACK-NO-SIGNALS`: no live instruction claims Preact Signals or its Babel transform is installed.
- `PATH-SRC-CANONICAL`: canonical architecture paths use the real `src/` layout.
- `UI-HEROUI`: HeroUI Native remains mandatory where a primitive exists.
- `VERIFY-SIX-CHECKS`: documented and executable PR verification use the same six checks and order as CI.

Semantic validation is not implemented as one broad phrase search. Rules identify the surfaces they govern, their required concepts, forbidden claims, and repository evidence. Failure output names the rule, affected file, observed value, and canonical source.

### 4. Repository-fact validation

The validator checks claims that can be established mechanically:

- dependency presence or absence in `package.json` and the lockfile;
- relevant source imports for state-library assertions;
- canonical directories and important wrapper paths;
- the six CI job check commands and their correspondence to the registered local sequence;
- package scripts and the pre-push hook's canonical command;
- the registered set of MoneyApp persona files on each supported surface.

This layer prevents a policy generator from consistently generating an obsolete claim.

## Verification Contract

Phase 1 records the six publish-readiness checks in the harness manifest and introduces one package command that executes them locally, in order:

1. format check;
2. lint;
3. typecheck;
4. Jest in CI mode;
5. Expo Doctor;
6. Android prebuild dry-run plus confirmation that the generated Android directory exists.

The root policy, Claude adapter, and pre-push hook reference the package command rather than copying the chain independently. Pull-request CI retains its six independently observable jobs; `harness:check` verifies that each CI job's check command corresponds to the registered contract. Environment-setup steps may differ, but the check being performed may not. The local command stops at the first failure and returns a non-zero exit status.

Focused development checks remain available, but they cannot be represented as sufficient authorization to push a PR branch.

The implementation plan must account for generated `android/` cleanup without adding destructive behavior to the harness. It may rely on the repository's existing ignored generated-directory workflow, but it must not delete unrelated or unresolved paths.

## Data Flow

```text
Human edits canonical policy/persona
              |
              v
      harness/manifest.json
              |
              v
       deterministic renderer
          /             \
         v               v
 Codex adapters     Claude adapters
          \             /
           v           v
       semantic validator
              |
              v
 repository facts + CI contract
              |
        pass or focused error
```

There is no reverse synchronization. Generated surfaces never become sources, and historical documents never override live policy.

## Error Handling and Safety

- `harness:check` is read-only.
- `harness:generate` refuses absolute paths, parent traversal, unknown targets, duplicate targets, and writes outside the repository.
- Rendering is completed before any target is replaced.
- An invalid source or template results in no partial target update.
- Failures use stable rule identifiers and actionable messages.
- The generator does not stage, commit, push, merge, delete, or clean worktrees.
- Existing unrelated working-tree changes are preserved.
- Historical content may contain obsolete statements without failing current-policy validation unless it is registered as a live harness input.
- Generated-target adoption is explicit; the tool never discovers and overwrites files heuristically.

## Staged and CI Integration

The repository's staged-file configuration will invoke `harness:check` when canonical sources, templates, manifests, generated targets, harness scripts, or relevant package/hook/workflow files change.

Pull-request CI will run `harness:check` early enough to provide a focused policy error before expensive Expo work. Existing application checks remain separate jobs and are validated against the canonical PR-verification contract.

The pre-push hook will call the same canonical PR-verification command required by policy. It will not push automatically.

## Regression Tests

Tests use the existing Node runtime and repository test infrastructure. No new test dependency is introduced.

Required fixtures cover:

1. A Codex persona claiming the Signals Babel transform is installed.
2. A Claude surface granting Tariq merge authority.
3. Canonical module paths missing the `src/` prefix.
4. A workflow command that asks for obsolete plan-approval or code-review user gates.
5. Divergent persona domain ownership across adapters.
6. A generated target edited without changing its source.
7. A package dependency contradicting a generated stack claim.
8. A PR-verification registry that differs from CI ordering or contents.
9. An unregistered output path or parent-directory traversal attempt.
10. Two consecutive generation runs producing different output.

Positive tests prove that both adapters can express surface-specific syntax while retaining identical binding decisions.

## Migration Sequence

1. Record the current live-surface drift as a baseline without modifying historical artifacts.
2. Create the canonical policy, persona, template, rule, and manifest sources from current `AGENTS.md` truth plus verified repository facts.
3. Mark any policy claim that cannot be mechanically or historically established for explicit resolution; no placeholder may ship.
4. Add the renderer and read-only checker with fixtures.
5. Adopt and regenerate one surface class at a time: root policies, personas, expert panel, then workflow commands.
6. Review generated diffs for lost tool-specific behavior.
7. Consolidate the six-check local verification command, update policy and hook references, and validate the existing CI jobs against it.
8. Add staged-file and CI enforcement.
9. Run generation twice to prove idempotence.
10. Run semantic checks, harness tests, and the full canonical PR-verification command.
11. Produce an after-state report comparing the same baseline measures.

No existing untracked review artifact or auxiliary worktree is modified or cleaned during this migration.

## Documentation Budgets

Phase 1 introduces budgets to prevent another oversized shared-memory surface:

- Canonical modules each have one clear purpose and avoid repeating content owned by another module.
- Templates contain adapter framing only, not duplicated policy paragraphs.
- Generated root documents may assemble several modules, but duplication within one output is rejected.
- Budget thresholds begin as report-only measurements during migration.
- Converting a threshold into a failing limit requires evidence from the baseline and is decided in the implementation plan.

This avoids selecting arbitrary line limits while still making growth visible from the first release.

## Acceptance Criteria

1. Both supported root instruction files are generated from registered canonical sources.
2. All five Codex and Claude personas derive binding responsibilities and authority from the same persona sources.
3. MoneyApp expert-panel and workflow-command guidance agrees with current gates and repository authority.
4. A clean checkout passes `npm run harness:check` without writing files.
5. `npm run harness:generate` is deterministic, idempotent, and bounded to registered targets.
6. Direct modification of a generated file causes `harness:check` to fail with a focused remediation message.
7. Known Signals, merge-authority, path, gate, persona, and verification contradictions are represented by failing regression fixtures.
8. Semantic stack assertions agree with `package.json`, the lockfile, and relevant source imports.
9. One canonical PR-verification command executes the same six checks in the same order as CI.
10. The pre-push hook calls the canonical verification command and never pushes automatically.
11. Relevant staged-file changes and pull-request CI execute `harness:check`.
12. No new dependency, native change, application behavior change, or historical status rewrite is introduced.
13. Existing unrelated working-tree files and worktrees remain untouched.
14. Before/after evidence shows zero known contradictions across registered live surfaces.
15. The repository's full local CI-parity chain passes before any authorized push.

## Risks and Mitigations

### Generated policy becomes unreadable

Keep canonical inputs as plain Markdown with narrow responsibilities. Templates add only the syntax required by each agent surface.

### Tool-specific behavior is lost

Migrate by surface class, inspect diffs, and test adapter-specific syntax separately from shared semantics.

### The validator becomes a brittle phrase checker

Use stable rule identifiers, scoped evidence, generation parity, and repository-fact checks. Phrase checks are limited to unambiguous forbidden claims.

### The manifest becomes another stale authority

The manifest maps sources to targets but does not restate project policy. CI rejects missing, duplicate, or unregistered generated targets.

### Full pre-push verification is slow

This is the repository's existing publish-readiness policy. Later phases may add commit-SHA receipts or focused developer checks, but Phase 1 must first make the contract consistent and reliable.

### Claude may no longer be needed

Supporting it in Phase 1 avoids destructive assumptions. If the user retires Claude later, the manifest makes removal explicit and testable rather than leaving partial files behind.

## Phase Boundary

Completion of this phase establishes trusted live instructions and executable validation. Phase 2 may then introduce a durable initiative state machine and task-tree orchestration without building on contradictory policy.

Phase 2 must not begin until this specification is approved, its implementation plan is approved by Sarah, Phase 1 implementation is reviewed by Tariq, the full verification contract is green, and any required user-controlled repository action is explicitly authorized.
