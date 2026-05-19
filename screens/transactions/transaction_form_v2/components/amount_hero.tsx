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
import React from 'react';
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

export function AmountHero({ amountStr, onChange, type, currency }: Props): React.ReactElement {
  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center' }}
      className="py-4 gap-2 border-b border-separator"
    >
      <Text className="font-inter text-[15px] text-muted">{currency}</Text>
      <BottomSheetTextInput
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
