# Wave 4 Parallelization and Sequencing Plan

**Date:** 2026-05-25
**Author:** @sarah (orchestration)
**Status:** Approved — ready to dispatch
**Parent effort:** Wave 4 (Full HeroUI Native migration), Approach C (wrappers-first, risk-tiered)

---

## 1. Confirmed File Footprints (grounded against codebase)

### SP-2 — ConfirmDialog → HeroUI Dialog

**Files to modify (existing):**
- `components/ui/confirm_dialog.tsx` — the 1 file to rewrite (currently uses `Modal` + custom `Box`/`Button`/`Text` layout)

**Downstream consumers (will NOT change in SP-2 — they import `ConfirmDialog` and get the new internals transparently):**
- `screens/accounts/detail/components/archive_confirmation_dialog.tsx`
- `screens/settings/categories/components/delete_confirmation_dialog.tsx`
- `screens/transactions/detail/components/delete_confirm_dialog.tsx`
- `screens/transactions/detail/index.tsx` (imports `DeleteConfirmDialog` indirectly)

**Note:** `components/ui/confirm_sheet.tsx` also exists (Sheet-based variant). It is a separate primitive that SP-2 does not touch. The `ConfirmDialog` wrapper props API stays byte-compatible so no consumer changes are required.

**New files created:** 0 (in-place rewrite of `confirm_dialog.tsx`)

### SP-3 — Button consolidation + ListGroup rows + trivial Cards

**Wrapper status:** `components/ui/button.tsx` already wraps HeroUI `Button` — it is the canonical wrapper. SP-3's Button task is audit and cleanup (remove any direct `heroui-native` Button imports in screens), not a new wrapper.

**Screens importing `@/components/ui/button` (potential edit sites):**
- `screens/accounts/add_account/index.tsx`
- `screens/accounts/detail/components/adjust_balance_sheet.tsx`
- `screens/commitments/detail/components/current_cycle_card.tsx`
- `screens/onboarding/add_account/index.tsx`
- `screens/onboarding/more_accounts/index.tsx`
- `screens/onboarding/ready/index.tsx`
- `screens/onboarding/welcome/index.tsx`
- `screens/settings/categories/index.tsx`
- `screens/settings/currency/index.tsx`
- `screens/transactions/components/date_range_sheet.tsx`
- `screens/transactions/detail/components/action_row.tsx`
- `screens/transactions/filter/index.tsx`

**Screen importing raw `heroui-native` Button directly (non-canonical):**
- `screens/transactions/transaction_form/components/no_accounts_empty.tsx` — uses `import { Button } from 'heroui-native'` directly; this is the one bespoke Button site to consolidate.

**ListGroup status:** `screens/settings/index.tsx` already uses HeroUI Native `ListGroup` directly. No custom wrapper exists. SP-3 decides: add a `components/ui/list_group.tsx` wrapper or treat it as already adopted. Either way, `screens/settings/index.tsx` is the only file.

**Trivial Card sites** (plain container usage — not complex dashboard cards):
- `screens/commitments/components/summary_header.tsx` — uses `Card` from `heroui-native` (already adopted)
- `screens/commitments/detail/components/current_cycle_card.tsx` — uses `Card` from `heroui-native` (already adopted, plus `Button`)
- `screens/commitments/detail/components/payment_history.tsx` — uses `Card` from `heroui-native` (already adopted)
- `screens/transactions/detail/components/detail_rows_card.tsx` — custom `View`-based container card (not HeroUI)
- `screens/transactions/detail/components/note_card.tsx` — custom `View`-based container card
- `screens/transactions/detail/components/transfer_flow_card.tsx` — custom `View`-based container card

**SP-3 Card scope (trivial):** the three `transactions/detail/` container cards are candidates if they fit a HeroUI `Card` substrate. The commitments cards already use HeroUI `Card`.

**New files created:** possibly `components/ui/list_group.tsx` (wrapper, if Tariq decides to wrap rather than use directly)

### SP-4 — Tabs wrapper + adoption (segmented controls)

**New wrapper to create:**
- `components/ui/tabs.tsx` — wraps HeroUI Native `Tabs` (parallel to `chip.tsx`, `button.tsx` pattern)

**Existing segmented-control surfaces to migrate (current implementation uses `Pressable` row):**

