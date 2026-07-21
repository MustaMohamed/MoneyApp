import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { FAB } from '@/components/ui/fab';
import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import { TransactionFormV2Host } from '@/modules/transactions/screens/transactions/transaction_form_v2';

import { useTabsLayout } from './tabs.hook';

type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

function tabIcon(name: MCIName, color: string) {
  return <MaterialCommunityIcons name={name} size={24} color={color} />;
}

export function FABOverlay() {
  const { state, handleAddTransaction, handleAddAccount, handleAddCommitment } = useTabsLayout();

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <FAB
        onAddTransaction={handleAddTransaction}
        onAddAccount={handleAddAccount}
        onAddCommitment={handleAddCommitment}
        hidden={state.fabHidden}
        bottomOffset={state.fabBottomOffset}
      />
    </View>
  );
}

export default function TabsLayout(): React.ReactElement {
  return (
    <>
      <Tabs
        initialRouteName="dashboard"
        screenOptions={{
          headerShown: false,
          freezeOnBlur: true,
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
          options={{ title: Strings.tabHome, tabBarIcon: ({ color }) => tabIcon('home', color) }}
        />
        <Tabs.Screen
          name="transactions"
          options={{
            title: Strings.tabTransactions,
            tabBarIcon: ({ color }) => tabIcon('swap-horizontal', color),
            popToTopOnBlur: true,
          }}
        />
        <Tabs.Screen
          name="commitments"
          options={{
            title: Strings.tabCommitments,
            tabBarIcon: ({ color }) => tabIcon('calendar-check', color),
            popToTopOnBlur: true,
          }}
        />
        <Tabs.Screen
          name="goals/index"
          options={{ title: Strings.tabGoals, tabBarIcon: ({ color }) => tabIcon('target', color) }}
        />
        <Tabs.Screen
          name="budget"
          options={{
            title: Strings.tabBudget,
            tabBarIcon: ({ color }) => tabIcon('chart-pie', color),
            popToTopOnBlur: true,
          }}
        />
      </Tabs>
      <FABOverlay />
      <TransactionFormV2Host />
    </>
  );
}
