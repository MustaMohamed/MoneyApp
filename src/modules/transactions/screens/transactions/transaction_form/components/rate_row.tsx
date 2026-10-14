import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useWindowDimensions } from 'react-native';

import { Text } from '@/components/ui/text';
import {
  resolveOneLineTextProps,
  scaledTextStyleAboveOne,
} from '@/components/ui/text_scale.geometry';
import { Strings } from '@/constants/strings';
import { Size, Type, lineHeightFor } from '@/constants/theme';
import { CoreTokens } from '@/constants/theme_tokens';

import { formatRateRowValue, isRateStale } from '../transaction_form.helpers';
import { FormPickerRow } from './form_picker_row';
import { openRateEditor } from './rate_editor_sheet.hook';

interface Props {
  ownerId: string;
  value: string;
  rateUpdatedAt: string | null;
}

export function RateRow({ ownerId, value, rateUpdatedAt }: Props): React.ReactElement {
  const { fontScale } = useWindowDimensions();
  const captionLine = resolveOneLineTextProps(scaledTextStyleAboveOne(Type.micro, fontScale));

  return (
    <FormPickerRow
      testID="exchange-rate-row"
      label={Strings.addTxRateLabel}
      value={formatRateRowValue(value)}
      divider={false}
      // The editor opens on the form's own text; the row's rounding never reaches it.
      onPress={() => openRateEditor(ownerId, value)}
      labelCaption={
        isRateStale(rateUpdatedAt, Date.now()) ? (
          <Text
            testID="exchange-rate-row-stale"
            className="font-inter text-warning"
            {...captionLine}
            style={{
              fontSize: Type.micro,
              lineHeight: lineHeightFor(Type.micro),
              ...captionLine.style,
            }}
          >
            {Strings.addTxRateStale}
          </Text>
        ) : undefined
      }
      suffix={
        <MaterialCommunityIcons name="chevron-right" size={Size.iconSm} color={CoreTokens.text2} />
      }
    />
  );
}
