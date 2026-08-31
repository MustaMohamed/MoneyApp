# MA-onboarding-redesign — Specification

[Mockup — round 5, approved 2026-08-06, 31 frames](assets/mockup.html) · [Locked functional detail, 2026-07-23](assets/locked-design-2026-07-23.md) · [Scope, locked at gate 1](scope.md)

**Reading order for an agent picking up a task in this scope:** this file, then the mockup section that draws the screen you are building (A shell · B N1 · C N2 · D colour sheet · E N3 · F N4), then the task file.

**Authority.** The mockup is the visual authority. `locked-design-2026-07-23.md` is the **functional** authority only — every visual statement in it is void. `scope.md` is locked; the three decisions in its *Decisions resolved at gate 1* section are settled and are not re-opened by any task in this scope.

---

## Summary

Rebuild the four onboarding routes (`src/app/(onboarding)/{welcome,add_account,more_accounts,ready}`) on HeroUI Native primitives, collapse the duplicated account form into one shared surface owned by the Accounts module, replace the three divergent colour-swatch rows with one 32-colour bottom sheet, correct the N4 opening summary, and apply the Cross Fan logo.

No migration. No new dependency. No native module. No route added or removed. No change to onboarding business rules 1–8 (CLAUDE.md § Business Rules) or to resume-after-force-close behaviour.

**Constraint that dominates every call in this document:** cold start under 2 s on mid-range Android. N1 is the app's very first screen; anything added to it is paid on first paint by every new user.

### The five verified findings every task is designed around

1. **HeroUI surfaces carry no shadow in this app.** `--surface-shadow: 0 0 0 0 transparent inset` in dark mode — `node_modules/heroui-native/src/styles/variables.css:146`. MoneyApp is dark-only in practice. Surfaces separate by **fill and hairline border only**. Do not spec, draw, or review a surface that relies on elevation.
2. **The `Card` = `Surface` trap.** `heroui-native` skill, § *Card = Surface trap*. `Card` wraps `Surface` (`p-4 rounded-3xl shadow-surface overflow-hidden`, `bg-surface`, **no border ever**). Migrating a `View` to `Card` needs explicit `border border-separator`, `rounded-2xl`, `p-0`, plus `style={{ boxShadow: 'none' }}` — `shadow-none` does not override the token, and neither does the older `` `elevation`/`shadowOpacity` `` pair (uniwind keys the token as `boxShadow`, a separate RN pipeline). CI stays green; only device QA and the emulator run catch it.
3. **`src/components/ui/button.tsx:31`** — `const content = isLoading ? Strings.loading : label;`. Every CTA in the app reads "Loading..." while saving. The design needs "Saving…" and "Opening…". Fixed once, app-wide, in MA-004.
4. **`scripts/design-tokens.js` does not emit `Colors.shared` or `AcctTokens`.** `readColors()` reads `global.css` only; `readNumericGroup()` handles `Type`/`Radius`/`Spacing`/`Size` from `theme.ts`. Both omitted groups are real tokens the design is built from.
5. **`@react-native-community/datetimepicker` must stay OUT of `app.json` `plugins`** (CLAUDE.md § Expo Dev Client). MA-003 is the only task that touches `app.json`; its plan must diff `app.json` after any `expo prebuild` / `expo install` invocation.

---

## Product & UX — @marcus

Lifted from the mockup rather than restated. Where this section gives a number, the number is load-bearing and appears in a token (see *Architecture § Geometry tokens*).

### The zero-shift contract

Mockup § A, and `locked-design-2026-07-23.md` § *Zero-Shift Geometry Contract* items 1–12 (still current; that section is structural, not visual).

Nothing moves when an error appears, the keyboard opens, a CTA enters loading, or the credit slot expands. Three devices carry it:

| Device | Height | Where |
|---|---|---|
| Footer status track | **34** | Always mounted, never empty. Idle carries a per-screen footnote; failure replaces that footnote in the identical box. Mockup A2/A3. |
| Field message rail | **20** minimum | Under every field. Carries helper copy when clean, the error when not. Mockup C1 vs C2 — "two errors appeared and not one row moved". |
| Reserved credit slot | ~60 | Dashed one-line hint when type ≠ Credit Card; the real card-details block in exactly that position when it is. Mockup C1 → C5. |

At accessibility font sizes the rails are a **minimum**, not a fixed height: copy grows into the scroll viewport and is never clipped. Fixed tracks (header, rail, CTA) use explicit line-height and `numberOfLines`.

**The status track is plain `Typography`, not `Alert`.** `Alert` is a bordered box with its own padding; in the footer it would make the footer taller in the error state — the exact defect the track exists to prevent. Mockup rationale, § *Every control still maps to something that already exists*.

### Shell — mockup § A

Four tracks on every route: header **56** (`Size.headerHeight`) · progress rail **55** · flexible content viewport · footer = status track **34** + CTA **52** (`Size.ctaHeight`).

- Progress rail: four segments in a stable grid, completed = flat `--accent`, remaining = `--muted`. Step changes colour, never segment width. Label row reads `Step N of 4` + the step's name (`Choose your currency` · `Add your first account` · `Add more accounts` · `Review and finish`). Segments are hidden from assistive tech; the label announces `Step N of 4`.
- Header: `StackHeader` shape. N1 swaps the back button for the Cross Fan mark + `MoneyApp` wordmark and a right-aligned `Setup` micro-label, **at the same track height**.
- CTA: HeroUI primary `Button`, flat fill, `border-width: 0`, no gradient, no ring, no shimmer, no custom motion child. See *Architecture § Known design/codebase disagreements* — the shipped wrapper is not flat today.
- Per-screen idle footnotes: N1 `You can change this later in Settings.` · N2 `Saved on this phone. Nothing is uploaded.` · N3 `One account is enough to start. You can add more any time.` · N4 `This is your starting point, not your net worth.`
- Retry is always the CTA itself. No second button ever appears in the footer.

### N1 Welcome — mockup § B (B1–B5)

Composition: ghost numeral `01` at 5 % opacity, 34 pt gold rule, eyebrow `Private by design`, headline `Your money.` / `Finally clear.` at 42 px left-aligned. `Finally clear.` is gradient-filled — the one unproven technique, see MA-002.

Body copy, currency `RadioGroup` of two 76 pt rows (`Egyptian Pound` / `Every total in the app is shown in EGP.` · `US Dollar` / `Totals convert to USD using the rate you save.`), lock-icon trust row. Selection is HeroUI's own language: accent border + `--accent-soft` fill + solid `Radio` circle. **No halo, no glow.**

Two-hue ambient wash (gold top-left, Nile teal right) sits on the shell **behind the scroll view**, not inside it — two `RadialGradient`s in one full-screen `Svg`.

B5 is deliberate: **N1 has no empty state.** Business rule 5 pre-selects EGP; startup owns migrations/onboarding/accounts before any onboarding route mounts.

Four blocks rise staggered at 0/120/240/360 ms, opacity + 10 pt translate, 500 ms, **once**, disabled under reduce-motion.

### N2 Add your first account — mockup § C (C1–C6)

3-column, 5-tile, left-aligned account-type grid at 114 × 76 pt. The selected tile gets `hero_shell.tsx`'s full formula (diagonal gradient + 26 px grid texture + corner glow + hairline gold border + gold icon chip); the other four are flat surface. Spring pop 0.32 s on selection. Bank pre-selected.

Fields, in order: **Account name** (rail: `Must be different from your other account names.`) · **Opening balance** + **Currency** sharing one row, flex 1.5 / 1 (rails: `Today's balance.` / blank) · **Account colour** trigger row (rail: `Used for this account's dot everywhere in the app.`) · reserved credit slot.

Credit Card selected → balance label becomes **`Amount currently owed`** (rail: `Enter 0 if the card is paid off.`), and the slot opens in place with header `Card details` + a `4 fields` chip: **Credit limit** (`Required.`) · **Minimum payment** `optional` (`Can't exceed what you owe.`) · **Due day** `optional` (`Day of the month.`, placeholder `1–31`) · **Track interest** HeroUI `Switch` (`Adds an APR field so MoneyApp can estimate interest.`) → APR appears *inside* the block below the switch.

Icons per mockup § *Icon legend*: `bank` · `cellphone-nfc` · `wallet` · `piggy-bank` · `credit-card`. These already match `TYPE_OPTIONS` in `src/modules/accounts/components/account_type_pill.tsx:26-37`.

CTA `Save and continue`, busy label `Saving…`. Back disabled during the write.

### The 32-colour sheet — mockup § D (D1, D2)

All 32 visible at once, **no scrolling**, 8-column chart × 2 rows per tone block. Column position means the same family in both blocks. Cells 41.25 × 44 with 2 pt horizontal `hitSlop`. Selection = 2 pt `--foreground` ring + check glyph, drawn inside the cell's permanent 3 pt padding so **selecting never resizes a tile or reflows the grid**. Tick colour is contrast-picked per swatch, never assumed white (near-black on Sand soft, bone-white on Nile rich).

