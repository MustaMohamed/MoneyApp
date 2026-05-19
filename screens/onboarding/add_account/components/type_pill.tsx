import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated from 'react-native-reanimated';

import { AccountType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { FontFamily, Radius, Size, Spacing, Type } from '@/constants/theme';

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
  const iconColor = isSelected ? '#C9973A' : '#6B7F99';

  return (
    <Animated.View
      style={[
        styles.typePillWrap,
        option.fullWidth ? styles.typePillFull : styles.typePillHalf,
        pillAnim,
      ]}
    >
      <Pressable
        onPress={() => {
          triggerPillTap();
          onSelect();
        }}
        style={[styles.typePill, isSelected ? styles.pillActive : styles.pillInactive]}
      >
        <MaterialCommunityIcons name={option.icon} size={Size.iconSm} color={iconColor} />
        <Text style={[styles.typePillText, { color: iconColor }]}>{option.label}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  typePillWrap: { borderRadius: Radius.md },
  typePillHalf: { width: '48.5%' },
  typePillFull: { width: '100%' },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1.5,
  },
  pillActive: { borderColor: '#C9973A', backgroundColor: 'rgba(201,151,58,0.08)' },
  pillInactive: { borderColor: '#2A3A4F', backgroundColor: '#1A2535' },
  typePillText: { fontFamily: FontFamily.soraBold, fontSize: Type.body },
});
