import { Spinner } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { GoldTokens } from '@/constants/theme_tokens';

export interface LoadingCenterProps {
  color?: string;
}

export function LoadingCenter({ color = GoldTokens[500] }: LoadingCenterProps) {
  return (
    <View style={{ flex: 1 }} className="items-center justify-center">
      <Spinner color={color} />
    </View>
  );
}
