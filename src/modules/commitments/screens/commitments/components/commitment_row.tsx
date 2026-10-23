import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { PressableFeedback } from 'heroui-native';
import React, { useCallback, useMemo } from 'react';
import { type StyleProp, View, type ViewStyle, useWindowDimensions } from 'react-native';

import { AccountColorTile } from '@/components/ui/account_color_tile';
import { StatusBadge, resolveStatusBadgeXsMinWidth } from '@/components/ui/status_badge';
import { SwipeableRow, type SwipeAction } from '@/components/ui/swipeable_row';
import { Text } from '@/components/ui/text';
import { resolveFitAmountTextProps, scaledTextStyle } from '@/components/ui/text_scale.geometry';
import { YieldingSlot } from '@/components/ui/yielding_slot';
import { Strings } from '@/constants/strings';
import { Size } from '@/constants/theme';
import type { Account } from '@/modules/accounts/entities/account.entity';
import type { Category } from '@/modules/categories/entities/category.entity';
import type { PaymentDaySettlement } from '@/modules/commitments/domain/payment_day_distance';
import type { DayIndicatorTone } from '@/modules/commitments/utils/day_indicator';
import {
  TRANSACTION_ROW_CAPTION_SEPARATOR,
  resolveTransactionRowValueTrackMaxWidth,
} from '@/modules/transactions/components/transaction_row.helpers';
import { ms } from '@/utils/responsive';
import { useDragCancelledPress } from '@/utils/use_drag_cancelled_press.hook';

import type { Commitment } from '../../../entities/commitment.entity';
import type { CommitmentMonthPayment } from '../../../entities/commitment_payment.entity';
import {
  COMMITMENT_ROW_AMOUNT_FONT_SIZE,
  COMMITMENT_ROW_CAPTION_FONT_SIZE,
  COMMITMENT_ROW_CODE_FONT_SIZE,
  COMMITMENT_ROW_LINE_GAP,
  COMMITMENT_ROW_TITLE_FONT_SIZE,
  buildCommitmentRowPresentation,
  resolveCommitmentRowHeight,
} from './commitment_row.helpers';

const DAY_INDICATOR_CLASS: Record<DayIndicatorTone, string> = {
  danger: 'font-inter text-danger',
  gold: 'font-inter-semibold text-accent',
  caption: 'font-inter text-content-secondary',
  success: 'font-inter text-success',
};
const NAME_CLASS: Record<PaymentDaySettlement, string> = {
  unpaid: 'text-foreground',
  paid: 'text-foreground/60',
  skipped: 'text-muted line-through',
};
const AMOUNT_CLASS: Record<PaymentDaySettlement, string> = {
  unpaid: 'text-foreground',
  paid: 'text-foreground/60',
  skipped: 'text-muted',
};

interface CommitmentRowProps {
  payment: CommitmentMonthPayment;
  today: string;
  /** EGP per USD once loaded; a USD row draws its EGP leg from it. */
  liveRate: number | undefined;
  commitment: Commitment | undefined;
  category: Category | undefined;
  account: Account | undefined;
  onPress: (commitmentId: string, paymentId: string) => void;
  onSkip: (paymentId: string) => void;
  onEdit: (commitmentId: string | undefined) => void;
  onDelete: (commitmentId: string | undefined) => void;
  showSeparator?: boolean;
  swipeContainerStyle?: StyleProp<ViewStyle>;
}

