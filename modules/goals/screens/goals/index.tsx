// modules/goals/screens/goals/index.tsx
import { EmptyState } from '@/components/ui/empty_state';
import { Screen } from '@/components/ui/screen';

export default function GoalsScreen() {
  return (
    <Screen>
      <EmptyState variant="goals" />
    </Screen>
  );
}
