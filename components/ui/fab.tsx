/**
 * FAB — Floating Action Button.
 *
 * Persistent across all tabs. Hidden on /settings routes.
 * Tap = Add Transaction (default primary action).
 * Long-press (500ms) = mini menu with Add Transaction / Add Account / Add Commitment.
 *
 * Ownership: consumed by app/(app)/(tabs)/_layout.tsx only.
 * Screens do not mount or control the FAB.
 */
import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  LongPressGestureHandler,
  State,
  type HandlerStateChangeEvent,
  type LongPressGestureHandlerEventPayload,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
} from 'react-native-reanimated';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { GoldTokens } from '@/constants/theme_tokens';
import { Text } from '@/components/ui/text';
import { ms } from '@/utils/responsive';

export interface FABProps {
  onAddTransaction: () => void;
  onAddAccount: () => void;
  onAddCommitment: () => void;
  /** Pass true when pathname starts with /settings. */
  hidden?: boolean;
  /** Bottom offset from the bottom of the screen in dp. Caller provides tab bar height + 16. */
  bottomOffset?: number;
}

const FAB_SIZE = ms(56);

export function FAB({
  onAddTransaction,
  onAddAccount,
  onAddCommitment,
  hidden = false,
  bottomOffset = ms(80),
}: FABProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  // Rotation for the + → × transform
  const rotation = useSharedValue(0);
  const scrimOpacity = useSharedValue(0);

  // Per-item animation values — declared at top level (no hooks in loops/conditionals)
  const item0TranslateY = useSharedValue(20);
  const item0Opacity = useSharedValue(0);
  const item1TranslateY = useSharedValue(20);
  const item1Opacity = useSharedValue(0);
  const item2TranslateY = useSharedValue(20);
  const item2Opacity = useSharedValue(0);

  const rotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: scrimOpacity.value,
  }));

  // All three item animated styles declared unconditionally at top level
  const item0Style = useAnimatedStyle(() => ({
    transform: [{ translateY: item0TranslateY.value }],
    opacity: item0Opacity.value,
  }));

  const item1Style = useAnimatedStyle(() => ({
    transform: [{ translateY: item1TranslateY.value }],
    opacity: item1Opacity.value,
  }));

  const item2Style = useAnimatedStyle(() => ({
    transform: [{ translateY: item2TranslateY.value }],
    opacity: item2Opacity.value,
  }));

  const itemAnimValues = [
    { translateY: item0TranslateY, opacity: item0Opacity, animStyle: item0Style },
    { translateY: item1TranslateY, opacity: item1Opacity, animStyle: item1Style },
    { translateY: item2TranslateY, opacity: item2Opacity, animStyle: item2Style },
  ];

  const openMenu = useCallback(() => {
    setMenuOpen(true);
    rotation.value = withTiming(45, { duration: 200 });
    scrimOpacity.value = withTiming(0.5, { duration: 200 });
    itemAnimValues.forEach(({ translateY, opacity }, index) => {
      translateY.value = withDelay(index * 40, withSpring(0, { mass: 0.8, stiffness: 180 }));
      opacity.value = withDelay(index * 40, withTiming(1, { duration: 150 }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const closeMenu = useCallback(() => {
    rotation.value = withTiming(0, { duration: 200 });
    scrimOpacity.value = withTiming(0, { duration: 200 });
    itemAnimValues.forEach(({ translateY, opacity }, index) => {
      const reverseIndex = 2 - index;
      translateY.value = withDelay(
        reverseIndex * 40,
        withSpring(20, { mass: 0.8, stiffness: 180 }),
      );
      opacity.value = withDelay(reverseIndex * 40, withTiming(0, { duration: 150 }));
    });
    // Delay state change to let close animation finish (3 items × 40ms stagger + ~150ms anim)
    setTimeout(() => setMenuOpen(false), 280);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onLongPress = useCallback(
    (event: HandlerStateChangeEvent<LongPressGestureHandlerEventPayload>) => {
      if (event.nativeEvent.state === State.ACTIVE) {
        openMenu();
      }
    },
    [openMenu],
  );

  const onFABPress = useCallback(() => {
    if (menuOpen) {
      closeMenu();
    } else {
      onAddTransaction();
    }
  }, [menuOpen, closeMenu, onAddTransaction]);

  interface MenuItem {
    testID: string;
    label: string;
    icon: string;
    onPress: () => void;
  }

  const menuItems: MenuItem[] = [
    {
      testID: 'fab-menu-item-0',
      label: 'Add Transaction',
      icon: 'swap-horizontal',
      onPress: onAddTransaction,
    },
    {
      testID: 'fab-menu-item-1',
      label: 'Add Account',
      icon: 'bank',
      onPress: onAddAccount,
    },
    {
      testID: 'fab-menu-item-2',
      label: 'Add Commitment',
      icon: 'calendar-check',
      onPress: onAddCommitment,
    },
  ];

  return (
    <View
      testID="fab-container"
      style={[styles.container, { bottom: bottomOffset }, hidden && styles.hidden]}
      pointerEvents={hidden ? 'none' : 'box-none'}
    >
      {/* Scrim — full-screen overlay, tapping dismisses the menu */}
      {menuOpen && (
        <Animated.View style={[styles.scrim, scrimStyle]} pointerEvents="auto">
          <Pressable style={StyleSheet.absoluteFillObject} onPress={closeMenu} />
        </Animated.View>
      )}

      {/* Mini menu items — rendered above FAB; item 0 bottom, item 2 top */}
      {menuOpen &&
        menuItems.map((item, index) => {
          const { animStyle } = itemAnimValues[index];
          return (
            <Animated.View key={item.testID} style={[styles.menuItem, animStyle]}>
              <Pressable
                testID={item.testID}
                onPress={() => {
                  closeMenu();
                  item.onPress();
                }}
                style={styles.menuPill}
                accessibilityRole="button"
                accessibilityLabel={item.label}
              >
                <MaterialCommunityIcons
                  name={item.icon as any}
                  size={ms(18)}
                  color={Colors.dark.text1}
                />
                <Text style={styles.menuLabel}>{item.label}</Text>
              </Pressable>
            </Animated.View>
          );
        })}

      {/* FAB button — primary action on tap, mini menu on long-press */}
      <LongPressGestureHandler onHandlerStateChange={onLongPress} minDurationMs={500}>
        <Pressable
          testID="fab-button"
          onPress={onFABPress}
          style={styles.fab}
          accessibilityRole="button"
          accessibilityLabel="Add"
        >
          <LinearGradient
            colors={[GoldTokens[500], GoldTokens[600]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFillObject}
          />
          <Animated.View style={rotateStyle}>
            <MaterialCommunityIcons
              name="plus"
              size={ms(28)}
              color={Colors.shared.midnightBlue}
            />
          </Animated.View>
        </Pressable>
      </LongPressGestureHandler>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignSelf: 'center',
    alignItems: 'center',
  },
  hidden: {
    opacity: 0,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: -1,
  },
  menuItem: {
    marginBottom: Spacing.xs,
  },
  menuPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.surfaceEl,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    gap: Spacing.xs,
  },
  menuLabel: {
    color: Colors.dark.text1,
    fontSize: ms(13),
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
});
