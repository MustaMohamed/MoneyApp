import React from 'react';
import { Modal, View } from 'react-native';

import { Box } from '@/components/ui/box';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
  busy?: boolean;
  /** Optional content rendered between the body and the button row (e.g. a warning line). */
  children?: React.ReactNode;
}

export function ConfirmDialog({
  visible,
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  destructive = false,
  busy = false,
  children,
}: ConfirmDialogProps) {
  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={busy ? () => {} : onCancel}
      animationType="fade"
      statusBarTranslucent
    >
      {/* Scrim — literal rgba allowed for modal scrims (spec §2.7) */}
      <View
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      >
        <Box className="bg-surface border-border w-full rounded-2xl border p-5">
          <Text variant="h3" className="text-foreground font-soraBold mb-2">
            {title}
          </Text>
          <Text variant="body" className="text-muted mb-2">
            {body}
          </Text>
          {children}
          <Box style={{ flexDirection: 'row' }} className="mt-1 gap-2">
            <Box style={{ flex: 1 }}>
              <Button
                variant="secondary"
                label={cancelLabel}
                onPress={onCancel}
                isDisabled={busy}
              />
            </Box>
            <Box style={{ flex: 1 }}>
              <Button
                variant={destructive ? 'danger' : 'primary'}
                label={confirmLabel}
                onPress={onConfirm}
                isLoading={busy}
                isDisabled={busy}
              />
            </Box>
          </Box>
        </Box>
      </View>
    </Modal>
  );
}
