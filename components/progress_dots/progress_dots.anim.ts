import { useEffect } from 'react'
import {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'

export function useDotAnim(isActive: boolean) {
  const scale = useSharedValue(1)
  const colorProgress = useSharedValue(isActive ? 1 : 0)

  useEffect(() => {
    if (isActive) {
      scale.value = withSequence(
        withSpring(1.3, { damping: 8 }),
        withSpring(1.0, { damping: 12 }),
      )
      colorProgress.value = withTiming(1, { duration: 200 })
    } else {
      colorProgress.value = withTiming(0, { duration: 200 })
    }
  }, [isActive, scale, colorProgress])

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: interpolateColor(colorProgress.value, [0, 1], ['#243044', '#C9973A']),
  }))

  return { animStyle }
}
