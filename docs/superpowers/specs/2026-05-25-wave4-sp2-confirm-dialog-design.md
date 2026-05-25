# Wave 4 · SP-2 — `ConfirmDialog` (HeroUI `Dialog` wrapper) Design

**Date:** 2026-05-25
**Author:** @tariq (synthesis), with the team
**Status:** Design — awaiting spec sign-off
**Parent effort:** Wave 4 (Full HeroUI migration) from `docs/superpowers/reviews/2026-05-24-post-ship-heroui-consistency-review.md`, sliced via Approach C (hybrid, wrappers-first, risk-tiered).

---

## Context

`components/ui/confirm_dialog.tsx` currently wraps RN's `Modal` with a custom `Box`/`Button`/`Text` layout for the centred alert-style confirm dialog. Wave 4 targets every non-HeroUI primitive still in the app. The `Dialog` component in HeroUI Native (`heroui-native`) is a compound API purpose-built for this exact pattern: portal + backdrop overlay + centred card content + gesture-dismiss. SP-2 is a single-file in-place rewrite: the wrapper's **public API stays byte-identical** so all three call-site wrappers get the new internals for free with zero changes.

SP-1 (`SelectablePill` / HeroUI `Chip`) ships first as a separate PR. SP-2 has no file overlap with any other Wave 4 SP (see `docs/superpowers/plans/2026-05-25-wave4-parallelization.md`) and can run concurrently in Batch 1 from the same `main` base.

---

## Goal

One canonical confirm-dialog component built on HeroUI `Dialog`, adopted at all three call-site wrappers transparently, with **zero rendered-text regressions** and **zero call-site changes required**.

---

## Hard invariant

- **Zero rendered-text changes.** Every label string, every body string, every warning line — in every dialog state — stays byte-identical. All copy is already threaded through `Strings.*` at the call sites and the wrapper passes it through unchanged.
- **Behavior unchanged.** Confirm/cancel callbacks fire identically; the `busy` prop blocks dismiss; the `destructive` variant drives a danger-colored confirm button; backdrop press calls `onCancel` (unless `busy`); Android hardware-back calls `onCancel` (unless `busy`); the `children` slot renders between body and button row.
- Device QA gates the PR.

---

## The component

**File:** `components/ui/confirm_dialog.tsx` — in-place rewrite. Exports `ConfirmDialog`. Built on HeroUI `Dialog` (Root + Portal + Overlay + Content + Title + Description) plus the existing project `Button` wrapper (`@/components/ui/button`).

### Public API

The existing `ConfirmDialogProps` interface is **preserved verbatim**. No prop additions, removals, or type changes.

```tsx
interface ConfirmDialogProps {
  visible: boolean;         // maps to Dialog isOpen
  title: string;            // maps to Dialog.Title children
  body: string;             // maps to Dialog.Description children
  confirmLabel: string;     // confirm Button label
  cancelLabel: string;      // cancel Button label
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;    // drives variant="danger" on confirm Button
  busy?: boolean;           // isLoading + isDisabled on confirm; isDisabled on cancel; blocks dismiss
  children?: React.ReactNode; // optional slot between body and button row (e.g. warning line)
}
```

`visible` → `isOpen`. The `onOpenChange` callback from HeroUI `Dialog.Root` is wired to call `onCancel` when `!busy`, preserving the existing dismiss-on-backdrop behaviour. When `busy`, `onOpenChange` receives a no-op to block all dismiss paths.

### Rendering & styling contract

```tsx
import Dialog from 'heroui-native'; // import { Dialog } from 'heroui-native'
import { cn } from 'heroui-native';
import { View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

export function ConfirmDialog({
  visible,
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  destructive = false,
  busy = false,
  children,
}: ConfirmDialogProps) {
  const handleOpenChange = (open: boolean) => {
    if (!open && !busy) onCancel();
  };

  return (
    <Dialog isOpen={visible} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay isCloseOnPress={!busy} />
        <Dialog.Content
          isSwipeable={false}
          className="bg-surface border-border w-full rounded-2xl border p-5"
        >
          <Dialog.Title className="text-foreground font-soraBold mb-2 text-xl">
            {title}
          </Dialog.Title>
          <Dialog.Description className="text-muted mb-2 text-[15px] leading-6">
            {body}
          </Dialog.Description>
          {children}
          <View style={{ flexDirection: 'row' }} className="mt-1 gap-2">
            <View style={{ flex: 1 }}>
              <Button
                variant="secondary"
                label={cancelLabel}
                onPress={onCancel}
                isDisabled={busy}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                variant={destructive ? 'danger' : 'primary'}
                label={confirmLabel}
                onPress={onConfirm}
                isLoading={busy}
                isDisabled={busy}
              />
            </View>
          </View>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}
```

