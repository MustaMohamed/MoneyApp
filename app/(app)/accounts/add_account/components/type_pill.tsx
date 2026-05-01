import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated from 'react-native-reanimated';

import { Colors, FontFamily, Radius, Size, Spacing, Type } from '@/constants/theme';
import { Strings } from '@/constants/strings';
import { AccountType } from '@/constants/enums';
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
  const iconColor = isSelected ? Colors.shared.cairoGold : Colors.dark.text2;

  return (
    <Animated.View style={[styles.wrap, option.fullWidth ? styles.full : styles.half, pillAnim]}>
      <Pressable
        onPress={() => {
          triggerPillTap();
          onSelect();
        }}
        style={[styles.pill, isSelected ? styles.active : styles.inactive]}
      >
        <MaterialCommunityIcons name={option.icon} size={Size.iconSm} color={iconColor} />
        <Text style={[styles.label, { color: iconColor }]}>{option.label}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: Radius.md },
  half: { width: '48.5%' },
  full: { width: '100%' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1.5,
  },
  active: { borderColor: Colors.shared.cairoGold, backgroundColor: 'rgba(201,151,58,0.08)' },
  inactive: { borderColor: Colors.dark.border, backgroundColor: Colors.dark.surface },
  label: { fontFamily: FontFamily.soraBold, fontSize: Type.body },
});
