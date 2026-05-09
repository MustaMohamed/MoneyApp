import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated from 'react-native-reanimated';

import { Colors, FontFamily, Radius } from '@/constants/theme';
import { ms, msFont } from '@/utils/responsive';

import { useFilterButtonBadgeAnim } from './filter_button.anim';

interface Props {
  count: number;
  onPress: () => void;
}

export function FilterButton({ count, onPress }: Props) {
  const active = count > 0;
  const { badgeStyle } = useFilterButtonBadgeAnim(count);

  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
    >
      <MaterialCommunityIcons
        name="tune-variant"
        size={ms(22)}
        color={active ? Colors.shared.cairoGold : Colors.dark.text2}
      />
      {active && (
        <Animated.View style={[styles.badge, badgeStyle]}>
          <Text style={styles.badgeText}>{count}</Text>
        </Animated.View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: ms(40),
    height: ms(40),
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPressed: { opacity: 0.7 },
  badge: {
    position: 'absolute',
    top: -ms(4),
    right: -ms(4),
    minWidth: ms(16),
    height: ms(16),
    paddingHorizontal: ms(4),
    borderRadius: ms(8),
    backgroundColor: Colors.shared.cairoGold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: FontFamily.soraBold,
    fontSize: msFont(10),
    color: Colors.shared.midnightBlue,
    lineHeight: msFont(12),
  },
});
