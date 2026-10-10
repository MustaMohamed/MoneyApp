import { SkeletonGroup } from 'heroui-native';
import React from 'react';
import { useWindowDimensions } from 'react-native';

import { resolveSkeletonBarHeight } from '@/components/ui/skeleton_bar.geometry';

export function ScaledBar({
  height,
  className,
  testID,
}: {
  height: number;
  className: string;
  testID?: string;
}): React.ReactElement {
  const { fontScale } = useWindowDimensions();
  return (
    <SkeletonGroup.Item
      testID={testID}
      className={className}
      style={{ height: resolveSkeletonBarHeight(height, fontScale) }}
    />
  );
}
