import React from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Animated from 'react-native-reanimated';

import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { AccountType } from '@/constants/enums';
import { GoldTokens, CoreTokens } from '@/constants/theme_tokens';
import { cn } from '@/utils/cn';
import { useTypePillAnim } from '../add_account.anim';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export type TypeOption = {
  type: AccountType;
  icon: IconName;
  label: string;
  fullWidth?: boolean;
};

export const TYPE_OPTIONS: TypeOption[] = [
  { type: AccountType.Bank, icon: 'bank', label: Strings.typeBank },
  { type: AccountType.SmartWallet, icon: 'cellphone-nfc', label: Strings.typeSmartWallet },
  { type: AccountType.PhysicalWallet, icon: 'wallet', label: Strings.typePhysicalWallet },
  { type: AccountType.PhysicalSavings, icon: 'piggy-bank', label: Strings.typePhysicalSavings },
  {
    type: AccountType.CreditCard,
    icon: 'credit-card',
    label: Strings.typeCreditCard,
    fullWidth: true,
  },
];

export function TypePill({
  option,
  isSelected,
  onSelect,
}: {
  option: TypeOption;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { pillAnim, triggerPillTap } = useTypePillAnim();
  const iconColor = isSelected ? GoldTokens[600] : CoreTokens.text2;

  return (
    <Animated.View
      style={[pillAnim, { borderRadius: 8 }]}
      className={option.fullWidth ? 'w-full' : 'w-[48.5%]'}
    >
      <Pressable
        onPress={() => {
          triggerPillTap();
          onSelect();
        }}
        className={cn(
          'flex-row items-center gap-2 py-3 px-3 rounded-[8px] border-[1.5px]',
          isSelected ? 'border-gold-600 bg-[rgba(201,151,58,0.08)]' : 'border-border bg-surfaceEl',
        )}
      >
        <MaterialCommunityIcons name={option.icon} size={18} color={iconColor} />
        <Text
          variant="body"
          className={cn('font-soraBold', isSelected ? 'text-gold-600' : 'text-text2')}
        >
          {option.label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}
