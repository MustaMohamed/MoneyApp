import { Input } from 'heroui-native';
import { View } from 'react-native';
import { tv } from 'tailwind-variants';

import { useBottomSheetAwareHandlers } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Currency, TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Type, lineHeightFor } from '@/constants/theme';
import { CoreTokens } from '@/constants/theme_tokens';
import { maskMoneyFieldText } from '@/utils/money_text';

import type { TransactionFormMode } from '../transaction_form.types';
import { useTransactionAmount } from './transaction_amount.hook';

const amountClass = tv({
  base: 'font-sora min-h-0 rounded-none border-0 bg-transparent px-0 py-0',
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
  onChange: (value: string) => void;
  type: TransactionType;
  currency: Currency;
  mode: TransactionFormMode;
}

export function AmountHero({ onChange, type, currency, mode }: Props): React.ReactElement {
  const { onFocus, onBlur } = useBottomSheetAwareHandlers();
  const amountStr = useTransactionAmount(mode);

  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center' }}
      className="border-separator gap-2 border-b py-4"
    >
      <Text
        className="font-inter text-muted"
        style={{ fontSize: Type.bodyStrong, lineHeight: lineHeightFor(Type.bodyStrong) }}
      >
        {currency}
      </Text>
      <Input
        testID="amount-hero-value"
        value={amountStr}
        onChangeText={(text) => {
          // Diffs against the text on screen; `undefined` refuses the edit and keeps it.
          const masked = maskMoneyFieldText(amountStr, text);
          if (masked !== undefined) onChange(masked);
        }}
        onFocus={onFocus}
        onBlur={onBlur}
        keyboardType="decimal-pad"
        accessibilityLabel={Strings.addTxAmountInputAccessibility}
        className={amountClass({ type })}
        style={{
          minWidth: 80,
          textAlign: 'center',
          padding: 0,
          fontSize: Type.amountEntry,
          lineHeight: lineHeightFor(Type.amountEntry),
        }}
        placeholder={Strings.addTxAmountPlaceholder}
        placeholderTextColor={CoreTokens.text2}
      />
    </View>
  );
}
