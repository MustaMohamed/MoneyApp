# Onboarding HeroUI Redesign

**Date:** 2026-07-23
**Status:** Approved
**Branch:** `feat/onboarding-heroui-redesign`
**Base:** PR #167 (`fix/startup-async-ownership`)
**Owners:** Marcus (product/UX) · Layla (financial rules) · Tariq (architecture) ·
Sarah (delivery)

## Goal

Redesign MoneyApp's live four-step onboarding as one coherent Cairo Nights
experience using the project's current HeroUI Native primitives. The work must:

- preserve the existing onboarding business rules and persisted resume behavior;
- produce stable screen geometry across loading, validation, keyboard, submission,
  conditional credit-card fields, and navigation transitions;
- remove duplicated onboarding/account-form markup;
- reduce custom animation and styling code;
- share account-creation behavior with the existing Accounts module;
- remain fast on the first app launch and on small Android devices.

The approved onboarding visual reference is
`.superpowers/brainstorm/70780-1784811364/content/onboarding-final-approval-v5.html`.
The approved logo geometry is the **Cross Fan** variant in
`.superpowers/brainstorm/70780-1784811364/content/moneyapp-account-stack-angle-options-v2.html`.

## Locked Product Decisions

1. The flow stays at four routes:
   `Welcome -> First Account -> More Accounts -> Ready`.
2. Screen 1 uses the approved **Guided Workspace** welcome.
3. Screen 2 uses the approved **Centered Icon Matrix**:
   three account-type choices on the first row and two centered choices on the
   second row.
4. Account types use MaterialCommunityIcons and complete labels.
5. Account color opens a HeroUI-backed `Sheet` with 32 colors:
   16 Cairo Nights account-color families, each with a rich and soft tone.
6. The color sheet uses separate `Rich` and `Soft` rows.
7. Screen 3 uses the Guided Workspace account list and the secondary action copy
   `Add Account`.
8. Screen 4 uses the Guided Workspace summary and a subtle top-right gradient
   circle inside the hero card.
9. Completion is still persisted only after `Open my dashboard` succeeds.
10. Existing users resuming N1-N4 continue at the persisted route. Legacy O-step
    normalization from PR #167 remains unchanged.
11. MoneyApp uses the approved **Cross Fan** account-stack logo throughout
    onboarding and app-owned brand surfaces.

## Approaches Considered

### 1. Screen-only restyle

Keep the existing hooks and duplicate account form, replacing only visible
components.

Rejected because it preserves two account-creation implementations, native/custom
component drift, malformed amount parsing, and state-specific layout shifts.

### 2. Full onboarding rewrite with onboarding-owned account logic

Build a new onboarding-only form and state model from scratch.

Rejected because it creates a third account-form contract and makes future fixes
diverge between onboarding and Settings.

### 3. Shared account-form foundation with onboarding presentation

Extract the reusable account form, submission mapping, account-type selector, and
color picker into the Accounts module. Onboarding owns only its route presentation
and post-save navigation.

**Selected.** It removes duplication while keeping domain ownership in Accounts
and onboarding orchestration in Onboarding.

## Experience Structure

### Shared onboarding shell

Every route uses the same stable shell:

- `Screen` root with top and bottom safe areas;
- one `Size.headerHeight` header track;
- one fixed progress-rail track;
- one flexible content viewport;
- one `Size.ctaHeight` CTA inside an always-mounted footer track.

The Welcome header replaces the back button with the MoneyApp mark, but preserves
the same track dimensions. Other screens use the standard back affordance. Route
transitions remain the existing stack `fade`; element-level translation and zoom
entrances are removed.

The four progress segments are rendered in a stable grid. Completed segments use
gold; remaining segments use the muted track color. Changing steps changes color,
not segment width.

### MoneyApp logo system

The approved logo is **Cross Fan**, an evolution of the selected Account Stack
direction. It communicates multiple account types gathered into one financial
home while preserving the existing MoneyApp folded mark.

Locked construction:

- rear midnight card: `+8deg`;
- middle blue card: `-8deg`;
- front gold card and folded mark: `+1.5deg`;
- teal accent is retained at the upper-right of the folded mark;
- the mark is centered at the approved compact scale with the same breathing room
  as option E; it must not be enlarged to fill the tile;
- the rounded tile uses the approved diagonal Cairo Nights gradient:
  `#192B3F` at the top-left to `#0F1923` from 70% through the bottom-right;
