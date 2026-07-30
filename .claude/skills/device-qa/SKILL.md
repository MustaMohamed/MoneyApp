---
name: device-qa
description: Use when preparing, running, or recording the manual Device QA gate — assembling a QA checklist for a feature before merge, walking smoke tests on a real device or simulator, or verifying visual changes CI cannot see (fonts, shadows, borders, layout collapse, animations).
---

# MoneyApp Device QA

## Overview

Device QA is the second user-facing gate: **only the user can walk it, on a real device (Android first).** This skill's job is to make the gate concrete — assemble the right checklist for the change, hand it to the user, and record the verdict. A whole class of MoneyApp bugs is invisible to CI and only surfaces here: fonts that silently don't render (audit H15 — the app shipped months in the wrong typeface with green CI), HeroUI `Card`/`Surface` visual deltas, Android Fabric flex collapse, and animation jank.

## Running a QA pass

1. **Scope it:** list the screens the change touches (from the diff), plus the *always-run* checks below.
2. **Assemble the checklist:** relevant area matrices + always-run checks. Present it to the user as a numbered list they can walk top-to-bottom.
3. **Record the verdict:** results land in `docs/superpowers/qa/YYYY-MM-DD-{feature}.md` — per item: pass / fail (with what was seen) / skipped. A fail routes back to execution with the failing item as the repro.

## Always-run checks (every QA pass, ~2 min)

- Cold start to dashboard < 2s on mid-range Android; no flash of wrong screen or spinner-on-warm-content.
- **Typography:** numbers/headings render Sora, body renders Inter — not Roboto/system (compare a digit's shape against a known-good screenshot; H15 class).
- Cards: no unexpected borders or shadows on `Card`-based surfaces (Card=Surface trap).
- Rotate/backgrounding: force-close and relaunch lands where business rules say (mid-onboarding → same step).
- One full-screen route from the change: safe areas respected top and bottom, no flex collapse (content filling the screen, CTA not clipped).

## Area matrices

### Onboarding (N1–N4)
1. Fresh install → N1 welcome; EGP pre-selected. 2. N2 blocks continue with zero accounts; saving one unblocks. 3. N3 skippable only after N2 wrote an account. 4. Force-close at N2/N3 → relaunch resumes the same step. 5. "Open My Dashboard" on N4 completes onboarding; relaunch → dashboard directly.

### Accounts
1. Add account: `current_balance = opening_balance`; duplicate name rejected with a field error. 2. Credit card shows as liability (reduces net worth). 3. Adjust balance: new value sticks after app restart; credit-card adjust doesn't corrupt revolving debt display. 4. Archive: account leaves pickers and dashboard; history rows still render its name.

### Transactions
1. Add expense/income: account balance updates immediately and matches after restart. 2. USD transaction: EGP preview equals what gets persisted (money-rules iron rule) — check the detail screen agrees with the pre-confirm preview. 3. Transfer/CC-payment: **walk both directions, not one** — USD→EGP (multiply) *and* EGP→USD (source amount needs no multiply; destination side divides). A flat `amount × rate` preview looks correct in exactly one direction. 4. Edit amount: old delta fully reversed, new applied (balance = expected, not drifted). 5. Delete: balance restored exactly. 6. Search/filter: type fast — no dropped keystrokes, totals card matches the filtered list. 7. Scroll deep, open a detail, return — scroll position and loaded pages survive.

### Commitments
1. New monthly commitment starting past date → shows overdue/due correctly **today** (not frozen `upcoming` — H1 class). 2. Pay sheet: the confirmation amount equals what the account is actually debited (H6 class) — **walk all four currency pairs**: USD commitment → EGP account (multiply), USD → USD (no conversion — a leftover `× rate` shows wildly inflated here), EGP → USD (divide, not multiply), EGP → EGP (no rate row at all). A preview bug can pass the first pair and fail the other three. 3. Mark paid: transaction appears in ledger, account balance moves once, and the ledger row equals the final preview. 4. Skip a cycle: commitment doesn't stall permanently. 5. Edit schedule: no duplicate or orphaned payment rows in the list.

### Budget
1. Set an envelope; spend against it; progress bar and remaining match manual math. 2. Same-name budget in same category+month: no silent overwrite of the existing limit (H3 class). 3. Month switch: no skeleton-over-warm-content flash; numbers stable across two rapid switches. 4. 50/30/20 lens totals equal the sum of category rows. 5. Copy last month: identical envelopes, fresh month, no doubled rows.

### Settings
1. Delete a custom category with a budget or commitment attached → routed to reassign (no silent failure, no crash — H5 class); reassign completes and the target category owns everything. 2. Manual exchange rate: survives restart, not clobbered by auto-refresh. 3. Category add: duplicate name within the same type rejected.

## Recording template

```markdown
# Device QA — {feature} — YYYY-MM-DD
Device: {model, OS} · Build: {branch/sha}
| # | Check | Result | Notes |
|---|---|---|---|
Verdict: pass / fail → route back with items {n, m}
```

## Common mistakes

| Mistake | Reality |
|---|---|
| "CI is green, QA is a formality" | H15 shipped for months with green CI. The visual class only exists here. |
| Testing only the changed screen | Balance math and money previews leak across screens — always-run checks exist for that. |
| QA on the simulator only | Simulator is fine for smoke; the gate itself is a real device (fonts, perf, gestures differ). |
| Walking it without recording | An unrecorded pass can't route a fail back to execution. Use the template. |
