import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
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

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

export function CategoryPickerSheet({
  visible,
  title,
  categories,
  selectedId,
  onSelect,
  onClose,
}: Props): React.ReactElement {
  const rows = chunk(categories, 3);

  return (
    <Sheet visible={visible} onClose={onClose} title={title} size="lg">
      <Sheet.Body>
        <BottomSheetScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          {rows.map((row, ri) => (
            <View key={ri} style={{ flexDirection: 'row' }} className="gap-3">
              {row.map((cat) => {
                const isSelected = cat.id === selectedId;
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
                      color={isSelected ? GoldTokens[500] : CoreTokens.text1}
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
                        <MaterialCommunityIcons
                          name="check-circle"
                          size={14}
                          color={GoldTokens[500]}
                        />
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
              {row.length < 3
                ? Array.from({ length: 3 - row.length }).map((_, i) => (
                    <View key={`pad-${i}`} style={{ flex: 1 }} />
                  ))
                : null}
            </View>
          ))}
        </BottomSheetScrollView>
      </Sheet.Body>
    </Sheet>
  );
}
