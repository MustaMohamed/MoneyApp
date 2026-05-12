import React from 'react';
import { StyleSheet, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Size } from '@/constants/theme';
import { FAB } from '@/components/ui/fab';
import { ms } from '@/utils/responsive';

type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

function tabIcon(name: MCIName, color: string) {
  return <MaterialCommunityIcons name={name} size={24} color={color} />;
}

/**
 * useFABActions — layout-local hook providing the three FAB navigation callbacks.
 *
 * Target routes are NO-OPS in §3 — the destination screens belong to later sections:
 *   - Add Transaction → §7
 *   - Add Account     → §9
 *   - Add Commitment  → §8
 *
 * Replace the console.warn stubs with router.push calls when each section ships.
 */
function useFABActions() {
  // useRouter() will be added back when each handler is wired to a real route
  // in §7 (Add Transaction), §8 (Add Commitment), and §9 (Add Account).
  return {
    handleAddTransaction: () => {
      // TODO(§7): router.push('/(app)/transactions/add') when Add Transaction sheet ships
      console.warn('[FAB] Add Transaction not yet wired — pending §7');
    },
    handleAddAccount: () => {
      // TODO(§9): router.push('/(app)/accounts/add_account') when Add Account sheet ships
      console.warn('[FAB] Add Account not yet wired — pending §9');
    },
    handleAddCommitment: () => {
      // TODO(§8): router.push('/(app)/commitments/add') when Add Commitment ships
      console.warn('[FAB] Add Commitment not yet wired — pending §8');
    },
  };
}

function FABOverlay() {
  const { handleAddTransaction, handleAddAccount, handleAddCommitment } = useFABActions();
  const pathname = usePathname();
  // useBottomTabBarHeight() throws when called outside <Tabs> context.
  // Use safe-area insets + a fixed tab-bar estimate instead.
  const insets = useSafeAreaInsets();
  const bottomOffset = insets.bottom + Size.tabBarHeight + ms(16);

  const isSettingsRoute = pathname.startsWith('/settings');

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <FAB
        onAddTransaction={handleAddTransaction}
        onAddAccount={handleAddAccount}
        onAddCommitment={handleAddCommitment}
        hidden={isSettingsRoute}
        bottomOffset={bottomOffset}
      />
    </View>
  );
}

export default function TabsLayout() {
  return (
    <>
      <Tabs
        initialRouteName="dashboard"
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
            popToTopOnBlur: true,
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
      <FABOverlay />
    </>
  );
}
