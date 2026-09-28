# Goals

Route `/goals`, a tab. Screen `src/modules/goals/screens/goals/index.tsx`: a heading in a `minHeight` box, a separator and the shared `src/components/ui/empty_state.tsx` in its `goals` variant, which has no button. Not redesigned; drawn as it is today. Goals has no data yet, so the empty state is the only content state.

## Reach it

- User path: the `Goals` tab.
- Script: `mqa open /goals`, or the tab bar's exact content-desc from `mqa ui`; the bare `$MQA tap 'Goals'` is refused under the uiautomator engine.

## States

| State | Frame | Force | Proof |
|---|---|---|---|
| empty | no frame, MA-125 | any database; the screen reads none | `mqa read` reads `Goals`, `No goals set` (`Strings.emptyGoalsTitle`) and `Goals will appear here.` (`Strings.emptyGoalsSub`) once each; no text node's box from `mqa bounds` intersects `fab-button`'s; one shot |
| empty, large font | no frame, MA-125 | the `Font scale` force (README) at 1.0 and 2.0 | at 2.0, from `mqa bounds`: the boxes of `Goals`, `No goals set` and `Goals will appear here.` intersect neither each other nor `fab-button`; each box grows with the scale (MA-125 read `No goals set` 27.8 to 45.3 dp and `Goals will appear here.` 17.9 to 34.7: the headline's line box grows 1.6 times, not 2, with its glyphs whole); a crop at 2.0 shows no glyph cut at the top or bottom |

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
