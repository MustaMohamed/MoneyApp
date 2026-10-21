import { Text } from '@/components/ui/text';
import type { OneLineTextProps } from '@/components/ui/text_scale.geometry';

import { AMOUNT_MESSAGE_TEXT_STYLE } from './form_sheet.geometry';
import { type ConvertedAmount, formatConvertedAmount } from './form_sheet.helpers';

interface Props {
  /** `undefined` prints the line for no conversion. */
  converted: ConvertedAmount | undefined;
  testID?: string;
  textAlign?: 'center' | 'left';
  /** Scales the line in JS above scale 1 so its tail ellipsis stays inside its box; unset, the OS scales it. */
  oneLine?: OneLineTextProps;
}

export function ConvertedAmountLine({
  converted,
  testID = 'converted-amount-line',
  textAlign = AMOUNT_MESSAGE_TEXT_STYLE.textAlign,
  oneLine,
}: Props): React.ReactElement {
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