| File | Control | Current impl |
|---|---|---|
| `screens/transactions/filter/components/amount_accordion.tsx` | EGP/USD currency toggle | Custom `Pressable` row with `flex-1`, `rounded-md`, `bg-default/40` when selected |
| `screens/accounts/add_account/index.tsx` | EGP/USD currency picker | Custom `Pressable` row with `rounded-[10px]`, `border-gold-600`, `bg-[rgba...]` when selected |
| `screens/settings/categories/index.tsx` | Expense/Income tab switcher | Custom `Pressable` row with `backgroundColor: Colors.dark.surfaceEl`, solid-gold `backgroundColor: Colors.shared.cairoGold` when active |
| `screens/commitments/components/month_navigator.tsx` | Prev/Next month carousel | `Pressable` chevrons + `Text` label — distinct pattern, not a segmented control |
| `screens/transactions/transaction_form/components/type_tabs.tsx` | Expense/Income/Transfer/CCPayment tabs | Custom `Pressable` row with bottom-border indicator — bespoke Material tabs pattern |
| `screens/dashboard/index.tsx` | Overview/Accounts segment switcher | **Already uses HeroUI Native `Tabs` directly** — already adopted |

**Key findings:**
- Dashboard already uses HeroUI `Tabs` directly. SP-4 does not touch `screens/dashboard/index.tsx`.
- `month_navigator.tsx` is a prev/next navigator, NOT a segmented control. SP-4's brief says "month carousel" — but reading the code, it is two `Pressable` chevrons flanking a label. Whether this becomes a `Tabs` is a product question for @marcus; it is NOT a trivially obvious Tabs adoption. Flagged as ambiguous — see Critical Triggers section.
- `type_tabs.tsx` uses a bespoke Material-tabs indicator pattern (bottom border, colored per type). HeroUI `Tabs` has a different indicator. Migrating risks visual regression on the most prominent screen in the app (add transaction). Flagged as ambiguous.
- The three clear Tabs adoption targets: `amount_accordion.tsx` (EGP/USD toggle), `add_account/index.tsx` (currency picker), `settings/categories/index.tsx` (Expense/Income switcher).

**SP-4 files confirmed:**
- **Create:** `components/ui/tabs.tsx`
- **Modify:** `screens/transactions/filter/components/amount_accordion.tsx`
- **Modify:** `screens/accounts/add_account/index.tsx`
- **Modify:** `screens/settings/categories/index.tsx`
- **Deferred / needs spec clarification:** `screens/commitments/components/month_navigator.tsx`, `screens/transactions/transaction_form/components/type_tabs.tsx`

### SP-5 — Filter Accordions + dashboard heavy Cards

**Filter accordion files (accordion shell conversion):**
- `screens/transactions/filter/components/account_accordion.tsx`
- `screens/transactions/filter/components/category_accordion.tsx`
- `screens/transactions/filter/components/amount_accordion.tsx`

**Dashboard heavy Card files:**
- `screens/dashboard/components/hero_card.tsx` — complex `Pressable` + `LinearGradient` + `GridTexture` SVG card; not a simple HeroUI `Card` substrate
- `screens/dashboard/components/commitments_card.tsx` — `Pressable` + `LinearGradient` progress bar; complex
- `screens/dashboard/components/account_card.tsx` — `Pressable` with dynamic color accent bar + multiple `View` layers; complex
- `screens/dashboard/components/add_card.tsx` — simpler `Pressable` card

**Note:** The three dashboard cards currently use raw `Pressable` + `View` (not HeroUI `Card`). SP-5 may add a HeroUI `Card` substrate underneath, or may only standardize tokens/styling. The actual scope must be specified in the SP-5 design doc.

---

## 2. File-Level Contention Matrix

