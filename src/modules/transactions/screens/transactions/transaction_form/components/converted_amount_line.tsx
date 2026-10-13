import { useWindowDimensions } from 'react-native';

import { Text } from '@/components/ui/text';
import {
  resolveOneLineTextProps,
  scaledTextStyleAboveOne,
} from '@/components/ui/text_scale.geometry';
import type { Currency, TransactionType } from '@/constants/enums';
import { Type, lineHeightFor } from '@/constants/theme';

import { formatConvertedAmount } from '../transaction_form.helpers';
import type { TransactionFormMode } from '../transaction_form.types';
import { useTransactionRatePreview } from './transaction_rate_preview.hook';

interface Props {
  mode: TransactionFormMode;
  type: TransactionType;
  sourceCurrency: Currency | undefined;
  destinationCurrency: Currency | undefined;
  /** The rate exactly as the field holds it, unparsed. */
  exchangeRate: string;
}

export function ConvertedAmountLine(props: Props): React.ReactElement {
  const converted = useTransactionRatePreview(props);
  const { fontScale } = useWindowDimensions();
  const oneLine = resolveOneLineTextProps(scaledTextStyleAboveOne(Type.micro, fontScale));

  return (
    <Text
      testID="converted-amount-line"
      className="font-inter text-muted"
      {...oneLine}
      style={{
        fontSize: Type.micro,
        lineHeight: lineHeightFor(Type.micro),
        textAlign: 'center',
        ...oneLine.style,
      }}
    >
      {formatConvertedAmount(converted)}
    </Text>
  );
}
