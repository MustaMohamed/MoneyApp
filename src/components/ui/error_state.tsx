import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import { View } from 'react-native';
import { withUniwind } from 'uniwind';

import { Button } from '@/components/ui/button';
import { Screen, type ScreenProps } from '@/components/ui/screen';
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
  /** Absent means the default top and bottom padding; `[]` for an embed under a header. */
  edges?: ScreenProps['edges'];
  /** Opt-in per redesigned screen; absent keeps the legacy gradient CTA. */
  flat?: boolean;
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
  edges,
  flat,
  testID,
}: ErrorStateProps) {
  // Scaled `ms()` numbers must go through `style`; `className` is build-time only.
  return (
    <Screen edges={edges} testID={testID}>
      <View style={LAYOUT.root}>
        <View style={LAYOUT.iconCircle} className="bg-danger/10">
          <StateIcon name={iconName} size={LAYOUT.iconSize} className="text-danger" />
        </View>
        <Text variant="h3" style={LAYOUT.headline}>
          {title}
        </Text>
        {/* The variant's own `text-muted` is 2.4:1; `cn` merges the two into one colour class. */}
        <Text variant="hint" className="text-content-secondary" style={LAYOUT.body}>
          {description}
        </Text>
        <View style={LAYOUT.action}>
          <Button
            label={actionLabel}
            accessibilityLabel={actionAccessibilityLabel}
            isLoading={isActionLoading}
            isDisabled={isActionDisabled}
            flat={flat}
            onPress={onAction}
          />
        </View>
      </View>
    </Screen>
  );
}
