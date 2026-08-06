# MA-onboarding-redesign — Tasks

Twelve tasks, three milestones. Reviewed and reordered at step 3. Order encodes dependencies — a `blocked` task halts the scope, never skip past it.

**Task IDs confirmed at MA-001.** Re-scanned `docs/scopes/**`: no task file exists anywhere outside this folder, so there is no collision and this scope opens the global sequence. Every `MA-042`/`MA-043`/`MA-044` in the tree is an illustration inside a fenced template block in `docs/scopes/TEMPLATES.md`, the frozen workflow spec, or an agent file. @tariq's call was right.

**Eleven of twelve carry `verify: emulator`.** This scope is screens, one shared form on the live first-run path, and a shared primitive that changes what every loading button in the app renders. MA-001 is the only task whose entire failure surface a unit test reaches — it touches no `.tsx` file at all, which is how that claim is made checkable rather than asserted.

## M1 — Foundations

| ID | Title | Status | Verify | Branch | PR |
|---|---|---|---|---|---|
| MA-001 | Colour families, geometry tokens, and the 32-colour palette | in-review | none | `feat/MA-001-color-and-geometry-tokens` | — |
| MA-002 | Spike: gradient-filled headline, with the flat fallback | todo | emulator | — | — |
| MA-003 | Cross Fan logo — launcher, adaptive, splash, in-app mark | todo | emulator | — | — |
| MA-004 | Onboarding shell: four fixed tracks and an honest busy CTA | todo | emulator | — | — |
| MA-005 | Onboarding resume: route resolver, persist-before-navigate, locked gestures | todo | emulator | — | — |

## M2 — The shared account form

| ID | Title | Status | Verify | Branch | PR |
|---|---|---|---|---|---|
| MA-006 | 32-colour bottom sheet replaces the swatch rows | todo | emulator | — | — |
| MA-007 | The shared account form, adopted by Settings | todo | emulator | — | — |
| MA-008 | Onboarding adopts the shared account form | todo | emulator | — | — |
| MA-009 | Account form redesign: type grid, message rails, credit slot | todo | emulator | — | — |

## M3 — The onboarding screens

| ID | Title | Status | Verify | Branch | PR |
|---|---|---|---|---|---|
| MA-010 | N1 Welcome | todo | emulator | — | — |
| MA-011 | N3 Add more accounts | todo | emulator | — | — |
| MA-012 | N4 Ready — the corrected starting net position | todo | emulator | — | — |

## Blockers

**None.** @layla's two rulings landed while this review was running and both spec open questions that gated a task are now closed. The third open question was already answered when the spec was written.

- **Carried debt at creation → zero for credit cards, absent for every other type.** This was going to block MA-009. It no longer does. Step 3 flagged @tariq's supporting argument as false independently; @layla's correction reaches the same conclusion about the argument and lands on a different answer than his draft, for a forward-safety reason. Nothing in the transactions domain changes. Detail in MA-009.
- **The approximation pill renders in both base currencies**, converting into the other one, rather than being hidden when the base is dollars. This reverses the draft MA-012 was written against and MA-012 has been corrected. One sub-question is genuinely still open and is **Marcus's, not a blocker**: the mockup draws the pill with no decimal places while everything else on that screen shows two. The value is identical either way; only the digits shown are in question. MA-012's plan states which it renders.

## Dependencies

| Task | Requires | Why |
|---|---|---|
| MA-001 | — | root |
| MA-002 | — | standalone spike |
| MA-003 | — | artwork and native config only |
| MA-004 | MA-001, MA-003 | track heights; the N1 header renders MA-003's in-app mark |
| MA-005 | MA-004 | a failed step write has to render into the status track, or it is silent |
| MA-006 | MA-001 | the 32-entry palette, its tick colours and its hex→family lookup |
| MA-007 | MA-006 | the extracted form carries the colour sheet, not the swatch row |
| MA-008 | MA-007, MA-005, MA-004 | the form to adopt; the persist ordering; the status track |
| MA-009 | MA-008, MA-004, MA-001 | one form to redesign; the status track; the rail height |
| MA-010 | MA-002, MA-004, MA-003, MA-005 | headline treatment, shell, brand header, persist ordering |
| MA-011 | MA-008, MA-004, MA-005, MA-009 | the add-more flag fix; shell; persist ordering; the form it opens |
| MA-012 | MA-004, MA-005, MA-001 | busy label, persist ordering, the two slot heights |

MA-010 and MA-012 depend on nothing in M2 and could run earlier; they are held behind it because M2 lands the shared form on the same routes and splitting that across the queue would mean two rebuilds of the same screen chrome.

## What changed at step 3

