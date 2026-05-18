import React from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';

interface Props {
  label: string;
}

export function DateHeader({ label }: Props): React.ReactElement {
  return (
    <View className="px-4 pt-3 pb-1.5 bg-background">
      <Text className="font-inter font-semibold text-[10px] tracking-wide uppercase text-muted">
        {label}
      </Text>
    </View>
  );
}
