import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Size, Spacing, Type } from '@/constants/theme';

interface DeleteConfirmationDialogProps {
  visible: boolean;
  categoryName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmationDialog({
  visible,
  categoryName,
  onConfirm,
  onCancel,
}: DeleteConfirmationDialogProps) {
  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onCancel}
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.title}>{Strings.categoriesDeleteTitle}</Text>
          <Text style={styles.body}>{Strings.categoriesDeleteBody(categoryName)}</Text>
          <View style={styles.btnRow}>
            <Pressable onPress={onCancel} style={[styles.btn, styles.cancelBtn]}>
              <Text style={styles.cancelText}>{Strings.categoriesDeleteCancel}</Text>
            </Pressable>
            <Pressable onPress={onConfirm} style={[styles.btn, styles.deleteBtn]}>
              <Text style={styles.deleteText}>{Strings.categoriesDeleteConfirm}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  dialog: {
    backgroundColor: Colors.dark.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  title: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.subhead,
    color: Colors.dark.text1,
    marginBottom: Spacing.sm,
  },
  body: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.body,
    color: Colors.dark.text2,
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  btnRow: { flexDirection: 'row', gap: Spacing.sm },
  btn: {
    flex: 1,
    height: Size.dialogButton,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: Colors.dark.surfaceEl,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  deleteBtn: { backgroundColor: Colors.dark.negative },
  cancelText: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.body,
    color: Colors.dark.text1,
  },
  deleteText: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.body,
    color: Colors.dark.text1,
  },
});
