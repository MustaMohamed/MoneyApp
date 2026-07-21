import type { ComponentProps } from 'react';

import type { TransactionFormMode } from '../transaction_form_host.state';
import { ExchangeRateRow } from './exchange_rate_row';
import { useTransactionAmount } from './transaction_amount.hook';

interface Props extends Omit<ComponentProps<typeof ExchangeRateRow>, 'amount'> {
  mode: TransactionFormMode;
}

export function TransactionExchangeRateRow({ mode, ...props }: Props): React.ReactElement {
  const amount = parseFloat(useTransactionAmount(mode)) || 0;
  return <ExchangeRateRow {...props} amount={amount} />;
}
