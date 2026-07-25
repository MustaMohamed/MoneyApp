---
description: Report current MoneyApp workflow state from durable artifacts
---
<!-- {{raw:notice}} -->

@sarah Run `npm run workflow -- status --id <initiative-id> --json` and treat
the immutable initiative ledger as workflow authority. Do not infer approvals,
review, verification, QA, or phase from chat language or artifact presence.
Run initiative and task status before execution and report whether Sarah has
claimed the exact current packet before work. Include packet write scopes and
whether execution is inline or through a host dispatcher. Task verification
commands are not automatically executed, and Sarah alone records task outcomes
after repository inspection. Repository code does not dispatch agents or call
provider APIs.

Report:
- current phase and owner;
- durable artifacts with paths;
- blockers or critical triggers;
- any push, PR, merge, or destructive action awaiting an explicit user request;
- the next recommended action.

Keep the report concise.
