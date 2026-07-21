import { Input } from 'heroui-native';
import { View } from 'react-native';
import { tv } from 'tailwind-variants';

import { useBottomSheetAwareHandlers } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Currency, TransactionType } from '@/constants/enums';
import { CoreTokens } from '@/constants/theme_tokens';

import type { TransactionFormMode } from '../transaction_form.types';
import { useTransactionAmount } from './transaction_amount.hook';

const amountClass = tv({
  base: 'font-sora min-h-0 rounded-none border-0 bg-transparent px-0 py-0 text-[40px]',
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

function sanitize(text: string): string {
  const cleaned = text.replace(/[^0-9.]/g, '');
  if (cleaned === '') return '';

  const normalized = cleaned.startsWith('.') ? `0${cleaned}` : cleaned;
  const parts = normalized.split('.');
  if (parts.length === 1) return parts[0];

  const integer = parts[0];
  const decimals = parts.slice(1).join('').slice(0, 2);
  return decimals.length === 0 && normalized.endsWith('.')
    ? `${integer}.`
    : `${integer}.${decimals}`;
}

export function AmountHero({ onChange, type, currency, mode }: Props): React.ReactElement {
  const { onFocus, onBlur } = useBottomSheetAwareHandlers();
  const amountStr = useTransactionAmount(mode);

  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center' }}
      className="border-separator gap-2 border-b py-4"
    >
      <Text className="font-inter text-muted text-[15px]">{currency}</Text>
      <Input
        testID="amount-hero-value"
        value={amountStr}
        onChangeText={(text) => onChange(sanitize(text))}
        onFocus={onFocus}
        onBlur={onBlur}
        keyboardType="decimal-pad"
        className={amountClass({ type })}
        style={{ minWidth: 80, textAlign: 'center', padding: 0 }}
        placeholder="0"
        placeholderTextColor={CoreTokens.text2}
      />
    </View>
  );
}
