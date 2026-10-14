import { useWindowDimensions } from 'react-native';

import { Text } from '@/components/ui/text';
import {
  resolveOneLineTextProps,
  scaledTextStyleAboveOne,
} from '@/components/ui/text_scale.geometry';
import { Strings } from '@/constants/strings';
import { Type, lineHeightFor } from '@/constants/theme';

export function RateStaleLine({ testID }: { testID: string }): React.ReactElement {
  const { fontScale } = useWindowDimensions();
  const oneLine = resolveOneLineTextProps(scaledTextStyleAboveOne(Type.micro, fontScale));

  return (
    <Text
      testID={testID}
      className="font-inter text-warning"
      {...oneLine}
      style={{ fontSize: Type.micro, lineHeight: lineHeightFor(Type.micro), ...oneLine.style }}
    >
      {Strings.addTxRateStale}
    </Text>
  );
}
