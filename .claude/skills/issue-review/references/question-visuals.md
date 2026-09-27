# Visuals for questions to the user

Every question a skill puts to the user is checked against the table below before it is sent, in `/issue-review`, `/boundaries`, `/tickets`, `/prep` and `/ship`. A question on a yes row goes out with its visual in the same message; the user never has to ask for it. A question on a no row goes out as text and no file is made. Four sessions show the cost of skipping it: MA-098, MA-110 and twice on MA-111 the user asked "show me visuals" or answered "No preference" to text-only options, then answered each question in one letter once the file came.

## When a question needs one

| The options differ in | Visual | What it draws |
|---|---|---|
| What a screen shows: a layout, a state, a ring, a colour, a size, a tile | yes | the screen under each option |
| How the app behaves over time: loading, a tap, a drag, Save, navigation, a preselect | yes | the frames in order under each option, the frame where they part marked |
| A figure on screen across cases: a money rule, rounding, a sign | yes | the row or card under each option in a normal case and in the edge case (overspent month, negative, zero) |
| A structure: a ticket split, a seam, dependency order, which ticket owns what, a table's columns | yes | boxes and arrows under each option, with ~lines on each box |
| Only words: a label, a copy string, a name | no | the strings side by side in the message |
| A fact the user holds, or a yes/no gate (`Apply these deltas?`, `Lock this scope?`, `Create these N tickets?`, the merge) | no | nothing |

A question on both a yes row and a no row gets the visual. The user asking for a visual on a no row gets one.

## The file

- One HTML file per question message, in the session scratchpad, named `<MA-id>-<topic>.html`. A message that asks several questions at once, as `/prep`'s gap list does, gets one file with one numbered section per question on a yes row.
- The options side by side on the same data, labelled `A (recommended)`, `B`, in the order the message asks them.
- Everything the options share is drawn identically; each part that differs gets a dashed outline in one highlight colour. Two mockups that differ only in fill colour read as identical at a glance (MA-098).
- Draw the state where the options diverge most: the edge month, the error after Save, the accounts still loading at mount, the drag in progress. Add the resting state beside it when that is what the user sees most.
- Under each drawing, a table: part, A, B, and a cost row where they differ (lines, a canvas frame to add, a rule to change).
- A question about a designed screen takes its colours, sizes and copy from the frame in `~/.ship/MoneyApp/canvas/`. Otherwise one line under the title says the colours and names are placeholders.
- Inline CSS and SVG only, no external requests, readable at phone width, since the user often answers from another device.

The file serves the question only. It goes under no issue's Links and settles no design ticket's frames; `/boundaries` step 6 still decides when a mockup is its own ticket.

## Sending

`SendUserFile` with `display: "render"` and `status: "normal"`, in the same message as the question, before its text. The caption names the question and what the dashed outline marks. The message text carries the question, the options with the recommendation first, and the part table.

Never the inline widget, which does not reach the user's other device (MA-110). Never an Artifact; the file dies with the question.
