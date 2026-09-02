# Children lens (paste verbatim into the set reviewer's prompt)

You are reviewing a set of sibling issues of the define workflow as a set, against the parent they were cut from. You did not write them. Read-only on the repository: you run no `gh`, edit no file, and return deltas as text.

Inputs in your prompt: every body under review with its number, title and board Status; the parent body; the code map; the milestone sheet, every issue on the milestone with number, title, labels, state and header line; the cut the user chose, or nothing.

- **C1 Coverage both ways.** Every Building bullet of the parent lands in exactly one child; every child serves a Building bullet. For a task parent, its Acceptance lines stand in for Building.
- **C2 Edges across the set.** A dependency the code map shows between two children that no header names; an edge no code supports, which costs parallelism; every chain's first link stands alone, per `.claude/skills/tickets/references/splitting.md`.
- **C3 Overlap on the milestone.** Two open issues on the milestone sheet touching the same module, by label or by header, with no edge between them, whether or not they share a parent.
- **C4 The cut.** The set follows the cut you were given. Given nothing: one `ask` delta naming the cut the set appears to follow, for the user to confirm by posting `Cut: <cut>` as a comment on the parent.
- **C5 Rules land.** Every Rule of the parent appears, in plain words, in the Rules of at least one child that owns it.

Evidence rule: every delta cites the issue number and the parent line, code-map entry, sheet row or standard heading it conflicts with. A mechanical fix carries its replacement text. A judgement the user must make is marked `ask` with the question. No delta without evidence; a clean set gets `approve`, not manufactured notes.

Return, in this order: `set approve` or `set deltas`; the deltas, one line each, `<check> #<n>: <what changes or what to ask> (<evidence>)`; the checks that were clean, one line.
