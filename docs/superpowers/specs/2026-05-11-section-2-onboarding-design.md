# Section 2 · Onboarding — Design Spec

**Date:** 2026-05-11
**Status:** Draft (pending plan + approval)
**Owners:** [marcus] UX · [tariq] technical · [layla] CC field copy · [sarah] sequencing
**Section:** 2 of 9 (Onboarding) within the *Full reset = rebrand + library + IA restructure* mega-initiative.

---

# Part A · Initiative Overview

*This part is shared context across all 9 section specs. It does not change between sections.*

## The mega-initiative

MoneyApp's existing custom UI accumulated bugs and inconsistencies. Decision: full reset rather than surgical fixes. Three things change at once:

1. **UI library** — swap hand-rolled components for `gluestack-ui v2 + NativeWind` (Tailwind for RN). Replaces the patched `react-native-actions-sheet` with gluestack's `Actionsheet`.
2. **Brand expression** — apply *Cairo Nights Extended* palette (additions to existing tokens, fully backwards-compatible).
3. **Information architecture** — 8 cleanup changes to existing screens. Zero new features, zero new screens, zero new tabs.

Delivery model: **vertical-slice, one section per conversation**. Each section ships a complete migrated screen-group end-to-end (IA + library + brand + tests). No big-bang rewrite.

## Locked decisions (do not re-open)

### Library
**gluestack-ui v2 + NativeWind.** Headless component primitives + Tailwind classes. Compatible with Expo Go (no `expo-dev-client`, no `prebuild`). Replaces all hand-rolled components and the patched `react-native-actions-sheet` over the course of §3-9.

gluestack v2 is a **copy-paste primitives model** — there is no `GluestackUIProvider`, no `gluestack-ui.config.ts`, no `@gluestack-style/react`. Headless primitives (`@gluestack-ui/pressable`, `@gluestack-ui/button`) are used as optional foundations; all styling is applied via NativeWind classes and `cva`.

### Brand · Cairo Nights Extended palette

All additions are **backwards-compatible** with existing tokens in `constants/theme.ts`. New names are pure additions; existing names unchanged.

**Core (unchanged):** `bg #0F1923` · `surface #1A2535` · `surfaceEl #243044` · `border #2A3A4F` · `text1 #F0EBE3` · `text2 #6B7F99` · `text3 #4A5568`.

**Brand · Gold (4 stops):** `gold-400 #E0B968` (highlight, NEW) · `gold-500 #D4A44C` (default) · `gold-600 #C9973A` (CTA gradient end) · `gold-700 #A47C2C` (pressed, NEW).

**Semantic:** `positive #4CAF82` · `negative #E05A42` · **`warning #E8B130`** (saffron, NEW — fills warning gap) · `info #4A7ABF`.

**Cultural accents (4, NEW — trimmed from 6):** `nile #2D7D6E` · `spice #C45C2A` · `lapis #185FA5` · `sand #C9A876`. `plum` and `rose` exist only as account swatches (`acct.plum.*` / `acct.rose.*`) and are not standalone accent tokens.

**Account swatches (24, NEW):** 12 hue families × 2 tonal stops (Rich + Soft):

| Family | Rich | Soft | Rich usage | Soft usage |
|---|---|---|---|---|
| Royal Midnight | #1B2B4B | #3D4E73 | Card background | List-row dot / avatar chip |
| Cairo Gold | #C9973A | #E0B968 | Card background | List-row dot / avatar chip |
| Nile Teal | #2D7D6E | #5BA597 | Card background | List-row dot / avatar chip |
| Paprika | #C45C2A | #E08456 | Card background | List-row dot / avatar chip |
| Plum | #5A2D55 | #8B5685 | Card background | List-row dot / avatar chip |
| Lapis | #185FA5 | #4A88C4 | Card background | List-row dot / avatar chip |
| Rose | #B8526D | #D88197 | Card background | List-row dot / avatar chip |
| Sand | #C9A876 | #E0C99A | Card background | List-row dot / avatar chip |
| Amethyst | #7B3F8C | #A87AB5 | Card background | List-row dot / avatar chip |
| Emerald | #4CAF82 | #7AC9A4 | Card background | List-row dot / avatar chip |
| Saffron | #D4830A | #E8A848 | Card background | List-row dot / avatar chip |
| Steel Blue | #4A6FA5 | #7894C0 | Card background | List-row dot / avatar chip |

**Rich/Soft semantics (Marcus, locked):** Rich = card/tile background. Soft = list-row dot or avatar chip rendered on `surface` or `surfaceEl`. Per-family default mapping: every family ships Rich as the primary account card color; Soft is derived from the same hue at higher lightness for use in compact list contexts.

### Scope
Pure cleanup. **No new features, no new screens, no new tabs.** The 8 IA changes (summarized below) are the entire user-facing scope. Polish enhancements per screen may land in their relevant section spec but are bounded by "doesn't add a feature, doesn't add a screen."

### Out of scope (the entire initiative)
- New tabs (Accounts/Insights/Budgets stay deferred)
- Global Search
- Insights/Reports
- Budgets
- Real PIN/biometric (Onboarding O3 stays UI-only per CLAUDE.md business rule 6)
- Data model, business rule, or financial-formula changes

## The 9 sections (sequence may be reordered post-§1)

| # | Section | Owner | Approx duration |
|---|---|---|---|
| **1** | **Foundation** | [tariq] | 2-3 days |
| **2** | **Onboarding (4 screens)** ← *this spec* | [marcus] + [dev] | 3-5 days |
| 3 | Reusable patterns (Sheet · FAB · EmptyState · SettingsSection) | [tariq] + [dev] | 2-3 days |
| 4 | Settings (list · Currency sheet · Categories · Security · About) | [marcus] + [dev] | 3-5 days |
| 5 | Dashboard (header · hero · stats · commitments card · account carousel · net worth sheet) | [marcus] + [dev] | 4-6 days |
| 6 | Transactions list + detail (list · filter · detail · empty states) | [marcus] + [dev] | 3-5 days |
| 7 | Add Transaction sheet (highest impact, sheet pattern + nested pickers + numpad) | [marcus] + [tariq] + [dev] | 4-6 days |
| 8 | Commitments (list · detail · add/edit full-screen) | [marcus] + [dev] | 4-6 days |
| 9 | Accounts (Add Account dual entry · Account detail) | [marcus] + [dev] | 3-5 days |

## Target IA after all 9 sections (the 8 cleanup changes)

Brief reference. Full detail lives in each section's spec where it is implemented.