Sheet: project `Sheet` (`size="md"`), title `Account colour`, close action, a preview row (large swatch + family name + `Rich · deeper tone, used on cards and tiles`), two labelled tone blocks (`Rich` / `for cards and tiles`, `Soft` / `same 16 families, lighter`), sticky footer CTA `Use this colour`. Close button and swipe-down **discard**; only the CTA commits.

Accessible name per swatch: `Nile Teal, rich` / `Nile Teal, rich, selected`.

**Verify in review:** HeroUI's `BottomSheet.Close` renders a `size="sm"` icon button and may need `hitSlop` to clear 44.

### N3 Add more accounts — mockup § E (E1–E5)

Ghost numeral `03`, gold rule, success `Chip` (soft-success, 28 pt) `First account saved`, headline `Anything else\nto add?`, body copy. Flat `ListGroup` of accounts: fixed dot / name+type / amount+currency columns; long names truncate to one line; **each row shows its balance in its own currency and there is no running total** (a total needs a rate; that problem lives on N4 only). Secondary `Add another account` (52 pt). CTA `Review setup`.

E3 empty guard: a resumed N3 with zero accounts **redirects to N2 before this can paint**; the frame exists because the resolver can be wrong and a broken success screen is worse than an honest dead end. It has no ghost numeral, no gold rule, no success chip.

E4/E5: no list skeleton, ever. A failed step write **preserves the list and the success chip** — the copy says so explicitly.

### N4 Ready to start — mockup § F (F0–F9)

Eyebrow `Setup complete`, gold rule, headline `You're ready.`, body copy, then the hero card, then three summary rows (`Base currency` / `Accounts` / `Privacy` → `On device`) at `Size.budgetNamedRowHeight`.

Hero = `HeroShell` arranged the way `hero_card.tsx` arranges it: 24 pt gold circle chip + label `Starting net position`, the value slot, the caption slot, then an `overlayWhite7` pill row.

**One deliberate, user-visible deviation, Marcus's call and reversible:** the number renders at `Type.amountEntry` (**40 px**), not `hero_card.tsx:141`'s `ms(32)`. Consequences, both handled: value slot **52** (= `Size.ctaHeight`), card grows ~20 pt to a composed **194 pt** (`12+24+12+52+4+34+12+24+20`). N4 has ~150 pt of slack at base text size.

Three rules that survive from round 3:
1. **The value slot never wraps** — one line, vertically centred, left-aligned, with a step-down rung: **drop to 28 px when the formatted amount exceeds 13 characters**. `Exchange rate needed` renders at 22 px with the `alert-outline` glyph.
2. **The caption slot is never empty** — every one of the seven states has a caption that earns its 34 pt.
3. **The number is never coloured by sign** — `Colors.dark.gold` in every state, never red, never green. The sign carries the fact, the caption carries the meaning.

CTA `Open my dashboard`, busy label `Opening…`. This is the **only** place onboarding is marked complete (business rule 1). F9: completion failure preserves the hero, does not blank or recompute, and retries on the same CTA.

The seven states and their copy are in *Financial Logic* below, because which state renders is a money decision, not a UX one.

### Accessibility — mockup § *Accessibility*, computed not assumed

Contrast against `--background` #0F1923: `--foreground` ≈ 18:1 · `--warning` 9.09:1 · `--accent` 7.78:1 · `--success` 6.56:1 · `--danger` 4.81:1. Against the hero's lightest gradient stop #223060: gold 5.56:1, warning 6.50:1. `--muted` is 2.36:1 — **decorative only, never carries text** (it is the progress-rail track).

`--content-secondary` is 4 % under the AA floor app-wide (4.33:1 on background, 3.77:1 on surface). Per `scope.md` decision 2 this token is **not** being changed in this scope; onboarding handles it by rule: **anything a user must read is full-strength; the muted colour is confined to genuinely redundant labels.** Every task in this scope inherits that rule.

Targets: currency rows 358 × 76 · type tiles 114 × 76 · fields and colour trigger 44 tall · colour tiles 41.25 × 44 + hitSlop 2 → 45.25 × 44 · back button 36 visual + hitSlop 8 → 52 · `Add another account` 52.

**The headline carries `accessibilityRole="header"` and an explicit `accessibilityLabel`** — SVG text is not read as text by a screen reader. That label is the only thing between a blind user and a silent first screen. (`header`, not `image`, per @marcus 2026-08-06 — the role describes what the element is to a user, not how it is drawn; `image` makes TalkBack announce "image" after the words, and `header` keeps both MA-002 treatments identical to a screen reader.)

### Motion budget — mockup § *Motion inventory*

Three animations in the whole flow, nothing loops:

| Animation | Where | Fires |
|---|---|---|
| Staggered fade + 10 pt rise, 500 ms, 0/120/240/360 ms | N1 four blocks, N3 two blocks, N4 three blocks | Once, on mount |
| Spring pop 0.32 s | N2 selected type tile | Per selection |
| Spinner rotation | Busy CTA only | While the write is in flight |

Under `AccessibilityInfo.isReduceMotionEnabled`, **neither of the first two runs at all.**

### Explicitly not built

Separate revolving-balance field · inline "add a rate" action on N4 · two-page credit form · horizontally scrolling swatch rows · N1 illustration and card-stack hero art · breathing orb · looping or one-shot shimmer · gradient-fill-plus-inset-highlight on ordinary surfaces · glassmorphism / `expo-blur` (not installed) · running total on N3.

---

## Financial Logic — @layla

### Starting net position — the corrected N4 summary

Replaces `computeTotalBalance` in `src/modules/onboarding/screens/onboarding/ready/ready.helpers.ts`, which today is `accounts.reduce((sum, a) => sum + a.current_balance, 0)` — currency-blind and sign-blind. That is the bug named in `scope.md` § *Why now*.

