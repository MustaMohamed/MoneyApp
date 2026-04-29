import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Size, Spacing } from '@/constants/theme';

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
  const scale = useSharedValue(1);
  const colorProgress = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    if (isActive) {
      scale.value = withSequence(withSpring(1.3, { damping: 8 }), withSpring(1.0, { damping: 12 }));
      colorProgress.value = withTiming(1, { duration: 200 });
    } else {
      colorProgress.value = withTiming(0, { duration: 200 });
    }
  }, [isActive, scale, colorProgress]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: interpolateColor(colorProgress.value, [0, 1], ['#243044', '#C9973A']),
  }));

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