Notes:

- `Dialog.Trigger` is **omitted entirely** — `ConfirmDialog` is imperatively controlled via `visible`. HeroUI `Dialog` supports fully controlled mode via `isOpen` + `onOpenChange` without a `Trigger`. The `Dialog.Root` does not require a `Trigger` child.
- `isSwipeable={false}` on `Dialog.Content` disables the drag-to-dismiss gesture. A confirm dialog is a blocking modal — the user must make an explicit choice. Swipe-to-dismiss would bypass `busy` guard and fire no callback.
- `Dialog.Overlay` receives `isCloseOnPress={!busy}`: when `busy` is true, overlay press is ignored (matches current `onRequestClose={busy ? () => {} : onCancel}` on the legacy `Modal`).
- Android hardware-back is handled by the HeroUI `Dialog.Content` primitive's built-in `BackHandler` listener (it calls `onOpenChange(false)`, which routes through `handleOpenChange` → `onCancel` when not busy). The legacy `Modal`'s `onRequestClose` prop is no longer needed.
- `Dialog.Close` sub-component is **omitted** — confirm dialogs do not have a standalone close button; dismiss is via cancel button or backdrop.
- The `Dialog.Title` and `Dialog.Description` sub-components provide `role="heading"` / `aria-labelledby` / `aria-describedby` wiring automatically through HeroUI primitives, which is a **net accessibility improvement** over the legacy `Modal` (which had no aria linking between title and dialog content).
- `className` overrides on `Dialog.Content`: the default HeroUI `Dialog.Content` style is `bg-overlay p-5 rounded-3xl shadow-overlay` (from `dialog.styles.ts`). We override `bg-surface` (card background matches design system surface), `rounded-2xl` (2xl vs default 3xl — matches existing `rounded-2xl` card), and `border border-border` (existing border). The `p-5` padding is identical; omit `shadow-overlay` by not including it (acceptable visual delta — documented in normalization table). Implementation must verify that className overrides on `Dialog.Content` land correctly; if HeroUI's `tv()` base classes resist the surface/radius overrides, use `style={{ backgroundColor: ... }}` for the surface color and retain `className` for border/padding.

### Accepted visual normalization

| Property | Before | After | Perceptibility |
|---|---|---|---|
| Backdrop opacity | `rgba(0,0,0,0.6)` (literal, comment-annotated in original) | HeroUI `Dialog.Overlay` default `bg-backdrop` = `oklch(0% 0 0 / 20%)` ≈ 20% black | **Visible** — the backdrop becomes lighter. Overridden: `Dialog.Overlay` receives explicit `className="bg-overlay"` to restore the `rgba(0,0,0,0.6)` token from `global.css`. This preserves the original 60% opacity scrim exactly. |
| Card background | `bg-surface` (`#1a2535`) | HeroUI default `bg-overlay` (`rgba(0,0,0,0.6)` — wrong for card) | Overridden: explicit `className="bg-surface ..."` on `Dialog.Content` restores the dark-surface card colour. |
| Card corner radius | `rounded-2xl` (16px) | HeroUI default `rounded-3xl` (24px) | Overridden: explicit `className="... rounded-2xl ..."` on `Dialog.Content`. |
| Card shadow | None (original had no shadow) | HeroUI `Surface` base (which `Dialog.Content` builds on) applies `shadow-overlay` — a 1px inset hairline (`0 0 1px rgba(255,255,255,0.2) inset` in dark mode). `className` omission does not neutralize it: `shadow-overlay` is a custom token that `tailwind-merge` cannot conflict-resolve against the base. Explicitly neutralized via `style={{ shadowOpacity: 0, elevation: 0 }}` on `Dialog.Content` (same approach SP-5 cards used for the identical Surface-shadow issue). No-shadow is preserved. |
| Dialog enter/exit animation | `animationType="fade"` via `Modal` | HeroUI `Dialog` uses scale(0.97→1) + opacity(0→1) keyframe (200ms) — a very slight scale-up | Accepted normalization — smoother feel; no functional difference. No sub-pixel text or layout impact. |
| Title text size | `variant="h3"` via `Text` wrapper (maps to `text-xl` / `20px`) | `Dialog.Title` with `className="... text-xl ..."` explicit | Preserved at `text-xl` via explicit className. |
| Body text size | `variant="body"` via `Text` wrapper (maps to `text-[15px] leading-6`) | `Dialog.Description` with explicit `className="... text-[15px] leading-6 ..."` | Preserved exactly. |
| `font-soraBold` title weight | Applied via `Text variant="h3"` | Applied via explicit `className="font-soraBold ..."` on `Dialog.Title` | Preserved. |

