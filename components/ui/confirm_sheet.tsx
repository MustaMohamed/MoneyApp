import { View } from 'react-native';

import { Sheet } from '@/components/ui/bottom_sheet';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

interface ConfirmSheetProps {
  isOpen: boolean;
  /**
   * Called on ALL close paths (swipe, overlay, close button, programmatic).
   * When busy=true this is a no-op — the sheet cannot be closed.
   */
  onOpenChange: (open: boolean) => void;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}

export function ConfirmSheet({
  isOpen,
  onOpenChange,
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  busy = false,
}: ConfirmSheetProps) {
  // Q2 guard: when busy, suppress all close paths so the sheet stays open
  // while an async operation is in flight. Same semantics as the legacy
  // onClose={() => {}} guard — now applied to all-path onOpenChange.
  // Callers are responsible for wiring cancel logic into onOpenChange
  // (e.g. onOpenChange={(open) => { if (!open) onCancel(); }}).
  const handleOpenChange = (open: boolean) => {
    if (busy) return;
    onOpenChange(open);
  };

  return (
    <Sheet isOpen={isOpen} onOpenChange={handleOpenChange} title={title} size="sm">
      <View className="gap-4 px-4 pb-6">
        <Text className="font-inter text-muted text-[15px] leading-6">{body}</Text>
        <View style={{ flexDirection: 'row' }} className="gap-3">
          <View style={{ flex: 1 }}>
            <Button variant="ghost" label={cancelLabel} onPress={onCancel} isDisabled={busy} />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              variant="primary"
              label={confirmLabel}
              isLoading={busy}
              isDisabled={busy}
              onPress={onConfirm}
            />
          </View>
        </View>
      </View>
    </Sheet>
  );
}
