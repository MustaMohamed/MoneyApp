# Component Architecture Redesign

**Date:** 2026-04-30
**Scope:** All screens and components — M1 onboarding flow

---

## Goal

Replace React primitive state (`useState`, `useContext`) throughout the codebase with a consistent three-layer pattern: Zustand store for local non-form state, React Hook Form + Zod for form state, and Reanimated shared values isolated in a dedicated animation hook. Every screen and component lives in its own folder.

---

## 1. File Structure

### Rules

- Every screen and shared component lives in its own folder.
- The folder's `index.tsx` is the Expo Router entry point (or the component export).
- Sibling files are named after their screen/component: `<name>.hook.ts`, `<name>.store.ts`, `<name>.anim.ts`.
- Only create a file if it has content — screens with no local state skip `<name>.store.ts`; screens with no logic skip `<name>.hook.ts`; screens with no animations skip `<name>.anim.ts`.
- `_layout.tsx` files must remain files (Expo Router requirement). Their hook/store live as siblings with the `_layout.` prefix.
- `app/index.tsx` remains a file — moving it to a folder changes the route from `/` to `/index`.
- Filenames are **snake_case**. TypeScript identifiers (hooks, functions, types) stay **camelCase** per JS/TS convention.

### Full tree

```
app/
  _layout.tsx                        ← Expo Router root layout; useFonts stays here
  _layout.hook.ts                    ← DB init, onboarding rehydration, ready flag wiring
  _layout.store.ts                   ← { ready, setReady }
  index.tsx                          ← thin redirect (reads global store, no local state)
  dashboard/
    index.tsx                        ← placeholder, no changes
  (onboarding)/
    _layout.tsx                      ← thin redirect on complete; reads global store only
    welcome/
      index.tsx                      ← JSX template
      welcome.anim.ts                ← entrance sequence shared values + animated styles
    currency/
      index.tsx
      currency.hook.ts               ← onContinue, init selected from global store
      currency.store.ts              ← { selected, setSelected }
      currency.anim.ts               ← row tap scale, gold border, checkmark spring
    security/
      index.tsx
      security.hook.ts               ← onContinue
      security.store.ts              ← { selected, setSelected }
      security.anim.ts               ← pill border interpolation, icon scale
    add_account/
      index.tsx                      ← route: /(onboarding)/add_account
      add_account.hook.ts            ← RHF via useZodForm, schema factory, handleSave
      add_account.anim.ts            ← type pill scale, CC fields enter/exit, error enter/exit, btn scale
    more_accounts/
      index.tsx                      ← route: /(onboarding)/more_accounts
      more_accounts.hook.ts          ← handleAddAnother, handleDone
      more_accounts.anim.ts          ← row stagger entrance
    ready/
      index.tsx
      ready.hook.ts                  ← handleComplete, summary row derivation
      ready.store.ts                 ← { completing }
      ready.anim.ts                  ← checkmark ZoomIn, headline/subtitle/rows/CTA FadeInUp

components/
  progress_dots/
    index.tsx                        ← JSX template, receives props
    progress_dots.anim.ts            ← dot scale + color interpolation
  geo_illustration/
    index.tsx                        ← pure SVG, no state, no animations

store/                               ← global stores only
  onboarding_store.ts                ← renamed from onboardingStore.ts
  account_store.ts                   ← renamed from accountStore.ts

utils/
  onboarding_nav.ts                  ← renamed from onboardingNav.ts
  responsive.ts                      ← unchanged
  use_first_mount_entering.ts        ← renamed from useFirstMountEntering.ts
  use_zod_form.ts                    ← NEW: wraps useForm with zodResolver pre-wired
  zod_config.ts                      ← NEW: global Zod error map, imported once in _layout.hook.ts
  (validation.ts deleted)            ← all rules move into Zod schemas in add_account.hook.ts files
```

**`add_account` has no `add_account.store.ts`** — all form inputs (including `selected_type`, `selected_color`, `currency`) live in RHF; `formState.isSubmitting` replaces the `saving` flag.

---

## 2. Component Anatomy

Each folder follows a strict responsibility split across up to four files.

### `index.tsx` — UI template

