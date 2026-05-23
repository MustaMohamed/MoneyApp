/**
 * AmountHero — the big centred amount entry at the top of the form.
 *
 * Original spec used a custom 4×3 Numpad component for amount entry. On-device
 * QA showed that wasted vertical space (couldn't scroll the rest of the form
 * past it) and gave the sheet a calculator feel. Replaced with an editable
 * BottomSheetTextInput driving the system decimal-pad keyboard — the keyboard
 * appears on focus, content scrolls naturally as the keyboard pushes it up,
 * and the rest of the form (account/category/note rows) is fully reachable.
 *
 * BottomSheetTextInput (not plain TextInput) is required so the bottom-sheet
 * gesture handler suspends pan-down-to-close while typing, and so the sheet
 * lifts content above the keyboard.
 */
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { tv } from 'tailwind-variants';

import { Text } from '@/components/ui/text';
import { Currency, TransactionType } from '@/constants/enums';
import { CoreTokens } from '@/constants/theme_tokens';

const amountClass = tv({
  base: 'font-sora text-[40px]',
  variants: {
    type: {
      expense: 'text-danger',
      income: 'text-success',
      transfer: 'text-info',
      cc_payment: 'text-accent-cc',
    },
  },
});

interface Props {
  amountStr: string;
  onChange: (v: string) => void;
  type: TransactionType;
  currency: Currency;
  /**
   * When the parent sheet's visible prop transitions false → true, AmountHero
   * focuses its TextInput so the system decimal-pad keyboard opens
   * automatically. The user requested this from §7 QA: opening the sheet and
   * having to tap the amount before typing was an extra step that the legacy
   * numpad implicitly skipped (it was always "open"). A short delay lets the
   * sheet's snap animation settle before keyboard animation begins so the
   * two don't visually fight.
   */
  visible?: boolean;
}

/**
 * Sanitize raw keyboard input. Rules (in order):
 *  1. Strip everything except digits and '.'.
 *  2. Collapse multiple '.' to a single one (keep the first).
 *  3. Cap decimal places at 2.
 *  4. Empty input becomes '0' (so amount=0 in the form, not NaN).
 *  5. Preserve a trailing '.' during entry (e.g. "100.") so users can keep typing.
 */
function sanitize(text: string): string {
  const cleaned = text.replace(/[^0-9.]/g, '');
  if (cleaned === '') return '0';
  const parts = cleaned.split('.');
  if (parts.length === 1) return parts[0];
  const integer = parts[0];
  const decimals = parts.slice(1).join('').slice(0, 2);
  // If user just typed the '.' and hasn't entered decimals yet, keep the dot.
  return decimals.length === 0 && cleaned.endsWith('.') ? `${integer}.` : `${integer}.${decimals}`;
}

/**
 * Minimal ref shape we need at runtime: just `.focus()`. BottomSheetTextInput
 * forwards refs to react-native-gesture-handler's TextInput (not RN's), and
 * the two TextInput types diverge at the type level even though both expose
 * `focus()`. Typing the ref as the surface we actually use sidesteps the
 * cross-package type clash without resorting to `any`.
 */
type FocusableRef = { focus: () => void } | null;

export function AmountHero({
  amountStr,
  onChange,
  type,
  currency,
  visible,
}: Props): React.ReactElement {
  const inputRef = useRef<FocusableRef>(null);

  useEffect(() => {
    if (visible) {
      // 250ms ≈ the BottomSheet snap animation duration. Focusing earlier
      // causes the keyboard to begin animating up while the sheet is still
      // mid-snap, producing a visible content jump as the snap target shifts.
      const timer = setTimeout(() => inputRef.current?.focus(), 250);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [visible]);

  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center' }}
      className="border-separator gap-2 border-b py-4"
    >
      <Text className="font-inter text-muted text-[15px]">{currency}</Text>
      <BottomSheetTextInput
        // Cast through unknown to the broad Ref: the upstream component's
        // ref type comes from react-native-gesture-handler's TextInput while
        // our FocusableRef only describes the methods we call. Both refer to
        // the same runtime object — the cast is structural-only.
        // oxlint-disable-next-line typescript/no-explicit-any, typescript/no-unsafe-type-assertion -- structural cast for RNGH TextInput ref compatibility
        ref={inputRef as unknown as React.Ref<any>}
        testID="amount-hero-value"
        value={amountStr}
        onChangeText={(t) => onChange(sanitize(t))}
        keyboardType="decimal-pad"
        selectTextOnFocus
        className={amountClass({ type })}
        // Force textAlign:center on the input so single-digit amounts ("0")
        // still appear centred within the hero row's flex layout.
        style={{ minWidth: 80, textAlign: 'center', padding: 0 }}
        placeholder="0"
        placeholderTextColor={CoreTokens.text2}
      />
    </View>
  );
}
