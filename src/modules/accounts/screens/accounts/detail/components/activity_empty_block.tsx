import { LinkButton } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Size, Type, lineHeightFor } from '@/constants/theme';

interface Props {
  onAdd: () => void;
}

/** The inline block inside the activity card, not an `EmptyState` (ADR 2026-09-01). */
export function ActivityEmptyBlock({ onAdd }: Props): React.ReactElement {
  return (
    <View className="px-4 py-5">
      <Text
        className="font-sora-semibold text-foreground"
        style={{ fontSize: Type.meta, lineHeight: lineHeightFor(Type.meta) }}
      >
        {Strings.accountActivityEmptyTitle}
      </Text>
      <Text
        className="font-inter text-foreground/55 mt-1"
        style={{ fontSize: Type.overline, lineHeight: lineHeightFor(Type.overline) }}
      >
        {Strings.accountActivityEmptyBody}
      </Text>
      <LinkButton
        size="sm"
        onPress={onAdd}
        accessibilityRole="button"
        accessibilityLabel={Strings.accountActivityEmptyCta}
        style={{ marginTop: Size.inlineLinkOffset, alignSelf: 'flex-start' }}
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
