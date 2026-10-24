import React from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Type, lineHeightFor } from '@/constants/theme';

interface DetailNotFoundStateProps {
  title: string;
  body: string;
  testID?: string;
}

export function DetailNotFoundState({
  title,
  body,
  testID,
}: DetailNotFoundStateProps): React.ReactElement {
  return (
    <View className="flex-1 items-center justify-center px-8" testID={testID}>
      <Text
        className="font-sora-bold text-foreground/85 text-center"
        style={{ fontSize: Type.subhead, lineHeight: lineHeightFor(Type.subhead) }}
      >
        {title}
      </Text>
      <Text
        className="font-inter text-foreground/60 mt-1.5 text-center"
        style={{ fontSize: Type.caption, lineHeight: lineHeightFor(Type.caption) }}
      >
        {body}
      </Text>
    </View>
  );
}