- Imports from co-located `<name>.hook.ts` and `<name>.anim.ts` only.
- No business logic, no `useState`, no `useSharedValue`.
- Coordinates hook and anim on user events (e.g. calls `form.setValue` and `triggerPillTap` on a single tap).
- Uses `useWatch` / `Controller` from RHF to read form values reactively.

```tsx
// add_account/index.tsx — imports from add_account.hook.ts and add_account.anim.ts
export default function AddAccountScreen() {
  const { form, handleSave } = useAddAccount()
  const { triggerPillTap, btnAnim, ccEntering, ccExiting } = useAddAccountAnim()
  const { control, formState } = form
  const selectedType = useWatch({ control, name: 'selected_type' })

  return (
    <SafeAreaView>
      {TYPE_OPTIONS.map(opt => (
        <TypePill
          key={opt.type}
          isSelected={selectedType === opt.type}
          onSelect={() => {
            form.setValue('selected_type', opt.type)
            triggerPillTap()
          }}
        />
      ))}
      <Controller control={control} name="name" render={...} />
      {selectedType === 'credit_card' && (
        <Animated.View entering={ccEntering} exiting={ccExiting}>
          <Controller control={control} name="credit_limit" render={...} />
        </Animated.View>
      )}
      <Animated.View style={btnAnim}>
        <Pressable onPress={handleSave} disabled={formState.isSubmitting}>
          ...
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  )
}
```

### `<name>.hook.ts` — logic, RHF, store wiring, navigation

- Owns the Zod schema (via schema factory when cross-field context is needed).
- Calls `useZodForm(schema, options)` — never imports `zodResolver` directly.
- Returns everything the template needs: `{ form, store, handleSave, ... }`.
- Reads from global stores (`useOnboardingStore`, `useAccountStore`).
- Handles navigation via `useRouter`.

### `<name>.store.ts` — Zustand store for local non-form state

- Holds only what RHF does not cover: UI selections, loading/completion flags.
- Always includes a `reset()` action for clean navigation teardown.
- Created only when there is actual non-form state (skipped for `add_account` — no `add_account.store.ts`).

```ts
// security/security.store.ts
interface SecurityStore {
  selected: SecurityChoice | null
  setSelected: (choice: SecurityChoice) => void
  reset: () => void
}

export const useSecurityStore = create<SecurityStore>((set) => ({
  selected: null,
  setSelected: (choice) => set({ selected: choice }),
  reset: () => set({ selected: null }),
}))
```

### `<name>.anim.ts` — Reanimated shared values + animated styles

- Returns shared values and animated style objects only.
- No business logic, no store reads.
- Exposes trigger functions (e.g. `triggerPillTap`) so `index.tsx` can fire animations on events.

```ts
// add_account/add_account.anim.ts
export function useAddAccountAnim() {
  const btnScale = useSharedValue(1)

  const btnAnim = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }))

  const triggerBtnPress = () => {
    btnScale.value = withSequence(
      withTiming(0.97, { duration: 80 }),
      withSpring(1.0, { damping: 10 }),
    )
  }

  return {
    btnAnim,
    triggerBtnPress,
    ccEntering: FadeInDown.duration(250),
    ccExiting: FadeOutUp.duration(200),
  }
}
```

---

## 3. React Hook Form + Zod Integration

### Packages to install

```
react-hook-form@^7.74.0
zod@^4.4.1
@hookform/resolvers@^5.2.2
```

### `utils/use_zod_form.ts`

Single wrapper that pre-wires `zodResolver`. Owns the schema ref internally — when `schema` changes (e.g. `useMemo` returns a new instance), the resolver picks it up on the next validation pass without re-initialising the form. All hook files import this; no hook file imports `zodResolver` directly.

```ts
import { useEffect, useRef } from 'react'
import { useForm, type UseFormProps, type FieldValues } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { type ZodType } from 'zod'

export function useZodForm<T extends FieldValues>(
  schema: ZodType<T>,
  options?: Omit<UseFormProps<T>, 'resolver'>,
) {
  const schemaRef = useRef(schema)
  useEffect(() => { schemaRef.current = schema }, [schema])

  return useForm<T>({
    resolver: (values, ctx, opts) => zodResolver(schemaRef.current)(values, ctx, opts),
    ...options,
  })
}
```

### `utils/zod_config.ts`

