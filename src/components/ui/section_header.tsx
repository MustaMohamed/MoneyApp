import { LinkButton, Typography } from 'heroui-native';
import React from 'react';
import { View, useWindowDimensions } from 'react-native';

import { resolveOneLineTextProps, scaledTextStyle } from '@/components/ui/text_scale.geometry';
import { Colors, Spacing, Type, lineHeightFor } from '@/constants/theme';

interface SectionHeaderCommonProps {
  title: string;
}

// The count badge and the link share the one right slot, so the union keeps them exclusive.
export type SectionHeaderProps =
  | (SectionHeaderCommonProps & { count?: number; action?: never })
  | (SectionHeaderCommonProps & {
      action: { label: string; onPress: () => void };
      count?: never;
    });

export function SectionHeader({ title, count, action }: SectionHeaderProps) {
  const captionLine = resolveOneLineTextProps(
    scaledTextStyle(Type.caption, useWindowDimensions().fontScale),
  );
  return (
    <View
      className="mt-4 mb-2 flex-row items-center justify-between"
      style={{ flexDirection: 'row', marginHorizontal: Spacing.md, gap: Spacing.xs }}
    >
      <Typography
        {...captionLine}
        className="font-inter-semibold text-muted tracking-wide uppercase"
        style={{ ...captionLine.style, flex: 1 }}
      >
        {title}
      </Typography>
      {count !== undefined && count > 0 ? (
        <View
          className="rounded-full px-2 py-0.5"
          style={{
            backgroundColor: Colors.dark.goldTint,
          }}
        >
          <Typography
            className="font-sora-bold"
            style={{
              color: Colors.shared.cairoGold,
              fontSize: Type.caption,
              lineHeight: lineHeightFor(Type.caption),
            }}
          >
            {count}
          </Typography>
        </View>
      ) : null}
      {action ? (
        <LinkButton
          size="sm"
          onPress={action.onPress}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          style={{ flexShrink: 1 }}
        >
          <LinkButton.Label {...captionLine} className="text-accent font-inter-semibold">
            {action.label}
          </LinkButton.Label>
        </LinkButton>
      ) : null}
    </View>
  );
}