**Inputs:** the non-archived account snapshot (`opening_balance`, `currency`, `type`), the base currency (`useOnboardingStore.baseCurrency`), and the exchange rate with its provenance (`useCurrencyStore.rate`, `useCurrencyStore.rate_updated_at`, `useCurrencyStore.isManualOverride` — *the third added 2026-09-01 (#350); see the gate correction below*).

**`exchange_rate` is EGP per USD.** USD → EGP **multiplies**; EGP → USD **divides**. Never symmetric. This is the contract in the `money-rules` skill and in `resolveTransactionAmounts` (`src/modules/transactions/domain/transaction_amounts.ts:50-66`).

**Formula** (`locked-design-2026-07-23.md` lines 343-346, unchanged):

```text
sign = -1 for AccountType.CreditCard; +1 otherwise
Starting net position = round2( Σ sign × round2(converted opening_balance) )
```

`round2` is `roundMoney` from `src/utils/money.ts` — banker's rounding, half-even, 2 dp.

**Rate validity gate.** A rate is required **only** when at least one account's currency differs from the base currency. The rate counts as usable when **`rate_updated_at !== null` AND `rate` is finite and > 0**. `useCurrencyStore`'s `INITIAL_STATE` is `{ rate: 50, rate_updated_at: null }` (`src/modules/currency/store/currency.store.ts:23-29`) — **50 is an unverified fallback and must never reach this number.** When conversion is required and the rate is not usable, the resolver returns the refusal outcome; it does not substitute a rate, zero, a partial total, or a direct sum of unlike currencies.

**Corrected 2026-09-01 (#350) against the shipped code — the gate above is narrower than the one that shipped.** Provenance has two sufficient sources and either alone opens the gate: `rateUpdatedAt !== null`, the marker recording *when* the rate was written, or `isManualOverride`, the flag recording *that* the user typed it. `src/modules/accounts/domain/account_aggregation.ts:190-191`:

```ts
export function isRateUsable({ rate, rateUpdatedAt, isManualOverride }: RateProvenance): boolean {
  return (rateUpdatedAt !== null || isManualOverride) && Number.isFinite(rate) && rate > 0;
}
```

The refusal contract stated above is unchanged, and `50` is still refused, because the current `INITIAL_STATE` (`src/modules/currency/store/currency.store.ts:23-29`) carries neither source:

```ts
const INITIAL_STATE = {
  rate: 50,
  lastFetched: null as string | null,
  isManualOverride: false,
  rate_updated_at: null as string | null,
  hasLoaded: false,
};
```

Neither `test.each` table below is extended, and every row of both stays exactly as written: each corresponds to `isManualOverride: false`, which the two mirroring suites supply explicitly at the `it.each` call site covering every row beneath it — `__tests__/starting_net_position.test.ts:196` (`describe` at `:185`) and `__tests__/approximation_pill.test.ts:142` (`describe` at `:132`). Neither table can structurally express an override carrying no marker, which is the case the widening exists for; that row lives at `__tests__/accounts/account_aggregation.test.ts:96-99`. The live record of the gate is `docs/adr/2026-08-19-dashboard-net-worth-refusal.md` §4.

**Never contribute:** `credit_limit`, `revolving_balance`, `minimum_payment`, `current_balance`. Opening balances only.

**Zero and negative results are valid outcomes, not errors.**

#### Executable table — `test.each` shape

Columns: `accounts` (type / currency / opening_balance) · `base` · `rate` · `rateUpdatedAt` · expected outcome. `bank`/`sav`/`wal` are non-credit types; `cc` is `AccountType.CreditCard`.

| # | accounts | base | rate | rateUpdatedAt | expected |
|---|---|---|---|---|---|
| 1 | bank EGP 48250, sav EGP 100000 | EGP | 50 | null | `{ kind: 'amount', value: 148250 }` — no conversion needed, unusable rate is irrelevant |
| 2 | bank EGP 48250, wal USD 1350, cc EGP 8450 | EGP | 48.6 | set | `{ kind: 'amount', value: 105410 }` (48250 + 65610 − 8450) |
| 3 | bank EGP 48250, wal USD 1350, cc EGP 8450 | EGP | 50 | **null** | `{ kind: 'rate-needed', foreignCount: 1 }` |
| 4 | bank EGP 1000, cc EGP 2234.56 | EGP | 50 | null | `{ kind: 'amount', value: -1234.56 }` |
| 5 | bank EGP 5000, cc EGP 5000 | EGP | 50 | null | `{ kind: 'amount', value: 0 }` |
| 6 | bank EGP 12000 | EGP | 50 | null | `{ kind: 'amount', value: 12000 }` |
| 7 | cc EGP 8450 | EGP | 50 | null | `{ kind: 'amount', value: -8450 }` |
| 8 | bank USD 1000, sav EGP 4860 | USD | 48.6 | set | `{ kind: 'amount', value: 1100 }` — EGP→USD **divides** |
| 9 | bank EGP 100 | USD | 48.6 | set | `{ kind: 'amount', value: 2.06 }` — 100/48.6 = 2.0576…, half-even → 2.06 |
| 10 | bank EGP 100 | USD | 48.6 | **null** | `{ kind: 'rate-needed', foreignCount: 1 }` — base USD makes every EGP account foreign |
| 11 | bank USD 100 | EGP | **0** | set | `{ kind: 'rate-needed', foreignCount: 1 }` — non-positive rate is not usable |
| 12 | bank USD 100 | EGP | **NaN** | set | `{ kind: 'rate-needed', foreignCount: 1 }` |
| 13 | bank EGP 1000, **archived** cc EGP 500 | EGP | 50 | null | `{ kind: 'amount', value: 1000 }` — archived excluded |
| 14 | wal USD 0.005, wal USD 0.005 (2 accounts) | EGP | 2 | set | each converts to 0.01, sum 0.02 — round-then-sum, never sum-then-round |
| 15 | cc USD 100, bank EGP 4860 | EGP | 48.6 | set | `{ kind: 'amount', value: -0 → 0 }` (4860 − 4860); assert `Object.is(value, 0)` is not required, `value === 0` is |
| 16 | *(none)* | EGP | 50 | null | `{ kind: 'amount', value: 0 }` — unreachable through valid flow (N3 guard redirects), defined so the resolver is total |

Case 14 is the one that catches a sum-then-round regression. Case 9 is the one that catches a multiply-instead-of-divide regression. Case 3 is the one that catches the unverified-fallback regression, and it is the single most important row in this table.

#### The seven N4 display states — mockup F1–F7

State selection is a function of the resolver's outcome plus the account snapshot. Caption and pills are copy, so they are `Strings`; the *choice* between them is logic and belongs in a pure view-model helper with its own tests.

| Frame | Condition | Value slot | Caption | Pills |
|---|---|---|---|---|
| F1 | `amount`, no foreign accounts, ≥ 2 accounts | `148,250.00 EGP` | `All {n} accounts are in EGP, so nothing needed converting.` | `{n} accounts` · `opening balances` |
| F2 | `amount`, ≥ 1 foreign account converted | `105,410.00 EGP` | `Includes {n} USD account, converted using your saved rate.` | `{n} accounts` · `1 USD = 48.60 EGP` · `≈ 2,169 USD` |
| F3 | `rate-needed` | `Exchange rate needed` (22 px, `alert-outline`, `--warning`) | `Your accounts are saved. Add a rate from the dashboard and this fills in.` | `{n} accounts` · `{k} needs a rate` |
| F4 | `amount` < 0, mixed types | `−1,234,567.89 EGP` | `Your card balances are bigger than your cash and bank accounts right now.` | `{n} accounts` · `opening balances` |
| F5 | `amount` === 0 | `0.00 EGP` | `What you have and what you owe cancel out exactly.` | `{n} accounts` · `opening balances` |
| F6 | `amount`, exactly 1 account, non-credit | `12,000.00 EGP` | `All of it in one account. You can add more from the dashboard whenever you like.` | `1 account` · `opening balance` |
| F7 | `amount`, every account is a Credit Card | `−8,450.00 EGP` | `Your only account is a credit card, so this is what you owe. Add a bank or cash account for the full picture.` | `1 account` (glyph swaps to `credit-card`) · `opening balance` |

**Pluralisation is a two-point problem, not one:** `{n} account(s)` **and** `opening balance(s)` both switch on the same count. Mockup F6 caption: getting this wrong is the "1 accounts" tell.

`F3` is a **warning**, not a danger, and the CTA stays fully enabled. Nothing failed; the app is refusing to guess.

#### The approximation pill — ruled, Tariq partially overruled

Tariq's "hidden when base is USD" is **overruled**: the premise ("converting USD to USD is noise") is correct, but the conclusion doesn't follow — the fix is to convert into the correct currency, not to hide the pill. The app has exactly two currencies (CLAUDE.md: EGP is the ledger base, USD is the only foreign currency), so "the other currency" is always unambiguous — no need to inspect which foreign currency an account snapshot contains.

**Rule.** Let `netPosition` be `resolveStartingNetPosition`'s `value` (only defined when `kind === 'amount'`), and `foreignCount` the count of non-archived accounts whose `currency !== baseCurrency` — the same count `selectReadySummaryState` already needs to choose F1 vs F2, computed the identical way here. **Both pills share one gate; there is no state where one renders without the other:**

```text
pillsVisible = outcome.kind === 'amount' AND foreignCount ≥ 1

ratePill  = pillsVisible ? formatExchangeRate(rate) : hidden        // unchanged — "1 USD = 48.60 EGP" regardless of base; it is the raw stored rate, not base-relative
approxPill.currency = baseCurrency === EGP ? USD : EGP
approxPill.value =
  hidden                                     when !pillsVisible
  round2( netPosition / rate )               when baseCurrency === EGP   // EGP → USD divides
  round2( netPosition * rate )                when baseCurrency === USD   // USD → EGP multiplies
```

`round2` is `roundMoney` — same half-even, 2dp convention as the rest of this section; the pill is a *new* derived quantity (display-only, never persisted, never fed back into `resolveStartingNetPosition`), so its rounding point has to be stated explicitly rather than inherited, and this is that statement.

**`pillsVisible` is false whenever `foreignCount === 0`, independent of whether a usable rate exists.** This is not new — it is exactly what F1 already draws (a saved rate that nothing needed does not earn a pill) — generalised to both base currencies rather than reopened.

**The pill's sign always matches `netPosition`'s sign — never hidden, never inverted.** Hiding or flattening the sign on the pill while the hero number carries it would make the two disagree, which is exactly the kind of thing that "could mislead a user into false confidence" — the pill is the same fact in the other currency, not a separate, friendlier one.

**Sanity check for @dev, not a requirement to implement:** `approxPill.value`, converted back through the same rate in the opposite direction, reproduces exactly what `resolveStartingNetPosition` would output if it were run again with `baseCurrency` flipped and the same accounts — see worked example 3 below. Useful for catching a swapped multiply/divide while writing the test rows.

**The four base × rate combinations, `foreignCount` noted because the pill's gate needs it and "rate saved" alone is not sufficient:**

| Base | Rate | `foreignCount` | Outcome | Rate pill | `≈` pill |
|---|---|---|---|---|---|
| EGP | usable | 0 | `amount` (nothing converted) | hidden | hidden |
| EGP | usable | ≥ 1 | `amount` (converted) | `1 USD = R EGP` | `≈ round2(value / R) USD` |
| EGP | unusable | 0 | `amount` (rate irrelevant) | hidden | hidden |
| EGP | unusable | ≥ 1 | `rate-needed` | hidden | hidden |
| USD | usable | 0 | `amount` (nothing converted) | hidden | hidden |
| USD | usable | ≥ 1 | `amount` (converted) | `1 USD = R EGP` (unchanged) | **`≈ round2(value × R) EGP`** ← the overrule |
| USD | unusable | 0 | `amount` (rate irrelevant) | hidden | hidden |
| USD | unusable | ≥ 1 | `rate-needed` | hidden | hidden |

**Worked examples**

1. Base EGP, `bank EGP 48250, wal USD 1350, cc EGP 8450`, rate 48.6 (usable) → `netPosition = 105410.00 EGP` (F2, unchanged from the executable table above). `approxPill = { currency: USD, value: round2(105410.00 / 48.6) } = { USD, 2168.93 }`.
2. Base USD, `bank USD 1000, sav EGP 4860`, rate 48.6 (usable) → `netPosition = 1100.00 USD` (case 8 above). `approxPill = { currency: EGP, value: round2(1100.00 × 48.6) } = { EGP, 53460.00 }`.
3. Edge case, negative + base USD: `cc EGP 9720, bank USD 100`, rate 48.6 (usable) → `netPosition = round2(100 + (-9720/48.6)) = round2(100 − 200) = -100.00 USD`. `approxPill = { EGP, round2(-100.00 × 48.6) } = { EGP, -4860.00 }`. Sanity check: running the same two accounts through `resolveStartingNetPosition` with `baseCurrency = EGP` instead gives `-9720 + round2(100 × 48.6) = -9720 + 4860 = -4860.00 EGP` — matches the pill exactly, confirming the direction is right in both legs of the round trip.

**Formatting.** The computed value above uses the house rounding rule and must be what `formatCurrencyAmount(value, currency)` receives (`src/utils/format_amount.ts`) — never bare `formatAmount`, which renders 0 dp and silently drops cents (audit M22). **Flag for Marcus, not decided here:** the mockup's F2 pixels show `≈ 2,169 USD` — zero fraction digits, i.e. worked example 1's `2168.93` rounded again for display to a whole unit — which is a second, display-layer rounding step on top of `round2`, distinct from it, and not yet named anywhere. Recommendation: use `formatCurrencyAmount` (2dp, consistent with M22 and with every other amount on this screen) unless Marcus wants the pill's brevity badly enough to justify a documented exception; either way the *value* computed above does not change, only how many of its digits are shown. The rate pill is unaffected — it uses `formatExchangeRate(rate)`, which already produces exactly `1 USD = 48.60 EGP` regardless of base.

**Error case:** the pill selector takes the same `Currency.EGP | Currency.USD`-only input as `resolveStartingNetPosition`; an account snapshot carrying any other currency value is a schema violation upstream of this function, not a state for it to degrade gracefully into — it should throw, not silently render nothing or render a wrong number.

#### Executable table — `test.each` shape

Columns: `#` · `accounts` · `base` · `rate` · `rateUpdatedAt` · `ratePillShown` · `approxPillShown` · `approxCurrency` · `approxValue`.

| # | accounts | base | rate | rateUpdatedAt | ratePillShown | approxPillShown | approxCurrency | approxValue |
|---|---|---|---|---|---|---|---|---|
| P1 | bank EGP 48250, sav EGP 100000 | EGP | 48.6 | set (irrelevant — no foreign accounts) | false | false | — | — |
| P2 | bank EGP 48250, wal USD 1350, cc EGP 8450 | EGP | 48.6 | set | true | true | USD | 2168.93 |
| P3 | bank EGP 48250, wal USD 1350, cc EGP 8450 | EGP | 50 | **null** | false | false | — | — (`rate-needed`, no amount pills at all) |
| P4 | wal USD 1350 | USD | 48.6 | set (irrelevant — no foreign accounts) | false | false | — | — |
| P5 | bank USD 1000, sav EGP 4860 | USD | 48.6 | set | true | **true** | **EGP** | **53460.00** ← overrule, was "hidden" |
| P6 | bank EGP 100 | USD | 48.6 | **null** | false | false | — | — (`rate-needed`) |
| P7 | cc EGP 9720, bank USD 100 | USD | 48.6 | set | true | true | EGP | **-4860.00** — sign preserved, matches worked example 3 |
| P8 | cc USD 173.99 | USD | 48.6 | set (irrelevant — sole account already USD) | false | false | — | — |
| P9 | bank USD 100, cc EGP 4860 | USD | 48.6 | set | true | true | EGP | 0.00 — zero is rendered, never hidden, same rule as F5 |

Case P2 is the control (matches the already-approved F2 frame exactly). Case P5 is the one that catches the "hide instead of fix" regression this ruling exists to prevent. Case P7 is the one that catches a dropped sign or a swapped multiply/divide simultaneously. Case P9 is the one that catches "falsy zero hides the pill," the same footgun the main resolver's zero-is-valid rule already guards against.

### Account form — validation and persistence rules

From `locked-design-2026-07-23.md` §§ *Credit-card fields* / *Financial and Data Rules*, minus the dropped revolving-balance field.

| Field | Rule |
|---|---|
| Account name | Required, ≤ 30 chars, **unique case-insensitively after trimming** across all accounts (business rule 8) |
| Opening balance | Required, non-negative, in the account's own currency, parsed with `parseNonNegativeDecimal` (`src/utils/parse_decimal.ts`) — **not `parseFloat`**. Accepts `5,000`; rejects `5abc`. `roundMoney` before persistence |
| Currency | `Currency.EGP` \| `Currency.USD`; defaults to the onboarding base currency in onboarding, `Currency.EGP` in Settings |
| Account colour | One of the 32 palette values |
| Amount currently owed (Credit Card) | Same field as opening balance, relabelled. Required, non-negative, stored as **positive** `opening_balance`; `0` = paid off |
| Credit limit | **Required and > 0** for Credit Card. Debt greater than the limit stays valid — an over-limit card must be representable |
| Minimum payment | Optional. Blank → `null`; explicit `0` → `0`. **Cannot exceed the amount currently owed** |
| Due day | Optional integer 1–31 inclusive |
| Track interest | Boolean → `interest_tracking` 0/1 |
| APR | Required, **0–100 inclusive** (percentage points — `24.5` means 24.5%, never a fraction), **only while interest tracking is on**, rounded to 2 dp; otherwise persists `null`. Bound ruled below |
| All credit-only fields on non-credit types | Persist `null`; `interest_tracking` persists `0`. `null`, never `undefined` |

**`parseFloat` is the current implementation and it is wrong.** `src/modules/onboarding/screens/onboarding/add_account/add_account.hook.ts:70` and `src/modules/accounts/screens/accounts/add_account/add_account.hook.ts:63` both use `parseFloat(data.balance)`, which is worse than "rejects thousands separators" — it **silently corrupts**. Measured, not assumed: `5abc` → 5, **`5,000` → 5**, `5,000.50` → 5, `1e3` → 1000, `0x10` → 0, `5.5.5` → 5.5, `  7  ` → 7. Every one of those passes `Number.isFinite(n) && n >= 0` and persists. Business rule 6 writes `current_balance = opening_balance`, so a user entering `5,000` starts with a balance of 5 — a 1000× error, silent, on the first number the app ever stores for them. Only `''` and `Infinity` are actually rejected. The schema's `balance` refinement (`src/modules/accounts/utils/add_account.schema.ts:12-19`) uses `parseFloat` too, so `5abc` passes validation *and* persists as 5. The shared mapper and the schema both move to `parseNonNegativeDecimal`.

**`revolving_balance` at creation — ruled.** The form no longer asks (scope.md, team decision 3), so this is a pure derivation, never a validated user input. Tariq's `null`-for-every-account draft is **overruled for Credit Card accounts and confirmed for every other type.**

```text
revolving_balance =
  null   for AccountType !== CreditCard   (unchanged from Tariq's draft)
  0      for AccountType === CreditCard   (overrule)
```

No rounding decision applies to either branch — both are literals, not values computed from `opening_balance` or anything else. That matters: it is *not* "mirror the opening balance," which was Tariq's second, still-correct objection to reopening this. `0` does not depend on `opening_balance`'s value, so it cannot go stale or misrepresent a guess, and it is not a derived/time-relative value stamped into a durable accumulation column — defect class 5 (`.claude/rules/review.md`, H1/H2) does not apply to a structural fact about a brand-new row.

**Tariq's first ground was false, as flagged, and the correction points at `0`, not away from it:**

1. `accounts.ts:51`'s `COALESCE(revolving_balance, 0)` runs only inside `applyAccountDelta`'s `UPDATE`, only on the branch taken when `delta.revolvingBalance !== 0` (`accounts.ts:41`). `resolveCreateEffect` (`transaction_policy.ts:230`) — the only path `TransactionRepository.add()` calls — **never calls `validateResultingCardBalances`** (`transaction_policy.ts:281`); that function is wired only into `resolveDeleteDeltas` (`transaction_policy.ts:308`) and `resolveUpdateEffect` (`transaction_policy.ts:322`). `card_revolving_balance_would_be_negative` **cannot fire on transaction creation, for any starting value.** It is a reversal-consistency check for editing or deleting an *existing* card transaction, not a creation-time gate.

2. **Concretely: does seeding `0` block a legitimate first payment on a new card?** No, and it structurally cannot, for two independent reasons. First, per (1), creation never consults the guard at all. Second, the paydown arithmetic itself (`transaction_policy.ts:204-209`) is identical for `null` and `0`: `calculatedDelta = -min(max(0, toAmount − minimumPayment), max(0, destination.revolvingBalance ?? 0))`. The `?? 0` collapses `null` and `0` to the same value *before* the `Math.max`, so a brand-new card's first payment computes `calculatedDelta = 0` starting from either. Worked: a new card is paid 500 EGP against a 50 EGP minimum-payment snapshot — `calculatedDelta = -min(max(0, 500−50), max(0, 0)) = -min(450, 0) = 0`, whether the seed was `null` or `0`. Neither seed blocks the payment; neither even changes the stored column, because `applyAccountDelta` skips the `revolving_balance` `SET` clause entirely when `delta.revolvingBalance === 0` (`accounts.ts:41-47`). **`null` and `0` are behaviourally identical on every code path that exists today** — Tariq's premise about `COALESCE` making them equivalent was right in spirit, just anchored to the wrong line.

3. **Given identical behaviour today, `0` is strictly safer for tomorrow, at zero present cost.** `validateResultingCardBalances`'s `result.revolvingBalance !== null` skip (`transaction_policy.ts:296`) is the ledger's only defence against a corrupted (accidentally negative) revolving balance surfacing on a future edit or delete. Seeding `null` disables that defence **permanently** for every account this redesigned form creates — nothing in the current codebase ever writes `revolving_balance` away from its creation value organically (point 2; and there is no post-creation editor — the direct-entry field this scope removes was the only writer). Seeding `0` keeps the defence live for free: `0` never trips the guard on its own (it isn't negative), but a future bug that decrements `revolving_balance` incorrectly gets caught the next time that card's transactions are touched, instead of compounding silently forever behind a permanent `null`.

4. **The guard's `!== null` skip is correct behaviour, not a defect — given this ruling, nothing in this scope touches `transaction_policy.ts`.** Under this rule `null` means exactly one thing: this quantity was never tracked (every non-Credit-Card account; a pre-scope legacy card left blank under the old direct-entry field). Skipping a would-go-negative check on an untracked quantity is correct — the same way the app never validates a `credit_limit` overrun when `credit_limit` is `null`. One observation for the backlog, not a defect: the paydown formula's own `Math.max(0, destination.revolvingBalance ?? 0)` floor already makes `card_revolving_balance_would_be_negative` self-bounded and unreachable through an ordinary single-transaction edit (worked in table row C2 below) — it can only fire against a snapshot that was already corrupted *before* the edit. That is the guard doing its job as a tripwire, not a bug; flagged only so an "unreachable in normal flow" test result isn't later mistaken for one.

5. **Invisible to the user either way.** No screen in this codebase renders `revolving_balance` (zero UI consumers, confirmed by grep) — this is an internal safety choice, not a display or copy decision, so it needs no sign-off from Marcus.

**Error case:** none. `revolving_balance` is never sourced from user input in the redesigned form — there is nothing to validate or reject, so `toNewAccountInput` has no throw path for this field. It is computed purely from `type`.

#### Executable table — `test.each` shape

**Part A — creation, `toNewAccountInput` (the new code this scope ships):**

| # | scenario | type | opening_balance | expected `revolving_balance` |
|---|---|---|---|---|
| A1 | New bank account | `AccountType.Bank` | 5000 | `null` |
| A2 | New wallet account | `AccountType.Wallet` | 0 | `null` |
| A3 | New credit card, positive amount owed | `AccountType.CreditCard` | 8450 | `0` |
| A4 | New credit card, paid off at creation | `AccountType.CreditCard` | 0 | `0` |

**Part B — first payment on the newly-created card. Exercises the existing, unmodified `resolveCreateEffect`/`resolveUncheckedCreateEffect` — confirmation/regression tests, not new logic, provided because this ruling depends on their behaviour:**

| # | scenario | destination `revolvingBalance` | `toAmount` | `minimumPaymentSnapshot` | expected `revolvingBalanceDelta` | expected throw |
|---|---|---|---|---|---|---|
| B1 | First payment, card seeded `0` (this ruling) | `0` | 500 | 50 | `0` | none |
| B2 | First payment, card seeded `null` (legacy, pre-scope data) | `null` | 500 | 50 | `0` | none — proves parity with B1 |
| B3 | First payment, no minimum-payment snapshot | `0` | 300 | `null` (→ 0) | `0` | none |

**Part C — edit/delete of a card transaction. Exercises the existing `resolveDeleteDeltas` / `resolveUpdateEffect`; C1 is a deliberately-inconsistent snapshot (white-box test of the corruption tripwire — not reachable through the app itself, see point 4), C2 and C3 are ordinary reachable flows:**

| # | scenario | function | current `revolvingBalance` | operation | resulting `revolvingBalance` | expected throw |
|---|---|---|---|---|---|---|
| C1 | Delete a card payment against a **corrupted** negative snapshot (simulated — not reachable via the app) | `resolveDeleteDeltas` | `-500` | undo a stored `-100` paydown → reversal `+100` | `-400` | `card_revolving_balance_would_be_negative` |
| C2 | Edit an existing payment on a legacy card with a real tracked balance, landing exactly on the zero boundary | `resolveUpdateEffect` | `0` (card started at `100`; one prior payment of `100` paid it off) | old delta `-100` reversed (`+100` → restored `100`), replacement pays `100` again (`-100`) | `0` | none — `0` is not `< 0` |
| C3 | Delete an unrelated expense on a **legacy** card whose `revolving_balance` was left `null` under the old direct-entry form (never tracked) | `resolveDeleteDeltas` | `null` | undo a stored `0` delta (non-`cc_payment` deltas are always `0`) | `null` | none — the skip is correct, the quantity was never tracked |

Case C1 is the one that proves the guard still protects the ledger. Case C2 is the one that proves it does not false-positive on a legitimate edit. Case B1/B2 together are the one that answers the question this ruling turned on: **seeding `0` does not block a legitimate first payment, and behaves identically to `null` everywhere it could matter.**

**APR bound — ruled.** The current schema (`add_account.schema.ts:98-105`) accepts any non-negative decimal once `interest_tracking` is on — `0` and `9999` both save. Every sibling credit field is bounded (`credit_limit` > 0, `due_day` 1–31, `min_payment` ≤ balance); APR is the one gap, and the spec text this task shipped from ("required only while interest tracking is on") never stated a range. Ruled here because it wasn't decided anywhere else, not because the code is wrong to have asked.

**Rule:**

```text
APR is required and must satisfy 0 ≤ apr ≤ 100 (percentage points) while interest_tracking is on.
apr is stored as the percentage number itself — 24.5 persists as 24.5, meaning 24.5% — never as a
fraction (0.245) and never scaled by 100 a second time. Rounded to 2 dp (roundMoney, half-even)
before persistence, same as every other credit amount field in this table.
```

1. **`0` is valid, and wins over the "the switch is a statement of intent" reading.** Turning `interest_tracking` on says "track this card's rate," not "this card currently accrues a nonzero amount" — 0% introductory/promotional periods are a real card state, and a user tracking a card that is genuinely at 0% today needs to represent that without lying to the form. Sibling behaviour agrees: `credit_limit` is forced `> 0` because a credit card with a 0 limit has no real referent, but `min_payment` and `balance` both accept explicit `0` for "paid off" (rule row above, and spec.md:292/9's existing accept case). APR-at-0-while-tracking-on is the same shape as those, not the `credit_limit` shape. Rejecting `0` would force a user with a real 0% card into fabricating a nonzero rate to get past validation — that is the "misleads into false confidence" failure this app is built to avoid, not the thing avoiding it. **This is a confirmation of existing behaviour, not a change** — `parseNonNegativeDecimal` already accepts `0`, and the existing test suite already asserts it (`add_account.schema.test.ts:298`, "#17 interest on, apr 0 → accept").

2. **Upper bound: 100, inclusive.** This app has no market-data feed and no tax logic (CLAUDE.md constraints) — the bound cannot be sourced from a live rate table, so it is a sanity ceiling against fat-finger and garbage entry, not a claim about the exact maximum rate any Egyptian issuer will ever publish. Calibration: Egypt's disclosed consumer-credit rates run high relative to the US/EU intuition that would suggest a ~30% cap (CBE policy rates have run in the mid-to-high 20s in recent years, and bank-disclosed credit-card rates — commonly quoted as a monthly flat rate of roughly 2.5–3.5%, higher on cash-advance and fee-loaded products — translate to nominal annual figures realistically topping out somewhere in the 40–60% range). **100 gives roughly 1.5–2× headroom above that realistic ceiling** — generous enough that no genuine EGP card gets rejected — while still catching the reported bug case (`9999`) and any entry with a stray extra digit or misplaced decimal (`150`, `999`). This is a domain judgment calibrated to a high-rate market, not a verified published maximum; flagging that explicitly rather than presenting it as sourced fact. If product research later surfaces a real card exceeding 100% APR, this bound is the line to revisit, not the validation shape.

3. **Percentage, not a fraction — confirmed against the column and every current consumer.** `accounts.apr` is a bare nullable `REAL` (`001_create_accounts.ts:18`), written and read as-is (`accounts.ts:68,84`) with no scaling in either direction. There is currently **no downstream consumer that computes with `apr`** — grep across `src/` turns up only the schema, the form field, the entity type, and the migration; no interest-accrual or projection code exists yet. So there is no live contract to violate today, but the storage convention has to be fixed now so that whichever task ships interest calculation later reads it correctly: **divide by 100 to get the decimal rate, do not divide again.** The form's own placeholder (`accountAprPlaceholder: 'e.g. 24.5'`) and helper (`'Yearly rate on your card.'`) already assume this reading. **Gap flagged, not invented:** no methodology (simple vs. compounding, monthly vs. annualized) exists anywhere in this codebase for actually computing interest from `apr` — that is a separate ruling for whenever an interest-calculation feature is scoped; this ruling only fixes what the stored number *means*, not how it will someday be used.

4. **Where the new check sits.** Same three-branch shape as `credit_limit` (required → parses → bounded), not the combined single-condition shape `due_day` uses — the upper-bound failure is a distinct, more specific message from "not a number at all," and negative values are already filtered out one branch earlier by `parseNonNegativeDecimal`, so the range check only ever sees a value that has already parsed as ≥ 0.

**Error copy.** New key, same voice as `errDueDayRange` (`'Enter a day from 1 to 31.'`) and `errCreditLimitPositive` (`'Enter a limit greater than zero.'`) — short, imperative, states the accepted range, no exclamation, trailing period:

```text
errAprRange: 'Enter a rate from 0 to 100.'
```

Add it beside `errAprRequired` in `src/constants/strings.ts` (`strings.ts:129`). No change to `errAprRequired` or `errAmountInvalid` — both keep their existing meaning and firing order ahead of this new check.

**Error case.** Throws (as a Zod issue on `apr`, same mechanism as every sibling rule in this block) when: `apr` is blank while `interest_tracking` is on (`errAprRequired`, unchanged); `apr` does not parse as a non-negative decimal (`errAmountInvalid`, unchanged); `apr` parses but is `> 100` (`errAprRange`, new). Does **not** throw when `interest_tracking` is off, regardless of what `apr` contains — unchanged, same off-type gate every credit rule in this block shares (spec.md:296, MA-009 plan decision 4).

#### Executable table — `test.each` shape

Columns: `#` · `apr` (raw string) · `interest_tracking` · expected `errors.apr` · note. Baseline is the existing `cc()` fixture in `add_account.schema.test.ts` (`selected_type: CreditCard`, `credit_limit: '50000'`); rows R1–R9 extend the existing "credit card fields — the MA-009 accept/reject table" describe block, continuing its numbering from #18.

| # | apr | interest_tracking | expected `errors.apr` | note |
|---|---|---|---|---|
| R1 (#19) | `'0'` | `true` | `undefined` (accept) | zero APR is a real state — promotional/introductory period; confirms existing behaviour, not new |
| R2 (#20) | `'100'` | `true` | `undefined` (accept) | upper boundary, inclusive |
| R3 (#21) | `'100.00'` | `true` | `undefined` (accept) | boundary restated with explicit decimals — parses to the same `100` |
| R4 (#22) | `'100.01'` | `true` | `Strings.errAprRange` | just above the boundary |
| R5 (#23) | `'150'` | `true` | `Strings.errAprRange` | comfortably above |
| R6 (#24) | `'9999'` | `true` | `Strings.errAprRange` | the reported gap — must now reject, previously saved |
| R7 (#25) | `'43.5'` | `true` | `undefined` (accept) | ordinary mid-range card rate, well inside the bound |
| R8 (#26) | `'-1'` | `true` | `Strings.errAmountInvalid` | negative fails the parse step before the range check ever runs — unchanged, proves the two checks don't collide |
| R9 (#27) | `'9999'` | `false` | `undefined` (accept) | the off-gate gate wins — rule only applies while tracking is on, same as every other credit rule (spec.md:296); proves the new bound doesn't leak out from under it |

No currency-direction rows apply here — APR is a dimensionless percentage, not a money amount, so EGP/USD conversion does not touch it. R8 covers negative; R2/R4 cover the boundary on both sides; R1 covers zero; R6 is the original bug report reproduced as a regression test.

**Unchanged:** `current_balance = opening_balance` at creation (business rule 6, implemented at `src/modules/accounts/repositories/account.repository.ts:61`). Credit-card accounts remain liabilities (business rule 7). Base currency is independent of each account's native currency, and adding an account never changes it.

---

## Architecture — @tariq

### Data model and migrations

**None.** No schema change, no index change, no migration file. The 32 colours are runtime hex strings stored in the existing nullable `accounts.color TEXT` column (`src/database/migrations/001_create_accounts.ts:12`). Existing rows keep their values; the 12 current rich tones are a subset of the new 32 and are unchanged.

Existing columns already cover every credit field: `credit_limit`, `revolving_balance`, `minimum_payment`, `statement_due_day`, `interest_tracking`, `apr` (`001_create_accounts.ts:13-19`).

`Account` entity (`src/modules/accounts/entities/account.entity.ts`) is unchanged.

### Colour tokens and the palette

Four families are missing from `AcctTokens` (`src/constants/theme_tokens.ts:54-67`, 12 families today):

| Family | Rich | Soft |
|---|---|---|
| Jade | `#147D64` | `#52B49A` |
| Indigo | `#3D4A9A` | `#7784D4` |
| Coral | `#C8544F` | `#E4867E` |
| Graphite | `#3F4A57` | `#7E8996` |

Values are `locked-design-2026-07-23.md` lines 237-240 and are what the mockup renders.

**Three divergent colour sources collapse to one.** Today:
- `src/modules/onboarding/screens/onboarding/add_account/add_account.hook.ts:18-31` — `ACCOUNT_COLORS`, 12 `AcctTokens.*.rich`
- `src/modules/accounts/screens/accounts/add_account/add_account.hook.ts:14-27` — `ACCOUNT_COLORS`, byte-identical duplicate
- `src/constants/theme.ts:205-218` — `AccountColors`, 12 **different** hex values (`#3D7A5F`, `#C0442A`, `#4A2545`, `#7A8B3C` appear in no other token)

The canonical palette derives from `AcctTokens` and carries family key, display name, tone, hex, and the contrast-picked tick colour. `AccountColors` in `theme.ts` **stays** — its other consumers are the categories sheet (`add_edit_category_sheet.tsx:268`, `.state.ts:32`) and the dashboard account-card fallback (`account_card.tsx:173`). Categories are out of scope; do not touch them. The dashboard fallback is a default-colour lookup, not a picker.

### Geometry tokens — Marcus's ask, accepted

Approved. Five additions to `Size` in `src/constants/theme.ts`, all `ms()`-scaled:

| Token | Value | What it stops moving |
|---|---|---|
| `Size.fieldMessageTrack` | `ms(20)` | The rail under every field — helper ↔ error swap |
| `Size.summaryValueSlot` | `ms(52)` | The N4 40 px number, including `Exchange rate needed` |
| `Size.summaryCaptionSlot` | `ms(34)` | The N4 two-line caption |
| `Size.statusTrack` | `ms(34)` | The footer footnote ↔ error swap |
| `Size.fieldHeight` | **`48`, unscaled** | Field height — matches HeroUI `Input`'s own `min-height: calc(var(--spacing) * 12)` = 48, which never passes through `ms()`. **Corrected 2026-08-06 — see below.** |

**Why this is worth five constants:** the zero-shift contract is the reason this scope exists, and today it is only assertable by eyeballing a device. As tokens it is assertable in a `.test.ts` that never opens a simulator. Cost is five lines plus one test; the alternative is four numbers scattered across six components that drift silently.

**`Size.fieldHeight` — corrected 2026-08-06, @sarah's ruling. MA-006, MA-007 and MA-009 plan against this row; read it before planning them.**

This row previously read `ms(44)`, justified by "HeroUI derives input height from padding + font size, so 44 is written down nowhere." **That premise was false and the value was wrong.** 48 is written down, explicitly and unscaled:

- `node_modules/heroui-native/src/styles/components/input.css:9` — `.input__input { min-height: calc(var(--spacing) * 12); }`
- `--spacing: 0.25rem`, Uniwind resolves `rem` as `value * 16` → **`min-height: 48`**, a raw dp value that never passes through `ms()`
- The project wrapper `src/components/ui/input.tsx:42,56` adds only `py-2 text-[16px]` (~32 content box), so the 48 floor governs on every device

Text inputs were therefore never at risk. **The colour trigger row was.** It is a custom composition with no floor, and this spec requires it to match the fields:

| Phone | HeroUI `Input` renders | Trigger row at `ms(44)` |
|---|---|---|
| 320pt | 48 | **37** — breaches `TouchSize.min` |
| 360pt | 48 | 41 |
| 375pt | 48 | 42 |
| 390pt | 48 | 44 |

On every phone at or below 390pt the trigger row would be 6–11pt shorter than the fields directly above and below it. The mockup's stated 44 was never achievable, so matching the primitive **executes** this spec's own requirement — fields and colour trigger the same height — rather than overriding the design.

Cost, stated: form rows are 4pt taller than drawn at the 390pt reference width, and a fixed 48 does not scale on large phones — already true of every HeroUI `Input` shipping today, so this makes the trigger row consistent with existing behaviour rather than introducing new behaviour. Restoring the visual 44 would mean overriding the primitive's `min-height` app-wide: a separate scope, and a far larger change than this token.

Downstream, any tappable row sized from this token still uses `Math.max(Size.fieldHeight, TouchSize.min)`. That is now belt-and-braces rather than load-bearing — keep it, because it costs nothing and survives someone editing the token.

**Known gap, not blocking:** `scripts/design-tokens.js` emits only values written as `ms()`/`msFont()` calls, so `--size-field-height` is absent from the generated CSS and the next mockup will hand-write it. One regex at `scripts/design-tokens.js:45`; `fieldHeight` is the only bare literal in the `Size` block.

`scripts/design-tokens.js` gains `Colors.shared` and `AcctTokens` emission so the next mockup does not have to re-declare them by hand (mockup rationale, item 1).

### Module boundaries and folder layout

```
src/constants/
  theme.ts                          + 5 Size tokens
  theme_tokens.ts                   + 4 AcctTokens families
  strings.ts                        all new copy

src/components/ui/
  button.tsx                        + optional loadingLabel, + Spinner while loading
  display_headline.tsx              MA-002 deliverable — one treatment, see MA-002 § Spike result

src/modules/accounts/               ← owns account creation, everywhere
  constants/account_palette.ts      the 32-entry canonical palette
  components/account_form/
    account_form.tsx                declarative sections only
    account_type_selector.tsx       RadioGroup + fixed grid
    account_color_field.tsx         trigger row
    account_color_sheet.tsx         32-swatch sheet
    account_color_sheet.state.ts    sheet visibility + staged colour
    credit_card_fields.tsx          credit-only controls
    account_form.helpers.ts         defaults + form→NewAccountInput mapping
    use_account_form.hook.ts        RHF/Zod ownership, one guarded save path
  utils/add_account.schema.ts       the single schema (already canonical)

src/modules/onboarding/             ← owns route presentation and step persistence
  components/onboarding_shell/      shell, header, progress rail, status track, footer
  screens/onboarding/
    welcome/ add_account/ more_accounts/ ready/
    ready/ready.helpers.ts          starting-net-position resolver + state selection

assets/                             icon.png · adaptive-icon.png · splash.png (MA-003)
app.json                            unchanged keys, replaced asset files only
```

**The shared form does not import Expo Router or the onboarding store.** It receives presentation copy, an initial currency, and a completion callback from its owner. Its owners keep only: initial currency, route-specific copy, back behaviour, post-save navigation. `locked-design-2026-07-23.md` § *Accounts-owned shared form* is the contract and is unchanged.

**No new consumers** of `src/store/`, `src/repositories/`, or `src/utils/schemas/` — those are compatibility surfaces (CLAUDE.md § Project Structure). `src/utils/schemas/add_account.schema.ts` is already a 3-line re-export of the module copy; leave it, do not import it.

**`src/app/(onboarding)/*/index.tsx` stay one-line re-exports.** Nothing else is ever added to `src/app/`.

### State ownership — per `.claude/rules/state.md`

| Owner | State |
|---|---|
| RHF (`useForm`) | The account draft and all validation. Committed colour lives here. **No account draft is duplicated into Zustand.** |
| `useAccountStore` (`src/modules/accounts/store/account.store.ts`) | The persisted account snapshot. `addAccount` already awaits its own `loadAccounts()` before resolving (`account.store.ts:80-90`), so the snapshot is current when the save promise settles. |
| `useOnboardingStore` | `baseCurrency`, `currentStep`, `complete`. Already generation-guarded (`onboarding.store.ts` `initGeneration`). |
| `useCurrencyStore` | `rate`, `rate_updated_at`, `isManualOverride`, `hasLoaded`. Read-only in this scope. **`isManualOverride` added 2026-09-01 (#350)** — the second provenance source the rate gate reads. |
| `account_color_sheet.state.ts` (`.state.ts`, UI state) | Sheet visibility and the **staged** colour only. Discarded on close; committed to RHF only by the sheet's CTA. |
| Screen-local `.state.ts` per onboarding route | Status-track message and busy flag. |

Shape rules: reactive values as top-level fields, actions as top-level functions, consumers group reads with `useShallow` and read actions via `getState()` outside render. Screen hooks return `{ state: { ...reactive }, ...flat actions }`.

**Every async write path sets an error field the UI renders** (`.claude/rules/review.md` defect 1 — the most repeated defect in this codebase). In this scope that field is the status track. There is no `catch {}` and no `void handler()` that discards a rejection.

### Async and navigation ownership

Carried unchanged from `locked-design-2026-07-23.md` § *Async and navigation ownership*; it is structural, not visual, and PR #167's initialization ownership is still in the tree.

- Every destination step **persists before navigation**, then navigates with `router.replace`. Current code uses `router.push` (`welcome.hook.ts:17`, `add_account.hook.ts:85`, `more_accounts.hook.ts:34`) — that is a behaviour change this scope makes deliberately, so a swipe-back cannot desynchronise the persisted step.
- The onboarding stack disables gestures.
- Save operations are tied to one form session; a stale completion from a previous mount cannot navigate or close a replacement route.
- If the account insert succeeds but step persistence fails, the form enters a **post-save checkpoint**: retry repeats only the N3 transition and **never re-inserts the account**.
- CTA re-entry is ignored while an operation is active.
- `isAddingMore` is parsed exactly with `=== 'true'`. Today `add_account.hook.ts:81` uses `if (isAddingMore)` — a truthy check on a string, so `?isAddingMore=false` takes the add-more branch. That is a live defect this scope fixes.
- Route resolver (pure, testable): persisted N2 + ≥1 account → N3 · persisted N3 or N4 + 0 accounts → N2 · otherwise the persisted destination.

### Startup ownership and focus churn

App startup owns migrations, the onboarding store, the account snapshot and the currency rate **before any onboarding route mounts**. Onboarding routes therefore:

- do **not** call `loadAccounts()` or `loadRate()`,
- do **not** render route-level prerequisite skeletons,
- do **not** schedule focus refreshes.

Three call sites are removed: `useInit(loadAccounts)` at `onboarding/add_account/add_account.hook.ts:42`, `useInit(loadAccounts)` at `ready.hook.ts:18`, and the unconditional `useFocusEffect(() => void loadAccounts())` at `more_accounts.hook.ts:16-20` — the last is textbook focus-reload churn (`.claude/rules/review.md` defect 2, audit M13/M32/L26). `addAccount` already publishes its own refresh.

### Key APIs

Signatures are indicative; the exact shape is settled per task at step 4. They are listed so tasks can be planned against a stable seam, not so @dev copies them verbatim.

| Surface | Contract |
|---|---|
| `ACCOUNT_PALETTE` | 32 entries: `{ family, familyLabel, tone: 'rich' \| 'soft', hex, tickColor }`. Derived from `AcctTokens`, module-scope frozen. Lookup by hex → label for the trigger row and the N3 dots. |
| `createAddAccountSchema(accounts)` | Already exists at `src/modules/accounts/utils/add_account.schema.ts:8`. Extended with the credit rules in the table above. Still returns a Zod object; `AddAccountFormData` still `z.infer`red. |
| `toNewAccountInput(data, { sortOrder })` | Pure `AddAccountFormData` → `NewAccountInput`. Owns `parseNonNegativeDecimal`, `roundMoney`, the credit-vs-non-credit `null` rules, and `interest_tracking` 0/1. Replaces the two duplicated `onSubmit` bodies. |
| `resolveStartingNetPosition(input)` | Pure. `{ accounts, baseCurrency, rate, rateUpdatedAt, isManualOverride }` → `{ kind: 'amount', value } \| { kind: 'rate-needed', foreignCount }`. The table above is its test suite. **Corrected 2026-09-01 (#350) against the shipped code**: `StartingNetPositionInput extends RateProvenance` (`src/modules/onboarding/domain/starting_net_position.ts:31-35`, `src/modules/accounts/domain/account_aggregation.ts:108-120`), so the provenance flag is part of the input, not optional. |
| `selectReadySummaryState(outcome, accounts, baseCurrency, rate)` | Pure. Outcome + snapshot → which of F1–F7, plus the resolved caption/pill copy. |
| `Button` `loadingLabel?: string` | When `isLoading`, renders `loadingLabel ?? Strings.loading` and a `Spinner`. Every existing call site is unchanged by omission. |
| `OnboardingShell` | **Corrected 2026-08-07 at MA-005 step 5 against the shipped MA-004 code** (`src/modules/onboarding/components/onboarding_shell/index.tsx:11-22`): `{ step, title?, onBack?, footnote, statusMessage?, cta, children }`. There is **no `statusTone`** — the tone is derived from message presence inside `resolveStatusTrack` (`onboarding_shell.geometry.ts:79-93`), so a message is the only thing that can turn the track red and an empty message preserves the footnote. `footnote` is **required**; the track is never empty. Owns all four tracks. N1 passes a brand header variant (omit `title`); a `title` without `onBack` renders a `w-9` spacer, not a chevron. |

### Known design/codebase disagreements

Recorded, not silently resolved. `@plan-reviewer` and `@impl-reviewer` should expect these.

1. **The CTA is not flat today.** The mockup specifies HeroUI's primary `Button` — flat `--color-accent`, `border-width: 0`. `src/components/ui/button.tsx:42-48` overrides the primary variant with a gold `LinearGradient` (`GoldTokens[400]` → `GoldTokens[600]`, `button.tsx:43`) on a transparent root. **Resolution: keep the shipped wrapper.** Flattening it re-skins every CTA in the app, which is a re-skin this scope explicitly excludes (`scope.md` § *What we're not building*). The visible delta is a two-stop gold gradient versus flat `#D4A44C`, which sits between the two stops. Marcus can open it as separate work.
2. **`Button` has no spinner today.** `isLoading` is destructured and used only to swap the label; it is never passed to HeroUI's `Button`, which has no `isLoading` prop at all. The mockup's busy CTA is "project `Button` + `Spinner`". MA-004 adds the `Spinner` child. That is a visible change to **every** loading button in the app, and it is the reason MA-004 is `verify: emulator` rather than `none`.
3. **Currency field: `Select` vs the existing `CurrencySelector`.** The mockup draws a compact `EGP ▾` `Select` sharing a row with the balance. `src/modules/currency/components/currency_selector.tsx` is a full-width 2-segment `SegmentedTabs`. Build the `Select` per the mockup; if `Select`'s popover proves costly inside the form at step 4, a compact `SegmentedTabs` at `flex: 1` is the cheaper drop-in with identical geometry. Do not silently substitute — say so in the plan.
4. **`hero_card.tsx` is a dashboard component and stays there.** N4 composes `HeroShell` the way `hero_card.tsx` composes it; it does not import it. Importing a dashboard component into onboarding would cross a module boundary for one screen's benefit.
5. **`Type.summary` (31) exists and is not used here.** The N4 number is `Type.amountEntry` (40) with a 28 px step-down rung past 13 characters. `Type.hero` (28) is the rung.
6. **The CTA slot is 52; the button drawn inside it is 48. Recorded at MA-004 step 5, binds MA-009 and MA-012.** The mockup draws a 52 pt CTA and `Size.ctaHeight` is `ms(52)`, but that token has **no rendering consumer in the tree** — the only two references are its own declaration (`theme.ts:137`) and `SHEET_FOOTER_CLEARANCE` (`sheet.tsx:85`), which is clearance, not a height. Every CTA the app ships today is HeroUI's `.button__root--size-md`, `height: calc(var(--spacing) * 12)` = **48** (`heroui-native/src/styles/components/button.css:50-51`) — the same `--spacing: 0.25rem` × 16 derivation this section already ratified for `Input`'s 48 in *Geometry tokens*. **Resolution: the footer reserves a 52 slot and centres a 48 button in it.** The zero-shift contract — the reason the number is a token — is served in full; the visible delta is 4 pt of button height and 2 pt of extra breathing room above and below. Forcing 52 in onboarding alone would make onboarding's CTA taller than every other CTA in the app. Do not "fix" it per-screen: restoring the mockup's 52 means overriding the primitive's height app-wide, which is separate work with the same shape as the `Size.fieldHeight` ruling above.

### Risks and mitigations

| Risk | Mitigation |
|---|---|
| **Live first-run path.** Onboarding is the highest-blast-radius screen set in the app; a white screen here means a user who never reaches the dashboard. | Every screen task is `verify: emulator`, watched at step 6 and driven independently at step 7. Route resolver and step-persistence ordering get pure tests. Gate 3 device QA is unchanged. |
| **Shared-form refactor reaches Settings.** MA-006 changes account creation for a flow that is not being redesigned. | MA-006 is behaviour-preserving by construction and lands **before** the redesign (MA-007). Both entry points are walked on the emulator in both tasks. |
| **Gradient headline is unproven.** `react-native-svg` `Text` + `LinearGradient` appears nowhere in this codebase (`grep -rn "from 'react-native-svg'" src/` → 3 files, all shapes). | MA-002 is an early standalone spike with a **zero-cost, identical-geometry fallback**. It cannot block the scope. |
| **Cold start.** N1 is the first screen; it gains a full-screen SVG wash, four staggered animations and possibly an SVG text node. | The wash is one static `Svg` on the shell **behind** the scroll view. Animations are one-shot and disabled under reduce-motion. MA-002 measures first paint explicitly. No `expo-blur`, no looping motion, no new dependency. |
| **`app.json` regression.** MA-003 touches native config; `expo install --fix` re-adds a `datetimepicker` plugin that kills `expo prebuild` and the `prebuild-check` CI job. | MA-003 replaces asset **files** only; no `app.json` key changes. Its plan must `git diff app.json` after any Expo CLI invocation and run the full CI-parity chain including `npx expo prebuild --no-install --platform android`. |
| **Adaptive-icon safe zone.** Android crops the adaptive foreground to a circle/squircle; the Cross Fan's fanned cards reach the tile corners. | All geometry stays inside the adaptive safe region (`locked-design-2026-07-23.md` line 115). Verified on the emulator at launcher size and again at gate 3 on hardware. |
| **32-swatch sheet render cost.** 32 `PressableFeedback` cells mounting inside a `BottomSheet`. | Two bounded static grids, no virtualisation, palette frozen at module scope. Selection changes a border and a glyph, not geometry. |
| **Zero-shift regressions are invisible to CI.** | The five geometry tokens make the contract assertable in a `.test.ts`. The emulator run for each screen task must open the error state, not just the happy path. |

---

## Open questions

1. **`revolving_balance` at creation — resolved by @layla.** See *Financial Logic § `revolving_balance` at creation — ruled*. Overruled to `0` (not `null`) for Credit Card accounts; `null` confirmed for every other type. Tariq's `COALESCE`-makes-them-equivalent premise was false as stated (the guard it referenced never runs on creation at all), but the correction argues *for* `0`, not against it — full reasoning and a `test.each` table are in that section. No change to `transaction_policy.ts`.
2. **Does the `≈ N USD` pill render when the base currency is USD? — resolved by @layla.** See *Financial Logic § The approximation pill — ruled, Tariq partially overruled*. It renders, converted into EGP (`USD → EGP` multiplies) under the same gate as the EGP-base case (`foreignCount ≥ 1`, rate usable) — Tariq's "hidden" conclusion is overruled, his "USD→USD is noise" premise is correct and is exactly why the pill shows the *other* currency rather than being suppressed. Full matrix, worked examples, and a `test.each` table are in that section.
3. **N1 back-from-N3.** `locked-design-2026-07-23.md` line 309 says the N3 back action persists N1 and returns to Welcome, and that Welcome then returns to N3 because an account exists. The mockup does not draw a back affordance on N1 (B1's header is the brand mark). Confirmed as: N1 has no back, N3's back goes to N1, N1's Continue returns to N3. Flagged because it is the one navigation edge the mockup does not illustrate.
