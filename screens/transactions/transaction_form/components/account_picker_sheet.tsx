import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Pressable, View } from 'react-native';

import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { CoreTokens } from '@/constants/theme_tokens';
import type { Account } from '@/database/entities/account.entity';

interface Props {
  visible: boolean;
  title: string;
  accounts: Account[];
  selectedId: string | undefined;
  excludeId?: string;
  onSelect: (account: Account) => void;
  onClose: () => void;
}

export function AccountPickerSheet({
  visible,
  title,
  accounts,
  selectedId,
  excludeId,
  onSelect,
  onClose,
}: Props): React.ReactElement {
  const data = excludeId ? accounts.filter((a) => a.id !== excludeId) : accounts;

  return (
    <Sheet visible={visible} onClose={onClose} title={title} snapPoints={['40%']}>
      <Sheet.Body>
        {/*
          style={{ flex: 1 }} is REQUIRED so the scroll view is BOUNDED to the
          sheet's content height — without it the scroll view sizes to its
          content and has nothing to scroll (same fix/comment as
          transaction_form_body's BottomSheetScrollView). Account lists are
          short, so a ScrollView + map is fine — no virtualization needed.
        */}
        <BottomSheetScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
          {data.map((item) => {
            const isSelected = item.id === selectedId;
            return (
              <Pressable
                key={item.id}
                testID={`account-picker-row-${item.id}`}
                onPress={() => onSelect(item)}
                style={{ flexDirection: 'row', alignItems: 'center' }}
                className="border-separator gap-3 border-b px-4 py-3"
              >
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: item.color ?? CoreTokens.border,
                  }}
                />
                <View style={{ flex: 1 }}>
                  <Text className="font-sora text-foreground text-[15px] font-semibold">
                    {item.name}
                  </Text>
                  <Text className="font-inter text-muted text-[12px]">
                    {new Intl.NumberFormat('en-US', { style: 'decimal' }).format(
                      item.current_balance,
                    )}{' '}
                    {item.currency}
                  </Text>
                </View>
                {isSelected ? (
                  <MaterialCommunityIcons
                    testID={`account-picker-row-${item.id}-selected`}
                    name="check-circle"
                    size={20}
                    color={CoreTokens.text1}
                  />
                ) : null}
              </Pressable>
            );
          })}
        </BottomSheetScrollView>
      </Sheet.Body>
    </Sheet>
  );
}
