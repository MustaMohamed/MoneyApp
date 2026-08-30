import { Dialog } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';

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
  const handleOpenChange = (open: boolean) => {
    if (!open && !busy) onCancel();
  };

  return (
    <Dialog isOpen={visible} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        {/*
         * bg-overlay overrides HeroUI's default bg-backdrop (oklch(0%0 0/20%) ≈ 20% black).
         * Our --overlay token in global.css is rgba(0,0,0,0.6) — matches the legacy Modal scrim.
         * Without this override the backdrop is visibly too light.
         */}
        <Dialog.Overlay className="bg-overlay" isCloseOnPress={!busy} />
        {/*
         * HeroUI Dialog.Content defaults: bg-overlay p-5 rounded-3xl shadow-overlay.
         * We override:
         *   bg-surface   — dark-surface card (#1A2535); not the scrim colour
         *   rounded-2xl  — 16px matches the legacy rounded-2xl card
         *   border border-border — preserves the legacy card border
         *   p-5          — identical padding; keep as-is (no change needed)
         *
         * tv() className-override fallback: if bg-surface or rounded-2xl are silently
         * ignored by HeroUI's tailwind-variants base (same risk noted for Chip in SP-1),
         * replace the className bg-surface and rounded-2xl with a style prop instead:
         *   style={{ backgroundColor: Colors.dark.surface, borderRadius: Radius.lg }}
         * and import { Colors, Radius } from '@/constants/theme'.
         * Verify visually at device QA before considering the fallback necessary.
         *
         * isSwipeable={false}: Dialog.Content defaults to isSwipeable={true}.
         * A confirm dialog is a blocking modal — swipe-to-dismiss would silently
         * bypass the busy guard and fire no callback. Must be explicit.
         */}
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
          <View style={{ flexDirection: 'row' }} className="mt-1 gap-2">
            <View style={{ flex: 1 }}>
              <Button
                variant="secondary"
                label={cancelLabel}
                onPress={onCancel}
                isDisabled={busy}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                variant={destructive ? 'danger' : 'primary'}
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
