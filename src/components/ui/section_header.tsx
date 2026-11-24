import { LinkButton, Typography } from 'heroui-native';
import React from 'react';
import { View, useWindowDimensions } from 'react-native';

import {
  resolveOneLineTextProps,
  resolveRowStacking,
  scaledTextStyle,
} from '@/components/ui/text_scale.geometry';
import {
  Colors,
  HIT_SLOP_UNCLIPPED_STYLE,
  Spacing,
  type TouchFloorHitSlop,
  Type,
  lineHeightFor,
} from '@/constants/theme';

import { SECTION_HEADER_MARGIN_BOTTOM, SECTION_HEADER_MARGIN_TOP } from './section_header.geometry';

interface SectionHeaderCommonProps {
  title: string;
  meta?: string;
}

// The count badge and the link share the one right slot, so the union keeps them exclusive.
export type SectionHeaderProps =
  | (SectionHeaderCommonProps & { count?: number; action?: never })
  | (SectionHeaderCommonProps & {
      action: { label: string; onPress: () => void; hitSlop?: TouchFloorHitSlop };
      count?: never;
    });

export function SectionHeader({ title, meta, count, action }: SectionHeaderProps) {
  const { fontScale } = useWindowDimensions();
  const caption = scaledTextStyle(Type.caption, fontScale);
  const captionLine = resolveOneLineTextProps(caption);
  // Above scale 1 a header with meta wraps whole: the meta and the pill drop under the title.
  const wraps = meta !== undefined && resolveRowStacking(fontScale) === 'stacked';
  return (
    <View
      className="flex-row items-center justify-between"
      style={{
        flexDirection: 'row',
        marginHorizontal: Spacing.md,
        marginTop: SECTION_HEADER_MARGIN_TOP,
        marginBottom: SECTION_HEADER_MARGIN_BOTTOM,
        gap: Spacing.xs,
        flexWrap: wraps ? 'wrap' : 'nowrap',
      }}
    >
      <Typography
        {...captionLine}
        {...(wraps ? { numberOfLines: undefined } : {})}
        className="font-inter-semibold text-muted tracking-wide uppercase"
        style={{ ...captionLine.style, ...(wraps ? { flexGrow: 1 } : { flex: 1 }) }}
      >
        {title}
      </Typography>
      {meta === undefined ? null : (
        <Typography
          allowFontScaling={false}
          className="font-sora text-content-secondary"
          style={caption}
        >
          {meta}
        </Typography>
      )}
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
          {...(action.hitSlop === undefined
            ? { style: { flexShrink: 1 } }
            : { hitSlop: action.hitSlop, style: { flexShrink: 1, ...HIT_SLOP_UNCLIPPED_STYLE } })}
        >
          <LinkButton.Label {...captionLine} className="text-accent font-inter-semibold">
            {action.label}
          </LinkButton.Label>
        </LinkButton>
      ) : null}
    </View>
  );
}
