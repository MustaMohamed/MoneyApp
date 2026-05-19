import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Pressable, useWindowDimensions, View } from 'react-native';

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

// 4-column grid keeps cells tight enough that most phones fit 4-5 rows
// before scroll is needed.
const NUM_COLUMNS = 4;
const GAP = 10;
const PADDING = 12;

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
  // Fixed cell width derived from the actual screen width keeps cells the
  // SAME SIZE across every row. The previous `style={{ flex: 1 }}` approach
  // worked for full rows but stretched the last partial row's items to fill
  // the available width (22 expense cats → last row of 2 = 2× larger cells).
  // Computing the width once here makes every cell identical and lets the
  // last partial row centre via `justifyContent`.
  const { width: screenWidth } = useWindowDimensions();
  const cellWidth = (screenWidth - PADDING * 2 - GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

  const rows = chunk(categories, NUM_COLUMNS);

  return (
    <Sheet visible={visible} onClose={onClose} title={title} size="lg">
      <Sheet.Body>
        <BottomSheetScrollView
          contentContainerStyle={{ padding: PADDING, paddingBottom: 32, gap: GAP }}
          showsVerticalScrollIndicator={false}
        >
          {rows.map((row, ri) => {
            // Partial last row: centre the items instead of left-aligning so
            // they read as "remaining cats" rather than "incomplete row".
            const isPartial = row.length < NUM_COLUMNS;
            return (
              <View
                key={ri}
                style={{
                  flexDirection: 'row',
                  justifyContent: isPartial ? 'center' : 'flex-start',
                  gap: GAP,
                }}
              >
                {row.map((cat) => {
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
                      style={{ width: cellWidth, aspectRatio: 1 }}
                      className={`items-center justify-center rounded-md border ${isSelected ? 'border-accent bg-accent/10' : 'border-border bg-default'}`}
                    >
                      <MaterialCommunityIcons
                        name={(cat.icon as any) ?? 'tag'}
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
                          <MaterialCommunityIcons
                            name="check-circle"
                            size={12}
                            color={GoldTokens[500]}
                          />
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            );
          })}
        </BottomSheetScrollView>
      </Sheet.Body>
    </Sheet>
  );
}
