import { View, useWindowDimensions } from 'react-native';

import { Text } from '@/components/ui/text';
import { resolveFitAmountTextProps, scaledTextStyle } from '@/components/ui/text_scale.geometry';
import { Spacing, Type } from '@/constants/theme';
import { ms } from '@/utils/responsive';

import { DAY_INDICATOR_CLASS } from '../../../../utils/day_indicator';
import type { CommitmentPaymentRowModel } from '../detail.helpers';

// Frame C1 `.prow`.
const PAYMENT_ROW_MIN_HEIGHT = ms(48);
const PAYMENT_ROW_DOT_SIZE = ms(8);
const PAYMENT_ROW_SPACE = Spacing.xs + Spacing.xxxs;

interface Props {
  row: CommitmentPaymentRowModel;
  showDivider: boolean;
}

export function PaymentRow({ row, showDivider }: Props): React.ReactElement {
  const { fontScale } = useWindowDimensions();
  const amountProps = resolveFitAmountTextProps(Type.meta, fontScale);
  const inkClass = row.dimmed ? 'text-foreground/60' : 'text-foreground';

  return (
    <View
      className={showDivider ? 'border-separator border-b' : undefined}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: PAYMENT_ROW_MIN_HEIGHT,
        paddingVertical: PAYMENT_ROW_SPACE,
        paddingHorizontal: Spacing.md,
      }}
    >
      <View
        style={{
          width: PAYMENT_ROW_DOT_SIZE,
          height: PAYMENT_ROW_DOT_SIZE,
          borderRadius: PAYMENT_ROW_DOT_SIZE / 2,
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
      <View
        accessible
        accessibilityLabel={row.amountAccessibilityLabel}
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          gap: Spacing.xxs,
          flexShrink: 1,
          marginLeft: PAYMENT_ROW_SPACE,
        }}
      >
        <Text
          {...amountProps}
          className={`font-sora tabular-nums ${inkClass}`}
          style={{ ...amountProps.style, flexShrink: 1 }}
        >
          {row.amountText}
        </Text>
        <Text
          allowFontScaling={false}
          numberOfLines={1}
          className="font-inter text-content-secondary"
          style={scaledTextStyle(Type.micro, fontScale)}
        >
          {row.amountCode}
        </Text>
      </View>
    </View>
  );
}
