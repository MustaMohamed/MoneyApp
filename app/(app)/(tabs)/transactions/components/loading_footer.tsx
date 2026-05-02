import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';

export function LoadingFooter() {
  return (
    <View style={styles.wrap}>
      <ActivityIndicator color={Colors.shared.cairoGold} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
});
