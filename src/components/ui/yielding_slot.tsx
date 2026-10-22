import type React from 'react';
import { View } from 'react-native';

/** Above 1.0 a slot starts at its minimum and takes only the width the title leaves, so it yields before the title shrinks. */
export function YieldingSlot({
  minWidth,
  children,
}: {
  minWidth?: number;
  children: React.ReactElement;
}): React.ReactElement {
  if (minWidth === undefined) return children;
  return (
    <View style={{ flexDirection: 'row', flexGrow: 1, flexShrink: 0, flexBasis: minWidth }}>
      {children}
    </View>
  );
}
