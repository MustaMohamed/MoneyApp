import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Dialog, Typography, cn } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';
import { withUniwind } from 'uniwind';

import { Button } from '@/components/ui/button';
import { Type, lineHeightFor } from '@/constants/theme';
import { ms } from '@/utils/responsive';

import { shouldDismissOnOpenChange } from './confirm_dialog.helpers';

// Without `withUniwind` the icon's `styleDefaults` win and its `className` colour is a no-op.
const TrashGlyph = withUniwind(MaterialCommunityIcons);

/** Frame B2 `.dlg .ci2`: a 56 circle holding a 24 glyph, 14 above the title. */
const TRASH_CIRCLE = ms(56);
const TRASH_CIRCLE_GAP = ms(14);
const TRASH_GLYPH = ms(24);

const TRASH_CIRCLE_STYLE = Object.freeze({
  width: TRASH_CIRCLE,
  height: TRASH_CIRCLE,
  borderRadius: TRASH_CIRCLE / 2,
  alignSelf: 'center',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: TRASH_CIRCLE_GAP,
} as const);

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  /** The confirm button's text while `busy`; `Strings.loading` when absent. */
  confirmLoadingLabel?: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
  busy?: boolean;
  /** A failed confirm renders here and the dialog stays open (`.dlg .errl`). */
  errorMessage?: string;
  /** Optional content rendered between the body and the button row (e.g. a warning line). */
  children?: React.ReactNode;
  /** A danger-tinted trash circle above a centred title, body and error line (frame B2). */
  trashIcon?: boolean;
}

export function ConfirmDialog({
  visible,
  title,
  body,
  confirmLabel,
  confirmLoadingLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  destructive = false,
  busy = false,
  errorMessage,
  children,
  trashIcon = false,
}: ConfirmDialogProps) {
  const handleOpenChange = (open: boolean) => {
    if (shouldDismissOnOpenChange(open, busy)) onCancel();
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
          {trashIcon ? (
            <View style={TRASH_CIRCLE_STYLE} className="bg-danger/12">
              <TrashGlyph name="trash-can-outline" size={TRASH_GLYPH} className="text-danger" />
            </View>
          ) : null}
          <Dialog.Title
            className={cn(
              'text-foreground font-sora-bold mb-2 text-xl',
              trashIcon && 'text-center',
            )}
          >
            {title}
          </Dialog.Title>
          <Dialog.Description
            className={cn('text-muted mb-2 text-[15px] leading-6', trashIcon && 'text-center')}
          >
            {body}
          </Dialog.Description>
          {children}
          {errorMessage ? (
            <Typography
              className={cn('text-danger font-inter mb-2', trashIcon && 'text-center')}
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
                variant={destructive || trashIcon ? 'danger' : 'primary'}
                flat
                label={confirmLabel}
                loadingLabel={confirmLoadingLabel}
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
