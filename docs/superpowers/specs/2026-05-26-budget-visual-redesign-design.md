# Budget Visual Redesign — Design

- **Date:** 2026-05-26
- **Status:** Approved (brainstorm) — pending spec sign-off
- **Owner:** @marcus (UX) · @tariq (synthesis) · @layla (band semantics)
- **Depends on / adopts:** `2026-05-26-swipe-actions-and-confirm-sheet-design.md` (budget's edit/delete arrive via the swipe standard; this redesign ships **with** budget's swipe adoption — one touch of the budget list).
- **Supersedes the row/bar visuals from:** `2026-05-25-budget-design.md`, `2026-05-26-budget-5030-20-lens-design.md` (logic unchanged).

## 1. Problem

The current category row stacks a full-width progress **bar** *and* a hairline **divider**, so the list reads as busy horizontal stripes. The bar duplicates the divider's separating role, the status pill is easy to miss, and the most-checked number (how much is left) is not the visual hero. The summary card's bar uses a coarse 3-state colour (under/warning/over) that doesn't communicate pacing.

## 2. Goals

- Replace the per-row bar with a **progress ring around the category icon** + a **remaining-first** right column. No per-row bar.
- A **5-band colour scale** driven by % of limit spent, applied to the ring, the % text, and the right-hand amount — and to the **summary card** bar + overall %.
- Keep a clean **hairline divider** between rows (now legible without the competing bar).
- Tokens only; no hardcoded hex/spacing/radius.

## 3. Non-goals

- No change to budget math, persistence, the 50/30/20 lens, or the category-detail screen's content.
- No change to add/edit/delete *interaction* — that's the swipe spec. (This spec assumes the row is wrapped by `SwipeableRow`.)
- Time-of-month pacing (comparing % spent vs % of month elapsed) is **out of scope** — the scale is a static threshold on % spent. (Noted as a future enhancement.)

## 4. Locked decisions

| # | Decision |
|---|----------|
| D1 | Row layout: **[ring+icon] · [name + % under it] · [left/over amount, with spent/budget under it]**. No bar. |
| D2 | The ring fills to the spend proportion (capped at a full circle when over 100%); the category icon sits inside it in the **category colour**. |
| D3 | 5-band colour scale on **% spent** (see §6) applied to: ring fill, the **%** text, and the **left/over** amount. |
| D4 | The muted **spent / budget** line (e.g. `3,200 / 5,000`) stays `text2` grey. |
| D5 | The word "used" is dropped — show just the number (e.g. `64%`). |
| D6 | **Summary card:** the progress bar fill and the overall **%** under it use the same 5-band scale (solid fill in the current band colour). The three figures keep their style; the **Left** figure stays green/red **by sign** (existing `leftColor` logic), not by band. |
| D7 | Hairline **divider** between rows (`border`), none after the last row. Full-width. |

## 5. Row anatomy

```
┌─────────────────────────────────────────────┐
│ (ring⟳ icon)   Housing                1,800  │   ← left/over amount, band colour
│                64%                     left   │   ← % (band colour) · amount label
│                                  3,200 / 5,000│   ← spent / budget, muted text2
├──────────────────────────── hairline divider ┤
```

- **Ring + icon (left):** circular progress ring, diameter ≈ `ms(46)`, stroke ≈ `ms(3.5)`, track `surfaceEl`. Fill = `min(pct, 1)` of the circle, colour = `budgetBandColor(pct)`. Icon centered in the category colour (`toIconName(icon, 'tag-outline')`), tinted hole matching the screen background.
- **Center:** category `name` (`interSemi`, `Type.body`, `text1`); below it the **%** (`interSemi`/bold, `Type.micro`), colour = `budgetBandColor(pct)`.
- **Right:** top line = remaining magnitude + label — `1,800 left` when `limit - spent ≥ 0`, `350 over` when negative; `Sora` bold (`Type.subhead`) for the number, small label; colour = `budgetBandColor(pct)`. Below it = `spent / limit` (`interRegular`, `Type.micro`, `text2`).
- Row tap → category detail (unchanged). Edit/Delete via `SwipeableRow` (swipe spec).

