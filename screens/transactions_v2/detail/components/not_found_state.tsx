import React from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';

export function NotFoundState(): React.ReactElement {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <Text className="font-sora font-bold text-[16px] text-foreground/85 text-center">
        {Strings.detailNotFoundTitle}
      </Text>
      <Text className="font-inter text-[12px] text-foreground/60 text-center mt-1.5">
        {Strings.detailNotFoundBody}
      </Text>
    </View>
  );
}
