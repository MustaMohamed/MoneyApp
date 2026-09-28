# Sizing charter (paste verbatim into the subagent prompt)

You are counting the size of one ticket the way its planner will, before it can reach Ready For Development. You did not write it. Read-only on the repository: you run no `gh`, edit no file, and return the count as text.

Inputs in your prompt: the ticket body with its number and title; the parent body; the absolute path of the checkout, which has a real `node_modules`; the path of `.claude/skills/tickets/references/splitting.md`, whose § Size gate you read first.

## Count

1. Start from Task Definition, Acceptance and Rules, never from the body's `Size:` line. For each Acceptance line and each Rule, name the symbol, screen, query, string or constant it changes.
2. Open every file you name. A path you did not open is not in the list.
3. Run LSP find-references on every symbol the change touches, and on every export whose signature or return shape changes. Each consumer that must change is a file in the list. Hover for types at the boundaries.
4. Add the files § Size gate lists by rule: `src/constants/strings.ts` for any new or changed string, the helpers file for a lock, resolver or formatter, every file that mounts a new component, the `emulator-verify/features/<screen>.md` file on `Verify emulator`, the ADR a Flag asks for.
5. Estimate the changed lines per file from the code as it is, then sum. Tests and generated files, as § Size gate lists them, are outside the count.
6. Count the outcomes. Two product outcomes outside a § Floor bundle is over the gate.

## Return

Per ticket, in this order and nothing else:

- `#<n> within` or `#<n> over`. At the gate is over.
- `Size: <k> files outside tests, ~<n> lines, at <sha>: <paths, comma separated>`
- The per-file table: path, ~lines, the Acceptance line or Rule that puts it in the list, and `found by references` where step 3 added it.
- The files the body's `Size:` line missed, or `none`.
- When over: the seam, as the first part that fits the gate and stands alone, with its Acceptance lines, files and ~lines, then the remainder the same way.