1. **Add Transaction → bottom sheet** (implemented in §7; uses Sheet pattern from §3, FAB from §3).
2. **Add Commitment stays full-screen** (no change; §8).
3. **Add Account dual entry** — sheet from Dashboard, full-screen from Settings (implemented in §9; uses Sheet from §3).
4. **Onboarding compressed: 6 → 4 steps** — Welcome+Currency · Add Account · Add Another? · Done (implemented in §2).
5. **Global "+" FAB on every tab** — tap = Add Transaction; long-press = mini menu (implemented in §3, used by §5/§6/§8).
6. **Settings restructured into 4 sections** — Account · Appearance · Data · About (implemented in §4; uses SettingsSection from §3).
7. **Currency picker → bottom sheet (in Settings)** (implemented in §4; uses Sheet from §3).
8. **Empty states standardized** — single `EmptyState` component, variant-driven (implemented in §3, used by §5/§6/§8).

## Cross-cutting component patterns (built in §3, used everywhere)

These four patterns are *defined* by the IA changes (above) and *built* in §3. Every other section (§4-9) consumes them:

- **Sheet pattern** — bottom-sheet container with swipe-down dismiss, scrim tap dismiss, focus trap, sheet-on-sheet stacking. Replaces patched `react-native-actions-sheet` with gluestack `Actionsheet`. Used by Add Transaction (§7), Add Account from Dashboard (§9), Currency picker (§4), Net Worth Breakdown (§5), and the existing Category/Account pickers (§7).
- **FAB pattern** — floating "+" button with tap (default action) and long-press (menu). Used by Dashboard (§5), Transactions (§6), Commitments (§8).
- **EmptyState pattern** — illustration + headline + description + single CTA. Variant-driven (`accounts`, `transactions`, `commitments`, `filtered`). Used by Dashboard (§5), Transactions (§6), Commitments (§8).
- **SettingsSection pattern** — grouped list with section header, divided rows, optional destructive last row. Used by Settings (§4).

## Strangler-fig migration rule

Each section ships its migrated screens **behind the existing routes**. The old custom UI stays alive until parity hits per section. Toggle (feature flag or route swap) controls which version users see during migration. No screen ever has both old and new mounted simultaneously in production.

## Cross-spec references

This spec (§2 Onboarding) **depends on §1** (primitives, palette, flag scaffold, `cn` util, `theme_tokens`). All §1 deliverables must be merged before §2 execution begins.

This spec **provides to §3-9:** nothing structural. §2 is a leaf section that consumes §1, produces no shared patterns. The `screens/onboarding_v2/` folder is internal to §2; nothing in it is imported by other sections.

---

# Part B · Section 2 · Onboarding (this section's spec)

## Goals

