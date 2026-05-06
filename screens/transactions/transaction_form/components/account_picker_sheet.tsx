import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect, useRef } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import ActionSheet, { type ActionSheetRef } from 'react-native-actions-sheet';

import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { ms } from '@/utils/responsive';
import type { Account } from '@/database/entities/account.entity';

interface Props {
  visible: boolean;
  title: string;
  accounts: Account[];
  selectedId?: string;
  excludeId?: string;
  onSelect: (account: Account) => void;
  onClose: () => void;
}

function formatBalance(balance: number): string {
  return new Intl.NumberFormat('en-US', { style: 'decimal' }).format(balance);
}

export function AccountPickerSheet({
  visible,
  title,
  accounts,
  selectedId,
  excludeId,
  onSelect,
  onClose,
}: Props) {
  const filtered = accounts.filter((a) => a.id !== excludeId);
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
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <FlatList
          data={filtered}
          keyExtractor={(a) => a.id}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          style={styles.list}
          renderItem={({ item }) => {
            const isSelected = item.id === selectedId;
            return (
              <Pressable
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                onPress={() => onSelect(item)}
              >
                <View
                  style={[styles.dot, { backgroundColor: item.color ?? Colors.dark.surfaceEl }]}
                />
                <View style={styles.info}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.balance}>
                    {formatBalance(item.current_balance)} {item.currency}
                  </Text>
                </View>
                {isSelected && (
                  <MaterialCommunityIcons
                    name="check"
                    size={ms(20)}
                    color={Colors.shared.cairoGold}
                  />
                )}
              </Pressable>
            );
          }}
        />
      </View>
    </ActionSheet>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: Colors.dark.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
  },
  handle: { backgroundColor: Colors.dark.border, width: ms(36), height: ms(4) },
  content: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  list: { maxHeight: 420 },
  title: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.subhead,
    color: Colors.dark.text1,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  sep: { height: 1, backgroundColor: Colors.dark.border },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  rowPressed: { opacity: 0.7 },
  dot: {
    width: ms(12),
    height: ms(12),
    borderRadius: ms(6),
  },
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
});
