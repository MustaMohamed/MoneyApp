import React from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';

export function NotFoundState(): React.ReactElement {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <Text className="font-sora text-foreground/85 text-center text-[16px] font-bold">
        {Strings.detailNotFoundTitle}
      </Text>
      <Text className="font-inter text-foreground/60 mt-1.5 text-center text-[12px]">
        {Strings.detailNotFoundBody}
      </Text>
    </View>
  );
}
