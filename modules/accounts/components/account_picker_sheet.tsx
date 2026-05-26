import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { View } from 'react-native';

import { PressableFeedback, Text } from 'heroui-native';

import { TYPE_OPTIONS } from './account_type_pill';
import { Sheet } from '@/components/ui/sheet';
import { CoreTokens } from '@/constants/theme_tokens';
import type { Account } from '../entities/account.entity';
import { formatAmount } from '@/utils/format_amount';
import { ms } from '@/utils/responsive';

interface Props {
  isOpen: boolean;
  title: string;
  accounts: Account[];
  selectedId: string | undefined;
  excludeId?: string;
  onSelect: (account: Account) => void;
  onOpenChange: (open: boolean) => void;
}

export function AccountPickerSheet({
  isOpen,
  title,
  accounts,
  selectedId,
  excludeId,
  onSelect,
  onOpenChange,
}: Props): React.ReactElement {
  const data = excludeId ? accounts.filter((a) => a.id !== excludeId) : accounts;

  // Fixed-snap scrollable picker — same pattern as CategoryPickerSheet.
  // The legacy fitContent + manual list-height (windowHeight * 0.42) clipped
  // the list on device because the dynamic content height didn't bound the
  // scroll view. size="md" gives a stable mid-height snap and flex:1 lets the
  // list scroll inside it without any manual height calculation.
  return (
    <Sheet isOpen={isOpen} onOpenChange={onOpenChange} title={title} size="md" scrollable>
      <BottomSheetScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
        {data.map((item) => {
          const isSelected = item.id === selectedId;
          return (
            <PressableFeedback
              key={item.id}
              testID={`account-picker-row-${item.id}`}
              onPress={() => onSelect(item)}
              style={{ flexDirection: 'row', alignItems: 'center' }}
              className="border-separator gap-3 border-b px-4 py-3"
            >
              <View style={{ width: ms(20), alignItems: 'center', justifyContent: 'center' }}>
                <MaterialCommunityIcons
                  name={TYPE_OPTIONS.find((o) => o.type === item.type)?.icon ?? 'bank'}
                  size={ms(18)}
                  color={item.color ?? CoreTokens.text2}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text className="font-sora text-foreground text-[15px] font-semibold">
                  {item.name}
                </Text>
                <Text className="font-inter text-muted text-[12px]">
                  {formatAmount(item.current_balance)} {item.currency}
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
            </PressableFeedback>
          );
        })}
      </BottomSheetScrollView>
    </Sheet>
  );
}
