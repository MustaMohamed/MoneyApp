# Harness State Policy Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove Preact Signals-specific live harness policy, custom-subagent
guidance, expert-panel skill guidance, semantic validation, repository-fact
validation, fixtures, and tests while retaining the positive Zustand v5
contract on both stacked harness branches.

**Architecture:** Phase 1 remains the canonical source of generated MoneyApp
policy and persona adapters. The cleanup deletes the retired-library special
case and regenerates all registered targets from simplified canonical sources.
Phase 2 receives the Phase 1 commits only after its immutable ledger records
`work.reopened`, then establishes a fresh delivery, review, and verification
cycle.

**Tech Stack:** Node.js CommonJS, `node:test`, JSON harness registries and
fixtures, deterministic harness templates/generation, Git, and the existing
Phase 2 workflow CLI.

---

## Execution Constraints

- Execute inline in the existing Phase 1 and Phase 2 worktrees; do not dispatch
  subagents.
- Do not modify application, Expo, native, database, dependency, or lockfile
  content.
- Do not remove the unrelated transitive `human-signals` package.
- Historical specs, plans, reviews, and initiative events remain intact.
- The user authorized commits and pushes to PR #170 and PR #171. Do not merge,
  retarget, delete branches, or clean worktrees.

### Task 1: Make the semantic contract expect the simplified state policy

**Files:**

- Modify: `scripts/harness/__tests__/semantics.test.js`
- Modify: `scripts/harness/__tests__/repository_facts.test.js`
- Modify: `scripts/harness/__tests__/personas.test.js`
- Modify: `scripts/harness/__tests__/root_adapters.test.js`
- Modify: `harness/fixtures/invalid/semantic_cases.json`
- Modify: `harness/fixtures/valid/minimal.json`

- [ ] **Step 1: Write the failing semantic-registry expectation**

In `scripts/harness/__tests__/semantics.test.js`, replace the Signals-specific
fixtures and tests with an exact registry-ID test:

```js
const expectedRuleIds = [
  'AUTH-USER-INTEGRATION',
  'GATE-SPEC-SIGNOFF',
  'GATE-DEVICE-QA',
  'GATE-CRITICAL-TRIGGER',
  'LEAD-PLAN-APPROVAL',
  'LEAD-REVIEW-VERDICT',
  'STACK-ZUSTAND',
  'PATH-SRC-CANONICAL',
  'UI-HEROUI',
  'PERSONA-SARAH-OWNERSHIP',
  'PERSONA-MARCUS-OWNERSHIP',
  'PERSONA-LAYLA-OWNERSHIP',
  'PERSONA-TARIQ-OWNERSHIP',
  'PERSONA-DEV-OWNERSHIP',
];

void test('semantic registry contains only current binding decisions', () => {
  assert.deepEqual(
    rules.map((rule) => rule.id),
    expectedRuleIds,
  );
});
```

Keep the generic empty, missing-required-rule, duplicate-ID, malformed
registry, glob, and fixture tests. Use neutral fixture input such as:

```js
const scopedFiles = { 'AGENTS.md': 'MoneyApp harness policy.' };
```

- [ ] **Step 2: Remove retired-library fixture expectations from tests**

Delete the first seven `STACK-NO-SIGNALS` entries from
`harness/fixtures/invalid/semantic_cases.json`. In
`harness/fixtures/valid/minimal.json`, keep only current required claims:

```json
{
  "AGENTS.md": "explicit user request. Spec sign-off. Device QA. critical trigger. Sarah approves plans. merge recommendation. Zustand v5. src/modules/<domain>/. HeroUI Native.",
  ".codex/agents/dev.toml": "Zustand v5 is the supported state layer."
}
```

Remove the Signals-specific negative assertions from `personas.test.js` and
remove `Signals rollback` from the root-adapter binding list.

Replace the Signals-specific repository-fact matrix with one positive test:

```js
void test('accepts the installed Zustand stack', () => {
  assert.deepEqual(validateDependencyFacts(cleanPackage, cleanLock, zustandSource), []);
});
```

Keep the three cases that reject missing Zustand dependency, lockfile entry, or
source import, using the new three-argument call.

- [ ] **Step 3: Run the focused tests and verify RED**

Run:

```bash
node --test \
  scripts/harness/__tests__/semantics.test.js \
  scripts/harness/__tests__/repository_facts.test.js \
  scripts/harness/__tests__/personas.test.js \
  scripts/harness/__tests__/root_adapters.test.js
```

Expected: failure because `STACK-NO-SIGNALS` and live Signals wording still
exist in production harness sources and generated targets.

### Task 2: Remove the retired-library implementation and live guidance

**Files:**