Global error map imported once in `_layout.hook.ts`. Provides default messages for common error codes; per-field overrides (e.g. `superRefine`) still use explicit strings.

```ts
import { z } from 'zod'
import { Strings } from '@/constants/strings'

z.config({
  customErrorMap: (issue) => {
    switch (issue.code) {
      case 'too_small':
        return { message: issue.minimum === 1 ? Strings.errRequired : Strings.errTooShort }
      case 'too_big':
        return { message: Strings.errTooLong }
      default:
        return { message: Strings.errInvalid }
    }
  },
})
```

### `add_account` form fields

All form inputs live in RHF — including UI selections:

| Field | Zod type | Rule |
|---|---|---|
| `name` | `z.string()` | `min(1)`, `max(30)` |
| `balance` | `z.string()` | `refine(v => parseFloat(v) >= 0)` |
| `selected_type` | `z.enum([...])` | default `'bank'` |
| `selected_color` | `z.string()` | default `AccountColors[0]` |
| `currency` | `z.enum(['EGP','USD'])` | default from global store |
| `interest_tracking` | `z.boolean()` | default `false` |
| `credit_limit` | `z.string().optional()` | required when `selected_type === 'credit_card'` via `superRefine` |
| `apr` | `z.string().optional()` | required when `interest_tracking === true` via `superRefine` |
| `revolving_balance`, `min_payment`, `due_day` | `z.string().optional()` | no validation |

### Schema factory

The schema is rebuilt only when `accounts` changes (for the duplicate-name check). `selected_type` is now a form field so `superRefine` reads it from `data` — no factory arg needed for it.

```ts
function createSchema(accounts: Account[]) {
  return z.object({ ... }).superRefine((data, ctx) => {
    if (accounts.some(a => a.name.toLowerCase() === data.name.trim().toLowerCase()))
      ctx.addIssue({ code: 'custom', path: ['name'], message: Strings.errNameDuplicate })

    if (data.selected_type === 'credit_card' && !data.credit_limit?.trim())
      ctx.addIssue({ code: 'custom', path: ['credit_limit'], message: Strings.errCreditLimitRequired })

    if (data.interest_tracking && !data.apr?.trim())
      ctx.addIssue({ code: 'custom', path: ['apr'], message: Strings.errAprRequired })
  })
}
```

`useZodForm` owns the ref internally, so callers just pass a `useMemo`-derived schema and the resolver always validates against the latest version:

```ts
const accounts = useAccountStore(s => s.accounts)
const schema = useMemo(() => createSchema(accounts), [accounts])
const form = useZodForm(schema, { defaultValues: { ... } })
```

`formState.isSubmitting` replaces the manual `saving` flag — RHF sets it automatically during the async submit handler.

---

## 4. Global Stores

Filenames renamed to snake_case. TypeScript identifiers unchanged.

| Old filename | New filename | Exports unchanged |
|---|---|---|
| `store/onboardingStore.ts` | `store/onboarding_store.ts` | `useOnboardingStore`, `loadOnboardingState` |
| `store/accountStore.ts` | `store/account_store.ts` | `useAccountStore` |

---

## 5. Navigation & Route Changes

Two routes renamed due to snake_case file structure:

| Old | New |
|---|---|
| `/(onboarding)/add-account` | `/(onboarding)/add_account` |
| `/(onboarding)/more-accounts` | `/(onboarding)/more_accounts` |

All `router.push`, `router.replace`, `backOrReplace`, and `Redirect href` calls referencing these routes updated in: `add_account/add_account.hook.ts`, `more_accounts/more_accounts.hook.ts`, `security/security.hook.ts`, `currency/currency.hook.ts`, `ready/ready.hook.ts`, `app/index.tsx`, `utils/onboarding_nav.ts`.

Expo Router regenerates `.expo/types` automatically on next `expo start`.

---

## 6. Deletions

| File | Reason |
|---|---|
| `utils/validation.ts` | All rules move into Zod schemas inside each `<name>.hook.ts` |

---

## 7. What Does Not Change

- `constants/theme.ts`, `constants/strings.ts` — untouched
- `db/init.ts` — untouched
- All business logic in the global stores — only filenames change
- Animation specs per screen — same values, same timing, moved to `<name>.anim.ts`
- SQLite schema, SecureStore keys, business rules — all unchanged
