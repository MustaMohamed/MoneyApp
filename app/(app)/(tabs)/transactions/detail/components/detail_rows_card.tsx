import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { rowsEntering } from '../detail.anim';

interface Props {
  children: React.ReactNode;
}

export function DetailRowsCard({ children }: Props) {
  return (
    <Animated.View entering={rowsEntering} style={styles.card}>
      <View>{children}</View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.dark.surface,
    borderRadius: Radius.md,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
});