| Pair | Shared existing file | Type | Verdict |
|---|---|---|---|
| **SP-4 ∩ SP-5** | `screens/transactions/filter/components/amount_accordion.tsx` | True git conflict | CONFIRMED COLLISION — SP-4 swaps the EGP/USD toggle to `Tabs`; SP-5 converts the accordion shell to HeroUI `Accordion`. Both edits touch the same ~127-line file simultaneously. |
| **SP-4 ∩ SP-5** | `screens/transactions/filter/components/account_accordion.tsx` | True git conflict | PARTIAL — SP-5 converts the accordion shell; SP-4 does not touch this file (no segmented control here). No conflict on this file. |
| **SP-4 ∩ SP-5** | `screens/transactions/filter/components/category_accordion.tsx` | True git conflict | PARTIAL — same as account_accordion: SP-5 only, no SP-4 edit. No conflict. |
| **SP-3 ∩ SP-5** | Dashboard card files | Scope boundary | **REFUTED as a file conflict.** SP-3 targets trivial cards (the three `transactions/detail/` containers and `no_accounts_empty.tsx` Button). SP-5 targets the heavy dashboard cards (`hero_card.tsx`, `commitments_card.tsx`, `account_card.tsx`, `add_card.tsx`). These file sets are disjoint. Zero git conflict. |
| **SP-2 ∩ SP-3** | `components/ui/button.tsx` | Coordination only, no conflict | SP-2 rewrites `confirm_dialog.tsx` which internally uses `Button`. SP-3 audits Button adoption. SP-2 does not change `button.tsx` — it uses it. SP-3 may change `button.tsx` (cleanup) or just clean call sites. If SP-3 changes `button.tsx`'s API, SP-2's internal usage could conflict. In practice: SP-3 is adoption cleanup, not API change. **Low risk, coordination only.** |
| **SP-2 ∩ SP-3** | `components/ui/confirm_dialog.tsx` | True git conflict | SP-2 rewrites this file. SP-3 does not touch it. **No conflict.** |
| **SP-3 ∩ SP-4** | `screens/settings/categories/index.tsx` | True git conflict | SP-3 may clean up `Button` usage here. SP-4 migrates the Expense/Income segmented control here. Both touch the same file. **REAL COLLISION — moderate.** |
| **SP-3 ∩ SP-4** | `screens/accounts/add_account/index.tsx` | True git conflict | SP-3 audits Button; add_account already uses `@/components/ui/button` (canonical). SP-4 migrates the currency `Pressable` row. Both touch the same file. SP-3 may be a no-op here if Button is already canonical. **Low risk if SP-3 is no-op; real collision if SP-3 edits this file.** |
| **SP-3 ∩ SP-4** | `screens/transactions/filter/index.tsx` | True git conflict | SP-3 may touch Button in filter sheet footer. SP-4 is not touching `filter/index.tsx` (only `amount_accordion.tsx`). **No conflict unless SP-3 edits filter/index.tsx.** |

### Summary of confirmed hard collisions

1. **SP-4 ∩ SP-5 on `amount_accordion.tsx`** — CONFIRMED. One file, two simultaneous structural edits.
2. **SP-3 ∩ SP-4 on `screens/settings/categories/index.tsx`** — REAL but moderate. Both edit the same screen.
3. **SP-3 ∩ SP-4 on `screens/accounts/add_account/index.tsx`** — CONDITIONAL on whether SP-3 has edits there (likely no-op since Button is already canonical).

### Original hypothesis: SP-3 ∩ SP-5 Cards conflict
**REFUTED.** File domains are cleanly disjoint: SP-3 trivial cards are `transactions/detail/` containers; SP-5 heavy cards are `dashboard/components/`. Zero overlap.

---

## 3. Wrapper-Creation vs. Adoption-Sweep Phase Split

| SP | Wrapper phase (new files, low conflict) | Adoption sweep phase (edits existing screens, high conflict) |
|---|---|---|
| SP-2 | None (in-place rewrite of `confirm_dialog.tsx`) | `confirm_dialog.tsx` itself (1 file, isolated) |
| SP-3 | Possibly `components/ui/list_group.tsx` (if wrapping) | `no_accounts_empty.tsx` (Button direct import fix); optionally `detail_rows_card.tsx`, `note_card.tsx`, `transfer_flow_card.tsx` |
| SP-4 | `components/ui/tabs.tsx` (new wrapper — no conflicts) | `amount_accordion.tsx`, `add_account/index.tsx`, `settings/categories/index.tsx` |
| SP-5 | None (accordion shell + card rework are in-place edits) | `account_accordion.tsx`, `category_accordion.tsx`, `amount_accordion.tsx`, dashboard card files |

