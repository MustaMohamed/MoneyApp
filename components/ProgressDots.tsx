import { StyleSheet, View } from 'react-native';

const TOTAL_STEPS = 6;

export function ProgressDots({ activeIndex }: { activeIndex: number }) {
  return (
    <View style={styles.row}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <View key={i} style={[styles.dot, i <= activeIndex ? styles.active : styles.inactive]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: 20,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
  active: { backgroundColor: '#C9973A' },
  inactive: { backgroundColor: '#243044' },
});
