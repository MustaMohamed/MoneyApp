import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { PressableFeedback } from 'heroui-native';
import React, { useCallback, useMemo } from 'react';
import { View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { AccountColorTile } from '@/components/ui/account_color_tile';
import { SwipeableRow, type SwipeAction } from '@/components/ui/swipeable_row';
import { Text } from '@/components/ui/text';
import {
  resolveFitAmountTextProps,
  scaledFontSize,
  scaledTextStyle,
} from '@/components/ui/text_scale.geometry';
import { TypeBadge, resolveTypeBadgeMinWidth } from '@/components/ui/type_badge';
import { Strings } from '@/constants/strings';
import { Radius, Size, Type } from '@/constants/theme';
import type { Account } from '@/modules/accounts/entities/account.entity';
import type { Category } from '@/modules/categories/entities/category.entity';
import { useDragCancelledPress } from '@/utils/use_drag_cancelled_press.hook';

import type { Transaction } from '../../../entities/transaction.entity';
import { useRowPressScale } from './transaction_row.anim';
import {
  buildTransactionRowPresentation,
  type RowTileSet,
  TRANSACTION_ROW_AMOUNT_FONT_SIZE,
  TRANSACTION_ROW_CAPTION_FONT_SIZE,
  TRANSACTION_ROW_CAPTION_SEPARATOR,
  TRANSACTION_ROW_CODE_FONT_SIZE,
  TRANSACTION_ROW_DUAL_OFFSET,
  TRANSACTION_ROW_DUAL_RING,
  TRANSACTION_ROW_DUAL_RING_COLOR,
  TRANSACTION_ROW_LINE_GAP,
  TRANSACTION_ROW_TITLE_FONT_SIZE,
  resolveTransactionRowCaptionLines,
  resolveTransactionRowHeight,
  resolveTransactionRowValueTrackMaxWidth,
  type TransactionRowPresentation,
} from './transaction_row.helpers';

interface Props {
  tx: Transaction;
  account?: Account;
  toAccount?: Account;
  category?: Category;
  onPress: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  showSeparator?: boolean;
  swipeContainerStyle?: StyleProp<ViewStyle>;
}

interface BodyProps {
  presentation: TransactionRowPresentation;
  onPress: () => void;
  showSeparator?: boolean;
}

const DUAL_TILE_TOP = (Size.accountTile - Size.dualTile) / 2;
// The budget-assigned label's narrowest box above 1.0, in ems of its size: its first glyph and a `…`.
const OWNERSHIP_LABEL_MIN_EM = 1.7;

// Above 1.0 a slot starts at its minimum and takes only the width the title leaves, so it yields before the title shrinks.
function YieldingSlot({
  minWidth,
  children,
}: {
  minWidth?: number;
  children: React.ReactElement;
}): React.ReactElement {
  if (minWidth === undefined) return children;
  return (
    <View style={{ flexDirection: 'row', flexGrow: 1, flexShrink: 0, flexBasis: minWidth }}>
      {children}
    </View>
  );
}

function RowTiles({ tiles }: { tiles: RowTileSet }): React.ReactElement | null {
  if (tiles.length === 0) return null;
  if (tiles.length === 1) {
    const [only] = tiles;
    return (
      <View testID="transaction-row-tiles">
        <AccountColorTile
          color={only.color}
          type={only.type}
          hollow={only.hollow}
          size={Size.accountTile}
          glyphSize={Size.iconXs}
        />
      </View>
    );
  }
  const [first, second] = tiles;
  return (
    // The ring takes no layout, as the frame's box-shadow does: it draws past the box's right edge.
    <View
      testID="transaction-row-tiles"
      style={{
        width: TRANSACTION_ROW_DUAL_OFFSET + Size.dualTile,
        height: Size.accountTile,
        flexShrink: 0,
        overflow: 'visible',
      }}
    >
      <View style={{ position: 'absolute', top: DUAL_TILE_TOP, left: 0 }}>
        <AccountColorTile
          color={first.color}
          type={first.type}
          hollow={first.hollow}
          size={Size.dualTile}
          glyphSize={Size.rowGlyph}
        />
      </View>
      <View
        style={{
          position: 'absolute',
          top: DUAL_TILE_TOP - TRANSACTION_ROW_DUAL_RING,
          left: TRANSACTION_ROW_DUAL_OFFSET - TRANSACTION_ROW_DUAL_RING,
          borderWidth: TRANSACTION_ROW_DUAL_RING,
          borderColor: TRANSACTION_ROW_DUAL_RING_COLOR,
          borderRadius: Radius.sm + TRANSACTION_ROW_DUAL_RING,
        }}
      >
        <AccountColorTile
          color={second.color}
          type={second.type}
          hollow={second.hollow}
          size={Size.dualTile}
          glyphSize={Size.rowGlyph}
        />
      </View>
    </View>
  );
}

/** The row without its swipe wrapper — the read-only list on the account detail renders this. */
export function TransactionRowBody({
  presentation,
  onPress,
  showSeparator = true,
}: BodyProps): React.ReactElement {
  const { scale, onPressIn, onPressOut } = useRowPressScale();
  const press = useDragCancelledPress(onPress, { onPressIn, onPressOut });
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const isCommitmentOwned = presentation.isCommitmentOwned;
  const { fontScale } = useWindowDimensions();
  // Above 1.0 the badge and the label give up their width before the title does.
  const badgeShrinks = fontScale > 1;
  const captionStacked = resolveTransactionRowCaptionLines(fontScale) === 2;
  const secondaryText = resolveFitAmountTextProps(TRANSACTION_ROW_CODE_FONT_SIZE, fontScale);

  return (
    // animation={false} keeps PressableFeedback's own scale off the Reanimated one below.
    <PressableFeedback
      {...press}
      animation={false}
      accessibilityLabel={presentation.accessibilityLabel}
    >
      <Animated.View
        testID="transaction-row"
        style={[
          animStyle,
          { height: resolveTransactionRowHeight(fontScale), justifyContent: 'center' },
        ]}
        className={showSeparator ? 'border-separator border-b px-4' : 'px-4'}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }} className="gap-3">
          <RowTiles tiles={presentation.tiles} />
          <View testID="transaction-row-content-track" style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }} className="gap-1.5">
              <MaterialCommunityIcons
                name={presentation.glyphName}
                size={Size.rowGlyph}
                color={presentation.glyphColor}
              />
              <Text
                allowFontScaling={false}
                className="font-inter-medium text-foreground min-w-0 shrink"
                style={scaledTextStyle(TRANSACTION_ROW_TITLE_FONT_SIZE, fontScale)}
                numberOfLines={1}
              >
                {presentation.title}
              </Text>
              {isCommitmentOwned ? (
                <YieldingSlot
                  minWidth={badgeShrinks ? resolveTypeBadgeMinWidth(fontScale) : undefined}
                >
                  <TypeBadge type="commitment" fontScale={badgeShrinks ? fontScale : undefined} />
                </YieldingSlot>
              ) : null}
              {!isCommitmentOwned && presentation.ownershipLabel ? (
                <YieldingSlot
                  minWidth={
                    badgeShrinks
                      ? scaledFontSize(Type.chip, fontScale) * OWNERSHIP_LABEL_MIN_EM
                      : undefined
                  }
                >
                  <Text
                    allowFontScaling={false}
                    className="font-inter-bold text-info"
                    style={{
                      ...scaledTextStyle(Type.chip, fontScale),
                      flexShrink: badgeShrinks ? 1 : 0,
                    }}
                    numberOfLines={1}
                  >
                    {presentation.ownershipLabel}
                  </Text>
                </YieldingSlot>
              ) : null}
            </View>
            {/* The lead clips first; the time never ellipsizes, and above 1.0 takes its own line. */}
            <View
              style={{
                flexDirection: captionStacked ? 'column' : 'row',
                gap: captionStacked ? TRANSACTION_ROW_LINE_GAP : undefined,
                marginTop: TRANSACTION_ROW_LINE_GAP,
              }}
            >
              {presentation.captionLead === undefined ? null : (
                <Text
                  allowFontScaling={false}
                  className="font-inter text-content-secondary"
                  style={{
                    ...scaledTextStyle(TRANSACTION_ROW_CAPTION_FONT_SIZE, fontScale),
                    flexShrink: 1,
                  }}
                  numberOfLines={1}
                >
                  {presentation.captionLead}
                </Text>
              )}
              <Text
                allowFontScaling={false}
                className="font-inter text-content-secondary"
                style={{
                  ...scaledTextStyle(TRANSACTION_ROW_CAPTION_FONT_SIZE, fontScale),
                  flexShrink: 0,
                }}
                numberOfLines={1}
              >
                {captionStacked || presentation.captionLead === undefined
                  ? presentation.captionTime
                  : `${TRANSACTION_ROW_CAPTION_SEPARATOR}${presentation.captionTime}`}
              </Text>
            </View>
          </View>
          <View
            testID="transaction-row-value-track"
            style={{
              flexShrink: 0,
              alignItems: 'flex-end',
              maxWidth: resolveTransactionRowValueTrackMaxWidth(fontScale),
            }}
          >
            <Text
              allowFontScaling={false}
              className={`font-sora tabular-nums ${presentation.amountClassName}`}
              style={scaledTextStyle(TRANSACTION_ROW_AMOUNT_FONT_SIZE, fontScale)}
              numberOfLines={1}
            >
              {presentation.primaryAmount}
            </Text>
            <Text
              {...secondaryText}
              className="font-inter text-content-secondary tabular-nums"
              style={{ ...secondaryText.style, marginTop: TRANSACTION_ROW_LINE_GAP }}
            >
              {presentation.secondaryLine}
            </Text>
          </View>
        </View>
      </Animated.View>
    </PressableFeedback>
  );
}

