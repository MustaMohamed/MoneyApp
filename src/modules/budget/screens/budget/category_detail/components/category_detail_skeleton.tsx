import { Card, SkeletonGroup } from 'heroui-native';
import { View } from 'react-native';

import { BackButton } from '@/components/ui/back_button';
import { Spacing } from '@/constants/theme';

export function CategoryDetailSkeleton({ onBack }: { onBack: () => void }): React.ReactElement {
  return (
    <SkeletonGroup isLoading isSkeletonOnly>
      <View className="flex-row items-center gap-2.5 px-4 py-2">
        <BackButton onPress={onBack} />
        <SkeletonGroup.Item className="h-[34px] w-[34px] rounded-xl" />
        <SkeletonGroup.Item className="h-[18px] w-32 rounded-lg" />
      </View>

      <View style={{ paddingHorizontal: Spacing.md }}>
        <Card className="bg-surface border-border mt-2 rounded-lg border p-0 shadow-none">
          <Card.Body className="gap-2 p-4">
            <View className="flex-row items-center justify-between">
              <SkeletonGroup.Item className="h-[14px] w-24 rounded-lg" />
              <SkeletonGroup.Item className="h-[14px] w-16 rounded-lg" />
            </View>
            <View className="flex-row items-center justify-between">
              <SkeletonGroup.Item className="h-[28px] w-32 rounded-lg" />
              <SkeletonGroup.Item className="h-[18px] w-20 rounded-lg" />
            </View>
            <SkeletonGroup.Item className="h-2 w-full rounded-full" />
            <View className="flex-row items-center justify-between">
              <SkeletonGroup.Item className="h-[12px] w-20 rounded-lg" />
              <SkeletonGroup.Item className="h-[12px] w-20 rounded-lg" />
            </View>
          </Card.Body>
        </Card>

        <View className="mt-4 flex-row gap-2">
          {[0, 1, 2].map((tile) => (
            <SkeletonGroup.Item key={tile} className="h-16 flex-1 rounded-lg" />
          ))}
        </View>

        <SkeletonGroup.Item className="mt-5 h-[11px] w-28 rounded-lg" />
        <SkeletonGroup.Item className="mt-3 h-16 w-full rounded-lg" />
        {[0, 1, 2].map((row) => (
          <View key={row} className="border-separator flex-row items-center border-b py-3">
            <View className="flex-1 gap-1.5">
              <SkeletonGroup.Item className="h-[14px] w-24 rounded-lg" />
              <SkeletonGroup.Item className="h-[11px] w-32 rounded-lg" />
            </View>
            <SkeletonGroup.Item className="h-[15px] w-16 rounded-lg" />
          </View>
        ))}
      </View>
    </SkeletonGroup>
  );
}
