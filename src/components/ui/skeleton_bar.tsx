import { SkeletonGroup } from 'heroui-native';
import React from 'react';
import { useWindowDimensions } from 'react-native';

import { resolveSkeletonBarHeight } from '@/components/ui/skeleton_bar.geometry';

export interface ScaledBarProps {
  height: number;
  className: string;
  testID?: string;
}

export function ScaledBar({ height, className, testID }: ScaledBarProps): React.ReactElement {
  const { fontScale } = useWindowDimensions();
  return (
    <SkeletonGroup.Item
      testID={testID}
      className={className}
      style={{ height: resolveSkeletonBarHeight(height, fontScale) }}
    />
  );
}
