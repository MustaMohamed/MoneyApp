import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';

import { DETAIL_ROW_HEIGHT } from './detail_geometry';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

/**
 * Badge tone — selects the colour of the small pill on the right-hand side
 * of a DetailRow.
 *
 * `accent` (default) is the original gold treatment used by neutral badges
 * like the "Captured" tag on the exchange-rate row. The four type tones
 * (danger/success/info/accent-cc) match the §7 four-type colour system so
 * the category row can carry a type-tinted pill, matching the list row's
 * amount colour and the detail hero's amount + pill colour.
 *
 * Concrete class strings are fully spelled out so Tailwind's static
 * extraction picks them up — interpolated class names like
 * `bg-${tone}/15` would be tree-shaken away.
 */
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
  muted = false,
  showDivider = true,
}: Props): React.ReactElement {
  const tone = BADGE_STYLES[badgeTone];
  return (
    <View
      className={`flex-row items-center gap-3 px-4 py-3 ${showDivider ? 'border-separator border-b' : ''}`}
      style={{ minHeight: DETAIL_ROW_HEIGHT }}
    >
      <View className="bg-foreground/5 h-7 w-7 items-center justify-center rounded-md">
        <MaterialCommunityIcons name={icon} size={14} color="#F0EEE6" />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="font-inter text-foreground/55 text-[10.5px] font-semibold tracking-wide uppercase">
          {label}
        </Text>
        <Text
          className={`font-inter mt-0.5 text-[13px] ${muted ? 'text-foreground/60 italic' : 'font-medium'}`}
          numberOfLines={2}
        >
          {value}
        </Text>
        {sublabel ? (
          <Text className="font-inter text-foreground/55 mt-0.5 text-[10.5px]">{sublabel}</Text>
        ) : null}
      </View>
      {badge ? (
        <View className={`rounded-full border px-2 py-0.5 ${tone.bg} ${tone.border}`}>
          <Text className={`font-inter text-[9.5px] font-semibold ${tone.text}`}>{badge}</Text>
        </View>
      ) : null}
    </View>
  );
}
