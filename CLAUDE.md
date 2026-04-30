# MoneyApp — Claude Code Project Context

## Coding Conventions

- Use `null` only for DB-mapped nullable columns. Use `undefined` for all other absent values in TypeScript code.

---

## What This Project Is

MoneyApp is a React Native (Expo) personal finance app. It helps users track
expenses, accounts, budgets, bills, debt, and saving goals — without connecting
to or controlling real bank accounts. All data is stored locally on device.

---

## Current Build Scope — M1 Onboarding ONLY

**You are building the onboarding flow and nothing else.**

M1 scope = screens O1 through O6:
- O1 — Welcome
- O2 — Base Currency selection
- O3 — Security setup (UI only — no actual PIN logic)
- O4 — Add First Account (form + validation + SQLite write)
- O5 — Add More Accounts (list + add another + done)
- O6 — Ready (summary + completion)

After O6, the user lands on a `PlaceholderDashboard` screen.
**Do not build any dashboard, transaction, budget, bill, or settings screens.**
Those are M1.5 scope — a separate module that has not started yet.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native via Expo (managed workflow) |
| Language | TypeScript (strict) |
| Navigation | React Navigation v6 — native stack only in M1 |
| Local DB | expo-sqlite |
| State | Zustand |
| Secure storage | expo-secure-store |
| Fonts | Sora + Inter via @expo-google-fonts |
| Icons | MaterialCommunityIcons via react-native-vector-icons |
| UUID | react-native-uuid |

**Not used in M1:** axios, bottom-tab navigator, expo-local-authentication,
expo-notifications, ExchangeRate-API. Do not install or import these.

---

## Animation Library

```bash
npx expo install react-native-reanimated react-native-gesture-handler
```

Add to `babel.config.js`:
```js
plugins: ['react-native-reanimated/plugin']
```

Use `Animated.View` / `Animated.Text` from reanimated for all animated elements.
Use `withSpring` for interactions (taps, selections).
Use `withTiming` for color and opacity transitions.
Use `entering` / `exiting` props for mount/unmount animations.

---

## Animation Reference — Per Screen

### O1 Welcome — Entrance sequence
```typescript
// Illustration: FadeInDown.duration(600)
// Headline + subtext: FadeInUp.delay(400).duration(500)
// CTA button: FadeInUp.delay(600).duration(400)
```

### O2 Currency — Row selection
```typescript
// Row tap: scale 1.0 → 1.02 → 1.0 via withSequence(withTiming, withTiming)
// Gold border: withTiming(1, { duration: 200 })
// Checkmark: withSpring(1, { damping: 12, stiffness: 180 })
// Deselect: withTiming(0, { duration: 150 })
```

### O3 Security — Pill selection
```typescript
// Icon scale: withSequence(withSpring(1.08), withSpring(1.0))
// Border color: interpolateColor #2A3A4F → #C9973A via withTiming(200ms)
// "Best" badge: FadeIn.delay(300).duration(250)
```

### O4 Add Account — Conditional fields + feedback
```typescript
// Type pill tap: scale 1.0 → 1.03 → 1.0 via withSpring
// CC fields appear: entering={FadeInDown.duration(250)} exiting={FadeOutUp.duration(200)}
// APR field: entering={FadeInDown.duration(200)} exiting={FadeOutUp.duration(150)}
// Validation errors: entering={FadeInDown.duration(150)} exiting={FadeOutUp.duration(100)}
// Save button press: scale 1.0 → 0.97 → 1.0 via withSequence(withTiming(80ms), withSpring)
```

### O5 More Accounts — Stagger entrance
```typescript
// Each row: FadeInRight.delay(index * 80).duration(300)
// New row added: FadeInRight.duration(250) — no delay
```

### O6 Ready — Completion sequence
```typescript
// Checkmark ring: ZoomIn.springify().damping(10).stiffness(100)
// Headline: FadeInUp.delay(200).duration(400)
// Subtitle: FadeInUp.delay(300).duration(350)
// Summary rows: FadeInUp.delay(400 + index * 80).duration(300)
// CTA button: FadeInUp.delay(700).duration(400)
// Total sequence: ~1.4 seconds
```

### Progress Dots — On activation
```typescript
// Scale: withSequence(withSpring(1.3, {damping:8}), withSpring(1.0, {damping:12}))
// Color: interpolateColor [#243044 → #C9973A] via withTiming(200ms)
```

### Navigation — O1 special case
```typescript
// O1 → O2: animation: 'fade' (not slide_from_right)
// All other screens: default slide_from_right
```

Full animation spec: https://app.notion.com/p/351c90e418b68183903cd42a6065afb2

---

