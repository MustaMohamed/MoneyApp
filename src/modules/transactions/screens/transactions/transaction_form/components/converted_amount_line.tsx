import { Text } from '@/components/ui/text';

import { formatConvertedAmount } from '../transaction_form.helpers';
import { AMOUNT_MESSAGE_TEXT_STYLE } from './transaction_form.geometry';
import { type RatePreviewInput, useTransactionRatePreview } from './transaction_rate_preview.hook';

type Props = RatePreviewInput & { testID?: string; textAlign?: 'center' | 'left' };

export function ConvertedAmountLine({
  testID = 'converted-amount-line',
  textAlign = AMOUNT_MESSAGE_TEXT_STYLE.textAlign,
  ...input
}: Props): React.ReactElement {
  const converted = useTransactionRatePreview(input);

  return (
    <Text
      testID={testID}
      className="font-inter text-muted"
      numberOfLines={1}
      style={{ ...AMOUNT_MESSAGE_TEXT_STYLE, textAlign }}
    >
      {formatConvertedAmount(converted)}
    </Text>
  );
}
