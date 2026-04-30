import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FontFamily, Spacing, Type } from '@/constants/theme';

export default function Dashboard() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>MoneyApp</Text>
        <Text style={styles.subtitle}>Onboarding complete. Dashboard coming in M1.5.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F1923' },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  title: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.headline,
    color: '#D4A44C',
  },
  subtitle: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.body,
    color: '#6B7F99',
    marginTop: Spacing.sm,
    textAlign: 'center',
    lineHeight: Math.round(Type.body * 1.4),
  },
});
