# Section 5 · Dashboard — Design Spec

**Date:** 2026-05-16
**Status:** Draft — awaiting plan approval
**Owners:** [tariq] technical · [marcus] UX · [layla] financial · [sarah] sequencing
**Section:** 5 of 9 (Dashboard) within the HeroUI Native migration initiative
**Branch:** `feat/section-5-dashboard`

**Cross-references:**
- §1 Foundation spec: `docs/superpowers/specs/2026-05-10-section-1-foundation-design.md`
- §3 Reusable Patterns spec: `docs/superpowers/specs/2026-05-12-section-3-reusable-patterns-design.md`
- §4 Settings spec: `docs/superpowers/specs/2026-05-12-section-4-settings-design.md`

---

## 1. Feature Summary

§5 migrates the entire Dashboard domain to HeroUI Native v1.0 + Unistyles 3 (via Uniwind) and Cairo Nights tokens, introduces a **2-segment IA** (Overview · Accounts) inside the Dashboard tab, redesigns the Net Worth Breakdown sheet around [layla]'s liquidity-tier framing, and retires the last legacy `react-native-actions-sheet` consumer in this domain (`net_worth_breakdown_sheet.tsx`).

**What ships in §5:**

1. **2-segment IA.** New `SegmentSwitcher` between the header and the segment body. Overview is the default and resets on tab focus.
2. **Overview segment.** Re-skinned `HeroCard` · `StatCards` (Net Worth + Spent this Month) · `CommitmentsCard`. Same data, same behaviour. HeroCard tap still opens the breakdown sheet.
3. **Accounts segment.** New `TotalBalanceStrip` at the top, followed by per-type `AccountCarousel`s grouped by `AccountType` in the established order (Bank · SmartWallet · PhysicalWallet · PhysicalSavings · CreditCard). Each visible carousel ends with the existing `AddCard`. Empty type sections are hidden.
4. **Net Worth Breakdown sheet — REDESIGN.** Replaces the legacy sheet. Built on §3's `Sheet` primitive at `size="lg"`. New layout: Net Worth headline (EGP + USD) · Assets section with Liquid/Reserve split bar + legend · Liabilities section with per-card itemisation.
5. **Liquid/Reserve computation.** New helper `computeLiquidityBreakdown(accounts, rate)` — Liquid = Bank + SmartWallet + PhysicalWallet · Reserve = PhysicalSavings.
6. **Per-card liabilities helper.** New `computeLiabilitiesBreakdown(accounts, rate)` returning `{name, balanceEgp}[]` for CreditCard accounts.
7. **`newDashboard` flag retirement.** §1 added `newDashboard: false` in feature flags; §5 ships the new dashboard behind this flag, then flips it on and removes the flag plus the legacy branch at end of §5.
8. **Legacy `react-native-actions-sheet` consumer removal.** Old `net_worth_breakdown_sheet.tsx` is replaced (not migrated) with the redesigned `Sheet`-based version. The legacy dep stays in the project until §9 retires the last consumers.

**FAB (out of scope for §5 — implementation note):** §3 already built the global `FAB` and wired it into `app/(app)/(tabs)/_layout.tsx` with tap = Add Transaction and long-press = mini-menu (Add Transaction · Add Account · Add Commitment). The FAB primitive's own contract states *"Ownership: consumed by app/(app)/(tabs)/_layout.tsx only. Screens do not mount or control the FAB."* §5 therefore makes **no FAB changes**. The Dashboard tab inherits the existing FAB from the tab layout unchanged.

