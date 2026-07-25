---
description: Run a MoneyApp feature through the canonical superpowers workflow
---
<!-- {{raw:notice}} -->

@sarah Orchestrate this feature through brainstorm, design doc, Spec sign-off,
plan, execution, Tariq review, local verification, Device QA when applicable,
and repository integration.

Before plan work, identify the initiative ID and run
`npm run workflow -- status --id <initiative-id> --json` to resume its ledger.
If it is new, run `npm run workflow -- init` with its explicit ID, title,
non-main branch, and base SHA. Do not infer workflow state from chat or artifact
presence.

Proceed autonomously between gates. Stop only for Spec sign-off, Device QA,
a critical trigger, or a push, merge, or destructive repository action that
requires an explicit user request.

Consult or dispatch the domain owner defined by the generated MoneyApp policy.

$ARGUMENTS
