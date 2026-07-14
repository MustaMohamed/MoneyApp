import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { PressableFeedback } from 'heroui-native';
import { useWindowDimensions, View } from 'react-native';

import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { CoreTokens, GoldTokens } from '@/constants/theme_tokens';
import { toIconName } from '@/utils/icon_name_guard';

import type { Category } from '../entities/category.entity';

interface Props {
  isOpen: boolean;
  title: string;
  categories: Category[];
  selectedId?: string | undefined;
  selectedIds?: string[] | undefined;
  onSelect: (category: Category) => void;
  onOpenChange: (open: boolean) => void;
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
  isOpen,
  title,
  categories,
  selectedId,
  selectedIds,
  onSelect,
  onOpenChange,
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
  const selectedIdSet = new Set(selectedIds ?? (selectedId ? [selectedId] : []));

  return (
    // scrollable=true: size="lg" fixed snap + bounded h-full container so
    // BottomSheetScrollView's flex:1 has a parent to scroll inside.
    <Sheet isOpen={isOpen} onOpenChange={onOpenChange} title={title} size="lg" scrollable>
      <BottomSheetScrollView
        // flex: 1 bounds the scroll view to the sheet height so it scrolls;
        // without it the view sizes to content and can't scroll (same fix as
        // account_picker_sheet + transaction_form_body).
        style={{ flex: 1 }}
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
                const isSelected = selectedIdSet.has(cat.id);
                // Icon colour: each category has its own colour (e.g. food =
                // warm orange, transport = blue). Selected wins with the gold
                // accent so the picker still has a clear "this one" signal.
                // oxlint-disable-next-line typescript/no-unnecessary-condition -- cat.color can be null despite type
                const iconColor = isSelected ? GoldTokens[500] : (cat.color ?? CoreTokens.text1);
                return (
                  <PressableFeedback
                    key={cat.id}
                    testID={`category-picker-cell-${cat.id}`}
                    onPress={() => onSelect(cat)}
                    style={{ width: cellWidth, aspectRatio: 1 }}
                    className={`items-center justify-center rounded-md border ${isSelected ? 'border-accent bg-accent/10' : 'border-border bg-default'}`}
                  >
                    <MaterialCommunityIcons
                      name={toIconName(cat.icon, 'tag')}
                      size={22}
                      color={iconColor}
                    />
                    <Text
                      className={`font-inter mt-1 text-[10px] ${isSelected ? 'text-accent' : 'text-foreground'}`}
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
                  </PressableFeedback>
                );
              })}
            </View>
          );
        })}
      </BottomSheetScrollView>
    </Sheet>
  );
}
