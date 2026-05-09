import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';

import { CommitmentPaymentStatus } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { ms, msFont } from '@/utils/responsive';
import { useChipPressScale } from '../commitments.anim';
import type { CommitmentStatusFilter } from '../commitments.state';

interface Props {
  active: CommitmentStatusFilter;
  onChange: (f: CommitmentStatusFilter) => void;
}

const CHIPS: { key: CommitmentStatusFilter; labelKey: keyof typeof Strings }[] = [
  { key: 'all', labelKey: 'filterAll' },
  { key: CommitmentPaymentStatus.Overdue, labelKey: 'commitmentsStatusOverdue' },
  { key: CommitmentPaymentStatus.Due, labelKey: 'commitmentsStatusDue' },
  { key: CommitmentPaymentStatus.Upcoming, labelKey: 'commitmentsStatusUpcoming' },
  { key: CommitmentPaymentStatus.Paid, labelKey: 'commitmentsStatusPaid' },
  { key: CommitmentPaymentStatus.Skipped, labelKey: 'commitmentsStatusSkipped' },
];

export function StatusFilterChips({ active, onChange }: Props) {
  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {CHIPS.map((c) => (
          <Chip
            key={c.key}
            label={Strings[c.labelKey] as string}
            isActive={active === c.key}
            onPress={() => onChange(c.key)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function Chip({
  label,
  isActive,
  onPress,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
}) {
  const { scale, pop } = useChipPressScale();
  const isActiveSv = useDerivedValue(() => withTiming(isActive ? 1 : 0, { duration: 200 }));

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: interpolateColor(
      isActiveSv.value,
      [0, 1],
      [Colors.dark.surface, Colors.shared.cairoGold],
    ),
    borderColor: interpolateColor(
      isActiveSv.value,
      [0, 1],
      [Colors.dark.border, Colors.shared.cairoGold],
    ),
  }));

  const textStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      isActiveSv.value,
      [0, 1],
      [Colors.dark.text2, Colors.shared.midnightBlue],
    ),
  }));

  return (
    <Pressable
      onPress={() => {
        pop();
        onPress();
      }}
    >
      <Animated.View style={[styles.chip, containerStyle]}>
        <Animated.Text style={[styles.label, textStyle]}>{label}</Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: Spacing.sm,
  },
  row: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
  },
  chip: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: ms(12),
    paddingVertical: ms(5),
    justifyContent: 'center',
  },
  label: {
    fontFamily: FontFamily.interSemi,
    fontSize: msFont(11),
    letterSpacing: 0.3,
  },
});
