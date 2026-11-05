# MA-230 — The commitments milestone counted against the transactions families
base: 08ed5d8ab2a38014adbc4f28258be8f19a8121d2 · verify: none · flags: none · expected diff: ~8 lines

## Steps
### 1. Every ticket on the commitments milestone has an origin, a family and a came-back mark
- File: none in the repo. The table goes to `~/.ship/MoneyApp/MA-230/count.json`, ship state, removed at merge.
- Change: read every issue on milestone `MA-commitments-redesign` (`gh issue list --milestone MA-commitments-redesign --state all --limit 300 --json number,title,body,createdAt,closedAt,stateReason`; 73 issues at 2026-11-05, every one closed). Leave out epic #777 and each parent with sub-issues (#785 is one). Per ticket record:
  - `number`, MA id, `title`, `closedAt`.
  - `pr`: the merged PR that closes it, or `none` when it closed without one. This sets the audit's "(k with a PR)" figure.
  - `statuses`: GraphQL `timelineItems(itemTypes:[PROJECT_V2_ITEM_STATUS_CHANGED_EVENT])`, each `createdAt`, `previousStatus` and `status`.
  - `origin`: `found-later` when any line of `## Links` or Context cites a PR's lens, review, triage, verifier or finding, whatever the verb. Examples: `Found at` (#837:43, #870:39, #822:60, #839:81), `Found in review of PR #912` (#913) and `PR #879 (MA-258), findings quality 1 and conformance 3` (#880). Otherwise `design`. Every body whose Links names a PR number is read again.
  - `families`: the list of families each found-later ticket fixes, from the roots in the audit's § Where the found-later tickets came from. Font scale 2.0: a text node or box fails at scale 2.0. Android ellipsis: the native `…` paints cut. Sheet and keyboard: the shared sheet's lift, close, drag or focus. Contrast: a glyph under 3:1. Every other root takes the audit's other rows by name: refactor and debt, accessibility (44 dp tap bands included), money rounding, navigation, other. A ticket whose defects span two or more of the four families counts in each of them, and `doubleCount: true` marks it (#808 Rules last line and Decisions 2026-11-05). So the family figures can sum past the found-later total.
  - `cameBack`: the number of an earlier merged ticket on the milestone whose fix this ticket's defect reopens, on the same site or on a site that fix missed, in any family. The audit's pattern is MA-141 then MA-178, and seven font-scale tickets after the class ticket. Otherwise `none`.
- Test: none · a one-off read written to ship state; Produces is none, so no script or hook lands in the repo.

### 2. The table names the tickets that ran without the pass and the tickets carrying no invariant Rules line
- File: none in the repo; two fields added to `count.json`.
- Change:
  - `noPass`: each ticket whose `In Progress` event comes before MA-229's merge, PR #812 at 2026-10-21T17:31:50Z, with its merge time beside it. The `/ship` start decides, not the merge. #786 (MA-212) went In Progress at 17:08:22Z, opened PR #815 at 17:30:02Z and merged at 18:33:02Z, and PR #815's body has no `invariants` line. A listed ticket merged after 17:31:50Z gets `startedBeforeMergedAfter: true`.
  - `readyAtReview`: each ticket whose last status event before 2026-10-21T13:33:53Z is Ready For Development or later. That time is #777's Rule 9 comment, written after #802's review per #802 Rule 9 and #793's Decisions line 97. Blocked counts when it was entered from Ready or later; #779 went Ready at 12:52:17Z and Blocked at 13:23:54Z. Each listed body must lack the line `The invariant pass of #802 Rule 4 holds on` (#793:53 has it, #779 lacks it). A body that disagrees with its status is listed as a named exception.
- Test: none · same as step 1.

### 3. An artifact page carries the count
- File: none in the repo. Write a local HTML in the session scratchpad and publish it with the Artifact tool after loading `artifact-design`.
- Change: the page carries the following.
  - One method line citing the 2026-10-21 close audit's method paragraph and family table, with the audit URL.
  - The found-later table: number, MA id, title, families, PR or `none`, and came back with its earlier ticket. Each ticket counted in two or more families carries a double-count mark, and a note under the family table gives the number of double counts.
  - The family table, each commitments figure as `n (k with a PR)` beside its transactions baseline: font scale 2.0 18 (13), Android ellipsis 2 (1), sheet and keyboard 4 (3), contrast 2 (1).
  - The came-back count, across all families, beside 10.
  - The `noPass` and `readyAtReview` lists from step 2. Each `noPass` ticket with `startedBeforeMergedAfter` reads "started before, merged after".
- Test: none · a page outside the repo.

### 4. The invariant list carries the five counts beside their baselines
- File: `.claude/skills/boundaries/references/invariants.md`, after line 16, the list's tenth line.
- Change: add `## Commitments count, <yyyy-mm-dd of the count>`. Under it put one line. That line says the lines under the heading are figures from the count and bind no Rule, links the step 3 page and names the audit's method. Then five bullets: `Font scale 2.0: <n> (transactions 18)`, `Android ellipsis: <n> (transactions 2)`, `Sheet and keyboard: <n> (transactions 4)`, `Contrast: <n> (transactions 2)`, `Came back after a fix, any family: <n> (transactions 10)`. Lines 1-16 stay byte-identical. The scout reads "each line" of this file (`.claude/skills/boundaries/SKILL.md:21`), and the lock writes "each line the work meets as one Rule" (`invariants.md:3`), so the first line keeps the count out of the Rules.
- Test: none · markdown; `npm run lint` runs `scripts/validate-agent-assets.js` over its links and the unslop rule 2 phrases.

### 5. #802 links the page
- File: none in the repo; one comment on issue #802.
- Change: `gh issue comment 802` posts the step 3 URL and the five counts beside their baselines. Post it after step 3, because the comment needs the page's URL.
- Test: none · a GitHub write.

## Non-goals
- The list's ten lines, the define skills and the pass (MA-228, MA-229).
- The conductor and queued /prep cost measurement (MA-227, #805).
- A recount of the transactions baselines or an edit to the 2026-10-21 audit page.
- A class ticket or fix for a defect the count turns up.
- A script, hook or test that counts tickets in the repo.

## Untested inputs
- A ticket closed without a PR (`stateReason` not planned, or folded under the Floor): step 1 counts it in the family total and leaves it out of `k with a PR`.
- A found-later ticket whose Links has no `Found at` or `Found by` line: step 1's re-read of design bodies.
- A found-later ticket on another milestone, found during a commitments /ship: excluded by Rules line 1; step 1.
- A ticket at Blocked at the cutoff that entered Blocked from Defined: step 2 leaves it out of `readyAtReview`.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- Origin hangs on the Links marker. A found-later ticket written another way shrinks every count.
- Status history is GraphQL only. Many agents can exhaust the GraphQL budget while `gh api rate_limit` reads 5000, and REST has no status events.
- Family is a judgement per ticket. The audit's table names roots, not a test, so a second reader can move a borderline ticket between font scale and accessibility.
- The `In Progress` event stands for the /ship start. A /ship resumed after a Blocked spell keeps its first start.
- Publishing the page and posting the comment are writes. An unattended /ship parks if either is refused.

## Self-assessment
Step 1's family and came-back calls are the steps I am least sure of. The audit gives each family a root, and its came-back examples come from one milestone. A ticket like MA-236, which mixes 44 dp slops with a pill clamped at 2.0, counts in each of the four families it fixes. Accessibility is not one of the four, so MA-236 counts in font scale only when its fix changes the clamped pill. The page has to show that reading, so a reader can check it.
