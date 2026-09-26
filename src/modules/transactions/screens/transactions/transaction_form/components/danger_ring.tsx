import { View } from 'react-native';

import { Size } from '@/constants/theme';

interface DangerRingProps {
  testID: string;
  inset?: number;
  radius?: number;
}

/** No HeroUI primitive fits: nothing rings a `ListGroup.Item` or the hero row; absolute, so it takes no layout space. */
export function DangerRing({ testID, inset = 0, radius = 0 }: DangerRingProps): React.ReactElement {
  return (
    <View
      testID={testID}
      pointerEvents="none"
      className="border-danger"
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: inset,
        right: inset,
        borderWidth: Size.hairline,
        borderRadius: radius,
      }}
    />
  );
}
