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

// 4-column grid (was 3) keeps each cell tighter on phone widths so more
// categories are visible at once. With ~16-20 cats per type, 4 columns means
// 4-5 rows fit on screen before scroll is needed — and when it IS needed,
// BottomSheetFlatList's gesture handling is reliable.
const NUM_COLUMNS = 4;

export function CategoryPickerSheet({
  visible,
  title,
  categories,
  selectedId,
  onSelect,
  onClose,
}: Props): React.ReactElement {
  return (
    <Sheet visible={visible} onClose={onClose} title={title} size="lg">
      <Sheet.Body>
        <BottomSheetFlatList
          data={categories}
          keyExtractor={(c) => c.id}
          numColumns={NUM_COLUMNS}
          // paddingBottom: 32 keeps the last row clear of the sheet's bottom
          // edge so it never looks cropped. gap:10 between rows matches the
          // columnWrapperStyle gap for a uniform grid.
          contentContainerStyle={{ padding: 12, paddingBottom: 32, gap: 10 }}
          columnWrapperStyle={{ gap: 10 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: cat }) => {
            const isSelected = cat.id === selectedId;
            // Icon colour: each category has its own colour (e.g. food =
            // warm orange, transport = blue). Selected wins with the gold
            // accent so the picker still has a clear "this one" signal.
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
                  // 22px (was 26) — fits the denser 4-col cell without
                  // crowding the label below.
                  size={22}
                  color={iconColor}
                />
                <Text
                  className={`font-inter text-[10px] mt-1 ${isSelected ? 'text-accent' : 'text-foreground'}`}
                  numberOfLines={1}
                >
                  {cat.name}
                </Text>
                {isSelected ? (
                  <View
                    testID={`category-picker-cell-${cat.id}-selected`}
                    className="absolute top-1 right-1"
                  >
                    <MaterialCommunityIcons name="check-circle" size={12} color={GoldTokens[500]} />
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
