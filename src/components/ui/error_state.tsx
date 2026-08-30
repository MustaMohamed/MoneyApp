import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import { View } from 'react-native';
import { withUniwind } from 'uniwind';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Size } from '@/constants/theme';

// MaterialCommunityIcons always writes its own `color` key into the style
// array it builds internally (create-icon-set.js), even when undefined —
// and RN's flattenStyle copies keys unconditionally, so a later
// `color: undefined` clobbers an earlier className-resolved colour. A bare
// `className` on the icon is a silent no-op for that reason. Wrapping with
// `withUniwind` resolves the className into `style` before the icon's own
// render runs, so the resolved colour lands after the icon's own
// `color: undefined` in the flatten order and wins. (Harmless nit: the
// icon's own Text render is itself uniwind-patched, so the class resolves
// a second time internally — same result, redundant work.)
const StateIcon = withUniwind(MaterialCommunityIcons);

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
          <StateIcon name={iconName} size={Size.iconXl} className="text-danger" />
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
