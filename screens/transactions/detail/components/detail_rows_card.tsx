import React from 'react';
import { View } from 'react-native';

interface Props {
  children: React.ReactNode;
}

export function DetailRowsCard({ children }: Props): React.ReactElement {
  return (
    <View className="mx-4 mt-4 rounded-2xl bg-surface border border-separator overflow-hidden">
      {children}
    </View>
  );
}