The backdrop opacity delta is the only item that would be user-perceptible if not overridden — it is explicitly overridden. All other normalizations are sub-pixel or imperceptible.

---

## Adoption set (grounded against current codebase)

**Direct call-site wrappers that import `ConfirmDialog`** (3 files, zero changes required in SP-2):

| File | Dialog variant | Props used | Notes |
|---|---|---|---|
| `screens/accounts/detail/components/archive_confirmation_dialog.tsx` | destructive | `visible`, `busy`, `destructive`, `title`, `body`, `confirmLabel`, `cancelLabel`, `onConfirm`, `onCancel`, `children` | Uses `children` slot for CC warning line |
| `screens/settings/categories/components/delete_confirmation_dialog.tsx` | destructive | `visible`, `destructive`, `title`, `body`, `confirmLabel`, `cancelLabel`, `onConfirm`, `onCancel` | No `children`, no `busy` |
| `screens/transactions/detail/components/delete_confirm_dialog.tsx` | destructive | `visible`, `busy`, `destructive`, `title`, `body`, `confirmLabel`, `cancelLabel`, `onCancel`, `onConfirm` | No `children` |

**Indirect consumers** (import the wrapper components, not `ConfirmDialog` directly — zero changes required):

| File | Imports |
|---|---|
| `screens/accounts/detail/index.tsx` | `ArchiveConfirmationDialog` |
| `screens/settings/categories/index.tsx` | `DeleteConfirmationDialog` |
| `screens/transactions/detail/index.tsx` | `DeleteConfirmDialog` |

**Total direct `ConfirmDialog` import sites:** 3 wrapper files. **Total files modified in SP-2:** 1 (`components/ui/confirm_dialog.tsx`).

### Explicitly excluded

- `components/ui/confirm_sheet.tsx` — the Sheet-based variant. Different primitive (`Sheet`/`@gorhom/bottom-sheet`), different UX pattern (bottom sheet vs centred modal). SP-2 does not touch it. `ConfirmSheet` and its consumers (`screens/commitments/detail/components/skip_confirm_sheet.tsx`, `screens/commitments/edit_commitment/components/deactivate_sheet.tsx`) are unchanged.
- All three call-site wrapper files (`archive_confirmation_dialog.tsx`, `delete_confirmation_dialog.tsx`, `delete_confirm_dialog.tsx`) — zero changes; they get new internals transparently.

---

## Architecture & data flow

`ConfirmDialog` is **purely presentational with controlled state**: `visible` in, `onConfirm`/`onCancel` out. No store, no effects owned by the wrapper. Open/close state is owned by the parent (hook or state file) and passed as `visible` — identical to today. `Dialog.Root`'s internal `isOpen` is fully controlled by the `isOpen` prop; HeroUI's `useControllableState` in the primitive handles the edge case of switching between controlled and uncontrolled, but we are always controlled.

The only logic inside `ConfirmDialog` is the `handleOpenChange` adapter:

```ts
const handleOpenChange = (open: boolean) => {
  if (!open && !busy) onCancel();
};
```

This maps HeroUI's `onOpenChange(false)` (fired on overlay press, hardware-back, and swipe if enabled) to the existing `onCancel` callback, preserving the contract all call sites depend on. When `busy`, dismiss paths are blocked at two layers: `isCloseOnPress={!busy}` on `Dialog.Overlay` and the no-op guard in `handleOpenChange`.

No state, no effects, no async — the component boundary is as thin as possible.

---

## Error handling

None applicable — no async, no I/O, no user input parsing inside the wrapper. Error handling lives in the parent hook/state that triggers `busy` and calls `onConfirm`/`onCancel`. The `children` slot renders unconditionally if provided (existing behaviour preserved).

---

## Testing

Per the project's **logic-only test policy** (no `.tsx` render tests), a purely presentational wrapper gets **no unit test**. The existing hook/state tests for the three adopting screens (`account.store.ts`, `categories` hook/state, `transactions/detail` hook/state) are unchanged and continue to prove that `onConfirm`/`onCancel` are wired correctly at the behavioural level.

Verification:

