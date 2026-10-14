import { Text } from '@/components/ui/text';
import type { OneLineTextProps } from '@/components/ui/text_scale.geometry';

import { formatConvertedAmount } from '../transaction_form.helpers';
import { AMOUNT_MESSAGE_TEXT_STYLE } from './transaction_form.geometry';
import { type RatePreviewInput, useTransactionRatePreview } from './transaction_rate_preview.hook';

type Props = RatePreviewInput & {
  testID?: string;
  textAlign?: 'center' | 'left';
  /** Scales the line in JS above scale 1 so its tail ellipsis stays inside its box; unset, the OS scales it. */
  oneLine?: OneLineTextProps;
};

export function ConvertedAmountLine({
  testID = 'converted-amount-line',
  textAlign = AMOUNT_MESSAGE_TEXT_STYLE.textAlign,
  oneLine,
  ...input
}: Props): React.ReactElement {
  const converted = useTransactionRatePreview(input);

  return (
    <Text
      testID={testID}
      className="font-inter text-muted"
      numberOfLines={1}
      allowFontScaling={oneLine?.allowFontScaling}
      style={{ ...AMOUNT_MESSAGE_TEXT_STYLE, textAlign, ...oneLine?.style }}
    >
      {formatConvertedAmount(converted)}
    </Text>
  );
}
