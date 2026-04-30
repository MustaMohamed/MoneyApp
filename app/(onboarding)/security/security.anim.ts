import { useEffect } from 'react'
import {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'

export function useSecurityPillAnim(isSelected: boolean) {
  const borderProgress = useSharedValue(isSelected ? 1 : 0)
  const iconScale = useSharedValue(1)

  useEffect(() => {
    if (isSelected) {
      borderProgress.value = withTiming(1, { duration: 200 })
      iconScale.value = withSequence(
        withSpring(1.08, { damping: 6, stiffness: 200 }),
        withSpring(1.0, { damping: 10 }),
      )
    } else {
      borderProgress.value = withTiming(0, { duration: 150 })
    }
  }, [isSelected, borderProgress, iconScale])

  const pillAnim = useAnimatedStyle(() => ({
    borderColor: interpolateColor(borderProgress.value, [0, 1], ['#2A3A4F', '#C9973A']),
  }))

  const iconAnim = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }))

  return { pillAnim, iconAnim }
}
