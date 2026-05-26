import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { cn } from 'heroui-native';
import React from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';

import { Text } from 'heroui-native';

import { Pressable } from '@/components/ui/pressable';
import { AccountType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { CoreTokens, GoldTokens } from '@/constants/theme_tokens';

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

function useTypePillAnim() {
  const scale = useSharedValue(1);

  const pillAnim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const triggerPillTap = () => {
    scale.value = withSequence(
      withSpring(1.03, { damping: 8, stiffness: 200 }),
      withSpring(1.0, { damping: 12 }),
    );
  };

  return { pillAnim, triggerPillTap };
}

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
        style={{ flexDirection: 'row' }}
        className={cn(
          'items-center gap-2 rounded-[8px] border-[1.5px] px-3 py-3',
          isSelected ? 'border-gold-600 bg-[rgba(201,151,58,0.08)]' : 'border-border bg-default',
        )}
      >
        <MaterialCommunityIcons name={option.icon} size={18} color={iconColor} />
        <Text
          className={cn('font-sora-bold', isSelected ? 'text-gold-600' : 'text-muted')}
        >
          {option.label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}
