import type { ComponentProps } from 'react';

import { ExchangeRateRow } from './exchange_rate_row';

type Props = Omit<ComponentProps<typeof ExchangeRateRow>, 'previewEgpAmount' | 'previewHidden'>;

export function TransactionExchangeRateRow(props: Props): React.ReactElement {
  return <ExchangeRateRow {...props} previewHidden previewEgpAmount={undefined} />;
}
