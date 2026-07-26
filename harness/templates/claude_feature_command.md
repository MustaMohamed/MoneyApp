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

After plan approval, run initiative and task status before execution. Generate
one packet and have Sarah claim the exact current packet before work. Keep the
worker inside packet write scopes whether packets run inline or through a host dispatcher.
Task verification commands are not automatically executed; the
worker reports actual results, and Sarah alone records task outcomes after
repository inspection. Repository code does not dispatch agents or call
provider APIs.

Proceed autonomously between gates. Stop only for Spec sign-off, Device QA,
a critical trigger, or a push, PR, merge, or destructive repository action
that requires an explicit user request.

Consult or dispatch the domain owner defined by the generated MoneyApp policy.

$ARGUMENTS
