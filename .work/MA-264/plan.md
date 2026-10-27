# MA-264 — The invariant pass reads the screen's own nodes
base: 1ad45107daee93e9381310ad0cf20e6d0a2ff33a · verify: none · flags: none · expected diff: ~3 lines

## Steps
### 1. The pass's three unnamed reads name the box read
- File: `.claude/skills/emulator-verify/features/README.md` (§ Invariant pass, lines 74, 75, 78)
- Change: README:74 introduces the term at its first use, "the box read, `mqa bounds '~'`, for every node's box", and its end test reads "until a scroll leaves the box read unchanged". README:75 reads "The box read has no visibility filter and keeps a closed sheet's and a popped screen's nodes". README:78 reads "A node the box read cannot list, text a shot shows that the box read lacks". The rest of each line, and the unscoped `mqa read` that lists the pressables at README:74, stay as they are.
- Test: first · `__tests__/scripts/mqa_box_read.test.ts`, new, logic-only. It spawns `.claude/skills/emulator-verify/mqa.sh` as `run()` does in `__tests__/scripts/mqa_foreground.test.ts:72-112` (stub `adb`, stub agent-device through `MQA_AGENT_DEVICE`, `MQA_UI=agent-device`, `MQA_SERIAL`, `MQA_WORK`, `MQA_LEASE_DIR`), with a `snapshot` case in the agent-device stub that prints a JSON file the test writes, whatever flags follow it (`-i` on the unscoped `read`, `mqa.sh:872`). `snap_file` (`mqa.sh:717-726`) saves that output and `query` (`mqa.sh:730`) walks every object carrying `rect`. The fixture's first node is the status-bar clock (`bundleId: 'com.android.systemui'`, label `12:34`, rect at the top 63 px), then app nodes (`bundleId: 'com.moneyapp.app'`): two labelled TextViews, one labelled Button, one unlabelled ViewGroup, and one labelled TextView with `visibleToUser: false` standing for a closed sheet's node. Cases: (a) `bounds '~'` exits 0 and prints one `~: ` line per node in the snapshot, the clock and every app node among them (`mqa.sh:768`, `:854-857`); (b) `read '~'` prints the clock's line and no app node's label (`mqa.sh:838-847`), the read the recipe must not use; (c) the `visibleToUser: false` node's label is in the `bounds '~'` output and absent from the unscoped `read` output (`mqa.sh:827`, `:872`); (d) a second fixture with every app node's `rect.y` lowered by one scroll and the clock unchanged gives `bounds '~'` output that differs from the first, the first fixture read twice gives identical output, and `read '~'` gives identical output on both fixtures. `mqa bounds` takes one or more selectors, none optional; `mqa read` takes an optional scope, absent meaning the unscoped `screen` listing. All four cases pass at `base`, since `mqa.sh` does not change.

## Non-goals
- No change to `.claude/skills/emulator-verify/mqa.sh`: no verb added or changed (ticket Rules).
- No line of `.claude/skills/boundaries/references/invariants.md` changes (Out of scope, MA-228).
- No edit to the pass's other lines, README:70-73, :76-77, or to `.claude/skills/ship/references/implement.md:66`, `.claude/skills/ship/references/battery.md:78` and `.claude/agents/render.md:12-13`, which cite § Invariant pass by name and describe no read.
- No Jest case on the README's text: an assertion on file contents is audit M35 (`.claude/rules/tests.md:24`).

## Untested inputs
- The README wording itself, step 1: file contents are not a Jest subject (`.claude/rules/tests.md:24`); review reads it.
- A real device snapshot from agent-device 0.21.13, step 1: the suite feeds a stub JSON, so it pins `query`, not the device's node order.
- The uiautomator engine, step 1: under `MQA_UI=uiautomator` (`.claude/skills/emulator-verify/SKILL.md:70-71`, `:93-94`) `bounds '~'` parses the XML branch of `query` (`mqa.sh:757-763`), and the suite feeds agent-device JSON only.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- CLAUDE.md critical trigger 2 (ticket Rules): the box read departs from #802 Rule 4's screen-root read, and the user rules it at merge; the merge summary names the departure.
- The status-bar clock's label changes at a minute boundary, so at the list's end one scroll can read changed and the next ends the pass, one extra viewport, never an early end.
- A future `mqa.sh` change to `~` matching or to `bounds` filtering makes the recipe's box read list fewer nodes; cases (a) and (c) are the guard.

## Self-assessment
Step 1's test is the least sure part. It characterizes `mqa.sh`, which this ticket leaves unchanged, so it passes at `base` and guards the recipe's claims rather than proving the edit. Whether the stub snapshot reaches `query` as a device snapshot does rests on `snap_file` writing agent-device's stdout to `$WORK/snap.json` unchanged (`mqa.sh:720-721`), which `mqa_foreground.test.ts` never exercises because its stub has no `snapshot` case.
