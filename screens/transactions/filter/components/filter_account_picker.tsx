import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import ActionSheet, { type ActionSheetRef, FlatList } from 'react-native-actions-sheet';

import { AccountType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Size, Spacing, Type } from '@/constants/theme';
import { ms } from '@/utils/responsive';
import type { Account } from '@/database/entities/account.entity';

type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const ACCOUNT_TYPE_ICON: Record<AccountType, MCIName> = {
  [AccountType.Bank]: 'bank',
  [AccountType.SmartWallet]: 'cellphone-nfc',
  [AccountType.PhysicalWallet]: 'wallet',
  [AccountType.PhysicalSavings]: 'piggy-bank',
  [AccountType.CreditCard]: 'credit-card',
};

function iconForAccountType(type: AccountType): MCIName {
  return ACCOUNT_TYPE_ICON[type] ?? 'bank';
}

interface Props {
  visible: boolean;
  accounts: Account[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onClose: () => void;
}

function formatBalance(balance: number, currency: string): string {
  return `${new Intl.NumberFormat('en-US', { style: 'decimal' }).format(balance)} ${currency}`;
}

export function FilterAccountPicker({ visible, accounts, selectedIds, onToggle, onClose }: Props) {
  const sheetRef = useRef<ActionSheetRef>(null);

  useEffect(() => {
    if (visible) sheetRef.current?.show();
    else sheetRef.current?.hide();
  }, [visible]);

  return (
    <ActionSheet
      ref={sheetRef}
      onClose={onClose}
      gestureEnabled
      containerStyle={styles.sheet}
      indicatorStyle={styles.handle}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{Strings.filterPickAccountsTitle}</Text>
        <Pressable onPress={onClose} hitSlop={8}>
          <Text style={styles.doneLabel}>{Strings.filterPickerDone}</Text>
        </Pressable>
      </View>
      <FlatList
        data={accounts}
        keyExtractor={(a) => a.id}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        renderItem={({ item }) => {
          const checked = selectedIds.includes(item.id);
          return (
            <Pressable
              onPress={() => onToggle(item.id)}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              <View style={styles.iconContainer}>
                <MaterialCommunityIcons
                  name={iconForAccountType(item.type as AccountType)}
                  size={ms(20)}
                  color={checked ? Colors.shared.cairoGold : Colors.dark.text2}
                />
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.balance}>
                  {formatBalance(item.current_balance, item.currency)}
                </Text>
              </View>
              <View style={[styles.checkbox, checked && styles.checkboxOn]}>
                {checked && (
                  <MaterialCommunityIcons
                    name="check"
                    size={ms(14)}
                    color={Colors.shared.midnightBlue}
                  />
                )}
              </View>
            </Pressable>
          );
        }}
      />
    </ActionSheet>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: Colors.dark.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xxl,
    maxHeight: '70%',
  },
  handle: {
    backgroundColor: Colors.dark.border,
    width: Size.sheetHandle.width,
    height: Size.sheetHandle.height,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  title: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.subhead,
    color: Colors.dark.text1,
  },
  doneLabel: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.body,
    color: Colors.shared.cairoGold,
  },
  sep: { height: Size.hairline, backgroundColor: Colors.dark.border },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  rowPressed: { opacity: 0.7 },
  iconContainer: { width: ms(24), alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  name: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.body,
    color: Colors.dark.text1,
  },
  balance: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.caption,
    color: Colors.dark.text2,
  },
  checkbox: {
    width: ms(22),
    height: ms(22),
    borderRadius: ms(4),
    borderWidth: 1.5,
    borderColor: Colors.dark.text2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: Colors.shared.cairoGold,
    borderColor: Colors.shared.cairoGold,
  },
});