## Project Structure

```
MoneyApp/
├── app/
│   └── _layout.tsx              # DB init, font load, onboarding gate
├── navigation/
│   └── OnboardingNavigator.tsx  # Stack O1→O6, initialRouteName from store
├── screens/
│   ├── onboarding/
│   │   ├── O1Welcome.tsx
│   │   ├── O2Currency.tsx
│   │   ├── O3Security.tsx
│   │   ├── O4AddAccount.tsx
│   │   ├── O5MoreAccounts.tsx
│   │   └── O6Ready.tsx
│   └── PlaceholderDashboard.tsx
├── store/
│   ├── onboardingStore.ts       # Step tracking, currency, security choice
│   └── accountStore.ts          # addAccount + loadAccounts only
├── db/
│   └── init.ts                  # Opens DB, creates accounts + app_settings tables
├── constants/
│   └── theme.ts                 # Cairo Nights design tokens
└── (everything else added by M1.5+)
```

---

## Database — M1 Tables Only

M1 creates exactly **two tables**. Do not create any other tables in M1.

```sql
CREATE TABLE IF NOT EXISTS accounts (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  type              TEXT NOT NULL
                      CHECK(type IN ('bank','smart_wallet','physical_wallet','physical_savings','credit_card')),
  currency          TEXT NOT NULL CHECK(currency IN ('EGP','USD')),
  opening_balance   REAL NOT NULL DEFAULT 0,
  current_balance   REAL NOT NULL DEFAULT 0,
  color             TEXT,
  credit_limit      REAL,
  revolving_balance REAL,
  minimum_payment   REAL,
  statement_due_day INTEGER,
  interest_tracking INTEGER NOT NULL DEFAULT 0,
  apr               REAL,
  is_archived       INTEGER NOT NULL DEFAULT 0,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

**Rules:**
- `current_balance` = `opening_balance` on account creation
- `is_archived` = 0 on creation
- `id` = UUID v4 (use react-native-uuid)
- `created_at` / `updated_at` = ISO 8601 string (new Date().toISOString())
- Enable WAL mode and foreign keys on DB open

---

## Onboarding State — SecureStore Keys

| Key | Type | Set in | Description |
|---|---|---|---|
| `onboarding_complete` | `'true'` / null | O6 CTA | Set ONLY at final CTA tap |
| `onboarding_step` | `'O1'`–`'O6'` | Each screen CTA | Resume-on-force-close |
| `base_currency` | `'EGP'` / `'USD'` | O2 | Also written to app_settings DB |
| `security_choice` | `'pin'` / `'biometric'` / `'skip'` | O3 | |
| `security_setup_skipped` | `'true'` / `'false'` | O3 | |

**Critical rule:** `onboarding_complete` is set to `'true'` ONLY when the user
taps "Open My Dashboard" on O6. Never set it earlier.

**Resume logic:** On app launch, if `onboarding_complete !== 'true'`, read
`onboarding_step` and set `initialRouteName` on the navigator to that value.
The user resumes exactly where they left off after a force-close.

---

## Account Types

Exact string values used in SQLite `type` column and TypeScript enum:

```typescript
type AccountType =
  | 'bank'
  | 'smart_wallet'
  | 'physical_wallet'
  | 'physical_savings'
  | 'credit_card'
