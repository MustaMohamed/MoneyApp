import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';

interface Props {
  visible: boolean;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeactivateSheet({ visible, busy, onCancel, onConfirm }: Props) {
  return (
    <Sheet
      visible={visible}
      onClose={busy ? () => {} : onCancel}
      title={Strings.commitmentsDeactivateTitle}
      size="sm"
    >
      <Sheet.Body>
        <View className="gap-4 px-4 pb-6">
          <Text className="font-inter text-muted text-[15px] leading-6">
            {Strings.commitmentsDeactivateBody}
          </Text>
          <View style={{ flexDirection: 'row' }} className="gap-3">
            <View style={{ flex: 1 }}>
              <Button
                variant="ghost"
                label={Strings.commitmentsDeactivateCancel}
                onPress={onCancel}
                isDisabled={busy}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                variant="primary"
                label={Strings.commitmentsDeactivateConfirm}
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
