# MA-152 — The queue's second measure and the merge summary name one set
base: 8222a714 · verify: none · flags: none · expected diff: ~7 lines

Line numbers are at `8222a714`. 2 files outside tests, the two on the ticket's `Size:` line.

## Steps

### 1. The merge summary writes item 10 under a fixed heading and table, and item 6 under the common rule
- File: `.claude/skills/ship/references/merge.md` (:31, item 6 at :38, item 10 at :42, Checklist :82)
- Change:
  - Item 10 is written under the heading `## Questions that should have been asked earlier`, over a table with the columns Record, Check, in that order. One row per `## Parked` line of `state.md` whose `miss:` is not `none`. Record is the line's record URL, Check is its miss. With no such line the heading and the header row are written alone, never `none`. Item 10 gains the sentence that `queue column.md` reads this heading, with the link item 6 has today.
  - `:31` names item 10, not item 6, as the one item never written `none`. `:82` says the same of item 10.
  - Item 6 loses its last sentence, the one that says `queue column.md` reads its heading. Its heading, columns and sources stay. Empty, it is written `none` like the other eight.
- Test: `none`. Skill text. `__tests__/scripts/board_size.test.ts:12` and `__tests__/scripts/pr_size.test.ts:40` hold this file's path as a string and read none of its prose.

### 2. Measure 2 counts the rows under item 10's heading, and the start prompt fixes that shape
- File: `.claude/skills/queue/references/column.md` (§ One pass step 5 at :15, § Start prompt :51, § After 10 queued tickets measure 2 at :109)
- Change:
  - Measure 2 counts, per ticket, the rows of the table under `## Questions that should have been asked earlier` in `~/.ship/MoneyApp/queue/ship-<n>-summary.md`. The reads, in full: no summary file counts 0, a summary file without that heading counts 0, the header row alone counts 0, k rows count k. A summary file without that heading holds no `ship` start, and the reply names the file, one per such file, whenever it was written. That sentence replaces the one at `:109` that has such a file hold every `ship` start.
  - Step 5 of § One pass at `:15` gains one clause before its last-line sentence, "then each summary file measure 2 names". The reply's order is candidate lines, stale leases, the readings, the named summary files, then the `Next:` line, which stays last.
  - The `/ship:` line of the prompt names the same heading over a table with the columns Record, Check, one row per `## Parked` line of `state.md` that carries a miss, the header row alone when there is none. It no longer names `## Decisions the ticket or plan did not state` or its columns.
  - `:30` and `:111` keep every character.
- Test: `none`. Skill text. No file under `__tests__/` reads this file.

## Non-goals
- The ten items, their order, and item 6's heading, columns and sources.
- `column.md:111`, the two thresholds and what releases the hold. Measure 1 at `:108`.
- The `## Parked` line of `state.md` at `.claude/skills/ship/SKILL.md:109`, the `Miss:` row of `.claude/skills/issue-review/references/question-record.md:28`, and `SKILL.md:187`, which already calls item 10 the last item.
- `~/.ship/MoneyApp/queue/ship-625-summary.md` and `ship-646-summary.md`. No step rewrites a summary.
- Issue #639. No step edits the epic.
- A rule that tells a summary written before this change from one written after it.
- Anything under `src/`, `scripts/` or `__tests__/`. The size gate's figures.

## Untested inputs
- No summary file for a `ship` line of the log, step 2.
- A summary without the heading, `ship-625-summary.md` and `ship-646-summary.md`, counted 0, holding no start and named in the reply, step 2.
- A summary whose item 10 is the header row alone, step 2.
- A `## Parked` line whose miss reads `none`, which adds no row, step 1.
- A summary whose item 6 is empty, written `none`, step 1.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.
- `git grep -l "## Questions that should have been asked earlier" -- .claude/skills` prints nothing at base and both files at head.
- `git grep -c "Decisions the ticket or plan did not state" -- .claude/skills` prints `column.md:2` and `merge.md:1` at base, and `merge.md:1` alone at head.
- `git grep -n "item 6, whose\|item 6's" -- .claude/skills/ship/references/merge.md` prints `:31` and `:82` at base and nothing at head.
- `git grep -n "holds every" -- .claude/skills/queue/references/column.md` prints `:109` at base and nothing at head. ``git grep -n 'holds no `ship` start' -- .claude/skills/queue/references/column.md`` prints nothing at base and the measure 2 line at head, and that line still holds `reply names`. `git grep -n "measure 2 names" -- .claude/skills/queue/references/column.md` prints nothing at base and `:15` at head.
- The two summaries on this machine, run once with `H` set to each heading. With the base heading it prints 8 and 6, with the head heading 0 and 0:
  ```bash
  H="Questions that should have been asked earlier"
  for n in 625 646; do awk -v h="## $H" '$0==h{t=1;next} /^## /{t=0} t&&/^\|/' "$HOME/.ship/MoneyApp/queue/ship-$n-summary.md" | tail -n +3 | wc -l; done
  ```

## Risks
- Once the log holds 10 tickets, every pass that reads the measures names `ship-625-summary.md` and `ship-646-summary.md` in its reply, and keeps naming them while the files exist.
- Acceptance 2 is met by step 2 and #639 needs no edit. `gh issue view 639 --json body --jq .body | grep -n -i "asked earlier"` prints two lines: Rule 38 gives the name to the summary's tenth item, and Rule 56 reads "questions that should have been asked earlier is below 1 per ticket". An edit to either Rule that points it at the decisions table invalidates step 2.
- This ticket's own `/ship` run may read `merge.md` from main and write `ship-651-summary.md` without the heading. Step 2 counts it 0 and the reply names it.
- Item 6 written `none` when empty follows from moving the exception. If item 6 must keep its header row, `merge.md:31` and `:82` name both items.
- The column names Record and Check are this plan's. The ticket states none.
- A ticket parked with a miss counts only once its run resumes and writes a summary. `column.md:109` counts a `ship` line with no summary file as 0 today, and the plan keeps that.

## Self-assessment
Step 2 is the one I am least sure of, on when the reply names a summary without the heading. `column.md:106` has a pass read the measures before a `ship` start, once the log holds 10 tickets. So the clause step 2 adds at `:15` prints nothing on a `/queue Defined` or `/queue Ready For Development` pass, and nothing on a `/queue Planned` pass before the tenth ticket. The plan reads Acceptance 4 as bound to the passes that read measure 2 and leaves `:106` alone. If the reply must name such a file on every pass, `:106` changes too and the plan is amended.
