/**
 * SwipeableRow — shared swipe-actions primitive.
 *
 * Team Law 7 justification: HeroUI Native has no Swipeable/SwipeActions
 * primitive. This wraps an in-stack library (react-native-gesture-handler's
 * ReanimatedSwipeable) exactly as bottom_sheet.tsx wraps @gorhom/bottom-sheet.
 *
 * Usage:
 *   <SwipeableRow rowId={tx.id} actions={[editAction, deleteAction]}>
 *     <TransactionRow … />
 *   </SwipeableRow>
 *
 * - actions[0] renders closest to the row body (rightmost tile visually when
 *   the row is swiped left), actions[last] furthest away.
 * - Tile width = ACTION_TILE_WIDTH per action; total reveal = actions.length * tile width.
 * - disabled=true prevents the gesture (use while a mutation is in flight).
 * - accessibilityLabel describes the row for the a11y actions rotor.
 */

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useRef } from 'react';
import { Pressable, View } from 'react-native';
import type { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated from 'react-native-reanimated';

import { Colors, FontFamily, Spacing, Type } from '@/constants/theme';
import { ms } from '@/utils/responsive';
import {
  closeAllRows,
  closeRow,
  openRow,
  subscribeToRegistry,
} from '@/utils/swipeable_row_registry';

type MaterialIconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export interface SwipeAction {
  key: string;
  /** User-visible label from Strings. Shown under the icon. */
  label: string;
  icon: MaterialIconName;
  /** Visual intent drives tile background and text/icon colour. */
  variant: 'neutral' | 'info' | 'destructive';
  onPress: () => void;
}

export interface SwipeableRowProps {
  children: React.ReactNode;
  actions: SwipeAction[];
  /** Stable id for the one-open-at-a-time registry. Defaults to a random id. */
  rowId?: string;
  /** Disables the swipe gesture (e.g. while a mutation is in flight). */
  disabled?: boolean;
  /** Describes the row to screen readers for the accessibilityActions menu. */
  accessibilityLabel?: string;
}

const ACTION_TILE_WIDTH = ms(72);

function tileBg(variant: SwipeAction['variant']): string {
  switch (variant) {
    case 'neutral':
      return Colors.dark.surfaceEl;
    case 'info':
      return Colors.shared.transferBlue;
    case 'destructive':
      return Colors.dark.negative;
  }
}

function tileIconColor(variant: SwipeAction['variant']): string {
  if (variant === 'neutral') return Colors.dark.text1;
  return '#FFFFFF'; // info (blue) and destructive (red) both use white — semantic, not a theme token
}

function tileLabelColor(variant: SwipeAction['variant']): string {
  if (variant === 'neutral') return Colors.dark.text1;
  return '#FFFFFF';
}

let _idCounter = 0;
function genId(): string {
  _idCounter += 1;
  return `swipeable-row-${_idCounter}`;
}

export function SwipeableRow({
  children,
  actions,
  rowId: rowIdProp,
  disabled = false,
  accessibilityLabel,
}: SwipeableRowProps): React.ReactElement {
  const rowId = useRef(rowIdProp ?? genId()).current;
  const swipeableRef = useRef<SwipeableMethods>(null);
  const totalWidth = actions.length * ACTION_TILE_WIDTH;

  // Close this row programmatically when the registry says another row opened
  useEffect(() => {
    const unsub = subscribeToRegistry((activeId) => {
      if (activeId !== rowId && activeId !== null) {
        swipeableRef.current?.close();
      }
      // null means closeAll — also close this row
      if (activeId === null) {
        swipeableRef.current?.close();
      }
    });
    return unsub;
  }, [rowId]);

  const handleSwipeOpen = useCallback(() => {
    openRow(rowId);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [rowId]);

  const handleSwipeClose = useCallback(() => {
    closeRow(rowId);
  }, [rowId]);

  const handleActionPress = useCallback(
    (action: SwipeAction) => {
      swipeableRef.current?.close();
      closeRow(rowId);
      action.onPress();
    },
    [rowId],
  );

  const renderRightActions = useCallback(
    () => (
      <View style={{ width: totalWidth, flexDirection: 'row' }}>
        {actions.map((action) => (
          <Pressable
            key={action.key}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            onPress={() => handleActionPress(action)}
            style={{
              width: ACTION_TILE_WIDTH,
              backgroundColor: tileBg(action.variant),
              alignItems: 'center',
              justifyContent: 'center',
              gap: Spacing.xxs,
            }}
          >
            <MaterialCommunityIcons
              name={action.icon}
              size={ms(22)}
              color={tileIconColor(action.variant)}
            />
            <Animated.Text
              style={{
                fontFamily: FontFamily.interMedium,
                fontSize: Type.micro,
                color: tileLabelColor(action.variant),
              }}
            >
              {action.label}
            </Animated.Text>
          </Pressable>
        ))}
      </View>
    ),
    [actions, handleActionPress, totalWidth],
  );

  // ReanimatedSwipeable does not forward accessibility props to its container.
  // Wrap it in a View that carries the a11y actions so screen readers can
  // reach Edit/Skip/Delete without needing to perform the swipe gesture.
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityActions={actions.map((a) => ({ name: a.key, label: a.label }))}
      onAccessibilityAction={(event: { nativeEvent: { actionName: string } }) => {
        const action = actions.find((a) => a.key === event.nativeEvent.actionName);
        if (action) handleActionPress(action);
      }}
    >
      <ReanimatedSwipeable
        ref={swipeableRef}
        enabled={!disabled}
        renderRightActions={renderRightActions}
        rightThreshold={ACTION_TILE_WIDTH * 0.4}
        onSwipeableOpen={handleSwipeOpen}
        onSwipeableClose={handleSwipeClose}
        overshootRight={false}
        friction={2}
      >
        {children}
      </ReanimatedSwipeable>
    </View>
  );
}

/** Convenience re-export: close all open rows (call from list onScrollBeginDrag). */
export { closeAllRows };