- Modify: `scripts/harness/lib/semantics.js`
- Modify: `scripts/harness/lib/repository_facts.js`
- Modify: `scripts/harness/check.js`
- Modify: `harness/rules/semantics.json`
- Modify: `harness/policy/architecture.md`
- Modify: `harness/personas/dev.md`
- Modify: `harness/personas/tariq.md`
- Regenerate: all sixteen targets registered in `harness/manifest.json`

- [ ] **Step 1: Delete the specialized semantic classifier**

From `scripts/harness/lib/semantics.js`, remove:

- all Signals regex constants;
- `splitGuidanceClauses`, `hasPositiveSignalsFollowUp`,
  `findSignalsReferences`, `isSignalsReferenceRestricted`,
  `hasSharedSignalsRestriction`, and `classifyPositiveSignalsGuidance`;
- `STACK-NO-SIGNALS` from `REQUIRED_RULE_IDS`;
- validation of `forbidPositiveSignalsGuidance`;
- evaluation of `rule.forbidPositiveSignalsGuidance`; and
- the `classifyPositiveSignalsGuidance` export.

`evaluateRules` must continue to validate required and forbidden literal
claims, scope completeness, registry shape, and the exact current rule IDs.

- [ ] **Step 2: Simplify repository state evidence**

In `scripts/harness/lib/repository_facts.js`, remove the semantics import,
`collectBabelText`, and all Signals evidence. The function becomes:

```js
function validateDependencyFacts(pkg, lock, sourceText) {
  const dependencies = allDependencies(pkg);
  const errors = [];
  if (
    !dependencies.zustand ||
    !lockHasPackage(lock, 'zustand') ||
    !/from\s+['"]zustand(?:\/[^'"]+)?['"]/.test(sourceText)
  ) {
    errors.push({
      ruleId: 'STACK-ZUSTAND',
      file: 'package.json',
      message: 'Zustand guidance does not match package, lockfile, and source imports',
    });
  }
  return errors;
}
```

Remove `collectBabelText` from exports. Update `scripts/harness/check.js` to call:

```js
errors.push(
  ...validateDependencyFacts(
    pkg,
    JSON.parse(fs.readFileSync(resolveInside(root, 'package-lock.json'), 'utf8')),
    collectSourceText(root),
  ),
);
```

Preserve Phase 2's additional `validateWorkflowInitiatives` call when this
change is propagated later.

- [ ] **Step 3: Remove the semantic rule and canonical live wording**

Delete the `STACK-NO-SIGNALS` object from
`harness/rules/semantics.json`. Delete the Signals rollback paragraph from
`harness/policy/architecture.md`. Delete the three Signals lines in the Dev and
Tariq dispatched sections and the Signals lines in Tariq's inline section.

Do not replace them with library-specific negative guidance. Existing positive
`Zustand v5` text and generic dependency critical triggers remain.

- [ ] **Step 4: Regenerate all registered adapters**

Run:

```bash
npm run harness:generate
```

Expected: the root policies, Dev/Tariq custom subagents, and both expert-panel
skills update from canonical sources; no unrelated target changes.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run the Task 1 focused command again, followed by:

```bash
npm run harness:check
```

Expected: all focused tests pass and all sixteen generated targets validate.

### Task 3: Verify, commit, and push Phase 1

**Files:**

- All Task 1 and Task 2 files
- Existing design:
  `docs/superpowers/specs/2026-07-25-harness-state-policy-simplification-design.md`
- This plan:
  `docs/superpowers/plans/2026-07-25-harness-state-policy-simplification.md`

- [ ] **Step 1: Scan only live harness surfaces**

Run:

```bash
rg -n -i \
  '@preact/signals-react|Preact Signals|Signals rollback|Signals migration|signals-react transform|signals transform' \
  AGENTS.md CLAUDE.md harness .agents/skills/moneyapp-expert-panel \
  .claude/skills/moneyapp-expert-panel .codex/agents .claude/agents \
  scripts/harness \
  --glob '!harness/fixtures/**'
```

Expected: no matches. The design and plan are intentionally outside this scan.

- [ ] **Step 2: Run complete harness verification**

Run:

```bash
npm run harness:test
npm run harness:check
git diff --check
```

Expected: all harness tests pass, all generated targets validate, and no
whitespace errors exist.

- [ ] **Step 3: Commit the Phase 1 implementation**

Stage the exact modified harness, adapter, test, fixture, design, and plan files.
Commit:

```bash
git commit -m "refactor: remove retired state library harness"
```

- [ ] **Step 4: Run mandatory pre-push CI parity**

Run:

```bash
npm run verify:pr
```

Expected: format, lint, typecheck, Jest, Expo Doctor, and Android prebuild pass.

- [ ] **Step 5: Push PR #170's branch**

Run:

