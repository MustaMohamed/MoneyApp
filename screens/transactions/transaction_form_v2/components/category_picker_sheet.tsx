import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { Pressable, View } from 'react-native';

import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { CoreTokens, GoldTokens } from '@/constants/theme_tokens';
import type { Category } from '@/database/entities/category.entity';

interface Props {
  visible: boolean;
  title: string;
  categories: Category[];
  selectedId: string | undefined;
  onSelect: (category: Category) => void;
  onClose: () => void;
}

export function CategoryPickerSheet({
  visible,
  title,
  categories,
  selectedId,
  onSelect,
  onClose,
}: Props): React.ReactElement {
  // Use BottomSheetFlatList (not BottomSheetScrollView) so the bottom-sheet
  // gesture handler hands swipe gestures to the list when content overflows.
  // The previous ScrollView-of-rows implementation rendered all cells but
  // touch swipes inside the aspectRatio:1 Pressables didn't always propagate
  // to the parent scroll — making the picker appear non-scrollable.
  return (
    <Sheet visible={visible} onClose={onClose} title={title} size="lg">
      <Sheet.Body>
        <BottomSheetFlatList
          data={categories}
          keyExtractor={(c) => c.id}
          numColumns={3}
          contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 12 }}
          columnWrapperStyle={{ gap: 12 }}
          renderItem={({ item: cat }) => {
            const isSelected = cat.id === selectedId;
            // Icon colour: each category has its own colour (e.g. food = warm
            // orange, transport = blue). Selected wins with the gold accent so
            // the picker still has a clear "this one" signal.
            const iconColor = isSelected ? GoldTokens[500] : (cat.color ?? CoreTokens.text1);
            return (
              <Pressable
                key={cat.id}
                testID={`category-picker-cell-${cat.id}`}
                onPress={() => onSelect(cat)}
                style={{ flex: 1, aspectRatio: 1 }}
                className={`items-center justify-center rounded-md border ${isSelected ? 'border-accent bg-accent/10' : 'border-border bg-default'}`}
              >
                <MaterialCommunityIcons
                  name={(cat.icon as any) ?? 'tag'}
                  size={26}
                  color={iconColor}
                />
                <Text
                  className={`font-inter text-[11px] mt-1 ${isSelected ? 'text-accent' : 'text-foreground'}`}
                  numberOfLines={1}
                >
                  {cat.name}
                </Text>
                {isSelected ? (
                  <View
                    testID={`category-picker-cell-${cat.id}-selected`}
                    className="absolute top-1 right-1"
                  >
                    <MaterialCommunityIcons name="check-circle" size={14} color={GoldTokens[500]} />
                  </View>
                ) : null}
              </Pressable>
            );
          }}
        />
      </Sheet.Body>
    </Sheet>
  );
}
