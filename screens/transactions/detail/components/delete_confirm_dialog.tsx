import React from 'react';
import { ActivityIndicator, Modal, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';

interface Props {
  visible: boolean;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmDialog({
  visible,
  busy,
  onCancel,
  onConfirm,
}: Props): React.ReactElement {
  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={busy ? () => {} : onCancel}
      animationType="fade"
      statusBarTranslucent
    >
      <View
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      >
        <View className="bg-surface border-separator w-full rounded-2xl border p-6">
          <Text className="font-sora text-foreground mb-3 text-[17px] font-bold">
            {Strings.deleteConfirmTitle}
          </Text>
          <Text className="font-inter text-foreground/70 mb-6 text-[14px] leading-[22px]">
            {Strings.deleteConfirmBody}
          </Text>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button
                variant="outline"
                label={Strings.deleteCancel}
                onPress={onCancel}
                isDisabled={busy}
              />
            </View>
            <View className="flex-1">
              {busy ? (
                <View className="bg-danger h-12 items-center justify-center rounded-xl">
                  <ActivityIndicator color="#FFFFFF" />
                </View>
              ) : (
                <Button
                  variant="danger"
                  label={Strings.deleteTransaction}
                  onPress={onConfirm}
                  isDisabled={busy}
                />
              )}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
