---
description: Report current MoneyApp workflow state from durable artifacts
---
<!-- {{raw:notice}} -->

@sarah Run `npm run workflow -- status --id <initiative-id> --json` and treat
the immutable initiative ledger as workflow authority. Do not infer approvals,
review, verification, QA, or phase from chat language or artifact presence.

Report:
- current phase and owner;
- durable artifacts with paths;
- blockers or critical triggers;
- any push, merge, or destructive action awaiting an explicit user request;
- the next recommended action.

Keep the report concise.