```

**Asset types:** bank, smart_wallet, physical_wallet, physical_savings
**Liability type:** credit_card

---

## Account Form — O4 Validation Rules

| Field | Rule | Error message |
|---|---|---|
| name | Required | `'Account name is required'` |
| name | Max 30 chars | `'Name must be 30 characters or less'` |
| name | Unique across all accounts | `'This name is already used'` |
| opening_balance | Required, >= 0 | `'Please enter a valid amount'` |
| credit_limit | Required if type = credit_card | `'Credit limit is required for credit cards'` |
| apr | Required if interest_tracking = 1 | `'Please enter your card\'s APR'` |

**CC conditional fields** (only shown when type = 'credit_card'):
revolving_balance, credit_limit, minimum_payment, statement_due_day,
interest_tracking toggle, apr (only shown when interest_tracking = ON)

---

## Design System — Cairo Nights

### Dark Mode Colors
```
bg:        #0F1923   (Midnight background)
surface:   #1A2535   (Card/input surface)
surfaceEl: #243044   (Elevated element)
border:    #2A3A4F   (Border / divider)
text1:     #F0EBE3   (Primary text)
text2:     #6B7F99   (Secondary / muted text)
gold:      #D4A44C   (Dark mode gold — display values)
positive:  #4CAF82   (Positive amounts, success)
negative:  #E05A42   (Negative, error, debt)
```

### Light Mode Colors
```
bg:        #F7F4EF   (Sand White background)
surface:   #FFFFFF   (Card/input surface)
surfaceEl: #F0EBE3   (Elevated element)
border:    #E3DDD5   (Border / divider)
text1:     #1B2B4B   (Midnight Blue — primary text)
text2:     #8A8178   (Warm grey — secondary text)
gold:      #C9973A   (Cairo Gold — CTAs, active states)
positive:  #3D7A5F   (Sage Green — positive)
negative:  #C0442A   (Error / negative)
```

### Shared
```
cairoGold:    #C9973A   (Primary CTA background — light mode)
midnightBlue: #1B2B4B   (Primary CTA text color)
```

### Fonts
- **Sora** — all numbers, headings, CTAs, account names, balances
- **Inter** — all body copy, labels, descriptions, secondary text

### Spacing scale: `Spacing.xxs/xs/sm/md/lg/xl/xxl` = 4 · 8 · 12 · 16 · 20 · 24 · 32
### Border radius: `Radius.sm/md/lg/xl/pill/cta` = 8 · 12 · 16 · 28 · 11 · 13

### CTA Button Pattern (all screens)
- Height: 52 (`Size.ctaHeight`) — was 40 in early specs; bumped for mobile readability
- Border radius: 13 (`Radius.cta`)
- Font: Sora 700 (`FontFamily.soraBold`)
- Font size: 15 (`Type.bodyStrong`)
- Background: `#C9973A` (light) / linear-gradient(135deg, `#C9973A`, `#D4A44C`) (dark)
- Text color: `#fff` (light) / `#1B2B4B` (dark)
- Fixed to bottom with `padding: 8px 12px 14px`
- Border top: `1px solid #1A2535` (dark) / `1px solid #E3DDD5` (light)

> **Sizing & responsiveness.** All numeric values above (and across the
> rest of this spec) are now sourced from `constants/theme.ts` and
> scaled responsively by `ms()` / `msFont()` in `utils/responsive.ts`.
> The original Figma values were calibrated at a small mockup width and
> rendered as compact on real devices; the bumped values target
> mobile-conventional sizes (Apple HIG, Material 3) while preserving
> visual hierarchy. See [`docs/design-system.md`](docs/design-system.md)
> for the full token reference, before/after table, and conventions for
> adding screens. **Don't hardcode numbers — import tokens.**

---

## Icons — MaterialCommunityIcons (v7 — filled style)

Used across onboarding screens. Always use the filled/solid variant.

| Location | Icon name | Color |
|---|---|---|
| O3 — Security header | `shield-account` | #C9973A |
| O3 — PIN option | `lock` | #C9973A |
| O3 — Biometric option | `fingerprint` | #378ADD |
| O3 — Skip option | `chevron-right` | #6B7F99 |
| O4 — Bank type | `bank` | #C9973A (active) / #6B7F99 |
| O4 — Smart Wallet | `cellphone-nfc` | #6B7F99 |
| O4 — Physical Wallet | `wallet` | #6B7F99 |
| O4 — Physical Savings | `piggy-bank` | #6B7F99 |
| O4 — Credit Card | `credit-card` | #6B7F99 |
| O5 — Bank account row | `bank` | #C9973A |
| O5 — Smart Wallet row | `cellphone-nfc` | #6B7F99 |
| O6 — Ready checkmark | `check-circle` | #4CAF82 (dk) / #3D7A5F (lt) |
| Nav — back arrow | `chevron-left` | #6B7F99 |

**Icon size in type grid:** 16px
**Icon size in security pills:** 18px
**Icon size in account rows (O5):** 14px inside 28×28 container
**Icon size in O3 header:** 22px inside 40×40 container

---

## 12 Account Color Presets

In order (index 0 = default selected):
```
#1B2B4B  #C9973A  #3D7A5F  #C0442A
#4A2545  #185FA5  #D4830A  #2D7D6E
#7B3F8C  #C45C2A  #4A6FA5  #7A8B3C
```

Selected state: `outline: 2px solid #C9973A; outline-offset: 1.5px`

---

## Progress Bar

- 6 dots, one per step (O1=1, O2=2 ... O6=6)
- Height: 3px, border-radius: 2px
- Active color: #C9973A
- Inactive color: #243044 (dark) / #E3DDD5 (light)
- Padding: `0 12px`, height: 20px, flex row with gap 4px
- Position: immediately below header (or below status bar on O1/O6)
- O6: all 6 dots filled gold (step complete)

---

## Status Bar (all screens)

