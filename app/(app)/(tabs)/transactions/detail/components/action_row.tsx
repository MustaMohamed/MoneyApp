import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { ms } from '@/utils/responsive';
import { actionEntering, useDeletePressScale } from '../detail.anim';

interface Props {
  onEdit: () => void;
  onDelete: () => void;
}

export function ActionRow({ onEdit, onDelete }: Props) {
  const { scale, onPressIn, onPressOut } = useDeletePressScale();
  const deleteAnim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View entering={actionEntering} style={styles.row}>
      <Pressable style={styles.editWrap} onPress={onEdit}>
        <View style={styles.editBtn}>
          <MaterialCommunityIcons name="pencil-outline" size={ms(18)} color={Colors.dark.text1} />
          <Text style={styles.editLabel}>{Strings.editTransaction}</Text>
        </View>
      </Pressable>

      <Pressable
        onPress={onDelete}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={styles.deleteWrap}
      >
        <Animated.View style={[styles.deleteBtn, deleteAnim]}>
          <MaterialCommunityIcons
            name="delete-outline"
            size={ms(18)}
            color={Colors.dark.negative}
          />
          <Text style={styles.deleteLabel}>{Strings.deleteTransaction}</Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  editWrap: { flex: 1 },
  editBtn: {
    flex: 1,
    minHeight: ms(52),
    borderRadius: Radius.cta,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  editLabel: {
    fontFamily: FontFamily.interSemi,
    fontSize: Type.body,
    color: Colors.dark.text1,
  },
  deleteWrap: { flex: 1 },
  deleteBtn: {
    flex: 1,
    minHeight: ms(52),
    borderRadius: Radius.cta,
    backgroundColor: Colors.dark.dangerBg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  deleteLabel: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.body,
    color: Colors.dark.negative,
  },
});
