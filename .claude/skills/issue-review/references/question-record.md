# Question record

A question a skill cannot answer in an unattended run, and a question `/ship` cannot rule in any run, is parked as one issue comment that stands alone: a session that never saw the run answers it from the record and the code. `/issue-review`, `/prep`, `/ship` and `/queue asks` write and read it; `scripts/board.sh questions` and `scripts/board_next.mjs` count it.

## Unattended runs

A run is unattended when its task prompt holds the line `Run: unattended`. Any other run is typed, and a typed run asks in the session as it always has, except `/ship`, which parks in a typed run too.

## The record

The first line is exactly `Question: open`. Labelled lines follow, one each, in this order:

| Line | Holds |
|---|---|
| `Asks:` | The question in one sentence, ending in `?` |
| `Asked by:` | The skill, the check id or plan step, and the date |
| `Blocks:` | The Acceptance line, Rule or plan step that waits on the answer |
| `Today:` | What the app does now, with the `path:line` that shows it |
| `Wanted:` | What the ticket wants instead |
| `Why:` | What goes wrong if the question is answered badly |
| `Options:` | A first and recommended, then B and on; each option carries `writes:` the text it adds and `into:` `#<n>` plus `Acceptance` or `Rules`, or `#<n> Cut`, a comment on `#<n>` whose body starts `Cut: `; one `writes:` and `into:` per ticket it binds. Beside its `writes:`, an option that settles a string carries `copy:`, the `Copy` bullet it adds, and one that settles a screen state carries `screen:`, the `Screen checks` row it adds |
| `Wrong if:` | The fact that would make the recommendation wrong |
| `Prior art:` | The sibling ticket, rule or code that settled a like question, else each source the writer read and found silent: the parent's lines, the canvas frame, the ADRs, the shipped code, the siblings' Decisions |
| `Reaches:` | The sibling tickets and callers the answer also binds, or `none` |
| `Screen:` | An `emulator-verify` feature name, or `none` |
| `Sha:` | `git rev-parse origin/main` after `git fetch origin`, when the record is written |
| `Left:` | The board Status the issue had when the record was parked |
| `Miss:` | Written by `/ship` only, on a Flag the diff needs that the header lacks, or a ticket line that cannot hold or that the code contradicts: the `/issue-review` check id or the `/prep` step that should have asked |

The record's cited files are every repo path on any of its lines.

## State

The first line is the state. A record is open while it reads `Question: open`. An answer edits the same comment, never a new one:

```bash
gh api -X PATCH repos/MustaMohamed/MoneyApp/issues/comments/<id> -f body="$BODY"
```

The edit sets the first line to `Question: answered <yyyy-mm-dd>`, inserts a new second line, `Answer: <option letter>` when the user chose or `Answered by #<pr>` when the code had already answered it, and leaves every other line as it was. `bash scripts/board.sh questions <n>` prints `<comment id> <html_url>` per open record on issue `<n>`.

## Restatement check

Before `gh issue comment`, one fresh subagent (`subagent_type: general-purpose`) gets the record text alone, nothing else, and restates the question and its options in its own words. The conductor compares the restatement with the `Asks:` line and the option list. A restatement that names another question or another set of options fails: rewrite the record once and check again. A record that fails twice is parked anyway, with `Unclear: <restatement>` as its last line.
