import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomSheetFlatList } from '@gorhom/bottom-sheet';
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
        <BottomSheetFlatList
          data={data}
          keyExtractor={(a) => a.id}
          renderItem={({ item }) => {
            const isSelected = item.id === selectedId;
            return (
              <Pressable
                testID={`account-picker-row-${item.id}`}
                onPress={() => onSelect(item)}
                style={{ flexDirection: 'row', alignItems: 'center' }}
                className="px-4 py-3 gap-3 border-b border-separator"
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
                  <Text className="font-sora font-semibold text-[15px] text-foreground">
                    {item.name}
                  </Text>
                  <Text className="font-inter text-[12px] text-muted">
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
          }}
        />
      </Sheet.Body>
    </Sheet>
  );
}
