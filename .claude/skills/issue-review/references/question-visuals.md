# Visuals for questions to the user

Every question the main session puts to the user is checked against the table below before it is sent, in any session; CLAUDE.md says so, and every asking step of `/issue-review`, `/boundaries`, `/tickets`, `/prep` and `/queue` cites it. A subagent returns its question as text and draws nothing; the session that asks the user makes the visual. A question on a yes row goes out with its visual in the same message, so the user never has to ask for it. Any other question goes out as text and no file is made. Four sessions show the cost of skipping it: on MA-098, MA-110 and twice on MA-111 the user asked for visuals or answered "No preference" to text-only options, then answered each question in one letter once the file came.

## When a question needs one

Read the rows top to bottom; the first row that matches decides.

| The question | Visual | What it draws |
|---|---|---|
| A gate confirming text the user has just read: `Lock this scope?`, `Create these N tickets?` (stop 1 drew the split), the merge | no | nothing |
| Options that differ in what a screen shows: a layout, a state, a ring, a colour, a size, a tile, a label that truncates | yes | the screen under each option |
| Options that differ in how the app behaves over time: loading, a tap, a drag, Save, navigation, a preselect | yes | the frames in order under each option, the frame where they part marked |
| Options that differ in a figure on screen across cases: a money rule, rounding, a sign | yes | the row or card under each option in a normal case and in the edge case (overspent month, negative, zero) |
| Options that differ in a structure: a ticket split (`Which split?`), a seam (`Trim at this seam?`), dependency order, which ticket owns what, a table's columns, what a delete cascades to | yes | boxes and arrows under each option, with ~lines on each box |
| Options that differ only in words: a copy string, a name | no | the strings side by side in the message |
| A fact the user holds | no | nothing |
| Anything else | no | nothing |

The user asking for a visual on a no row gets one.

## The file

- One HTML file per question message, in the session scratchpad, named `<id>-<topic>.html`: `<id>` is the MA id, or `issue-<n>` for an issue without one, or `session` outside any issue; `<topic>` names the question, so no two questions share a file. A message that asks several questions at once, as `/prep`'s gap list does, gets one file with one numbered section per question on a yes row.
- One column per option, on the same data, labelled `A (recommended)`, `B`, `C` in the order the message asks them. A gate on one proposal, such as a seam, draws today's shape and the proposal, labelled `Today` and `Proposed`.
- Columns sit side by side at desktop width and stack one under another below 700 px (`display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr))`); each keeps its label on top.
- Everything the columns share is drawn identically; each part that differs gets a dashed outline in one highlight colour. Two mockups that differ only in fill colour read as identical at a glance (MA-098).
- Draw the state where the options diverge most: the edge month, the error after Save, the accounts still loading at mount, the drag in progress. Add the resting state beside it when that is what the user sees most.
- Under each drawing, a table with one row per differing part and one column per option, plus a cost row where they differ (lines, a canvas frame to add, a rule to change).
- A question about a designed screen takes its colours, sizes and copy from the frame in `~/.ship/MoneyApp/canvas/`. Otherwise one line under the title says the colours and names are placeholders.
- Inline CSS and SVG only, no external requests.

The file serves the question only. It goes under no issue's Links and settles no design ticket's frames; `/boundaries` step 6 still decides when a mockup is its own ticket.

## Sending

`SendUserFile` with `display: "render"`, in the same message as the question, before its text. `status: "proactive"`, since the user did not ask for the file and may be answering from their phone; `"normal"` only when the user's last message asked for the visual. The caption names the question and what the dashed outline marks. The message text carries the question, the options with the recommendation first, and the part table.

No `SendUserFile` in the session (a terminal `claude`): `open <absolute path>` to show the file in the browser, and print the absolute path as the first line of the question message.

Never the inline widget, which does not reach the user's other device (MA-110). Never an Artifact; the file dies with the question.
