import { SkeletonGroup } from 'heroui-native';
import { View, useWindowDimensions } from 'react-native';

import { resolveSkeletonBarHeight } from '@/components/ui/skeleton_bar.geometry';
import { Strings } from '@/constants/strings';

const ROWS = [0, 1, 2, 3, 4];
// The `h-4`, `h-3` and `h-5` classes these bars carried, raw CSS values.
const TITLE_BAR_HEIGHT = 16;
const CAPTION_BAR_HEIGHT = 12;
const AMOUNT_BAR_HEIGHT = 16;
const STATUS_PILL_HEIGHT = 20;

export function CommitmentRowsSkeleton(): React.ReactElement {
  const { fontScale } = useWindowDimensions();
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
                className={row % 2 === 0 ? 'w-36 rounded-md' : 'w-28 rounded-md'}
                style={{ height: resolveSkeletonBarHeight(TITLE_BAR_HEIGHT, fontScale) }}
              />
              <SkeletonGroup.Item
                className="w-20 rounded-md"
                style={{ height: resolveSkeletonBarHeight(CAPTION_BAR_HEIGHT, fontScale) }}
              />
            </View>
            <View style={{ alignItems: 'flex-end' }} className="gap-1.5">
              <SkeletonGroup.Item
                className={row % 2 === 0 ? 'w-24 rounded-md' : 'w-20 rounded-md'}
                style={{ height: resolveSkeletonBarHeight(AMOUNT_BAR_HEIGHT, fontScale) }}
              />
              <SkeletonGroup.Item
                className="w-16 rounded-full"
                style={{ height: resolveSkeletonBarHeight(STATUS_PILL_HEIGHT, fontScale) }}
              />
            </View>
          </View>
        ))}
      </SkeletonGroup>
    </View>
  );
}
