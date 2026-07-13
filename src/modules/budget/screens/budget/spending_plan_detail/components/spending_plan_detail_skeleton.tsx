import { SkeletonGroup } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

const CATEGORY_ROWS = [0, 1, 2];

export function SpendingPlanDetailSkeleton(): React.ReactElement {
  return (
    <SkeletonGroup isLoading isSkeletonOnly>
      <View className="px-4 py-3">
        <View className="flex-row justify-between gap-3">
          <View className="flex-1 gap-1">
            <SkeletonGroup.Item className="h-[22px] w-[55%] rounded-lg" />
            <SkeletonGroup.Item className="h-[9px] w-[68%] rounded-lg" />
          </View>
          <SkeletonGroup.Item className="h-5 w-16 rounded-full" />
        </View>
        <View className="mt-3 flex-row justify-between">
          <SkeletonGroup.Item className="h-[11px] w-[45%] rounded-lg" />
          <SkeletonGroup.Item className="h-[11px] w-[20%] rounded-lg" />
        </View>
        <SkeletonGroup.Item className="mt-1 h-1 w-full rounded-lg" />
        <View className="mt-3 flex-row gap-2">
          {[0, 1, 2, 3].map((metric) => (
            <SkeletonGroup.Item key={metric} className="h-6 flex-1 rounded-lg" />
          ))}
        </View>
      </View>
      <View className="flex-row gap-2 px-4">
        <SkeletonGroup.Item className="h-8 flex-1 rounded-lg" />
        <SkeletonGroup.Item className="h-8 flex-1 rounded-lg" />
      </View>
      <View className="mt-4 flex-row justify-between px-4">
        <SkeletonGroup.Item className="h-[11px] w-20 rounded-lg" />
        <SkeletonGroup.Item className="h-[11px] w-16 rounded-lg" />
      </View>
      {CATEGORY_ROWS.map((row) => (
        <View key={row} className="flex-row items-center gap-3 px-4 py-2">
          <SkeletonGroup.Item className="h-9 w-9 rounded-full" />
          <View className="flex-1 gap-1">
            <SkeletonGroup.Item className="h-3 w-[65%] rounded-lg" />
            <SkeletonGroup.Item className="h-[9px] w-1/2 rounded-lg" />
          </View>
          <SkeletonGroup.Item className="h-3 w-16 rounded-lg" />
        </View>
      ))}
    </SkeletonGroup>
  );
}
