import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { AccountType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Size, Spacing, Type } from '@/constants/theme';
import type { Account } from '@/store/account.store';

interface ArchiveConfirmationDialogProps {
  visible: boolean;
  account: Account | undefined;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

export function ArchiveConfirmationDialog({
  visible,
  account,
  onClose,
  onConfirm,
  isLoading,
}: ArchiveConfirmationDialogProps) {
  const isCC = account?.type === AccountType.CreditCard;

  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onClose}
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.title}>{Strings.accountDetailArchiveTitle}</Text>
          <Text style={styles.body}>{Strings.accountDetailArchiveBody}</Text>
          {isCC && <Text style={styles.warning}>{Strings.accountDetailArchiveCCWarning}</Text>}
          <View style={styles.btnRow}>
            <Pressable onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>{Strings.accountDetailCancel}</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              disabled={isLoading}
              style={[styles.archiveBtn, isLoading && styles.disabled]}
            >
              <Text style={styles.archiveText}>{Strings.accountDetailArchiveConfirm}</Text>
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
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  dialog: {
    width: '100%',
    backgroundColor: Colors.dark.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  title: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.title,
    color: Colors.dark.text1,
    marginBottom: Spacing.sm,
  },
  body: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.body,
    color: Colors.dark.text2,
    lineHeight: Type.body * 1.5,
    marginBottom: Spacing.sm,
  },
  warning: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.caption,
    color: Colors.dark.gold,
    marginBottom: Spacing.sm,
  },
  btnRow: { flexDirection: 'row', gap: Spacing.xs, marginTop: Spacing.xs },
  cancelBtn: {
    flex: 1,
    height: Size.ctaHeight,
    backgroundColor: Colors.dark.surfaceEl,
    borderRadius: Radius.cta,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  cancelText: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.bodyStrong,
    color: Colors.dark.text2,
  },
  archiveBtn: {
    flex: 1,
    height: Size.ctaHeight,
    backgroundColor: Colors.dark.negative,
    borderRadius: Radius.cta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  archiveText: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.bodyStrong,
    color: Colors.dark.text1,
  },
  disabled: { opacity: 0.5 },
});
