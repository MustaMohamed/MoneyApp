import { Alert } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Strings } from '@/constants/strings';

interface BalanceReviewAlertProps {
  onAdjust: () => void;
  onConfirm: () => void;
  isConfirming: boolean;
  errorMessage?: string;
}

export function BalanceReviewAlert({
  onAdjust,
  onConfirm,
  isConfirming,
  errorMessage,
}: BalanceReviewAlertProps): React.ReactElement {
  return (
    <Alert status="warning" className="mx-4 mt-4">
      <Alert.Indicator />
      <Alert.Content className="gap-2">
        <Alert.Title>{Strings.accountBalanceReviewTitle}</Alert.Title>
        <Alert.Description>{Strings.accountBalanceReviewBody}</Alert.Description>
        {errorMessage ? (
          <Alert.Description className="text-danger">{errorMessage}</Alert.Description>
        ) : null}
        <View style={{ flexDirection: 'row' }} className="gap-2 pt-1">
          <View style={{ flex: 1 }}>
            <Button
              size="sm"
              variant="secondary"
              label={Strings.accountBalanceReviewConfirm}
              onPress={onConfirm}
              isDisabled={isConfirming}
              isLoading={isConfirming}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              size="sm"
              variant="primary"
              label={Strings.accountBalanceReviewAdjust}
              onPress={onAdjust}
              isDisabled={isConfirming}
            />
          </View>
        </View>
      </Alert.Content>
    </Alert>
  );
}