- the tile keeps its thin, low-contrast warm border and near-black outer canvas;
- the tile has no grid, glow, texture, or additional decorative background effect;
- all geometry remains inside the Android adaptive-icon safe region;
- Cairo Nights runtime colors come from existing theme-token values;
- no text is embedded in the launcher mark.

The source-of-truth design assets are:

- `assets/moneyapp-logo-cross-fan.svg` for lossless generation;
- `assets/moneyapp-logo-cross-fan.png` as the verified 1024x1024 raster master.
- `assets/moneyapp-logo-cross-fan-gradient-v2.png` as the approved visual QA
  reference for the final tile treatment.

Implementation derives launcher, adaptive foreground, splash, and compact header
variants from the SVG master. The launcher/background treatment stays midnight;
the compact mark may remove nonessential shadow detail but must preserve card
order, angles, colors, and the folded mark. The previous `M` bitmap is replaced
only when the new derived assets and adaptive safe-zone QA are complete.

### Screen 1: Welcome

Content order:

1. compact wallet illustration inside a bounded visual region;
2. `Private by design` eyebrow;
3. `Your money. Finally clear.` headline;
4. concise privacy/value explanation;
5. HeroUI `Tabs` for EGP and USD;
6. currency explanation and local-data trust row;
7. primary `Continue` CTA.

The base currency remains EGP by default. With no account, continuing persists
both the selected currency and N2 before replacing the route with N2. With an
existing account after an explicit N3 back action, continuing persists N3 and
replaces the route with N3. A failed save keeps the user on the screen, preserves
the selection, restores the CTA, and shows a reserved inline error slot.

### Screen 2: First Account

The account form is visually compact and scrollable while the header and CTA stay
fixed.

#### Account type

A HeroUI `RadioGroup` composes five icon-led choices in a stable six-column grid
at standard font sizes:

- Bank: columns 1-2
- Smart Wallet: columns 3-4
- Cash Wallet: columns 5-6
- Savings: columns 2-3
- Credit Card: columns 4-5

Each choice has identical width and height. The selected state changes border,
surface, icon, and text tones without changing border width or scale.
At accessibility font sizes the selector switches to a stable two-column layout
so complete labels and 44px targets remain visible.

Account types reuse the app's established MaterialCommunityIcons mapping:

- Bank: `bank`;
- Smart Wallet: `cellphone-nfc`;
- Cash Wallet: `wallet`;
- Savings: `wallet-plus`;
- Credit Card: `credit-card`.

#### Core fields

- account name;
- opening balance;
- account currency;
- account color.

All text and amount fields use the shared HeroUI-backed `Input`. At normal font
settings, every field owns a stable minimum-height message track so validation can
change copy without moving later fields. At accessibility font sizes, helper and
error tracks may grow and the outer form scroll absorbs that growth; copy is never
clipped to preserve a nominal fixed height.

Opening balance accepts normalized non-negative decimal input, including grouped
values such as `5,000`. Malformed prefixes such as `5abc` are invalid. Persisted
money is rounded with the project's shared monetary rules.

#### Color sheet

The account-color field shows:

- selected swatch;
- selected family/tone name;
- chevron.

Pressing it opens the project `Sheet`, backed by HeroUI Native `BottomSheet`.
The sheet is a fixed-size, non-dynamic surface with:

- title and standard HeroUI close action;
- a short description;
- a `Rich` row containing 16 swatches;
- a `Soft` row containing 16 swatches;
- a sticky primary confirmation CTA.

Each tone row is one BottomSheet-compatible horizontal scroll surface containing
all 16 colors. Each cell retains a `TouchSize.min` hit target while the visible
circle uses the smaller existing `Size.colorDot` token. The selected ring is drawn
around the visible dot inside the fixed touch cell so selection does not change
row geometry. Swatches expose accessible names such as `Nile Teal, rich`.
Selection indicators use contrast-aware foreground colors instead of assuming
white will remain legible on every soft swatch.

The 16 account-color families are:

