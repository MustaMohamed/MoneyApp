import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { PressableFeedback } from 'heroui-native';
import React, { useCallback, useMemo } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { AccountColorTile } from '@/components/ui/account_color_tile';
import { SwipeableRow, type SwipeAction } from '@/components/ui/swipeable_row';
import { Text } from '@/components/ui/text';
import { TypeBadge } from '@/components/ui/type_badge';
import { Strings } from '@/constants/strings';
import { Radius, Size, Type, lineHeightFor } from '@/constants/theme';
import type { Account } from '@/modules/accounts/entities/account.entity';
import type { Category } from '@/modules/categories/entities/category.entity';

import type { Transaction } from '../../../entities/transaction.entity';
import { useRowPressScale } from './transaction_row.anim';
import {
  buildTransactionRowPresentation,
  type RowTile,
  TRANSACTION_ROW_AMOUNT_FONT_SIZE,
  TRANSACTION_ROW_CAPTION_FONT_SIZE,
  TRANSACTION_ROW_CODE_FONT_SIZE,
  TRANSACTION_ROW_DUAL_OFFSET,
  TRANSACTION_ROW_DUAL_RING,
  TRANSACTION_ROW_DUAL_RING_COLOR,
  TRANSACTION_ROW_HEIGHT,
  TRANSACTION_ROW_LINE_GAP,
  TRANSACTION_ROW_TITLE_FONT_SIZE,
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
}

interface BodyProps {
  presentation: TransactionRowPresentation;
  onPress: () => void;
}

const DUAL_TILE_TOP = (Size.accountTile - Size.dualTile) / 2;

function RowTiles({ tiles }: { tiles: RowTile[] }): React.ReactElement | null {
  if (tiles.length === 0) return null;
  const [first, second] = tiles;
  if (tiles.length === 1) {
    return (
      <View testID="transaction-row-tiles">
        <AccountColorTile
          color={first.color}
          type={first.type}
          hollow={first.hollow}
          size={Size.accountTile}
          glyphSize={Size.iconXs}
        />
      </View>
    );
  }
  return (
    <View
      testID="transaction-row-tiles"
      style={{
        width: TRANSACTION_ROW_DUAL_OFFSET + Size.dualTile + TRANSACTION_ROW_DUAL_RING,
        height: Size.accountTile,
        flexShrink: 0,
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
export function TransactionRowBody({ presentation, onPress }: BodyProps): React.ReactElement {
  const { scale, onPressIn, onPressOut } = useRowPressScale();
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const isCommitmentOwned = presentation.isCommitmentOwned;

  return (
    // animation={false} keeps PressableFeedback's own scale off the Reanimated one below.
    <PressableFeedback
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      animation={false}
      accessibilityLabel={presentation.accessibilityLabel}
    >
      <Animated.View
        testID="transaction-row"
        style={[animStyle, { height: TRANSACTION_ROW_HEIGHT, justifyContent: 'center' }]}
        className="border-separator border-b px-4"
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
                className="font-inter-medium text-foreground min-w-0 shrink"
                style={{
                  fontSize: TRANSACTION_ROW_TITLE_FONT_SIZE,
                  lineHeight: lineHeightFor(TRANSACTION_ROW_TITLE_FONT_SIZE),
                }}
                numberOfLines={1}
              >
                {presentation.title}
              </Text>
              {isCommitmentOwned ? <TypeBadge type="commitment" /> : null}
              {!isCommitmentOwned && presentation.ownershipLabel ? (
                <Text
                  className="font-inter-bold text-info shrink-0"
                  style={{ fontSize: Type.chip, lineHeight: lineHeightFor(Type.chip) }}
                  numberOfLines={1}
                >
                  {presentation.ownershipLabel}
                </Text>
              ) : null}
            </View>
            <Text
              className="font-inter text-content-secondary"
              style={{
                fontSize: TRANSACTION_ROW_CAPTION_FONT_SIZE,
                lineHeight: lineHeightFor(TRANSACTION_ROW_CAPTION_FONT_SIZE),
                marginTop: TRANSACTION_ROW_LINE_GAP,
              }}
              numberOfLines={1}
            >
              {presentation.caption}
            </Text>
          </View>
          <View
            testID="transaction-row-value-track"
            style={{ flexShrink: 0, alignItems: 'flex-end' }}
          >
            <Text
              className={`font-sora tabular-nums ${presentation.amountClassName}`}
              style={{
                fontSize: TRANSACTION_ROW_AMOUNT_FONT_SIZE,
                lineHeight: lineHeightFor(TRANSACTION_ROW_AMOUNT_FONT_SIZE),
              }}
              numberOfLines={1}
            >
              {presentation.primaryAmount}
            </Text>
            <Text
              className="font-inter text-content-secondary tabular-nums"
              style={{
                fontSize: TRANSACTION_ROW_CODE_FONT_SIZE,
                lineHeight: lineHeightFor(TRANSACTION_ROW_CODE_FONT_SIZE),
                marginTop: TRANSACTION_ROW_LINE_GAP,
              }}
              numberOfLines={1}
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
      accessibilityLabel={presentation.accessibilityLabel}
    >
      <TransactionRowBody presentation={presentation} onPress={handlePress} />
    </SwipeableRow>
  );
}

export const TransactionRow = React.memo(TransactionRowComponent);
TransactionRow.displayName = 'TransactionRow';
