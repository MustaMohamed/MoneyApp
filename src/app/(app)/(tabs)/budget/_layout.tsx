import { Stack } from 'expo-router';

import { Colors } from '@/constants/theme';

export default function BudgetLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        freezeOnBlur: true,
        contentStyle: { backgroundColor: Colors.dark.bg },
      }}
    />
  );
}
