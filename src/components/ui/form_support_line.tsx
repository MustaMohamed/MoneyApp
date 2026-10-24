import { View, useWindowDimensions } from 'react-native';

import { Text } from '@/components/ui/text';
import {
  resolveOneLineTextPropsAt,
  resolveWrappingTextPropsAt,
} from '@/components/ui/text_scale.geometry';
import { Type } from '@/constants/theme';

/** The line under a form's type tabs: one line ending in `…`, or wrapping when `wrap`. */
export function FormSupportLine({
  text,
  wrap,
}: {
  text: string;
  wrap: boolean;
}): React.ReactElement {
  const { fontScale } = useWindowDimensions();
  const line = wrap
    ? resolveWrappingTextPropsAt(Type.micro, fontScale)
    : resolveOneLineTextPropsAt(Type.micro, fontScale);

  return (
    <View className="min-h-8 justify-center px-4 py-1.5">
      <Text className="font-inter text-muted" {...line}>
        {text}
      </Text>
    </View>
  );
}
