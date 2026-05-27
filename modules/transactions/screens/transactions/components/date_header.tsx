import React from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';

interface Props {
  label: string;
}

export function DateHeader({ label }: Props): React.ReactElement {
  return (
    <View className="bg-background px-4 pt-3 pb-1.5">
      <Text className="font-inter text-muted text-[10px] font-semibold tracking-wide uppercase">
        {label}
      </Text>
    </View>
  );
}
