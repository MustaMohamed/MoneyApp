import { Alert } from 'heroui-native';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Strings } from '@/constants/strings';

interface DetailLoadErrorProps {
  floating?: boolean;
  onRetry: () => void;
}

export function DetailLoadError({
  floating = false,
  onRetry,
}: DetailLoadErrorProps): React.ReactElement {
  const alert = (
    <Alert status="danger" className="w-full">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>
          {floating ? Strings.detailRefreshErrorTitle : Strings.detailLoadErrorTitle}
        </Alert.Title>
      </Alert.Content>
      <Button
        variant="secondary"
        size="sm"
        label={Strings.detailLoadRetry}
        accessibilityLabel={Strings.detailLoadRetry}
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