| Family | Rich | Soft |
|---|---|---|
| Royal Midnight | `#1B2B4B` | `#3D4E73` |
| Cairo Gold | `#C9973A` | `#E0B968` |
| Nile Teal | `#2D7D6E` | `#5BA597` |
| Paprika | `#C45C2A` | `#E08456` |
| Plum | `#5A2D55` | `#8B5685` |
| Lapis Blue | `#185FA5` | `#4A88C4` |
| Rose | `#B8526D` | `#D88197` |
| Sand | `#C9A876` | `#E0C99A` |
| Amethyst | `#7B3F8C` | `#A87AB5` |
| Emerald | `#4CAF82` | `#7AC9A4` |
| Saffron | `#D4830A` | `#E8A848` |
| Steel Blue | `#4A6FA5` | `#7894C0` |
| Jade | `#147D64` | `#52B49A` |
| Indigo | `#3D4A9A` | `#7784D4` |
| Coral | `#C8544F` | `#E4867E` |
| Graphite | `#3F4A57` | `#7E8996` |

These values extend `AcctTokens`; no component owns an ad hoc palette. The same
32-color source is used by onboarding, Accounts Add, and Accounts Edit so an
account never exposes different color choices depending on entry point.

#### Credit-card fields

Selecting Credit Card changes the opening-balance label to
`Amount currently owed` and reveals:

- revolving balance;
- credit limit;
- minimum payment;
- due day;
- HeroUI `Switch` for interest tracking;
- APR when interest tracking is enabled.

Credit-card amount semantics and validation are:

- `Amount currently owed` is required, non-negative, and stored as the positive
  `opening_balance`; zero represents a paid-off card.
- Credit limit is required and greater than zero. Debt greater than the limit
  remains valid so an over-limit card can be represented.
- Revolving balance and minimum payment are optional; blank persists as `null`
  while an explicit zero persists as `0`.
- Minimum payment cannot exceed the amount currently owed.
- Due day is optional and, when supplied, is an integer from 1 through 31.
- APR is required, non-negative, and rounded to two percentage points only while
  interest tracking is enabled; otherwise APR persists as `null`.
- Credit-only fields persist as `null` and interest tracking as `0` for every
  non-credit account.

Conditional sections use layout animation only for opacity/clip reveal. They never
overlay adjacent controls. Their state remains owned by RHF. Switching away from
Credit Card excludes credit-only values from persistence without clearing the
user's draft during the same form session.

The primary CTA reads `Save and continue`. During save it stays mounted, keeps the
same height, displays the shared loading copy/spinner behavior, becomes
non-interactive, and prevents duplicate submission.

For the initial-account route, a successful account insert awaits the account
store's owned snapshot refresh, persists N3, and replaces the route with N3. If
the insert succeeds but step persistence fails, the form enters a post-save
checkpoint: Retry repeats only the N3 transition and never inserts the account
again.

### Screen 3: More Accounts

Content order:

1. success icon;
2. `First account saved`;
3. explanation that one account is enough;
4. account list using stable compact HeroUI `ListGroup` rows;
5. secondary `Add Account` action;
6. primary `Review setup` CTA.

The list displays the current account-store snapshot immediately. Newly added
accounts appear after the shared account operation publishes the updated list.

Rows reserve icon, content, amount, and currency columns. Long names truncate to
one line; formatted values never resize the row. The empty state is not reachable
through valid flow, but a resumed/inconsistent N3 with zero accounts redirects to
N2 instead of showing a broken success screen.

The N3 back action persists N1 and replaces the route with Welcome, allowing base
currency review without reopening the saved first-account form. From that state,
Welcome returns to N3 because an account already exists. `Add Account` opens N2
in additional-account mode without changing the persisted N3 step; save and
cancel both replace the route with N3. `Review setup` persists N4 and replaces
the route with N4.

### Screen 4: Ready

Content order:

1. completion icon;
2. `Ready to start`;
3. concise dashboard explanation;
4. summary hero;
5. three stable summary rows;
6. primary `Open my dashboard` CTA.

The summary hero displays `Starting net position` in the base currency and the
number of accounts. This is an onboarding opening snapshot, not a claim to the
user's complete net worth. A decorative gradient circle is clipped inside the
top-right of the card. It is non-interactive, excluded from accessibility, and
cannot affect layout.

Summary rows:

- Base currency;
- Accounts;
- Privacy: `On device`.

For every non-archived account, use `opening_balance`. Non-credit accounts
contribute positively and Credit Card accounts contribute negatively. Convert each
foreign opening balance into the base currency with a validated positive exchange
rate, round each converted value with the shared monetary rule, sum the signed
values, then round the result once more:

```text
sign = -1 for Credit Card; +1 otherwise
Starting net position = round2(sum(sign * converted opening_balance))
```

Credit limit, revolving balance, and minimum payment are metadata and are never
added to this number. Zero and negative results are valid.

