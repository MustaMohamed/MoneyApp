import React from 'react';
import { Modal, View } from 'react-native';

import { Box } from '@/components/ui/box';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { AccountType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
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
      {/* Scrim — literal rgba allowed for modal scrims (spec §2.7) */}
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.65)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        }}
      >
        <Box className="bg-surface border-border w-full rounded-2xl border p-5">
          <Text variant="h3" className="text-foreground font-soraBold mb-2">
            {Strings.accountDetailArchiveTitle}
          </Text>
          <Text variant="body" className="text-muted mb-2">
            {Strings.accountDetailArchiveBody}
          </Text>
          {isCC ? (
            <Text variant="caption" className="text-accent mb-2">
              {Strings.accountDetailArchiveCCWarning}
            </Text>
          ) : null}
          <Box style={{ flexDirection: 'row' }} className="mt-1 gap-2">
            <Box style={{ flex: 1 }}>
              <Button variant="secondary" label={Strings.accountDetailCancel} onPress={onClose} />
            </Box>
            <Box style={{ flex: 1 }}>
              <Button
                variant="danger"
                label={Strings.accountDetailArchiveConfirm}
                onPress={onConfirm}
                isDisabled={isLoading}
                isLoading={isLoading}
              />
            </Box>
          </Box>
        </Box>
      </View>
    </Modal>
  );
}
