import type { ComponentProps } from 'react';

import type { Currency, TransactionType } from '@/constants/enums';

import type { TransactionFormMode } from '../transaction_form.types';
import { ExchangeRateRow } from './exchange_rate_row';
import { useTransactionRatePreview } from './transaction_rate_preview.hook';

interface Props extends Omit<ComponentProps<typeof ExchangeRateRow>, 'previewEgpAmount'> {
  mode: TransactionFormMode;
  type: TransactionType;
  sourceCurrency: Currency | undefined;
  destinationCurrency: Currency | undefined;
}

export function TransactionExchangeRateRow({
  mode,
  type,
  sourceCurrency,
  destinationCurrency,
  ...props
}: Props): React.ReactElement {
  // The typed amount is subscribed to here rather than in the form hook — see
  // `useTransactionRatePreview`'s note. `props.value` is the rate field's own
  // string, so the preview still tracks a rate being edited keystroke for
  // keystroke, as it did when this row did the arithmetic itself.
  const previewEgpAmount = useTransactionRatePreview({
    mode,
    type,
    sourceCurrency,
    destinationCurrency,
    exchangeRate: props.value,
  });
  return <ExchangeRateRow {...props} previewEgpAmount={previewEgpAmount} />;
}