function TransactionRowComponent({
  tx,
  account,
  toAccount,
  category,
  onPress,
  onEdit,
  onDelete,
  showSeparator = true,
  swipeContainerStyle,
}: Props): React.ReactElement {
  const presentation = useMemo(
    () => buildTransactionRowPresentation({ tx, account, toAccount, category }),
    [account, category, toAccount, tx],
  );

  const handlePress = useCallback(() => onPress(tx.id), [onPress, tx.id]);
  const handleEdit = useCallback(() => onEdit(tx.id), [onEdit, tx.id]);
  const handleDelete = useCallback(() => onDelete(tx.id), [onDelete, tx.id]);
  const isCommitmentOwned = presentation.isCommitmentOwned;
  const actions: SwipeAction[] = useMemo(
    () =>
      isCommitmentOwned
        ? []
        : [
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
    [handleDelete, handleEdit, isCommitmentOwned],
  );

  return (
    <SwipeableRow
      rowId={tx.id}
      actions={actions}
      disabled={isCommitmentOwned}
      containerStyle={swipeContainerStyle}
      accessibilityLabel={presentation.accessibilityLabel}
    >
      <TransactionRowBody
        presentation={presentation}
        onPress={handlePress}
        showSeparator={showSeparator}
      />
    </SwipeableRow>
  );
}

export const TransactionRow = React.memo(TransactionRowComponent);
TransactionRow.displayName = 'TransactionRow';