A rate is required only when an account currency differs from the base currency.
If all accounts use the base currency, calculate without a rate. If conversion is
required and no validated saved or remote rate exists, the hero preserves its
geometry and renders:

- label: `Starting net position`;
- value: `Exchange rate needed`;
- supporting caption: `Your accounts are saved. Add a rate from the dashboard.`

The CTA remains enabled and the app never substitutes the unverified fallback
rate, zero, a partial total, or a direct sum of unlike currencies. When conversion
is used, show the compact caption `Converted using saved rate`.

Completion failure leaves the screen visible, preserves the summary, restores the
CTA, and renders a retryable error in the reserved status track.
On success, the CTA persists completion and lets the existing root layout perform
the Dashboard redirect. N4 back persists N3 before replacing the route with N3.

## Component and Code Architecture

### Accounts-owned shared form

Create a shared account-form surface under:

`src/modules/accounts/components/account_form/`

Expected responsibilities:

- `account_form.tsx`: declarative form sections only;
- `account_type_selector.tsx`: HeroUI radio composition and fixed grid;
- `account_color_field.tsx`: selected color trigger;
- `account_color_sheet.tsx`: 32-swatch HeroUI sheet;
- `credit_card_fields.tsx`: credit-only declarative controls;
- `account_form.helpers.ts`: default values and validated form-to-input mapping;
- `use_create_account_form.hook.ts`: RHF/Zod ownership and one guarded save path.

The shared form accepts presentation copy and completion behavior from its owner.
It does not import Expo Router or the onboarding store.

Both the onboarding Add Account route and the existing Accounts Add Account route
consume this shared form. Their hooks own only:

- initial currency;
- route-specific title/CTA copy;
- back behavior;
- post-save navigation.

### Onboarding-owned presentation

Create or refactor:

- shared onboarding shell/header/progress;
- welcome presentation;
- more-accounts presentation;
- ready summary presentation;
- pure view-model helpers for display copy and states.

Screen `index.tsx` files remain declarative. They contain no `useState`, direct
repository calls, or financial calculations.

### State ownership

- RHF owns the account draft and validation.
- The account store owns fetched/persisted accounts.
- The onboarding store owns base currency, current step, and completion.
- A small component-local state store owns only color-sheet visibility and the
  staged color. RHF remains the owner of the committed color.
- No duplicated account draft is added to Zustand.

### Async and navigation ownership

- Save operations are tied to one form session/generation.
- Stale completion from a previous mounted session cannot navigate or close a
  replacement route.
- Every destination step persists before navigation, then navigation uses
  `router.replace`.
- Account persistence finishes and the account-store snapshot is current before
  N3 renders success.
- If account persistence succeeds but step persistence fails, retry resumes from
  the post-save transition checkpoint and never performs a duplicate insert.
- CTA re-entry is ignored while an operation is active.
- Explicit back actions persist their stated destination and use
  `router.replace`; they do not depend on an in-memory history stack.
- PR #167 onboarding initialization ownership remains intact.
- The onboarding stack disables gestures so a swipe-back cannot bypass persisted
  step ownership.
- `isAddingMore` is parsed exactly with `=== 'true'`.

A pure route resolver contains interrupted-state recovery:

- persisted N2 with an existing account resolves to N3;
- persisted N3 or N4 with zero accounts resolves to N2;
- all other valid N1-N4 states resolve to their persisted destination.

## HeroUI Native Contract

Use HeroUI Native or the project's HeroUI-backed wrappers wherever available:

- `Tabs` for currency;
- `RadioGroup`/`Radio` for account type and color selection;
- `Input`/`TextField`/`FieldError` for fields and validation;
- `Switch` for interest tracking;
- `Button` for all commands;
- `ListGroup.Item` for the color trigger;
- `Card` for the Ready hero and `ListGroup` for account and summary rows;
- project `Sheet` for the color picker;
- `Alert` for retryable blocking errors if inline copy is insufficient.

Do not use the native React Native `Switch`, custom selectable pressables that
duplicate Radio, or a direct `@gorhom/bottom-sheet` wrapper.

Tailwind/Uniwind classes own visual styling. Runtime `style` is limited to
layout-critical flex geometry, account-color hex values, and non-className
interfaces such as gradient colors.

## Zero-Shift Geometry Contract

The phrase "zero shift" in this scope means that state changes do not move
unrelated controls or alter the outer screen/card/row dimensions.

