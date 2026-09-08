import { LinkButton, Typography } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

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
  return (
    <View
      className="mt-4 mb-2 flex-row items-center justify-between"
      style={{ flexDirection: 'row', marginHorizontal: Spacing.md }}
    >
      <Typography className="font-inter-semibold text-muted text-[12px] tracking-wide uppercase">
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
            className="font-sora-bold text-[12px]"
            style={{ color: Colors.shared.cairoGold }}
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
        >
          <LinkButton.Label
            className="text-accent font-inter-semibold"
            style={{ fontSize: Type.caption, lineHeight: lineHeightFor(Type.caption) }}
          >
            {action.label}
          </LinkButton.Label>
        </LinkButton>
      ) : null}
    </View>
  );
}
