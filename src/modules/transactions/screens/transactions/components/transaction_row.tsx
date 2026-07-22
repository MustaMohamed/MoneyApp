// modules/transactions/screens/transactions/components/transaction_row.tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { PressableFeedback } from 'heroui-native';
import React, { useCallback, useMemo } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { SwipeableRow, type SwipeAction } from '@/components/ui/swipeable_row';
import { Text } from '@/components/ui/text';
import { TypeBadge } from '@/components/ui/type_badge';
import { Strings } from '@/constants/strings';
import { Size, Type } from '@/constants/theme';
import { GoldTokens } from '@/constants/theme_tokens';
import type { Account } from '@/modules/accounts/entities/account.entity';
import type { Category } from '@/modules/categories/entities/category.entity';

import type { Transaction } from '../../../entities/transaction.entity';
import { useRowPressScale } from './transaction_row.anim';
import {
  buildTransactionRowPresentation,
  TRANSACTION_ROW_HEIGHT,
  TRANSACTION_ROW_ICON_SIZE,
  TRANSACTION_ROW_OPTIONAL_TRACK_HEIGHT,
  TRANSACTION_ROW_VALUE_WIDTH,
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

function TransactionRowComponent({
  tx,
  account,
  toAccount,
  category,
  onPress,
  onEdit,
  onDelete,
}: Props): React.ReactElement {
  const { scale, onPressIn, onPressOut } = useRowPressScale();
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

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
      {/*
        animation={false} disables PressableFeedback's built-in scale so it
        does not conflict with the manual Reanimated scale from useRowPressScale.
        onPressIn/onPressOut are forwarded by PressableFeedback to our callbacks.
      */}
      <PressableFeedback
        onPress={handlePress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        animation={false}
      >
        <Animated.View
          testID="transaction-row"
          style={[animStyle, { height: TRANSACTION_ROW_HEIGHT }]}
          className="border-separator border-b px-4 py-1.5"
        >
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }} className="gap-3">
            <View
              testID="transaction-row-icon-track"
              className={`mt-0.5 items-center justify-center rounded-lg ${presentation.iconBackgroundClassName}`}
              style={{
                width: TRANSACTION_ROW_ICON_SIZE,
                height: TRANSACTION_ROW_ICON_SIZE,
                flexShrink: 0,
              }}
            >
              <MaterialCommunityIcons
                name={presentation.iconName}
                size={Size.iconSm}
                color={category?.color ?? GoldTokens[500]}
              />
            </View>
            <View testID="transaction-row-content-track" style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }} className="gap-1.5">
                <Text
                  className="font-sora text-foreground min-w-0 shrink font-bold"
                  style={{ fontSize: Type.meta }}
                  numberOfLines={1}
                >
                  {presentation.title}
                </Text>
                {isCommitmentOwned ? <TypeBadge type="commitment" /> : null}
                {!isCommitmentOwned && presentation.ownershipLabel ? (
                  <Text
                    className="font-inter text-info shrink-0 font-bold"
                    style={{ fontSize: Type.chip }}
                    numberOfLines={1}
                  >
                    {presentation.ownershipLabel}
                  </Text>
                ) : null}
              </View>
              <Text
                className="font-inter text-foreground/55 mt-0.5 font-medium"
                style={{ fontSize: Type.overline }}
                numberOfLines={1}
              >
                {presentation.context}
              </Text>
              <View
                testID="transaction-row-note-track"
                className="justify-end"
                style={{ height: TRANSACTION_ROW_OPTIONAL_TRACK_HEIGHT }}
              >
                {presentation.note ? (
                  <Text
                    className="font-inter text-muted italic"
                    style={{ fontSize: Type.chip }}
                    numberOfLines={1}
                  >
                    {presentation.note}
                  </Text>
                ) : null}
              </View>
            </View>
            <View
              testID="transaction-row-value-track"
              style={{ width: TRANSACTION_ROW_VALUE_WIDTH, alignItems: 'flex-end', flexShrink: 0 }}
            >
              <Text
                className={`font-sora font-bold ${presentation.amountClassName}`}
                style={{ fontSize: Type.body }}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.72}
              >
                {presentation.primaryAmount}
              </Text>
              <View
                testID="transaction-row-secondary-amount-track"
                className="items-end justify-end"
                style={{ height: TRANSACTION_ROW_OPTIONAL_TRACK_HEIGHT }}
              >
                {presentation.secondaryAmount ? (
                  <Text
                    className="font-inter text-foreground/60 font-medium"
                    style={{ fontSize: Type.overline }}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
                  >
                    {presentation.secondaryAmount}
                    {presentation.rateText ? (
                      <Text className="opacity-70"> {presentation.rateText}</Text>
                    ) : null}
                  </Text>
                ) : null}
              </View>
              <Text className="font-inter text-foreground/40" style={{ fontSize: Type.overline }}>
                {presentation.timeText}
              </Text>
            </View>
          </View>
        </Animated.View>
      </PressableFeedback>
    </SwipeableRow>
  );
}

export const TransactionRow = React.memo(TransactionRowComponent);
TransactionRow.displayName = 'TransactionRow';
