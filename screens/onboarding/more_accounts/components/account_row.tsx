import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { type EntryOrExitLayoutType } from 'react-native-reanimated';

import { AccountType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { FontFamily, Radius, Size, Spacing, Type } from '@/constants/theme';
import type { Account } from '@/store/account.store';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const TYPE_ICONS: Record<AccountType, IconName> = {
  [AccountType.Bank]: 'bank',
  [AccountType.SmartWallet]: 'cellphone-nfc',
  [AccountType.PhysicalWallet]: 'wallet',
  [AccountType.PhysicalSavings]: 'piggy-bank',
  [AccountType.CreditCard]: 'credit-card',
};

const TYPE_LABELS: Record<AccountType, string> = {
  [AccountType.Bank]: Strings.typeBank,
  [AccountType.SmartWallet]: Strings.typeSmartWallet,
  [AccountType.PhysicalWallet]: Strings.typePhysicalWallet,
  [AccountType.PhysicalSavings]: Strings.typePhysicalSavings,
  [AccountType.CreditCard]: Strings.typeCreditCard,
};

export function AccountRow({
  account,
  index,
  entering,
}: {
  account: Account;
  index: number;
  entering: EntryOrExitLayoutType | undefined;
}) {
  const isFirst = index === 0;
  const icon = TYPE_ICONS[account.type];
  const typeLabel = `${TYPE_LABELS[account.type]} · ${account.currency}`;
  const formattedBalance = new Intl.NumberFormat('en-US').format(account.opening_balance);

  return (
    <Animated.View entering={entering} style={styles.row}>
      <View
        style={[
          styles.iconContainer,
          isFirst ? styles.iconContainerActive : styles.iconContainerInactive,
        ]}
      >
        <MaterialCommunityIcons
          name={icon}
          size={Size.iconBack}
          color={isFirst ? '#C9973A' : '#6B7F99'}
        />
      </View>

      <View style={styles.rowMiddle}>
        <Text style={styles.rowName} numberOfLines={1}>
          {account.name}
        </Text>
        <Text style={styles.rowType}>{typeLabel}</Text>
      </View>

      <Text
        style={[
          styles.rowBalance,
          { color: account.type === AccountType.CreditCard ? '#E05A42' : '#4CAF82' },
        ]}
      >
        {formattedBalance}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: '#1A2535',
    borderWidth: 1,
    borderColor: '#2A3A4F',
  },
  iconContainer: {
    width: Size.typeIconBox,
    height: Size.typeIconBox,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerActive: {
    backgroundColor: '#1B2B4B',
    borderColor: '#C9973A',
  },
  iconContainerInactive: {
    backgroundColor: '#1A2535',
    borderColor: '#2A3A4F',
  },
  rowMiddle: {
    flex: 1,
    gap: Spacing.xxs,
  },
  rowName: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.subhead,
    color: '#F0EBE3',
  },
  rowType: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.caption,
    color: '#6B7F99',
  },
  rowBalance: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.subhead,
    color: '#4CAF82',
    marginLeft: 'auto',
  },
});
