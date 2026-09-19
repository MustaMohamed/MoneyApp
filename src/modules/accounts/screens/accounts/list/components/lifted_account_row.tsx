import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { View, type ViewStyle } from 'react-native';
import Animated, { type AnimatedStyle } from 'react-native-reanimated';

import { Colors, Size } from '@/constants/theme';

import type { Account } from '../../../../entities/account.entity';
import {
  ACCOUNTS_LIST_FLOATING_STYLE,
  ACCOUNTS_LIST_LIFTED_ROW_STYLE,
  ACCOUNTS_LIST_ROW_STYLE,
} from '../accounts_list.geometry';
import { AccountListRowBody } from './account_list_row';

/** B6: the copy that follows the finger; the row itself stays mounted under it, faded out. */
export function LiftedAccountRow({
  account,
  caption,
  style,
}: {
  account: Account;
  caption: string;
  style: AnimatedStyle<ViewStyle>;
}) {
  return (
    <Animated.View
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[ACCOUNTS_LIST_FLOATING_STYLE, style]}
    >
      {/* Uniwind mishandles `className` on `Animated.View`, so the fill sits on this View. */}
      <View className="bg-surface-secondary" style={ACCOUNTS_LIST_LIFTED_ROW_STYLE}>
        <View style={ACCOUNTS_LIST_ROW_STYLE}>
          <AccountListRowBody account={account} caption={caption} />
          <View style={{ width: Size.reorderGripSlot, alignItems: 'center' }}>
            <MaterialCommunityIcons
              name="drag-vertical"
              size={Size.reorderGripSlot}
              color={Colors.dark.gold}
            />
          </View>
        </View>
      </View>
    </Animated.View>
  );
}
