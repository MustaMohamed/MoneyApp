import { useState } from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Size, Spacing, Type } from '@/constants/theme';
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    if (!selectedId) return;
    setIsLoading(true);
    try {
      await onConfirm(selectedId);
    } finally {
      setIsLoading(false);
      setSelectedId(null);
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onCancel}
      animationType="slide"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onCancel} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>{Strings.categoriesReassignTitle(categoryName)}</Text>
          <Text style={styles.body}>{Strings.categoriesReassignBody}</Text>

          <FlatList
            data={options}
            keyExtractor={(item) => item.id}
            style={styles.list}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => setSelectedId(item.id)}
                style={[styles.optionRow, selectedId === item.id && styles.optionRowActive]}
              >
                <View style={[styles.iconBox, { backgroundColor: item.color + '22' }]}>
                  <MaterialCommunityIcons
                    name={item.icon as IconName}
                    size={Size.iconXs}
                    color={item.color}
                  />
                </View>
                <Text style={styles.optionName}>{item.name}</Text>
                {selectedId === item.id && (
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
              style={[styles.cta, (!selectedId || isLoading) && styles.ctaDisabled]}
              disabled={!selectedId || isLoading}
            >
              <Text style={styles.ctaText}>{Strings.categoriesReassignConfirm}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: Colors.dark.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    maxHeight: '75%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.dark.border,
    alignSelf: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
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
    width: 32,
    height: 32,
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