1. **CI parity (6 jobs):** format, lint, typecheck, jest (`--ci`), expo-doctor, Android prebuild dry-run. All must be green before push.
2. **Device QA gate (user):** manually verify all three dialog surfaces on device:
   - Archive account dialog (destructive, `busy` spinner, CC warning child, backdrop dismiss blocked during loading).
   - Delete category dialog (destructive, no children, backdrop dismiss works).
   - Delete transaction dialog (destructive, `busy` spinner, backdrop dismiss blocked during loading).
   - Confirm each dialog: title text, body text, button labels are byte-identical to pre-migration.
   - Confirm animation (scale-in fade) feels correct — no jarring flash.
   - Confirm backdrop opacity is visually equivalent to the pre-migration `rgba(0,0,0,0.6)` scrim.
   - Confirm Android hardware-back calls `onCancel` (not `busy`) / is blocked (when `busy`).

---

## Scope & sequencing

One PR: 1 file rewritten (`components/ui/confirm_dialog.tsx`). Branch `feat/wave4-sp2-confirm-dialog`. Starts from `main` concurrently with SP-3-wrapper, SP-4-wrapper, and SP-5-non-contested in Batch 1. No file overlap with any other SP in Batch 1.

---

## HeroUI `Dialog` gotchas found during spec research

**1. Backdrop token mismatch (high risk — mitigated).**
HeroUI `Dialog.Overlay` defaults to `bg-backdrop` = `oklch(0% 0 0 / 20%)` (20% black from HeroUI's own `variables.css`). The existing scrim is `rgba(0,0,0,0.6)` (60% black). Without override the backdrop becomes visually much lighter — the dialog card will appear to float on a near-transparent scrim. Fix: `className="bg-overlay"` on `Dialog.Overlay` (the `--overlay` token in `global.css` is `rgba(0,0,0,0.6)` — exact match). This must be verified at device QA.

**2. `Dialog.Content` default card style is wrong for our design.**
HeroUI defaults: `bg-overlay p-5 rounded-3xl shadow-overlay`. `bg-overlay` would make the card the same colour as the scrim (transparent dark), `rounded-3xl` is larger than our `rounded-2xl` card. Both are overridden via explicit `className` on `Dialog.Content`. If `tv()` base classes resist the bg/radius override (same issue class SP-1 noted for `Chip`), the fallback is `style={{ backgroundColor: Colors.dark.surface, borderRadius: Radius.card }}` for those two properties, retaining `className` for border/padding/gap.

**3. `isSwipeable` default is `true`.**
`Dialog.Content` ships with `isSwipeable={true}` — swipe-down dismisses the dialog by calling `onOpenChange(false)`. For a confirm dialog this is a problem: a `destructive` action could be accidentally skipped. Mitigated by setting `isSwipeable={false}`. This must be explicit in the implementation; forgetting it would be a silent behavioural regression (no error, just wrong UX).

**4. No `Dialog.Trigger` required.**
`Dialog` fully supports controlled mode (`isOpen` prop only, no `Trigger` child). `Dialog.Root` renders as a plain `View` in the tree wrapping `Portal`; without a `Trigger`, the `View` has no visible dimensions. Since `Portal` lifts content out via `PortalPrimitive`, the zero-dimension root `View` is harmless. Verified in primitive source: `DialogContext.Provider` + `Component ref={ref} {...viewProps}` where `viewProps` is `{}` when only `isOpen`/`onOpenChange` are passed.

**5. `Dialog.Portal` uses `FullWindowOverlay` on iOS.**
HeroUI wraps the portal in `FullWindowOverlay` (react-native-screens) on iOS for proper z-stacking above native navigation elements. The existing `Modal` with `statusBarTranslucent` achieves similar z-order. Functionally equivalent. Development note: enable `disableFullWindowOverlay={true}` on `Dialog.Portal` if using the React Native element inspector during implementation — it is a dev-only tradeoff with no prod impact.

---

## Open questions

None blocking spec sign-off. The gotchas above are all resolved at the design level. The `tv()` className override question (Gotcha 2) is an implementation-time verification step, not a design choice.

---

## Out of scope

- `components/ui/confirm_sheet.tsx` and its consumers (separate primitive, unchanged).
- Any new Dialog usage beyond the existing `ConfirmDialog` call sites.
- Token-source migration (`theme.ts` vs `theme_tokens.ts`) — dropped at the Wave 4 level (see SP-1 Context).
- Tabs/Chip/Card/ListGroup/Button/Accordion migrations (SP-1, SP-3–SP-5).
