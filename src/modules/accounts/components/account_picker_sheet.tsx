import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { PressableFeedback } from 'heroui-native';

import { Sheet } from '@/components/ui/sheet';
import { CoreTokens } from '@/constants/theme_tokens';

import type { Account } from '../entities/account.entity';
import { AccountRowContent } from './account_row_content';

interface Props {
  isOpen: boolean;
  title: string;
  accounts: Account[];
  selectedId: string | undefined;
  excludeId?: string;
  onSelect: (account: Account) => void;
  onOpenChange: (open: boolean) => void;
  onCloseComplete?: () => void;
}

export function AccountPickerSheet({
  isOpen,
  title,
  accounts,
  selectedId,
  excludeId,
  onSelect,
  onOpenChange,
  onCloseComplete,
}: Props): React.ReactElement {
  const data = excludeId ? accounts.filter((a) => a.id !== excludeId) : accounts;

  // A dynamic sheet height does not bound the scroll view and clips the list; use a fixed snap.
  return (
    <Sheet
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      onCloseComplete={onCloseComplete}
      title={title}
      size="md"
      scrollable
    >
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
              <AccountRowContent account={item} />
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