1. Compress the 6-screen old onboarding flow (O1–O6) to a 4-screen new flow (N1–N4) behind `FeatureFlags.newOnboarding`.
2. Port all onboarding screens to §1 primitives (`Box`, `Text`, `Button`, `Input`, `Pressable`) and NativeWind classes. Zero `StyleSheet.create` in v2 screen files.
3. Merge Welcome (O1) and Currency (O2) into a single screen (N1) — currency selection inline as an EGP/USD pill row, no separate route.
4. Drop the Security screen (O3) entirely from the new flow. Security moves to Settings (§4).
5. Update the N2 Add Account color picker source from the old `AccountColors` hex array to `AcctTokens.*.rich` values from `constants/theme_tokens.ts`.
6. Replace the interest-tracking toggle pill in N2 with a native RN `<Switch>`.
7. Add visible helper hints for `min_payment` and `apr` CC fields (Layla's call — financial clarity for Egyptian users).
8. Restructure N3 (Add Another?) with a success check-circle header above the account list (hybrid layout).
9. Drop the Security summary row from N4 (Done). New 3-row summary card: Currency · Accounts · Total Balance.
10. Preserve all business rules from CLAUDE.md, all existing animation timings, all form contracts, all Zod schemas unchanged.
11. Ship new hook + smoke tests for all 4 N* screens. Maintain test coverage thresholds (80% lines / 95% functions / 100% branches).

## Non-Goals

- No new features, no new screens, no new tabs.
- No migration of old O1–O6 screens — they remain untouched and fully operational when `FeatureFlags.newOnboarding = false`.
- No changes to `database/` layer, `store/account.store.ts`, or any business logic beyond the store changes described below.
- No removal of O* routes, O* screen files, or O* strings — that is the cleanup PR (D8). This section only adds.
- No changes to `components/progress_dots/` or `components/geo_illustration/` — both are reused as-is.
- No changes to `utils/schemas/add_account.schema.ts` — the Zod schema is unchanged.
- No Expo Router version change. Stack navigation stays; `_layout.tsx` stays single-instance.

## Scope · Detailed work items

### 2.1 Route topology (D1)

The 4 existing route `index.tsx` files that have N* equivalents become conditional dispatchers. The 2 routes with no N* equivalent (`currency/`, `security/`) are left unchanged — they stay registered in the Stack, stay unreachable when flag=true, and are removed in the cleanup PR.

**Legal form of the conditional.** The brainstorm intent was "one route file picks per the flag at compile time." `export { default } from expr` is not valid ES module syntax. The correct pattern is a small wrapper component that renders the right screen at runtime. Because `FeatureFlags` is `as const` and never changes at runtime, the bundler tree-shakes the unused branch in production. Acceptable trade-off: trivial wrapper, no perf cost.

```tsx
// app/(onboarding)/welcome/index.tsx
import { FeatureFlags } from '@/constants/feature_flags';
import WelcomeScreenV1 from '@/screens/onboarding/welcome';
import WelcomeScreenV2 from '@/screens/onboarding_v2/welcome';

export default function WelcomeRoute() {
  return FeatureFlags.newOnboarding ? <WelcomeScreenV2 /> : <WelcomeScreenV1 />;
}
```

Apply this pattern to all 4 routes: `welcome/`, `add_account/`, `more_accounts/`, `ready/`.

**Why not a dynamic `import()` or `React.lazy`?** The flag is compile-time. Lazy loading adds a Suspense boundary and a waterfall on the critical path. Static import + conditional render is simpler and faster. Metro tree-shakes unused branches.

**CLAUDE.md app/ constraint satisfied:** the wrapper function component has a default export. No `.hook.ts`, `.anim.ts`, or `.store.ts` siblings next to the route file. The existing `_layout.tsx` is untouched.

**New screen directories:**

```
screens/onboarding_v2/
  welcome/
    index.tsx
    welcome.hook.ts
    welcome.anim.ts
  add_account/
    index.tsx
    add_account.hook.ts
    add_account.anim.ts
    components/
      type_pill.tsx
  more_accounts/
    index.tsx
    more_accounts.hook.ts
    more_accounts.anim.ts
    components/
      account_row.tsx
  ready/
    index.tsx
    ready.hook.ts
    ready.anim.ts
    ready.state.ts
    ready.helpers.ts
```

Note: `welcome/` has no `.store.ts` or `.state.ts` — the selected currency is transient local state managed in `welcome.hook.ts` until `onContinue` commits it to the onboarding store. `add_account/` has no `.state.ts` — the existing pattern uses RHF state only, no Zustand UI state.

### 2.2 Step state model — enum extension and resume behavior (D2)

**Extend `constants/enums.ts`:**

```ts
export enum OnboardingStep {
  O1 = 'O1', O2 = 'O2', O3 = 'O3', O4 = 'O4', O5 = 'O5', O6 = 'O6',  // old; deleted at cleanup
  N1 = 'N1', N2 = 'N2', N3 = 'N3', N4 = 'N4',                          // new
}
```

The `isOnboardingStep` guard in `store/onboarding.store.ts` uses `Object.values(OnboardingStep).includes(...)`. It automatically accepts N1..N4 once they are added to the enum — no change to the guard itself is needed.

**Resume behavior — force-restart on flag flip.** Add this block inside `loadOnboardingState()`, immediately after the `step` value is resolved:

```ts
// In loadOnboardingState(), after:
//   const step: OnboardingStep = isOnboardingStep(stepRaw) ? stepRaw : OnboardingStep.O1;
if (FeatureFlags.newOnboarding && step.startsWith('O')) {
  step = OnboardingStep.N1;
  await SecureStore.setItemAsync(SecureStoreKeys.OnboardingStep, OnboardingStep.N1);
}
```

`step` must be declared with `let` (not `const`) to allow this reassignment. The persisted value is immediately overwritten so subsequent relaunches also start at N1. No resume map. No migration table. The reasoning: there are no production users on O* steps who will hit this code path during the §2 window.

**`store/onboarding.store.ts` is the only changed existing file in §2.** All other changes are additive (new files, new enum values, new strings).

### 2.3 N1 — Welcome + Currency merged screen

**Purpose:** replaces O1 (Welcome) and O2 (Currency). Single route: `app/(onboarding)/welcome/`.

**Layout (top to bottom), within `SafeAreaView` edges top+bottom:**

```
SafeAreaView (bg-bg)
  ProgressDots totalSteps={4} currentStep={1}
  ScrollView (flex-1) [needed on small screens for currency note]
    Box (flex-1, items-center, justify-center, gap-6, px-4)
      Animated.View [illustrationEntering]
        GeoIllustration            ← reused as-is, no changes
      Animated.View [headlineEntering]
        Text variant="hero" className="text-center font-soraExtra"
          {Strings.o1Headline}
        Text variant="body" className="text-text2 text-center mt-1"
          {Strings.o1Subtext}
      Text variant="hint" className="mt-4 self-start"
        "BASE CURRENCY"
      Animated.View [pillsEntering, flexDirection="row", gap-3]
        Pressable (EGP pill)  ← see pill spec below
        Pressable (USD pill)
      Box className="mt-3 bg-surface rounded-[10px] px-4 py-3 w-full"
        Text variant="caption" className="text-text2"
          "Change anytime in Settings."
  Box (ctaBar — borderTopWidth 1, border-surface, pt-2, px-sm, pb-md)
    Animated.View [ctaEntering]
      Button variant="primary" label="Get Started" onPress={onContinue}
```

No back button — N1 is step 1 of the flow.

**Currency pill spec:** each pill is a `<Pressable>` wrapping a `<Box>` with `<Text>`. Active state: `border-gold-600 bg-[rgba(201,151,58,0.08)]`. Inactive state: `border-border bg-surfaceEl`. The gold-tinted active background is `rgba(201,151,58,0.08)` — this is the same tint used in the old O4 `pillActive` style, now expressed via NativeWind's arbitrary value syntax. Flag emoji + currency code inline.

```tsx
// Pill shape inside welcome/index.tsx
{(['EGP', 'USD'] as Currency[]).map((code) => (
  <Pressable
    key={code}
    onPress={() => setSelected(code)}
    className={cn(
      'flex-1 flex-row items-center justify-center gap-2 py-3 rounded-[10px] border-[1.5px]',
      state.selected === code
        ? 'border-gold-600 bg-[rgba(201,151,58,0.08)]'
        : 'border-border bg-surfaceEl',
    )}
  >
    <Text className="text-[18px]">{code === 'EGP' ? '🇪🇬' : '🇺🇸'}</Text>
    <Text
      variant="body"
      className={cn('font-soraBold', state.selected === code ? 'text-gold-600' : 'text-text2')}
    >
      {code}
    </Text>
  </Pressable>
))}
```

**Hook contract (`welcome.hook.ts`):**

```ts
export function useWelcome() {
  const { state: onboardingState, setBaseCurrency, setStep } = useOnboardingStore(
    useShallow((s) => ({
      state: s.state,
      setBaseCurrency: s.setBaseCurrency,
      setStep: s.setStep,
    })),
  );
  const router = useRouter();
  const [selected, setSelected] = useState<Currency>(onboardingState.baseCurrency);

  const onContinue = async () => {
    await setBaseCurrency(selected);
    await setStep(OnboardingStep.N2);
    router.push('/(onboarding)/add_account');
  };

  return { state: { selected }, setSelected, onContinue };
}
```

`useState` lives in the hook per CLAUDE.md (`index.tsx` must have no `useState`). The hook returns `{ state: { selected }, setSelected, onContinue }` — consumers destructure `state` and read `state.selected`.

**Animations (`welcome.anim.ts`):**

```ts
import { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useFirstMountEntering } from '@/utils/use_first_mount_entering.hook';

export function useWelcomeAnim() {
  const play = useFirstMountEntering('welcome_v2');  // distinct key from old 'welcome'

  return {
    illustrationEntering: play ? FadeInDown.duration(280) : undefined,
    headlineEntering: play ? FadeInUp.delay(80).duration(320) : undefined,
    pillsEntering: play ? FadeInUp.delay(160).duration(300) : undefined,  // new
    ctaEntering: play ? FadeInUp.delay(200).duration(400) : undefined,
  };
}
```

Pill stagger: the brainstorm called for "stagger 50ms per pill." With only 2 pills, a single `pillsEntering` animation on the row container is identical visually and simpler — no `index`-based stagger needed. If the human wants per-pill stagger, the plan phase can add it.

The `useFirstMountEntering` key is `'welcome_v2'` to avoid colliding with the old `'welcome'` key while both screens co-exist during the flag-false window.

### 2.4 N2 — Add Account

**Purpose:** replaces O4 (Add Account). Route: `app/(onboarding)/add_account/`. Entered from N1; re-entered from N3 with `isAddingMore=true` param.

**Form contract:** unchanged. Same `createAddAccountSchema`, same `useZodForm`, same field names. The hook navigates to `/(onboarding)/more_accounts` after save (which now renders N3 when flag=true).

**Hook contract (`add_account.hook.ts` in `onboarding_v2/`):**

The hook is a mechanical port of `screens/onboarding/add_account/add_account.hook.ts` with two changes:

1. `selected_color` default changes from `AccountColors[0]` to `AcctTokens.midnight.rich`.
2. After save without `isAddingMore`: call `setStep(OnboardingStep.N3)` (was `O5`). Navigation target remains `/(onboarding)/more_accounts` — same route, now renders N3 via the conditional wrapper.
3. `onBack` fallback changes: `isAddingMore` back → `/(onboarding)/more_accounts`; first add back → `/(onboarding)/welcome` (was `/(onboarding)/security`).

```ts
// Key diffs from the old hook:
selected_color: AcctTokens.midnight.rich,   // was AccountColors[0]

// after save (non-isAddingMore path):
await setStep(OnboardingStep.N3);           // was O5

// onBack fallback:
backOrReplace(router, isAddingMore ? '/(onboarding)/more_accounts' : '/(onboarding)/welcome');
```

**Color picker source (D4 item 1):**

```ts
import { AcctTokens } from '@/constants/theme_tokens';

export const ACCOUNT_COLORS = [
  AcctTokens.midnight.rich,  // #1B2B4B — default
  AcctTokens.gold.rich,      // #C9973A
  AcctTokens.nile.rich,      // #2D7D6E
  AcctTokens.paprika.rich,   // #C45C2A
  AcctTokens.plum.rich,      // #5A2D55
  AcctTokens.lapis.rich,     // #185FA5
  AcctTokens.rose.rich,      // #B8526D
  AcctTokens.sand.rich,      // #C9A876
  AcctTokens.amethyst.rich,  // #7B3F8C
  AcctTokens.emerald.rich,   // #4CAF82
  AcctTokens.saffron.rich,   // #D4830A
  AcctTokens.steel.rich,     // #4A6FA5
] as const;
```

Defined in `add_account.hook.ts` (exported for use in `index.tsx` color row render). The old `AccountColors` from `constants/theme.ts` is not imported in v2 files.

**Legacy-hex tolerance in the color picker:** the "selected" dot highlight checks `selectedColor === color`. If a DB row was saved with a hex from the old `AccountColors` array that is not in `ACCOUNT_COLORS`, no ring is shown — no crash. This is the correct behavior per D10/R2. No special handling needed; the equality check silently finds no match.

**Interest tracking — native `<Switch>` (D4 item 2):**

Replace the toggle pill with:

```tsx
import { Switch } from 'react-native';
import { GoldTokens, CoreTokens } from '@/constants/theme_tokens';

<Box className="flex-row items-center justify-between py-3">
  <Text variant="body" className="font-interSemi text-text1">
    {Strings.o4InterestLabel}
  </Text>
  <Switch
    value={interestTracking}
    onValueChange={(v) => form.setValue('interest_tracking', v)}
    trackColor={{ false: CoreTokens.border, true: GoldTokens[600] }}
    thumbColor={CoreTokens.text1}
    ios_backgroundColor={CoreTokens.border}
    accessibilityRole="switch"
    accessibilityLabel={Strings.o4InterestLabel}
  />
</Box>
```

`accessibilityRole="switch"` is redundant on `<Switch>` (the component sets it automatically) but harmless and explicit. See R5 in risk section for Android `thumbColor` caveat.

**Helper hints for CC fields (D4 item 3):**

New strings to add to `constants/strings.ts`:

```ts
o4MinPaymentHint: 'Copy from your latest statement. Leave blank if your card is new.',
o4AprHint: 'Annual rate — usually 25–40% on Egyptian credit cards. Find it on your cardholder agreement or in your bank app under "Rates".',
```

And update the min payment placeholder:

```ts
o4MinPaymentPlaceholderV2: 'From your statement',
```

(Separate key rather than mutating `o4MinPaymentPlaceholder` — the old placeholder stays for the old screen during the flag-false window.)

Hints render as `<Text variant="caption" className="text-text2 mt-1">` immediately below the respective `<Input>`. Not a tooltip, not a placeholder — always-visible helper text.

```tsx
{/* Below min_payment Input */}
<Text variant="caption" className="text-text2 mt-1">
  {Strings.o4MinPaymentHint}
</Text>

{/* Below apr Input (inside interestTracking conditional) */}
<Text variant="caption" className="text-text2 mt-1">
  {Strings.o4AprHint}
</Text>
```

**Progress dots:** `<ProgressDots totalSteps={4} currentStep={2} />`.

**Primitives swap:** all `TextInput` → `<Input hasError={!!errors.fieldName} />`. All `Pressable` (bare RN) for pill/color interactions → `<Pressable>` from `components/ui/pressable.tsx`. The save CTA: `<Button variant="primary" label={Strings.o4Cta} />` wrapped in `<Animated.View style={btnAnim}>` to preserve the scale animation from `useAddAccountAnim`.

**CC animations preserved:** `ccEntering`, `ccExiting`, `aprEntering`, `aprExiting`, `errorEntering`, `errorExiting` — all imported from `add_account.anim.ts` (ported verbatim into `onboarding_v2/add_account/add_account.anim.ts`).

**`TypePill` component:** ported to `onboarding_v2/add_account/components/type_pill.tsx`. Swap bare `Pressable` → `<Pressable>` from `components/ui/pressable.tsx`. Swap color literals → Tailwind classes. `TYPE_OPTIONS` constant unchanged — same account types, same icons, same labels from `Strings`.

### 2.5 N3 — Add Another? (D5)

**Purpose:** replaces O5 (More Accounts). Route: `app/(onboarding)/more_accounts/`. Entered from N2 after first save; returns here after each `isAddingMore` save from N2.

**Layout (top to bottom):**

```
SafeAreaView (bg-bg)
  ProgressDots totalSteps={4} currentStep={3}
  Box (flex-1, px-sm)
    [Top half — success header]
    Box (items-center, pt-8, pb-6, gap-3)
      Animated.View [checkEntering]
        Box className="w-16 h-16 rounded-full bg-[rgba(76,175,130,0.12)] items-center justify-center"
          MaterialCommunityIcons name="check-circle" size={40} color={SemanticTokens.positive}
      Animated.Text [headlineEntering] — Text variant="title" className="font-soraBold text-text1 text-center"
        "Account saved"
      Animated.Text [subtitleEntering] — Text variant="body" className="text-text2 text-center"
        "Want to add another? You can add credit cards, cash wallets, and more."
    [Account list]
    FlashList
      renderItem: AccountRow (v2, animated per rowEntering)
      ListFooterComponent: AddAnotherRow (dashed border row)
    [Spacer]
    Text variant="caption" className="text-text3 text-center px-4 py-2"
      {Strings.o5SettingsHint}
  Box (ctaBar)
    Button variant="primary" label={Strings.o5Cta} onPress={handleContinue}
```

"Account saved" headline and subtitle are hardcoded strings in the component (not new `Strings` keys) unless the human requests otherwise. These are visible only from the N3 layout; adding them to `Strings` is cleaner but not blocking.

**Hook contract (`more_accounts.hook.ts` in `onboarding_v2/`):**

Port of `useMoreAccounts` with one rename:

```ts
export function useMoreAccounts() {
  // ...identical logic...
  const handleContinue = async () => {         // renamed from handleDone
    await setStep(OnboardingStep.N4);           // was O6
    router.push('/(onboarding)/ready');
  };

  return { accounts: accountState.accounts, initialCount, handleAddAnother, handleContinue };
}
```

The `handleAddAnother` impl is unchanged — it pushes to `/(onboarding)/add_account` with `isAddingMore=true`. That route now renders N2 when flag=true.

**State file (`more_accounts.state.ts`):** not needed for N3. The account list is read-only from the store; no local UI state beyond what the hook provides. Omit per CLAUDE.md anatomy rule (omit `.state.ts` if none).

Wait — the existing O5 also has no `.state.ts`. Confirmed: omit.

**Animations (`more_accounts.anim.ts` in `onboarding_v2/`):**

```ts
import { FadeInDown, FadeInRight, ZoomIn } from 'react-native-reanimated';
import { useFirstMountEntering } from '@/utils/use_first_mount_entering.hook';

export function useMoreAccountsAnim() {
  const play = useFirstMountEntering('more_accounts_v2');

  return {
    checkEntering: play ? ZoomIn.springify().damping(12).stiffness(120) : undefined,
    headlineEntering: play ? FadeInDown.delay(100).duration(280) : undefined,
    subtitleEntering: play ? FadeInDown.delay(180).duration(280) : undefined,
    rowEntering: (index: number, isInitialMount: boolean) =>
      isInitialMount
        ? FadeInRight.delay(index * 60).duration(300)
        : FadeInRight.duration(250),
  };
}
```

`isInitialMount` in `rowEntering` mirrors the existing O5 behavior: rows present when the screen first mounts skip the delay stagger (they are all "initial"), while new rows added after returning from N2 animate in without delay.

**`AccountRow` component (`onboarding_v2/more_accounts/components/account_row.tsx`):**

Port of the existing `AccountRow`. Changes:
- Swap `StyleSheet`/bare RN components → `<Box>`, `<Text>`, `<Animated.View>`.
- The icon container dot color uses `account.color` (the saved hex) for the icon background and a derived border. Since the color is a raw hex from `ACCOUNT_COLORS`, apply it via inline `style={{ backgroundColor: account.color }}` — this is the only legitimate use of inline style in v2 screens (Tailwind cannot apply runtime-dynamic hex values as a class).
- Icon color: always `CoreTokens.text1` (white) — the colored background provides contrast regardless of family.

```tsx
// Icon container — runtime color from account.color
<Box
  className="w-10 h-10 rounded-[8px] items-center justify-center border border-border"
  style={{ backgroundColor: account.color }}
>
  <MaterialCommunityIcons name={icon} size={20} color={CoreTokens.text1} />
</Box>
```

This is cleaner than the old O5 approach which used a gold ring only for the first account. Every account now shows its actual color — more useful when multiple accounts are listed.

### 2.6 N4 — Done (D6)

**Purpose:** replaces O6 (Ready). Route: `app/(onboarding)/ready/`. Final screen; CTA calls `completeOnboarding()`.

**Layout (top to bottom):**

```
SafeAreaView (bg-bg)
  ProgressDots totalSteps={4} currentStep={4}
  Box (flex-1, items-center, justify-center, px-sm, gap-4)
    Animated.View [checkEntering]
      MaterialCommunityIcons name="check-circle" size={Size.iconHero} color={SemanticTokens.positive}
    Animated.Text [headlineEntering]
      Text variant="hero" className="font-soraExtra text-text1 text-center"
        {Strings.o6Title}
    Animated.Text [subtitleEntering]
      Text variant="body" className="text-text2 text-center"
        {Strings.o6Subtitle}
    Box className="w-full bg-surface border border-border rounded-[12px] py-3 px-4 gap-0"
      [3 summary rows — see below]
  Box (ctaBar)
    Animated.View [ctaEntering]
      Button variant="primary" label={Strings.o6Cta} onPress={handleComplete} disabled={completing}
```

**3-row summary card:**

| Label key | Value | Gold text? |
|---|---|---|
| `Strings.o6Currency` | `onboardingState.baseCurrency` | yes (`text-gold-500`) |
| `Strings.o6Accounts` | `${accounts.length} ${Strings.o6AccountsUnit}` | no (`text-text1`) |
| `Strings.o6TotalBalance` | `${formattedTotal} ${onboardingState.baseCurrency}` | yes (`text-gold-500`) |

The Security row (`Strings.o6Security`) is dropped. The summary rows array in `ready.hook.ts` v2 no longer includes it, and `resolveSecurityLabel` is not called.

**Hook contract (`ready.hook.ts` in `onboarding_v2/`):**

```ts
export function useReady() {
  const { state: onboardingState, completeOnboarding } = useOnboardingStore(
    useShallow((s) => ({ state: s.state, completeOnboarding: s.completeOnboarding })),
  );
  const { state: accountState } = useAccountStore(useShallow((s) => ({ state: s.state })));
  const { state: readyState, setCompleting } = useReadyState(
    useShallow((s) => ({ state: s.state, setCompleting: s.setCompleting })),
  );

  const total = computeTotalBalance(accountState.accounts);
  const formattedTotal = new Intl.NumberFormat('en-US').format(total);

  const rows = [
    { label: Strings.o6Currency,     value: onboardingState.baseCurrency,                    gold: true  },
    { label: Strings.o6Accounts,     value: `${accountState.accounts.length} ${Strings.o6AccountsUnit}`, gold: false },
    { label: Strings.o6TotalBalance, value: `${formattedTotal} ${onboardingState.baseCurrency}`,         gold: true  },
  ];

  const handleComplete = async () => {
    if (readyState.completing) return;
    setCompleting(true);
    try {
      await completeOnboarding();
    } finally {
      setCompleting(false);
    }
  };

  return {
    state: { rows, completing: readyState.completing },
    handleComplete,
  };
}
```

`computeTotalBalance` is ported from `ready.helpers.ts` (same implementation). `resolveSecurityLabel` is not imported or used. The `useReadyState` store is ported verbatim — no changes to the state shape.

**Animations (`ready.anim.ts` in `onboarding_v2/`):**

Port verbatim from `screens/onboarding/ready/ready.anim.ts`. Change the `useFirstMountEntering` key to `'ready_v2'`.

```ts
export function useReadyAnim() {
  const play = useFirstMountEntering('ready_v2');

  return {
    checkEntering:    play ? ZoomIn.springify().damping(10).stiffness(100) : undefined,
    headlineEntering: play ? FadeInUp.delay(200).duration(400) : undefined,
    subtitleEntering: play ? FadeInUp.delay(300).duration(350) : undefined,
    rowEntering: (index: number) => play ? FadeInUp.delay(400 + index * 80).duration(300) : undefined,
    ctaEntering:      play ? FadeInUp.delay(700).duration(400) : undefined,
  };
}
```

### 2.7 Sub-component port plan (D7)

Complete file-level disposition:

| Old path | New path | Disposition |
|---|---|---|
| `screens/onboarding/welcome/welcome.anim.ts` | `screens/onboarding_v2/welcome/welcome.anim.ts` | Adapt; new timings + `pillsEntering`; key `'welcome_v2'` |
| `screens/onboarding/welcome/index.tsx` | `screens/onboarding_v2/welcome/index.tsx` | New N1 layout; §1 primitives; currency pills inline |
| `screens/onboarding/currency/components/currency_row.tsx` | — | Not ported. Currency selection is inline in N1. |
| `screens/onboarding/add_account/components/type_pill.tsx` | `screens/onboarding_v2/add_account/components/type_pill.tsx` | Port to §1 primitives; Tailwind classes replace StyleSheet |
| `screens/onboarding/add_account/add_account.hook.ts` | `screens/onboarding_v2/add_account/add_account.hook.ts` | Port + adapt: new color default, new step (N3), new back target (welcome) |
| `screens/onboarding/add_account/add_account.anim.ts` | `screens/onboarding_v2/add_account/add_account.anim.ts` | Port verbatim |
| `screens/onboarding/add_account/index.tsx` | `screens/onboarding_v2/add_account/index.tsx` | Port; swap all primitives to §1; Switch for interest; helper hints |
| `screens/onboarding/more_accounts/components/account_row.tsx` | `screens/onboarding_v2/more_accounts/components/account_row.tsx` | Port to §1 primitives; icon bg = `account.color` (inline style); icon color = `CoreTokens.text1` |
| `screens/onboarding/more_accounts/more_accounts.hook.ts` | `screens/onboarding_v2/more_accounts/more_accounts.hook.ts` | Port; rename `handleDone` → `handleContinue`; step N4; remove headerTitle |
| `screens/onboarding/more_accounts/more_accounts.anim.ts` | `screens/onboarding_v2/more_accounts/more_accounts.anim.ts` | Port + add `checkEntering`, `headlineEntering`, `subtitleEntering` |
| `screens/onboarding/more_accounts/index.tsx` | `screens/onboarding_v2/more_accounts/index.tsx` | New hybrid layout; check-circle header; §1 primitives |
| `screens/onboarding/ready/ready.hook.ts` | `screens/onboarding_v2/ready/ready.hook.ts` | Port; drop Security row; drop `resolveSecurityLabel` call |
| `screens/onboarding/ready/ready.state.ts` | `screens/onboarding_v2/ready/ready.state.ts` | Port verbatim |
| `screens/onboarding/ready/ready.anim.ts` | `screens/onboarding_v2/ready/ready.anim.ts` | Port verbatim; key `'ready_v2'` |
| `screens/onboarding/ready/ready.helpers.ts` | `screens/onboarding_v2/ready/ready.helpers.ts` | Port `computeTotalBalance` only; omit `resolveSecurityLabel` |
| `screens/onboarding/ready/index.tsx` | `screens/onboarding_v2/ready/index.tsx` | Port; 3-row summary; §1 primitives |
| `screens/onboarding/security/*` | — | No N* equivalent. Deleted in cleanup PR. |
| `components/progress_dots/*` | reused as-is | Pass `totalSteps={4}` in all N* screens |
| `components/geo_illustration/index.tsx` | reused as-is | Pure SVG; no token leakage |

### 2.8 New strings required

Add to `constants/strings.ts`:

```ts
// N1 currency section label (small all-caps label above pill row)
n1CurrencyLabel: 'BASE CURRENCY',
// N1 settings note
n1CurrencyNote: 'Change anytime in Settings.',
// N3 success header
n3AccountSaved: 'Account saved',
n3AddMoreSubtitle: 'Want to add another? You can add credit cards, cash wallets, and more.',
// N2 CC field improvements
o4MinPaymentHint: 'Copy from your latest statement. Leave blank if your card is new.',
o4AprHint: 'Annual rate — usually 25–40% on Egyptian credit cards. Find it on your cardholder agreement or in your bank app under "Rates".',
o4MinPaymentPlaceholderV2: 'From your statement',
```

All other copy reuses existing `Strings.o1*`, `Strings.o4*`, `Strings.o5SettingsHint`, `Strings.o5Cta`, `Strings.o6*` keys.

### 2.9 `onboarding.store.ts` changes — `loadOnboardingState` patch

The only change to an existing non-enum, non-strings file. Diff is minimal:

1. Change `const step` → `let step` (to allow reassignment in the force-restart block).
2. Add the force-restart block after the `step` assignment.
3. No other changes. The `securityChoice` field, `setSecurityChoice` action, and the SecurityChoice SecureStore reads remain — they are deleted in the cleanup PR, not here.

The `loadOnboardingState` return type is unchanged: `{ complete: boolean; step: OnboardingStep }`. N1..N4 are valid `OnboardingStep` values after the enum extension, so the return type is still satisfied.

### 2.10 Cleanup PR scope (D8) — deferred, documented here for completeness

The cleanup PR is a **separate PR** filed within 5 business days of the flag flip. It is not part of §2 implementation. Documented here to ensure the spec is complete:

- Delete `screens/onboarding/{welcome,currency,security,add_account,more_accounts,ready}/` (all directories).
- Delete `app/(onboarding)/currency/` and `app/(onboarding)/security/` (entire route directories).
- Revert the 4 remaining `app/(onboarding)/*/index.tsx` route files from conditional wrappers back to simple one-liner re-exports: `export { default } from '@/screens/onboarding_v2/<screen>';`
- Rename `screens/onboarding_v2/` → `screens/onboarding/` (and update all imports in the 4 route files).
- `store/onboarding.store.ts` — remove `securityChoice` from `INITIAL_STATE`, remove `setSecurityChoice` action, remove `SecurityChoice` SecureStore reads in `loadOnboardingState`, remove the `isSecurityChoice` guard function.
- `constants/enums.ts` — remove `SecurityChoice` enum; remove `OnboardingStep.O1..O6` values.
- `constants/secure_store_keys.ts` — remove `SecurityChoice` and `SecuritySetupSkipped` keys. Mark removed keys in a `// REMOVED: do not reuse` comment block (one-line tombstone per key) — this prevents accidental key reuse that would silently read leftover SecureStore data from old installs.
- `constants/feature_flags.ts` — remove the `newOnboarding` entry.
- `constants/strings.ts` — audit before deletion. Run `grep -r "Strings\.o[1-6]" screens/ app/ components/` for each candidate string key. Safe-to-delete set (unused by N* code): `o2*`, `o3*`, `o1SignIn`. Strings reused by N*: `o1Headline`, `o1Subtext`, `o1Cta` (now `o1Cta` is used as the label in N1's `<Button>` — but the spec uses `"Get Started"` directly; confirm during audit). Strings reused: `o4*` (all still used in N2, except `o4MinPaymentPlaceholder` which is superseded by `o4MinPaymentPlaceholderV2`), `o5SettingsHint`, `o5Cta`, `o6*`. Tariq performs the final audit during cleanup PR write-up.

### 2.11 Testing plan

New test files (all in `__tests__/screens/`):

| File | What it tests |
|---|---|
| `onboarding_v2_welcome.hook.test.ts` | `selected` defaults to store `baseCurrency`; `setSelected` updates `selected`; `onContinue` calls `setBaseCurrency`, `setStep(N2)`, and `router.push` |
| `onboarding_v2_add_account.hook.test.ts` | Default `selected_color` is `AcctTokens.midnight.rich`; save without `isAddingMore` calls `setStep(N3)` and navigates to `more_accounts`; save with `isAddingMore` calls `backOrReplace`; `onBack` without `isAddingMore` targets `welcome` |
| `onboarding_v2_more_accounts.hook.test.ts` | `handleContinue` calls `setStep(N4)` and navigates to `ready`; `handleAddAnother` navigates to `add_account` with `isAddingMore=true`; `accounts` reflects account store state |
| `onboarding_v2_ready.hook.test.ts` | `rows` array has exactly 3 items; Security row absent; `computeTotalBalance` sums correctly; `handleComplete` calls `completeOnboarding`; double-tap guard via `completing` flag |
| `screens/smoke/onboarding_v2_welcome.screen.test.tsx` | Renders without throwing; `<ProgressDots>` present; currency pill row present |
| `screens/smoke/onboarding_v2_add_account.screen.test.tsx` | Renders without throwing; `<ProgressDots>` present; form renders |
| `screens/smoke/onboarding_v2_more_accounts.screen.test.tsx` | Renders without throwing; `<ProgressDots>` present; check-circle region present |
| `screens/smoke/onboarding_v2_ready.screen.test.tsx` | Renders without throwing; `<ProgressDots>` present; summary card has 3 rows |

Tests for `loadOnboardingState` force-restart behavior:

Add a test case to the existing `__tests__/onboarding.store.test.ts`:

- When `FeatureFlags.newOnboarding = true` (mocked) and persisted step is `'O3'` (an O* value), `loadOnboardingState()` resolves with `step === OnboardingStep.N1` and `SecureStore.setItemAsync` is called with `OnboardingStep.N1`.

Coverage target: all 4 hook files must individually achieve 100% branch coverage. Smoke tests count toward line and function thresholds.

## Acceptance criteria (D9)

1. `FeatureFlags.newOnboarding = false` → app renders the existing 6-screen flow exactly as before. No visual change, no behavioral change, no regression in existing tests.
2. `FeatureFlags.newOnboarding = true` → routes the user through 4 screens: N1 (Welcome+Currency) → N2 (Add Account) → N3 (Add Another?) → N4 (Done).
3. Business rules preserved:
   - Rule 1: `OnboardingComplete` set only on N4 CTA tap (`completeOnboarding()` called exactly once, in `handleComplete`).
   - Rule 2: Resume from persisted N* step on relaunch. Force-restart to N1 if persisted step is an O* value and flag=true.
   - Rule 3: N2 requires ≥1 saved account — enforced by Zod schema + form submit; same as O4.
   - Rule 4: N3 is always entered after at least one account save (N2 navigates here after save).
   - Rule 5: EGP pre-selected — `useWelcome` defaults `selected` to `onboardingState.baseCurrency`, which defaults to `Currency.EGP` in the store `INITIAL_STATE`.
   - Rule 7: `current_balance = opening_balance` — handled by `account.store.ts`; unchanged.
   - Rule 8: CC accounts as liabilities — balance rendering in `AccountRow` unchanged.
   - Rule 9: Unique account name — enforced by `createAddAccountSchema`; unchanged.
4. `npm run typecheck` passes with zero errors.
5. `npm run test:coverage` passes. Thresholds unchanged: 80% lines / 95% functions / 100% branches. New hook tests + smoke tests contribute to line/function coverage; hook files achieve 100% branch coverage individually.
6. The §1 dev preview route at `app/(dev)/primitives/index.tsx` still renders all 5 primitives without regression. N2/N3/N4 introduce no new primitives — they consume existing ones.
7. The `tailwind.config.js` hex-literal lint rule (§1.8) still passes. No hex literals introduced in `tailwind.config.js` by §2 changes.
8. Animation timings match existing onboarding fidelity — verified subjectively in Expo Go on Android.
9. `Switch` component renders acceptably on Android API 26+ in Expo Go (see R5 — visual check, not automated).

## Risks

- **R1 · String-deletion blast radius (cleanup PR).** Many `o*` strings will be removed in the cleanup PR. The audit must be exhaustive. Mitigation: cleanup PR runs `grep -r "Strings\.o[1-6]" screens/ app/ components/` for each candidate key before deletion. Strings with zero hits are safe to delete. Flag any hits outside of `screens/onboarding_v2/` as unexpected (they suggest a v2 file inadvertently references an old string key).

- **R2 · Account color migration — silent ring absence.** DB rows saved during testing with a hex from the old `AccountColors` array that is not in `ACCOUNT_COLORS` will display correctly (the hex renders fine) but the N2 color picker will show no gold ring on that color. Mitigation: the "selected" equality check `selectedColor === color` finds no match and renders no ring — no crash, no console error. Document and accept. Note: `AccountColors` array in `constants/theme.ts` is not audited here; that is cleanup PR work.

- **R3 · OnboardingStep enum bloat.** During the §2 window, the enum holds 10 values. `isOnboardingStep` uses `Object.values(OnboardingStep).includes(...)` — correct and future-safe. `loadOnboardingState` now also reads N* values from SecureStore without issue. Risk is low; window is bounded by the 5-business-day cleanup deadline.

- **R4 · Currency and security routes still registered.** `app/(onboarding)/currency/` and `app/(onboarding)/security/` remain as Stack screens when flag=true. They are unreachable (no navigation action leads to them in the N* flow) but still registered by Expo Router. No runtime impact, no perf cost. Cleanup PR removes them.

- **R5 · `<Switch>` thumbColor on Android.** Android's `Switch` ignores `thumbColor` in the unchecked state on API levels below 23 (not relevant — Expo SDK 55 requires API 24+) and may render differently on API 26 vs API 34. The `trackColor` pair provides the primary visual distinction. Mitigation: test on Android API 26+ in Expo Go; if `thumbColor` renders incorrectly on the unchecked state, remove `thumbColor` from the unchecked case (i.e., only set it when `value=true`). This is a visual polish issue, not a correctness issue.

- **R6 · `useFirstMountEntering` key collisions.** While both old and new screens co-exist (flag-false window), the same `useFirstMountEntering` key (`'welcome'`, `'ready'`) would be shared if not namespaced. This would cause the old screen's mount flag to suppress the new screen's animation on first open after a flag flip. Mitigation: all v2 anim files use `_v2`-suffixed keys (`'welcome_v2'`, `'more_accounts_v2'`, `'ready_v2'`). The add_account screen has no `useFirstMountEntering` usage in the existing anim — no conflict.

- **R7 · `FlashList` in N3.** The existing O5 screen uses `FlashList` from `@shopify/flash-list`. N3 must also use `FlashList` for the account list. Confirm `FlashList` is already installed (it is — commit 55c53ad added it). No new dependency.

## Open questions (D11)

1. **Min payment hint copy (wording polish).** Layla's substance is locked. Marcus may revise the exact phrasing before plan execution. Not blocking — the plan phase proceeds with the spec wording; Marcus can revise during dev if needed.

2. **`OnboardingStep` enum: hard-delete O1..O6 at cleanup, or leave as commented-out tombstones?** Recommendation: hard-delete. The values are `'O1'`..`'O6'`; no migration value in preserving them since there are no production users. Leaving comments adds noise. Awaiting human confirmation before the cleanup PR is written.

3. **N4 button label.** Keep `Strings.o6Cta` ("Open My Dashboard") or use a punchier variant? Stays as-is per D6 unless the human overrides.

4. **N1 section label and note copy.** The spec uses `Strings.n1CurrencyLabel` and `Strings.n1CurrencyNote` (new keys). The exact copy (`"BASE CURRENCY"` / `"Change anytime in Settings."`) is reasonable but may warrant a Marcus pass. Not blocking.

5. **N3 "Account saved" and subtitle strings — `Strings` keys or hardcoded?** The spec proposes `Strings.n3AccountSaved` and `Strings.n3AddMoreSubtitle`. These are always visible and user-facing; they belong in `Strings` per CLAUDE.md convention. Confirm before plan phase.

## Hand-off to §3

§2 delivers: new onboarding flow fully behind `FeatureFlags.newOnboarding=true` (initially `false` — flag flip is a separate one-line PR after code review). Old 6-screen flow unaffected.

§3 (Reusable patterns: Sheet · FAB · EmptyState · SettingsSection) starts with:
- §1 primitives and palette available (from §1, already merged).
- New onboarding behind the flag (from §2, merged).
- No dependency on §2 deliverables — §3 builds cross-cutting patterns consumed by §4-9.
- Nothing in §2 blocks §3. §3 plan approval may begin once the §2 cleanup PR has merged to main ([sarah] enforces per initiative rule §1.6 item 5).

§2 leaves in place (for §3 and beyond to build on):
- `screens/onboarding_v2/` — internal to §2, not imported by §3-9.
- `components/progress_dots/` — reused as-is; §3-9 may also use it.
- `components/geo_illustration/` — §2-specific; §3-9 are unlikely to use it.
- All §1 primitives — `Box`, `Text`, `Button`, `Input`, `Pressable` — available for §3-9.
- All §1 Tailwind tokens — available for §3-9.

---

## Appendix · File index for §2

**Modified existing files (minimal):**

- `constants/enums.ts` — add N1..N4 to `OnboardingStep`
- `store/onboarding.store.ts` — `let step` + force-restart block in `loadOnboardingState`
- `constants/strings.ts` — add `n1CurrencyLabel`, `n1CurrencyNote`, `n3AccountSaved`, `n3AddMoreSubtitle`, `o4MinPaymentHint`, `o4AprHint`, `o4MinPaymentPlaceholderV2`
- `app/(onboarding)/welcome/index.tsx` — conditional wrapper component
- `app/(onboarding)/add_account/index.tsx` — conditional wrapper component
- `app/(onboarding)/more_accounts/index.tsx` — conditional wrapper component
- `app/(onboarding)/ready/index.tsx` — conditional wrapper component

**New files:**

- `screens/onboarding_v2/welcome/index.tsx`
- `screens/onboarding_v2/welcome/welcome.hook.ts`
- `screens/onboarding_v2/welcome/welcome.anim.ts`
- `screens/onboarding_v2/add_account/index.tsx`
- `screens/onboarding_v2/add_account/add_account.hook.ts`
- `screens/onboarding_v2/add_account/add_account.anim.ts`
- `screens/onboarding_v2/add_account/components/type_pill.tsx`
- `screens/onboarding_v2/more_accounts/index.tsx`
- `screens/onboarding_v2/more_accounts/more_accounts.hook.ts`
- `screens/onboarding_v2/more_accounts/more_accounts.anim.ts`
- `screens/onboarding_v2/more_accounts/components/account_row.tsx`
- `screens/onboarding_v2/ready/index.tsx`
- `screens/onboarding_v2/ready/ready.hook.ts`
- `screens/onboarding_v2/ready/ready.anim.ts`
- `screens/onboarding_v2/ready/ready.state.ts`
- `screens/onboarding_v2/ready/ready.helpers.ts`
- `__tests__/screens/onboarding_v2_welcome.hook.test.ts`
- `__tests__/screens/onboarding_v2_add_account.hook.test.ts`
- `__tests__/screens/onboarding_v2_more_accounts.hook.test.ts`
- `__tests__/screens/onboarding_v2_ready.hook.test.ts`
- `__tests__/screens/smoke/onboarding_v2_welcome.screen.test.tsx`
- `__tests__/screens/smoke/onboarding_v2_add_account.screen.test.tsx`
- `__tests__/screens/smoke/onboarding_v2_more_accounts.screen.test.tsx`
- `__tests__/screens/smoke/onboarding_v2_ready.screen.test.tsx`

**Unchanged existing files (confirmed):**

- `app/(onboarding)/_layout.tsx` — unchanged; redirect-to-dashboard logic applies equally to O* and N* steps
- `app/(onboarding)/currency/index.tsx` — unchanged; route still registered, old screen still renders
- `app/(onboarding)/security/index.tsx` — unchanged; same
- `screens/onboarding/` (all files) — untouched
- `components/progress_dots/` — reused as-is
- `components/geo_illustration/` — reused as-is
- `constants/feature_flags.ts` — unchanged (`newOnboarding: false` stays false until flag-flip PR)
- `utils/schemas/add_account.schema.ts` — unchanged
- `utils/onboarding_nav.ts` — unchanged (`backOrReplace` reused)
- `store/account.store.ts` — unchanged
