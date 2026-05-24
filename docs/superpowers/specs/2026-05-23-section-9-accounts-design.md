# Section 9 · Accounts — Design Spec

**Date:** 2026-05-23
**Status:** Draft — awaiting spec sign-off
**Owners:** [tariq] technical · [marcus] UX · [layla] financial · [sarah] sequencing
**Section:** 9 of 9 (Accounts — final section) within the HeroUI Native migration initiative
**Branch (spec):** `spec/section-9-accounts` · **Branch (impl, later):** `feat/section-9-accounts`

**Cross-references:**
- §2 Onboarding spec: `docs/superpowers/specs/2026-05-11-section-2-onboarding-design.md` (Add Account form already migrated in `screens/onboarding_v2/add_account/` — the canonical reference for §9's main-app Add Account form)
- §4 Settings spec: `docs/superpowers/specs/2026-05-12-section-4-settings-design.md` (sheet-migration recipe + keep-`Modal`-dialog precedent)
- §5 Dashboard spec: `docs/superpowers/specs/2026-05-16-section-5-dashboard-design.md` (the Accounts segment, account-list/carousel/card UI — already shipped, NOT in §9 scope)
- `components/ui/sheet.tsx` — declarative `Sheet` primitive (target for `adjust_balance_sheet`)
- `screens/settings/categories/components/add_edit_category_sheet.tsx` — already-migrated small-form-in-sheet reference

---

## 1. Feature Summary

§9 is the final section of the Cairo Nights rebrand. It migrates the **Accounts domain detail-and-form surfaces** — everything under `screens/accounts/**` — from the legacy pattern (raw `StyleSheet.create` + `Colors.dark.*` tokens + raw RN components, zero HeroUI) to HeroUI Native v1.0 + Unistyles 3 (via Uniwind) + Cairo Nights tokens. It also retires the **last** `react-native-actions-sheet` consumer in this domain and, gated on §8, deletes the legacy dependency and its patch entirely.

**Scope boundary (read first).** The Dashboard's *Accounts segment* (account list, per-type carousels, `AccountCard`, `AddCard`, net-worth breakdown sheet) shipped in **§5 and is already on HeroUI** — it is **NOT** re-touched here. §9 owns only the screens you reach *from* those entry points:

- `screens/accounts/detail/**` — Account Detail (route `/accounts/[id]`), incl. inline edit, the balance hero, the adjust-balance sheet, and the archive dialog.
- `screens/accounts/add_account/**` — Add Account form (route `/accounts/add_account`).

**What ships in §9:**

### §9a — Accounts domain rebrand (parallel-safe with §8)

1. **Account Detail screen** — migrated to `Screen`/`ScreenScroll`, HeroUI primitives, Cairo Nights tokens. Inline edit (name + color) preserved. Header preserved (boxy back button + centered title + Edit/Save toggle).
2. **Balance hero** — replaces the misnamed `MiniChart` (today it is a single static balance bar, *not* a chart) with a proper HeroUI balance hero card: account-color accent, current balance in gold (red for credit cards), and type-appropriate context (available credit / opening balance).
3. **Actions block** — Adjust Balance + Archive rows re-skinned as a HeroUI surface block (ListGroup-style), tokens only.
4. **`adjust_balance_sheet.tsx`** — **migrated from `react-native-actions-sheet` to the declarative `Sheet`** (`size="sm"`), HeroUI `Input` + `Button` footer. This is the load-bearing migration of §9.
5. **`archive_confirmation_dialog.tsx`** — kept as RN `Modal` (per §4's `DeleteConfirmationDialog` precedent), re-skinned to tokens/HeroUI `Text`/`Button`. CC net-worth warning preserved.
6. **Add Account screen** — migrated to mirror the already-shipped `screens/onboarding_v2/add_account/` faithfully, minus the `ProgressDots` and with a back-arrow (not onboarding nav). Same RHF + Zod schema, same CC conditional fields, same `Switch` for interest tracking.
7. **`type_pill.tsx`** (add-account) — migrated to HeroUI `Pressable` + tokens, matching `onboarding_v2/add_account/components/type_pill.tsx`.
8. **V1/V2 split + `newAccounts` flag** — build under `screens/accounts_v2/`, flag-branch the two routes via the existing `FeatureFlags.newAccounts` toggle (already present, currently `false`), promote, then cleanup-rename V2→canonical and drop the flag. Identical mechanics to §5/§6/§7.

### §9b — Legacy dependency deletion (GATED — see §7)

9. **Delete `react-native-actions-sheet`** from `package.json` and **delete `patches/react-native-actions-sheet+10.1.2.patch`**. Update CLAUDE.md to remove the legacy-sheet phase-out section. **This is GATED:** it can only land after BOTH §8's `pay_sheet.tsx` migration AND §9a's `adjust_balance_sheet.tsx` migration have merged to `main`. See §7 for the explicit gate.

**What does NOT ship in §9 (explicit out-of-scope):**

- Dashboard Accounts segment, `AccountCard`, `AccountCarousel`, `AddCard`, net-worth breakdown sheet — owned by §5, already migrated.
- Real balance-history chart / sparkline — requires historical balance snapshots (new persistence). The `MiniChart` is replaced by a static balance hero, not a trend chart. Parked for post-rebrand.
- Add Account dual-entry as a sheet variant — not built; Add Account stays a full-screen stack route.
- Editing account `type`, `currency`, or `opening_balance` post-creation — immutable by design (see §3.6). Edit covers `name` + `color` only, unchanged from V1.
- Editing credit-card fields (limit, APR, due day, min payment, revolving) post-creation — not in V1, not added here.
- Un-archive / archived-accounts management screen — no V1 surface; deferred.
- Account reorder (drag `sort_order`) — no V1 logic; deferred.
- Hard delete of accounts — archive is the only removal path (preserves transaction referential integrity).
- Security / PIN — deferred to post-rebrand per §4.

---

## 2. Product & UX ([marcus])

*Source: Marcus Chen's §9 stance, synthesized by [tariq]. Implementors build from this section directly.*

### 2.1 Account Detail — screen anatomy

The detail screen is reached from the Dashboard Accounts segment (`AccountCard` tap → `router.push('/accounts/${id}')`). It is a full-screen stack route, NOT a tab.

```
AccountDetailScreen  (screens/accounts_v2/detail/index.tsx)
│
├── <Screen edges={['top','bottom']}>
│   ├── Header (in-flow, h-14)
│   │   ├── BackButton                    → onBack (exits edit if editing, else router.back)
│   │   ├── Account name (centered, numberOfLines=1)
│   │   └── Edit ⇄ Save toggle (right)    boxy button; Save = gold, Edit = gold text
│   │
│   ├── <ScreenScroll>
│   │   ├── BalanceHero                   ← replaces MiniChart
│   │   ├── EditBlock (only when isEditing)   name Input + color picker (FadeInDown/FadeOutUp)
│   │   └── ActionsBlock (only when !isEditing)
│   │       ├── Adjust Balance row        → setAdjustVisible(true)
│   │       └── Archive row (destructive) → setArchiveVisible(true)
│   │
│   ├── AdjustBalanceSheet (overlay — Sheet primitive)
│   └── ArchiveConfirmationDialog (overlay — RN Modal)
```

`if (!account) return null;` guard preserved (account may be momentarily absent after archive→back, or on a stale deep link).

### 2.2 Account Detail — header

Preserved behaviour, re-skinned:

- **Back button:** `components/ui/back_button.tsx` (the canonical boxy 36×36). Replaces the old `BackButton` import — confirm it is the HeroUI one (it already is; V1 detail already imports `@/components/ui/back_button`).
- **Title:** account name, `Text variant="title"` font-soraBold, `numberOfLines={1}`, centered, `flex: 1`.
- **Edit/Save toggle (right):** a boxy button matching the back button's footprint (`Size.backBtn`). In view mode: "Edit" in gold text (`text-accent`). In edit mode: "Save" with gold gradient background + midnight-blue text. The `headerScale` press animation (`account_detail.anim.ts`) is preserved.
- The `beforeRemove` navigation listener that cancels edit-on-back is preserved verbatim — it is logic, not style.

### 2.3 Account Detail — Balance Hero (replaces MiniChart)

[marcus]: the current `MiniChart` is a misnomer — a flat 100%-width colored bar plus the balance number. It carries no information. Replace it with a compact **balance hero card** that earns its space:

```
┌───────────────────────────────────────────┐
│ ▍ (account-color accent bar, full width)   │
│                                            │
│   CURRENT BALANCE              [type chip] │
│   28,100 EGP                               │   ← gold; red if CreditCard
│   Opening 30,000 EGP · adjusted            │   ← caption (see rules below)
└───────────────────────────────────────────┘
```

- **Container:** `bg-surface border border-border rounded-2xl`, with a top accent bar in `account.color` (runtime hex via `style={{ backgroundColor }}`, same idiom as §5 `AccountCard`).
- **Label:** `Strings.accountDetailBalance` ("Current Balance"), uppercase, `text-muted`, caption.
- **Balance:** `formatAmount(account.current_balance)` + currency, `Text variant="numMd"` (Sora, tabular-nums). Color: gold (`text-accent`) for assets; `text-danger` for `CreditCard` (it is a liability — see [layla] §3.2).
- **Type chip (right):** the account type label (`Strings.typeBank` etc.) in a bordered pill, mirroring the §5 `AccountCard` currency-pill idiom, tinted by account color at low alpha (`color + '22'`).
- **Context caption (below balance):** type-aware, one line:
  - **All non-CC types:** `Opening {opening_balance} {currency}` plus `· adjusted` when `current_balance !== opening_balance`. Communicates the opening-vs-current distinction [layla] requires.
  - **CreditCard:** available-credit context — `Available {max(0, limit − balance)} {currency} of {limit}` when `credit_limit > 0`, colored by utilisation (reuse §5 `availableCreditColor` thresholds: >50% positive, 20–50% warning, <20% negative). When `credit_limit` is null/0: show `Opening {opening_balance} {currency}` like other types.

No `LinearGradient` here (reserved for the Dashboard hero); a flat surface keeps the detail screen calm and the type-color accent does the visual work. This is a re-skin + information upgrade, not a new data dependency — all values already live on `account`.

### 2.4 Account Detail — Edit block (inline)

Preserved behaviour; re-skinned. Shown only when `isEditing`, with `FadeInDown.duration(200)` / `FadeOutUp.duration(150)` entering/exiting (existing `account_detail.anim.ts`).

- **Name field:** HeroUI `Input` (`components/ui/input.tsx`), `maxLength={30}`, RHF `Controller`. `isInvalid={!!errors.name}`. Error text in `text-negative` with the existing `errorEntering`/`errorExiting` animations.
- **Color picker:** the `AccountColors` swatch row, migrated to `Pressable` + `Box` exactly as `onboarding_v2/add_account` does it (`h-8 w-8 rounded-full`, selected = `border-gold-500 scale-110 border-2`, runtime `style={{ backgroundColor }}`).
- Section labels use the established gold micro-label idiom: `Text variant="hint" className="font-soraBold text-gold-500 ... tracking-widest"`.

### 2.5 Account Detail — Actions block

Shown only when `!isEditing`. A single rounded `bg-surface border border-border` block with two rows separated by a hairline divider (`border-separator`):

- **Adjust Balance:** `pencil` icon (`text-muted`) · label (`text-foreground`) · `chevron-right`. Tap → `setAdjustVisible(true)`.
- **Archive (destructive):** `archive` icon (`text-danger`) · label (`text-danger`) · `chevron-right` (`text-danger`). Tap → `setArchiveVisible(true)`.

[marcus]: this maps cleanly onto HeroUI `ListGroup`/`Card` composition or a hand-rolled `Pressable` row block — implementor's choice per CLAUDE.md "HeroUI primitives first." If `ListGroup` styling fights the destructive-row tint, a `Pressable` + `Box` block with tokens is acceptable (same call §4 made for its tab switcher). Touch targets ≥ 44px.

### 2.6 Adjust Balance Sheet — migration to `Sheet`

The headline migration. Today it is a `react-native-actions-sheet` `ActionSheet` driven imperatively via `sheetRef.current?.show()/.hide()`. It becomes a declarative `Sheet`, following the §4 `add_edit_category_sheet` recipe.

| Item | Before (legacy) | After (`Sheet`) |
|---|---|---|
| Import | `import ActionSheet, { type ActionSheetRef } from 'react-native-actions-sheet'` | `import { Sheet } from '@/components/ui/sheet'` |
| Component | `<ActionSheet ref={sheetRef} ...>` | `<Sheet visible={visible} onClose={onClose} title={Strings.adjustBalanceTitle} size="sm" footer={<SaveBar/>}>` |
| Imperative control | `useRef<ActionSheetRef>` + `useEffect` calling `.show()`/`.hide()` | Deleted. The `initialize(currentBalance)` call inside the `if (visible)` block stays (seeds the input); the `.show()`/`.hide()` calls are removed. `visible` prop drives the sheet. |
| Body | `<View style={styles.content}>` | `<Sheet.Body>` with a single non-scrolling content `Box` (short form — no scroll container needed; `size="sm"` = 50% snap is ample for one input + caption) |
| CTA bar | inline `View` with Cancel + Save `Pressable`s | moved to the `footer` prop. Cancel = `Button variant="secondary"`; Save = `Button variant="primary"` (gold gradient), `isLoading`/`disabled` wired to `isAdjusting`. |
| Title | hand-rolled `Text` | `Sheet` `title` prop |
| Background/handle | `containerStyle` / `indicatorStyle` | handled by the `Sheet` primitive |

**Sheet content (re-skinned, logic preserved):**

```
┌──────────────────────────────── ── ─┐
│ Adjust Balance                    ✕ │
├──────────────────────────────────────┤
│ NEW BALANCE                          │
│ ┌────────────────────────┐  EGP     │   ← Input + currency suffix
│ │ 28100                  │           │
│ └────────────────────────┘           │
│ (error text if invalid)              │
├──────────────────────────────────────┤  ← sticky footer
│ [ Cancel ]        [ Save Balance ]   │
└──────────────────────────────────────┘
```

- **Input:** HeroUI `Input`, `keyboardType="decimal-pad"`, value bound to `adjustState.input`. The currency code (`account.currency`) shown as a trailing label/suffix beside the input (a `Text` to the right, same as the legacy `styles.currency`).
- **Validation (preserved exactly):** on save, `parseFloat(input)`; if `!Number.isFinite(n) || n < 0` → set `Strings.errBalanceInvalid`, do not submit. Clear error on input change. ([layla] confirms: negative balances are rejected for all account types here — see §3.4.)
- **State store:** `adjust_balance_sheet.state.ts` is preserved as-is (`input`, `error`, `initialize`, `reset`). No shape change.
- **`SHEET_FOOTER_CLEARANCE`:** not needed for a non-scrolling `size="sm"` sheet, but if the implementor uses a `BottomSheetScrollView`, apply it per the primitive's contract.

### 2.7 Archive Confirmation Dialog — keep as Modal, re-skin

[marcus] + [tariq]: keep this as an RN `Modal` (centered alert), exactly as §4 kept `DeleteConfirmationDialog`. A bottom sheet for a destructive yes/no is the wrong pattern — a centered modal commands the decision. Re-skin to tokens + HeroUI primitives:

- Overlay: `rgba(0,0,0,0.65)` scrim (a literal allowed for modal scrims, consistent with §4's kept dialog and the existing V1).
- Dialog card: `bg-surface border border-border rounded-2xl`.
- Title: `Strings.accountDetailArchiveTitle`, `Text variant="h3"`/title.
- Body: `Strings.accountDetailArchiveBody`, `text-muted`.
- **CC warning (preserved):** when `account.type === CreditCard`, show `Strings.accountDetailArchiveCCWarning` in `text-accent` (gold) — outstanding CC debt still affects net worth after archive. ([layla] §3.5.)
- Buttons: Cancel = `Button variant="secondary"`; Archive = `Button variant="danger"` (or destructive tint), `isLoading`/`disabled` wired to `isArchiving`.

### 2.8 Add Account — mirror onboarding_v2

The main-app Add Account screen (`/accounts/add_account`) is functionally identical to the onboarding Add Account, which **already shipped migrated** at `screens/onboarding_v2/add_account/`. [marcus]: do not redesign — replicate. Differences from the onboarding version:

- **No `ProgressDots`** (this is not a step in a wizard).
- **Header:** `BackButton` + centered title (`Strings.u4Title`) + spacer, exactly the onboarding_v2 header minus the dots.
- **CTA:** `Strings.u4Cta` ("Save Account"), gold `Button variant="primary"`, `btnAnim` press scale preserved.
- **On save:** `router.back()` (returns to wherever the user launched from — Dashboard Accounts segment `AddCard`). Onboarding's version advances the wizard; this one just pops.

All fields, the CC conditional block, the interest `Switch`, currency pills, color picker, and the Zod schema (`utils/schemas/add_account.schema.ts`) are reused unchanged. The screen body is a near-copy of `onboarding_v2/add_account/index.tsx`.

### 2.9 Navigation / IA

No route topology changes. Both routes stay full-screen stack routes under `app/(app)/accounts/`:

| Screen | Route file | Container | §9 status |
|---|---|---|---|
| Account Detail | `app/(app)/accounts/[id]/index.tsx` | full-screen stack | Migrate (flag-branch) |
| Add Account | `app/(app)/accounts/add_account/index.tsx` | full-screen stack | Migrate (flag-branch) |
| Adjust Balance | sub-component of Detail | `Sheet` size="sm" | Migrate (from actions-sheet) |
| Archive Confirm | sub-component of Detail | RN `Modal` (keep) | Re-skin only |

Entry points (unchanged, owned by §5): Dashboard Accounts segment `AccountCard` → Detail; `AddCard` → Add Account; the global FAB long-press "Add Account" (if wired) → Add Account.

---

## 3. Financial Logic ([layla])

*Source: Layla Hassan's §9 stance, synthesized by [tariq]. These rules are authoritative — preserve them verbatim; §9 changes presentation, never math.*

### 3.1 Account types

Five `AccountType` values (`constants/enums.ts`), unchanged:

| Type | Role | Net-worth contribution |
|---|---|---|
| `Bank` | asset | + balance |
| `SmartWallet` | asset | + balance |
| `PhysicalWallet` | asset (cash) | + balance |
| `PhysicalSavings` | asset (reserve) | + balance |
| `CreditCard` | **liability** | **− balance** |

### 3.2 Credit cards are liabilities (net-worth negative)

A credit-card `current_balance` is the amount **owed**, stored as a positive number. In net-worth math (`computeNetWorth`, §5 helper, unchanged) it is **subtracted**: `netWorth = assets − Σ(CC balances)`. §9 surfaces this on the detail screen by rendering the CC balance in `text-danger` (red) and the CC archive warning. §9 does **not** alter `computeNetWorth` — that helper is owned by §5 and stays untouched.

### 3.3 Opening vs current balance

- At creation: `current_balance = opening_balance` (Business Rule 7; enforced in `AccountRepository.add`, unchanged).
- `opening_balance` is **immutable** after creation — it is the historical anchor. The balance hero shows it as context (§2.3).
- `current_balance` drifts from `opening_balance` as transactions post (owned by the transactions domain) and via manual adjustment (§3.4). The `· adjusted` caption flags divergence.

### 3.4 Manual balance adjustment

The Adjust Balance sheet performs a **manual override** of `current_balance` only:

- It writes `current_balance = newBalance` via `adjustBalance(id, newBalance)` → `setAccountBalance` (DB), reloads accounts. **No transaction record is created** — this is an explicit override, not income/expense. (Unchanged from V1.)
- `opening_balance` is **never** touched by adjustment.
- **Validation:** `newBalance` must be finite and `≥ 0`. Negative is rejected with `Strings.errBalanceInvalid`. This applies to **all** types including credit cards: a CC `current_balance` of 0 means nothing owed; a positive value is the amount owed. (The UI never lets a user type a negative; the guard is defensive.)
- Multi-currency: the value is entered and stored in the account's own `currency`. No conversion happens at adjust time. ([layla]: the rate is a display tool only — never mutate stored amounts, mirroring §4 TC-08.)

### 3.5 Archiving semantics

`archiveAccount(id)` sets `is_archived = 1` (soft delete; `database/accounts.ts`, unchanged):

- Archived accounts are excluded from `getAccounts` (`WHERE is_archived = 0`), so they vanish from the Dashboard, all carousels, and every net-worth/liquidity computation.
- **Transactions are preserved.** Archiving never deletes transactions — referential integrity holds, history stays intact. (This is why archive, not hard-delete, is the only removal path.)
- **Credit-card caveat (warning copy):** archiving a CC with an outstanding balance hides it but the debt *conceptually* no longer drags net worth (because the account is excluded from sums). The warning `Strings.accountDetailArchiveCCWarning` exists to make the user pause: archiving a card you still owe on will make your net worth *look* better than it is. [layla]: this copy is correct and must be preserved — it is a financial-honesty guardrail, not decoration.
- After archive, the detail screen pops (`router.back()`); the `account` becomes absent from the store, which is why the `if (!account) return null;` guard matters during the pop frame.

### 3.6 Immutability rules

- `type`, `currency`, `opening_balance` are **locked** after creation. Edit covers `name` + `color` only. ([layla]: changing an account's currency or opening balance retroactively would corrupt every historical computation — never allow it.)
- Account `name` is **unique across all accounts** (Business Rule 9), case-insensitive, trimmed. Enforced in the edit schema (`account_detail.hook.ts`, refine excludes self by `id`) and the add schema (`add_account.schema.ts`, superRefine). §9 preserves both checks verbatim.

### 3.7 Worked examples

**E-1 — Bank account, adjusted.** CIB Bank, EGP, `opening_balance = 30,000`, after transactions `current_balance = 28,100`. Detail balance hero: `28,100 EGP` (gold), caption `Opening 30,000 EGP · adjusted`. User manually adjusts to `27,500`: `setAccountBalance(id, 27500)`, no transaction created, `opening_balance` still 30,000, caption still `· adjusted`.

**E-2 — Credit card, available credit.** Visa, EGP, `credit_limit = 50,000`, `current_balance = 4,080` (owed). Balance hero: `4,080 EGP` in **red**, type chip "Credit Card", caption `Available 45,920 EGP of 50,000` colored positive (utilisation 8% → >50% available → positive). Net worth (computed elsewhere) subtracts 4,080.

**E-3 — Credit card, archive warning.** Same Visa with 4,080 owed. User taps Archive. Modal shows title + body + `accountDetailArchiveCCWarning` in gold. On confirm: `is_archived = 1`; card disappears from dashboard; the 4,080 no longer subtracts from displayed net worth (account excluded). The warning told them this would happen.

**E-4 — USD account.** PayPal, USD, `current_balance = 100`, rate = 48.85. Balance hero shows `100 USD` (the account's own currency — no conversion on the detail screen). Adjust sheet edits in USD. (Conversion to EGP only happens in dashboard rollups, owned by §5.)

**E-5 — Adjust to zero (CC paid off).** Visa, `current_balance = 4,080`. User pays it off externally, adjusts to `0`. Valid (`0 ≥ 0`). Balance hero: `0 EGP` red, `Available 50,000 EGP of 50,000` positive.

### 3.8 Edge cases

| Case | Behaviour |
|---|---|
| `account` not found (stale id / post-archive pop) | `return null` — no crash. Preserved. |
| Adjust input empty / non-numeric | `errBalanceInvalid`, no submit. |
| Adjust input negative | `errBalanceInvalid`, no submit (all types). |
| CC with `credit_limit` null or 0 | Balance hero caption falls back to `Opening {opening_balance}`; no available-credit math (avoids divide-by-zero). |
| Edit name to a duplicate (case-insensitive) | `errNameDuplicate`; refine excludes self by id. |
| Edit name empty / > 30 chars | `errNameRequired` / `errNameTooLong`. |
| Archive while CC has debt | Allowed; warning shown. |
| Multi-currency adjust | Stored in account currency; no conversion. |

### 3.9 Test cases ([layla] — to be converted into Jest unit tests in §9a)

Logic-only (no UI render tests). Targets: `adjust_balance_sheet.state.ts` validation logic (extracted to a pure helper if it isn't already), the edit Zod schema, the add Zod schema, and the repository.

| ID | Input | Expected |
|---|---|---|
| A-01 | adjust input `"27500"` on EGP bank | parses 27500, valid, `setAccountBalance` called with 27500 |
| A-02 | adjust input `"-5"` | invalid → `errBalanceInvalid`, no DB write |
| A-03 | adjust input `""` / `"abc"` | invalid → `errBalanceInvalid`, no DB write |
| A-04 | adjust input `"0"` | valid (0 ≥ 0); `setAccountBalance(id, 0)` |
| A-05 | adjust does not create a transaction | repository `adjustBalance` calls only `setAccountBalance`; no transaction insert |
| A-06 | adjust never mutates `opening_balance` | after adjust, `opening_balance` unchanged in DB |
| A-07 | edit name to existing name (other account, diff case) | `errNameDuplicate` |
| A-08 | edit name to own current name | valid (self excluded by id) |
| A-09 | add account → `current_balance === opening_balance` | repository `add` sets them equal (Business Rule 7) |
| A-10 | add CC without credit_limit | `errCreditLimitRequired` (superRefine) |
| A-11 | add CC with interest_tracking on, no APR | `errAprRequired` |
| A-12 | archive sets `is_archived = 1`, leaves transactions | `archiveAccount` updates flag only; transaction rows untouched |

A-09 through A-12 may already be covered by existing repository/schema tests — §9a audits, fills gaps, and does not duplicate.

---

## 4. Architecture ([tariq])

### 4.1 Migration pattern — V1/V2 split + `newAccounts` flag

§9a follows the **exact** mechanics §5/§6/§7 used (confirmed in git history: `feat(§N) ... V2`, then `feat(§N): promote ... flip flag`, then `cleanup(§N): remove V1 tree, rename V2→canonical, drop flag`):

1. Build the migrated screens under `screens/accounts_v2/` (mirroring the existing `screens/accounts/` tree). V1 stays untouched.
2. Flag-branch both route files via the already-present `FeatureFlags.newAccounts` (currently `false`):

```tsx
// app/(app)/accounts/[id]/index.tsx
import { FeatureFlags } from '@/constants/feature_flags';
import AccountDetailScreenV1 from '@/screens/accounts/detail';
import AccountDetailScreenV2 from '@/screens/accounts_v2/detail';

export default function AccountDetailRoute() {
  return FeatureFlags.newAccounts ? <AccountDetailScreenV2 /> : <AccountDetailScreenV1 />;
}
```

```tsx
// app/(app)/accounts/add_account/index.tsx — same flag-branch with AddAccount V1/V2
```

3. **Promote** (single commit): flip `FeatureFlags.newAccounts` `false → true` in the same commit that wires V2 to the routes. Per `constants/feature_flags.ts` rule — never earlier, never separate.
4. **Cleanup** (follow-up PR, within 5 business days): delete `screens/accounts/` (V1), rename `screens/accounts_v2/` → `screens/accounts/`, restore both route files to one-liners (`export { default } from '@/screens/accounts/detail';` etc.), remove the `newAccounts` entry from `FeatureFlags`.

Note: the route files for `[id]` and `add_account` are normally one-liners; the flag-branch component is the temporary exception during §9a, exactly as §5 did for the dashboard route.

### 4.2 Folder layout

**New tree — `screens/accounts_v2/`** (mirrors V1 anatomy per CLAUDE.md screens/ rules):

| File | Notes |
|---|---|
| `screens/accounts_v2/detail/index.tsx` | **New.** `Screen`/`ScreenScroll`. Header, BalanceHero, EditBlock, ActionsBlock. Renders AdjustBalanceSheet + ArchiveConfirmationDialog. No `useState`/`useSharedValue`. |
| `screens/accounts_v2/detail/account_detail.hook.ts` | **New.** Copy of V1 hook (RHF edit schema, nav, save/adjust/archive handlers, `beforeRemove` listener). Logic unchanged; no style. |
| `screens/accounts_v2/detail/account_detail.state.ts` | **New.** Identical shape to V1 (`isEditing`, `isAdjustVisible`, `isArchiveVisible`, `isSaving`, `isAdjusting`, `isArchiving`). |
| `screens/accounts_v2/detail/account_detail.anim.ts` | **New.** Same `headerScale` + Fade entering/exiting as V1. |
| `screens/accounts_v2/detail/components/balance_hero.tsx` | **New.** Replaces `mini_chart.tsx`. Props: `account: Account`. Type-aware caption + color. |
| `screens/accounts_v2/detail/components/adjust_balance_sheet.tsx` | **New.** `Sheet`-based (size="sm"). Migrated from actions-sheet. |
| `screens/accounts_v2/detail/components/adjust_balance_sheet.state.ts` | **New.** Identical to V1 (`input`, `error`, `initialize`, `reset`). |
| `screens/accounts_v2/detail/components/archive_confirmation_dialog.tsx` | **New.** RN `Modal`, re-skinned to tokens + `Button`. |
| `screens/accounts_v2/add_account/index.tsx` | **New.** Near-copy of `onboarding_v2/add_account/index.tsx` minus ProgressDots, with back-arrow + `router.back()` on save. |
| `screens/accounts_v2/add_account/add_account.hook.ts` | **New.** Copy of V1 main-app hook (`useAddAccountApp`), or align with onboarding_v2's hook shape. Same schema, same `addAccount` call, `router.back()` on submit. |
| `screens/accounts_v2/add_account/add_account.anim.ts` | **New.** Same `btnAnim` + pill anim as onboarding_v2. |
| `screens/accounts_v2/add_account/components/type_pill.tsx` | **New.** HeroUI `Pressable` + tokens, matching `onboarding_v2/add_account/components/type_pill.tsx`. |

**Modified (during §9a):**

| File | Action |
|---|---|
| `app/(app)/accounts/[id]/index.tsx` | Flag-branch component (temporary). |
| `app/(app)/accounts/add_account/index.tsx` | Flag-branch component (temporary). |
| `constants/strings.ts` | Add §6 keys (most account strings already exist; only a few new caption keys needed). |
| `constants/feature_flags.ts` | `newAccounts` stays `false` through dev; flip to `true` in the promotion commit. |

**Cleanup (§9a cleanup commit):**

| Path | Action |
|---|---|
| `screens/accounts/` | Delete V1 tree (detail + add_account). |
| `screens/accounts_v2/` | Rename → `screens/accounts/`. |
| `app/(app)/accounts/[id]/index.tsx` | Restore one-liner. |
| `app/(app)/accounts/add_account/index.tsx` | Restore one-liner. |
| `constants/feature_flags.ts` | Remove `newAccounts`. |

### 4.3 Store / state / hook split (unchanged shapes)

Per CLAUDE.md store/state convention. §9 makes **no shape changes** — it copies V1's state stores verbatim into V2, then the cleanup rename makes them canonical:

- `account_detail.state.ts` — UI state (six booleans). Wrapped under `state: {}`, flat setters, `reset()` = `set({ state: INITIAL_STATE })`. Already conformant.
- `adjust_balance_sheet.state.ts` — UI state (`input`, `error`). Already conformant.
- No `.store.ts` in the detail folder — account *data* lives in the global `store/account.store.ts` (`useAccountStore`), which §9 does not touch.
- `add_account` has no local state store — RHF holds the form; no `.store.ts`/`.state.ts` needed (matches onboarding_v2).

The hook return contract (`{ state: {...}, ...flat actions }`) is preserved exactly from V1.

### 4.4 Data layer — NO changes

§9 touches **zero** database files. No migrations, no schema changes, no new queries.

- `database/accounts.ts` (`getAccounts`, `addAccount`, `updateAccount`, `archiveAccount`, `setAccountBalance`) — unchanged.
- `database/account_stats.ts` — unchanged (and not used by the detail screen; stats are a dashboard concern).
- `database/entities/account.entity.ts` — unchanged.
- `repositories/account.repository.ts` — unchanged.
- `store/account.store.ts` — unchanged.

This keeps §9's blast radius small: it is presentation-only plus one sheet-mechanism swap.

### 4.5 Reused primitives & helpers

- `components/ui/screen.tsx` (`Screen`, `ScreenScroll`), `back_button.tsx`, `button.tsx`, `input.tsx`, `text.tsx`, `box.tsx`, `pressable.tsx`, `sheet.tsx` — all consumed, none modified.
- `utils/format_amount.ts` (`formatAmount`) — reused.
- `utils/schemas/add_account.schema.ts` — reused unchanged.
- §5's `availableCreditColor` thresholds (currently a private fn in `screens/dashboard/components/account_card.tsx`) — the balance hero needs the same utilisation→color logic. **Decision:** do not import across screen domains. Reimplement the three-threshold function locally in `balance_hero.tsx` (it is 4 lines). A shared `utils/credit.ts` extraction is tempting but is a cross-domain refactor outside §9's brief — defer. (Recorded for [tariq] review; if the reviewer prefers extraction, that is a non-critical call.)

### 4.6 `Sheet` size choice

Adjust Balance uses `size="sm"` (50% snap). Rationale: one labelled input + optional error + a two-button footer. `lg` (92%) would float a tiny form in a vast empty sheet — wrong for a single-field override. The §4 form sheets used `lg` because they had icon grids + color rows + multiple fields; this one does not. The `Sheet` primitive's keyboard handling (`keyboardBehavior="interactive"`, `android_keyboardInputMode="adjustResize"`) already solves the decimal-pad-overlap case.

### 4.7 Performance

Negligible. Both screens are simple, non-virtualised forms. No list, no heavy compute, no new render cost. The `Sheet` short-circuits unmounted content behind `visible`. Cold-start budget (<2s mid-range Android) is unaffected — §9 adds no startup work, no new dependency (it *removes* one in §9b).

### 4.8 Risks & mitigations

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Adjust sheet `size="sm"` clips on very small fonts/large display-scale | Low | Low | Single field; `sm` = 50% is generous. If QA flags it, bump to a custom `snapPoints={['55%']}`. |
| R2 | Re-skin alters detail visuals enough to need [marcus] re-review | Medium | Low | PR ships before/after screenshots; [marcus] reviews before flag flip. |
| R3 | `newAccounts` flag flip exposes a regression | Low | High | Local QA both paths before flip; flag exists to gate exposure. |
| R4 | Balance hero CC available-credit math diverges from §5 `AccountCard` | Low | Low | Reuse identical thresholds; A-02/E-2 worked examples lock the values. |
| R5 | §9b deletes the dep before §8's `pay_sheet` migrates → build breaks | Low | **High** | **Hard gate** (§7): §9b PR explicitly blocked until §8 + §9a both on `main`. Grep for `react-native-actions-sheet` importers must return zero before deletion. |
| R6 | Removing the patch breaks something that depended on the patched behaviour | Low | Medium | The patch only fixed actions-sheet internals; once no consumer imports the lib, the patch is dead code. Verify zero importers, then delete dep + patch together. |
| R7 | Hex/spacing literals sneak in during re-skin | Medium | Low | oxlint catches hex literals; review verifies tokens. Runtime account-color hex via `style={{}}` is the only allowed inline color (documented idiom). |
| R8 | Edit/adjust/archive handler regressions during hook copy | Medium | Medium | Hook is copied verbatim (logic unchanged); A-01..A-12 logic tests guard the math/validation. |

---

## 5. Testing Strategy

Logic-only per CLAUDE.md (no UI render tests — the 47 `.tsx` render tests were removed 2026-05-23). Snake_case filenames in `__tests__/`.

### 5.1 Adjust-balance validation — `__tests__/screens/accounts/adjust_balance_validation.test.ts`

The parse-and-validate logic currently lives inline in `adjust_balance_sheet.tsx`'s `handleSave`. **Extract it to a pure helper** (e.g. `parseAdjustInput(raw: string): { ok: true; value: number } | { ok: false }`) so it is unit-testable without rendering. Tests: A-01, A-02, A-03, A-04.

### 5.2 Edit schema — `__tests__/screens/accounts/edit_account_schema.test.ts`

Cover the `editSchema` refine: A-07 (duplicate), A-08 (self-name allowed), name required / too-long.

### 5.3 Add schema — `__tests__/utils/schemas/add_account_schema.test.ts`

Audit existing coverage; fill gaps for A-10 (CC needs limit), A-11 (interest needs APR), duplicate-name superRefine. Do not duplicate existing cases.

### 5.4 Repository — `__tests__/repositories/account_repository.test.ts`

Audit/fill: A-05 (adjust = `setAccountBalance` only, no transaction), A-06 (`opening_balance` untouched), A-09 (`current_balance === opening_balance` on add), A-12 (archive flips flag, leaves transactions). These may already exist from §2/earlier — extend, don't duplicate.

### 5.5 Hook — `__tests__/screens/accounts/account_detail_hook.test.ts`

`handleAdjustBalance` calls `adjustBalance` then closes the sheet; `handleArchive` archives then `router.back()`; `onBack` exits edit when editing else pops. Mock the store + router.

### 5.6 Coverage

CLAUDE.md thresholds hold: 80% lines · 95% functions · 100% branches.

---

## 6. Strings (`constants/strings.ts`)

Most account copy already exists (`accountDetail*`, `adjustBalance*`, `u4*`, `o4*`, `typeBank` … `typeCreditCard`, `errBalanceInvalid`, `errNameDuplicate`, etc.). §9 adds only the new balance-hero caption keys:

| Key | Value |
|---|---|
| `accountHeroCurrentBalance` | "Current Balance" (or reuse existing `accountDetailBalance` — confirm at impl) |
| `accountHeroOpening` | `(amount: string, currency: string) => \`Opening ${amount} ${currency}\`` |
| `accountHeroAdjusted` | "adjusted" |
| `accountHeroAvailable` | `(avail: string, currency: string, limit: string) => \`Available ${avail} ${currency} of ${limit}\`` |

No string is renamed or removed during §9a. (If `accountDetailBalance` = "Current Balance" already suffices for the hero label, the first new key is dropped — implementor's call, non-critical.)

---

## 7. §9a / §9b Split & Gating (CRITICAL)

§9 is split into two PRs (or PR groups) with an explicit dependency gate.

### §9a — Accounts domain rebrand

- Build `screens/accounts_v2/`, flag-branch routes, migrate `adjust_balance_sheet` to `Sheet`, re-skin everything, promote (`newAccounts → true`), cleanup-rename.
- **Parallel-safe with §8.** §9a touches only `screens/accounts/**`, the two account route files, `constants/strings.ts`, and `constants/feature_flags.ts`. It does **not** touch the `react-native-actions-sheet` dependency or patch. It can proceed concurrently with §8's Commitments work.
- After §9a merges, the only remaining `react-native-actions-sheet` importer in the whole codebase is `screens/commitments/detail/components/pay_sheet.tsx` (owned by §8).

### §9b — Delete `react-native-actions-sheet` dep + patch

- **Single, small PR.** Removes the `"react-native-actions-sheet": "^10.1.2"` line from `package.json`, deletes `patches/react-native-actions-sheet+10.1.2.patch`, and updates CLAUDE.md to delete the "Bottom Sheets — LEGACY" phase-out section.

**GATE (hard, blocking):** §9b may only land after **BOTH** of the following are merged to `main`:

1. **§8** — `pay_sheet.tsx` migrated off `react-native-actions-sheet` (Commitments domain).
2. **§9a** — `adjust_balance_sheet.tsx` migrated off `react-native-actions-sheet` (this section).

**Pre-merge verification for §9b** (must all pass):

```bash
# Zero source importers of the legacy lib:
grep -rn "react-native-actions-sheet" screens/ components/ utils/ store/ app/   # → must be empty
# Only package.json + the patch + CLAUDE.md should reference it before deletion.
grep -rln "react-native-actions-sheet" . --include='*.ts' --include='*.tsx'      # → empty after the above
```

Then run the full pre-push CI parity chain (CLAUDE.md `Commands`) — `expo prebuild --no-install` must still succeed without the dep.

**Why this is a critical trigger.** Deleting a dependency + its patch is a **high-blast-radius / new-dependency-surface change** (CLAUDE.md critical triggers #3, #4). §9b is therefore escalated to the user before merge, regardless of autonomous-team mode. §9a is routine (no dep change) and proceeds under team approval.

**Sequencing summary (for [sarah]):**

| Step | PR | Depends on | Gate |
|---|---|---|---|
| 1 | §9a build + promote + cleanup | nothing (parallel with §8) | team-approved |
| 2 | §8 `pay_sheet` migration | §8 design/plan | team-approved (its own section) |
| 3 | §9b dep+patch deletion | **§8 step 2 AND §9a step 1 both on `main`** | **user-escalated (critical trigger)** |

---

## 8. Acceptance Criteria

§9 ships when **all** are true:

**§9a:**
1. After cleanup, `screens/accounts_v2/` no longer exists; `screens/accounts/` holds the migrated detail + add_account; both route files are one-liners; `FeatureFlags.newAccounts` is removed.
2. Account Detail renders with `Screen`/`ScreenScroll`, HeroUI primitives, zero `StyleSheet.create` for layout color/spacing (runtime account-color hex via `style={{}}` excepted), zero `Colors.dark.*` imports in the new tree (use `className` tokens / `theme_tokens` for module-level).
3. The balance hero replaces `MiniChart`; CC balance renders red; non-CC renders gold; opening/available captions are correct per §3.7 worked examples.
4. Inline edit (name + color) works; duplicate/empty/too-long name validation preserved; `beforeRemove` cancels edit-on-back.
5. Adjust Balance is a declarative `Sheet` (no `react-native-actions-sheet` import, no `.show()`/`.hide()` ref); validation (`≥0`, finite) preserved; saves via `adjustBalance`; no transaction created; `opening_balance` untouched.
6. Archive dialog is a re-skinned RN `Modal`; CC warning shown for credit cards; archive sets `is_archived = 1`, preserves transactions, pops the screen.
7. Add Account mirrors `onboarding_v2/add_account` (minus ProgressDots), reuses the existing schema, pops on save.
8. All logic tests (§5) pass at CLAUDE.md thresholds. No new hex/spacing literals; no new copy outside `constants/strings.ts`.
9. Smoke check on iPhone SE + Pixel 4 before the flag flip (device QA gate — user-walked).

**§9b:**
10. `react-native-actions-sheet` removed from `package.json`; `patches/react-native-actions-sheet+10.1.2.patch` deleted; CLAUDE.md legacy-sheet section removed.
11. `grep -rn react-native-actions-sheet` over source returns zero.
12. Full CI parity chain green (incl. `expo prebuild --no-install`).
13. §9b merged only after §8 (`pay_sheet`) and §9a are both on `main` (gate honoured); user-escalated before merge.

---

## 9. Open Questions for Sign-off

Genuine product/design ambiguities for the user to resolve at the spec sign-off gate (everything else is team-decided):

1. **Balance hero scope.** [marcus] proposes replacing the dead `MiniChart` with a static, information-rich balance hero (opening/available context) — *not* a real trend chart (which needs new balance-snapshot persistence, out of scope). Confirm: static hero now, real history chart deferred to post-rebrand? Or keep a minimal balance bar to stay closer to V1?

2. **CC available-credit on the detail hero.** Surfacing `Available X of limit` (colored by utilisation) duplicates context the §5 dashboard `AccountCard` already shows. Confirm this is desirable on the detail screen too, or should the CC hero show only the owed balance + a simpler caption?

3. **Editable credit-card fields.** V1 lets you edit only `name` + `color` — never the CC fields (limit, APR, due day, min payment, revolving). A user who mistypes their credit limit at creation currently cannot fix it without archiving + recreating. Is expanding edit to cover CC fields in scope for §9, or explicitly deferred? (Recommend: **defer** — it expands scope and touches the schema; flag if you want it.)

4. **`accountDetailBalance` reuse vs new key.** Minor: reuse the existing "Current Balance" string for the hero label, or add a dedicated `accountHeroCurrentBalance`? (Recommend: reuse. Non-critical — noting for completeness.)

5. **§9b user-escalation timing.** Confirm you want to personally approve the §9b dep+patch deletion PR (per critical-trigger policy), versus pre-authorising it now so the team can merge it the moment the §8 + §9a gate clears.
