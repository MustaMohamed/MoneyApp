import { Input, Separator } from 'heroui-native';
import { View } from 'react-native';
import { tv } from 'tailwind-variants';

import { useBottomSheetAwareHandlers } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Currency, TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors, Type, lineHeightFor } from '@/constants/theme';
import { CoreTokens } from '@/constants/theme_tokens';
import { maskMoneyFieldText } from '@/utils/money_text';

import type { TransactionFormMode } from '../transaction_form.types';
import { useTransactionAmount } from './transaction_amount.hook';
import { AMOUNT_ERROR_LINE_HEIGHT } from './transaction_form.geometry';

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
  invalid?: boolean;
}

export function AmountHero({
  onChange,
  type,
  currency,
  mode,
  invalid = false,
}: Props): React.ReactElement {
  const { onFocus, onBlur } = useBottomSheetAwareHandlers();
  const amountStr = useTransactionAmount(mode);

  // Two equal columns flank the input, so the number is centred whatever the code beside it measures.
  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'baseline' }}
      className="border-separator border-b py-4"
    >
      <View style={{ flex: 1, alignItems: 'flex-end' }} className="pr-2">
        <Text
          className="font-inter text-muted"
          style={{ fontSize: Type.bodyStrong, lineHeight: lineHeightFor(Type.bodyStrong) }}
        >
          {currency}
        </Text>
      </View>
      <View>
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
            // HeroUI's Android focus border outranks `border-0`; the caret is the amount's only focus mark.
            borderColor: Colors.shared.transparent,
            fontSize: Type.amountEntry,
            lineHeight: lineHeightFor(Type.amountEntry),
          }}
          placeholder={Strings.addTxAmountPlaceholder}
          placeholderTextColor={CoreTokens.text2}
        />
        {invalid ? (
          <Separator
            testID="amount-hero-error-line"
            className="bg-danger"
            thickness={AMOUNT_ERROR_LINE_HEIGHT}
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}
          />
        ) : null}
      </View>
      <View style={{ flex: 1 }} />
    </View>
  );
}
