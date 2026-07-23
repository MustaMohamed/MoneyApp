import { Alert } from 'heroui-native';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Strings } from '@/constants/strings';

interface DashboardLoadErrorProps {
  variant: 'initial' | 'refresh';
  onRetry: () => void;
}

export function DashboardLoadError({
  variant,
  onRetry,
}: DashboardLoadErrorProps): React.ReactElement {
  const alert = (
    <Alert status="danger" className="w-full">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>
          {variant === 'initial' ? Strings.dashboardLoadError : Strings.dashboardRefreshError}
        </Alert.Title>
      </Alert.Content>
      <Button
        variant="secondary"
        size="sm"
        label={Strings.dashboardLoadRetry}
        accessibilityLabel={Strings.dashboardLoadRetry}
        onPress={onRetry}
      />
    </Alert>
  );

  if (variant === 'initial') {
    return (
      <View style={{ flex: 1 }} className="items-center justify-center px-4">
        {alert}
      </View>
    );
  }

  return <View className="absolute right-4 bottom-24 left-4 z-50">{alert}</View>;
}
