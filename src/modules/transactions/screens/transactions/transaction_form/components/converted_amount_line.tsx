import { Text } from '@/components/ui/text';

import { formatConvertedAmount } from '../transaction_form.helpers';
import { AMOUNT_MESSAGE_TEXT_STYLE } from './transaction_form.geometry';
import { type RatePreviewInput, useTransactionRatePreview } from './transaction_rate_preview.hook';

export function ConvertedAmountLine(props: RatePreviewInput): React.ReactElement {
  const converted = useTransactionRatePreview(props);

  return (
    <Text
      testID="converted-amount-line"
      className="font-inter text-muted"
      numberOfLines={1}
      style={AMOUNT_MESSAGE_TEXT_STYLE}
    >
      {formatConvertedAmount(converted)}
    </Text>
  );
}
