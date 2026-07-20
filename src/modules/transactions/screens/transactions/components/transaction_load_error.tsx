import { Alert } from 'heroui-native';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Strings } from '@/constants/strings';

interface TransactionLoadErrorProps {
  floating?: boolean;
  onRetry: () => void;
}

export function TransactionLoadError({
  floating = false,
  onRetry,
}: TransactionLoadErrorProps): React.ReactElement {
  const alert = (
    <Alert status="danger" className="w-full">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>
          {floating ? Strings.transactionsRefreshError : Strings.transactionsLoadError}
        </Alert.Title>
      </Alert.Content>
      <Button
        variant="secondary"
        size="sm"
        label={Strings.transactionsLoadRetry}
        accessibilityLabel={Strings.transactionsLoadRetry}
        onPress={onRetry}
      />
    </Alert>
  );

  return floating ? (
    <View className="absolute right-4 bottom-4 left-4 z-50">{alert}</View>
  ) : (
    <View className="flex-1 items-center justify-center px-4">{alert}</View>
  );
}
