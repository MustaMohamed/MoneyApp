import { SkeletonGroup } from 'heroui-native';
import { View } from 'react-native';

import { Strings } from '@/constants/strings';

const ROWS = [0, 1, 2, 3, 4];

export function CommitmentRowsSkeleton(): React.ReactElement {
  return (
    <View testID="commitment-row-skeletons" accessibilityLabel={Strings.loadingCommitmentsA11y}>
      <SkeletonGroup isLoading isSkeletonOnly>
        {ROWS.map((row) => (
          <View
            key={row}
            testID="commitment-row-skeleton"
            style={{ flexDirection: 'row', alignItems: 'center' }}
            className="border-separator min-h-[48px] gap-2 border-b px-4 py-2"
          >
            <SkeletonGroup.Item className="h-9 w-9 rounded-md" />
            <View style={{ flex: 1 }} className="gap-1.5">
              <SkeletonGroup.Item
                className={row % 2 === 0 ? 'h-4 w-36 rounded-md' : 'h-4 w-28 rounded-md'}
              />
              <SkeletonGroup.Item className="h-3 w-20 rounded-md" />
            </View>
            <View style={{ alignItems: 'flex-end' }} className="gap-1.5">
              <SkeletonGroup.Item
                className={row % 2 === 0 ? 'h-4 w-24 rounded-md' : 'h-4 w-20 rounded-md'}
              />
              <SkeletonGroup.Item className="h-5 w-16 rounded-full" />
            </View>
          </View>
        ))}
      </SkeletonGroup>
    </View>
  );
}
