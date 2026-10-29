import { Card } from 'heroui-native';
import { View, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';

import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status_badge';
import { Text } from '@/components/ui/text';
import { resolveFitAmountTextProps, scaledTextStyle } from '@/components/ui/text_scale.geometry';
import { Strings } from '@/constants/strings';
import { LetterSpacing, Spacing } from '@/constants/theme';

import { DAY_INDICATOR_CLASS } from '../../../../utils/day_indicator';
import { cardEntering } from '../detail.anim';
import type { CommitmentCycleCardModel } from '../detail.helpers';
import {
  CURRENT_CYCLE_ACTIONS_GAP,
  CURRENT_CYCLE_ACTION_GAP,
  CURRENT_CYCLE_AMOUNT_FONT_SIZE,
  CURRENT_CYCLE_AMOUNT_GAP,
  CURRENT_CYCLE_CARD_FRAME_STYLE,
  CURRENT_CYCLE_CODE_FONT_SIZE,
  CURRENT_CYCLE_DAY_LINE_FONT_SIZE,
  CURRENT_CYCLE_DUE_DAY_FONT_SIZE,
  CURRENT_CYCLE_LINE_GAP,
  CURRENT_CYCLE_OVERLINE_FONT_SIZE,
  CURRENT_CYCLE_ROW_GAP,
  resolveCurrentCycleCardGeometry,
} from './current_cycle_card.geometry';

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
        <View
          style={{
            flexDirection: 'row',
            gap: CURRENT_CYCLE_ACTION_GAP,
            marginTop: CURRENT_CYCLE_ACTIONS_GAP,
          }}
        >
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
        <View style={{ flexDirection: 'row', marginTop: CURRENT_CYCLE_ACTIONS_GAP }}>
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
  const amountProps = resolveFitAmountTextProps(CURRENT_CYCLE_AMOUNT_FONT_SIZE, fontScale);
  const { height } = resolveCurrentCycleCardGeometry(fontScale, model.action.kind !== 'none');

  return (
    <Animated.View entering={cardEntering} className="mx-4 mt-4">
      <Card
        testID="commitment-detail-cycle"
        className="bg-surface border-accent/18"
        style={{ ...CURRENT_CYCLE_CARD_FRAME_STYLE, minHeight: height }}
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
              ...scaledTextStyle(CURRENT_CYCLE_OVERLINE_FONT_SIZE, fontScale),
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
            marginTop: CURRENT_CYCLE_ROW_GAP,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              allowFontScaling={false}
              numberOfLines={1}
              className="font-inter-medium text-foreground"
              style={scaledTextStyle(CURRENT_CYCLE_DUE_DAY_FONT_SIZE, fontScale)}
            >
              {model.dueDay}
            </Text>
            <Text
              allowFontScaling={false}
              numberOfLines={1}
              className={DAY_INDICATOR_CLASS[model.dayLineTone]}
              style={{
                ...scaledTextStyle(CURRENT_CYCLE_DAY_LINE_FONT_SIZE, fontScale),
                marginTop: CURRENT_CYCLE_LINE_GAP,
              }}
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
              gap: CURRENT_CYCLE_AMOUNT_GAP,
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
              style={scaledTextStyle(CURRENT_CYCLE_CODE_FONT_SIZE, fontScale)}
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
