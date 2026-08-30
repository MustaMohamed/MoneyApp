import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import { View } from 'react-native';
import { withUniwind } from 'uniwind';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { resolveStateScreenLayout } from '@/components/ui/state_screen.geometry';
import { Text } from '@/components/ui/text';

// create-icon-set.js's own ordering (`:59`, `[styleDefaults, style,
// styleOverrides, fontStyle || {}]`) is what decides the flatten —
// `styleDefaults`'s `color` key goes first, whatever lands in the `style`
// slot goes right after and wins. A bare `className` on the icon DOES
// resolve even unwrapped, though: this is `@expo/vector-icons`'s vendored
// `create-icon-set.js` (reached via `@expo/vector-icons/build/
// createIconSet.js:81-83`, which spreads `this.props` straight through
// unchanged) — its own `Text` import (`:2`) isn't excluded from Metro's
// uniwind resolver rewrite: `resolvers.ts:57`'s origin-path test (also
// matching `/@react-native/`, `:58`) doesn't match this file — neither do
// the internal/non-source checks at `:62-63` — so `:69-71`'s rewrite fires
// and that `Text` is already the patched one
// (`uniwind/components/index.ts:44-45`); `className` survives the
// destructure into `...props` (`:41`) and reaches it at `:62`. That
// patched Text resolves `props.className` itself (`Text.tsx:19`) and
// renders `style={[style, props.style]}` (`:25`) — the resolved colour at
// index 0, the icon's own array (`styleDefaults` first) at index 1. That's
// the no-op: the resolved colour sits ahead of `styleDefaults.color:
// undefined`, which is nested one level in but still later in flatten
// order, so `undefined` wins. Wrapping with `withUniwind` supplies the
// missing `style`: its `withAutoUniwind` (`withUniwind.native.tsx:55,62`)
// builds its own array with the resolved className at index 0 and the
// incoming style at index 1, and that whole array becomes the icon's
// `style` prop — landing after `styleDefaults` this time, same ordering,
// and winning. className, not the `color=` prop the other 130 of 141 icon
// sites in `src/` use, is still the right target: ui.md:22 keeps
// className for colour (and padding, gap, typography), reserving style
// for layout — this glyph is the one place that contract needed the
// wrapper to actually hold.
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
  // (ui.md:15) — a scaled value can never be a Tailwind class. Colour stays
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
