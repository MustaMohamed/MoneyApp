import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import { View } from 'react-native';
import { withUniwind } from 'uniwind';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { resolveStateScreenLayout } from '@/components/ui/state_screen.geometry';
import { Text } from '@/components/ui/text';

// MaterialCommunityIcons always writes its own `color` key into the style
// array it builds internally (create-icon-set.js), even when undefined —
// and RN's flattenStyle copies keys unconditionally, so a later
// `color: undefined` clobbers an earlier className-resolved colour. A bare
// `className` on the icon is a silent no-op for that reason. Wrapping with
// `withUniwind` resolves the className into `style` before the icon's own
// render runs, so the resolved colour lands after the icon's own
// `color: undefined` in the flatten order and wins. (Harmless nit: the
// icon's own Text render is itself uniwind-patched, so the class resolves
// a second time internally — same result, redundant work.) className, not
// the `color=` prop the other 130 of 141 icon sites in `src/` use, is still
// the right target: ui.md:22 keeps className for colour (and padding, gap,
// typography), reserving style for layout — this glyph is the one place
// that contract needed the wrapper to actually hold.
//
// Module-private: no second `withUniwind` consumer exists yet. Hoist this
// (and its comment) to a shared module the day one does — don't pre-export it.
const StateIcon = withUniwind(MaterialCommunityIcons);

// Ruled genuinely different from EmptyState, not merged (#290): 4 of 9
// EmptyState callers render no action at all, where every ErrorState caller
// does; the action widget differs (EmptyState's gradient CTA or text-link
// vs this component's mandatory shared Button with loading/disabled state);
// the wrapper differs (EmptyState is a View embedded in its caller's own
// layout, this component owns a route-level Screen); and the a11y-label and
// testID contracts differ (EmptyState carries neither; this component
// requires both). Only the geometry is shared, through
// `state_screen.geometry.ts` — a merge would need a discriminated union plus
// a nullable CTA slot, which is what #290 weighed and rejected.
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
  // Padding, margin and text-align come from LAYOUT (style), not className,
  // for the opposite reason the icon glyph above stays on className: these
  // are now runtime ms()-scaled numbers, and className is build-time only
  // (ui.md:22) — a scaled value can never be a Tailwind class. Colour stays
  // on className throughout, per the same rule.
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
