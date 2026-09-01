import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ListGroup } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Size, Type, lineHeightFor } from '@/constants/theme';
import { CoreTokens } from '@/constants/theme_tokens';

import { DETAIL_ACCOUNT_ROW_HEIGHT, DETAIL_ROW_HEIGHT } from './detail_geometry';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

/** `BADGE_STYLES` spells class names in full so Tailwind's static extraction keeps them. */
export type BadgeTone = 'accent' | 'danger' | 'success' | 'info' | 'accent-cc';

interface BadgeStyle {
  bg: string;
  border: string;
  text: string;
}

const BADGE_STYLES: Record<BadgeTone, BadgeStyle> = {
  accent: { bg: 'bg-accent/15', border: 'border-accent/30', text: 'text-accent' },
  danger: { bg: 'bg-danger/15', border: 'border-danger/30', text: 'text-danger' },
  success: { bg: 'bg-success/15', border: 'border-success/30', text: 'text-success' },
  info: { bg: 'bg-info/15', border: 'border-info/30', text: 'text-info' },
  'accent-cc': {
    bg: 'bg-accent-cc/15',
    border: 'border-accent-cc/30',
    text: 'text-accent-cc',
  },
};

interface Props {
  icon: IconName;
  label: string;
  value: string;
  badge?: string;
  badgeTone?: BadgeTone;
  sublabel?: string;
  reserveSublabel?: boolean;
  muted?: boolean;
  showDivider?: boolean;
}

export function DetailRow({
  icon,
  label,
  value,
  badge,
  badgeTone = 'accent',
  sublabel,
  reserveSublabel = false,
  muted = false,
  showDivider = true,
}: Props): React.ReactElement {
  const tone = BADGE_STYLES[badgeTone];
  return (
    <ListGroup.Item
      className={`flex-row items-center gap-3 px-4 py-3 ${showDivider ? 'border-separator border-b' : ''}`}
      style={{ height: reserveSublabel ? DETAIL_ACCOUNT_ROW_HEIGHT : DETAIL_ROW_HEIGHT }}
    >
      <ListGroup.ItemPrefix>
        <View className="bg-foreground/5 h-7 w-7 items-center justify-center rounded-md">
          <MaterialCommunityIcons
            name={icon}
            size={Size.filterSegmentIcon}
            color={CoreTokens.text1}
          />
        </View>
      </ListGroup.ItemPrefix>
      <ListGroup.ItemContent className="min-w-0">
        <ListGroup.ItemDescription
          className="font-inter-semibold text-foreground/55 tracking-wide uppercase"
          style={{ fontSize: Type.overline, lineHeight: lineHeightFor(Type.overline) }}
        >
          {label}
        </ListGroup.ItemDescription>
        <ListGroup.ItemTitle
          className={`mt-0.5 ${muted ? 'font-inter text-foreground/60 italic' : 'font-inter-medium'}`}
          style={{ fontSize: Type.meta, lineHeight: lineHeightFor(Type.meta) }}
          numberOfLines={1}
        >
          {value}
        </ListGroup.ItemTitle>
        {sublabel || reserveSublabel ? (
          <ListGroup.ItemDescription
            className="font-inter text-foreground/55 mt-0.5"
            style={{ fontSize: Type.overline, lineHeight: lineHeightFor(Type.overline) }}
            numberOfLines={1}
          >
            {sublabel ?? ' '}
          </ListGroup.ItemDescription>
        ) : null}
      </ListGroup.ItemContent>
      {badge ? (
        <ListGroup.ItemSuffix>
          <View className={`rounded-full border px-2 py-0.5 ${tone.bg} ${tone.border}`}>
            <Text
              className={`font-inter-semibold ${tone.text}`}
              style={{ fontSize: Type.compactBadge, lineHeight: lineHeightFor(Type.compactBadge) }}
            >
              {badge}
            </Text>
          </View>
        </ListGroup.ItemSuffix>
      ) : null}
    </ListGroup.Item>
  );
}