Height: 38px. Shows: time (left, Sora Bold 9px) + signal bars + battery (right).
Signal bars: 4 spans at heights 4/6/8/10px. First 3 muted, 4th = full signal color.
Battery: 16×9px div with `::after` terminal cap.

Dark mode: time=#D4A44C, icons=#F0EBE3, muted=#6B7F99
Light mode: time=#C9973A, icons=#1B2B4B, muted=#C4BDB7

---

## Number Formatting Rule

**ALL amounts must use `en-US` comma formatting.**

```
122300  →  122,300    ✅
1500000 →  1,500,000  ✅
1,22,300            ❌  NEVER
```

Use `Intl.NumberFormat('en-US', { style: 'decimal' })` for all balance displays.

---

## O5 Account Row Pattern

Each account row shows:
- Left: 28×28 icon container (border-radius: 8px) with account type icon
  - Active/first account: bg=#1B2B4B, border=1.5px solid #C9973A, icon in #C9973A
  - Other accounts: bg=surface, border=1.5px solid border, icon in text2
- Middle: account name (Sora 700 10px text1) + type label (8px text2)
- Right: balance (Sora 700 10px, positive color)

**No colored dots. Always show the account type icon.**

---

## Key Business Rules

1. `onboarding_complete` set ONLY on O6 "Open My Dashboard" tap
2. Force-close at any step → resume from that step on relaunch
3. O4 cannot be skipped — must save at least 1 account
4. O5 is fully skippable after O4 has written at least 1 account
5. EGP is pre-selected on O2 — Continue always valid
6. Security screen (O3) is UI only — no PIN entry, no biometric auth in M1
7. Account type cannot be changed after creation (not relevant in onboarding but enforce in store)
8. `current_balance` = `opening_balance` at creation time
9. Credit card = liability (negative net worth contribution) — not calculated in M1
10. Duplicate account names are not allowed — validate against accountStore

---

## Sprint Day Reference

| Day | What to build |
|---|---|
| 1 | Expo setup, bundle IDs, git init |
| 2 | db/init.ts — accounts + app_settings tables |
| 3 | onboardingStore + accountStore |
| 4 | _layout.tsx entry + OnboardingNavigator |
| 5 | O1 Welcome + O2 Currency + their animations |
| 6 | O3 Security + pill selection animations |
| 7 | O4 — type selector + form fields |
| 8 | O4 — validation + save + CC fields + all O4 animations |
| 9 | O5 + O6 + stagger + completion sequence + progress dot animations |
| 10 | Integration testing + bug fixes |
| 11 | Animation testing on both platforms + final buffer |

---

## Definition of Done — M1

Do not tag `m1-complete` until ALL of these pass on both Android and iOS:

- [ ] O1→O6 full flow completes without errors
- [ ] Force-close at each step → relaunch → resumes from correct step
- [ ] O6 CTA sets `onboarding_complete = true` in SecureStore AND app_settings DB
- [ ] Relaunch after O6 → PlaceholderDashboard (onboarding never shown again)
- [ ] All 5 account types can be added with correct fields
- [ ] All validation errors show inline below the correct field
- [ ] CC fields show/hide correctly based on type + interest toggle
- [ ] 12 color dots visible on O4
- [ ] O5 account rows show type icons (not colored dots)
- [ ] `accounts` and `app_settings` tables exist with correct schema
- [ ] All amounts formatted as 122,300 — never 1,22,300
- [ ] No hardcoded strings (all copy in constants/strings.ts)
- [ ] O1 entrance sequence plays on mount (illustration → headline → CTA)
- [ ] O2 row selection: scale pulse + gold border + checkmark spring
- [ ] O3 pill selection: border color interpolation + icon scale
- [ ] O4 CC fields animate in/out on type change
- [ ] O4 validation errors animate in/out inline
- [ ] O5 account rows stagger in on mount
- [ ] O6 completion sequence plays fully end-to-end
- [ ] Progress dots scale + interpolate color on step advance
- [ ] All animations run at 60fps on mid-range Android — no jank
- [ ] Code tagged `m1-complete`

---

## Notion Documentation

All approved specs live in the MoneyApp Notion workspace:

- PRD: https://app.notion.com/p/351c90e418b681709371cadb86fb1dfa
- Onboarding Design v4.1: /mnt/user-data/outputs/onboarding_v4.html
- Tech Spec v1.1: https://app.notion.com/p/351c90e418b681eeab72c1f9ab32a541
- Sprint Plan: https://app.notion.com/p/351c90e418b681b78e71e29699f17960
- QA & Test Plan: https://app.notion.com/p/351c90e418b6817281ebde95a5eac550
- M1 Cycle Tracker: https://app.notion.com/p/351c90e418b681268bb4c033a59749a9
