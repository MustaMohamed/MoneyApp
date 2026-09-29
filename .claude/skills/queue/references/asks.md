# /queue asks

Five steps, run in the primary checkout on `main`. A record's fields are the lines [question-record.md](../../issue-review/references/question-record.md) defines.

## 1. List

```bash
bash scripts/board.sh next --json | jq -r '.actions[] | select(.questions > 0) | .number'
bash scripts/board.sh questions <n>                                          # <comment id> <html_url> per open record
gh api repos/MustaMohamed/MoneyApp/issues/comments/<id> --jq .body
```

Order the records by root parent, the ticket's top ancestor through `parent` in the JSON, then by `Screen:`, then by the ticket's board row, `boardIndex`. Show the list first, one line per record: `#<n> <Asks:>`.

## 2. Re-read

Before a record is asked, `git fetch origin` and `git diff --name-only <Sha>..origin/main`. A record with a cited file, a repo path on any of its lines, in that list has its `Today:` line and each option read again against the code. When the code has answered the question, close the record per [§ State](../../issue-review/references/question-record.md#state) with `Answered by #<pr>`, the PR that changed the file, `git log --format=%s -1 <Sha>..origin/main -- <file>`. Tell the user in one line and count the record as answered at step 5.

## 3. Ask

One record per message. The `Asks:` line is the question; the options follow as the record lists them, A first, each with its `writes:` text. The visual follows [question-visuals.md](../../issue-review/references/question-visuals.md), the first matching row deciding. A follow-up question from the user is answered from the code and the record before the choice, and is not an answer. A deferred question changes nothing: the record stays open, the ticket stays where it is, and the next record comes.

## 4. Answer

In one step, per answer:

1. Close the record per [§ State](../../issue-review/references/question-record.md#state) with `Answer: <option letter>`.
2. For each `writes:` of the chosen option, append its text as a bullet under the section its `into:` names, `Acceptance` or `Rules`, on the ticket it names, `gh issue edit <m> --body "$BODY"`; an `into:` of `#<m> Cut` posts `gh issue comment <m> --body "Cut: <text>"` instead. On a body that has the sections, the same edit appends the option's `Copy` bullet or `Screen checks` row, the first row setting `Verify emulator`, and one `Decisions` line per [ticket-body.md](../../tickets/references/ticket-body.md): the question from `Asks:`, the option's letter and text, the user, and the step from `Asked by:` answered at `/queue asks`. A sibling ticket is edited in this step too.

## 5. Move

When `bash scripts/board.sh questions <n>` prints nothing after the answer, the ticket moves in the same step. A Blocked ticket first has its header line and last five comments read, then the state of each issue they name:

```bash
gh issue view <n> --json body,comments --jq '(.body | split("\n")[0]), (.comments[-5:][].body)'
gh api repos/MustaMohamed/MoneyApp/issues/<m> --jq .state   # per issue its Depends on or a Blocked on #<m> names
```

The first row that matches decides:

| The ticket | Move | Reply |
|---|---|---|
| At Blocked, every Depends on in its header closed and no `Blocked on #m` among its last five comments naming an open issue | `bash scripts/board.sh status <n> "<Left:>"`, Ready For Development or the column the record names | `Next: /prep <n>` from Ready For Development |
| At Blocked, any other | none, it stays Blocked | the open issues it waits on |
| At Defined, a leaf with `Size:` at or over the gate, 400 lines | the seam from the answer written into its body, no date | `Next: /tickets <n>` |
| At Defined, under a parent that reads `Reviewed none` | no date | `Next: /issue-review <parent>` |
| At Defined, under a parent with a `Reviewed` date, an epic, or no parent | `Reviewed <today>` on its header line, `gh issue edit <n> --body "$BODY"`, then `bash scripts/board.sh promote <n>` | what `promote` printed |
| At any other column | none | the command `bash scripts/board.sh next <n>` names for it |

A ticket with a record still open moves nothing. The run ends with one line per ticket: its column now and its reply.