### 5.1 Implementation
- New `screens/budget/components/budget_ring.tsx` rendering the ring with **react-native-svg** (`Circle` with `strokeDasharray`/`strokeDashoffset`; already available — see CLAUDE.md "SVG textures"). Props: `pct`, `color`, `size?`, `stroke?`, `children` (icon).
- Rewrite `category_budget_row.tsx` to the anatomy above. The old per-row `BudgetBar` usage is removed from the row.
- `BudgetBar` itself is **retained** but its colour source changes (see §6/§7) — it's still used by the summary card.

## 6. 5-band colour scale

Driven by `pct = spent / limit` (0..n).

| Range | Band | Token (dark) | Hex |
|-------|------|--------------|-----|
| `< 50%` | under / plenty | `budgetUnder` | `#6FA8DC` (light blue) |
| `50–80%` | steady | `budgetSteady` | `#4CAF82` (= `positive`) |
| `80–90%` | watch | `budgetWatch` | `#E0B341` (yellow) |
| `90–100%` | near | `budgetNear` | `#E05A42` (= `negative`) |
| `> 100%` | over | `budgetOver` | `#B23A28` (dark red) |

Boundary rule (exactly 100% → "near"/red; only strictly over → dark red):

```ts
// constants/theme.ts (tokens) + a helper (e.g. screens/budget/budget.helpers.ts)
export function budgetBandColor(pct: number): string {
  if (pct > 1)    return Colors.dark.budgetOver;   // > 100%
  if (pct >= 0.9) return Colors.dark.budgetNear;   // 90–100%
  if (pct >= 0.8) return Colors.dark.budgetWatch;  // 80–90%
  if (pct >= 0.5) return Colors.dark.budgetSteady; // 50–80%
  return Colors.dark.budgetUnder;                  // < 50%
}
```

- Add the five tokens to `Colors.dark` (and light-mode analogues to `Colors.light`; dark is primary). `budgetSteady` may alias `positive` and `budgetNear` may alias `negative`, but defining explicit named tokens keeps the scale self-documenting and independently tunable.
- The hexes are brainstorm first-pass and tunable at device QA.

## 7. Summary card (`summary_card.tsx`)

- The 12px `BudgetBar` fill colour = `budgetBandColor(overall.pct)` (solid). Today it uses `computeStatus` (3-state) → switch to the 5-band helper.
- The meta line under the bar shows the overall **%** (no "used"), coloured `budgetBandColor(overall.pct)`. "{n} days left" stays muted.
- The three figures (Budgeted / Spent / Left) keep their current style; **Left** stays green/red by sign (D6).
- `BudgetBar` gains the ability to take an explicit `color` (band colour) rather than deriving from the 3-state `status` map — or the caller passes the resolved colour. (Plan decides the cleanest signature; keep `BudgetBar` a dumb fill.)

## 8. Removed / changed

- **Removed:** per-row `BudgetBar`; the status **pill** (`OVER` / `%`) on the row (its role is now the ring + % + amount colour).
- **Changed:** `BudgetBar` colour source (3-state → band colour) for the summary card.
- **Unchanged:** category-detail screen, lens tab, all budget logic/stores/queries.

## 9. Testing (logic-only per project rule)

- `budgetBandColor(pct)` — exhaustive band-boundary unit tests: `0`, `0.49`, `0.5`, `0.79`, `0.8`, `0.89`, `0.9`, `1.0`, `1.01`, large. Asserts exact token at each edge (100% = near/red; >100% = over/dark-red).
- Remaining/label logic (`left` vs `over`, sign) if extracted to a helper.
- No `.tsx` render tests.

## 10. Rollout

Ships as the **Budget adoption PR** of the swipe standard (one touch of the budget list = new visuals + swipe edit/delete). Manual device-QA gate: ring legibility at small size, band colours on real OLED, divider weight, dynamic-type, over-budget state.