1. Header, progress, and footer tracks have identical dimensions on every route.
2. At normal font settings, every input has an always-mounted stable
   minimum-height helper/error track. At accessibility sizes the track may grow,
   with the scroll viewport absorbing the additional height.
3. CTA height and footer clearance are identical for idle, loading, error, and
   disabled states.
4. Account-type selection does not change border width, scale, or grid placement.
5. Color swatch selection does not change swatch cell dimensions.
6. App initialization owns prerequisite loading before onboarding routes render;
   routes do not flash local prerequisite skeletons.
7. Account data is the startup-loaded canonical snapshot and route transitions do
   not schedule redundant refreshes.
8. Credit-card sections reveal inside the scrollable content; the fixed header and
   CTA do not move.
9. Keyboard appearance changes only the available scroll viewport. Focused fields
   scroll into view without remounting the form or auto-focusing on screen entry.
10. Text uses explicit line height and `numberOfLines`/shrink rules in fixed
    headers, rows, controls, and buttons.
11. Entering motion is opacity-only. No translate/zoom animation moves the layout.
12. Reduced-motion users receive no decorative entrance animation.

## Loading and Error States

PR #167 owns required startup loading for migrations, onboarding, accounts, and
currency before any onboarding route renders. N1-N4 do not call `loadAccounts()`
or `loadRate()` and do not introduce route-level prerequisite skeletons.

### Welcome

- no content skeleton after app initialization;
- fixed inline status track for currency/step persistence failure;
- retry uses the same CTA.

### First Account

- the startup-loaded account snapshot supplies duplicate-name validation;
- form save and transition errors use one reserved status track;
- a post-save transition error retains the successful account result and exposes
  Retry without re-enabling account insertion.

### More Accounts and Ready

- render directly from the startup-loaded or save-published account snapshot;
- no route-focus refresh or skeleton replacement is scheduled;
- transition failures retain the loaded list/summary and use the reserved status
  track.

## Financial and Data Rules

- Account names remain unique case-insensitively after trimming.
- Opening balance is non-negative, uses the account's native currency, and is
  rounded half-even to two decimals before persistence.
- Credit-card opening balance is entered as a positive amount owed and contributes
  negatively only in financial summaries.
- Credit limit is required and greater than zero for Credit Card accounts.
- Optional credit amounts preserve blank as `null` and explicit zero as `0`.
- Minimum payment cannot exceed the credit-card opening balance.
- Due day is an optional integer from 1 through 31.
- APR is required only while interest tracking is enabled.
- Credit-card accounts remain liabilities in downstream net-worth calculations.
- Account creation still writes
  `current_balance = opening_balance`.
- Optional credit fields persist as `null`, not `undefined`.
- Amount parsing uses the shared normalized decimal parser, not `parseFloat`.
- Persisted monetary values use the shared rounding policy.
- Starting net position uses opening balances, subtracts Credit Card liabilities,
  and never sums unlike currencies without a validated conversion rate.
- Credit limit, revolving balance, and minimum payment never contribute to
  Starting net position.
- Base currency remains independent from each account's native currency.
- Adding another account does not change the user's base currency.

## Performance

- No new dependency or native module.
- No route-level animation waterfall.
- Memoize static account-type and palette metadata at module scope.
- The 32-swatch sheet renders two bounded static horizontal rows; no virtualized
  list is needed.
- Account rows use stable keys and memoized row view models.
- Screen hooks select only required Zustand fields, grouped with `useShallow` when
  multiple reactive values are needed.
- Actions are read through `getState()` outside render.
- Remove onboarding and Accounts Add `useInit(loadAccounts)` calls. Startup owns
  initial data and `addAccount` already publishes an owned refresh before it
  resolves.

## Accessibility

- All icon-only controls have accessible labels and 44px minimum hit targets.
- Account-type choices expose selected state through HeroUI Radio semantics.
- Swatches expose family, tone, and selected state; color is never the only signal.
- Progress exposes `Step X of 4`, while decorative segments are hidden.
- Currency tabs, error messages, and loading state are announced.
- Text supports system font scaling without clipping primary actions or labels.
- Content order remains logical for screen readers.

## Test Strategy

Follow the repository's logic-layer policy. Add no new `.test.tsx` render suites.
Use pure `.test.ts` coverage for state, helpers, mappings, architecture, and token
contracts. Visual behavior belongs to device QA.

Required coverage:

