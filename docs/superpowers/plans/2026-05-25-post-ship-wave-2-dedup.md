# Post-Ship Wave 2 — Dedup Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking.
> **Source:** `docs/superpowers/reviews/2026-05-24-post-ship-heroui-consistency-review.md` → "Suggested fix waves" #2.
> **Goal:** Collapse verified duplication into shared components/helpers with **zero rendered-text regressions**. Minor, intentional visual *normalization* in the confirm dialogs and commitment headers is in-scope; all on-screen copy is preserved exactly.

**Branch:** `refactor/post-ship-wave-2-dedup` (off `origin/main` @ `5858763`)

**Architecture:** Extract one canonical implementation per duplicated concern, keep thin domain wrappers where call-site APIs should stay stable (confirm dialogs/sheets), and route consumers at the shared unit. No HeroUI-primitive swaps (that is Wave 4) — confirm dialogs keep the proven raw-`Modal` rendering, just unified. No schema/auth/dep/native changes → no critical triggers.

**Tech Stack:** React Native (Expo), TypeScript strict, HeroUI Native (`Button`, `Card`), `@/components/ui/*` wrappers, Reanimated, Jest (logic-only tests).

---

## Pre-flight validation (done 2026-05-25, against `main` @ 5858763)

- **§2 promotion landed:** `screens/onboarding_v2/*` is gone; `screens/onboarding/*` is the promoted V2 tree; V1 deleted. → TypePill is now a **2-way** dup (not 3).
- **TypePill:** `screens/onboarding/add_account/components/type_pill.tsx` ≡ `screens/accounts/add_account/components/type_pill.tsx` (identical except import order, line 10). Consumers: `accounts/add_account/index.tsx:20,69-70` and `onboarding/add_account/index.tsx:21,72-73` — both import `{ TYPE_OPTIONS, TypePill }` only. `useTypePillAnim` is used **only** by the two `type_pill.tsx` files.
- **commitment_status maps:** `STATUS_COLORS`/`STATUS_LABELS`/`STATUS_ICONS` verbatim in `commitment_row.tsx:18-40` (all 3) and `current_cycle_card.tsx:20-40` (all 3); `payment_row.tsx:11-24` has COLORS+LABELS only. Amount-resolution logic (`isPaid ? … : …` + `showTilde`) in `commitment_row.tsx:56-60`, `current_cycle_card.tsx:54-57`, `detail_hero.tsx:46-50` (null-safety differs per call site; `detail_hero` formats currency-**first**). No existing test imports these component-level maps.
- **Confirm dialogs (raw `Modal`):** `transactions/detail/components/delete_confirm_dialog.tsx` (Button + hand-built busy spinner, scrim 0.6), `settings/categories/components/delete_confirmation_dialog.tsx` (StyleSheet + raw Pressables, scrim 0.6, no busy), `accounts/detail/components/archive_confirmation_dialog.tsx` (Box + Button, scrim 0.65, isLoading, optional CC warning).
- **Confirm sheets:** `commitments/detail/components/skip_confirm_sheet.tsx` (no busy) & `commitments/edit_commitment/components/deactivate_sheet.tsx` (busy) — identical structure, differ only in strings + busy handling.
- **EmptyState:** legacy `components/empty_states/index.tsx` imported **only** by `app/(app)/(tabs)/goals/index.tsx:4` and `budget/index.tsx:4`, both `variant="goals"`/`"budget"` with **no** `onAction` (icon+title+sub only). Canonical `components/ui/empty_state.tsx` lacks goals/budget variants. Legacy's other variants (bills, transactionsNoResults) are unused.
- **Commitment headers:** `commitments/index.tsx:22-26` (left title, no back, px-4, text-20), `detail/index.tsx:23-50` (back + centered title + Edit/spacer, px-2, text-20), `commitment_form_body.tsx:195-204` (back + centered title + spacer, px-2, text-17).
- **`Button`** (`@/components/ui/button`): supports `variant` (HeroUI), `isLoading` (renders `"Loading..."` label — no spinner), `isDisabled`. `Box` (`@/components/ui/box`), `Text` (`variant="h3"|"body"|"caption"`), `cn` from `heroui-native` all available.

---

## Task 1: Canonical `TypePill` (lowest risk)

**Files:**
- Create: `components/account_type_pill.tsx`
- Modify: `screens/accounts/add_account/index.tsx:20`, `screens/onboarding/add_account/index.tsx:21` (import path)
- Modify: `screens/accounts/add_account/add_account.anim.ts`, `screens/onboarding/add_account/add_account.anim.ts` (remove `useTypePillAnim`)
- Delete: `screens/accounts/add_account/components/type_pill.tsx`, `screens/onboarding/add_account/components/type_pill.tsx`

