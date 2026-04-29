import { StyleSheet, Text, View } from 'react-native';

export function MockStatusBar() {
  return (
    <View style={styles.bar}>
      <Text style={styles.time}>9:41</Text>
      <View style={styles.right}>
        <View style={styles.signal}>
          <View style={[styles.barShape, styles.bar1, styles.muted]} />
          <View style={[styles.barShape, styles.bar2, styles.muted]} />
          <View style={[styles.barShape, styles.bar3, styles.muted]} />
          <View style={[styles.barShape, styles.bar4, styles.full]} />
        </View>
        <View style={styles.battery}>
          <View style={styles.batteryFill} />
          <View style={styles.batteryCap} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 38,
    backgroundColor: '#0F1923',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  time: {
    fontFamily: 'Sora_700Bold',
    fontSize: 9,
    color: '#D4A44C',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  signal: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 1.5,
  },
  barShape: {
    width: 2,
    borderRadius: 1,
  },
  bar1: { height: 4 },
  bar2: { height: 6 },
  bar3: { height: 8 },
  bar4: { height: 10 },
  muted: { backgroundColor: '#6B7F99' },
  full: { backgroundColor: '#F0EBE3' },
  battery: {
    width: 16,
    height: 9,
    borderWidth: 1,
    borderColor: '#F0EBE3',
    borderRadius: 2,
    padding: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  batteryFill: {
    width: '70%',
    height: '100%',
    backgroundColor: '#F0EBE3',
    borderRadius: 1,
  },
  batteryCap: {
    position: 'absolute',
    right: -2,
    top: 2.5,
    width: 1,
    height: 4,
    backgroundColor: '#F0EBE3',
    borderRadius: 0.5,
  },
});