- normalized amount parsing, half-even rounding, and form-to-repository mapping;
- account-type and credit-field persistence rules;
- all 32 palette entries, unique values, and family/tone labels;
- account-type grid view model and selected-state mapping;
- welcome save failure/retry and step-before-navigation ordering;
- guarded account submission and stale-session completion;
- N3 zero-account recovery;
- Starting net position for one currency, converted currencies, Credit Card
  liabilities, negative results, and unavailable rates;
- completion failure/retry;
- startup-ready route ownership with no duplicate route-level loads;
- fixed token contracts for header, field message tracks, rows, hero, and CTA;
- resume routing for N1-N4 and preserved PR #167 initialization races.

Device QA remains mandatory because keyboard behavior, safe-area geometry,
BottomSheet motion, font rendering, and Android Fabric transitions cannot be
fully proven by Jest.

## File Scope

Expected changes are limited to:

- `src/modules/onboarding/screens/onboarding/**`;
- `src/modules/accounts/components/account_form/**`;
- both add-account route hooks/screens;
- account form schema/helper locations in the Accounts module;
- `src/utils/onboarding_nav.ts`, the onboarding stack layout, and the root route
  resolver;
- `src/components/ui/` only for a genuinely shared stable form/status primitive;
- `src/constants/strings.ts`;
- `src/constants/theme_tokens.ts`;
- the existing Accounts Edit color consumer so it uses the same palette field and
  sheet;
- focused onboarding/account tests and architecture assertions.

No database migration, repository schema change, dependency, tab, or new route is
included. Startup stores, account/onboarding repositories, global `Sheet`,
`Screen`, native configuration, and package configuration remain unchanged.

## Device QA Matrix

The user must verify on a physical development build:

1. fresh install: N1 -> N4;
2. force-close and resume independently on N1, N2, N3, and N4;
3. EGP and USD base currency;
4. every account type;
5. credit card with interest off and on;
6. validation errors appearing/disappearing without unrelated movement;
7. keyboard open, next-field navigation, scroll-to-focused-field, and keyboard
   dismissal on small Android;
8. all 32 shared colors from onboarding, Accounts Add, and Accounts Edit,
   including sheet close/reopen and selected state;
9. add one and multiple accounts;
10. long account names and large balances;
11. mixed-currency Starting net position with a validated saved rate and with
    only the default fallback;
12. failed persistence/retry for currency, account, and completion;
13. rapid double-tap of every CTA;
14. reduced-motion setting;
15. return to the app after backgrounding during a save.

## Acceptance Criteria

- The approved five-panel visual flow is reproduced at device scale.
- The approved Cross Fan logo is used consistently in launcher, adaptive, splash,
  and onboarding header surfaces without crop or tiny-size detail loss.
- All visible controls use HeroUI Native primitives or approved project wrappers.
- The static wallet illustration and progress rail remain module-local custom
  presentation because HeroUI has no illustration or stepper primitive.
- The native React Native `Switch` and onboarding-specific custom selectable
  controls are removed.
- Onboarding and Settings share one account form and one submission mapping.
- Forward/back transitions persist their destination and replace routes; swipe
  gestures cannot desynchronize the persisted step.
- Account-save/step-save failure cannot create a duplicate account.
- No unrelated UI shifts during validation, loading, saving, keyboard use, sheet
  interaction, account publication, or route transitions; accessibility text is
  allowed to grow inside the scrolling content and is never clipped.
- All four onboarding business rules continue to pass.
- Local CI parity is green before each PR push.
- Physical-device QA passes before merge.

## Risks

1. **Live first-run path:** onboarding is a high-impact route. Mitigation: stacked
   on PR #167, focused race tests, full CI, and mandatory device QA.
2. **Shared account-form refactor:** affects Settings account creation. Mitigation:
   preserve its route-specific presentation and run both flow matrices.
3. **32-color expansion:** stored colors are runtime hex values, so no schema
   migration is required. Existing 12 rich values remain unchanged.
4. **Mixed-currency summary:** current `computeTotalBalance` adds native balances
   and the currency store can expose a default rate without persisted provenance.
   Ready treats `rate_updated_at === null` as unavailable for mixed currencies
   and shows `Exchange rate needed`; it does not change the currency store or
   preserve invalid arithmetic for visual parity.

## Out of Scope

- onboarding route count or business-rule changes;
- authentication, PIN, biometrics, cloud sync, or bank connections;
- editing accounts during onboarding;
- account deletion from N3;
- dashboard redesign;
- database schema/index changes;
- new dependencies or native code;
- changes to the global FAB or post-onboarding navigation.