- [ ] **Step 1: Create `components/account_type_pill.tsx`** — verbatim copy of the existing pill, with `useTypePillAnim` inlined as a private hook (no relative anim import):

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { cn } from 'heroui-native';
import React from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';

import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { AccountType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { CoreTokens, GoldTokens } from '@/constants/theme_tokens';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export type TypeOption = {
  type: AccountType;
  icon: IconName;
  label: string;
  fullWidth?: boolean;
};

export const TYPE_OPTIONS: TypeOption[] = [
  { type: AccountType.Bank, icon: 'bank', label: Strings.typeBank },
  { type: AccountType.SmartWallet, icon: 'cellphone-nfc', label: Strings.typeSmartWallet },
  { type: AccountType.PhysicalWallet, icon: 'wallet', label: Strings.typePhysicalWallet },
  { type: AccountType.PhysicalSavings, icon: 'piggy-bank', label: Strings.typePhysicalSavings },
  {
    type: AccountType.CreditCard,
    icon: 'credit-card',
    label: Strings.typeCreditCard,
    fullWidth: true,
  },
];

function useTypePillAnim() {
  const scale = useSharedValue(1);
  const pillAnim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const triggerPillTap = () => {
    scale.value = withSequence(
      withSpring(1.03, { damping: 8, stiffness: 200 }),
      withSpring(1.0, { damping: 12 }),
    );
  };
  return { pillAnim, triggerPillTap };
}

export function TypePill({
  option,
  isSelected,
  onSelect,
}: {
  option: TypeOption;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { pillAnim, triggerPillTap } = useTypePillAnim();
  const iconColor = isSelected ? GoldTokens[600] : CoreTokens.text2;

  return (
    <Animated.View
      style={[pillAnim, { borderRadius: 8 }]}
      className={option.fullWidth ? 'w-full' : 'w-[48.5%]'}
    >
      <Pressable
        onPress={() => {
          triggerPillTap();
          onSelect();
        }}
        style={{ flexDirection: 'row' }}
        className={cn(
          'items-center gap-2 rounded-[8px] border-[1.5px] px-3 py-3',
          isSelected ? 'border-gold-600 bg-[rgba(201,151,58,0.08)]' : 'border-border bg-default',
        )}
      >
        <MaterialCommunityIcons name={option.icon} size={18} color={iconColor} />
        <Text
          variant="body"
          className={cn('font-soraBold', isSelected ? 'text-gold-600' : 'text-muted')}
        >
          {option.label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}
```

- [ ] **Step 2: Update the two importers** — change `from './components/type_pill'` → `from '@/components/account_type_pill'`:
  - `screens/accounts/add_account/index.tsx:20`: `import { TYPE_OPTIONS, TypePill } from '@/components/account_type_pill';`
  - `screens/onboarding/add_account/index.tsx:21`: `import { TypePill, TYPE_OPTIONS } from '@/components/account_type_pill';`

- [ ] **Step 3: Remove `useTypePillAnim` from both anim files** — delete lines 37-52 (`export function useTypePillAnim() { … }`) from `screens/accounts/add_account/add_account.anim.ts` and `screens/onboarding/add_account/add_account.anim.ts`. Keep `useAddAccountAnim`. Remove now-unused reanimated imports **only if** they become unused (`useAddAccountAnim` still uses `useSharedValue`, `useAnimatedStyle`, `withSequence`, `withSpring`, `withTiming`, `FadeInDown`, `FadeOutUp` → all stay; nothing to trim).

- [ ] **Step 4: Delete the two local `type_pill.tsx`** — `git rm screens/accounts/add_account/components/type_pill.tsx screens/onboarding/add_account/components/type_pill.tsx`.

- [ ] **Step 5: Verify** — `grep -rn "components/type_pill\|add_account.anim'" screens` → no `type_pill` matches; `npm run typecheck` → 0 errors.

---

## Task 2: `commitment_status.ts` helpers

**Files:**
- Create: `screens/commitments/commitment_status.ts`
- Create: `__tests__/screens/commitment_status.test.ts`
- Modify: `screens/commitments/components/commitment_row.tsx`, `screens/commitments/detail/components/current_cycle_card.tsx`, `screens/commitments/detail/components/payment_row.tsx`, `screens/commitments/detail/components/detail_hero.tsx`

- [ ] **Step 1: Create `screens/commitments/commitment_status.ts`**:

```ts
import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';

import { AmountType, CommitmentPaymentStatus } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import type { Commitment } from '@/database/entities/commitment.entity';
import type { CommitmentPayment } from '@/database/entities/commitment_payment.entity';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export const STATUS_COLORS: Record<CommitmentPaymentStatus, string> = {
  [CommitmentPaymentStatus.Overdue]: Colors.dark.negative,
  [CommitmentPaymentStatus.Due]: Colors.dark.gold,
  [CommitmentPaymentStatus.Upcoming]: Colors.dark.text2,
  [CommitmentPaymentStatus.Paid]: Colors.dark.positive,
  [CommitmentPaymentStatus.Skipped]: Colors.dark.text3,
};

export const STATUS_LABELS: Record<CommitmentPaymentStatus, string> = {
  [CommitmentPaymentStatus.Overdue]: Strings.commitmentsStatusOverdue,
  [CommitmentPaymentStatus.Due]: Strings.commitmentsStatusDue,
  [CommitmentPaymentStatus.Upcoming]: Strings.commitmentsStatusUpcoming,
  [CommitmentPaymentStatus.Paid]: Strings.commitmentsStatusPaid,
  [CommitmentPaymentStatus.Skipped]: Strings.commitmentsStatusSkipped,
};

export const STATUS_ICONS: Record<CommitmentPaymentStatus, IconName> = {
  [CommitmentPaymentStatus.Overdue]: 'alert-circle',
  [CommitmentPaymentStatus.Due]: 'clock-outline',
  [CommitmentPaymentStatus.Upcoming]: 'calendar-clock',
  [CommitmentPaymentStatus.Paid]: 'check-circle',
  [CommitmentPaymentStatus.Skipped]: 'minus-circle',
};

export interface DisplayAmount {
  amount: number | undefined;
  showTilde: boolean;
}

/**
 * Resolves the amount to display for a payment, mirroring the logic that was
 * copy-pasted across commitment_row / current_cycle_card / detail_hero.
 * Paid rows prefer the actually-paid amount; otherwise fall back to the due
 * amount, then the commitment's nominal amount. Variable-amount commitments
 * that are not yet paid get a leading tilde.
 */
export function resolveDisplayAmount(
  payment: CommitmentPayment | undefined,
  commitment: Commitment | undefined,
): DisplayAmount {
  const isPaid = payment?.status === CommitmentPaymentStatus.Paid;
  const isVariable = commitment?.amount_type === AmountType.Variable;
  const amount = isPaid
    ? (payment?.amount_paid ?? payment?.amount_due ?? commitment?.amount)
    : (payment?.amount_due ?? commitment?.amount);
  return { amount, showTilde: isVariable && !isPaid };
}
```

- [ ] **Step 2: Write the failing test** `__tests__/screens/commitment_status.test.ts`:

```ts
import { AmountType, CommitmentPaymentStatus, Currency } from '@/constants/enums';
import { resolveDisplayAmount } from '@/screens/commitments/commitment_status';
import type { Commitment } from '@/database/entities/commitment.entity';
import type { CommitmentPayment } from '@/database/entities/commitment_payment.entity';

function mkPayment(over: Partial<CommitmentPayment>): CommitmentPayment {
  return {
    id: 'p1',
    commitment_id: 'c1',
    due_date: '2026-05-01',
    status: CommitmentPaymentStatus.Upcoming,
    amount_due: 100,
    amount_paid: null,
    currency: Currency.EGP,
    paid_at: null,
    transaction_id: null,
    exchange_rate_snapshot: null,
    created_at: '2026-05-01T00:00:00.000Z',
    updated_at: '2026-05-01T00:00:00.000Z',
    ...over,
  } as CommitmentPayment;
}

function mkCommitment(over: Partial<Commitment>): Commitment {
  return {
    amount_type: AmountType.Fixed,
    amount: 250,
    ...over,
  } as Commitment;
}

describe('resolveDisplayAmount', () => {
  it('paid: prefers amount_paid', () => {
    const r = resolveDisplayAmount(
      mkPayment({ status: CommitmentPaymentStatus.Paid, amount_paid: 90, amount_due: 100 }),
      mkCommitment({}),
    );
    expect(r).toEqual({ amount: 90, showTilde: false });
  });

  it('paid with null amount_paid: falls back to amount_due', () => {
    const r = resolveDisplayAmount(
      mkPayment({ status: CommitmentPaymentStatus.Paid, amount_paid: null, amount_due: 100 }),
      mkCommitment({}),
    );
    expect(r.amount).toBe(100);
  });

  it('unpaid: uses amount_due', () => {
    const r = resolveDisplayAmount(
      mkPayment({ status: CommitmentPaymentStatus.Due, amount_due: 100 }),
      mkCommitment({}),
    );
    expect(r).toEqual({ amount: 100, showTilde: false });
  });

  it('unpaid with null amount_due: falls back to commitment.amount', () => {
    const r = resolveDisplayAmount(
      mkPayment({ status: CommitmentPaymentStatus.Due, amount_due: null }),
      mkCommitment({ amount: 250 }),
    );
    expect(r.amount).toBe(250);
  });

  it('variable + unpaid: showTilde true', () => {
    const r = resolveDisplayAmount(
      mkPayment({ status: CommitmentPaymentStatus.Upcoming }),
      mkCommitment({ amount_type: AmountType.Variable }),
    );
    expect(r.showTilde).toBe(true);
  });

  it('variable + paid: showTilde false', () => {
    const r = resolveDisplayAmount(
      mkPayment({ status: CommitmentPaymentStatus.Paid, amount_paid: 90 }),
      mkCommitment({ amount_type: AmountType.Variable }),
    );
    expect(r.showTilde).toBe(false);
  });

  it('undefined payment + undefined commitment: amount undefined, no tilde', () => {
    const r = resolveDisplayAmount(undefined, undefined);
    expect(r).toEqual({ amount: undefined, showTilde: false });
  });
});
```

- [ ] **Step 3: Run test, expect FAIL** (only if `commitment_status.ts` not yet saved — it is, so this should PASS). Run: `npm test -- commitment_status --ci`. Expected: PASS. (Adjust the `CommitmentPayment`/`Commitment` fixtures if the real entity fields differ — read `database/entities/commitment_payment.entity.ts` & `commitment.entity.ts` first and match required fields.)

- [ ] **Step 4: Refactor `commitment_row.tsx`** — delete local `STATUS_COLORS`/`STATUS_LABELS`/`STATUS_ICONS` (lines 18-40) and the `IconName` type (line 16, now unused) + the inline amount logic (lines 54-60). Add import; replace logic:
  - Add: `import { STATUS_COLORS, STATUS_ICONS, STATUS_LABELS, resolveDisplayAmount } from '@/screens/commitments/commitment_status';`
  - Remove now-unused imports: `AmountType`, `CommitmentPaymentStatus` (keep `CommitmentPaymentStatus` only if still referenced — after refactor `commitment_row` no longer references either enum directly; verify and drop), `Colors`, the `IconName` type line.
  - Replace lines 52-60 region with:
    ```tsx
    const statusColor = STATUS_COLORS[payment.status];
    const statusLabel = STATUS_LABELS[payment.status];
    const { amount, showTilde } = resolveDisplayAmount(payment, commitment);
    const formattedAmount = amount != null ? numberFmt.format(amount) : '—';
    const iconBg = category?.color ? `${category.color}2E` : CoreTokens.surfaceEl;
    ```
  - Leave the JSX (which reads `statusColor`, `statusLabel`, `STATUS_ICONS[payment.status]`, `showTilde`, `formattedAmount`) unchanged → identical render.

- [ ] **Step 5: Refactor `current_cycle_card.tsx`** — delete local maps (lines 20-40) + inline amount logic (lines 52-57). Add `import { STATUS_COLORS, STATUS_ICONS, STATUS_LABELS, resolveDisplayAmount } from '@/screens/commitments/commitment_status';`. Replace:
  ```tsx
  const statusColor = STATUS_COLORS[payment.status];
  const statusLabel = STATUS_LABELS[payment.status];
  const { amount, showTilde } = resolveDisplayAmount(payment, commitment);
  const amountText =
    amount != null
      ? `${showTilde ? '~' : ''}${numberFmt.format(amount)} ${payment.currency}`
      : commitment.amount_type === AmountType.Variable
        ? Strings.commitmentsAmountVariable
        : '—';
  ```
  Keep `AmountType` import (still used in the `amountText` fallback). Drop `CommitmentPaymentStatus`/`Colors`/local `IconName` if now unused (verify: `isActionable` still uses `CommitmentPaymentStatus` → **keep** that import; `Colors` was only used by the maps → drop; `IconName` type only used by maps → drop).

- [ ] **Step 6: Refactor `payment_row.tsx`** — delete local COLORS+LABELS maps (lines 11-24). Add `import { STATUS_COLORS, STATUS_LABELS } from '@/screens/commitments/commitment_status';`. Keep its own `displayAmount` line (line 36 — simpler resolution, NOT `resolveDisplayAmount`). Drop now-unused `CommitmentPaymentStatus`/`Colors` imports (verify `CommitmentPaymentStatus` no longer referenced → drop; `Colors` dropped).

- [ ] **Step 7: Refactor `detail_hero.tsx`** — replace inline amount logic (lines 44-50) with `resolveDisplayAmount`. Add `import { resolveDisplayAmount } from '@/screens/commitments/commitment_status';`. Replace:
  ```tsx
  const { amount, showTilde } = resolveDisplayAmount(payment, commitment);
  const currency = payment?.currency ?? commitment.currency;
  const amountText =
    amount != null
      ? `${showTilde ? '~' : ''}${currency} ${numberFmt.format(amount)}`
      : commitment.amount_type === AmountType.Variable
        ? Strings.commitmentsAmountVariable
        : currency;
  ```
  This removes the `oxlint-disable-next-line` comment + `isPaid`/`isVariable` locals. Keep `AmountType` import (used in fallback). `CommitmentPaymentStatus` was only used by `isPaid` → **verify** and drop if unused.

- [ ] **Step 8: Verify** — `npm run typecheck` → 0 errors; `npm test -- commitment --ci` → all green; `grep -rn "STATUS_COLORS\|STATUS_LABELS\|STATUS_ICONS" screens/commitments` → only `commitment_status.ts` defines them.

---

## Task 3: Shared `ConfirmSheet` (no visual change)

**Files:**
- Create: `components/ui/confirm_sheet.tsx`
- Modify: `screens/commitments/detail/components/skip_confirm_sheet.tsx`, `screens/commitments/edit_commitment/components/deactivate_sheet.tsx` (delegate to shared)

- [ ] **Step 1: Create `components/ui/confirm_sheet.tsx`**:

```tsx
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';

interface ConfirmSheetProps {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}

export function ConfirmSheet({
  visible,
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  busy = false,
}: ConfirmSheetProps) {
  return (
    <Sheet visible={visible} onClose={busy ? () => {} : onCancel} title={title} size="sm">
      <Sheet.Body>
        <View className="gap-4 px-4 pb-6">
          <Text className="font-inter text-muted text-[15px] leading-6">{body}</Text>
          <View style={{ flexDirection: 'row' }} className="gap-3">
            <View style={{ flex: 1 }}>
              <Button variant="ghost" label={cancelLabel} onPress={onCancel} isDisabled={busy} />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                variant="primary"
                label={confirmLabel}
                isLoading={busy}
                isDisabled={busy}
                onPress={onConfirm}
              />
            </View>
          </View>
        </View>
      </Sheet.Body>
    </Sheet>
  );
}
```

> Note: `busy=false` reproduces the skip sheet exactly (cancel never disabled, confirm never loading, `onClose` unguarded). `busy` wired reproduces the deactivate sheet exactly.

- [ ] **Step 2: Rewrite `skip_confirm_sheet.tsx`** to delegate:

```tsx
import { ConfirmSheet } from '@/components/ui/confirm_sheet';
import { Strings } from '@/constants/strings';

interface Props {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function SkipConfirmSheet({ visible, onCancel, onConfirm }: Props) {
  return (
    <ConfirmSheet
      visible={visible}
      title={Strings.commitmentsSkipConfirmTitle}
      body={Strings.commitmentsSkipConfirmBody}
      confirmLabel={Strings.commitmentsSkipConfirmConfirm}
      cancelLabel={Strings.commitmentsSkipConfirmCancel}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
```

- [ ] **Step 3: Rewrite `deactivate_sheet.tsx`** to delegate:

```tsx
import { ConfirmSheet } from '@/components/ui/confirm_sheet';
import { Strings } from '@/constants/strings';

interface Props {
  visible: boolean;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeactivateSheet({ visible, busy, onCancel, onConfirm }: Props) {
  return (
    <ConfirmSheet
      visible={visible}
      busy={busy}
      title={Strings.commitmentsDeactivateTitle}
      body={Strings.commitmentsDeactivateBody}
      confirmLabel={Strings.commitmentsDeactivateConfirm}
      cancelLabel={Strings.commitmentsDeactivateCancel}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
```

- [ ] **Step 4: Verify** — `npm run typecheck`; call sites (`detail/index.tsx`, edit screen) unchanged.

---

## Task 4: Shared `ConfirmDialog` (intentional visual normalization)

**Normalization (text preserved, styling unified to the archive dialog's modern look):** scrim `rgba(0,0,0,0.6)`; `Box` card `rounded-2xl p-5`; `Text variant="h3"` title / `variant="body"` body; cancel `Button variant="secondary"`, confirm `Button variant="danger"` (all three are destructive); busy → `Button isLoading` (`"Loading..."` label) replacing the transactions hand-built spinner; categories dialog's raw `Pressable` buttons → `Button`. Each call site passes its own strings → **identical on-screen copy**.

**Files:**
- Create: `components/ui/confirm_dialog.tsx`
- Modify (delegate, keep exported API): `screens/transactions/detail/components/delete_confirm_dialog.tsx`, `screens/settings/categories/components/delete_confirmation_dialog.tsx`, `screens/accounts/detail/components/archive_confirmation_dialog.tsx`

- [ ] **Step 1: Create `components/ui/confirm_dialog.tsx`**:

```tsx
import React from 'react';
import { Modal, View } from 'react-native';

import { Box } from '@/components/ui/box';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
  busy?: boolean;
  /** Optional content rendered between the body and the button row (e.g. a warning line). */
  children?: React.ReactNode;
}

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
  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={busy ? () => {} : onCancel}
      animationType="fade"
      statusBarTranslucent
    >
      {/* Scrim — literal rgba allowed for modal scrims (spec §2.7) */}
      <View
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      >
        <Box className="bg-surface border-border w-full rounded-2xl border p-5">
          <Text variant="h3" className="text-foreground font-soraBold mb-2">
            {title}
          </Text>
          <Text variant="body" className="text-muted mb-2">
            {body}
          </Text>
          {children}
          <Box style={{ flexDirection: 'row' }} className="mt-1 gap-2">
            <Box style={{ flex: 1 }}>
              <Button
                variant="secondary"
                label={cancelLabel}
                onPress={onCancel}
                isDisabled={busy}
              />
            </Box>
            <Box style={{ flex: 1 }}>
              <Button
                variant={destructive ? 'danger' : 'primary'}
                label={confirmLabel}
                onPress={onConfirm}
                isLoading={busy}
                isDisabled={busy}
              />
            </Box>
          </Box>
        </Box>
      </View>
    </Modal>
  );
}
```

- [ ] **Step 2: Rewrite `delete_confirm_dialog.tsx`** (transactions):

```tsx
import React from 'react';

import { ConfirmDialog } from '@/components/ui/confirm_dialog';
import { Strings } from '@/constants/strings';

interface Props {
  visible: boolean;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmDialog({
  visible,
  busy,
  onCancel,
  onConfirm,
}: Props): React.ReactElement {
  return (
    <ConfirmDialog
      visible={visible}
      busy={busy}
      destructive
      title={Strings.deleteConfirmTitle}
      body={Strings.deleteConfirmBody}
      confirmLabel={Strings.deleteTransaction}
      cancelLabel={Strings.deleteCancel}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
```

- [ ] **Step 3: Rewrite `delete_confirmation_dialog.tsx`** (categories) — keep `categoryName` interpolation:

```tsx
import { ConfirmDialog } from '@/components/ui/confirm_dialog';
import { Strings } from '@/constants/strings';

interface DeleteConfirmationDialogProps {
  visible: boolean;
  categoryName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmationDialog({
  visible,
  categoryName,
  onConfirm,
  onCancel,
}: DeleteConfirmationDialogProps) {
  return (
    <ConfirmDialog
      visible={visible}
      destructive
      title={Strings.categoriesDeleteTitle}
      body={Strings.categoriesDeleteBody(categoryName)}
      confirmLabel={Strings.categoriesDeleteConfirm}
      cancelLabel={Strings.categoriesDeleteCancel}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
```

- [ ] **Step 4: Rewrite `archive_confirmation_dialog.tsx`** (accounts) — keep CC warning via `children`:

```tsx
import { ConfirmDialog } from '@/components/ui/confirm_dialog';
import { Text } from '@/components/ui/text';
import { AccountType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { Account } from '@/store/account.store';

interface ArchiveConfirmationDialogProps {
  visible: boolean;
  account: Account | undefined;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

export function ArchiveConfirmationDialog({
  visible,
  account,
  onClose,
  onConfirm,
  isLoading,
}: ArchiveConfirmationDialogProps) {
  const isCC = account?.type === AccountType.CreditCard;

  return (
    <ConfirmDialog
      visible={visible}
      busy={isLoading}
      destructive
      title={Strings.accountDetailArchiveTitle}
      body={Strings.accountDetailArchiveBody}
      confirmLabel={Strings.accountDetailArchiveConfirm}
      cancelLabel={Strings.accountDetailCancel}
      onConfirm={onConfirm}
      onCancel={onClose}
    >
      {isCC ? (
        <Text variant="caption" className="text-accent mb-2">
          {Strings.accountDetailArchiveCCWarning}
        </Text>
      ) : null}
    </ConfirmDialog>
  );
}
```

> Behavior change to confirm: archive previously used `variant="secondary"` cancel + `danger` confirm (now matches); previously its scrim was `0.65` → now `0.6`; transactions previously used `variant="outline"` cancel + spinner → now `secondary` + `"Loading..."`; categories previously raw Pressables → now Buttons. All intentional normalization.

- [ ] **Step 5: Verify** — `npm run typecheck` → 0 errors; `grep -rn "from 'react-native'" screens/settings/categories/components/delete_confirmation_dialog.tsx` → no `Modal`/`StyleSheet` leftovers; `npm test -- --ci` (delete-flow hook/state tests unaffected — they assert on store/handlers, not Modal internals).

---

## Task 5: Retire duplicate `EmptyState`

**Files:**
- Modify: `components/ui/empty_state.tsx` (add `goals`/`budget` variants)
- Modify: `app/(app)/(tabs)/goals/index.tsx`, `app/(app)/(tabs)/budget/index.tsx` (repoint import)
- Delete: `components/empty_states/index.tsx` (+ the now-empty `components/empty_states/` dir)

> goals/budget are placeholder tab screens; migrating them off the pre-rebrand twin onto the canonical rebranded empty-state is the intent. Text preserved via the same string keys; visual upgrades to the canonical style.

- [ ] **Step 1: Add variants to `components/ui/empty_state.tsx`** — extend the union (line 12-18) with `| 'goals' | 'budget'`, and add to `VARIANT_CONFIG` (after `categories`):

```tsx
  goals: {
    icon: 'target',
    headline: Strings.emptyGoalsTitle,
    description: Strings.emptyGoalsSub,
    ctaLabel: null,
    clearLabel: null,
  },
  budget: {
    icon: 'chart-pie',
    headline: Strings.emptyBudgetTitle,
    description: Strings.emptyBudgetSub,
    ctaLabel: null,
    clearLabel: null,
  },
```

> Verify `Strings.emptyGoalsTitle`, `emptyGoalsSub`, `emptyBudgetTitle`, `emptyBudgetSub` exist (they are referenced by the legacy file today → they exist). Keep `'target'`/`'chart-pie'` icons identical to legacy.

- [ ] **Step 2: Repoint `goals/index.tsx`** — change line 4 `import { EmptyState } from '@/components/empty_states';` → `import { EmptyState } from '@/components/ui/empty_state';`. No other change (still `<EmptyState variant="goals" />`).

- [ ] **Step 3: Repoint `budget/index.tsx`** — same swap → `from '@/components/ui/empty_state'` (still `<EmptyState variant="budget" />`).

- [ ] **Step 4: Delete the legacy file** — `git rm components/empty_states/index.tsx`. (Dir becomes empty → git drops it.)

- [ ] **Step 5: Verify** — `grep -rn "components/empty_states" app screens components __tests__` → no matches; `npm run typecheck` → 0 errors.

---

## Task 6: Dedupe commitment headers

**Files:**
- Create: `screens/commitments/components/commitment_header.tsx`
- Modify: `screens/commitments/index.tsx`, `screens/commitments/detail/index.tsx`, `screens/commitments/components/commitment_form_body.tsx`

- [ ] **Step 1: Create `screens/commitments/components/commitment_header.tsx`** — reproduces all three cases exactly:

```tsx
import React from 'react';
import { View } from 'react-native';

import { BackButton } from '@/components/ui/back_button';
import { Text } from '@/components/ui/text';
import { cn } from 'heroui-native';

interface CommitmentHeaderProps {
  title: string;
  /** When provided, renders a BackButton + centered title; otherwise a left-aligned title. */
  onBack?: () => void;
  /** Right-slot content (e.g. an Edit action). Falls back to a 44px spacer when `onBack` is set. */
  right?: React.ReactNode;
  /** Centered title size: large = 20px (default), false = 17px. Ignored when no `onBack`. */
  large?: boolean;
}

export function CommitmentHeader({ title, onBack, right, large = true }: CommitmentHeaderProps) {
  if (!onBack) {
    return (
      <View className="border-separator h-14 justify-center border-b px-4">
        <Text className="font-sora text-foreground text-[20px] font-semibold">{title}</Text>
      </View>
    );
  }

  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center' }}
      className="border-separator h-14 justify-between border-b px-2"
    >
      <BackButton onPress={onBack} />
      <Text
        className={cn(
          'font-sora text-foreground flex-1 text-center font-semibold',
          large ? 'text-[20px]' : 'text-[17px]',
        )}
        numberOfLines={1}
      >
        {title}
      </Text>
      {right ?? <View className="w-11" />}
    </View>
  );
}
```

- [ ] **Step 2: Use it in `commitments/index.tsx`** — replace the header `<View>…</View>` (lines 22-26) with `<CommitmentHeader title={Strings.commitmentsTitle} />`. Add `import { CommitmentHeader } from './components/commitment_header';`. Remove the now-unused `Text` import **only if** `Text` is unused elsewhere in the file (it is used by `DateHeader`? No — `DateHeader` is its own import; check: `Text` is used only in the removed header → drop the `Text` import). Keep `View` import (used by `ListHeaderComponent` wrapper? `View` still used at lines 31+? the SectionList uses `View`? — verify; `renderSectionHeader`/`ListHeaderComponent` use fragments, not `View`. If `View` becomes unused, drop it).

- [ ] **Step 3: Use it in `detail/index.tsx`** — replace header (lines 23-50) with:

```tsx
<CommitmentHeader
  title={state.commitment?.name ?? ''}
  onBack={goBack}
  right={
    state.viewState === 'ready' && state.commitment ? (
      <Pressable
        onPress={goToEdit}
        hitSlop={8}
        className="min-w-[44px] items-center justify-center px-1"
      >
        <Text className="font-inter text-[15px] font-semibold" style={{ color: GoldTokens[500] }}>
          {Strings.commitmentsDetailEdit}
        </Text>
      </Pressable>
    ) : undefined
  }
/>
```

Add `import { CommitmentHeader } from './components/commitment_header';`. Remove the now-unused `BackButton` import (moved into the shared header). Keep `Pressable`, `Text`, `GoldTokens`, `Strings`, `View` (still used elsewhere: loading/notFound blocks use `View`/`Text`/`GoldTokens`). The not-ready spacer changes from `min-w-[44px]` to the shared `w-11` (both 44px → visually identical).

- [ ] **Step 4: Use it in `commitment_form_body.tsx`** — replace header (lines 195-204) with `<CommitmentHeader title={title} onBack={() => router.back()} large={false} />` (17px). Add `import { CommitmentHeader } from './commitment_header';` (same dir). Remove now-unused `BackButton` import **only if** unused elsewhere (it is only used by the header → drop). Keep `router` (used elsewhere? `router` is used only here for `router.back()` → still used inside the arrow → keep). Keep `View`/`Text` (heavily used in form body).

- [ ] **Step 5: Verify** — `npm run typecheck` → 0 errors; `grep -rn "h-14" screens/commitments/index.tsx screens/commitments/detail/index.tsx screens/commitments/components/commitment_form_body.tsx` → no inline header `View`s remain; `npm test -- commitments --ci` → green.

---

## Task 7: CI parity, commit, PR, review, merge decision

- [ ] **Step 1: Worktree env** — confirm real `node_modules` (661 entries ✓) + `expo-env.d.ts` (✓) present.
- [ ] **Step 2: Full CI parity chain** (per CLAUDE.md):
  ```bash
  npm run format:check && npm run lint && npm run typecheck && npm test -- --ci \
    && npx --yes expo-doctor && npx expo prebuild --no-install --platform android && test -d android \
    && echo "✓ CI parity green"
  ```
  Fix-and-rerun from the top until green. (Run `npm run lint:fix` / `npm run format` to auto-fix where possible.)
- [ ] **Step 3: Commit** — one focused commit: `refactor(cleanup): post-ship wave 2 dedup`. Body lists the 6 dedups + the confirm-dialog/header normalization note.
- [ ] **Step 4: Push + PR** — summary (6 dedups, new shared units, files deleted) + test plan + explicit "visual normalization" callout for ConfirmDialog + headers.
- [ ] **Step 5: Independent code review (Tariq lens)** — focus: zero text regressions, no dangling imports, normalization is faithful, new helper tested.
- [ ] **Step 6: Merge decision** — this wave carries **visual** (not text) changes in confirm dialogs + headers + goals/budget empty states. Surface the device-QA option to the user before merge (Wave 1 precedent: user chose CI-green merge). Escalate only if a trigger surfaces.

---

## Out of scope (later waves)

- HeroUI-primitive swaps (`Chip`/`Tabs`/`Accordion`/`Dialog`/`Card`/`ListGroup`/`Button`), token-source standardization on `theme_tokens`, the chip/accordion/tabs dedups → **Wave 4** (needs device QA).
- `goals`/`budget` tab `SafeAreaView`→`Screen` migration, dashboard header `View`→`Box` nit, `nextDueDate` reimplementation, `payment_history.tsx` nested-FlatList, `transaction_form_body` raw `TextInput`, `decimal_amount_input` per-instance store, `edit_transaction.state` `open(tx)` no-op → low-priority anatomy/bug nits (separate follow-ups).
