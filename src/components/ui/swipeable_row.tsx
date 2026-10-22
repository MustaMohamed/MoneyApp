import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useRef } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import type { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';

import { Text } from '@/components/ui/text';
import { Colors, FontFamily, Spacing, Type, lineHeightFor } from '@/constants/theme';
import { ms } from '@/utils/responsive';
import {
  closeAllRows,
  closeRow,
  openRow,
  subscribeToRegistry,
} from '@/utils/swipeable_row_registry';
import { DRAG_CANCEL_DISTANCE } from '@/utils/use_drag_cancelled_press.hook';

type MaterialIconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export interface SwipeAction {
  key: string;
  label: string;
  icon: MaterialIconName;
  variant: 'neutral' | 'info' | 'destructive' | 'success';
  onPress: () => void;
}

export interface SwipeableRowProps {
  children: React.ReactNode;
  actions: SwipeAction[];
  /** Stable id for the one-open-at-a-time registry. Defaults to a random id. */
  rowId?: string;
  disabled?: boolean;
  accessibilityLabel?: string;
  /** The swipe container's style; its corner radii clip the action tiles. */
  containerStyle?: StyleProp<ViewStyle>;
}

const ACTION_TILE_WIDTH = ms(72);

const TILE_WHITE = '#FFFFFF'; // White on the blue and red tiles is semantic, not a theme token.

export interface SwipeTileColors {
  background: string;
  icon: string;
  label: string;
}

export function resolveSwipeTileColors(variant: SwipeAction['variant']): SwipeTileColors {
  switch (variant) {
    case 'neutral':
      return {
        background: Colors.dark.surfaceEl,
        icon: Colors.dark.text1,
        label: Colors.dark.text1,
      };
    case 'info':
      return { background: Colors.shared.transferBlue, icon: TILE_WHITE, label: TILE_WHITE };
    case 'destructive':
      return { background: Colors.dark.negative, icon: TILE_WHITE, label: TILE_WHITE };
    case 'success':
      return { background: Colors.dark.positive, icon: Colors.dark.bg, label: Colors.dark.bg };
  }
}

let _idCounter = 0;
// Callers must pass a stable `rowId` for list rows; this fallback dies on reload or recycling.
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
  containerStyle,
}: SwipeableRowProps): React.ReactElement {
  const rowId = useRef(rowIdProp ?? genId()).current;
  const swipeableRef = useRef<SwipeableMethods>(null);
  const totalWidth = actions.length * ACTION_TILE_WIDTH;

  useEffect(() => {
    const unsub = subscribeToRegistry((activeId) => {
      if (activeId !== rowId) swipeableRef.current?.close();
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
        {actions.map((action) => {
          const colors = resolveSwipeTileColors(action.variant);
          return (
            <Pressable
              key={action.key}
              accessibilityRole="button"
              accessibilityLabel={action.label}
              onPress={() => handleActionPress(action)}
              style={{
                width: ACTION_TILE_WIDTH,
                backgroundColor: colors.background,
                alignItems: 'center',
                justifyContent: 'center',
                gap: Spacing.xxs,
              }}
            >
              <MaterialCommunityIcons name={action.icon} size={ms(22)} color={colors.icon} />
              <Text
                style={{
                  fontFamily: FontFamily.interMedium,
                  fontSize: Type.micro,
                  lineHeight: lineHeightFor(Type.micro),
                  color: colors.label,
                }}
              >
                {action.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    ),
    [actions, handleActionPress, totalWidth],
  );

  // `ReanimatedSwipeable` does not forward accessibility props; the wrapper `View` carries them.
  return (
    <View
      accessible={true}
      accessibilityRole="none"
      accessibilityLabel={accessibilityLabel}
      accessibilityActions={actions.map((a) => ({ name: a.key, label: a.label }))}
      onAccessibilityAction={(event: { nativeEvent: { actionName: string } }) => {
        const action = actions.find((a) => a.key === event.nativeEvent.actionName);
        if (action) handleActionPress(action);
      }}
    >
      <ReanimatedSwipeable
        ref={swipeableRef}
        containerStyle={containerStyle}
        enabled={!disabled}
        renderRightActions={renderRightActions}
        rightThreshold={ACTION_TILE_WIDTH * 0.4}
        dragOffsetFromLeftEdge={DRAG_CANCEL_DISTANCE}
        dragOffsetFromRightEdge={DRAG_CANCEL_DISTANCE}
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

/** Close every open row; call from a list's `onScrollBeginDrag`. */
export { closeAllRows };