**What does NOT ship in §5 (explicit out-of-scope):**
- Net-worth trend / sparkline (requires historical snapshots — new persistence, parked for post-§9).
- FAB long-press mini-menu (deferred; §3 primitive supports it, §5 simply doesn't wire `onLongPress`).
- Add Account dual entry (sheet variant from Dashboard) — owned by §9.
- Account Detail screen changes — owned by §9.
- Recent-transactions strip on Overview.
- Configurable default segment in Settings.
- Multi-currency rollup inside the breakdown sheet (dormant — DB stores EGP and USD as opaque currencies; structure is forward-compatible but no extra UI today).

---

## 2. Deviations from §1 Foundation

§1 prescribed a single-scroll Dashboard with hero + stats + commitments + carousels stacked vertically.

§5 deviates explicitly on one point:

| §1 prescription | §5 actual | Rationale (recorded for audit) |
|---|---|---|
| Single-scroll layout | 2-segment IA (Overview / Accounts) | Direction from human — Accounts deserve a first-class surface, not a buried bottom half. §1 already acknowledged "sequence may be reordered post-§1" and §5 extends that latitude to per-section IA refinements. |

No other §1 commitments are altered. The §1 FAB prescription (tap = Add Tx, long-press = mini-menu) is unaffected — §3 implemented it in the tab layout and §5 does not touch the FAB (see §1.8 above).

---

## 3. Information Architecture

### 3.1 Screen anatomy

```
DashboardScreenV2  (screens/dashboard_v2/index.tsx)
│
├── <Screen>                                         (full-screen wrapper, edges = ['top'])
│   ├── Header (sticky, in-flow)
│   │   ├── Wordmark "MoneyApp"
│   │   └── Settings cog  → router.push('/settings')
│   │
│   ├── SegmentSwitcher (sticky, in-flow)            ← NEW
│   │   ├── "Overview"   (segment === 'overview')
│   │   └── "Accounts"   (segment === 'accounts')
│   │
│   ├── <ScreenScroll>                               (vertical scroll with RefreshControl)
│   │   │
│   │   ├── Overview segment   (rendered when segment === 'overview')
│   │   │   ├── HeroCard          (tappable → setBreakdownVisible(true))
│   │   │   ├── StatCards         (Net Worth + Spent this Month)
│   │   │   └── CommitmentsCard
│   │   │
│   │   └── Accounts segment   (rendered when segment === 'accounts')
│   │       ├── TotalBalanceStrip                  ← NEW
│   │       └── For each AccountType in TYPE_ORDER with ≥1 account:
│   │           ├── SectionHeader (with count chip)
│   │           └── AccountCarousel  (cards + AddCard)
│   │
│   └── NetWorthBreakdownSheet (overlay, Sheet primitive — see §6)
│
└── (Global FAB — rendered by app/(app)/(tabs)/_layout.tsx, outside this screen)
```

Route file `app/(app)/(tabs)/dashboard/index.tsx` is a flag-branch component (same pattern as §2):

```tsx
import { FeatureFlags } from '@/constants/feature_flags';
import DashboardScreenV1 from '@/screens/dashboard';
import DashboardScreenV2 from '@/screens/dashboard_v2';

export default function DashboardRoute() {
  return FeatureFlags.newDashboard ? <DashboardScreenV2 /> : <DashboardScreenV1 />;
}
```

### 3.2 Empty state

When `accountState.accounts.length === 0`:

- `SegmentSwitcher` is **not rendered**.
- The body is the existing `<EmptyState variant="accounts" onAction={goToAddAccount} actionLabel={Strings.emptyAccountsCta} />`, full-screen, centred.
- The breakdown sheet is unreachable (no HeroCard).
- The global FAB remains visible — it is owned by the tab layout and not affected by Dashboard's empty state. Tapping it routes to the Add Transaction form, which has its own no-accounts guard (out of §5 scope; lives in §7).

Once at least one account exists, the full segmented layout appears immediately on next render. No animation, no flag transition.

### 3.3 Segment behaviour

- **Default segment** on first paint: `'overview'`.
- **Tab-focus reset:** `useFocusEffect` resets segment to `'overview'` whenever the Dashboard tab gains focus. Reasoning: Dashboard is the home tab; users typically open the app to glance at Overview, not to drill into Accounts. Resetting prevents stale state from a previous session.
- **Segment swap animation:** Cross-fade only (Reanimated `Animated.View` with `FadeIn.duration(200)` / `FadeOut.duration(150)`). No horizontal slide — slide would conflict with the horizontal scroll gesture of the Accounts segment's `AccountCarousel` rows.
- **Refresh control:** Pull-to-refresh in the segment body works in both segments and triggers the same `refresh()` handler (reload accounts → cascade-reload stats and spend).

### 3.4 Header persistence

The header is persistent across segments. It is a sibling of the scroll view, not a child, so the scroll body can change without re-mounting it. The settings cog is unchanged from today (boxy back-button style, `Size.iconBack` token, `Spacing.sm` corners).

The global FAB is owned by `app/(app)/(tabs)/_layout.tsx` (built in §3); it is not part of `DashboardScreenV2`.

---

## 4. Product & UX ([marcus])

### 4.1 Overview segment — visual

Identical content and layout to today's dashboard minus the account carousels. All three cards are re-skinned to HeroUI Native primitives (`Card`, `Text`, `Chip`) consuming Cairo Nights tokens. Animations preserved.

| Element | Source | Visual change |
|---|---|---|
| `HeroCard` | `screens/dashboard/components/hero_card.tsx` | Linear gradient (`heroGrad1/2/3`), grid texture, gold glow — preserved. Title "Available to Spend" + amount in EGP gold + chips (USD ≈ · rate · accounts) — preserved. Tap → breakdown sheet — preserved. Manual-override badge — preserved. |
| `StatCards` | `stat_cards.tsx` | 2-up row. Card 1 Net Worth: scale-balance icon · EGP value · split bar (assets vs liabilities) · legend row with counts and EGP values. Card 2 Spent: cash-minus icon · short month label · EGP + USD values · delta chip (trending up = bad, trending down = good) · tx count. Preserved. |
| `CommitmentsCard` | `commitments_card.tsx` | Calendar-check icon · "Commitments" title · month label · totals-per-currency line · progress badge (paid/total %) · gradient progress bar · 5-stat row (paid · overdue · due · upcoming · skipped). Preserved. |

**Tap targets, all preserved:**
- HeroCard → `setBreakdownVisible(true)` (opens the redesigned sheet).
- CommitmentsCard → `router.push('/(app)/(tabs)/commitments')`.

### 4.2 Accounts segment — visual

```
┌─────────────────────────────────────────────┐
│  Total balance              Accounts         │
│  38,420 EGP                 4                │  ← TotalBalanceStrip (new)
└─────────────────────────────────────────────┘

BANK ACCOUNTS · 2
┌────────────┐ ┌────────────┐ ┌────┐
│ CIB Acct   │ │ QNB Saving │ │  + │
│ 28,100 EGP │ │  5,200 EGP │ │    │
│ −1,200 May │ │   +800 May │ │    │
└────────────┘ └────────────┘ └────┘

SMART WALLETS · 1
┌────────────┐ ┌────┐
│ Vodafone   │ │  + │
│ 12,000 EGP │ │    │
└────────────┘ └────┘

… (PhysicalWallet, PhysicalSavings, CreditCard sections follow if non-empty)
```

#### `TotalBalanceStrip` (new)

Compact card. Linear gradient (`heroGrad1` → `heroGrad2`). Two-column layout:

- **Left column:** `Strings.dashboardTotalBalance` label (small, uppercase, `text2`) + sum of `assets` (formatted EGP, large, gold). Sum is `netWorth.assetsEgp` from `computeNetWorth` — i.e. excludes credit-card debt. Wording deliberately mirrors the HeroCard's "Available to Spend" framing.
- **Right column:** `Strings.dashboardAccountsLabel` label + count of non-archived accounts (small, `text1`).

Not tappable. Single-line content only.

#### Per-type carousel sections

Same `AccountCarousel` and `AccountCard` components as today, re-skinned. `SectionHeader` shows the type name in uppercase plus a count chip on the right (e.g. "BANK ACCOUNTS · 2"). Order is the existing `TYPE_ORDER` constant: `Bank → SmartWallet → PhysicalWallet → PhysicalSavings → CreditCard`. Sections with zero accounts are not rendered.

#### `AccountCard` behaviour

Tap → `router.push('/accounts/${id}')`. Visual content preserved: account name (`text1`), balance in account currency (gold), Month In/Out stats below from `statsMap[account.id]`. Credit cards render the balance in `negative` colour.

#### `AddCard`

Trailing card in every carousel. Dashed border, `+` glyph centered. Tap → `router.push('/accounts/add_account')`. (The §9 sheet variant is out of scope here.)

### 4.3 Net Worth Breakdown sheet — REDESIGN

Sheet primitive: §3 `Sheet`, `size="lg"` (92% snap), title `Strings.dashboardBreakdownTitle` ("Net Worth"), close button on right.

```
┌─────────────────────────── ── ─┐
│ Net Worth                    ✕ │
├────────────────────────────────┤
│                                │
│  NET WORTH                     │
│  38,420  EGP                   │
│  ≈ 786 USD                     │
│                                │
│  ── ── ── ── ── ── ── ── ── ── │
│                                │
│  ASSETS · 42,500 EGP · 4 accts │
│  ▓▓▓▓▓▓▓▓▓▓▓░░░░░  (split bar) │
│  ● Liquid    32,500   (3)      │
│  ● Reserve   10,000   (1)      │
│                                │
│  ── ── ── ── ── ── ── ── ── ── │
│                                │
│  LIABILITIES · 4,080 EGP · 1   │
│  Visa Credit          −4,080   │
│  ─────────                     │
│  Total debt            4,080   │
│                                │
└────────────────────────────────┘
```

**Sections rendered in order:**

1. **Net Worth section.** Label (uppercase, `text2`) · large EGP value (`soraBold`, gold) · USD line (`≈ {value} USD`).
2. **Divider.**
3. **Assets section.** Header line — `ASSETS · {assetsEgp} EGP · {assetsCount} accts`. Stacked liquidity bar (two segments, Liquid colour: `info` token; Reserve colour: `gold`). Legend rows — Liquid + Reserve with dot · label · count · EGP value. Each row also shows the contributing account types as a small caption (Liquid: "Bank, Smart Wallet, Cash" filtered to non-zero types · Reserve: "Savings").
4. **Divider.**
5. **Liabilities section.** Header line — `LIABILITIES · {liabilitiesEgp} EGP · {liabilitiesCount} {card|cards}`. One row per credit card, ordered by `current_balance` ascending (largest debt first). Each row: account name · balance (negative, red). Bottom summary row — `Total debt` · total EGP (gold).
6. **If liabilities count is zero,** the Liabilities section is hidden entirely (no header, no empty list).

Sheet keyboard behaviour: `keyboardBehavior="extend"` (default for §3 sheets).

### 4.4 Animations

Existing dashboard animations are preserved on the Overview segment. They live in `dashboard.anim.ts`:

- `heroStyle` — initial fade-in + translate-Y on mount.
- `statsEntering` — Reanimated entering animation.
- `sectionEntering(index)` — staggered entering for each carousel section (used on Accounts segment now).

On segment swap, the entering animations re-fire for the destination segment's first paint. Reanimated handles this automatically via `Animated.View key={segment}` swap. Document this in the implementation plan to avoid a "should the animations re-fire?" question during dev.

---

## 5. Financial Logic ([layla])

### 5.1 Definitions

Let `A` be the set of all non-archived accounts. Let `rate` be the current EGP-per-USD rate from `currencyStore`.

- For each account `a ∈ A`, define `balEgp(a)`:
  - if `a.currency === 'USD'` → `a.current_balance * rate`
  - else → `a.current_balance`
- **Assets** `assetsEgp = Σ balEgp(a)` for all `a ∈ A` where `a.type ≠ CreditCard`.
- **Liabilities** `liabilitiesEgp = Σ |balEgp(a)|` for all `a ∈ A` where `a.type === CreditCard`. (Credit card balances are stored as positive values in the DB per `current_balance = opening_balance` rule and §1.7; the absolute value is defensive.)
- **Net Worth** `netWorthEgp = assetsEgp − liabilitiesEgp`.
- **Available to Spend** = `assetsEgp`. This is the HeroCard headline. It is deliberately distinct from Net Worth, because liabilities (CC debt) are not subtracted from spending capacity — a user with 50k EGP cash and a 4k CC balance has 50k available to spend, not 46k.
- **Liquid** `liquidEgp = Σ balEgp(a)` for `a.type ∈ {Bank, SmartWallet, PhysicalWallet}`.
- **Reserve** `reserveEgp = Σ balEgp(a)` for `a.type ∈ {PhysicalSavings}`.
- Invariant: `liquidEgp + reserveEgp === assetsEgp`.
- **USD conversions:** any EGP value can be displayed as USD by `value / rate` when `rate > 0`; show `—` when `rate === 0`.

### 5.2 Worked example (canonical — matches the §4.3 sheet illustration)

Accounts (all non-archived, all EGP):

| Account | Type | Balance |
|---|---|---|
| CIB Account | Bank | 27,000 |
| Vodafone Cash | SmartWallet | 3,500 |
| Cash | PhysicalWallet | 2,000 |
| Savings | PhysicalSavings | 10,000 |
| Visa Credit | CreditCard | 4,080 |

(Rate: 1 USD = 48.85 EGP)

- `assetsEgp = 27000 + 3500 + 2000 + 10000 = 42,500`
- `liquidEgp = 27000 + 3500 + 2000 = 32,500` (Bank + SmartWallet + PhysicalWallet)
- `reserveEgp = 10,000` (PhysicalSavings)
- `liabilitiesEgp = 4,080`
- `netWorthEgp = 42500 − 4080 = 38,420`
- `assetsUsd = 42500 / 48.85 ≈ 870`
- `netWorthUsd = 38420 / 48.85 ≈ 786`
- Available to Spend (HeroCard): `42,500 EGP`
- Net Worth StatCard: `38,420 EGP`
- Breakdown sheet:
  - Net Worth: `38,420 EGP · ≈ 786 USD`
  - Assets: 42,500 EGP · 4 accounts. Liquid 32,500 (3). Reserve 10,000 (1).
  - Liabilities: 4,080 EGP · 1 card. Visa Credit −4,080. Total debt 4,080.

**Edge variant** — same accounts minus the Savings row (so `reserveEgp = 0`, `reserveCount = 0`):

- `assetsEgp = 32,500`, `liquidEgp = 32,500`, `reserveEgp = 0`
- Breakdown sheet's Reserve legend row is hidden; the stacked bar shows 100% Liquid colour. Header reads `ASSETS · 32,500 EGP · 3 accts`.

### 5.3 Edge cases

| Case | Behaviour |
|---|---|
| `accounts.length === 0` | Empty state per §3.2. No computation runs. |
| All assets, no CC | Breakdown sheet shows Net Worth + Assets sections only. Liabilities section hidden. |
| All CC, no assets (unusual but allowed) | Sheet shows Net Worth (negative, red), no Assets section, Liabilities section with cards. Net Worth StatCard shows red value. |
| Liquid tier empty (PhysicalSavings only) | Stacked bar shows 100% Reserve colour. Legend shows Reserve row only; Liquid row hidden. |
| Reserve tier empty (no PhysicalSavings) | Stacked bar shows 100% Liquid colour. Legend shows Liquid row only; Reserve row hidden. |
| `rate === 0` | USD values render as `—`. EGP values render normally. |
| Manual rate override active | Manual badge stays on HeroCard (existing behaviour). Sheet uses the manual rate. |
| Single card with zero balance | Liabilities section shows the card row with balance `0`. Total debt = 0. (Rare but possible after CC payment.) |

### 5.4 Test cases ([layla] — to be converted into Jest tests)

| ID | Input | Expected |
|---|---|---|
| L-01 | Canonical mix from §5.2 (1 Bank 27k, 1 SmartWallet 3.5k, 1 PhysicalWallet 2k, 1 Savings 10k, 1 CC 4.08k) | assets=42500, liab=4080, netWorth=38420, liquid=32500, reserve=10000 |
| L-02 | 0 accounts | helpers return zeros without throwing |
| L-03 | 1 USD bank @ 100 USD, rate 48.85 | assetsEgp ≈ 4885, assetsUsd ≈ 100 |
| L-04 | 1 CC at zero balance | liabilities=0, breakdown row exists, total debt=0 |
| L-05 | 1 savings, 0 other types | liquid=0, reserve=full assets |
| L-06 | rate=0 | USD values are 0 (callers render `—`) |
| L-07 | archived account | excluded from all sums |
| L-08 | 2 CC with debt | both render in sheet, ordered by `current_balance` descending |

---

## 6. Technical Architecture ([tariq])

### 6.1 Helper functions

`screens/dashboard/dashboard.helpers.ts` — extended.

```typescript
// EXISTING (no signature change — output extended)
export interface NetWorthResult {
  assetsEgp: number;
  assetsUsd: number;
  liabilitiesEgp: number;
  netWorthEgp: number;
  netWorthUsd: number;
}

// NEW
export interface LiquidityBreakdown {
  liquidEgp: number;
  liquidCount: number;
  reserveEgp: number;
  reserveCount: number;
}

export function computeLiquidityBreakdown(
  accounts: Account[],
  rate: number,
): LiquidityBreakdown;

export interface LiabilityRow {
  id: string;
  name: string;
  balanceEgp: number;
}

export function computeLiabilitiesBreakdown(
  accounts: Account[],
  rate: number,
): LiabilityRow[];

// EXISTING
export function groupAccountsByType(accounts: Account[]): Partial<Record<AccountType, Account[]>>;
```

`computeLiquidityBreakdown` and `computeLiabilitiesBreakdown` exclude archived accounts. `computeLiabilitiesBreakdown` orders rows by `balanceEgp` descending (largest debt first).

### 6.2 Store / state split

Per CLAUDE.md screens anatomy and store/state shape rules.

**`dashboard.state.ts`** — UI state only.

```typescript
interface DashboardStateShape {
  isBreakdownVisible: boolean;
  refreshing: boolean;
  selectedSegment: 'overview' | 'accounts';  // NEW
}

interface DashboardState {
  state: DashboardStateShape;
  setBreakdownVisible: (v: boolean) => void;
  setRefreshing: (v: boolean) => void;
  setSelectedSegment: (s: 'overview' | 'accounts') => void;  // NEW
  reset: () => void;
}

const INITIAL_STATE: DashboardStateShape = {
  isBreakdownVisible: false,
  refreshing: false,
  selectedSegment: 'overview',
};
```

**`dashboard.store.ts`** — data state. No changes; existing shape stays.

### 6.3 Hook returns

`useDashboard` exposes:

```typescript
return {
  state: {
    accounts,
    rate,
    isManualOverride,
    netWorth,                       // existing
    liquidity,                      // NEW (LiquidityBreakdown)
    liabilities,                    // NEW (LiabilityRow[])
    groupedAccounts,
    statsMap,
    isBreakdownVisible,
    refreshing,
    monthSpend,
    accountCounts,
    commitments,
    selectedSegment,                // NEW
  },
  setBreakdownVisible,
  setSelectedSegment,               // NEW
  refresh,
  goToAccount,
  goToAddAccount,
  goToSettings,
  goToCommitments,
};
```

`liquidity` and `liabilities` are derived via `useMemo` from `accountState.accounts` + `currencyState.rate` — same dependency pattern as existing `netWorth`.

`useFocusEffect` is extended to call `setSelectedSegment('overview')` alongside its existing reload calls.

### 6.4 Component file map

§5 uses the **v1/v2 directory split pattern** established by §2. The existing `screens/dashboard/` tree (V1) is left untouched during development. All new code lives in `screens/dashboard_v2/`. Shared helpers are added to the V1 helpers file because they are pure functions with no V1/V2 divergence; both versions can import them, though only V2 uses the new ones.

**New tree — `screens/dashboard_v2/`:**

| File | Notes |
|---|---|
| `screens/dashboard_v2/index.tsx` | **New.** Uses `<Screen>` + `<ScreenScroll>`. Sticky header (wordmark + cog). Sticky `SegmentSwitcher` below header. Body swaps by `state.selectedSegment`. Renders `NetWorthBreakdownSheet` as overlay. Empty state when `accounts.length === 0`. **No FAB** (owned by tab layout). |
| `screens/dashboard_v2/dashboard.hook.ts` | **New.** Mirrors V1 hook plus: `liquidity` memo, `liabilities` memo, `selectedSegment` state, `setSelectedSegment` setter, `useFocusEffect` segment reset. |
| `screens/dashboard_v2/dashboard.state.ts` | **New.** Same shape as V1 plus `selectedSegment: 'overview' \| 'accounts'`. |
| `screens/dashboard_v2/dashboard.store.ts` | **New.** Identical to V1 store (data state). |
| `screens/dashboard_v2/dashboard.anim.ts` | **New.** Same entering animations as V1; segment swap relies on `key={segment}` on the wrapper `Animated.View` so entering re-fires. |
| `screens/dashboard_v2/components/segment_switcher.tsx` | **New.** HeroUI Native segmented control. Two segments. Props: `value`, `onChange`, `overviewLabel`, `accountsLabel`. |
| `screens/dashboard_v2/components/total_balance_strip.tsx` | **New.** Compact gradient strip per §4.2. Props: `assetsEgp`, `accountsCount`. |
| `screens/dashboard_v2/components/hero_card.tsx` | **New** (HeroUI-native equivalent of V1's). Linear gradient + grid texture preserved. Tap → breakdown sheet. |
| `screens/dashboard_v2/components/stat_cards.tsx` | **New** (HeroUI re-skin). |
| `screens/dashboard_v2/components/commitments_card.tsx` | **New** (HeroUI re-skin). |
| `screens/dashboard_v2/components/account_carousel.tsx` | **New** (HeroUI re-skin). |
| `screens/dashboard_v2/components/account_card.tsx` | **New** (HeroUI re-skin). Month In/Out from `statsMap`. |
| `screens/dashboard_v2/components/add_card.tsx` | **New** (HeroUI re-skin). Dashed border via className. |
| `screens/dashboard_v2/components/section_header.tsx` | **New** (HeroUI re-skin). With count chip. |
| `screens/dashboard_v2/components/net_worth_breakdown_sheet.tsx` | **New.** Built on §3 `Sheet` (`size="lg"`). Layout per §4.3. |

**Shared / cross-cutting:**

| File | Action |
|---|---|
| `screens/dashboard/dashboard.helpers.ts` | **Extend.** Add `computeLiquidityBreakdown`, `computeLiabilitiesBreakdown`. Existing exports unchanged. Both V1 and V2 import from this file; V1 only uses the existing exports. |
| `app/(app)/(tabs)/dashboard/index.tsx` | **Replace.** Was `export { default } from '@/screens/dashboard';`. Becomes a flag-branch component (see §3.1 code block above). |
| `constants/strings.ts` | **Extend.** New keys per §9 below. |
| `constants/feature_flags.ts` | **Edit.** `newDashboard` flag stays `false` through dev; flip to `true` in the promotion commit. |

**Cleanup commit (last task of §5, per `constants/feature_flags.ts` cleanup rule):**

| Path | Cleanup action |
|---|---|
| `screens/dashboard/` | Delete the entire V1 directory. |
| `app/(app)/(tabs)/dashboard/index.tsx` | Restore to one-liner: `export { default } from '@/screens/dashboard_v2';`. |
| `constants/feature_flags.ts` | Remove the `newDashboard` entry. |
| `CLAUDE.md` | Remove `screens/dashboard/components/net_worth_breakdown_sheet.tsx` from the §3 legacy `react-native-actions-sheet` migration list. |

### 6.5 Routing

No route changes. `app/(app)/(tabs)/dashboard/index.tsx` still re-exports the screen.

### 6.6 Database

No schema changes. No new migrations. No new queries.

### 6.7 Data flow

- Accounts → `useAccountStore.state.accounts` (existing).
- Currency rate → `useCurrencyStore.state.rate` (existing).
- Commitments → `useCommitmentStore.state.commitments` + `.payments` (existing).
- Account stats (Month In/Out per account) → `dashboard.store.statsMap` populated by `getAccountsStats(db, ids)` (existing).
- Month spend stats → `dashboard.store.currentMonthSpend / previousMonthSpend` populated by `getMonthExpenseStats(db, ym)` (existing).
- Liquidity + liabilities breakdowns → derived in `dashboard.hook` via `useMemo`. No DB calls, no new persistence.

### 6.8 Performance considerations

- Account-card images / icons remain the same shapes as today; no new render cost.
- Sheet renders behind a `visible` boolean; `@gorhom/bottom-sheet@^5.2.14` short-circuits unmounted content. Liquidity + liabilities props are tiny scalars + a short array (≤ ~10 entries even for power users).
- Segment swap re-runs Reanimated entering animations on the swapped content but does not re-fetch data — both segments read from the same hook state.

---

## 7. Migration Strategy

Standard v1/v2 directory split (same pattern §2 used):

1. **Build V2 in parallel** in `screens/dashboard_v2/`. V1 stays untouched. Route file `app/(app)/(tabs)/dashboard/index.tsx` becomes a flag-branch component (see §3.1).
2. **Local QA** with flag flipped to `true`. All Jest tests pass for both V1 (existing tests unchanged) and V2 (new tests).
3. **Promotion commit:** flip `FeatureFlags.newDashboard` from `false` to `true`. Per `constants/feature_flags.ts` rule, the flag flip lands in the same commit that promotes V2 to the active route — no earlier, no separate commit.
4. **Cleanup commit (within 5 business days of promotion, per the same feature-flag rule):**
   - Delete `screens/dashboard/` entirely (V1 tree).
   - Restore `app/(app)/(tabs)/dashboard/index.tsx` to the one-line re-export: `export { default } from '@/screens/dashboard_v2';`.
   - Remove `newDashboard` from `FeatureFlags`.
   - Remove `screens/dashboard/components/net_worth_breakdown_sheet.tsx` from the CLAUDE.md legacy migration list.

`react-native-actions-sheet` stays installed; §5 retires this domain's consumer, but the dependency is removed only after the last consumer migrates (no earlier than §9 per CLAUDE.md).

---

## 8. Testing Strategy

Test files use `snake_case` per CLAUDE.md.

### 8.1 Helper tests — `__tests__/screens/dashboard/dashboard_helpers.test.ts`

- Existing `computeNetWorth` cases (preserve).
- New `computeLiquidityBreakdown`:
  - Mixed types → split correctly (L-01).
  - All Liquid → reserve=0 (L-05 inverse).
  - All Reserve → liquid=0 (L-05).
  - USD account included in EGP totals via rate (L-03).
  - Archived account excluded (L-07).
- New `computeLiabilitiesBreakdown`:
  - Single CC → one row, correct balance (L-04).
  - Multiple CCs → ordered by balance descending (L-08).
  - No CCs → empty array.
  - Archived CC excluded (L-07).
  - USD CC converted to EGP for `balanceEgp` (L-03).

### 8.2 Hook tests — `__tests__/screens/dashboard/dashboard_hook.test.ts`

- Default `selectedSegment === 'overview'`.
- `setSelectedSegment('accounts')` updates state.
- Focus event resets segment to `'overview'`.
- `liquidity` and `liabilities` memos respond to account changes.
- Existing tests for `monthSpend`, `commitments`, `accountCounts` continue to pass.

### 8.3 Component tests

- `__tests__/screens/dashboard/components/segment_switcher.test.tsx` — renders two segments, fires `onChange`, applies active visual class on the active segment.
- `__tests__/screens/dashboard/components/total_balance_strip.test.tsx` — renders amount and count correctly, formats EGP per `Intl`.
- `__tests__/screens/dashboard/components/net_worth_breakdown_sheet.test.tsx` — renders all three sections when populated; hides Liabilities section when count = 0; hides Reserve legend row when reserve = 0; orders liabilities by balance descending; uses `Sheet` from `components/ui/sheet`; closes via `onClose`.

### 8.4 Screen smoke test — `__tests__/screens/dashboard/dashboard_screen.test.tsx`

- Empty state when `accounts.length === 0` — no SegmentSwitcher, no FAB, EmptyState visible.
- Populated state Overview — HeroCard + StatCards + CommitmentsCard render.
- Segment switch to Accounts — TotalBalanceStrip + non-empty type sections render; empty type sections hidden.
- FAB tap routes to `/transactions/transaction_form` (assert via mocked router).
- HeroCard tap opens breakdown sheet (`isBreakdownVisible` true).
- Settings cog routes to `/settings`.

### 8.5 Coverage thresholds

Existing thresholds from CLAUDE.md must hold: 80% lines · 95% functions · 100% branches.

---

## 9. Strings (`constants/strings.ts`)

New keys added (English copy; translations are out of scope until a future internationalisation section):

| Key | Value |
|---|---|
| `dashboardSegmentOverview` | "Overview" |
| `dashboardSegmentAccounts` | "Accounts" |
| `dashboardTotalBalance` | "Total balance" |
| `dashboardAccountsLabel` | "Accounts" |
| `dashboardBreakdownTitle` | "Net Worth" |
| `dashboardBreakdownNetWorthLabel` | "Net Worth" |
| `dashboardBreakdownAssetsHeader(eg, count)` | `${eg} EGP · ${count} ${count === 1 ? 'acct' : 'accts'}` |
| `dashboardBreakdownLiabilitiesHeader(eg, count)` | `${eg} EGP · ${count} ${count === 1 ? 'card' : 'cards'}` |
| `dashboardBreakdownLiquid` | "Liquid" |
| `dashboardBreakdownReserve` | "Reserve" |
| `dashboardBreakdownLiquidCaption` | "Bank, Smart Wallet, Cash" |
| `dashboardBreakdownReserveCaption` | "Savings" |
| `dashboardBreakdownTotalDebt` | "Total debt" |

Existing keys preserved (no rename): `dashAvailableToSpend`, `dashNetWorthTitle`, `dashAssetsLabel`, `dashLiabilitiesLabel`, `dashMonthSpentTitle`, `dashboardCommitmentsTitle`, `commitmentsTotalCommitted`, `emptyAccountsCta`.

---

## 10. Risks

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Segment swap fade-in conflicts with carousel horizontal scroll gesture | Low | Medium | Cross-fade only, no horizontal slide. Documented in §3.3. |
| R2 | `newDashboard` flag flip exposes a regression in production | Low | High | Local QA before flip. Component + hook tests cover both paths. Flag exists explicitly to gate exposure. |
| R3 | HeroUI Native re-skin alters subtle visuals enough to require Marcus's re-review | Medium | Low | Re-skin commits ship visual diff in PR description (screenshots). Marcus reviews before flag flip. |
| R4 | `Sheet` `size="lg"` (92% snap) clips the breakdown content on small Android phones | Low | Medium | Sheet body is a `BottomSheetScrollView`; if liabilities list is long, it scrolls. Already proved out by §4 sheets. |
| R5 | `useFocusEffect` segment reset surprises users who expected to stay on Accounts | Medium | Low | Documented as intentional. If user feedback flags this post-§5, reconsider in §6+. |
| R6 | Removing the legacy `net_worth_breakdown_sheet.tsx` accidentally breaks an unsuspected importer | Low | Medium | Grep for the file path before deletion. Final §5 commit isolates the removal so it's reviewable. |
| R7 | Re-skin introduces hex literals or spacing values, violating CLAUDE.md conventions | Medium | Low | Lint rule (already configured in §1) catches hex literals. Code review pass verifies no inline pixel values. |
| R8 | New `liquidity` / `liabilities` memos compute on every account list change — acceptable but worth confirming on devices with many accounts | Low | Low | Both helpers iterate accounts once and exit. Verified with snapshot tests using ~10 accounts. |

---

## 11. Acceptance Criteria

§5 ships when **all** of these are true:

1. After cleanup, `screens/dashboard/` no longer exists; the dashboard route renders `DashboardScreenV2` directly; `FeatureFlags.newDashboard` no longer exists.
2. The legacy `net_worth_breakdown_sheet.tsx` is removed with the V1 tree. The CLAUDE.md migration-list line for this file is removed in the same cleanup commit.
3. Overview segment renders HeroCard, StatCards, and CommitmentsCard with identical data and identical tap behaviour to today's V1 dashboard.
4. Accounts segment renders TotalBalanceStrip plus visible-type carousels in `TYPE_ORDER`. Empty-type sections are hidden. AddCard taps route to `/accounts/add_account`.
5. Net Worth Breakdown sheet renders Net Worth (EGP + USD), Assets section with Liquid/Reserve split, and Liabilities section with per-card rows. Hides Liabilities section when count = 0; hides Reserve / Liquid legend row when its tier is zero. Closes on swipe-down, scrim tap, and X-button.
6. `useFocusEffect` resets `selectedSegment` to `'overview'`.
7. All tests pass at the thresholds in §8.5.
8. No new hex literals, no new hardcoded pixel values, no new hardcoded user-visible copy outside `constants/strings.ts`.
9. The full design renders correctly on iPhone SE (smallest target) and on a Pixel 4 (large Android) — confirmed by manual smoke check before flag flip.

---

## 12. Open questions

None at spec-time. All design decisions are locked above.
