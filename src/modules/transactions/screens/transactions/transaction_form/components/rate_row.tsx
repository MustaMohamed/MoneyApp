import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Strings } from '@/constants/strings';
import { Size } from '@/constants/theme';
import { CoreTokens } from '@/constants/theme_tokens';

import { formatRateRowValue } from '../transaction_form.helpers';
import { FormPickerRow } from './form_picker_row';
import { openRateEditor } from './rate_editor_sheet.hook';
import { RateStaleLine } from './rate_stale_line';

interface Props {
  ownerId: string;
  value: string;
  stale: boolean;
}

export function RateRow({ ownerId, value, stale }: Props): React.ReactElement {
  return (
    <FormPickerRow
      testID="exchange-rate-row"
      label={Strings.addTxRateLabel}
      value={formatRateRowValue(value)}
      divider={false}
      // The editor opens on the form's own text; the row's rounding never reaches it.
      onPress={() => openRateEditor(ownerId, value)}
      labelCaption={stale ? <RateStaleLine testID="exchange-rate-row-stale" /> : undefined}
      suffix={
        <MaterialCommunityIcons name="chevron-right" size={Size.iconSm} color={CoreTokens.text2} />
      }
    />
  );
}
