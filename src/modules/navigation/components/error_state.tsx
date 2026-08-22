import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Colors } from '@/constants/theme';
import { ms } from '@/utils/responsive';

export interface ErrorStateProps {
  iconName: ComponentProps<typeof MaterialCommunityIcons>['name'];
  title: string;
  description: string;
  actionLabel: string;
  actionAccessibilityLabel: string;
  onAction: () => void;
  isActionLoading?: boolean;
  isActionDisabled?: boolean;
  testID?: string;
}

export function ErrorState({
  iconName,
  title,
  description,
  actionLabel,
  actionAccessibilityLabel,
  onAction,
  isActionLoading = false,
  isActionDisabled = false,
  testID,
}: ErrorStateProps) {
  return (
    <Screen testID={testID}>
      <View style={{ flex: 1 }} className="items-center justify-center px-6">
        <View className="bg-danger/10 size-16 items-center justify-center rounded-full">
          <MaterialCommunityIcons name={iconName} size={ms(30)} color={Colors.dark.negative} />
        </View>
        <Text variant="h2" className="mt-5 text-center">
          {title}
        </Text>
        <Text variant="body" muted className="mt-2 max-w-80 text-center">
          {description}
        </Text>
        <Button
          label={actionLabel}
          accessibilityLabel={actionAccessibilityLabel}
          className="mt-6 w-full max-w-80"
          isLoading={isActionLoading}
          isDisabled={isActionDisabled}
          onPress={onAction}
        />
      </View>
    </Screen>
  );
}