function CommitmentRowComponent({
  payment,
  today,
  liveRate,
  commitment,
  category,
  account,
  onPress,
  onSkip,
  onEdit,
  onDelete,
  showSeparator = true,
  swipeContainerStyle,
}: CommitmentRowProps) {
  const row = useMemo(
    () =>
      buildCommitmentRowPresentation({ payment, commitment, category, account, today, liveRate }),
    [account, category, commitment, liveRate, payment, today],
  );
  const { fontScale } = useWindowDimensions();
  const badgeShrinks = fontScale > 1;
  const amountProps = resolveFitAmountTextProps(COMMITMENT_ROW_AMOUNT_FONT_SIZE, fontScale);
  const rowHeight = useMemo(() => resolveCommitmentRowHeight(fontScale), [fontScale]);
  const valueTrackMaxWidth = useMemo(
    () => resolveTransactionRowValueTrackMaxWidth(fontScale),
    [fontScale],
  );

  const handlePress = useCallback(
    () => onPress(payment.commitment_id, payment.id),
    [onPress, payment.commitment_id, payment.id],
  );
  const handleSkip = useCallback(() => onSkip(payment.id), [onSkip, payment.id]);
  const handleEdit = useCallback(() => onEdit(commitment?.id), [commitment?.id, onEdit]);
  const handleDelete = useCallback(() => onDelete(commitment?.id), [commitment?.id, onDelete]);
  const actions: SwipeAction[] = useMemo(
    () => [
      {
        key: 'skip',
        label: Strings.swipeSkip,
        icon: 'skip-next-outline',
        variant: 'info',
        onPress: handleSkip,
      },
      {
        key: 'edit',
        label: Strings.swipeEdit,
        icon: 'pencil-outline',
        variant: 'neutral',
        onPress: handleEdit,
      },
      {
        key: 'delete',
        label: Strings.swipeDelete,
        icon: 'trash-can-outline',
        variant: 'destructive',
        onPress: handleDelete,
      },
    ],
    [handleDelete, handleEdit, handleSkip],
  );
  const press = useDragCancelledPress(handlePress);

  return (
    <SwipeableRow
      rowId={payment.id}
      actions={actions}
      disabled={commitment === undefined}
      accessibilityLabel={row.accessibilityLabel}
      containerStyle={swipeContainerStyle}
    >
      <PressableFeedback
        {...press}
        accessibilityRole="button"
        accessibilityLabel={row.accessibilityLabel}
      >
        <View
          testID="commitment-row"
          style={{ height: rowHeight, justifyContent: 'center' }}
          className={showSeparator ? 'border-separator border-b px-4' : 'px-4'}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }} className="gap-3">
            <View testID="commitment-row-tile">
              <AccountColorTile
                color={row.tile.color}
                type={row.tile.type}
                hollow={row.tile.hollow}
                size={Size.accountTile}
                glyphSize={Size.iconXs}
              />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }} className="gap-1.5">
                <MaterialCommunityIcons
                  name={row.glyphName}
                  size={Size.rowGlyph}
                  color={row.glyphColor}
                />
                <Text
                  allowFontScaling={false}
                  className={`font-inter-medium min-w-0 shrink ${NAME_CLASS[row.settledLook]}`}
                  style={scaledTextStyle(COMMITMENT_ROW_TITLE_FONT_SIZE, fontScale)}
                  numberOfLines={1}
                >
                  {row.name}
                </Text>
                <YieldingSlot
                  minWidth={
                    badgeShrinks ? ms(4) + resolveStatusBadgeXsMinWidth(fontScale) : undefined
                  }
                >
                  <View
                    style={{
                      marginLeft: ms(4),
                      flexDirection: 'row',
                      flexShrink: badgeShrinks ? 1 : 0,
                    }}
                  >
                    <StatusBadge
                      size="xs"
                      fontScale={fontScale}
                      label={row.statusLabel}
                      icon={row.statusIcon}
                      fill={row.statusFill}
                      foreground={row.statusForeground}
                    />
                  </View>
                </YieldingSlot>
              </View>
              {/* One line clipped at its head with a leg, so the due day yields to a whole `…` and the EGP leg stays whole. */}
              <Text
                allowFontScaling={false}
                className="font-inter text-content-secondary"
                style={{
                  ...scaledTextStyle(COMMITMENT_ROW_CAPTION_FONT_SIZE, fontScale),
                  marginTop: COMMITMENT_ROW_LINE_GAP,
                }}
                numberOfLines={1}
                ellipsizeMode={row.captionLeg === undefined ? 'tail' : 'head'}
              >
                {row.captionLeg === undefined
                  ? row.dueDay
                  : `${row.dueDay}${TRANSACTION_ROW_CAPTION_SEPARATOR}${row.captionLeg}`}
              </Text>
            </View>
            <View
              testID="commitment-row-value-track"
              style={{ flexShrink: 0, alignItems: 'flex-end', maxWidth: valueTrackMaxWidth }}
            >
              {/* Two sibling texts, never nested: RN Android drops margins on inline text. */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'baseline',
                  gap: ms(4),
                  maxWidth: '100%',
                }}
              >
                <Text
                  {...amountProps}
                  className={`font-sora tabular-nums ${AMOUNT_CLASS[row.settledLook]}`}
                  style={{ ...amountProps.style, flexShrink: 1 }}
                >
                  {row.amountText}
                </Text>
                <Text
                  allowFontScaling={false}
                  className="font-inter text-content-secondary"
                  style={scaledTextStyle(COMMITMENT_ROW_CODE_FONT_SIZE, fontScale)}
                  numberOfLines={1}
                >
                  {row.currencyCode}
                </Text>
              </View>
              <Text
                testID="commitment-row-day-indicator"
                allowFontScaling={false}
                className={DAY_INDICATOR_CLASS[row.dayIndicator.tone]}
                style={{
                  ...scaledTextStyle(COMMITMENT_ROW_CAPTION_FONT_SIZE, fontScale),
                  marginTop: COMMITMENT_ROW_LINE_GAP,
                }}
                numberOfLines={1}
              >
                {row.dayIndicator.text}
              </Text>
            </View>
          </View>
        </View>
      </PressableFeedback>
    </SwipeableRow>
  );
}

export const CommitmentRow = React.memo(CommitmentRowComponent);
CommitmentRow.displayName = 'CommitmentRow';
