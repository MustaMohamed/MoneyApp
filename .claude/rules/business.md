---
paths:
  - "src/modules/onboarding/**"
  - "src/modules/accounts/**"
  - "src/modules/dashboard/**"
---

# Business rules

Other files cite these by number ("business rule 6"); keep the numbering.

1. `OnboardingComplete` set only on "Open My Dashboard" tap (N4; the flow is N1 welcome → N2 add account → N3 more accounts → N4 ready).
2. Force-close during onboarding → resume from that step on relaunch. Legacy `O*` steps migrate to N1 on first launch.
3. N2 requires ≥1 saved account before proceeding.
4. N3 is skippable once N2 wrote an account.
5. EGP pre-selected on N1; base currency is chosen in the welcome step.
6. `current_balance = opening_balance` at account creation.
7. Credit card accounts are liabilities (negative net-worth).
8. Account names are unique across all accounts.
