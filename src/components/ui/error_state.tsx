import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import { View } from 'react-native';
import { withUniwind } from 'uniwind';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { resolveStateScreenLayout } from '@/components/ui/state_screen.geometry';
import { Text } from '@/components/ui/text';

// Without `withUniwind` the icon's `styleDefaults` win and its `className` colour is a no-op.
const StateIcon = withUniwind(MaterialCommunityIcons);

// Ruled genuinely different from EmptyState, not merged (#290). Evidence and the
// rejected merge shape: docs/adr/2026-09-01-empty-error-state-stay-separate.md
const LAYOUT = resolveStateScreenLayout('error');

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
  // Scaled `ms()` numbers must go through `style`; `className` is build-time only.
  return (
    <Screen testID={testID}>
      <View style={LAYOUT.root}>
        <View style={LAYOUT.iconCircle} className="bg-danger/10">
          <StateIcon name={iconName} size={LAYOUT.iconSize} className="text-danger" />
        </View>
        <Text variant="h2" style={LAYOUT.headline}>
          {title}
        </Text>
        <Text variant="body" muted style={LAYOUT.body}>
          {description}
        </Text>
        <View style={LAYOUT.action}>
          <Button
            label={actionLabel}
            accessibilityLabel={actionAccessibilityLabel}
            isLoading={isActionLoading}
            isDisabled={isActionDisabled}
            onPress={onAction}
          />
        </View>
      </View>
    </Screen>
  );
}
