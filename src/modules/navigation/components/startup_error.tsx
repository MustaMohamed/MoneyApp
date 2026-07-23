import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import { ms } from '@/utils/responsive';

interface StartupErrorProps {
  isRetrying?: boolean;
  onRetry: () => void;
}

export function StartupError({ isRetrying = false, onRetry }: StartupErrorProps) {
  return (
    <Screen testID="startup-error">
      <View style={{ flex: 1 }} className="items-center justify-center px-6">
        <View className="bg-danger/10 size-16 items-center justify-center rounded-full">
          <MaterialCommunityIcons
            name="database-alert-outline"
            size={ms(30)}
            color={Colors.dark.negative}
          />
        </View>
        <Text variant="h2" className="mt-5 text-center">
          {Strings.startupErrorTitle}
        </Text>
        <Text variant="body" muted className="mt-2 max-w-80 text-center">
          {Strings.startupErrorDescription}
        </Text>
        <Button
          label={Strings.startupErrorRetry}
          accessibilityLabel={Strings.startupErrorRetry}
          className="mt-6 w-full max-w-80"
          isLoading={isRetrying}
          isDisabled={isRetrying}
          onPress={onRetry}
        />
      </View>
    </Screen>
  );
}
