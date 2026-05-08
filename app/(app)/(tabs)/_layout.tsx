import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs } from 'expo-router';

import { Colors } from '@/constants/theme';

type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

function tabIcon(name: MCIName, color: string) {
  return <MaterialCommunityIcons name={name} size={24} color={color} />;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.shared.cairoGold,
        tabBarInactiveTintColor: Colors.dark.text2,
        tabBarStyle: {
          backgroundColor: Colors.dark.surface,
          borderTopColor: Colors.dark.border,
        },
      }}
    >
      <Tabs.Screen name="bills/index" options={{ href: null }} />
      <Tabs.Screen
        name="dashboard"
        options={{ title: 'Home', tabBarIcon: ({ color }) => tabIcon('home', color) }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Transactions',
          tabBarIcon: ({ color }) => tabIcon('swap-horizontal', color),
        }}
      />
      <Tabs.Screen
        name="commitments"
        options={{
          title: 'Commitments',
          tabBarIcon: ({ color }) => tabIcon('calendar-check', color),
          unmountOnBlur: true,
        }}
      />
      <Tabs.Screen
        name="goals/index"
        options={{ title: 'Goals', tabBarIcon: ({ color }) => tabIcon('target', color) }}
      />
      <Tabs.Screen
        name="budget/index"
        options={{ title: 'Budget', tabBarIcon: ({ color }) => tabIcon('chart-pie', color) }}
      />
    </Tabs>
  );
}