**Phases that are genuinely independent:**
- SP-4 wrapper creation (`components/ui/tabs.tsx`) can run concurrently with SP-2, SP-3, and SP-5 wrapper phases — it creates a new file that no other SP touches.
- SP-2 (entire SP) is isolated to `confirm_dialog.tsx` and its own consumers. No other SP edits these files.
- SP-3 wrapper phase (`list_group.tsx`) is independent of all other SPs.

**Phases that must serialize:**
- SP-4 adoption sweep on `amount_accordion.tsx` must complete and merge before SP-5 can start its accordion shell conversion of the same file — or they must be combined into one PR.
- SP-3 and SP-4 adoption sweeps that both touch `settings/categories/index.tsx` cannot run concurrently on the same branch.

---

## 4. Batched Dispatch Plan

### Batch 1 — Launch concurrently (4 streams)

All four streams start from the same `main` base (or the most recent merged SP). No file overlaps between streams in this batch.

| Stream | Branch | Files created | Files modified |
|---|---|---|---|
| **SP-2** | `feat/wave4-sp2-confirm-dialog` | 0 | `components/ui/confirm_dialog.tsx` |
| **SP-3-wrapper** | `feat/wave4-sp3-button-listgroup-cards` | possibly `components/ui/list_group.tsx` | `screens/transactions/transaction_form/components/no_accounts_empty.tsx`; optionally `screens/transactions/detail/` card containers |
| **SP-4-wrapper** | `feat/wave4-sp4-tabs-wrapper` | `components/ui/tabs.tsx` | none (wrapper only, no adoption) |
| **SP-5-non-contested** | `feat/wave4-sp5-accordions-dashcards` | 0 | `screens/transactions/filter/components/account_accordion.tsx`, `screens/transactions/filter/components/category_accordion.tsx`, dashboard card files (`hero_card.tsx`, `commitments_card.tsx`, `account_card.tsx`, `add_card.tsx`) |

**What SP-5-non-contested explicitly excludes:** `amount_accordion.tsx` (contested with SP-4). It finishes all other accordion and card work, then waits for SP-4's adoption sweep to merge before adding `amount_accordion.tsx`.

**Device QA gates:** SP-2 and SP-3 each require their own device QA before next batch. SP-4-wrapper has no visual change and may not need device QA (CI-only). SP-5-non-contested needs device QA for the filter sheet and dashboard cards.

### Batch 2 — SP-4 adoption sweep (after SP-4-wrapper PR merges)

Start from `main` after SP-4-wrapper merges into it.

| Stream | Branch | Files modified |
|---|---|---|
| **SP-4-adoption** | `feat/wave4-sp4-tabs-adoption` | `screens/accounts/add_account/index.tsx` (currency picker), `screens/settings/categories/index.tsx` (Expense/Income switcher), `screens/transactions/filter/components/amount_accordion.tsx` (EGP/USD toggle) |

**Why `amount_accordion.tsx` is placed here:** SP-4's adoption sweep on this file must complete and merge before SP-5 can touch the accordion shell. Putting both edits of `amount_accordion.tsx` into SP-4-adoption is cleaner than splitting them across two PRs.

**Device QA gate:** SP-4-adoption requires device QA (three screens changed visually).

### Batch 3 — SP-5 contested file (after SP-4-adoption PR merges)

