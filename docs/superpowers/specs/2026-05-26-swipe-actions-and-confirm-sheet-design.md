# Swipe Actions Standard + Destructive ConfirmSheet — Design

- **Date:** 2026-05-26
- **Status:** Approved (brainstorm) — pending spec sign-off
- **Owner:** @tariq (synthesis) · @marcus (UX) · @sarah (sequencing)
- **Builds first** (ahead of the budget visual redesign, which adopts this standard).
- **Related:** `2026-05-25-wave4-sp2-confirm-dialog-design.md` (confirm dialog→sheet direction), `2026-05-26-budget-visual-redesign-design.md` (consumer)

## 1. Problem

Row-level management is inconsistent and, for budget, actively bad:

- **Budget:** delete is buried inside the edit sheet as a red "Remove" text link, with **no confirmation** — a data-affecting action one mis-tap away.
- **Transactions / Commitments:** edit and delete require navigating into a detail screen first; there is no quick row-level action.
- Confirmation UI is split: some flows use `ConfirmDialog` (centered modal), the newer direction is `ConfirmSheet` (bottom sheet). Budget delete uses neither.

We want **one** row-interaction pattern across the app: swipe a list row to reveal contextual actions, with destructive actions always gated by a consistent confirmation **sheet**.

## 2. Goals

- A single shared `SwipeableRow` wrapper used by the budget, transactions, and commitments lists.
- Swipe-left reveals trailing actions; tapping the row body keeps its existing navigation.
- Destructive actions route through `ConfirmSheet`, extended with a **destructive** variant (red danger button + trash icon).
- Accessible: the same actions are reachable without a swipe gesture.
- No new dependency — wrap `react-native-gesture-handler`'s Swipeable (already in the stack), the same way `bottom_sheet.tsx` wraps `@gorhom/bottom-sheet`.

## 3. Non-goals

