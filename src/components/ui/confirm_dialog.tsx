import { Dialog, Typography } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Type, lineHeightFor } from '@/constants/theme';

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
  /** A failed confirm renders here and the dialog stays open (`.dlg .errl`). */
  errorMessage?: string;
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
  errorMessage,
  children,
}: ConfirmDialogProps) {
  const handleOpenChange = (open: boolean) => {
    if (!open && !busy) onCancel();
  };

  return (
    <Dialog isOpen={visible} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        {/* `bg-overlay` overrides HeroUI's 20%-black default backdrop. */}
        <Dialog.Overlay className="bg-overlay" isCloseOnPress={!busy} />
        {/* Swipe-dismiss (HeroUI's default) bypasses the busy guard and fires no callback. */}
        <Dialog.Content
          isSwipeable={false}
          className="bg-surface border-border w-full rounded-2xl border p-5"
          style={{ boxShadow: 'none' }}
        >
          <Dialog.Title className="text-foreground font-sora-bold mb-2 text-xl">
            {title}
          </Dialog.Title>
          <Dialog.Description className="text-muted mb-2 text-[15px] leading-6">
            {body}
          </Dialog.Description>
          {children}
          {errorMessage ? (
            <Typography
              className="text-danger font-inter mb-2"
              style={{ fontSize: Type.caption, lineHeight: lineHeightFor(Type.caption) }}
            >
              {errorMessage}
            </Typography>
          ) : null}
          <View style={{ flexDirection: 'row' }} className="mt-1 gap-2">
            <View style={{ flex: 1 }}>
              <Button
                variant="secondary"
                flat
                label={cancelLabel}
                onPress={onCancel}
                isDisabled={busy}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                variant={destructive ? 'danger' : 'primary'}
                flat
                label={confirmLabel}
                onPress={onConfirm}
                isLoading={busy}
                isDisabled={busy}
              />
            </View>
          </View>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}
