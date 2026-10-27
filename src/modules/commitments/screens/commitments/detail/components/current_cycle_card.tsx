import { Card } from 'heroui-native';
import { View, type ViewStyle, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';

import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status_badge';
import { Text } from '@/components/ui/text';
import { resolveFitAmountTextProps, scaledTextStyle } from '@/components/ui/text_scale.geometry';
import { Strings } from '@/constants/strings';
import { LetterSpacing, Radius, Spacing, Type } from '@/constants/theme';

import { DAY_INDICATOR_CLASS } from '../../../../utils/day_indicator';
import { cardEntering } from '../detail.anim';
import type { CommitmentCycleCardModel } from '../detail.helpers';

// Frame C1 `.cyc`.
const CYCLE_CARD_FRAME_STYLE: Readonly<ViewStyle> = Object.freeze({
  borderRadius: Radius.detailCard,
  boxShadow: 'none',
  paddingTop: Spacing.sm,
  paddingBottom: Spacing.sm + Spacing.xxxs,
  paddingHorizontal: Spacing.md,
});

interface Props {
  model: CommitmentCycleCardModel;
  onPay: () => void;
  onSkip: () => void;
  onViewTransaction: () => void;
}

function CycleActions({
  model,
  onPay,
  onSkip,
  onViewTransaction,
}: Props): React.ReactElement | null {
  const { action } = model;
  switch (action.kind) {
    case 'paySkip':
      return (
        <View style={{ flexDirection: 'row', gap: Spacing.xs, marginTop: Spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Button variant="primary" flat label={Strings.commitmentsMarkAsPaid} onPress={onPay} />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              variant="secondary"
              flat
              icon="minus-circle-outline"
              label={Strings.commitmentsSkip}
              onPress={onSkip}
            />
          </View>
        </View>
      );
    case 'viewTransaction':
      return (
        <View style={{ flexDirection: 'row', marginTop: Spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Button
              variant="secondary"
              flat
              icon="arrow-right"
              label={Strings.commitmentsViewTransaction}
              onPress={onViewTransaction}
            />
          </View>
        </View>
      );
    case 'none':
      return null;
    default: {
      const unhandled: never = action;
      return unhandled;
    }
  }
}

export function CurrentCycleCard(props: Props): React.ReactElement {
  const { model } = props;
  const { fontScale } = useWindowDimensions();
  const amountProps = resolveFitAmountTextProps(Type.title, fontScale);

  return (
    <Animated.View entering={cardEntering} className="mx-4 mt-4">
      <Card
        testID="commitment-detail-cycle"
        className="bg-surface border-accent/18 border"
        style={CYCLE_CARD_FRAME_STYLE}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: Spacing.xs,
          }}
        >
          <Text
            allowFontScaling={false}
            numberOfLines={1}
            className="font-inter-semibold text-muted uppercase"
            style={{
              ...scaledTextStyle(Type.overline, fontScale),
              letterSpacing: LetterSpacing.eyebrow,
              flexShrink: 1,
            }}
          >
            {Strings.commitmentsDetailCurrentCycle}
          </Text>
          <StatusBadge
            size="tagMd"
            fontScale={fontScale}
            label={model.statusLabel}
            icon={model.statusIcon}
            fill={model.statusFill}
            foreground={model.statusForeground}
          />
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: Spacing.xs,
            marginTop: Spacing.xs,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              allowFontScaling={false}
              numberOfLines={1}
              className="font-inter-medium text-foreground"
              style={scaledTextStyle(Type.body, fontScale)}
            >
              {model.dueDay}
            </Text>
            <Text
              allowFontScaling={false}
              numberOfLines={1}
              className={DAY_INDICATOR_CLASS[model.dayLineTone]}
              style={{ ...scaledTextStyle(Type.micro, fontScale), marginTop: Spacing.xxxs }}
            >
              {model.dayLine}
            </Text>
          </View>
          <View
            accessible
            accessibilityLabel={model.amountAccessibilityLabel}
            style={{
              flexDirection: 'row',
              alignItems: 'baseline',
              gap: Spacing.xxs,
              flexShrink: 1,
            }}
          >
            <Text
              {...amountProps}
              className="font-sora-semibold text-foreground tabular-nums"
              style={{ ...amountProps.style, flexShrink: 1 }}
            >
              {model.amountText}
            </Text>
            <Text
              allowFontScaling={false}
              numberOfLines={1}
              className="font-inter text-content-secondary"
              style={scaledTextStyle(Type.micro, fontScale)}
            >
              {model.amountCode}
            </Text>
          </View>
        </View>

        <CycleActions {...props} />
      </Card>
    </Animated.View>
  );
}
