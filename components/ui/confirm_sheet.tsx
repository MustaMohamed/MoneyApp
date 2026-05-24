import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';

interface ConfirmSheetProps {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}

export function ConfirmSheet({
  visible,
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  busy = false,
}: ConfirmSheetProps) {
  return (
    <Sheet visible={visible} onClose={busy ? () => {} : onCancel} title={title} size="sm">
      <Sheet.Body>
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
      </Sheet.Body>
    </Sheet>
  );
}
