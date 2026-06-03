import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs, usePathname, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FAB } from '@/components/ui/fab';
import { Colors, Size } from '@/constants/theme';
import { useAddTransactionState } from '@/modules/transactions/screens/transactions/transaction_form/add_transaction.state';
import { useSheetVisibilityStore } from '@/store/sheet_visibility.store';
import { ms } from '@/utils/responsive';

type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

function tabIcon(name: MCIName, color: string) {
  return <MaterialCommunityIcons name={name} size={24} color={color} />;
}

/**
 * useFABActions — layout-local hook providing the three FAB navigation callbacks.
 *
 * Add Transaction opens a sheet that is mounted inside the transactions tab, so
 * it flips the shared add-transaction state and switches to that tab; the screen
 * renders the sheet on the next focus. Add Account / Add Commitment push routes.
 */
function useFABActions() {
  const router = useRouter();
  const addTransactionState = useAddTransactionState();
  return {
    handleAddTransaction: () => {
      addTransactionState.requestOpen();
      router.navigate('/transactions');
    },
    handleAddAccount: () => {
      router.push('/accounts/add_account');
    },
    handleAddCommitment: () => {
      router.push('/commitments/add' as Parameters<typeof router.push>[0]);
    },
  };
}

export function FABOverlay() {
  const { handleAddTransaction, handleAddAccount, handleAddCommitment } = useFABActions();
  const pathname = usePathname();
  const sheetVisibility = useSheetVisibilityStore();
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
  const anySheetOpen = sheetVisibility.anyOpen;

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
            popToTopOnBlur: true,
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
          name="budget"
          options={{
            title: 'Budget',
            tabBarIcon: ({ color }) => tabIcon('chart-pie', color),
            popToTopOnBlur: true,
          }}
        />
      </Tabs>
      <FABOverlay />
    </>
  );
}
