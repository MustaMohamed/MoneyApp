import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs, usePathname, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FAB } from '@/components/ui/fab';
import { Colors, Size } from '@/constants/theme';
import { useAnySheetOpen } from '@/store/sheet_visibility.store';
import { ms } from '@/utils/responsive';

type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

function tabIcon(name: MCIName, color: string) {
  return <MaterialCommunityIcons name={name} size={24} color={color} />;
}

/**
 * useFABActions — layout-local hook providing the three FAB navigation callbacks.
 *
 * Wiring status:
 *   - Add Transaction → §7 (pending)
 *   - Add Account     → §9 (pending)
 *   - Add Commitment  → §8 (done)
 */
function useFABActions() {
  const router = useRouter();
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
      router.push('/commitments/add' as Parameters<typeof router.push>[0]);
    },
  };
}

export function FABOverlay() {
  const { handleAddTransaction, handleAddAccount, handleAddCommitment } = useFABActions();
  const pathname = usePathname();
  // useBottomTabBarHeight() throws when called outside <Tabs> context.
  // Use safe-area insets + a fixed tab-bar estimate instead.
  const insets = useSafeAreaInsets();
  const bottomOffset = insets.bottom + Size.tabBarHeight + ms(16);

  const isSettingsRoute = pathname.startsWith('/settings');
  // The commitment detail/add/edit screens are pushed routes nested INSIDE the
  // tabs group, so this FAB overlay (a sibling of <Tabs>) floats over them and
  // collides with their bottom Save/Pay CTAs. Hide it on any /commitments/ sub-route
  // — the FAB is a list-level "add" affordance, not a form/detail one.
  const isCommitmentSubRoute = pathname.startsWith('/commitments/');
  const anySheetOpen = useAnySheetOpen();

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <FAB
        onAddTransaction={handleAddTransaction}
        onAddAccount={handleAddAccount}
        onAddCommitment={handleAddCommitment}
        hidden={isSettingsRoute || isCommitmentSubRoute || anySheetOpen}
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
