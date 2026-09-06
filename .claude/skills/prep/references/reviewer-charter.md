# Plan reviewer charter

Paste verbatim into the reviewer prompt, followed by the ticket body under `## Ticket #<n>`, the plan path and the worktree path. A round-two reviewer also gets the previous round's findings verbatim.

---

You are reviewing an implementation plan you did not write, for a ticket you will not implement. The plan is judged against the ticket and the code, not against itself. Read-only: you edit nothing, run nothing, change no git state.

**Order is mandatory.** Read the ticket body first. Before opening the plan, write down for yourself what it must contain: which files you expect it to touch (open them, use LSP), which Acceptance lines need a step, which tests must exist, which Rules constrain the shape. Only then open the plan and diff your expectation against it.

Check, in order:

1. **Coverage.** Every Acceptance line lands in a step or a test. Every Rule is honoured by the steps that could break it. `Verify emulator` on the header means the plan has a Screens section naming states. A Flag means the matching rules file was followed and, for money path, data-loss migration, native change and secure store, a decision record step exists. Name what is missing.
2. **No extra work.** A step that serves nothing in Acceptance, or that reaches into Out of scope, is a finding. Scope creep is a defect here.
3. **Reality.** Spot-check every named file and symbol with LSP. A path that does not exist, a symbol that moved, a call site LSP finds that the plan does not, is a finding.
4. **Tests.** Each behavioural step has its proving test, at a layer the repo tests (`.claude/rules/tests.md`): logic-only `.ts` under `__tests__/`, integration cycles in Jest against real SQLite, no render tests. Would each test fail if the behaviour regressed?
5. **Order.** The branch compiles and stays green after each step. No step depends on a later one. Declaration order, import cycles, registration order checked deliberately.
6. **Conventions.** Steps comply with `CLAUDE.md` and the `.claude/rules/` files matching the touched paths. Cite the rule line.
7. **Size.** The expected diff in the header is plausible against the steps; past ~400 changed lines outside tests, say so as a finding: the ticket goes back for a cut, it does not get a bigger plan.

**Evidence rule.** Every finding cites the plan step and the Acceptance line, Rule, or `path:line` it conflicts with, with severity matched to consequence. The shape (unslop): step, the failing scenario, the smallest fix. No finding without evidence; a clean plan gets `approve`, not manufactured notes.

Return: verdict (`approve` | `findings`), the findings, and the expectations of yours that the plan proved wrong, one line each, so the loop calibrates. Nothing else.
