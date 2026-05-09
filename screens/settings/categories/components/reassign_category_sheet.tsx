import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect, useRef } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import ActionSheet, { type ActionSheetRef } from 'react-native-actions-sheet';
import { useShallow } from 'zustand/react/shallow';

import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Size, Spacing, Type } from '@/constants/theme';
import { ms } from '@/utils/responsive';
import { useReassignCategorySheetState } from '@/screens/settings/categories/components/reassign_category_sheet.state';
import type { Category } from '@/store/category.store';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface ReassignCategorySheetProps {
  visible: boolean;
  categoryName: string;
  options: Category[];
  onConfirm: (toId: string) => Promise<void>;
  onCancel: () => void;
}

export function ReassignCategorySheet({
  visible,
  categoryName,
  options,
  onConfirm,
  onCancel,
}: ReassignCategorySheetProps) {
  const {
    state: reassignState,
    setSelectedId,
    setIsLoading,
  } = useReassignCategorySheetState(
    useShallow((s) => ({
      state: s.state,
      setSelectedId: s.setSelectedId,
      setIsLoading: s.setIsLoading,
    })),
  );

  const sheetRef = useRef<ActionSheetRef>(null);

  useEffect(() => {
    if (visible) {
      sheetRef.current?.show();
    } else {
      sheetRef.current?.hide();
      useReassignCategorySheetState.getState().reset();
    }
  }, [visible]);

  const handleConfirm = async () => {
    if (!reassignState.selectedId) return;
    setIsLoading(true);
    try {
      await onConfirm(reassignState.selectedId);
    } finally {
      setIsLoading(false);
      setSelectedId(null);
    }
  };

  return (
    <ActionSheet
      ref={sheetRef}
      onClose={onCancel}
      gestureEnabled
      containerStyle={styles.sheet}
      indicatorStyle={styles.handle}
    >
      <View style={styles.content}>
        <Text style={styles.title}>{Strings.categoriesReassignTitle(categoryName)}</Text>
        <Text style={styles.body}>{Strings.categoriesReassignBody}</Text>

        <FlatList
          data={options}
          keyExtractor={(item) => item.id}
          style={styles.list}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setSelectedId(item.id)}
              style={[
                styles.optionRow,
                reassignState.selectedId === item.id && styles.optionRowActive,
              ]}
            >
              <View style={[styles.iconBox, { backgroundColor: item.color + '22' }]}>
                <MaterialCommunityIcons
                  name={item.icon as IconName}
                  size={Size.iconXs}
                  color={item.color}
                />
              </View>
              <Text style={styles.optionName}>{item.name}</Text>
              {reassignState.selectedId === item.id && (
                <MaterialCommunityIcons
                  name="check-circle"
                  size={Size.iconXs}
                  color={Colors.shared.cairoGold}
                />
              )}
            </Pressable>
          )}
        />

        <View style={styles.ctaWrap}>
          <Pressable
            onPress={handleConfirm}
            style={[
              styles.cta,
              (!reassignState.selectedId || reassignState.isLoading) && styles.ctaDisabled,
            ]}
            disabled={!reassignState.selectedId || reassignState.isLoading}
          >
            <Text style={styles.ctaText}>{Strings.categoriesReassignConfirm}</Text>
          </Pressable>
        </View>
      </View>
    </ActionSheet>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: Colors.dark.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
  },
  handle: {
    backgroundColor: Colors.dark.border,
    width: Size.sheetHandle.width,
    height: Size.sheetHandle.height,
  },
  content: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  title: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.subhead,
    color: Colors.dark.text1,
    marginBottom: Spacing.xs,
  },
  body: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.body,
    color: Colors.dark.text2,
    marginBottom: Spacing.md,
  },
  list: { flexGrow: 0, maxHeight: 300 },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.sm,
    marginBottom: 2,
  },
  optionRowActive: { backgroundColor: Colors.dark.surfaceEl },
  iconBox: {
    width: ms(32),
    height: ms(32),
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionName: {
    flex: 1,
    fontFamily: FontFamily.interMedium,
    fontSize: Type.body,
    color: Colors.dark.text1,
  },
  ctaWrap: {
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
    marginTop: Spacing.sm,
  },
  cta: {
    height: Size.ctaHeight,
    borderRadius: Radius.cta,
    backgroundColor: Colors.shared.cairoGold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: { opacity: 0.4 },
  ctaText: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.bodyStrong,
    color: Colors.shared.midnightBlue,
  },
});
