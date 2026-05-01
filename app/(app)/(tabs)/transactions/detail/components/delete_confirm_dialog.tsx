import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';

interface Props {
  visible: boolean;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmDialog({ visible, busy, onCancel, onConfirm }: Props) {
  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={busy ? () => {} : onCancel}
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.title}>{Strings.deleteConfirmTitle}</Text>
          <Text style={styles.body}>{Strings.deleteConfirmBody}</Text>
          <View style={styles.btnRow}>
            <Pressable onPress={onCancel} disabled={busy} style={[styles.btn, styles.cancelBtn]}>
              <Text style={styles.cancelText}>{Strings.deleteCancel}</Text>
            </Pressable>
            <Pressable onPress={onConfirm} disabled={busy} style={[styles.btn, styles.deleteBtn]}>
              {busy ? (
                <ActivityIndicator color={Colors.dark.text1} />
              ) : (
                <Text style={styles.deleteText}>{Strings.deleteTransaction}</Text>
              )}
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
    height: 44,
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
    fontFamily: FontFamily.interSemi,
    fontSize: Type.body,
    color: Colors.dark.text1,
  },
  deleteText: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.body,
    color: Colors.dark.text1,
  },
});
