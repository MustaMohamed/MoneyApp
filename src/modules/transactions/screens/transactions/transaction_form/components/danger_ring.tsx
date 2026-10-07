import { View } from 'react-native';

import { Size } from '@/constants/theme';

interface DangerRingProps {
  testID: string;
  radius?: number;
}

/** No HeroUI primitive fits: nothing rings a `ListGroup.Item` or the account strip; absolute, so it takes no layout space. */
export function DangerRing({ testID, radius = 0 }: DangerRingProps): React.ReactElement {
  return (
    <View
      testID={testID}
      pointerEvents="none"
      className="border-danger"
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        borderWidth: Size.hairline,
        borderRadius: radius,
      }}
    />
  );
}