- **MA-005 is new.** `spec.md` § *Async and navigation ownership* specified a route resolver, persist-before-navigate with route replacement, disabled stack gestures, and a stale-completion guard. **No task owned any of them**, while MA-011 asserted the zero-account redirect and MA-010 asserted the return-to-more-accounts case — neither of which either task could satisfy alone. The resume-from-force-close guarantee is business rule 2 and it now has one owner, one test surface, and one QA walk.
- **The shared-form task was split into MA-007 and MA-008, by consumer.** @tariq's argument against an extract-then-adopt split is right and is not what this is: a form nobody consumes is indeed a compile-only task. But as delivered, one task authored a new shared surface *and* deleted onboarding's duplicate on the live first-run path — roughly 700 lines removed and 450 added across two `src/modules/` boundaries, which is the granularity contract's explicit split trigger. Split by consumer, each half has a real consumer the day it merges, each merges alone with `main` working, and the highest-blast-radius half stops riding inside a Settings refactor. MA-007's plan is required to be written against both consumers so the shared surface is not shaped twice.
- **MA-005 (shell) landing before the form tasks is confirmed correct**, and is now stated as a constraint rather than an intention: MA-004 delivers the status track, MA-005 is the first task to put a real failure into it, and MA-008/MA-009 report into it rather than growing a local error line.
- **MA-004 no longer touches navigation.** Chrome and routing were entangled in one task; they are now MA-004 and MA-005, because a chrome review and a force-close-and-relaunch QA walk are different sittings.
- **The post-save checkpoint got an owner (MA-008).** Mockup A3's caption and frames C4/C6 draw it — insert succeeded, step write failed, retry repeats only the step and never re-inserts. It was drawn and unassigned; "one insert per form session" in the redesign task is the re-entry guard, a different failure.
- **Mount animation and reduce-motion added to MA-011 and MA-012.** `spec.md` § *Motion budget* specifies the staggered rise on N1, N3 *and* N4 and states it must not run under reduce-motion. Only the N1 task said so.
- **MA-007 now carries the verified parser behaviour, and it contradicts the spec.** `spec.md` states the current parser "rejects `5,000` → NaN". It does not. `5,000` passes validation and persists as **5**, as do `5,000.50`, `0x10`, `1e3` and `1_000` at wrong values — measured, not read. With business rule 6 setting current balance from opening balance, this is silent thousandfold corruption of the first number a user types, in both entry points, today. MA-007 carries the full case table so the fix is not tested against the milder description. **`spec.md` line 236 is a step 2 factual defect and is @tariq's to correct.**
- **MA-001 stays `verify: none`, on examination.** Everything it adds is consumed by nobody until the next task; an emulator run would install a build and show today's app. Its Done-when now requires the diff to contain no `.tsx` file, which makes "nothing renders differently" mechanically checkable. Every task that renders these values is `verify: emulator`.
- **MA-002's fallback is now a decision the task makes**, not one it defers: one attempt, and any check short of clean ships flat gold on the same branch with the rejecting observation written down. Exactly one treatment is in the tree when it merges, so MA-010's plan cannot branch.
- **MA-003's native-config rule is now explicit and prohibitive** — no plugin added, removed or reordered; the dependency-fixing Expo command is not to be run at all; the configuration diff is attached to the task file after every CLI invocation, empty diff included.
- **MA-004's app-wide blast radius is stated.** Roughly a dozen non-onboarding call sites gain a spinner. Its emulator run and its gate-3 QA now have to leave onboarding.
- **MA-006 picks up the account detail screen's mismatched default colour** — it draws swatches from one list and falls back to another. They agree on that one entry today, which is why nobody noticed.
- **MA-012 was corrected against a ruling that landed mid-review.** It had been written to hide the approximation pill when the base currency is dollars, which is what the spec said at the time. @layla overruled that while step 3 was running. The task now points at her ruling and carries her regression rows.
- **Nothing was deleted.** Every task in the delivered breakdown maps to spec content, and every spec section maps to a task. All 31 mockup frames are attributable: A1–A3 → MA-004 · B1–B5 → MA-010 · C1–C6 → MA-009 · D1–D2 → MA-006 · E1–E5 → MA-011 · F0–F9 → MA-012.

## Scope size

**Twelve tasks is the ceiling, not past it** — but it is the ceiling, and it is twelve device-QA-and-merge sittings. Flagging it rather than ordering it quietly.

If the user wants it smaller, **the seam is after MA-009**. Everything up to there is either infrastructure or an improvement to a surface that already exists — the logo, the tokens, correct resume behaviour, the onboarding chrome, one account form instead of two, and the silent balance-corruption fix, all of which reach Settings and are worth merging on their own. What remains, MA-010 to MA-012, is three onboarding screens that depend on nothing in each other. That splits nine and three, and the second half is a clean standalone scope.

I am not splitting it. Twelve is within the contract, the second half is small, and splitting would add a gate the user has to walk for no new information.
