import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinkButton } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors, Size, Spacing, Type, lineHeightFor } from '@/constants/theme';

interface Props {
  onAdd: () => void;
}

/** The inline block inside the activity card, not an `EmptyState` (ADR 2026-09-01). */
export function ActivityEmptyBlock({ onAdd }: Props): React.ReactElement {
  return (
    <View className="items-center px-4 py-5">
      <View
        className="bg-surface-secondary items-center justify-center rounded-full"
        style={{ width: Size.activityEmptyCircle, height: Size.activityEmptyCircle }}
      >
        <MaterialCommunityIcons
          name="swap-horizontal"
          size={Size.activityEmptyGlyph}
          color={Colors.dark.text2}
        />
      </View>
      <Text
        className="font-sora-semibold text-foreground text-center"
        style={{ fontSize: Type.meta, lineHeight: lineHeightFor(Type.meta), marginTop: Spacing.sm }}
      >
        {Strings.accountActivityEmptyTitle}
      </Text>
      <Text
        className="font-inter text-foreground/55 text-center"
        style={{
          fontSize: Type.overline,
          lineHeight: lineHeightFor(Type.overline),
          marginTop: Spacing.xs,
        }}
      >
        {Strings.accountActivityEmptyBody}
      </Text>
      <LinkButton
        size="sm"
        onPress={onAdd}
        accessibilityRole="button"
        accessibilityLabel={Strings.accountActivityEmptyCta}
        style={{ marginTop: Spacing.sm }}
      >
        <LinkButton.Label
          className="text-accent font-inter-semibold"
          style={{ fontSize: Type.caption, lineHeight: lineHeightFor(Type.caption) }}
        >
          {Strings.accountActivityEmptyCta}
        </LinkButton.Label>
      </LinkButton>
    </View>
  );
}
