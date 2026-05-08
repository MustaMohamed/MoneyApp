import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';

interface Props {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function SkipConfirmDialog({ visible, onCancel, onConfirm }: Props) {
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
          <Text style={styles.title}>{Strings.commitmentsSkipConfirmTitle}</Text>
          <Text style={styles.body}>{Strings.commitmentsSkipConfirmBody}</Text>
          <View style={styles.btnRow}>
            <Pressable onPress={onCancel} style={[styles.btn, styles.cancelBtn]}>
              <Text style={styles.cancelText}>{Strings.commitmentsSkipConfirmCancel}</Text>
            </Pressable>
            <Pressable onPress={onConfirm} style={[styles.btn, styles.skipBtn]}>
              <Text style={styles.skipText}>{Strings.commitmentsSkipConfirmConfirm}</Text>
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
  skipBtn: { backgroundColor: Colors.dark.surfaceEl },
  cancelText: {
    fontFamily: FontFamily.interSemi,
    fontSize: Type.body,
    color: Colors.dark.text1,
  },
  skipText: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.body,
    color: Colors.dark.text1,
  },
});
