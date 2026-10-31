import { View, useWindowDimensions } from 'react-native';

import { Text } from '@/components/ui/text';
import { scaledTextStyle } from '@/components/ui/text_scale.geometry';
import { Size, Spacing, Type } from '@/constants/theme';

import { DAY_INDICATOR_CLASS } from '../../../../utils/day_indicator';
import type { CommitmentPaymentRowModel } from '../detail.helpers';
import { CommitmentAmount } from './commitment_amount';

// Frame C1 `.prow`.
const PAYMENT_ROW_SPACE = Spacing.xs + Spacing.xxxs;

interface Props {
  row: CommitmentPaymentRowModel;
  showDivider: boolean;
}

export function PaymentRow({ row, showDivider }: Props): React.ReactElement {
  const { fontScale } = useWindowDimensions();
  const inkClass = row.dimmed ? 'text-foreground/60' : 'text-foreground';

  return (
    <View
      className={showDivider ? 'border-separator border-b' : undefined}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: Size.paymentRowMinHeight,
        paddingVertical: PAYMENT_ROW_SPACE,
        paddingHorizontal: Spacing.md,
      }}
    >
      <View
        style={{
          width: Size.paymentRowDot,
          height: Size.paymentRowDot,
          borderRadius: Size.paymentRowDot / 2,
          backgroundColor: row.dotColor,
          marginRight: Spacing.xs,
        }}
      />
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          columnGap: PAYMENT_ROW_SPACE,
        }}
      >
        <Text
          allowFontScaling={false}
          className={`font-inter ${inkClass}`}
          style={{ ...scaledTextStyle(Type.meta, fontScale), flexGrow: 1 }}
        >
          {row.day}
        </Text>
        <Text
          allowFontScaling={false}
          className={DAY_INDICATOR_CLASS[row.lineTone]}
          style={scaledTextStyle(Type.micro, fontScale)}
        >
          {row.line}
        </Text>
      </View>
      <CommitmentAmount
        amountText={row.amountText}
        amountCode={row.amountCode}
        accessibilityLabel={row.amountAccessibilityLabel}
        amountFontSize={Type.meta}
        amountClassName={`font-sora tabular-nums ${inkClass}`}
        style={{ marginLeft: PAYMENT_ROW_SPACE }}
      />
    </View>
  );
}
