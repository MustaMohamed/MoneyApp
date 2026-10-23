import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinkButton } from 'heroui-native';
import React from 'react';
import { View, useWindowDimensions } from 'react-native';

import { Text } from '@/components/ui/text';
import { resolveOneLineTextProps, scaledTextStyle } from '@/components/ui/text_scale.geometry';
import { Strings } from '@/constants/strings';
import {
  Colors,
  HIT_SLOP_UNCLIPPED_STYLE,
  Size,
  Spacing,
  Type,
  lineHeightFor,
} from '@/constants/theme';

import {
  ACTIVITY_EMPTY_BLOCK_PADDING_Y,
  ACTIVITY_EMPTY_LINK_MARGIN_TOP,
  resolveActivityEmptyLinkHitSlop,
} from './account_detail_touch.geometry';

interface Props {
  onAdd: () => void;
}

/** The inline block inside the activity card, not an `EmptyState` (ADR 2026-09-01). */
export function ActivityEmptyBlock({ onAdd }: Props): React.ReactElement {
  const { fontScale } = useWindowDimensions();
  return (
    <View className="items-center px-4" style={{ paddingVertical: ACTIVITY_EMPTY_BLOCK_PADDING_Y }}>
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
        hitSlop={resolveActivityEmptyLinkHitSlop(fontScale)}
        style={{ marginTop: ACTIVITY_EMPTY_LINK_MARGIN_TOP, ...HIT_SLOP_UNCLIPPED_STYLE }}
      >
        <LinkButton.Label
          {...resolveOneLineTextProps(scaledTextStyle(Type.caption, fontScale))}
          className="text-accent font-inter-semibold"
        >
          {Strings.accountActivityEmptyCta}
        </LinkButton.Label>
      </LinkButton>
    </View>
  );
}
