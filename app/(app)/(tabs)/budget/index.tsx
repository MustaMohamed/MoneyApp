import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '@/components/empty_states';
import { Colors } from '@/constants/theme';

export default function BudgetScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <EmptyState variant="budget" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.dark.bg },
});
