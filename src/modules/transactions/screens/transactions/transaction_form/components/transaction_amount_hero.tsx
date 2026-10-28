import { AmountHero } from '@/components/ui/amount_hero';
import type { Currency, TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { AMOUNT_HERO_TONE } from '@/modules/transactions/constants/amount_hero_tone';

import type { TransactionFormMode } from '../transaction_form.types';
import { useTransactionAmount } from './transaction_amount.hook';

interface Props {
  onChange: (value: string) => void;
  type: TransactionType;
  currency: Currency;
  mode: TransactionFormMode;
  invalid?: boolean;
}

export function TransactionAmountHero({
  onChange,
  type,
  currency,
  mode,
  invalid = false,
}: Props): React.ReactElement {
  const amountStr = useTransactionAmount(mode);
  return (
    <AmountHero
      onChange={onChange}
      value={amountStr}
      tone={AMOUNT_HERO_TONE[type]}
      currency={currency}
      invalid={invalid}
      accessibilityLabel={Strings.addTxAmountInputAccessibility}
    />
  );
}
