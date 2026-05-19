import React from 'react';
import { View } from 'react-native';

interface Props {
  children: React.ReactNode;
}

export function DetailRowsCard({ children }: Props): React.ReactElement {
  return (
    <View className="bg-surface border-separator mx-4 mt-4 overflow-hidden rounded-2xl border">
      {children}
    </View>
  );
}
