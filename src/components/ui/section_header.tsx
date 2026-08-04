import { Typography } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { Colors } from '@/constants/theme';

export interface SectionHeaderProps {
  title: string;
  count?: number;
}

export function SectionHeader({ title, count }: SectionHeaderProps) {
  return (
    <View
      className="mx-4 mt-4 mb-2 flex-row items-center justify-between"
      style={{ flexDirection: 'row' }}
    >
      <Typography className="font-inter text-muted text-[12px] font-semibold tracking-wide uppercase">
        {title}
      </Typography>
      {count !== undefined && count > 0 ? (
        <View
          className="rounded-full px-2 py-0.5"
          style={{
            backgroundColor: `${Colors.shared.cairoGold}22`,
          }}
        >
          <Typography
            className="font-sora text-[12px] font-bold"
            style={{ color: Colors.shared.cairoGold }}
          >
            {count}
          </Typography>
        </View>
      ) : null}
    </View>
  );
}