```bash
git push origin refactor/harness-phase-1-implementation
```

Expected: a fast-forward update to PR #170. Do not merge.

### Task 4: Reopen and propagate the correction to Phase 2

**Files:**

- Append:
  `docs/superpowers/initiatives/2026-07-25-harness-phase-2/events/`
- Cherry-pick Phase 1 commits beginning at `3915199`

- [ ] **Step 1: Confirm Phase 2 starts clean and integration-ready**

In `.worktrees/harness-phase-2`, run:

```bash
git status --short --branch
npm run workflow -- check --id 2026-07-25-harness-phase-2
npm run workflow -- status --id 2026-07-25-harness-phase-2
```

Expected: clean, sequence 9, `integration_ready`.

- [ ] **Step 2: Record and commit the review correction**

Run:

```bash
npm run workflow -- record work.reopened \
  --id 2026-07-25-harness-phase-2 \
  --expected-sequence 9 \
  --recorded-by sarah \
  --reason "User requested removal of retired state-library policy from live harness, custom subagents, and skills"
```

Commit the new event:

```bash
git add docs/superpowers/initiatives/2026-07-25-harness-phase-2
git commit -m "docs: reopen harness phase 2 review correction"
```

- [ ] **Step 3: Cherry-pick the complete Phase 1 correction**

Run:

```bash
git cherry-pick 3915199^..refactor/harness-phase-1-implementation
```

If `scripts/harness/check.js` conflicts, retain Phase 2's
`validateWorkflowInitiatives` import/call while applying the simplified
three-argument `validateDependencyFacts` call. Do not rewrite or squash
history.

- [ ] **Step 4: Verify the corrected Phase 2 delivery**

Run the focused tests from Task 1, then:

```bash
npm run harness:test
npm run harness:check
git diff --check
git status --short --branch
```

Expected: green and clean.

- [ ] **Step 5: Record the fresh implementation cycle**

Run:

```bash
npm run workflow -- record implementation.ready \
  --id 2026-07-25-harness-phase-2 \
  --expected-sequence 10 \
  --recorded-by dev
```

Expected: event 11 and phase `validation`.

### Task 5: Review, verify, commit, and push Phase 2

**Files:**

- Create:
  `docs/superpowers/reviews/2026-07-25-harness-state-policy-simplification-review.md`
- Append:
  `docs/superpowers/initiatives/2026-07-25-harness-phase-2/events/`

- [ ] **Step 1: Write and commit the review artifact**

The review records:

- no Preact Signals-specific live harness behavior or wording remains;
- positive Zustand validation remains;
- Phase 2 workflow validation remains intact;
- focused and complete harness checks pass; and
- no application, dependency, lockfile, native, or user-facing change exists.

Commit the review and events 10–11:

```bash
git add docs/superpowers/reviews/2026-07-25-harness-state-policy-simplification-review.md \
  docs/superpowers/initiatives/2026-07-25-harness-phase-2
git commit -m "docs: review harness state policy simplification"
```

- [ ] **Step 2: Record review approval**

Run:

```bash
npm run workflow -- record review.approved \
  --id 2026-07-25-harness-phase-2 \
  --expected-sequence 11 \
  --recorded-by tariq \
  --review docs/superpowers/reviews/2026-07-25-harness-state-policy-simplification-review.md \
  --decision-by tariq \
  --basis "Focused review approved the user-requested active harness simplification"
```

Expected: event 12.

- [ ] **Step 3: Run and record canonical verification**

Run:

```bash
npm run workflow -- verify \
  --id 2026-07-25-harness-phase-2 \
  --expected-sequence 12
```

Expected: event 13 `verification.passed` and `integration_ready`.

- [ ] **Step 4: Commit final Phase 2 evidence**

Run:

```bash
git add docs/superpowers/initiatives/2026-07-25-harness-phase-2
git commit -m "docs: record corrected harness phase 2 readiness"
```

- [ ] **Step 5: Run final pre-push verification**

Run:

```bash
npm run workflow -- check --id 2026-07-25-harness-phase-2
npm run workflow -- status --id 2026-07-25-harness-phase-2
npm run harness:test
npm run verify:pr
git status --short --branch
```

Expected: `integration_ready`, all local checks green, and a clean worktree.

- [ ] **Step 6: Push PR #171's branch**

Run:

```bash
git push origin refactor/harness-phase-2-workflow-state
```

Expected: a fast-forward update to PR #171. Do not merge.

- [ ] **Step 7: Confirm both PR heads**

Use read-only GitHub queries to confirm:

- PR #170 head equals local `refactor/harness-phase-1-implementation`.
- PR #171 head equals local `refactor/harness-phase-2-workflow-state`.
- Both PRs remain open; report current remote check status without claiming
  pending checks passed.
