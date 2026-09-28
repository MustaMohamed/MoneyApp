# Goals

Route `/goals`, a tab. Screen `src/modules/goals/screens/goals/index.tsx`: a heading in a `minHeight` box, a separator and the shared `src/components/ui/empty_state.tsx` in its `goals` variant, which has no button. Not redesigned; drawn as it is today. Goals has no data yet, so the empty state is the only content state.

## Reach it

- User path: the `Goals` tab.
- Script: `mqa open /goals`, or the tab bar's exact content-desc from `mqa ui`; the bare `$MQA tap 'Goals'` is refused under the uiautomator engine.

## States

| State | Frame | Force | Proof |
|---|---|---|---|
| empty | no frame, MA-125 | any database; the screen reads none | `mqa read` reads `Goals`, `No goals set` (`Strings.emptyGoalsTitle`) and `Goals will appear here.` (`Strings.emptyGoalsSub`) once each; no text node's box from `mqa bounds` intersects `fab-button`'s; one shot |
| empty, large font | no frame, MA-125 | `adb -s <serial> shell settings put system font_scale <scale>` at 1.0 and at 2.0, each followed by a cold launch; `font_scale` back to 1.0 after | at 2.0, from `mqa bounds`: the boxes of `Goals`, `No goals set` and `Goals will appear here.` intersect neither each other nor `fab-button`; each box is at least twice its height at 1.0, less 1 dp; at 1.0 the three boxes read the same ± 1 dp as on `main`, since the bottom reserve moves the state only above 1.0; a crop at 2.0 shows no glyph cut at the top or bottom |

## Outbound

| Action | Lands on | Back lands on |
|---|---|---|
| another tab | that tab | n/a |
| the + button | its menu over this screen | this screen |
| Back | the previous tab | n/a |

## Gotchas

- The empty state reserves `Size.tabScreenBottomClearance` below itself only above `font_scale` 1.0 (`resolveStateScreenBottomReserve`), so its centre moves up at 2.0 and not at 1.0; a centre that moves at 1.0 is a regression.
- The heading is `Typography.Heading` in a `minHeight` box, left as it is by MA-125; a heading cut at 2.0 is a finding for the plan, not a recipe error.

## Seeding and forcing states

See `README.md` § Seeding and forcing states. No seed changes this screen.
