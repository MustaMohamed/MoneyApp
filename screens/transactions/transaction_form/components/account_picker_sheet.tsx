import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Pressable, useWindowDimensions, View } from 'react-native';

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
  const { height: windowHeight } = useWindowDimensions();
  // Definite list height + enableDynamicSizing: the sheet hugs (header + list)
  // to a consistent mid height with no empty gap, and rows scroll on overflow.
  // A definite height is required — the sheet's animated content height doesn't
  // bound a flex:1 child, so a short fixed snap (the old ['40%']) just clipped
  // the list. ~42% of the screen reads as mid (≈half) once chrome is added.
  const listHeight = Math.round(windowHeight * 0.42);

  return (
    <Sheet visible={visible} onClose={onClose} title={title} enableDynamicSizing>
      <Sheet.Body>
        <BottomSheetScrollView
          style={{ height: listHeight }}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
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
