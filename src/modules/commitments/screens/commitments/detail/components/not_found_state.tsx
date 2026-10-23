import React from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Type, lineHeightFor } from '@/constants/theme';

export function CommitmentDetailNotFound(): React.ReactElement {
  return (
    <View className="flex-1 items-center justify-center px-8" testID="commitment-detail-not-found">
      <Text
        className="font-sora-bold text-foreground/85 text-center"
        style={{ fontSize: Type.subhead, lineHeight: lineHeightFor(Type.subhead) }}
      >
        {Strings.commitmentsDetailNotFoundTitle}
      </Text>
      <Text
        className="font-inter text-foreground/60 mt-1.5 text-center"
        style={{ fontSize: Type.caption, lineHeight: lineHeightFor(Type.caption) }}
      >
        {Strings.commitmentsDetailNotFoundBody}
      </Text>
    </View>
  );
}