- No full-swipe-to-trigger (swiping all the way to fire delete). Reveal-and-tap only, to avoid accidental destructive actions. (Possible later enhancement.)
- No new gesture library; no `expo-dev-client` / prebuild changes.
- Budget's visual redesign (rings, colour scale) is a **separate spec** — this one only delivers the interaction standard + budget's edit/delete wiring.
- No change to what edit/detail screens do internally (only how they're reached).

## 4. Locked decisions

| # | Decision |
|---|----------|
| D1 | Interaction = **swipe-left reveals trailing action buttons**; tap to invoke. No full-swipe trigger. |
| D2 | Shared component `components/ui/swipeable_row.tsx`, wrapping RNGH `ReanimatedSwipeable`. Team Law 7 justification: **HeroUI Native has no swipe/Swipeable primitive**; this is an interaction/layout wrapper over an in-stack library, not a parallel of a HeroUI component. |
| D3 | Per-list action sets: **Budget** → Edit, Delete · **Transactions** → Edit, Delete · **Commitments** → Skip, Edit, Delete. |
| D4 | Destructive confirmation = **`ConfirmSheet` + new `destructive` prop** (danger button + trash icon). `ConfirmDialog` is **not** used for these flows. |
| D5 | **One row open at a time**; opening a row closes any other; scroll/navigation closes the open row. |
| D6 | **Accessibility:** each action is exposed via `accessibilityActions` (VoiceOver/TalkBack) **and** a long-press fallback that opens the same actions, since swipe alone is inaccessible. |
| D7 | Action visual language: fixed-width tiles, full row height, icon over label. Edit = neutral (`surfaceEl` bg / `text1`), Skip = `transferBlue`, Delete = `negative` (white icon/label). Tokens only. |

## 5. `SwipeableRow` — component design

### 5.1 API

```ts
export interface SwipeAction {
  key: string;
  label: string;                 // from Strings
  icon: MaterialCommunityIconName;
  /** Tile background + (for destructive) the semantic intent. */
  variant: 'neutral' | 'info' | 'destructive';
  onPress: () => void;
}

export interface SwipeableRowProps {
  children: React.ReactNode;      // the existing row body, untouched
  actions: SwipeAction[];         // trailing (right) actions, 1–3
  /** Optional: id used to coordinate "one open at a time". Defaults to a generated id. */
  rowId?: string;
  /** Disable swipe (e.g. while a mutation is in flight). */
  disabled?: boolean;
  accessibilityLabel?: string;    // describes the row for the a11y actions menu
}
```

- `actions` render right-to-left in array order (first action closest to the row). Trailing-only for v1 (no leading actions).
- The component renders `children` as the swipeable content and the `actions` as the trailing reveal panel.

### 5.2 Behaviour

- **Reveal:** drag left past a small threshold snaps the panel open to its full action width; drag right / tap body / tap an action / scroll / navigate closes it.
- **Tap body:** when closed, taps pass through to `children` (its existing `onPress`). When open, a tap anywhere outside the actions closes the row (and is swallowed — does not also navigate).
- **One open at a time (D5):** a lightweight module-level registry (or context) tracks the currently-open row and closes the previous one when a new row opens. Lists also close the open row on scroll begin and on screen blur.
- **Destructive tap:** invokes `onPress`, which opens the relevant `ConfirmSheet`. The row closes when the sheet opens.
- **Haptic:** light impact on reveal-snap (optional, `expo-haptics` if already present; otherwise omit — not a new dependency).

### 5.3 Accessibility (D6)

- The wrapper sets `accessibilityActions={actions.map(a => ({ name: a.key, label: a.label }))}` and handles `onAccessibilityAction` to dispatch the matching `onPress`. Screen-reader users get the actions from the rotor/menu without swiping.
- **Long-press fallback:** long-pressing the row opens the same action set (rendered as an inline action bar or a small sheet) for motor users who can't perform a precise swipe. (Implementation detail for the plan; the requirement is "actions reachable without swipe".)
- Action tiles have `accessibilityRole="button"` and the action `label`.

### 5.4 Tech notes (@tariq)

- Engine: `ReanimatedSwipeable` from `react-native-gesture-handler` (already a dependency via reanimated v4 + gesture-handler). No new package, no native change, Expo-dev-client safe.
- **FlashList interaction (transactions):** rows recycle — the open/registry state must key off a **stable item id**, and the row must reset to closed on recycle (`renderItem` identity changes). The plan must verify no "ghost open" on fast scroll.
- Budget list is a `.map` (small, fixed) and commitments is a list; both are simpler than the FlashList case.
- Place under `components/ui/` and compose existing tokens. Snapshot/interaction logic lives in the component; lists pass `actions`.

## 6. `ConfirmSheet` — destructive variant (D4)

Extend the existing `components/ui/confirm_sheet.tsx` (do not fork it):

```ts
interface ConfirmSheetProps {
  // …existing props…
  /** When true: danger (red) confirm button + danger-tinted trash icon. Default false. */
  destructive?: boolean;
}
```

- `destructive=false` (default): unchanged — amber `alert-circle-outline` in `warningBg` circle, **primary** confirm button. Existing callers (commitments Skip) are untouched.
- `destructive=true`:
  - Icon: `trash-can-outline` in a `dangerBg`-tinted circle, `negative` colour.
  - Confirm button: `<Button variant="danger" … />` (HeroUI `danger` variant — already used by `ConfirmDialog`).
  - Cancel button: stays `ghost`.
- Copy stays caller-supplied via `title` / `body` / `confirmLabel` / `cancelLabel`.

### 6.1 Confirmation migration (dialog → sheet)

Per the established direction, the delete confirmations these swipe actions replace should standardise on `ConfirmSheet`:

- **Budget delete** → new `ConfirmSheet` (destructive). Removes the "Remove" link from `set_budget_sheet.tsx`.
- **Transactions delete** → swipe action opens `ConfirmSheet` (destructive). The existing `screens/transactions/detail/components/delete_confirm_dialog.tsx` (a `ConfirmDialog`) is migrated to `ConfirmSheet` so list-delete and detail-delete match.
- **Commitments delete** → `ConfirmSheet` (destructive). **Skip** keeps its existing `skip_confirm_sheet.tsx` (non-destructive `ConfirmSheet`).

`ConfirmDialog` is **not removed** in this spec (other screens — accounts archive, categories delete — still use it; their migration is out of scope here and can follow separately).

## 7. Per-list adoption

All three wrap their existing row component in `SwipeableRow` and pass `actions`. Row bodies and their tap-to-detail behaviour are unchanged.

### 7.1 Budget (`screens/budget`)
- Row: `category_budget_row.tsx` (its new ring form lands in the budget-visual spec; this spec only wires the swipe).
- Actions: **Edit** → `openEdit(categoryId)` (existing set/edit sheet in edit mode) · **Delete** → `ConfirmSheet` destructive → `removeBudget(categoryId)`.
- Removes the `set_budget_sheet` "Remove" link (D4). The detail-screen pencil (added previously) stays.

### 7.2 Transactions (`screens/transactions`)
- Row: `transaction_row.tsx` (rendered in a FlashList — see §5.4).
- Actions: **Edit** → open the transaction edit form for that tx · **Delete** → `ConfirmSheet` destructive → existing delete mutation. Body tap still opens transaction detail.

### 7.3 Commitments (`screens/commitments`)
- Row: `commitment_row.tsx`.
- Actions: **Skip** (`info`/blue) → existing `SkipConfirmSheet` · **Edit** → edit commitment screen · **Delete** → `ConfirmSheet` destructive → delete mutation. Body tap still opens commitment detail.

## 8. Strings

New keys in `constants/strings.ts` (action labels + per-list confirm copy), e.g.:
- `swipeEdit`, `swipeDelete`, `swipeSkip`
- `budgetRemoveConfirmTitle/Body/Confirm/Cancel`
- `txDeleteConfirmTitle/Body/Confirm/Cancel` (reuse existing if present)
- `commitmentDeleteConfirmTitle/Body/Confirm/Cancel`

Body copy reassures non-destructive side effects, e.g. budget: *"This stops tracking the limit for {category}. Your transactions and spending history are kept."*

## 9. Testing (logic-only per project rule)

- `SwipeableRow` open/close registry logic (one-open-at-a-time) as a pure/unit-testable module where feasible.
- `ConfirmSheet` destructive prop: render-path is UI; keep coverage on the *logic* it gates (the store mutations: `removeBudget`, tx delete, commitment delete) — assert they fire on confirm and not on cancel via hook/store tests.
- No `.tsx` render tests (project rule: logic-only).
- Accessibility-action dispatch: unit-test the `name → onPress` mapping if extracted to a helper.

## 10. Rollout / sequencing (@sarah)

1. **Foundation PR:** `SwipeableRow` + `ConfirmSheet` destructive variant + strings. No screen behaviour change yet.
2. **Adoption PR — Transactions** (highest traffic; validate FlashList recycle).
3. **Adoption PR — Commitments.**
4. **Adoption PR — Budget**, landing **together with the budget-visual redesign** (single touch of the budget list).

Each adoption PR is independently revertable. Manual device-QA gate applies (swipe feel, recycle, a11y, accidental-delete resistance).

## 11. Open questions

None blocking. Minor, deferrable to the plan: exact long-press fallback presentation (inline bar vs mini-sheet); whether to add light haptics (only if `expo-haptics` already present).
