import { Card, SkeletonGroup } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

const CATEGORY_ROWS = [0, 1, 2];

export function SpendingPlanDetailSkeleton(): React.ReactElement {
  return (
    <SkeletonGroup isLoading isSkeletonOnly>
      <Card className="bg-surface border-border mx-4 mt-3 rounded-xl border p-0 shadow-none">
        <Card.Body className="px-2 py-1.5">
          <View className="flex-row justify-between gap-3">
            <View className="flex-1 gap-1">
              <SkeletonGroup.Item className="h-[31px] w-[55%] rounded-lg" />
              <SkeletonGroup.Item className="h-[13px] w-[68%] rounded-lg" />
            </View>
            <SkeletonGroup.Item className="h-6 w-16 rounded-full" />
          </View>
          <View className="mt-1 flex-row justify-between">
            <SkeletonGroup.Item className="h-[14px] w-[45%] rounded-lg" />
            <SkeletonGroup.Item className="h-[13px] w-[20%] rounded-lg" />
          </View>
          <SkeletonGroup.Item className="mt-1 h-1 w-full rounded-lg" />
          <View className="mt-1.5 flex-row gap-2">
            {[0, 1, 2, 3].map((metric) => (
              <SkeletonGroup.Item key={metric} className="h-8 flex-1 rounded-lg" />
            ))}
          </View>
          <View className="mt-1.5 flex-row gap-1">
            <SkeletonGroup.Item
              testID="plan-detail-insight-skeleton"
              className="h-8 flex-1 rounded-lg"
            />
          </View>
        </Card.Body>
      </Card>
      <View className="mt-3 flex-row justify-between px-4">
        <SkeletonGroup.Item className="h-[13px] w-20 rounded-lg" />
        <SkeletonGroup.Item className="h-[13px] w-16 rounded-lg" />
      </View>
      {CATEGORY_ROWS.map((row) => (
        <View key={row} className="min-h-[52px] flex-row items-center gap-2 px-4 py-1">
          <SkeletonGroup.Item className="h-7 w-7 rounded-full" />
          <View className="flex-1 gap-1">
            <SkeletonGroup.Item className="h-[15px] w-[65%] rounded-lg" />
            <SkeletonGroup.Item className="h-[11.5px] w-1/2 rounded-lg" />
          </View>
          <SkeletonGroup.Item className="h-[15px] w-16 rounded-lg" />
        </View>
      ))}
    </SkeletonGroup>
  );
}