| Stream | Branch | Files modified |
|---|---|---|
| **SP-5-contested** | `feat/wave4-sp5-amount-accordion-shell` | `screens/transactions/filter/components/amount_accordion.tsx` (accordion shell migration, building on SP-4's merged EGP/USD toggle) |

This is a minimal cherry-pick PR: SP-5-non-contested has already handled the other two filter accordions, so only `amount_accordion.tsx`'s shell remains. If SP-5-non-contested is not yet merged when SP-4-adoption merges, SP-5 can combine the contested file into its main PR by rebasing onto the SP-4-adoption merge.

**Device QA gate:** Combined with SP-5-non-contested gate if sequenced correctly; otherwise its own gate.

### Device QA serialization note

Device QA is a **serial, user-only gate** (CLAUDE.md critical trigger §8). Every PR that produces a visible change on device must pause and receive a user QA verdict before any dependent SP starts implementation. The sequencing above means at most two concurrent QA sessions can happen simultaneously (SP-2 and SP-3 in Batch 1) — both are visually isolated from each other, so regression attribution is unambiguous.

**Recommended QA order in Batch 1:**
1. SP-2 (modal dialogs) — low risk, single primitive
2. SP-3 (button + list rows + trivial cards) — moderate coverage
3. SP-5-non-contested (filter accordions + dashboard cards) — high visual coverage; run last in batch so SP-4-adoption cannot start until this clears

---

## 5. Recommendation

### Parallelize by disjoint file domain (recommended)

**Do not** dispatch all four SPs as fully independent agents. The file contention analysis shows three real collision points. The correct decomposition is:

**Use domain-disjoint streams, not SP-aligned streams.**

Specifically:
- Run SP-2 and SP-3 concurrently (disjoint file domains confirmed).
- Run SP-4-wrapper concurrently with SP-2 and SP-3 (new file only, zero conflicts).
- Run SP-5-non-contested concurrently with SP-2, SP-3, SP-4-wrapper (non-contested files only).
- Serialize SP-4-adoption after SP-4-wrapper merges.
- Serialize SP-5-contested after SP-4-adoption merges.

This gives **4 concurrent streams in Batch 1**, collapsing to **1 stream per batch** thereafter for the contested `amount_accordion.tsx` file.

**Why not parallelize SP-4-adoption and SP-5 fully?**

The `dispatching-parallel-agents` test requires independent problem domains with no shared state. SP-4-adoption and the SP-5 `amount_accordion.tsx` edit fail this test — they edit the same 127-line file with incompatible structural intents (swap inner control vs. convert outer shell). Attempting to run them concurrently produces a 3-way merge conflict with no clean resolution strategy.

**Why not just merge SP-4 and SP-5 into one PR?**

Two reasons. First, device QA attribution: combining SP-4 (segmented controls) and SP-5 (accordion shells + dashboard cards) into one PR makes it impossible to attribute a device regression to one change. Second, PR blast radius: the combined set touches every visual surface in the transactions filter sheet plus the entire dashboard. Tariq would not approve it (high blast radius, CLAUDE.md critical trigger §3).

**Maximum safe concurrent streams: 4 (Batch 1 only). Subsequent batches are serial.**

---

## 6. Critical Triggers to Escalate

Two items from the SP-4 footprint analysis require user decision before the SP-4 design doc is written:

**CT-1 (Product direction — Marcus domain):** `screens/commitments/components/month_navigator.tsx` is a prev/next chevron navigator, not a segmented control. The original SP-4 brief says "month carousel." Should this become HeroUI `Tabs`, stay as-is, or become a different pattern? This is a product direction question that Marcus must answer in the SP-4 spec.

**CT-2 (Visual regression risk — Tariq domain):** `screens/transactions/transaction_form/components/type_tabs.tsx` uses a bespoke Material-tabs indicator (colored bottom border per transaction type). HeroUI `Tabs` uses a different indicator. Migrating this surface risks a visible regression on the most-used screen in the app. Tariq must decide in the SP-4 spec whether to include this, exclude it, or defer to a separate SP.

Both items block the SP-4 spec sign-off. Neither blocks Batch 1 execution (SP-2, SP-3, SP-4-wrapper, SP-5-non-contested can start now without resolving these).

---

## 7. Branch and Worktree Reference

| Stream | Branch name | Worktree path (suggested) |
|---|---|---|
| SP-2 | `feat/wave4-sp2-confirm-dialog` | `.claude/worktrees/wave4-sp2` |
| SP-3 | `feat/wave4-sp3-button-listgroup-cards` | `.claude/worktrees/wave4-sp3` |
| SP-4-wrapper | `feat/wave4-sp4-tabs-wrapper` | `.claude/worktrees/wave4-sp4-wrapper` |
| SP-5-non-contested | `feat/wave4-sp5-accordions-dashcards` | `.claude/worktrees/wave4-sp5` |
| SP-4-adoption (Batch 2) | `feat/wave4-sp4-tabs-adoption` | reuse wave4-sp4-wrapper worktree after merge |
| SP-5-contested (Batch 3) | `feat/wave4-sp5-amount-accordion-shell` | reuse wave4-sp5 worktree after SP-5-non-contested merges |

All branches cut from `main` at the time of dispatch. SP-4-adoption and SP-5-contested cut from `main` after their predecessor merges.
