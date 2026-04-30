import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Size, Spacing } from '@/constants/theme';
import { useDotAnim } from './progress_dots.anim';

type Props = { totalSteps: number; currentStep: number };

export function ProgressDots({ totalSteps, currentStep }: Props) {
  return (
    <View style={styles.row}>
      {Array.from({ length: totalSteps }).map((_, i) => (
        <Dot key={i} isActive={i < currentStep} />
      ))}
    </View>
  );
}

function Dot({ isActive }: { isActive: boolean }) {
  const { animStyle } = useDotAnim(isActive);
  return <Animated.View style={[styles.dot, animStyle]} />;
}

const styles = StyleSheet.create({
  row: {
    height: Size.progressDot * 5,
    paddingHorizontal: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  dot: {
    flex: 1,
    height: Size.progressDot,
    borderRadius: Size.progressDot / 2,
  },
});
